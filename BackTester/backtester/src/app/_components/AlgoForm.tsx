'use client';
import React, { useState, FormEvent } from 'react';

export interface FormProp {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timeframe: string;

  // Simplified bar settings
  barType: 'time' | 'tick';
  barSize: number;
  candleType: 'traditional' | 'heikinashi';
  cvdLookBackBars?: number;

  // Indicator Settings
  emaMovingAverage?: number;
  adxThreshold?: number;
  adxPeriod?: number;

  // Risk Management
  contractSize: number;
  stopLoss: number;
  takeProfit: number;
}

export default function AlgoForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState<FormProp>({
    startDate: today,
    startTime: '09:30',
    endDate: today,
    endTime: '16:00',
    timeframe: '1min',

    barType: 'time',
    barSize: 1,
    candleType: 'traditional',
    cvdLookBackBars: 5,

    emaMovingAverage: 21,
    adxThreshold: 25,
    adxPeriod: 14,

    contractSize: 1,
    stopLoss: 4,
    takeProfit: 3,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]:
        type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const {
        startDate,
        startTime,
        endDate,
        endTime,
        barType,
        barSize,
        candleType,
        cvdLookBackBars,
        emaMovingAverage,
        adxThreshold,
        adxPeriod,
        contractSize,
        stopLoss,
        takeProfit,
      } = values;

      const payload = {
        timeFrame: { startDate, startTime, endDate, endTime },
        barType,
        barSize,
        candleType,
        cvdLookBackBars,
        emaMovingAverage,
        adxThreshold,
        adxPeriod,
        contractSize,
        stopLoss,
        takeProfit,
      };

      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          CVD Trendline Backtester
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Algorithm Settings
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date & Time */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-700">
                  Time Range
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">Start Date</span>
                    <input
                      type="date"
                      name="startDate"
                      value={values.startDate}
                      onChange={handleChange}
                      required
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">Start Time</span>
                    <input
                      type="time"
                      name="startTime"
                      value={values.startTime}
                      onChange={handleChange}
                      required
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">End Date</span>
                    <input
                      type="date"
                      name="endDate"
                      value={values.endDate}
                      onChange={handleChange}
                      required
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">End Time</span>
                    <input
                      type="time"
                      name="endTime"
                      value={values.endTime}
                      onChange={handleChange}
                      required
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                </div>
              </div>

              {/* Bar Settings */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-700">
                  Bar Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">Bar Type</span>
                    <select
                      name="barType"
                      value={values.barType}
                      onChange={handleChange}
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    >
                      <option value="time">Time Bars</option>
                      <option value="tick">Tick Bars</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">
                      Bar Size (
                      {values.barType === 'time' ? 'minutes' : 'ticks'})
                    </span>
                    <input
                      type="number"
                      name="barSize"
                      value={values.barSize ?? ''}
                      onChange={handleChange}
                      min="1"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">Candle Type</span>
                    <select
                      name="candleType"
                      value={values.candleType}
                      onChange={handleChange}
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    >
                      <option value="traditional">Traditional</option>
                      <option value="heikinashi">Heikin Ashi</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">
                      CVD Lookback Bars
                    </span>
                    <input
                      type="number"
                      name="cvdLookBackBars"
                      value={values.cvdLookBackBars ?? ''}
                      onChange={handleChange}
                      min="3"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                </div>
              </div>

              {/* Indicator Settings */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-700">
                  Indicators
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">EMA Period</span>
                    <input
                      type="number"
                      name="emaMovingAverage"
                      value={values.emaMovingAverage ?? ''}
                      onChange={handleChange}
                      placeholder="e.g. 21"
                      min="0"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">ADX Period</span>
                    <input
                      type="number"
                      name="adxPeriod"
                      value={values.adxPeriod ?? ''}
                      onChange={handleChange}
                      placeholder="e.g. 14"
                      min="0"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">ADX Threshold</span>
                    <input
                      type="number"
                      name="adxThreshold"
                      value={values.adxThreshold ?? ''}
                      onChange={handleChange}
                      placeholder="e.g. 25"
                      min="0"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-700">
                  Risk Management
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">Contracts</span>
                    <input
                      type="number"
                      name="contractSize"
                      value={values.contractSize ?? ''}
                      onChange={handleChange}
                      required
                      min="1"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">
                      Stop Loss (pts)
                    </span>
                    <input
                      type="number"
                      name="stopLoss"
                      value={values.stopLoss ?? ''}
                      onChange={handleChange}
                      required
                      min="1"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-sm text-gray-600">
                      Take Profit (pts)
                    </span>
                    <input
                      type="number"
                      name="takeProfit"
                      value={values.takeProfit ?? ''}
                      onChange={handleChange}
                      required
                      min="1"
                      className="mt-1 border rounded px-3 py-2 text-gray-800"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Running Backtest...' : 'Run Backtest'}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Results
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700">Error: {error}</p>
              </div>
            )}

            {result && result.success && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Statistics</h3>
                  <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono">
                    {result.statistics}
                  </pre>
                </div>

                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    View Detailed Logs ({result.logs?.length || 0} entries)
                  </summary>
                  <div className="mt-3 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono">
                      {result.logs?.join('\n')}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            {!result && !error && (
              <div className="text-gray-500 text-center py-8">
                <p>
                  Configure your strategy and click "Run Backtest" to see
                  results.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">
            Strategy Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">CVD Trendline Strategy</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Fits support/resistance lines on CVD window</li>
                <li>Enters on trendline breakouts</li>
                <li>Uses volume and price confirmation</li>
                <li>Optional EMA and ADX filters</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Data Source</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Pre-calculated 1-minute bars from CSV</li>
                <li>Traditional or Heikin Ashi candles</li>
                <li>Includes all technical indicators</li>
                <li>No live data streaming required</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
