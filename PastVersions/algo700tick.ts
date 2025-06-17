import axios from 'axios';
import * as readline from 'readline';
import { Readable } from 'stream';
import { ADX } from 'technicalindicators';

// ── Configuration ─────────────────────────────────────────────────────────────
const PAGE_MS = 5 * 60 * 1000; // 5-minute paging window
const WINDOW_SIZE = 5; // Number of bars in each trendline window
const TOL_PCT = 0.001; // 0.1% dynamic tolerance for breakout
const R_MULTIPLE = 2; // Reward:risk multiple for target

// Databento parameters
const DATASET = 'GLBX.MDP3';
const SCHEMA = 'trades';
const SYMBOL = 'MESM5';

interface Trade {
  px: number;
  size: number;
  side: 'A' | 'B' | 'N';
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
}

// ── Helper: signed delta ──────────────────────────────────────────────────────
function deltaFromSide(side: 'A' | 'B' | 'N', size: number): number {
  if (side === 'B') return size;
  if (side === 'A') return -size;
  return 0;
}

// ── Stream raw trades paged ───────────────────────────────────────────────────
async function* streamTradesPaged(
  key: string,
  dataset: string,
  schema: string,
  symbol: string,
  startUtc: string,
  endUtc: string
): AsyncGenerator<Trade> {
  let cur = Date.parse(startUtc);
  const endMs = Date.parse(endUtc);
  while (cur < endMs) {
    const nxt = Math.min(cur + PAGE_MS, endMs);
    const resp = await axios.get<Readable>(
      'https://hist.databento.com/v0/timeseries.get_range',
      {
        params: {
          dataset,
          schema,
          symbols: symbol,
          start: new Date(cur).toISOString(),
          end: new Date(nxt).toISOString(),
          encoding: 'json',
        },
        auth: { username: key, password: '' },
        responseType: 'stream',
      }
    );
    let lastTs = cur;
    const rl = readline.createInterface({ input: resp.data });
    const asyncRl = rl as unknown as AsyncIterable<string>;
    for await (const line of asyncRl) {
      if (!line) continue;
      const rec: any = JSON.parse(line);
      const tsEv = Number(rec.hd.ts_event) / 1_000_000;
      lastTs = Math.floor(tsEv);
      yield {
        px: Number(rec.price) / 1e9,
        size: rec.size,
        side: rec.side,
        ts_ms: lastTs,
      };
    }
    cur = lastTs + 1;
  }
}

// ── Color logic for CVD ──────────────────────────────────────────────────────
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

// ── Tick-bar generator ──────────────────────────────────────────────────────
const TICK_SIZE = 700;
async function* streamTickBars(
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
  let tradeCount = 0;
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
    const delta = deltaFromSide(side, size);
    runningCvd += delta;
    tradeCount++;
    if (!current) {
      current = {
        timestamp: new Date(ts_ms).toISOString(),
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
    if (tradeCount >= TICK_SIZE) {
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
      current = null;
      tradeCount = 0;
    }
  }
  if (current) {
    current.cvd = current.cvd_running;
    current.cvd_color = getCvdColor(
      current.close,
      current.open,
      prevHigh,
      prevLow,
      true
    );
    yield current;
  }
}

// ── Trendlines & breakout logic ─────────────────────────────────────────────
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
    getDeriv = true;
  const minStep = 1e-4;
  const maxIters = y.length * 20,
    maxNoImprove = y.length * 5;
  let iters = 0,
    noImprove = 0;
  while (optStep > minStep) {
    iters++;
    if (iters >= maxIters || noImprove >= maxNoImprove) {
      console.warn(
        `[optimizeSlope] bail-out iters=${iters}, noImprove=${noImprove}`
      );
      break;
    }
    if (getDeriv) {
      let test = bestSlope + slopeUnit * minStep;
      let errTest = checkTrendLine(support, pivot, test, y);
      if (errTest < 0) {
        test = bestSlope - slopeUnit * minStep;
        errTest = checkTrendLine(support, pivot, test, y);
      }
      derivative = errTest - bestErr;
      getDeriv = false;
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
      getDeriv = true;
      noImprove = 0;
    }
  }
  const bestInt = -bestSlope * pivot + y[pivot];
  return [bestSlope, bestInt];
}
function fitTrendlinesWindow(y: number[]): {
  supportLine: number[];
  resistLine: number[];
  supSlope: number;
  resSlope: number;
  breakout: 'bullish' | 'bearish' | null;
} {
  const N = y.length;
  const x = Array.from({ length: N }, (_, i) => i);
  const meanY = y.reduce((a, b) => a + b, 0) / N;
  const meanX = x.reduce((a, b) => a + b, 0) / N;
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
  const tol = Math.abs(resistLine[N - 1]) * TOL_PCT;
  const breakout =
    last >= resistLine[N - 1] - tol
      ? 'bullish'
      : last <= supportLine[N - 1] + tol
      ? 'bearish'
      : null;
  return { supportLine, resistLine, supSlope, resSlope, breakout };
}

function fmtEst(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: true,
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── State ───────────────────────────────────────────────────────────────────
let lastEma21: number | null = null;
let prevBar: Bar | null = null;
const adxPeriod = 14;
const adxHigh: number[] = [];
const adxLow: number[] = [];
const adxClose: number[] = [];

// ── Main execution ───────────────────────────────────────────────────────────
async function main() {
  const key = 'db-RhLFw3FhdSV5jij9876eHADeeDShn';
  if (!key) {
    console.error('❌ Please set DATABENTO_API_KEY');
    process.exit(1);
  }

  const start = '2025-06-10T09:30:00-04:00';
  const end = '2025-06-10T10:00:00-04:00';

  const cvdWin: number[] = [];
  const pxWin: number[] = [];
  const volWin: number[] = [];

  let lastSig: 'bullish' | 'bearish' | null = null;
  let pos: 'bullish' | 'bearish' | null = null;
  let stopP = 0,
    targP = 0;

  console.log('📊 Streaming 700-tick MESM5 bars w/ true CVD + ADX + entries');
  let i = 0;

  for await (const bar of streamTickBars(
    key,
    DATASET,
    SCHEMA,
    SYMBOL,
    start,
    end,
    true
  )) {
    i++;
    // ── Compute EMA21 ─────────────────────────────────────────────────────
    const emaPeriod = 21;
    const k = 2 / (emaPeriod + 1);
    const prevEma = lastEma21 === null ? bar.close : lastEma21;
    const ema21 = (bar.close - prevEma) * k + prevEma;
    lastEma21 = ema21;

    // ── Update & compute ADX ───────────────────────────────────────────────
    adxHigh.push(bar.high);
    adxLow.push(bar.low);
    adxClose.push(bar.close);
    if (adxHigh.length > adxPeriod) {
      adxHigh.shift();
      adxLow.shift();
      adxClose.shift();
    }
    let currentAdx: number | null = null;
    const adxVals = ADX.calculate({
      period: adxPeriod,
      high: adxHigh,
      low: adxLow,
      close: adxClose,
    });
    if (adxVals.length > 0) {
      currentAdx = adxVals[adxVals.length - 1].adx;
    }

    const t = fmtEst(bar.timestamp);
    console.log(
      `#${i} ${t} | ` +
        `O:${bar.open.toFixed(2)} ` +
        `H:${bar.high.toFixed(2)} ` +
        `L:${bar.low.toFixed(2)} ` +
        `Vol:${bar.volume} ` +
        `CVD:${bar.cvd} ` +
        `EMA21:${ema21.toFixed(2)} ` +
        `ADX:${currentAdx !== null ? currentAdx.toFixed(2) : 'n/a'}`
    );

    // ── Exit logic ───────────────────────────────────────────────────────
    if (pos === 'bullish' && bar.low <= stopP) {
      console.log(`  → STOP-LOSS LONG @ ${t}`);
      pos = lastSig = null;
      prevBar = bar;
      continue;
    }
    if (pos === 'bullish' && bar.high >= targP) {
      console.log(`  → TAKE-PROFIT LONG @ ${t}`);
      pos = lastSig = null;
      prevBar = bar;
      continue;
    }
    if (pos === 'bearish' && bar.high >= stopP) {
      console.log(`  → STOP-LOSS SHORT @ ${t}`);
      pos = lastSig = null;
      prevBar = bar;
      continue;
    }
    if (pos === 'bearish' && bar.low <= targP) {
      console.log(`  → TAKE-PROFIT SHORT @ ${t}`);
      pos = lastSig = null;
      prevBar = bar;
      continue;
    }

    // ── Build windows & entry filters ─────────────────────────────────────
    cvdWin.push(bar.cvd!);
    pxWin.push(bar.close);
    volWin.push(bar.volume);
    if (cvdWin.length > WINDOW_SIZE) cvdWin.shift();
    if (pxWin.length > WINDOW_SIZE) pxWin.shift();
    if (volWin.length > WINDOW_SIZE) volWin.shift();

    if (!pos && cvdWin.length === WINDOW_SIZE) {
      const { supSlope, resSlope, breakout } = fitTrendlinesWindow(cvdWin);
      let signal: 'bullish' | 'bearish' | null = breakout;
      if (signal && signal === lastSig) signal = null;
      if (signal === 'bullish' && resSlope <= 0) signal = null;
      if (signal === 'bearish' && supSlope >= 0) signal = null;
      const prevPrices = pxWin.slice(0, -1);
      if (signal === 'bullish' && bar.close <= Math.max(...prevPrices))
        signal = null;
      if (signal === 'bearish' && bar.close >= Math.min(...prevPrices))
        signal = null;
      const avgVol =
        volWin.slice(0, -1).reduce((a, b) => a + b, 0) / (volWin.length - 1);
      if (signal && bar.volume <= avgVol) signal = null;
      if (signal && (currentAdx === null || currentAdx < 14)) signal = null;

      if (signal) {
        if (
          signal === 'bullish' &&
          prevBar &&
          prevBar.low >= prevEma &&
          bar.close > prevBar.close
        ) {
          stopP = Math.min(...pxWin);
          const R = bar.close - stopP;
          targP = bar.close + R * R_MULTIPLE;
          console.log(
            `    → ENTRY LONG @ ${t} | Stop:${stopP.toFixed(
              2
            )} Target:${targP.toFixed(2)}`
          );
          pos = lastSig = 'bullish';
        }
        if (
          signal === 'bearish' &&
          prevBar &&
          prevBar.high <= prevEma &&
          bar.close < prevBar.close
        ) {
          stopP = Math.max(...pxWin);
          const R = stopP - bar.close;
          targP = bar.close - R * R_MULTIPLE;
          console.log(
            `    → ENTRY SHORT @ ${t} | Stop:${stopP.toFixed(
              2
            )} Target:${targP.toFixed(2)}`
          );
          pos = lastSig = 'bearish';
        }
      }
    }
    prevBar = bar;
  }
}

main().catch(console.error);
