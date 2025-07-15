// src/app/dashboard/DashboardClient.tsx
'use client';

import React, { useState, useCallback } from 'react';
import TimeFrame, {
  TimeFrameProps,
} from '@/app/_components/TimeFrame/TimeFrame';
import TechnicalIndicators from '../_components/technicalIndicators/Indicator';
import RiskManagement from '@/app/_components/riskManagement/RiskManagement';
import RunTest from '@/app/_components/runTest/runTest';
import {
  DateTimeSettings,
  TechnicalIndicatorSettings,
  RiskManagementSettings,
} from '@/app/types/types';
import Results from '../_components/performanceResults/Results';

export default function DashboardClient() {
  // 1) TimeFrame state
  const [timeSettings, setTimeSettings] = useState<DateTimeSettings>({
    startDate: '2025-06-01',
    startTime: '08:00',
    endDate: '2025-06-18',
    endTime: '12:00',
    timeframe: '5m',
  });
  const handleTimeChange = useCallback(
    (upd: Partial<DateTimeSettings>) =>
      setTimeSettings((prev) => ({ ...prev, ...upd })),
    []
  );

  // 2) Indicators state
  const [indicatorParams, setIndicatorParams] =
    useState<TechnicalIndicatorSettings>({
      enabled: {
        emaMovingAverage: false,
        tickType: false,
        barType: false,
        cvdLookBackBars: false,
        adxThreshold: false,
      },
      emaMovingAverage: 12,
      tickType: 1000,
      barType: 1,
      cvdLookBackBars: 20,
      adxThreshold: 25,
    });

  // 3) Risk state
  const [riskManagement, setRiskManagement] = useState<RiskManagementSettings>({
    contractSize: 1,
    stopLoss: 2,
    takeProfit: 4,
    maxDailyLoss: 500,
    maxPositions: 3,
    leverage: 10,
  });

  return (
    <div className="space-y-6 p-4">
      <TimeFrame settings={timeSettings} onChange={handleTimeChange} />

      <TechnicalIndicators
        parameters={indicatorParams}
        setParameters={setIndicatorParams}
      />

      <RiskManagement
        riskManagement={riskManagement}
        setRiskManagement={setRiskManagement}
      />
      <Results />
      <RunTest
        timeSettings={timeSettings}
        indicators={indicatorParams}
        riskManagement={riskManagement}
      />
    </div>
  );
}
