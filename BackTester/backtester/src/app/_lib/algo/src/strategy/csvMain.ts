// src/strategy/csvMain.ts
import { runSimpleBacktest } from './simpleBacktest';
import { ApiParams } from '../types';

export async function runCSVBacktest(
  csv: string,
  formData: ApiParams
): Promise<void> {
  runSimpleBacktest(csv, formData);
}
