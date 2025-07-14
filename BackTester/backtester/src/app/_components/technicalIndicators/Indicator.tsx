// src/app/_components/technicalIndicators/TechnicalIndicators.tsx
'use client';

import React from 'react';
import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import styles from './Indicator.module.css';
import {
  TechnicalIndicatorSettings,
  ToggleKey,
  TechnicalIndicatorsProps,
} from '@/app/types/types';

export default function TechnicalIndicators({
  parameters,
  setParameters,
}: TechnicalIndicatorsProps) {
  // update number fields
  const handleParameterChange = (
    key: keyof Omit<TechnicalIndicatorSettings, 'enabled'>,
    value: string
  ) => {
    const num = parseInt(value, 10) || 0;
    setParameters((prev) => ({ ...prev, [key]: num }));
  };

  // flip toggles
  const handleToggle = (key: ToggleKey) => {
    setParameters((prev) => ({
      ...prev,
      enabled: { ...prev.enabled, [key]: !prev.enabled[key] },
    }));
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Settings className={styles.sectionIcon} />
        <h3 className={styles.sectionTitle}>Technical Indicators</h3>
      </div>

      <div className={styles.grid}>
        {(
          [
            ['emaMovingAverage', 'EMA (Moving Avg)'],
            ['tickType', 'Tick Type'],

            ['cvdLookBackBars', 'CVD LookBack Bars'],
            ['adxThreshold', 'ADX Threshold'],
          ] as const
        ).map(([key, label]) => {
          const enabled = parameters.enabled[key];
          const value = parameters[key];
          return (
            <div
              key={key}
              className={`${styles.field} ${!enabled ? styles.disabled : ''}`}
            >
              <div className={styles.fieldHeader}>
                <label className={styles.label}>{label}</label>
                <button
                  onClick={() => handleToggle(key)}
                  className={styles.toggle}
                >
                  {enabled ? (
                    <ToggleRight className={styles.toggleActive} />
                  ) : (
                    <ToggleLeft className={styles.toggleInactive} />
                  )}
                </button>
              </div>
              <div className={styles.inputGroup}>
                <div className={styles.subField}>
                  <label className={styles.subLabel}>Value</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      handleParameterChange(key, e.currentTarget.value)
                    }
                    className={styles.input}
                    disabled={!enabled}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
