// config/constants.ts
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const CONFIG = {
  // Timing configuration
  PAGE_MS: 5 * 60 * 1000, // 5-minute paging window

  // Trading parameters
  WINDOW_SIZE: 5, // Number of bars in each trendline window
  TOL_PCT: 0.001, // 0.1% dynamic tolerance for breakout
  R_MULTIPLE: 2, // Reward:risk multiple for target
  EMA_PERIOD: 21, // EMA period for filtering

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

// Get API key from environment
export const getApiKey = (): string => {
  const key = process.env.DATABENTO_API_KEY || '';
  if (!key) {
    throw new Error('❌ Please set DATABENTO_API_KEY in your .env file');
  }

  return key;
};
