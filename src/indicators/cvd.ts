// indicators/cvd.ts
import { Bar } from '../types';

export function getCvdColor(
  bar: Bar,
  prevHigh: number | null,
  prevLow: number | null,
  strongUpdown = true
): string {
  const { close, open } = bar;

  if (!strongUpdown) {
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
