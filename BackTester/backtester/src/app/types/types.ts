export interface FormProp {
  // …keep these
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timeframe: string;

  // replace the old tickType/barType numeric pair with:
  barType: 'time' | 'tick';
  barSize: number;

  // leave this as-is
  cvdLookBackBars?: number;
  emaMovingAverage?: number;
  adxThreshold?: number;

  contractSize: number;
  stopLoss: number;
  takeProfit: number;
}
