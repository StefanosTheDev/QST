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
    enabled: {
      stopLoss: boolean;
      takeProfit: boolean;
      rMultiple: boolean;
    };
    stopLoss?: number;
    takeProfit?: number;
    rMultiple?: number;
    // 💡 Additional fields used in your algo
    contractSize?: number;
    maxDailyLoss?: number;
    maxPositions?: number;
    leverage?: number;
  };
}

// Default values
const DEFAULTS = {
  PAGE_MS: 5 * 60 * 1000,
  BAR_TYPE: 'tick' as 'time' | 'tick',
  TICK_SIZE: 700,
  WINDOW_SIZE: 5,
  TOL_PCT: 0.001,
  R_MULTIPLE: 2,
  EMA_PERIOD: 21,
  ADX_PERIOD: 14,
  ADX_THRESHOLD: 14,
  STOP_LOSS: 4,
  TAKE_PROFIT: 3,

  // ✅ Add these!
  CONTRACT_SIZE: 1,
  MAX_DAILY_LOSS: 500,
  MAX_POSITIONS: 3,
  LEVERAGE: 1,
};

// Dynamic config that can be updated
let dynamicConfig = { ...DEFAULTS };

// Function to update config from form data
export function updateConfig(formData: FormConfig) {
  const { indicators, riskManagement } = formData;

  // Update bar type (0 = time, 1 = tick)
  if (indicators.enabled.barType && indicators.barType !== undefined) {
    dynamicConfig.BAR_TYPE = indicators.barType === 0 ? 'time' : 'tick';
  }

  // Update tick size
  if (indicators.enabled.tickType && indicators.tickType !== undefined) {
    dynamicConfig.TICK_SIZE = indicators.tickType;
  }

  // Update CVD window size
  if (
    indicators.enabled.cvdLookBackBars &&
    indicators.cvdLookBackBars !== undefined
  ) {
    dynamicConfig.WINDOW_SIZE = indicators.cvdLookBackBars;
  }

  // Update EMA period
  if (
    indicators.enabled.emaMovingAverage &&
    indicators.emaMovingAverage !== undefined
  ) {
    dynamicConfig.EMA_PERIOD = indicators.emaMovingAverage;
  }

  // Update ADX threshold
  if (
    indicators.enabled.adxThreshold &&
    indicators.adxThreshold !== undefined
  ) {
    dynamicConfig.ADX_THRESHOLD = indicators.adxThreshold;
  }

  if (riskManagement) {
    const enabled = riskManagement.enabled ?? {};

    if (enabled.stopLoss && riskManagement.stopLoss != null) {
      dynamicConfig.STOP_LOSS = riskManagement.stopLoss;
    }

    if (enabled.takeProfit && riskManagement.takeProfit != null) {
      dynamicConfig.TAKE_PROFIT = riskManagement.takeProfit;
    }

    if (enabled.rMultiple && riskManagement.rMultiple != null) {
      dynamicConfig.R_MULTIPLE = riskManagement.rMultiple;
    }

    // ✅ No .enabled flags for these — apply unconditionally if defined
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

// Function to build date strings from form data
export function buildDateStrings(timeFrame: FormConfig['timeFrame']) {
  return {
    start: `${timeFrame.startDate}T${timeFrame.startTime}:00-04:00`,
    end: `${timeFrame.endDate}T${timeFrame.endTime}:00-04:00`,
  };
}

export const CONFIG = {
  // Timing config
  get PAGE_MS() {
    return dynamicConfig.PAGE_MS;
  },

  // Aggregation
  get BAR_TYPE() {
    return dynamicConfig.BAR_TYPE;
  },
  get TICK_SIZE() {
    return dynamicConfig.TICK_SIZE;
  },

  // Trading logic
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

  // ADX
  get ADX_PERIOD() {
    return dynamicConfig.ADX_PERIOD;
  },
  get ADX_THRESHOLD() {
    return dynamicConfig.ADX_THRESHOLD;
  },
  get ADX_HISTORY_BARS() {
    return 3 * dynamicConfig.ADX_PERIOD;
  },

  // Risk
  get STOP_LOSS() {
    return dynamicConfig.STOP_LOSS;
  },
  get TAKE_PROFIT() {
    return dynamicConfig.TAKE_PROFIT;
  },

  // ✅ NEW: Risk extras
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

  // External config
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
export const getApiKey = (): string => {
  const key =
    process.env.DATABENTO_API_KEY || 'db-93GiS5kT7eLaTA7uWmfJ8rjLBrNFT';
  if (!key) {
    throw new Error('❌ Please set DATABENTO_API_KEY in your .env file');
  }
  return key;
};

// Reset config to defaults
export function resetConfig() {
  dynamicConfig = { ...DEFAULTS };
}
