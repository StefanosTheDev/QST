// src/config/constants.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Interface for form data

export interface FormConfig {
  timeFrame: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    timeframe: string;
  };
  indicators: {
    enabled: {
      emaMovingAverage: boolean;
      tickType: boolean;
      barType: boolean;
      heikinAshi: boolean;
      cvdLookBackBars: boolean;
      adxThreshold: boolean;
    };
    emaMovingAverage?: number;
    tickType?: number;
    barType?: number;
    cvdLookBackBars?: number;
    adxThreshold?: number;
  };
  riskManagement?: {
    stopLoss?: number;
    takeProfit?: number;
    rMultiple?: number;
    contractSize?: number;
    maxDailyLoss?: number;
    maxPositions?: number;
    leverage?: number;
  };
}

// Internal defaults
interface InternalConfig {
  PAGE_MS: number;
  BAR_TYPE: 'time' | 'tick';
  TICK_SIZE: number;
  WINDOW_SIZE: number;
  TOL_PCT: number;
  R_MULTIPLE: number;
  EMA_PERIOD: number;
  ADX_PERIOD: number;
  ADX_THRESHOLD: number;
  STOP_LOSS: number;
  TAKE_PROFIT: number;
  CONTRACT_SIZE: number;
  MAX_DAILY_LOSS: number;
  MAX_POSITIONS: number;
  LEVERAGE: number;
  USE_HEIKIN_ASHI: boolean;
}

// Engine defaults
const DEFAULTS: InternalConfig = {
  PAGE_MS: 300_000,
  BAR_TYPE: 'tick',
  TICK_SIZE: 700,
  WINDOW_SIZE: 5,
  TOL_PCT: 0.001,
  R_MULTIPLE: 2,
  EMA_PERIOD: 21,
  ADX_PERIOD: 14,
  ADX_THRESHOLD: 14,
  STOP_LOSS: 4,
  TAKE_PROFIT: 3,
  CONTRACT_SIZE: 1,
  MAX_DAILY_LOSS: 500,
  MAX_POSITIONS: 3,
  LEVERAGE: 1,
  USE_HEIKIN_ASHI: false,
};

let dynamicConfig: InternalConfig = { ...DEFAULTS };

// Update internal config from the form
export function updateConfig(formData: FormConfig) {
  const { indicators, riskManagement } = formData;

  // Indicators
  if (indicators.enabled.barType && indicators.barType != null) {
    dynamicConfig.BAR_TYPE = indicators.barType === 0 ? 'time' : 'tick';
  }
  if (indicators.enabled.tickType && indicators.tickType != null) {
    dynamicConfig.TICK_SIZE = indicators.tickType;
  }
  if (
    indicators.enabled.cvdLookBackBars &&
    indicators.cvdLookBackBars != null
  ) {
    dynamicConfig.WINDOW_SIZE = indicators.cvdLookBackBars;
  }
  if (
    indicators.enabled.emaMovingAverage &&
    indicators.emaMovingAverage != null
  ) {
    dynamicConfig.EMA_PERIOD = indicators.emaMovingAverage;
  }
  if (indicators.enabled.adxThreshold && indicators.adxThreshold != null) {
    dynamicConfig.ADX_THRESHOLD = indicators.adxThreshold;
  }

  // Heikin-Ashi toggle
  dynamicConfig.USE_HEIKIN_ASHI = !!indicators.enabled.heikinAshi;

  // Risk management: apply provided values directly
  if (riskManagement) {
    if (riskManagement.stopLoss != null) {
      dynamicConfig.STOP_LOSS = riskManagement.stopLoss;
    }
    if (riskManagement.takeProfit != null) {
      dynamicConfig.TAKE_PROFIT = riskManagement.takeProfit;
    }
    if (riskManagement.rMultiple != null) {
      dynamicConfig.R_MULTIPLE = riskManagement.rMultiple;
    }
    if (riskManagement.contractSize != null) {
      dynamicConfig.CONTRACT_SIZE = riskManagement.contractSize;
    }
    if (riskManagement.maxDailyLoss != null) {
      dynamicConfig.MAX_DAILY_LOSS = riskManagement.maxDailyLoss;
    }
    if (riskManagement.maxPositions != null) {
      dynamicConfig.MAX_POSITIONS = riskManagement.maxPositions;
    }
    if (riskManagement.leverage != null) {
      dynamicConfig.LEVERAGE = riskManagement.leverage;
    }
  }
}

// Build ISO strings for your date range queries
export function buildDateStrings(timeFrame: FormConfig['timeFrame']) {
  return {
    start: `${timeFrame.startDate}T${timeFrame.startTime}:00-04:00`,
    end: `${timeFrame.endDate}T${timeFrame.endTime}:00-04:00`,
  };
}

// Expose getters for runtime use in the algo
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
  get ADX_HISTORY_BARS() {
    return 3 * dynamicConfig.ADX_PERIOD;
  },
  get STOP_LOSS() {
    return dynamicConfig.STOP_LOSS;
  },
  get TAKE_PROFIT() {
    return dynamicConfig.TAKE_PROFIT;
  },
  get CONTRACT_SIZE() {
    return dynamicConfig.CONTRACT_SIZE;
  },
  get MAX_DAILY_LOSS() {
    return dynamicConfig.MAX_DAILY_LOSS;
  },
  get MAX_POSITIONS() {
    return dynamicConfig.MAX_POSITIONS;
  },
  get LEVERAGE() {
    return dynamicConfig.LEVERAGE;
  },
  get USE_HEIKIN_ASHI() {
    return dynamicConfig.USE_HEIKIN_ASHI;
  },

  DATABENTO: {
    DATASET: 'GLBX.MDP3',
    SCHEMA: 'trades',
    SYMBOL: 'MESM5',
    API_URL: 'https://hist.databento.com/v0/timeseries.get_range',
  },

  OPTIMIZE: {
    MIN_STEP: 1e-4,
    MAX_ITERS_MULTIPLIER: 20,
    MAX_NO_IMPROVE_MULTIPLIER: 5,
  },
} as const;

// API key helper
export const getApiKey = (): string => {
  const key =
    process.env.DATABENTO_API_KEY || 'db-VX9PydDidRfBsgaE5RFQmSDEybyJ8';
  if (!key) throw new Error('❌ Please set DATABENTO_API_KEY in your .env');
  return key;
};

// Reset back to defaults
export function resetConfig() {
  dynamicConfig = { ...DEFAULTS };
}
