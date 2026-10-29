/**
 * Positions and Trade History Panel for My Crypto Trader
 * Manages open positions, real-time unrealized P&L, stop/target levels,
 * liquidation price estimation, daily loss limit progress, and trade history.
 */

import React, { useState } from 'react';
import {
  Position,
  TradeHistoryItem,
  AccountRiskConfig
} from '../types/trading';
import {
  TrendingUp,
  TrendingDown,
  X,
  History,
  ShieldAlert,
  Clock,
  DollarSign,
  AlertOctagon,
  Percent
} from 'lucide-react';

interface PositionsPanelProps {
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
  accountRisk: AccountRiskConfig;
  currentPrice: number;
  usdtInrRate: number;
  onClosePosition: (id: string, reason: 'MANUAL' | 'EMERGENCY_STOP') => void;
  onClearHistory: () => void;
}

export const PositionsPanel: React.FC<PositionsPanelProps> = ({
  positions,
  tradeHistory,
  accountRisk,
  currentPrice,
  usdtInrRate,
  onClosePosition,
  onClearHistory
}) => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'HISTORY'>('POSITIONS');

  // Calculate daily realized P&L from trade history
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = todayStart.getTime();

  const todayTrades = tradeHistory.filter(t => t.exitTime >= todayTimestamp);
  const dailyRealizedPnLINR = todayTrades.reduce((acc, t) => acc + t.realizedPnL, 0);

  // Daily loss limit progress
  const lossUsedINR = dailyRealizedPnLINR < 0 ? Math.abs(dailyRealizedPnLINR) : 0;
  const lossLimitINR = accountRisk.dailyLossLimitINR;
  const lossPercentage = Math.min(100, (lossUsedINR / lossLimitINR) * 100);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      {/* Header with Tabs and Daily P&L Indicator */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ${
              activeTab === 'POSITIONS'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Active Positions</span>
            {positions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                {positions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({tradeHistory.length})</span>
          </button>
        </div>

        {/* Daily P&L and Risk Tracker Badge */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Daily P&L:</span>
            <span
              className={`font-bold ${
                dailyRealizedPnLINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {dailyRealizedPnLINR >= 0 ? '+' : ''}₹{dailyRealizedPnLINR.toFixed(2)}
            </span>
          </div>

          {/* Daily Loss Limit Gauge */}
          <div className="hidden sm:flex items-center space-x-1.5 pl-2 border-l border-slate-800">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">
                Daily Limit: ₹{lossUsedINR.toFixed(0)} / ₹{lossLimitINR}
              </span>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    lossPercentage > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${lossPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POSITIONS TAB */}
      {activeTab === 'POSITIONS' && (
        <div className="mt-3">
          {positions.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500">
              <TrendingUp className="w-8 h-8 stroke-1 text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-400">No Open Positions</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                The strategy engine is actively monitoring 15m candles for a verified BUY or SELL confirmation signal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((pos) => {
                // Calculate real-time unrealized P&L
                const isLong = pos.side === 'LONG';
                const priceDiff = isLong ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
                const pnlPercent = (priceDiff / pos.entryPrice) * 100 * pos.leverage;
                const unrealizedINR = (pnlPercent / 100) * pos.marginINR;

                // Estimated liquidation price
                const maintenanceMargin = 0.005; // 0.5%
                const liqPrice = isLong
                  ? pos.entryPrice * (1 - (1 / pos.leverage) + maintenanceMargin)
                  : pos.entryPrice * (1 + (1 / pos.leverage) - maintenanceMargin);

                return (
                  <div
                    key={pos.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3 font-mono text-xs"
                  >
                    {/* Position Top Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isLong
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.side} {pos.leverage}x
                        </span>
                        <span className="font-bold text-white text-sm">{pos.symbol}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          Qty: {pos.quantity.toFixed(4)} BTC (₹{pos.marginINR.toFixed(0)})
                        </span>
                      </div>

                      {/* Realized / Unrealized P&L Display */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div
                            className={`text-sm font-bold ${
                              unrealizedINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {unrealizedINR >= 0 ? '+' : ''}₹{unrealizedINR.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                          </div>
                          <div className="text-[10px] text-slate-500">Unrealized P&L</div>
                        </div>

                        <button
                          onClick={() => onClosePosition(pos.id, 'MANUAL')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] font-medium transition"
                        >
                          Market Close
                        </button>
                      </div>
                    </div>

                    {/* Price Levels Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500">Entry Price:</span>{' '}
                        <span className="text-slate-200 font-semibold">${pos.entryPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Mark Price:</span>{' '}
                        <span className="text-slate-200 font-semibold">${currentPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Stop Loss:</span>{' '}
                        <span className="text-rose-400 font-semibold">${pos.stopLoss.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Take Profit:</span>{' '}
                        <span className="text-emerald-400 font-semibold">${pos.takeProfit.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Leverage & Liquidation Warning */}
                    {pos.leverage > 1 && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                        <span className="flex items-center space-x-1">
                          <AlertOctagon className="w-3 h-3 text-amber-400" />
                          <span>Estimated Liquidation Price:</span>
                          <span className="text-amber-400 font-semibold">${liqPrice.toFixed(2)}</span>
                        </span>
                        <span>Margin: ₹{pos.marginINR.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'HISTORY' && (
        <div className="mt-3">
          {tradeHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No closed trade records yet. Run paper trading or historical backtest to view execution logs.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 text-[11px] text-slate-500 font-mono">
                <span>Recent Executed Trades</span>
                <button
                  onClick={onClearHistory}
                  className="text-slate-400 hover:text-rose-400 transition"
                >
                  Clear History
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {tradeHistory.map((trade) => {
                  const isProfit = trade.realizedPnL >= 0;
                  return (
                    <div
                      key={trade.id}
                      className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.side === 'LONG'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {trade.side}
                        </span>
                        <div>
                          <div className="text-slate-200 font-semibold">
                            ${trade.entryPrice.toFixed(1)} → ${trade.exitPrice.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Reason: {trade.exitReason.replace('_', ' ')} • Fees: ₹{trade.fees.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}₹{trade.realizedPnL.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isProfit ? '+' : ''}{trade.realizedPnLPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
