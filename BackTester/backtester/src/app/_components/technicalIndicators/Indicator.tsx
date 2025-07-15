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
  // update number fields (excludes 'enabled' and 'heikinAshi')
  const handleParameterChange = (
    key: keyof Omit<TechnicalIndicatorSettings, 'enabled' | 'heikinAshi'>,
    value: string
  ) => {
    const num = parseInt(value, 10) || 0;
    setParameters((prev) => ({ ...prev, [key]: num }));
  };

  // flip toggles
  const handleToggle = (key: ToggleKey) => {
    setParameters((prev) => {
      // flip the enabled flag
      const enabled = { ...prev.enabled, [key]: !prev.enabled[key] };
      // prepare updates
      const updates: Partial<TechnicalIndicatorSettings> = { enabled };
      // if heikinAshi, mirror into root flag as well
      if (key === 'heikinAshi') {
        updates.heikinAshi = !prev.heikinAshi;
      }
      return { ...prev, ...updates };
    });
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
            ['barType', 'Bar Type'],
            ['cvdLookBackBars', 'CVD Lookback Bars'],
            ['adxThreshold', 'ADX Threshold'],
            ['heikinAshi', 'Heikin–Ashi Candles'],
          ] as const
        ).map(([key, label]) => {
          const enabled = parameters.enabled[key];
          const value = parameters[key as keyof TechnicalIndicatorSettings];
          return (
            <div
              key={key}
              className={`${styles.field} ${!enabled ? styles.disabled : ''}`}
            >
              <div className={styles.fieldHeader}>
                <label className={styles.label}>{label}</label>
                <button
                  onClick={() => handleToggle(key as ToggleKey)}
                  className={styles.toggle}
                >
                  {enabled ? (
                    <ToggleRight className={styles.toggleActive} />
                  ) : (
                    <ToggleLeft className={styles.toggleInactive} />
                  )}
                </button>
              </div>

              {/* only show numeric input for non-boolean indicators */}
              {key !== 'heikinAshi' && (
                <div className={styles.inputGroup}>
                  <div className={styles.subField}>
                    <label className={styles.subLabel}>Value</label>
                    <input
                      type="number"
                      value={value as number}
                      onChange={(e) =>
                        handleParameterChange(
                          key as keyof Omit<
                            TechnicalIndicatorSettings,
                            'enabled' | 'heikinAshi'
                          >,
                          e.currentTarget.value
                        )
                      }
                      className={styles.input}
                      disabled={!enabled}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
