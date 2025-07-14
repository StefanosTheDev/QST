// indicators/ema.ts
import { CONFIG } from '../config/constants';

export class EMACalculator {
  private lastEma: number | null = null;
  private k: number;

  constructor() {
    // Calculate k based on current config
    this.k = 2 / (CONFIG.EMA_PERIOD + 1);
  }

  // Add method to reinitialize if period changes
  reinitialize(): void {
    this.k = 2 / (CONFIG.EMA_PERIOD + 1);
    this.lastEma = null;
  }

  calculate(price: number): number {
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
