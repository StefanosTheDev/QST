// src/indicators/adx.ts
import { ADX as TI_ADX } from 'technicalindicators';
import { CONFIG } from '../config/constants';

interface ADXResult {
  adx: number;
}

export function computeADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = CONFIG.ADX_PERIOD
): number | null {
  const outputs = TI_ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period,
  }) as ADXResult[];
  return outputs.length ? outputs[outputs.length - 1].adx : null;
}
