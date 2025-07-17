// utils/calculations.ts

export function deltaFromSide(side: 'A' | 'B' | 'N', size: number): number {
  if (side === 'B') return +size; // bid-hit = buy pressure
  if (side === 'A') return -size; // ask-hit = sell pressure
  return 0; // neutral
}

export function calculateLinearRegression(y: number[]): {
  slope: number;
  residuals: number[];
} {
  const N = y.length;
  const x = Array.from({ length: N }, (_, i) => i);
  const meanX = x.reduce((a, b) => a + b, 0) / N;
  const meanY = y.reduce((a, b) => a + b, 0) / N;
  const covXY = x.reduce((s, xi, i) => s + (xi - meanX) * (y[i] - meanY), 0);
  const varX = x.reduce((s, xi) => s + (xi - meanX) ** 2, 0);
  const slope = covXY / varX;
  const residuals = y.map((yi, i) => yi - slope * i);

  return { slope, residuals };
}
export function formatEasternTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: true,
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function selectCSV(barType: string, candleType: string): string {
  const csvOptions = [
    {
      id: 1,
      barType: 'time',
      candleType: 'traditional',
      csv: 'csv_database/mesu5_traditional_1min_with_emas.csv',
    },
    {
      id: 2,
      barType: 'tick',
      candleType: 'traditional',
      csv: 'csv_database/mesu5_traditional_1min_with_emas.csv',
    },
    {
      id: 3,
      barType: 'time',
      candleType: 'heikinashi',
      csv: 'csv_database/mesu5_heikin_ashi_1min_with_emas.csv',
    },
    {
      id: 4,
      barType: 'tick',
      candleType: 'heikinashi',
      csv: 'csv_database/mesu5_heikin_ashi_1min_with_emas.csv',
    },
  ];

  const match = csvOptions.find(
    (opt) => opt.barType === barType && opt.candleType === candleType
  );

  if (!match) {
    throw new Error(
      `No CSV found for barType="${barType}" and candleType="${candleType}"`
    );
  }

  return match.csv;
}
