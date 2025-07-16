import axios from 'axios';
import * as readline from 'node:readline';
import { Readable } from 'stream';
import JSONbig from 'json-bigint'; // Add this import
// ── Configuration ─────────────────────────────────────────────────────────────
const WINDOW_SIZE = 5; // Number of bars in each trendline window
const TOL_PCT = 0.001; // 0.1% dynamic tolerance for breakout
const USE_EMA_FILTER = false; // Toggle to enable/disable 21-EMA filter

// Databento parameters
const DATASET = 'GLBX.MDP3';
const SCHEMA = 'trades';
const SYMBOL = 'MESU5';

interface Trade {
  px: number;
  size: number;
  side: 'A' | 'B' | 'N'; // Ask-hit, Bid-hit, or Neutral
  ts_ms: number;
}

interface Bar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  cvd_running: number;
  cvd?: number;
  cvd_color?: string;
  haOpen?: number;
  haHigh?: number;
  haLow?: number;
  haClose?: number;
}

// ── Map aggressor side → signed delta ─────────────────────────────────────────
function deltaFromSide(side: 'A' | 'B' | 'N', size: number): number {
  if (side === 'B') return +size; // bid-hit = buy pressure
  if (side === 'A') return -size; // ask-hit = sell pressure
  return 0; // neutral
}

// ── Page-through raw trades from Databento ────────────────────────────────────
async function* streamTradesPaged(
  key: string,
  dataset: string,
  schema: string,
  symbol: string,
  startUtc: string,
  endUtc: string
): AsyncGenerator<Trade> {
  const resp = await axios.get<Readable>(
    'https://hist.databento.com/v0/timeseries.get_range',
    {
      params: {
        dataset,
        schema,
        symbols: symbol,
        start: startUtc,
        end: endUtc,
        encoding: 'json',
      },
      auth: { username: key, password: '' },
      responseType: 'stream',
    }
  );

  const rl = readline.createInterface({ input: resp.data });
  for await (const line of rl) {
    if (!line) continue;

    const rec = JSONbig.parse(line);
    const ts_ns = BigInt(rec.hd.ts_event);
    const ts_ms = Number(ts_ns / 1000000n);

    yield {
      px: Number(rec.price) / 1e9,
      size: Number(rec.size),
      side: rec.side,
      ts_ms,
    };
  }
}

// ── Build 1-min bars and true cumulative delta ────────────────────────────────
function getCvdColor(
  close: number,
  open: number,
  prevHigh: number | null,
  prevLow: number | null,
  strong: boolean
): string {
  if (!strong) {
    if (close > open) return 'green';
    if (close < open) return 'red';
    return 'gray';
  }
  if (prevHigh === null || prevLow === null) {
    if (close > open) return 'green';
    if (close < open) return 'red';
    return 'gray';
  }
  if (close > prevHigh) return 'green';
  if (close < prevLow) return 'red';
  return 'gray';
}

async function* streamOneMinuteBars(
  key: string,
  dataset: string,
  schema: string,
  symbol: string,
  startUtc: string,
  endUtc: string,
  strongUpdown = true
): AsyncGenerator<Bar> {
  let current: Bar | null = null;
  let runningCvd = 0;
  let prevHigh: number | null = null;
  let prevLow: number | null = null;

  for await (const t of streamTradesPaged(
    key,
    dataset,
    schema,
    symbol,
    startUtc,
    endUtc
  )) {
    const { px, size, side, ts_ms } = t;
    const dt = new Date(ts_ms);
    dt.setSeconds(0, 0);
    const iso = dt.toISOString();

    const delta = deltaFromSide(side, size);
    runningCvd += delta;

    if (!current || current.timestamp !== iso) {
      if (current) {
        current.cvd = current.cvd_running;
        current.cvd_color = getCvdColor(
          current.close,
          current.open,
          prevHigh,
          prevLow,
          strongUpdown
        );
        yield current;
        prevHigh = current.high;
        prevLow = current.low;
      }
      current = {
        timestamp: iso,
        open: px,
        high: px,
        low: px,
        close: px,
        volume: size,
        delta,
        cvd_running: runningCvd,
      };
    } else {
      current.high = Math.max(current.high, px);
      current.low = Math.min(current.low, px);
      current.close = px;
      current.volume += size;
      current.delta += delta;
      current.cvd_running = runningCvd;
    }
  }

  if (current) {
    current.cvd = current.cvd_running;
    current.cvd_color = getCvdColor(
      current.close,
      current.open,
      prevHigh,
      prevLow,
      strongUpdown
    );
    yield current;
  }
}

// ── Trendline fitting & breakout detection ───────────────────────────────────
function checkTrendLine(
  support: boolean,
  pivot: number,
  slope: number,
  y: number[]
): number {
  const intercept = -slope * pivot + y[pivot];
  const diffs = y.map((yi, i) => slope * i + intercept - yi);
  if (support && Math.max(...diffs) > 1e-5) return -1;
  if (!support && Math.min(...diffs) < -1e-5) return -1;
  return diffs.reduce((sum, d) => sum + d * d, 0);
}

function optimizeSlope(
  support: boolean,
  pivot: number,
  initSlope: number,
  y: number[]
): [number, number] {
  const slopeUnit = (Math.max(...y) - Math.min(...y)) / y.length;
  let optStep = 1,
    bestSlope = initSlope;
  let bestErr = checkTrendLine(support, pivot, initSlope, y);
  let derivative = 0,
    getDerivative = true;
  const minStep = 1e-4;

  // ── V3 Dynamic Bailout START ───────────────────────────────────────────
  const maxIters = y.length * 20;
  const maxNoImprove = y.length * 5;
  let iters = 0,
    noImprove = 0;
  // ── V3 Dynamic Bailout END ─────────────────────────────────────────────

  while (optStep > minStep) {
    iters++;
    if (iters >= maxIters || noImprove >= maxNoImprove) {
      console.warn(
        `[optimizeSlope] V3 bail-out: iters=${iters}, noImprove=${noImprove}, window=${y.length}`
      );
      break;
    }
    if (getDerivative) {
      let test = bestSlope + slopeUnit * minStep;
      let errTest = checkTrendLine(support, pivot, test, y);
      if (errTest < 0) {
        test = bestSlope - slopeUnit * minStep;
        errTest = checkTrendLine(support, pivot, test, y);
      }
      derivative = errTest - bestErr;
      getDerivative = false;
    }

    const trial =
      derivative > 0
        ? bestSlope - slopeUnit * optStep
        : bestSlope + slopeUnit * optStep;
    const errTrial = checkTrendLine(support, pivot, trial, y);
    if (errTrial < 0 || errTrial >= bestErr) {
      optStep *= 0.5;
      noImprove++;
    } else {
      bestSlope = trial;
      bestErr = errTrial;
      getDerivative = true;
      noImprove = 0;
    }
  }

  const bestIntercept = -bestSlope * pivot + y[pivot];
  return [bestSlope, bestIntercept];
}
function fitTrendlinesWindow(y: number[]): {
  supportLine: number[];
  resistLine: number[];
  supSlope: number;
  resSlope: number;
  breakout: 'bullish' | 'bearish' | 'none';
} {
  const N = y.length;
  const x = Array.from({ length: N }, (_, i) => i);
  const meanX = x.reduce((a, b) => a + b, 0) / N;
  const meanY = y.reduce((a, b) => a + b, 0) / N;
  const covXY = x.reduce((s, xi, i) => s + (xi - meanX) * (y[i] - meanY), 0);
  const varX = x.reduce((s, xi) => s + (xi - meanX) ** 2, 0);
  const slope = covXY / varX;
  const residuals = y.map((yi, i) => yi - slope * i);

  const upPiv = residuals.indexOf(Math.max(...residuals));
  const loPiv = residuals.indexOf(Math.min(...residuals));

  const [supSlope, supInt] = optimizeSlope(true, loPiv, slope, y);
  const [resSlope, resInt] = optimizeSlope(false, upPiv, slope, y);

  const supportLine = x.map((i) => supSlope * i + supInt);
  const resistLine = x.map((i) => resSlope * i + resInt);
  const last = y[N - 1];
  const tolRes = Math.abs(resistLine[N - 1]) * TOL_PCT;
  const tolSup = Math.abs(supportLine[N - 1]) * TOL_PCT;

  const breakout =
    last >= resistLine[N - 1] - tolRes
      ? 'bullish'
      : last <= supportLine[N - 1] + tolSup
      ? 'bearish'
      : 'none';

  return { supportLine, resistLine, supSlope, resSlope, breakout };
}

// ── Format Eastern Time ───────────────────────────────────────────────────────
function fmtEst(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: true,
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Frik-style 21-EMA filter state ───────────────────────────────────────────
let lastEma21: number | null = null;
let prevBar: Bar | null = null;

// ── Heikin Ashi state ─────────────────────────────────────────────────────────
let prevHaOpen: number | null = null;
let prevHaClose: number | null = null;

// ── Main execution ───────────────────────────────────────────────────────────
async function main() {
  const key =
    process.env.DATABENTO_API_KEY ?? 'db-UdLj4DAEvSPAxUjtFhT9qheWyxR4s';
  if (!key) {
    console.error('❌ Please set DATABENTO_API_KEY');
    process.exit(1);
  }

  const start = '2025-05-07T18:00:00-04:00'; // 6:00 PM EDT
  const end = '2025-05-07T21:00:00-04:00'; // 9:00 PM EDT
  // const start = '2025-07-14T09:30:00-04:00'; // market open
  // const end = '2025-07-14T12:00:00-04:00'; // noon
  const cvdWin: number[] = [];
  const pxWin: number[] = [];
  const volWin: number[] = [];
  const barWin: Bar[] = [];

  let lastSig: 'bullish' | 'bearish' | null = null;

  console.log(
    '📊 Streaming 1-min MESM5 bars w/ true CVD + trendlines + signals (using Heikin Ashi candles)'
  );
  let i = 0;

  for await (const bar of streamOneMinuteBars(
    key,
    DATASET,
    SCHEMA,
    SYMBOL,
    start,
    end,
    true
  )) {
    i++;

    // Compute Heikin Ashi values
    const haClose = (bar.open + bar.high + bar.low + bar.close) / 4;
    let haOpen: number;
    if (prevHaOpen === null || prevHaClose === null) {
      haOpen = (bar.open + bar.close) / 2; // Seed with standard for first bar
    } else {
      haOpen = (prevHaOpen + prevHaClose) / 2;
    }
    const haHigh = Math.max(bar.high, haOpen, haClose);
    const haLow = Math.min(bar.low, haOpen, haClose);
    bar.haOpen = haOpen;
    bar.haHigh = haHigh;
    bar.haLow = haLow;
    bar.haClose = haClose;
    prevHaOpen = haOpen;
    prevHaClose = haClose;

    let ema21: number | undefined;
    let prevEma: number | undefined;
    if (USE_EMA_FILTER) {
      const emaPeriod = 21;
      const k = 2 / (emaPeriod + 1);
      prevEma = lastEma21 === null ? haClose : lastEma21;
      ema21 = (haClose - prevEma) * k + prevEma;
      lastEma21 = ema21;
    }

    const t = fmtEst(bar.timestamp);
    let logStr =
      `#${i} ${t} | HA-O:${haOpen.toFixed(2)} HA-H:${haHigh.toFixed(2)} ` +
      `HA-L:${haLow.toFixed(2)} HA-C:${haClose.toFixed(2)} Vol:${bar.volume} ` +
      `CVD:${bar.cvd} Color:${bar.cvd_color}`;
    if (ema21 !== undefined) {
      logStr += ` EMA21:${ema21.toFixed(2)}`;
    }
    console.log(logStr);

    // Build windows (using HA close for pxWin)
    cvdWin.push(bar.cvd!);
    pxWin.push(haClose);
    volWin.push(bar.volume);
    barWin.push(bar);
    if (cvdWin.length < WINDOW_SIZE) {
      prevBar = bar;
      continue;
    }
    if (cvdWin.length > WINDOW_SIZE) cvdWin.shift();
    if (pxWin.length > WINDOW_SIZE) pxWin.shift();
    if (volWin.length > WINDOW_SIZE) volWin.shift();
    if (barWin.length > WINDOW_SIZE) barWin.shift();

    // Fit trendlines & detect breakout
    const { supSlope, resSlope, breakout } = fitTrendlinesWindow(cvdWin);
    let signal = breakout;

    // Reversal filter
    if (signal !== 'none' && signal === lastSig) {
      console.log(`    → filtered: waiting for reversal from ${lastSig}`);
      signal = 'none';
    }

    // Slope filters
    if (signal === 'bullish' && resSlope <= 0) {
      console.log('    → filtered: resistance slope not positive');
      signal = 'none';
    }
    if (signal === 'bearish' && supSlope >= 0) {
      console.log('    → filtered: support slope not negative');
      signal = 'none';
    }

    // Price & volume confirmations (using HA values)
    const prevBars = barWin.slice(0, -1);
    const recentHigh = Math.max(...prevBars.map((b) => b.haHigh!));
    const recentLow = Math.min(...prevBars.map((b) => b.haLow!));
    if (signal === 'bullish' && haClose <= recentHigh) {
      console.log('    → filtered: HA close did not exceed recent HA highs');
      signal = 'none';
    }
    if (signal === 'bearish' && haClose >= recentLow) {
      console.log('    → filtered: HA close did not drop below recent HA lows');
      signal = 'none';
    }
    const avgVol =
      volWin.slice(0, -1).reduce((a, b) => a + b, 0) / (volWin.length - 1);
    if (
      (signal === 'bullish' || signal === 'bearish') &&
      bar.volume <= avgVol
    ) {
      console.log('    → filtered: volume below recent average');
      signal = 'none';
    }

    // ── Signal logic with optional 21-EMA gating ──────────────────────────
    if (signal !== 'none') {
      if (signal === 'bullish') {
        if (
          USE_EMA_FILTER &&
          (!prevBar || prevBar.haLow! < prevEma! || haClose <= prevBar.haClose!)
        ) {
          console.log('    → filtered by EMA21 bullish filter');
        } else {
          console.log(`    → TRADE SIGNAL: BULLISH\n`);
          lastSig = signal;
        }
      } else {
        if (
          USE_EMA_FILTER &&
          (!prevBar ||
            prevBar.haHigh! > prevEma! ||
            haClose >= prevBar.haClose!)
        ) {
          console.log('    → filtered by EMA21 bearish filter');
        } else {
          console.log(`    → TRADE SIGNAL: BEARISH\n`);
          lastSig = signal;
        }
      }
    }

    // ── Remember this bar for next EMA filter ─────────────────────────────
    prevBar = bar;
  }
}

main().catch(console.error);
