// src/app/_components/runTest/runTest.tsx
'use client';

import React, { useState } from 'react';
import { RunTestProps } from '@/app/types/types';

export default function RunTest({
  timeSettings,
  indicators,
  riskManagement,
}: RunTestProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // shape this to match your FormConfig
    const formData = {
      timeFrame: timeSettings,
      indicators,
      riskManagement,
    };

    try {
      console.log('Run Test Button');
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || res.statusText);
      }

      console.log('Here');
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="
          px-4 py-2
          bg-blue-600 text-white font-medium
          rounded-lg
          hover:bg-blue-700 active:bg-blue-800
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {loading ? 'Running…' : 'Run Test'}
      </button>

      {success && (
        <p className="mt-2 text-green-500">✅ Backtest started successfully!</p>
      )}
      {error && <p className="mt-2 text-red-500">⚠️ Error: {error}</p>}
    </>
  );
}
