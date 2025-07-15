// src/indicators/heikinAshi.ts
import type { Bar } from '../types';

export class HeikinAshiCalculator {
  private prevHaOpen: number | null = null;
  private prevHaClose: number | null = null;

  /**
   * Transforms a raw OHLC bar into a full Bar with Heikin-Ashi values,
   * preserving all other properties (volume, delta, cvd_running, etc.).
   */
  next(bar: Bar): Bar {
    const {
      open: rawOpen,
      high: rawHigh,
      low: rawLow,
      close: rawClose,
      timestamp,
      ...rest
    } = bar;

    // 1) HA-Close = (O + H + L + C) / 4
    const haClose = (rawOpen + rawHigh + rawLow + rawClose) / 4;

    // 2) HA-Open = avg(prev HA-Open, prev HA-Close), or (O + C)/2 on first bar
    const haOpen =
      this.prevHaOpen !== null && this.prevHaClose !== null
        ? (this.prevHaOpen + this.prevHaClose) / 2
        : (rawOpen + rawClose) / 2;

    // 3) HA-High = max(raw H, HA-Open, HA-Close)
    const haHigh = Math.max(rawHigh, haOpen, haClose);

    // 4) HA-Low = min(raw L, HA-Open, HA-Close)
    const haLow = Math.min(rawLow, haOpen, haClose);

    // store for next iteration
    this.prevHaOpen = haOpen;
    this.prevHaClose = haClose;

    console.log('HAKEINSAHI HIT');
    // return a full Bar
    return {
      timestamp,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      ...rest, // volume, delta, cvd_running, etc.
    };
  }
}
