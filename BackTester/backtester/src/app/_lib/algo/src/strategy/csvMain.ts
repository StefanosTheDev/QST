// src/strategy/csvMain.ts
import { CSVDataReader } from '../config/readCSV';
import { fitTrendlinesWindow } from '../indicators/trendlines';
import { SignalGenerator } from './signals';
import { PositionManager } from './positions';
import { formatEasternTime } from '../utils';
import { TradingState, Bar, ApiParams } from '../types';
import { TrendlineResult } from '../types';
import { selectCSV } from '../utils';
export class CSVTradingSystem {
  private state: TradingState;
  private signalGenerator = new SignalGenerator();
  private positionManager = new PositionManager();
  private csvReader: CSVDataReader;
  private usePreCalculatedIndicators: boolean = true;

  constructor(useHeikinAshi: boolean = false) {
    this.csvReader = new CSVDataReader(useHeikinAshi);
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

    // For ADX - we can either use pre-calculated or build windows
    if (!this.usePreCalculatedIndicators) {
      this.state.adxHighs.push(bar.high);
      this.state.adxLows.push(bar.low);
      this.state.adxCloses.push(bar.close);
      // Keep reasonable history for ADX
      if (this.state.adxCloses.length > 100) {
        this.state.adxHighs.shift();
        this.state.adxLows.shift();
        this.state.adxCloses.shift();
      }
    }
  }

  private async processBar(bar: Bar, idx: number): Promise<void> {
    const time = formatEasternTime(bar.timestamp);

    // Use pre-calculated EMA if available
    const ema21 =
      this.usePreCalculatedIndicators && bar.indicators?.ema_21
        ? bar.indicators.ema_21
        : this.state.lastEma21;

    console.log(
      `#${idx} ${time} | O:${bar.open.toFixed(2)} H:${bar.high.toFixed(
        2
      )} L:${bar.low.toFixed(2)}` +
        ` C:${bar.close.toFixed(2)} Vol:${bar.volume} Delta:${bar.delta}` +
        ` CVD:${bar.cvd} EMA21:${ema21?.toFixed(2) ?? 'N/A'}`
    );

    // Check for exits first
    const { exited, reason } = this.positionManager.checkExit(bar);
    if (exited) {
      console.log(`    → Trade closed (${reason}) @ ${time}`);
      this.state.lastSignal = null;
      this.state.prevBar = bar;
      this.state.lastEma21 = ema21;
      return;
    }

    // Update windows
    this.updateWindows(bar);

    // Skip if not enough data or already in position
    if (
      this.state.cvdWindow.length < CONFIG.WINDOW_SIZE ||
      this.positionManager.hasPosition()
    ) {
      this.state.prevBar = bar;
      this.state.lastEma21 = ema21;
      return;
    }

    // Fit trendlines on CVD window
    const trendlines = fitTrendlinesWindow(this.state.cvdWindow);

    // Create modified signal filters that can use pre-calculated values
    const signalFilters = {
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
      ema21: ema21 ?? 0,
      prevEma21: this.state.lastEma21,
      // Pass pre-calculated ADX if available
      preCalculatedADX: this.usePreCalculatedIndicators
        ? bar.indicators?.adx
        : undefined,
    };

    // Validate signal
    const validated = this.validateSignalWithPreCalc(
      trendlines.breakout,
      trendlines,
      signalFilters
    );

    if (validated !== 'none') {
      this.positionManager.enterPosition(validated, bar);
      this.state.lastSignal = validated;
    }

    this.state.prevBar = bar;
    this.state.lastEma21 = ema21;
  }

  // Modified signal validation that can use pre-calculated indicators
  private validateSignalWithPreCalc(
    signal: 'bullish' | 'bearish' | 'none',
    trendlines: TrendlineResult,
    filters: any
  ): 'bullish' | 'bearish' | 'none' {
    if (signal === 'none') return 'none';

    const { supSlope, resSlope } = trendlines;
    const {
      lastSignal,
      priceWindow,
      volumeWindow,
      bar,
      prevBar,
      prevEma21,
      preCalculatedADX,
    } = filters;

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
      volumeWindow.slice(0, -1).reduce((a: any, b: any) => a + b, 0) /
      (volumeWindow.length - 1);
    if (bar.volume <= avgVol) {
      console.log('    → filtered: volume below recent average');
      return 'none';
    }

    // 5. EMA filter (if enabled)
    if (CONFIG.EMA_PERIOD > 0 && prevEma21 !== null) {
      if (signal === 'bullish') {
        if (!prevBar || prevBar.low < prevEma21 || bar.close <= prevBar.close) {
          console.log('    → filtered by EMA bullish filter');
          return 'none';
        }
      } else {
        if (
          !prevBar ||
          prevBar.high > prevEma21 ||
          bar.close >= prevBar.close
        ) {
          console.log('    → filtered by EMA bearish filter');
          return 'none';
        }
      }
    }

    // 6. ADX filter - use pre-calculated if available
    if (CONFIG.ADX_PERIOD > 0 && CONFIG.ADX_THRESHOLD > 0) {
      const adxValue = preCalculatedADX ?? null;

      if (adxValue === null || adxValue === undefined) {
        console.log('    → filtered: ADX not available');
        return 'none';
      }

      if (adxValue < CONFIG.ADX_THRESHOLD) {
        console.log(
          `    → filtered by ADX: ${adxValue.toFixed(2)} < ${
            CONFIG.ADX_THRESHOLD
          }`
        );
        return 'none';
      }

      console.log(
        `    → ADX passed: ${adxValue.toFixed(2)} ≥ ${CONFIG.ADX_THRESHOLD}`
      );
    }

    // All checks passed
    return signal;
  }

  private printStatistics(): void {
    console.log(this.positionManager.getStatistics().getStatistics());
  }

  async run(start: string, end: string): Promise<void> {
    console.log(`📊 Processing CSV data from ${start} to ${end}`);
    console.log(`📈 Configuration:
      - Data Type: ${
        this.csvReader['useHeikinAshi'] ? 'Heikin Ashi' : 'Traditional'
      } 1-min bars
      - Window Size: ${CONFIG.WINDOW_SIZE}
      - EMA Period: ${CONFIG.EMA_PERIOD}
      - ADX Threshold: ${CONFIG.ADX_THRESHOLD}
      - Stop Loss: ${CONFIG.STOP_LOSS} points
      - Take Profit: ${CONFIG.TAKE_PROFIT} points
      - Using Pre-Calculated Indicators: ${this.usePreCalculatedIndicators}\n`);

    let idx = 0;
    try {
      for await (const bar of this.csvReader.streamBars(start, end)) {
        idx++;
        await this.processBar(bar, idx);
      }
    } finally {
      this.printStatistics();
      console.log('\n✅ Done');
    }
  }
}

// Updated runBacktest function to use CSV
export async function runCSVBacktest(formData: ApiParams): Promise<void> {
  const csv = selectCSV(formData.barType, formData.candleType);
  const ts = new CSVTradingSystem(useHeikinAshi);
  // console.log(`From Library: ${formData}`);
}
