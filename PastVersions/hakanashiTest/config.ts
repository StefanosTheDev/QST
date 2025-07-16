// ── Configuration ─────────────────────────────────────────────────────────────
export const PAGE_MS = 5 * 60 * 1000; // 5-minute paging window
export const WINDOW_SIZE = 5; // Number of bars in each trendline window
export const TOL_PCT = 0.001; // 0.1% dynamic tolerance for breakout
export const USE_EMA_FILTER = false; // Toggle to enable/disable 21-EMA filter

// Databento parameters
export const DATASET = 'GLBX.MDP3';
export const SCHEMA = 'trades';
export const SYMBOL = 'MESU5';

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
  haOpen?: number;
  haHigh?: number;
  haLow?: number;
  haClose?: number;
}

export const state = {
  lastEma21: null as number | null,
  prevBar: null as Bar | null,
  prevHaOpen: null as number | null,
  prevHaClose: null as number | null,
};
