// src/main.ts
import { CONFIG, getApiKey } from './config/constants';
import { streamBars } from './data/databento';
import { getCvdColor } from './indicators/cvd';
import { EMACalculator } from './indicators/ema';
import { fitTrendlinesWindow } from './indicators/trendlines';
import { SignalGenerator } from './strategy/signals';
import { PositionManager } from './strategy/positions';
import { formatEasternTime } from './utils/formatting';
import { TradingState, Bar } from './types';

interface TradeRecord {
  type: 'bullish' | 'bearish';
  entryPrice: number;
  entryTime: string;
  exitPrice?: number;
  exitTime?: string;
  pnl?: number; // PnL for all contracts
}

class TradingSystem {
  private state: TradingState;
  private emaCalculator = new EMACalculator();
  private signalGenerator = new SignalGenerator();
  private positionManager = new PositionManager();

  // session stats stored as detailed records
  private trades: TradeRecord[] = [];

  // number of contracts per trade
  private readonly CONTRACTS = 5;

  constructor() {
    this.state = {
      lastSignal: null,
      position: null,
      lastEma21: null,
      prevBar: null,
      cvdWindow: [],
      priceWindow: [],
      highWindow: [],
      lowWindow: [],
      volumeWindow: [],
      adxHighs: [],
      adxLows: [],
      adxCloses: [],
    };
  }

  private updateWindows(bar: Bar): void {
    // ... unchanged ...
    this.state.cvdWindow.push(bar.cvd!);
    this.state.priceWindow.push(bar.close);
    this.state.highWindow.push(bar.high);
    this.state.lowWindow.push(bar.low);
    this.state.volumeWindow.push(bar.volume);
    if (this.state.cvdWindow.length > CONFIG.WINDOW_SIZE) {
      this.state.cvdWindow.shift();
      this.state.priceWindow.shift();
      this.state.highWindow.shift();
      this.state.lowWindow.shift();
      this.state.volumeWindow.shift();
    }
    this.state.adxHighs.push(bar.high);
    this.state.adxLows.push(bar.low);
    this.state.adxCloses.push(bar.close);
    if (this.state.adxCloses.length > CONFIG.ADX_HISTORY_BARS) {
      this.state.adxHighs.shift();
      this.state.adxLows.shift();
      this.state.adxCloses.shift();
    }
  }

  private async processBar(bar: Bar, idx: number): Promise<void> {
    const ema21 = this.emaCalculator.calculate(bar.close);
    const time = formatEasternTime(bar.timestamp);

    // throttled log
    if (idx % 100 === 0) {
      console.log(`#${idx} ${time} | C:${bar.close} EMA21:${ema21.toFixed(2)}`);
    }

    // EXIT
    const openPos = this.positionManager.getPosition();
    const exitResult = this.positionManager.checkExit(bar);
    if (exitResult.exited && openPos) {
      const lastTrade = this.trades[this.trades.length - 1];
      const exitPrice =
        exitResult.reason === 'stop-loss'
          ? openPos.stopPrice
          : openPos.targetPrice;
      lastTrade.exitPrice = exitPrice;
      lastTrade.exitTime = bar.timestamp;
      // calculate raw pnl per contract then scale
      const rawPnl =
        openPos.type === 'bullish'
          ? exitPrice - openPos.entryPrice
          : openPos.entryPrice - exitPrice;
      lastTrade.pnl = rawPnl * this.CONTRACTS;

      console.log(
        `    → Trade closed (${
          exitResult.reason
        }) @ ${time} | PnL=${lastTrade.pnl.toFixed(2)}`
      );

      this.state.lastSignal = null;
      this.state.prevBar = bar;
      return;
    }

    // ENTRY
    this.updateWindows(bar);
    if (
      this.state.cvdWindow.length >= CONFIG.WINDOW_SIZE &&
      !this.positionManager.hasPosition()
    ) {
      const trendlines = fitTrendlinesWindow(this.state.cvdWindow);
      const validated = this.signalGenerator.validateSignal(
        trendlines.breakout,
        trendlines,
        {
          lastSignal: this.state.lastSignal,
          priceWindow: this.state.priceWindow,
          highWindow: this.state.highWindow,
          lowWindow: this.state.lowWindow,
          volumeWindow: this.state.volumeWindow,
          adxHighs: this.state.adxHighs,
          adxLows: this.state.adxLows,
          adxCloses: this.state.adxCloses,
          bar,
          prevBar: this.state.prevBar,
          ema21,
          prevEma21: this.state.lastEma21,
        }
      );
      if (validated !== 'none') {
        this.trades.push({
          type: validated,
          entryPrice: bar.close,
          entryTime: bar.timestamp,
        });
        this.positionManager.enterPosition(validated, bar);
        this.state.lastSignal = validated;
      }
    }

    this.state.prevBar = bar;
    this.state.lastEma21 = ema21;
  }

  async run(start: string, end: string): Promise<void> {
    const apiKey = getApiKey();
    console.log(`📊 Streaming… from ${start} to ${end}\n`);

    const endMs = new Date(end).getTime();
    let idx = 0;
    for await (const bar of streamBars(apiKey, start, end, getCvdColor)) {
      const tsMs = new Date(bar.timestamp).getTime();
      if (tsMs >= endMs) {
        console.log(`\n⏹ Reached end time at ${bar.timestamp}`);
        break;
      }
      idx++;
      await this.processBar(bar, idx);
    }

    // SUMMARY
    console.log('\n✅ Done');
    console.log('=== Session Summary ===');
    const total = this.trades.length;
    const wins = this.trades.filter((t) => (t.pnl ?? 0) > 0).length;
    const losses = total - wins;
    const sum = this.trades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
    console.log(`Total trades:           ${total}`);
    console.log(`Wins:                   ${wins}`);
    console.log(`Losses:                 ${losses}`);
    console.log(
      `Win rate:               ${
        total > 0 ? ((wins / total) * 100).toFixed(2) : '0.00'
      }%`
    );
    console.log(`Total P&L:              ${sum.toFixed(2)}`);
    console.log(
      `Average P&L per trade:  ${total > 0 ? (sum / total).toFixed(2) : '0.00'}`
    );
  }
}

// execute…
async function main() {
  const ts = new TradingSystem();
  // full session, 9:30 AM–4:00 PM EDT on June 13, 2025
  await ts.run('2025-06-13T09:30:00-04:00', '2025-06-13T16:00:00-04:00');
}

main().catch(console.error);
