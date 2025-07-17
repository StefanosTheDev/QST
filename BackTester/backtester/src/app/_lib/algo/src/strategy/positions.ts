import { Bar, Position, StrategyTrade } from '../types';
import { formatEasternTime } from '../utils/formatting';
import { CONFIG } from '../config/config';

export class TradeStatistics {
  private trades: StrategyTrade[] = [];
  private contractMultiplier: number = 50; // $50 per point (e.g., E-mini S&P 500); adjust via CONFIG if available

  logTrade(trade: StrategyTrade): void {
    this.trades.push(trade);
  }

  getTradeCount(): number {
    return this.trades.length;
  }

  getWinRate(): number {
    if (this.trades.length === 0) return 0;
    const wins = this.trades.filter((t) => t.profit > 0).length;
    return (wins / this.trades.length) * 100;
  }

  getAverageProfit(): number {
    if (this.trades.length === 0) return 0;
    const totalProfit = this.trades.reduce((sum, t) => sum + t.profit, 0);
    return totalProfit / this.trades.length;
  }

  getSharpeRatio(): number {
    if (this.trades.length < 2) return 0;

    const returns = this.trades.map((t) => t.profit / t.entryPrice);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
      (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    // Risk-free rate = 0, annualized with 252 trading days
    return stdDev > 0 ? (meanReturn * Math.sqrt(252)) / stdDev : 0;
  }

  getDailyPnL(): Record<string, number> {
    const dailyPnL: Record<string, number> = {};
    for (const trade of this.trades) {
      const exitDate = formatEasternTime(trade.exitTime.toString()).split(
        ' '
      )[0]; // e.g., "2025-06-18"
      const profitInDollars = trade.profit * this.contractMultiplier;
      dailyPnL[exitDate] = (dailyPnL[exitDate] || 0) + profitInDollars;
    }
    return dailyPnL;
  }

  getStatistics(): string {
    const tradeDetails = this.trades
      .map((t) => {
        const entryTime = formatEasternTime(t.entryTime.toString());
        const exitTime = formatEasternTime(t.exitTime.toString());
        return `Trade: ${t.type.toUpperCase()} | Entry: ${entryTime} @ ${t.entryPrice.toFixed(
          2
        )} | Exit: ${exitTime} @ ${t.exitPrice.toFixed(2)} | ${
          t.winLoss
        } | Profit: ${t.profit.toFixed(2)} points`;
      })
      .join('\n');

    const dailyPnL = Object.entries(this.getDailyPnL())
      .map(([date, pnl]) => `Date: ${date} | PnL: $${pnl.toFixed(2)}`)
      .join('\n');

    return `
Trade Statistics:
- Total Trades: ${this.getTradeCount()}
- Win Rate: ${this.getWinRate().toFixed(2)}%
- Average Profit: ${this.getAverageProfit().toFixed(2)} points
- Sharpe Ratio: ${this.getSharpeRatio().toFixed(2)}
- Trade Details:
${tradeDetails || '  No trades'}
- Daily PnL:
${dailyPnL || '  No PnL data'}

Definitions:
- Average Profit: The average profit/loss per trade in points, calculated as the total profit divided by the number of trades.
- Sharpe Ratio: A measure of risk-adjusted return, calculated as the annualized mean return (profit/entryPrice) divided by the standard deviation of returns, assuming a risk-free rate of 0.
    `;
  }

  reset(): void {
    this.trades = [];
  }
}

export class PositionManager {
  private position: Position | null = null;
  private statistics: TradeStatistics = new TradeStatistics();

  hasPosition(): boolean {
    return this.position !== null;
  }

  checkExit(bar: Bar): { exited: boolean; reason?: string; profit?: number } {
    if (!this.position) return { exited: false };

    const time = formatEasternTime(bar.timestamp);
    const { type, stopPrice, targetPrice, entryPrice } = this.position;
    let profit: number | undefined;

    if (type === 'bullish') {
      if (bar.low <= stopPrice) {
        console.log(
          `  → 🚫 STOP-LOSS LONG @ ${time} | stop was ${stopPrice.toFixed(2)}`
        );
        profit = stopPrice - entryPrice;
        this.logTrade(bar, 'stop-loss', profit);
        this.position = null;
        return { exited: true, reason: 'stop-loss', profit };
      }
      if (bar.high >= targetPrice) {
        console.log(
          `  → 🎯 TAKE-PROFIT LONG @ ${time} | target was ${targetPrice.toFixed(
            2
          )}`
        );
        profit = targetPrice - entryPrice;
        this.logTrade(bar, 'take-profit', profit);
        this.position = null;
        return { exited: true, reason: 'take-profit', profit };
      }
    } else {
      if (bar.high >= stopPrice) {
        console.log(
          `  → 🚫 STOP-LOSS SHORT @ ${time} | stop was ${stopPrice.toFixed(2)}`
        );
        profit = entryPrice - stopPrice;
        this.logTrade(bar, 'stop-loss', profit);
        this.position = null;
        return { exited: true, reason: 'stop-loss', profit };
      }
      if (bar.low <= targetPrice) {
        console.log(
          `  → 🎯 TAKE-PROFIT SHORT @ ${time} | target was ${targetPrice.toFixed(
            2
          )}`
        );
        profit = entryPrice - targetPrice;
        this.logTrade(bar, 'take-profit', profit);
        this.position = null;
        return { exited: true, reason: 'take-profit', profit };
      }
    }

    return { exited: false };
  }

  private logTrade(bar: Bar, reason: string, profit: number): void {
    if (!this.position) return;
    const trade: StrategyTrade = {
      type: this.position.type,
      entryPrice: this.position.entryPrice,
      exitPrice:
        reason === 'stop-loss'
          ? this.position.stopPrice
          : this.position.targetPrice,
      profit,
      entryTime: this.position.timestamp,
      exitTime: Number(bar.timestamp),
      reason,
      winLoss: profit > 0 ? 'W' : 'L',
    };
    this.statistics.logTrade(trade);
  }

  enterPosition(signal: 'bullish' | 'bearish', bar: Bar): Position {
    const entry = bar.close;
    const stopDistance = CONFIG.STOP_LOSS;
    const targetDistance = CONFIG.TAKE_PROFIT;

    const stopPrice =
      signal === 'bullish' ? entry - stopDistance : entry + stopDistance;
    const targetPrice =
      signal === 'bullish' ? entry + targetDistance : entry - targetDistance;

    console.log(
      `    → ENTRY SIGNAL: ${signal.toUpperCase()} @ ${formatEasternTime(
        bar.timestamp
      )} | Entry=${entry.toFixed(2)} Stop=${stopPrice.toFixed(
        2
      )} Target=${targetPrice.toFixed(2)}`
    );

    this.position = {
      type: signal,
      entryPrice: entry,
      stopPrice,
      targetPrice,
      timestamp: Number(bar.timestamp),
    };
    return this.position;
  }

  getStatistics(): TradeStatistics {
    return this.statistics;
  }

  reset(): void {
    this.position = null;
    this.statistics.reset();
  }
}
