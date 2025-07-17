// src/strategy/csvMain.ts

import path from 'path';
import { runSimpleBacktest } from './simpleBacktest';
import { ApiParams } from '../types';
import { selectCSV } from '../utils';

/**
 * Entry point for running the simple backtest based on user parameters.
 */
export async function runCSVBacktest(formData: ApiParams): Promise<void> {
  const csv = selectCSV(formData.barType, formData.candleType); // Select CSV.
  runSimpleBacktest(csv, formData);
}
