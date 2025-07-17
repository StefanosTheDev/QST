// src/strategy/simpleBacktest.ts

import { loadCsvBars } from '../utils/readCSV';
import { ApiParams, CsvBar } from '../types';
/**
 * Runs a simple backtest on precomputed CSV bars using toggled filters.
 * @param csvPath Path to the CSV file
 * @param cfg Strategy configuration for filters and thresholds
 */
export function runSimpleBacktest(csvPath: string, cfg: ApiParams) {
  const bars: CsvBar[] = loadCsvBars(csvPath);

  let positionOpen = false;
  let entryPrice = 0;
  let trades = 0;
  let totalPnl = 0;

  for (const bar of bars) {
    // EMA filter
    if (cfg.emaMovingAverage) {
      const emaField = bar[
        `ema_${cfg.emaMovingAverage}` as keyof CsvBar
      ] as number;
      if (bar.close <= emaField) continue;
    }

    // ADX filter
    if (cfg.adxThreshold) {
      if ((bar as any).adx < cfg.adxThreshold) continue;
    }

    // Simple entry: price breaks above today's open
    if (!positionOpen && bar.close > bar.open) {
      positionOpen = true;
      entryPrice = bar.close;
      console.log(`↗️ Enter @ ${bar.timestamp} → ${entryPrice}`);
    }

    // Simple exit: price falls below today's open
    else if (positionOpen && bar.close < bar.open) {
      const exitPrice = bar.close;
      const pnl = exitPrice - entryPrice;
      totalPnl += pnl;
      trades += 1;
      console.log(`↘️ Exit @ ${bar.timestamp} → ${exitPrice} | PnL: ${pnl}`);
      positionOpen = false;
    }
  }

  console.log('--- Backtest Complete ---');
  console.log(`Total Trades: ${trades}`);
  console.log(`Total PnL: ${totalPnl}`);
}
