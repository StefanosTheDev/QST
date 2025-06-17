// strategy/signals.ts
import { Bar, TrendlineResult } from '../types';

export interface SignalFilters {
  lastSignal: 'bullish' | 'bearish' | null;
  priceWindow: number[];
  volumeWindow: number[];
  bar: Bar;
  prevBar: Bar | null;
  ema21: number;
  prevEma21: number | null;
}

export class SignalGenerator {
  validateSignal(
    signal: 'bullish' | 'bearish' | 'none',
    trendlines: TrendlineResult,
    filters: SignalFilters
  ): 'bullish' | 'bearish' | 'none' {
    if (signal === 'none') return 'none';

    const { supSlope, resSlope } = trendlines;
    const { lastSignal, priceWindow, volumeWindow, bar, prevBar, prevEma21 } =
      filters;

    // 1. Reversal filter
    if (signal === lastSignal) {
      console.log(`    → filtered: waiting for reversal from ${lastSignal}`);
      return 'none';
    }

    // 2. Slope filters
    if (signal === 'bullish' && resSlope <= 0) {
      console.log('    → filtered: resistance slope not positive');
      return 'none';
    }
    if (signal === 'bearish' && supSlope >= 0) {
      console.log('    → filtered: support slope not negative');
      return 'none';
    }

    // 3. Price confirmation
    const prevPrices = priceWindow.slice(0, -1);
    if (signal === 'bullish' && bar.close <= Math.max(...prevPrices)) {
      console.log('    → filtered: price did not exceed recent highs');
      return 'none';
    }
    if (signal === 'bearish' && bar.close >= Math.min(...prevPrices)) {
      console.log('    → filtered: price did not drop below recent lows');
      return 'none';
    }

    // 4. Volume confirmation
    const avgVol =
      volumeWindow.slice(0, -1).reduce((a, b) => a + b, 0) /
      (volumeWindow.length - 1);
    if (bar.volume <= avgVol) {
      console.log('    → filtered: volume below recent average');
      return 'none';
    }

    // 5. EMA filter
    if (signal === 'bullish') {
      if (
        !prevBar ||
        !prevEma21 ||
        prevBar.low < prevEma21 ||
        bar.close <= prevBar.close
      ) {
        console.log('    → filtered by EMA21 bullish filter');
        return 'none';
      }
    } else if (signal === 'bearish') {
      if (
        !prevBar ||
        !prevEma21 ||
        prevBar.high > prevEma21 ||
        bar.close >= prevBar.close
      ) {
        console.log('    → filtered by EMA21 bearish filter');
        return 'none';
      }
    }

    return signal;
  }
}
