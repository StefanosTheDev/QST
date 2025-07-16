// indicators/ema.ts
import { CONFIG } from '../config/constants';

export class EMACalculator {
  private lastEma: number | null = null;
  private k: number | null = null;

  constructor() {
    // Only initialize if period is valid (>0)
    if (CONFIG.EMA_PERIOD > 0) {
      this.k = 2 / (CONFIG.EMA_PERIOD + 1);
    } else {
      console.log('EMA skipped: Invalid or unset EMA_PERIOD');
      this.k = null;
    }
  }

  // Add method to reinitialize if period changes
  reinitialize(): void {
    if (CONFIG.EMA_PERIOD > 0) {
      this.k = 2 / (CONFIG.EMA_PERIOD + 1);
    } else {
      this.k = null;
    }
    this.lastEma = null;
  }

  calculate(price: number): number | null {
    if (this.k === null) {
      // Skip calculation if not initialized
      return null;
    }
    if (this.lastEma === null) {
      this.lastEma = price; // Seed with first price
      return price;
    }

    const ema = (price - this.lastEma) * this.k + this.lastEma;
    this.lastEma = ema;
    return ema;
  }

  getCurrentEma(): number | null {
    return this.lastEma;
  }

  reset(): void {
    this.lastEma = null;
  }
}
