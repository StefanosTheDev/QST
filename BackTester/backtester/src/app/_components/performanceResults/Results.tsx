import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Shield,
  Target,
} from 'lucide-react';

export default function Results() {
  return (
    // make the entire Results box full-width
    <div className="w-full bg-slate-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold">Performance Results</h3>
        <button
          type="button"
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all"
        >
          <span>Export Data </span>
        </button>
      </div>

      {/* make the grid full-width as well */}
      <div className="w-full grid grid-cols-4 gap-4">
        {/** Add w-full on each card so it fills its grid cell **/}
        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Net Profit</div>
          <div className="text-lg font-bold text-green-500">Profit</div>
        </div>

        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <Shield className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Max Drawdown</div>
          <div className="text-lg font-bold text-red-500">Max Drawdown</div>
        </div>

        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <BarChart3 className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Sharpe Ratio</div>
          <div className="text-lg font-bold text-white">Sharpe Ratio</div>
        </div>

        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <Target className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Win Rate</div>
          <div className="text-lg font-bold text-white">58.3%</div>
        </div>

        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Profit Factor</div>
          <div className="text-lg font-bold text-white">1.68</div>
        </div>

        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <BarChart3 className="w-5 h-5 text-slate-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Total Trades</div>
          <div className="text-lg font-bold text-white">186</div>
        </div>

        <div className="w-full bg-slate-700 rounded-lg p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Expectancy</div>
          <div className="text-lg font-bold text-green-500">42.80</div>
        </div>
      </div>
    </div>
  );
}
