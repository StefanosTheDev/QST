// indicators/ema.ts
import { CONFIG } from '../config/constants';

export class EMACalculator {
  private lastEma: number | null = null;
  private readonly k: number;

  constructor(period: number = CONFIG.EMA_PERIOD) {
    this.k = 2 / (period + 1);
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
