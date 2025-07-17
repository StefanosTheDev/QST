import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

import { CsvBar } from '../types';
export function loadCsvBars(filename: string): CsvBar[] {
  const csvDir = path.join(
    process.cwd(),
    'src',
    'app',
    '_lib',
    'algo',
    'src',
    'csv_database'
  );
  const fullPath = path.join(csvDir, filename);
  console.log('Loading CSV from', fullPath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  // 2) Parse into an array of records
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  // 3) Coerce into your CsvBar type
  return records.map((r) => ({
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
