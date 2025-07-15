import { Dispatch, SetStateAction } from 'react';

export type DateTimeSettings = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timeframe: string;
};

export interface TimeFrameProps {
  settings: DateTimeSettings;
  onChange: (newSettings: Partial<DateTimeSettings>) => void;
}
export interface TechnicalIndicatorSettings {
  emaMovingAverage: number;
  tickType: number;
  barType: number;
  cvdLookBackBars: number;
  adxThreshold: number;
  enabled: {
    emaMovingAverage: boolean;
    tickType: boolean;
    barType: boolean;
    cvdLookBackBars: boolean;
    adxThreshold: boolean;
  };
}

export type ToggleKey = keyof TechnicalIndicatorSettings['enabled'];
export interface TechnicalIndicatorsProps {
  parameters: TechnicalIndicatorSettings;
  setParameters: Dispatch<SetStateAction<TechnicalIndicatorSettings>>;
  /** Called with only the enabled numeric settings */
  onFilteredChange?: (
    filtered: Partial<
      Record<keyof Omit<TechnicalIndicatorSettings, 'enabled'>, number>
    >
  ) => void;
}
export interface RiskManagementProps {
  riskManagement: RiskManagementSettings;
  setRiskManagement: React.Dispatch<
    React.SetStateAction<RiskManagementSettings>
  >;
}
// src/app/types/types.ts
export interface RiskManagementSettings {
  contractSize: number;
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  maxPositions: number;
  leverage: number;
}
export interface RunTestProps {
  timeSettings: DateTimeSettings;
  indicators: TechnicalIndicatorSettings;
  riskManagement: RiskManagementSettings;
}
