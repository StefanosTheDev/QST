// types/index.ts
export interface Trade {
  px: number;
  size: number;
  side: 'A' | 'B' | 'N'; // Ask-hit, Bid-hit, or Neutral
  ts_ms: number;
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
  timestamp: string;
}

export interface TradingState {
  lastSignal: 'bullish' | 'bearish' | null;
  position: Position | null;
  lastEma21: number | null;
  prevBar: Bar | null;
  cvdWindow: number[];
  priceWindow: number[];
  volumeWindow: number[];
}
