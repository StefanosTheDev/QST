// strategy/positions.ts
import { Bar, Position } from '../types';
import { CONFIG } from '../config/constants';
import { formatEasternTime } from '../utils/formatting';

export class PositionManager {
  private position: Position | null = null;

  hasPosition(): boolean {
    return this.position !== null;
  }

  getPosition(): Position | null {
    return this.position;
  }

  checkExit(bar: Bar): { exited: boolean; reason?: string } {
    if (!this.position) return { exited: false };

    const time = formatEasternTime(bar.timestamp);

    if (this.position.type === 'bullish') {
      // Check stop loss
      if (bar.low <= this.position.stopPrice) {
        console.log(
          `  → 🚫 STOP-LOSS LONG @ ${time} | stop was ${this.position.stopPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'stop-loss' };
      }
      // Check take profit
      if (bar.high >= this.position.targetPrice) {
        console.log(
          `  → 🎯 TAKE-PROFIT LONG @ ${time} | target was ${this.position.targetPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'take-profit' };
      }
    } else if (this.position.type === 'bearish') {
      // Check stop loss
      if (bar.high >= this.position.stopPrice) {
        console.log(
          `  → 🚫 STOP-LOSS SHORT @ ${time} | stop was ${this.position.stopPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'stop-loss' };
      }
      // Check take profit
      if (bar.low <= this.position.targetPrice) {
        console.log(
          `  → 🎯 TAKE-PROFIT SHORT @ ${time} | target was ${this.position.targetPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'take-profit' };
      }
    }

    return { exited: false };
  }

  enterPosition(
    signal: 'bullish' | 'bearish',
    bar: Bar,
    priceWindow: number[]
  ): Position {
    const entry = bar.close;
    let stopPrice: number;
    let targetPrice: number;

    if (signal === 'bullish') {
      stopPrice = Math.min(...priceWindow);
      const R = entry - stopPrice;
      targetPrice = entry + R * CONFIG.R_MULTIPLE;

      console.log(`    → ENTRY SIGNAL: BULLISH`);
      console.log(`       Stop price:   ${stopPrice.toFixed(2)}`);
      console.log(`       Target price: ${targetPrice.toFixed(2)}\n`);
    } else {
      stopPrice = Math.max(...priceWindow);
      const R = stopPrice - entry;
      targetPrice = entry - R * CONFIG.R_MULTIPLE;

      console.log(`    → ENTRY SIGNAL: BEARISH`);
      console.log(`       Stop price:   ${stopPrice.toFixed(2)}`);
      console.log(`       Target price: ${targetPrice.toFixed(2)}\n`);
    }

    this.position = {
      type: signal,
      entryPrice: entry,
      stopPrice,
      targetPrice,
      timestamp: bar.timestamp,
    };

    return this.position;
  }

  reset(): void {
    this.position = null;
  }
}
