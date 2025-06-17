// src/strategy/positions.ts
import { Bar, Position } from '../types';
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
      // stop-loss
      if (bar.low <= this.position.stopPrice) {
        console.log(
          `  → 🚫 STOP-LOSS LONG @ ${time} | stop was ${this.position.stopPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'stop-loss' };
      }
      // take-profit
      if (bar.high >= this.position.targetPrice) {
        console.log(
          `  → 🎯 TAKE-PROFIT LONG @ ${time} | target was ${this.position.targetPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'take-profit' };
      }
    } else {
      // stop-loss short
      if (bar.high >= this.position.stopPrice) {
        console.log(
          `  → 🚫 STOP-LOSS SHORT @ ${time} | stop was ${this.position.stopPrice.toFixed(
            2
          )}`
        );
        this.position = null;
        return { exited: true, reason: 'stop-loss' };
      }
      // take-profit short
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

  enterPosition(signal: 'bullish' | 'bearish', bar: Bar): Position {
    const entry = bar.close;
    // fixed 3-point stop & target
    const stopPrice = signal === 'bullish' ? entry - 3 : entry + 3;
    const targetPrice = signal === 'bullish' ? entry + 3 : entry - 3;

    console.log(
      `    → ENTRY SIGNAL: ${signal.toUpperCase()} @ ${entry.toFixed(2)}`
    );
    console.log(`       Stop price:   ${stopPrice.toFixed(2)}`);
    console.log(`       Target price: ${targetPrice.toFixed(2)}\n`);

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
