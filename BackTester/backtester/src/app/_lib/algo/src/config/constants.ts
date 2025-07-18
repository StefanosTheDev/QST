// src/config/constants.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface TimeFrame {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export interface FormConfig {
  timeFrame: TimeFrame;

  // BAR SETTINGS
  barType: 'time' | 'tick';
  barSize: number;
  candleType: 'traditional' | 'heikinashi';
  cvdLookBackBars?: number;

  // INDICATORS
  emaMovingAverage?: number;
  adxThreshold?: number;
  adxPeriod?: number;

  // RISK
  contractSize: number;
  stopLoss: number;
  takeProfit: number;
}

// Set defaults
const DEFAULTS = {
  PAGE_MS: 5 * 60 * 1000,
  BAR_TYPE: 'time' as 'time' | 'tick',
  TICK_SIZE: 100,
  WINDOW_SIZE: 5,
  TOL_PCT: 0.001,
  R_MULTIPLE: 2,
  EMA_PERIOD: 0,
  ADX_PERIOD: 14,
  ADX_THRESHOLD: 0,
  CONTRACT_SIZE: 1,
  STOP_LOSS: 4,
  TAKE_PROFIT: 3,
};

let dynamicConfig: Record<string, any> = { ...DEFAULTS };

export function updateConfig(formData: FormConfig) {
  // 1) Bar type and size
  if (formData.barType === 'time') {
    dynamicConfig.BAR_TYPE = 'time';
    dynamicConfig.PAGE_MS = formData.barSize * 60_000;
  } else {
    dynamicConfig.BAR_TYPE = 'tick';
    dynamicConfig.TICK_SIZE = formData.barSize;
  }

  // 2) CVD lookback
  if (formData.cvdLookBackBars != null && formData.cvdLookBackBars > 0) {
    dynamicConfig.WINDOW_SIZE = formData.cvdLookBackBars;
  }

  // 3) Indicators - only set if provided and positive
  if (formData.emaMovingAverage != null && formData.emaMovingAverage > 0) {
    dynamicConfig.EMA_PERIOD = formData.emaMovingAverage;
  } else {
    dynamicConfig.EMA_PERIOD = 0;
  }

  if (formData.adxPeriod != null && formData.adxPeriod > 0) {
    dynamicConfig.ADX_PERIOD = formData.adxPeriod;
  } else {
    dynamicConfig.ADX_PERIOD = 14; // Default ADX period
  }

  if (formData.adxThreshold != null && formData.adxThreshold > 0) {
    dynamicConfig.ADX_THRESHOLD = formData.adxThreshold;
  } else {
    dynamicConfig.ADX_THRESHOLD = 0;
  }

  // 4) Risk settings
  dynamicConfig.CONTRACT_SIZE = formData.contractSize;
  dynamicConfig.STOP_LOSS = formData.stopLoss;
  dynamicConfig.TAKE_PROFIT = formData.takeProfit;
}

export function buildDateStrings(tf: TimeFrame) {
  // Convert to ISO format for CSV timestamp matching
  const startDateTime = `${tf.startDate}T${tf.startTime}:00`;
  const endDateTime = `${tf.endDate}T${tf.endTime}:00`;

  return {
    start: startDateTime,
    end: endDateTime,
  };
}

export const CONFIG = {
  get PAGE_MS() {
    return dynamicConfig.PAGE_MS;
  },
  get BAR_TYPE() {
    return dynamicConfig.BAR_TYPE;
  },
  get TICK_SIZE() {
    return dynamicConfig.TICK_SIZE;
  },
  get WINDOW_SIZE() {
    return dynamicConfig.WINDOW_SIZE;
  },
  get TOL_PCT() {
    return dynamicConfig.TOL_PCT;
  },
  get R_MULTIPLE() {
    return dynamicConfig.R_MULTIPLE;
  },

  get EMA_PERIOD() {
    return dynamicConfig.EMA_PERIOD;
  },
  get ADX_PERIOD() {
    return dynamicConfig.ADX_PERIOD;
  },
  get ADX_THRESHOLD() {
    return dynamicConfig.ADX_THRESHOLD;
  },

  get CONTRACT_SIZE() {
    return dynamicConfig.CONTRACT_SIZE;
  },
  get STOP_LOSS() {
    return dynamicConfig.STOP_LOSS;
  },
  get TAKE_PROFIT() {
    return dynamicConfig.TAKE_PROFIT;
  },

  DATABENTO: {
    DATASET: 'GLBX.MDP3',
    SCHEMA: 'trades',
    SYMBOL: 'MESU5',
    API_URL: 'https://hist.databento.com/v0/timeseries.get_range',
  },

  OPTIMIZE: {
    MIN_STEP: 1e-4,
    MAX_ITERS_MULTIPLIER: 20,
    MAX_NO_IMPROVE_MULTIPLIER: 5,
  },
} as const;

export const getApiKey = (): string => {
  const key =
    process.env.DATABENTO_API_KEY || 'db-XTiaLkTXu7VDC4jTvSpVwXGwqa9Pw';
  if (!key)
    throw new Error('❌ Please set DATABENTO_API_KEY in your .env file');
  return key;
};

export function resetConfig() {
  dynamicConfig = { ...DEFAULTS };
}
