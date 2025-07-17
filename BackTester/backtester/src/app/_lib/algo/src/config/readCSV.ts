// data/csvReader.ts
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Bar } from '../types';
import { CONFIG } from './config';

interface CSVRow {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  cvd_open: number;
  cvd_high: number;
  cvd_low: number;
  cvd_close: number;
  '+di': number;
  '-di': number;
  adx: number;
  ema_8: number;
  ema_9: number;
  ema_13: number;
  ema_21: number;
  ema_22: number;
  ema_50: number;
  ema_100: number;
  ema_200: number;
  cvd_ema_8: number;
  cvd_ema_9: number;
  cvd_ema_13: number;
  cvd_ema_21: number;
  cvd_ema_22: number;
  cvd_ema_50: number;
  cvd_ema_100: number;
  cvd_ema_200: number;
}

interface HeikinAshiRow {
  timestamp: string;
  ha_open: number;
  ha_high: number;
  ha_low: number;
  ha_close: number;
  volume: number;
  delta: number;
  ha_cvd_open: number;
  ha_cvd_high: number;
  ha_cvd_low: number;
  ha_cvd_close: number;
  'ha_+di': number;
  'ha_-di': number;
  ha_adx: number;
  ha_ema_8: number;
  ha_ema_9: number;
  ha_ema_13: number;
  ha_ema_21: number;
  ha_ema_22: number;
  ha_ema_50: number;
  ha_ema_100: number;
  ha_ema_200: number;
  ha_cvd_ema_8: number;
  ha_cvd_ema_9: number;
  ha_cvd_ema_13: number;
  ha_cvd_ema_21: number;
  ha_cvd_ema_22: number;
  ha_cvd_ema_50: number;
  ha_cvd_ema_100: number;
  ha_cvd_ema_200: number;
}

export class CSVDataReader {
  private dataPath: string;
  private useHeikinAshi: boolean;

  constructor(useHeikinAshi: boolean = false) {
    this.useHeikinAshi = useHeikinAshi;
    // Adjust path based on your project structure
    const filename = useHeikinAshi
      ? 'mesu5_heikin_ashi_1min_with_emas_adx.csv'
      : 'mesu5_traditional_1min_with_emas_adx.csv';
    this.dataPath = path.join(__dirname, '../../data', filename);
  }

  private parseCSV(): any[] {
    try {
      const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        cast: (value, context) => {
          // Keep timestamps as strings
          if (context.column === 'timestamp') return value;
          // Convert numeric columns
          const numValue = parseFloat(value);
          return isNaN(numValue) ? value : numValue;
        },
      });
      return records;
    } catch (error) {
      console.error(`Error reading CSV file: ${this.dataPath}`, error);
      throw error;
    }
  }

  private convertToBar(
    row: CSVRow | HeikinAshiRow,
    index: number,
    allRows: any[]
  ): Bar {
    // Determine CVD color based on previous bar
    let cvd_color = 'gray';
    if (index > 0) {
      const prevRow = allRows[index - 1];
      const currentCvd = this.useHeikinAshi
        ? (row as HeikinAshiRow).ha_cvd_close
        : (row as CSVRow).cvd_close;
      const prevCvd = this.useHeikinAshi
        ? (prevRow as HeikinAshiRow).ha_cvd_close
        : (prevRow as CSVRow).cvd_close;

      if (currentCvd > prevCvd) cvd_color = 'green';
      else if (currentCvd < prevCvd) cvd_color = 'red';
    }

    if (this.useHeikinAshi) {
      const haRow = row as HeikinAshiRow;
      return {
        timestamp: haRow.timestamp,
        open: haRow.ha_open,
        high: haRow.ha_high,
        low: haRow.ha_low,
        close: haRow.ha_close,
        volume: haRow.volume,
        delta: haRow.delta,
        cvd_running: haRow.ha_cvd_close,
        cvd: haRow.ha_cvd_close,
        cvd_color,
        // Store additional data for potential use
        indicators: {
          adx: haRow.ha_adx,
          plusDi: haRow['ha_+di'],
          minusDi: haRow['ha_-di'],
          ema_21: haRow.ha_ema_21,
          ema_8: haRow.ha_ema_8,
          ema_50: haRow.ha_ema_50,
        },
      };
    } else {
      const tradRow = row as CSVRow;
      return {
        timestamp: tradRow.timestamp,
        open: tradRow.open,
        high: tradRow.high,
        low: tradRow.low,
        close: tradRow.close,
        volume: tradRow.volume,
        delta: tradRow.delta,
        cvd_running: tradRow.cvd_close,
        cvd: tradRow.cvd_close,
        cvd_color,
        // Store additional data for potential use
        indicators: {
          adx: tradRow.adx,
          plusDi: tradRow['+di'],
          minusDi: tradRow['-di'],
          ema_21: tradRow.ema_21,
          ema_8: tradRow.ema_8,
          ema_50: tradRow.ema_50,
        },
      };
    }
  }

  async *streamBars(startTime?: string, endTime?: string): AsyncGenerator<Bar> {
    const rows = this.parseCSV();
    console.log(
      `📂 Loaded ${rows.length} bars from CSV (${
        this.useHeikinAshi ? 'Heikin Ashi' : 'Traditional'
      })`
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Filter by time range if provided
      if (startTime && row.timestamp < startTime) continue;
      if (endTime && row.timestamp > endTime) break;

      const bar = this.convertToBar(row, i, rows);
      yield bar;
    }
  }

  // Synchronous version for testing
  getAllBars(startTime?: string, endTime?: string): Bar[] {
    const rows = this.parseCSV();
    const bars: Bar[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Filter by time range if provided
      if (startTime && row.timestamp < startTime) continue;
      if (endTime && row.timestamp > endTime) break;

      bars.push(this.convertToBar(row, i, rows));
    }

    return bars;
  }
}
