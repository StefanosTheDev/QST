/**
 * Completed backtest trade record
 */
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

/**
 * Single bar with all precomputed indicators from the CSV
 */
export interface CsvBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  cvd_open: number;
  cvd_high: number;
  cvd_low: number;
  cvd_close: number;
  ema_8: number;
  ema_9: number;
  ema_13: number;
  ema_21: number;
  ema_22: number;
  ema_50: number;
  ema_100: number;
  ema_200: number;
  cvd_ema_8: number;
  cvd_ema_9: number;
  cvd_ema_13: number;
  cvd_ema_21: number;
  cvd_ema_22: number;
  cvd_ema_50: number;
  cvd_ema_100: number;
  cvd_ema_200: number;
}

/**
 * Parameters passed from the frontend to configure the CSV backtest
 */
export interface ApiParams {
  start: string;
  end: string;

  // Simplified bar settings
  barType: 'time' | 'tick';
  barSize: number;
  candleType: 'traditional' | 'heikinashi';
  cvdLookBackBars?: number;

  // Indicator Settings
  emaMovingAverage?: number;
  adxThreshold?: number;
  adxPeriod?: number;

  // Risk Management
  contractSize: number;
  stopLoss: number;
  takeProfit: number;
}
