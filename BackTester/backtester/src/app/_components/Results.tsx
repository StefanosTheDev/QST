'use client';

import React from 'react';

export default function Results() {
  // You can later replace mockData with real props or fetched data
  const mockStats = {
    totalTrades: 12,
    winRate: '91.67%',
    avgProfit: '2.42 points',
    sharpeRatio: '19.00',
  };

  const mockTrades = [
    {
      side: 'BULLISH',
      entry: 'Invalid Date @ 5828.81',
      exit: 'Invalid Date @ 5831.81',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5819.63',
      exit: 'Invalid Date @ 5816.63',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5814.88',
      exit: 'Invalid Date @ 5811.88',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5811.31',
      exit: 'Invalid Date @ 5808.31',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5802.75',
      exit: 'Invalid Date @ 5799.75',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5800.56',
      exit: 'Invalid Date @ 5797.56',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BULLISH',
      entry: 'Invalid Date @ 5807.63',
      exit: 'Invalid Date @ 5803.63',
      result: 'L',
      profit: '-4.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5799.56',
      exit: 'Invalid Date @ 5796.56',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5794.88',
      exit: 'Invalid Date @ 5791.88',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5789.56',
      exit: 'Invalid Date @ 5786.56',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5785.06',
      exit: 'Invalid Date @ 5782.06',
      result: 'W',
      profit: '3.00',
    },
    {
      side: 'BEARISH',
      entry: 'Invalid Date @ 5779.25',
      exit: 'Invalid Date @ 5776.25',
      result: 'W',
      profit: '3.00',
    },
  ];

  const mockDailyPnL = [{ date: 'Invalid', pnl: '$1450.00' }];

  return (
    <div className="flex-1 bg-gray-100 p-6 rounded-2xl shadow-lg text-black">
      <h2 className="text-2xl font-semibold mb-4">Trade Statistics</h2>

      <ul className="space-y-1 mb-6">
        <li>
          <strong>Total Trades:</strong> {mockStats.totalTrades}
        </li>
        <li>
          <strong>Win Rate:</strong> {mockStats.winRate}
        </li>
        <li>
          <strong>Average Profit:</strong> {mockStats.avgProfit}
        </li>
        <li>
          <strong>Sharpe Ratio:</strong> {mockStats.sharpeRatio}
        </li>
      </ul>
      <h3 className="text-xl font-medium mb-2">Trade Details </h3>
      <button> Export Data </button>

      <div className="overflow-auto mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b border-black px-2 py-1">Side</th>
              <th className="border-b border-black px-2 py-1">Entry</th>
              <th className="border-b border-black px-2 py-1">Exit</th>
              <th className="border-b border-black px-2 py-1">Result</th>
              <th className="border-b border-black px-2 py-1">Profit</th>
            </tr>
          </thead>
          <tbody>
            {mockTrades.map((t, i) => (
              <tr key={i}>
                <td className="border-b border-gray-300 px-2 py-1">{t.side}</td>
                <td className="border-b border-gray-300 px-2 py-1">
                  {t.entry}
                </td>
                <td className="border-b border-gray-300 px-2 py-1">{t.exit}</td>
                <td className="border-b border-gray-300 px-2 py-1">
                  {t.result}
                </td>
                <td className="border-b border-gray-300 px-2 py-1">
                  {t.profit} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-medium mb-2">Daily PnL</h3>
      <ul className="space-y-1">
        {mockDailyPnL.map((d, i) => (
          <li key={i}>
            <strong>Date:</strong> {d.date} <strong>PnL:</strong> {d.pnl}
          </li>
        ))}
      </ul>
    </div>
  );
}
