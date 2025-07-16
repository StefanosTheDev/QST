import * as fs from 'node:fs';
import { streamOneMinuteBars } from './data-stream';
import { fmtEst } from './utils';
import { fitTrendlinesWindow } from './trendline';
import {
  Bar,
  DATASET,
  SCHEMA,
  SYMBOL,
  USE_EMA_FILTER,
  WINDOW_SIZE,
  state,
} from './config';

// Define entry type
interface TradeEntry {
  date: string;
  time: string;
  signal: string;
  price: string;
  volume: number;
  cvd: number;
}

// ── Main execution ───────────────────────────────────────────────────────────
async function main() {
  const key =
    process.env.DATABENTO_API_KEY ?? 'db-XTiaLkTXu7VDC4jTvSpVwXGwqa9Pw';
  if (!key) {
    console.error('❌ Please set DATABENTO_API_KEY');
    process.exit(1);
  }

  const start = '2025-07-14T09:30:00-04:00'; // market open
  const end = '2025-07-14T12:00:00-04:00'; // noon
  const cvdWin: number[] = [];
  const pxWin: number[] = [];
  const volWin: number[] = [];
  const barWin: Bar[] = [];

  let lastSig: 'bullish' | 'bearish' | null = null;
  const entries: TradeEntry[] = [];

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
    if (state.prevHaOpen === null || state.prevHaClose === null) {
      haOpen = (bar.open + bar.close) / 2;
    } else {
      haOpen = (state.prevHaOpen + state.prevHaClose) / 2;
    }
    const haHigh = Math.max(bar.high, haOpen, haClose);
    const haLow = Math.min(bar.low, haOpen, haClose);
    bar.haOpen = haOpen;
    bar.haHigh = haHigh;
    bar.haLow = haLow;
    bar.haClose = haClose;
    state.prevHaOpen = haOpen;
    state.prevHaClose = haClose;

    let ema21: number | undefined;
    let prevEma: number | undefined;
    if (USE_EMA_FILTER) {
      const emaPeriod = 21;
      const k = 2 / (emaPeriod + 1);
      prevEma = state.lastEma21 === null ? haClose : state.lastEma21;
      ema21 = (haClose - prevEma) * k + prevEma;
      state.lastEma21 = ema21;
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

    // Build windows
    cvdWin.push(bar.cvd!);
    pxWin.push(haClose);
    volWin.push(bar.volume);
    barWin.push(bar);
    if (cvdWin.length < WINDOW_SIZE) {
      state.prevBar = bar;
      continue;
    }
    if (cvdWin.length > WINDOW_SIZE) cvdWin.shift();
    if (pxWin.length > WINDOW_SIZE) pxWin.shift();
    if (volWin.length > WINDOW_SIZE) volWin.shift();
    if (barWin.length > WINDOW_SIZE) barWin.shift();

    // Fit trendlines & detect breakout
    const { supSlope, resSlope, breakout } = fitTrendlinesWindow(cvdWin);
    let signal = breakout;

    // Apply all filters
    if (signal !== 'none' && signal === lastSig) {
      console.log(`    → filtered: waiting for reversal from ${lastSig}`);
      signal = 'none';
    }

    if (signal === 'bullish' && resSlope <= 0) {
      console.log('    → filtered: resistance slope not positive');
      signal = 'none';
    }
    if (signal === 'bearish' && supSlope >= 0) {
      console.log('    → filtered: support slope not negative');
      signal = 'none';
    }

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

    // Process valid signals
    if (signal !== 'none') {
      const entryDate = bar.timestamp.slice(0, 10);
      const entryTime = t;
      const entryPrice = haClose.toFixed(2);

      if (signal === 'bullish') {
        if (
          USE_EMA_FILTER &&
          (!state.prevBar ||
            state.prevBar.haLow! < prevEma! ||
            haClose <= state.prevBar.haClose!)
        ) {
          console.log('    → filtered by EMA21 bullish filter');
        } else {
          console.log(`    → TRADE SIGNAL: BULLISH\n`);
          entries.push({
            date: entryDate,
            time: entryTime,
            signal: 'BULLISH',
            price: entryPrice,
            volume: bar.volume,
            cvd: bar.cvd!,
          });
          lastSig = signal;
        }
      } else {
        if (
          USE_EMA_FILTER &&
          (!state.prevBar ||
            state.prevBar.haHigh! > prevEma! ||
            haClose >= state.prevBar.haClose!)
        ) {
          console.log('    → filtered by EMA21 bearish filter');
        } else {
          console.log(`    → TRADE SIGNAL: BEARISH\n`);
          entries.push({
            date: entryDate,
            time: entryTime,
            signal: 'BEARISH',
            price: entryPrice,
            volume: bar.volume,
            cvd: bar.cvd!,
          });
          lastSig = signal;
        }
      }
    }

    state.prevBar = bar;
  }

  // ── SAVE TO CSV ─────────────────────────────────────────────────────
  console.log(
    '\n════════════════════════════════════════════════════════════════════════'
  );
  console.log('📊 TRADING SESSION COMPLETE');
  console.log(
    '════════════════════════════════════════════════════════════════════════\n'
  );

  if (entries.length > 0) {
    try {
      // Check if file exists to determine if we need headers
      const fileExists = fs.existsSync('trades.csv');

      // Build CSV content
      let csvContent = '';
      if (!fileExists) {
        csvContent = 'date,time,signal,price,volume,cvd\n';
      }

      entries.forEach((entry) => {
        csvContent += `${entry.date},${entry.time},${entry.signal},${entry.price},${entry.volume},${entry.cvd}\n`;
      });

      // Append to file
      fs.appendFileSync('trades.csv', csvContent);

      // Summary
      const bullishCount = entries.filter((e) => e.signal === 'BULLISH').length;
      const bearishCount = entries.filter((e) => e.signal === 'BEARISH').length;

      console.log(
        `✅ Successfully saved ${entries.length} trading signals to trades.csv`
      );
      console.log(
        `📈 Summary: ${bullishCount} BULLISH, ${bearishCount} BEARISH\n`
      );
      console.log('Trading Signals Generated:');
      console.log(
        '─────────────────────────────────────────────────────────────────'
      );
      entries.forEach((entry, idx) => {
        console.log(
          `${idx + 1}. ${entry.date} ${entry.time} - ${entry.signal} @ $${
            entry.price
          } (Vol: ${entry.volume}, CVD: ${entry.cvd})`
        );
      });
      console.log(
        '─────────────────────────────────────────────────────────────────\n'
      );
      console.log('📁 File saved as: trades.csv in current directory');
    } catch (error) {
      console.error('❌ Error writing to CSV:', error);
    }
  } else {
    console.log('⚠️  No trading signals were generated for this time period.');
    console.log(
      '    Consider adjusting your filters or testing a different time range.\n'
    );
  }
}

main().catch(console.error);
