// src/utils/readCsv.ts

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { CsvBar } from '../types/index';

/**
 * Load and parse a CSV file of precomputed bars into CsvBar objects
 * @param pathToFile Relative or absolute path to the CSV file
 */
export function loadCsvBars(pathToFile: string): CsvBar[] {
  const rawCsv = fs.readFileSync(pathToFile, 'utf8');
  const records = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  // Map parsed records (string values) into typed CsvBar
  return (records as any[]).map((r) => ({
    timestamp: r.timestamp,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
    delta: Number(r.delta),
    cvd_open: Number(r.cvd_open),
    cvd_high: Number(r.cvd_high),
    cvd_low: Number(r.cvd_low),
    cvd_close: Number(r.cvd_close),
    ema_8: Number(r.ema_8),
    ema_9: Number(r.ema_9),
    ema_13: Number(r.ema_13),
    ema_21: Number(r.ema_21),
    ema_22: Number(r.ema_22),
    ema_50: Number(r.ema_50),
    ema_100: Number(r.ema_100),
    ema_200: Number(r.ema_200),
    cvd_ema_8: Number(r.cvd_ema_8),
    cvd_ema_9: Number(r.cvd_ema_9),
    cvd_ema_13: Number(r.cvd_ema_13),
    cvd_ema_21: Number(r.cvd_ema_21),
    cvd_ema_22: Number(r.cvd_ema_22),
    cvd_ema_50: Number(r.cvd_ema_50),
    cvd_ema_100: Number(r.cvd_ema_100),
    cvd_ema_200: Number(r.cvd_ema_200),
  }));
}
