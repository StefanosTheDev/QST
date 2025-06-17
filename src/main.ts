// main.ts
import { CONFIG, getApiKey } from './config/constants';
import { streamOneMinuteBars } from './data/databento';
import { getCvdColor } from './indicators/cvd';
import { EMACalculator } from './indicators/ema';
import { fitTrendlinesWindow } from './indicators/trendlines';
import { SignalGenerator } from './strategy/signals';
import { PositionManager } from './strategy/positions';
import { formatEasternTime } from './utils/formatting';
import { TradingState, Bar } from './types';

class TradingSystem {
  private state: TradingState;
  private emaCalculator: EMACalculator;
  private signalGenerator: SignalGenerator;
  private positionManager: PositionManager;

  constructor() {
    this.state = {
      lastSignal: null,
      position: null,
      lastEma21: null,
      prevBar: null,
      cvdWindow: [],
      priceWindow: [],
      volumeWindow: [],
    };

    this.emaCalculator = new EMACalculator();
    this.signalGenerator = new SignalGenerator();
    this.positionManager = new PositionManager();
  }

  private updateWindows(bar: Bar): void {
    this.state.cvdWindow.push(bar.cvd!);
    this.state.priceWindow.push(bar.close);
    this.state.volumeWindow.push(bar.volume);

    // Maintain window size
    if (this.state.cvdWindow.length > CONFIG.WINDOW_SIZE) {
      this.state.cvdWindow.shift();
      this.state.priceWindow.shift();
      this.state.volumeWindow.shift();
    }
  }

  private async processBar(bar: Bar, barIndex: number): Promise<void> {
    const ema21 = this.emaCalculator.calculate(bar.close);
    const time = formatEasternTime(bar.timestamp);

    // Log bar info
    console.log(
      `#${barIndex} ${time} | O:${bar.open.toFixed(2)} H:${bar.high.toFixed(
        2
      )} ` +
        `L:${bar.low.toFixed(2)} C:${bar.close.toFixed(2)} Vol:${bar.volume} ` +
        `CVD:${bar.cvd} Color:${bar.cvd_color} EMA21:${ema21.toFixed(2)}`
    );

    // Check exits first
    const { exited } = this.positionManager.checkExit(bar);
    if (exited) {
      this.state.lastSignal = null;
      this.state.prevBar = bar;
      return;
    }

    // Update windows
    this.updateWindows(bar);

    // Skip if not enough data or in position
    if (this.state.cvdWindow.length < CONFIG.WINDOW_SIZE) {
      this.state.prevBar = bar;
      return;
    }

    if (this.positionManager.hasPosition()) {
      console.log(`    → in position, waiting for exit`);
      this.state.prevBar = bar;
      return;
    }

    // Generate and validate signals
    const trendlines = fitTrendlinesWindow(this.state.cvdWindow);
    const validatedSignal = this.signalGenerator.validateSignal(
      trendlines.breakout,
      trendlines,
      {
        lastSignal: this.state.lastSignal,
        priceWindow: this.state.priceWindow,
        volumeWindow: this.state.volumeWindow,
        bar,
        prevBar: this.state.prevBar,
        ema21,
        prevEma21: this.state.lastEma21,
      }
    );

    // Enter position if valid signal
    if (validatedSignal !== 'none') {
      this.positionManager.enterPosition(
        validatedSignal,
        bar,
        this.state.priceWindow
      );
      this.state.lastSignal = validatedSignal;
    }

    this.state.prevBar = bar;
    this.state.lastEma21 = ema21;
  }

  async run(startTime: string, endTime: string): Promise<void> {
    const apiKey = getApiKey();

    console.log(
      '📊 Streaming 1-min MESM5 bars w/ true CVD + trendlines + entries'
    );
    console.log(`Period: ${startTime} to ${endTime}\n`);

    let barIndex = 0;

    for await (const bar of streamOneMinuteBars(
      apiKey,
      startTime,
      endTime,
      getCvdColor
    )) {
      barIndex++;
      await this.processBar(bar, barIndex);
    }

    console.log('\n✅ Trading session completed');
  }
}

// Main execution
async function main() {
  try {
    const tradingSystem = new TradingSystem();

    // Trading session parameters
    const START_TIME = '2025-05-07T18:00:00-04:00'; // 6:00 PM EDT
    const END_TIME = '2025-05-07T21:00:00-04:00'; // 9:00 PM EDT

    await tradingSystem.run(START_TIME, END_TIME);
  } catch (error) {
    console.error('❌ Error in trading system:', error);
    process.exit(1);
  }
}

// Run the system
main().catch(console.error);
