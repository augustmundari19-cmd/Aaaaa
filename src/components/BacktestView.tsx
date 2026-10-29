/**
 * Backtesting View & Strategy Performance Report
 * Simulates the 15m strategy with exchange fees and slippage on historical candles.
 */

import React, { useState, useMemo } from 'react';
import { Candle, IndicatorSettings, BacktestResult, StrategyMode } from '../types/trading';
import { runBacktest } from '../utils/backtester';
import {
  TrendingUp,
  BarChart3,
  X,
  Play,
  Award,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Download
} from 'lucide-react';

interface BacktestViewProps {
  isOpen: boolean;
  onClose: () => void;
  candles: Candle[];
  settings: IndicatorSettings;
  accountCapitalINR: number;
  usdtInrRate: number;
}

export const BacktestView: React.FC<BacktestViewProps> = ({
  isOpen,
  onClose,
  candles,
  settings,
  accountCapitalINR,
  usdtInrRate
}) => {
  if (!isOpen) return null;

  const [selectedMode, setSelectedMode] = useState<StrategyMode>(settings.strategyMode);

  // Run backtest for selected mode
  const backtestResult: BacktestResult = useMemo(() => {
    const testSettings = { ...settings, strategyMode: selectedMode };
    return runBacktest(candles, testSettings, accountCapitalINR, 0.01, 0.0005, 0.0005, usdtInrRate);
  }, [candles, settings, selectedMode, accountCapitalINR, usdtInrRate]);

  // Export trade log to CSV
  const handleExportCSV = () => {
    if (backtestResult.trades.length === 0) return;
    const headers = 'ID,Symbol,Side,EntryPrice,ExitPrice,NetPnLINR,NetPnLPct,ExitReason,FeesINR,EntryTime,ExitTime\n';
    const rows = backtestResult.trades.map(t => 
      `${t.id},${t.symbol},${t.side},${t.entryPrice},${t.exitPrice},${t.realizedPnL},${t.realizedPnLPercent},${t.exitReason},${t.fees},${new Date(t.entryTime).toISOString()},${new Date(t.exitTime).toISOString()}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_trades_${selectedMode}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Historical Strategy Backtester</h3>
              <p className="text-xs text-slate-400">
                Evaluating {candles.length} closed {settings.timeframe} candles (Taker fee 0.05% + 0.05% slippage)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="my-3 flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
            <span>Strategy Variant:</span>
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setSelectedMode('MODE_A_STRICT')}
                className={`px-3 py-1 rounded text-xs transition ${
                  selectedMode === 'MODE_A_STRICT'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode A: Strict Confirmation
              </button>
              <button
                onClick={() => setSelectedMode('MODE_B_PULLBACK')}
                className={`px-3 py-1 rounded text-xs transition ${
                  selectedMode === 'MODE_B_PULLBACK'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode B: Trend Pullback
              </button>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center space-x-1 px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 font-mono">
          {/* Win Rate */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Win Rate</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {backtestResult.winRate}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {backtestResult.winningTrades}W / {backtestResult.losingTrades}L ({backtestResult.totalTrades} total)
            </div>
          </div>

          {/* Net Return */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Net Profit / Loss</div>
            <div
              className={`text-xl font-bold mt-0.5 ${
                backtestResult.netPnLINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {backtestResult.netPnLINR >= 0 ? '+' : ''}₹{backtestResult.netPnLINR.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {backtestResult.netPnLPercent >= 0 ? '+' : ''}{backtestResult.netPnLPercent.toFixed(1)}% on equity
            </div>
          </div>

          {/* Profit Factor */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Profit Factor</div>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">
              {backtestResult.profitFactor.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Avg: ₹{backtestResult.averageTradeINR.toFixed(1)} / trade
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Max Drawdown</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">
              -{backtestResult.maxDrawdownPercent.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              ₹{backtestResult.maxDrawdownINR.toFixed(2)} peak dip
            </div>
          </div>
        </div>

        {/* Equity Curve SVG Preview */}
        <div className="my-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>Portfolio Equity Curve</span>
            <span>Fees Deducted: ₹{backtestResult.totalFeesINR.toFixed(2)}</span>
          </div>

          {backtestResult.equityCurve.length > 1 ? (
            <div className="h-28 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                {(() => {
                  const pts = backtestResult.equityCurve;
                  const minEq = Math.min(...pts.map(p => p.equityINR)) * 0.98;
                  const maxEq = Math.max(...pts.map(p => p.equityINR)) * 1.02;
                  const range = maxEq - minEq || 1;

                  const polylinePoints = pts
                    .map((p, idx) => {
                      const x = (idx / (pts.length - 1)) * 500;
                      const y = 100 - ((p.equityINR - minEq) / range) * 90 - 5;
                      return `${x},${y}`;
                    })
                    .join(' ');

                  return (
                    <>
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={`0,100 ${polylinePoints} 500,100`}
                        fill="url(#eqGrad)"
                      />
                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        points={polylinePoints}
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Need more candles to generate continuous equity curve
            </div>
          )}
        </div>

        {/* Trade by Trade Log */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-300 mb-2">Simulated Trade History</div>
          <div className="max-h-52 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
            {backtestResult.trades.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No trades triggered on this historical slice under current parameters.
              </div>
            ) : (
              backtestResult.trades.map((t) => (
                <div
                  key={t.id}
                  className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {t.side}
                    </span>
                    <span className="text-slate-300 font-semibold">
                      ${t.entryPrice.toFixed(1)} → ${t.exitPrice.toFixed(1)}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      ({t.exitReason.replace('_', ' ')})
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-bold ${
                        t.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.realizedPnL >= 0 ? '+' : ''}₹{t.realizedPnL.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1.5">
                      ({t.realizedPnLPercent >= 0 ? '+' : ''}{t.realizedPnLPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
