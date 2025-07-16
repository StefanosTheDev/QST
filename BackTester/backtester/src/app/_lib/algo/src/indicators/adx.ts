// src/indicators/adx.ts
import { ADX as TI_ADX } from 'technicalindicators';
import { CONFIG } from '../config/constants';

export function computeADX(
  highs: number[],
  lows: number[],
  closes: number[]
): number | null {
  // Check if ADX_PERIOD is valid (>0)
  if (CONFIG.ADX_PERIOD <= 0) {
    console.log('ADX skipped: Invalid or unset ADX_PERIOD');
    return null;
  }

  const outputs = TI_ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: CONFIG.ADX_PERIOD,
  });

  if (!outputs.length) return null;

  const latest = outputs[outputs.length - 1];
  return typeof latest.adx === 'number' ? latest.adx : null;
}
