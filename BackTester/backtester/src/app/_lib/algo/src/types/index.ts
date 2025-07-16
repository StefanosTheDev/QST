// types/index.ts
export interface Trade {
  px: number;
  size: number;
  side: 'A' | 'B' | 'N';
  ts_ms: number;
}

export interface StrategyTrade {
  type: 'bullish' | 'bearish';
  entryPrice: number;
  exitPrice: number;
  profit: number;
  entryTime: number;
  exitTime: number;
  reason: string;
  winLoss: 'W' | 'L';
}

// New: Pre-calculated indicators from CSV
export interface BarIndicators {
  adx?: number;
  plusDi?: number;
  minusDi?: number;
  ema_8?: number;
  ema_9?: number;
  ema_13?: number;
  ema_21?: number;
  ema_22?: number;
  ema_50?: number;
  ema_100?: number;
  ema_200?: number;
  cvd_ema_8?: number;
  cvd_ema_21?: number;
  cvd_ema_50?: number;
}

export interface Bar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  cvd_running: number;
  cvd?: number;
  cvd_color?: string;
  indicators?: BarIndicators; // New: Pre-calculated indicators
}

export interface TrendlineResult {
  supportLine: number[];
  resistLine: number[];
  supSlope: number;
  resSlope: number;
  breakout: 'bullish' | 'bearish' | 'none';
}

export interface Position {
  type: 'bullish' | 'bearish';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  timestamp: number;
}

export interface TradingState {
  lastSignal: 'bullish' | 'bearish' | null;
  position: Position | null;
  lastEma21: number | null;
  prevBar: Bar | null;
  cvdWindow: number[];
  priceWindow: number[];
  highWindow: number[];
  lowWindow: number[];
  volumeWindow: number[];
  adxHighs: number[];
  adxLows: number[];
  adxCloses: number[];
}

// Form configuration with candle type
export interface FormConfig {
  timeFrame: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };

  // BAR SETTINGS
  barType: 'time' | 'tick';
  barSize: number;
  candleType: 'traditional' | 'heikinashi'; // NEW: Candle type selection
  cvdLookBackBars?: number;

  // INDICATORS
  emaMovingAverage?: number;
  adxThreshold?: number;
  adxPeriod?: number; // NEW: ADX period configuration

  // RISK
  contractSize: number;
  stopLoss: number;
  takeProfit: number;
}
