// src/app/_components/riskManagement/RiskManagement.tsx
'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './RiskManagement.module.css';
import { RiskManagementProps } from '@/app/types/types';
import { RiskManagementSettings } from '@/app/types/types';

export default function RiskManagement({
  riskManagement,
  setRiskManagement,
}: RiskManagementProps) {
  const handleRiskChange = (
    key: keyof RiskManagementSettings,
    value: string,
    isFloat = false
  ) => {
    setRiskManagement((prev) => ({
      ...prev,
      [key]: isFloat ? parseFloat(value) : parseInt(value, 10),
    }));
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <AlertCircle className={styles.sectionIcon} />
        <h3 className={styles.sectionTitle}>Risk Management</h3>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Contract Size</label>
          <input
            type="number"
            value={riskManagement.contractSize}
            onChange={(e) =>
              handleRiskChange('contractSize', e.target.value, true)
            }
            step="0.1"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Stop Loss Points</label>
          <input
            type="number"
            value={riskManagement.stopLoss}
            onChange={(e) => handleRiskChange('stopLoss', e.target.value, true)}
            step="0.1"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Take Profit Points</label>
          <input
            type="number"
            value={riskManagement.takeProfit}
            onChange={(e) =>
              handleRiskChange('takeProfit', e.target.value, true)
            }
            step="0.1"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Max Daily Loss ($)</label>
          <input
            type="number"
            value={riskManagement.maxDailyLoss}
            onChange={(e) => handleRiskChange('maxDailyLoss', e.target.value)}
            className={styles.input}
          />
        </div>
      </div>
    </div>
  );
}
