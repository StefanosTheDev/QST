// src/app/_components/TimeFrame/TimeFrame.tsx
'use client'; // still a client component because it has inputs

import React from 'react';
import { Calendar } from 'lucide-react';
import styles from './TimeFrame.module.css';
import { DateTimeSettings } from '@/app/types/types';

export interface TimeFrameProps {
  settings: DateTimeSettings;
  onChange: (upd: Partial<DateTimeSettings>) => void;
}

export default function TimeFrame({ settings, onChange }: TimeFrameProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Calendar className={styles.sectionIcon} />
        <h3 className={styles.sectionTitle}>Time Frame</h3>
      </div>
      <div className={styles.grid}>
        {/* Start Date */}
        <div className={styles.field}>
          <label className={styles.label}>Start Date</label>
          <input
            type="date"
            value={settings.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className={styles.input}
          />
        </div>

        {/* Start Time */}
        <div className={styles.field}>
          <label className={styles.label}>Start Time</label>
          <input
            type="time"
            value={settings.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className={styles.input}
          />
        </div>

        {/* End Date */}
        <div className={styles.field}>
          <label className={styles.label}>End Date</label>
          <input
            type="date"
            value={settings.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className={styles.input}
          />
        </div>

        {/* End Time */}
        <div className={styles.field}>
          <label className={styles.label}>End Time</label>
          <input
            type="time"
            value={settings.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className={styles.input}
          />
        </div>
      </div>
    </div>
  );
}
