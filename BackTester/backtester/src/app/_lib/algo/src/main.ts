import {
  CONFIG,
  getApiKey,
  updateConfig,
  buildDateStrings,
  FormConfig,
} from './config/constants';
import { streamBars } from './data/databento';
import { getCvdColor } from './indicators/cvd';
import { EMACalculator } from './indicators/ema';
import { fitTrendlinesWindow } from './indicators/trendlines';
import { SignalGenerator } from './strategy/signals';
import { PositionManager } from './strategy/positions';
import { formatEasternTime } from './utils/formatting';
import { TradingState, Bar } from './types';

class TradingSystem {
  private state: TradingState;
  private emaCalculator = new EMACalculator();
  private signalGenerator = new SignalGenerator();
  private positionManager = new PositionManager();
  private lastBarTime: number = 0;
  private timeoutId: NodeJS.Timeout | null = null;

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

  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      console.log('\n⚠️ No bars processed for 10 seconds, terminating...');
      this.printStatistics();
      process.exit(0);
    }, 10000);
  }

  private async processBar(bar: Bar, idx: number): Promise<void> {
    this.lastBarTime = Number(bar.timestamp);
    this.resetTimeout();

    const ema21 = this.emaCalculator.calculate(bar.close);
    const time = formatEasternTime(bar.timestamp);

    console.log(
      `#${idx} ${time} | O:${bar.open} H:${bar.high} L:${bar.low}` +
        ` C:${bar.close} Vol:${bar.volume} EMA21:${ema21.toFixed(2)}`
    );

    const { exited, reason } = this.positionManager.checkExit(bar);
    if (exited) {
      console.log(`    → Trade closed (${reason}) @ ${time}`);
      this.state.lastSignal = null;
      this.state.prevBar = bar;
      return;
    }

    this.updateWindows(bar);

    if (
      this.state.cvdWindow.length < CONFIG.WINDOW_SIZE ||
      this.positionManager.hasPosition()
    ) {
      this.state.prevBar = bar;
      return;
    }

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
      this.positionManager.enterPosition(validated, bar);
      this.state.lastSignal = validated;
    }

    this.state.prevBar = bar;
    this.state.lastEma21 = ema21;
  }

  private printStatistics(): void {
    console.log(this.positionManager.getStatistics().getStatistics());
  }

  async run(start: string, end: string): Promise<void> {
    const apiKey = getApiKey();
    console.log(`📊 Streaming… from ${start} to ${end}`);
    console.log(`📈 Configuration:
    - Tick Size: ${CONFIG.TICK_SIZE}
    - Window Size: ${CONFIG.WINDOW_SIZE}
    - EMA Period: ${CONFIG.EMA_PERIOD}
    - ADX Threshold: ${CONFIG.ADX_THRESHOLD}
    - Stop Loss: ${CONFIG.STOP_LOSS} points
    - Take Profit: ${CONFIG.TAKE_PROFIT} points\n`);

    let idx = 0;
    try {
      for await (const bar of streamBars(apiKey, start, end, getCvdColor)) {
        idx++;
        await this.processBar(bar, idx);
      }
    } finally {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      this.printStatistics();
      console.log('\n✅ Done');
    }
  }
}

export async function runBacktest(formData: FormConfig): Promise<void> {
  updateConfig(formData);
  const { start, end } = buildDateStrings(formData.timeFrame);
  const ts = new TradingSystem();
  await ts.run(start, end);
}
