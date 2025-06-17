// src/config/constants.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const CONFIG = {
  // Timing configuration
  PAGE_MS: 5 * 60 * 1000, // 5-minute paging window

  // Bar aggregation settings
  BAR_TYPE: 'tick' as 'time' | 'tick',
  TICK_SIZE: 700,

  // Trading parameters
  WINDOW_SIZE: 5, // Number of bars in each trendline window
  TOL_PCT: 0.001, // 0.1% dynamic tolerance for breakout
  R_MULTIPLE: 2, // Reward:risk multiple for target
  EMA_PERIOD: 21, // EMA period for filtering

  // ADX settings
  ADX_PERIOD: 14, // look-back for ADX calculation
  ADX_HISTORY_BARS: 3 * 14, // keep ~3×period (≈42) bars for ADX warm-up

  // Databento parameters
  DATABENTO: {
    DATASET: 'GLBX.MDP3',
    SCHEMA: 'trades',
    SYMBOL: 'MESM5',
    API_URL: 'https://hist.databento.com/v0/timeseries.get_range',
  },

  // Optimization parameters
  OPTIMIZE: {
    MIN_STEP: 1e-4,
    MAX_ITERS_MULTIPLIER: 20, // max iterations = window_size * this
    MAX_NO_IMPROVE_MULTIPLIER: 5, // max no improvement = window_size * this
  },
} as const;

export const getApiKey = (): string => {
  const key = process.env.DATABENTO_API_KEY || '';
  if (!key) {
    throw new Error('❌ Please set DATABENTO_API_KEY in your .env file');
  }
  return key;
};
