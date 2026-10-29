/**
 * Signal Card Component for My Crypto Trader
 * Displays live BUY / SELL / WAIT / EXIT signal, the 5-point confirmation checklist,
 * entry price, stop-loss, take-profit, position sizing, and risk in INR.
 */

import React from 'react';
import {
  TradingSignal,
  IndicatorSettings,
  AccountRiskConfig,
  StrategyMode
} from '../types/trading';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Info,
  SlidersHorizontal
} from 'lucide-react';

interface SignalCardProps {
  signal: TradingSignal | null;
  settings: IndicatorSettings;
  accountRisk: AccountRiskConfig;
  onOpenOrderModal: () => void;
  onModeChange: (mode: StrategyMode) => void;
  onOpenSettings: () => void;
  usdtInrRate: number;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  settings,
  accountRisk,
  onOpenOrderModal,
  onModeChange,
  onOpenSettings,
  usdtInrRate
}) => {
  if (!signal) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 animate-pulse text-slate-400 text-sm">
        Analyzing indicators and calculating signals...
      </div>
    );
  }

  const { checklist, type, price, stopLoss, takeProfit, stopDistance, riskAmountINR, positionSize, positionSizeINR } = signal;
  const isBuy = type === 'BUY';
  const isSell = type === 'SELL';
  const isExit = type === 'EXIT';
  const isWait = type === 'WAIT';

  const riskPercent = (accountRisk.equityINR > 0 ? (riskAmountINR / accountRisk.equityINR) * 100 : 1).toFixed(1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
      {/* Header & Mode Selector */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Signal Engine</h3>
            <p className="text-[11px] text-slate-400">Real-time OHLCV indicator validation</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => onModeChange('MODE_A_STRICT')}
            className={`px-2 py-1 rounded-md font-medium transition ${
              settings.strategyMode === 'MODE_A_STRICT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mode A: Strict
          </button>
          <button
            onClick={() => onModeChange('MODE_B_PULLBACK')}
            className={`px-2 py-1 rounded-md font-medium transition ${
              settings.strategyMode === 'MODE_B_PULLBACK'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mode B: Pullback
          </button>
        </div>
      </div>

      {/* Main Signal Badge & Action */}
      <div className="my-3 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div
            className={`px-3 py-1.5 rounded-xl font-bold text-sm tracking-wider flex items-center space-x-1.5 ${
              isBuy
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 animate-pulse'
                : isSell
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 animate-pulse'
                : isExit
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isBuy && <ArrowUpRight className="w-4 h-4 stroke-[3]" />}
            {isSell && <ArrowDownRight className="w-4 h-4 stroke-[3]" />}
            {isExit && <AlertTriangle className="w-4 h-4" />}
            <span>{type} SIGNAL</span>
          </div>

          <div>
            <div className="text-xs text-slate-400">Current Reference Price</div>
            <div className="text-lg font-bold font-mono text-white">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                (≈ ₹{(price * usdtInrRate).toLocaleString(undefined, { maximumFractionDigits: 0 })})
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {(isBuy || isSell) ? (
          <button
            onClick={onOpenOrderModal}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition shadow-lg ${
              isBuy
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25'
            }`}
          >
            <span>Execute {isBuy ? 'BUY / LONG' : 'SELL / SHORT'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onOpenOrderModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Manual Trade
          </button>
        )}
      </div>

      {/* Confirmation Conditions Breakdown (5-Point Checklist) */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
          <span>Signal Confirmations Checklist</span>
          <span className="font-mono text-[11px] text-slate-500">
            {checklist.allPassed ? '5/5 Satisfied' : 'Pending Confirmation'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-xs">
          {/* 1. RSI Condition */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              {checklist.rsiSatisfied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="text-slate-300">
                1. RSI(14) Threshold: {settings.strategyMode === 'MODE_A_STRICT' ? `> ${settings.rsiBuyThreshold} / < ${settings.rsiSellThreshold}` : 'Pullback Rebound'}
              </span>
            </div>
            <span className={`font-mono text-[11px] ${checklist.rsiSatisfied ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {checklist.rsiMessage}
            </span>
          </div>

          {/* 2. EMA Crossover */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              {checklist.emaSatisfied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="text-slate-300">2. EMA 9 / EMA 21 Crossover</span>
            </div>
            <span className={`font-mono text-[11px] ${checklist.emaSatisfied ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {checklist.emaMessage}
            </span>
          </div>

          {/* 3. Supertrend Trend Direction */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              {checklist.supertrendSatisfied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="text-slate-300">3. Supertrend(10, 3.0) Direction</span>
            </div>
            <span className={`font-mono text-[11px] ${checklist.supertrendSatisfied ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
              {checklist.supertrendMessage}
            </span>
          </div>

          {/* 4. Closed Candle Status */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              {checklist.candleClosed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-300">4. Closed Candle Confirmation</span>
            </div>
            <span className={`font-mono text-[11px] ${checklist.candleClosed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {checklist.candleClosedMessage}
            </span>
          </div>

          {/* 5. Risk Management Validation */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              {checklist.riskSatisfied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className="text-slate-300">5. Risk Management Rules</span>
            </div>
            <span className={`font-mono text-[11px] ${checklist.riskSatisfied ? 'text-emerald-400' : 'text-rose-400'}`}>
              {checklist.riskMessage}
            </span>
          </div>
        </div>
      </div>

      {/* Trade Parameters Grid (Stop-Loss, Target, Position Size, INR Risk) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800 font-mono text-xs">
        {/* Stop Loss */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Stop Loss</span>
            <span className="text-rose-400 text-[10px]">1.5× ATR</span>
          </div>
          <div className="text-rose-400 font-bold text-sm mt-0.5">
            ${stopLoss ? stopLoss.toFixed(2) : '--'}
          </div>
          <div className="text-[10px] text-slate-500">
            Dist: ${stopDistance ? stopDistance.toFixed(2) : '--'}
          </div>
        </div>

        {/* Take Profit (1:2 R:R) */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Take Profit</span>
            <span className="text-emerald-400 text-[10px]">1:2 R:R</span>
          </div>
          <div className="text-emerald-400 font-bold text-sm mt-0.5">
            ${takeProfit ? takeProfit.toFixed(2) : '--'}
          </div>
          <div className="text-[10px] text-slate-500">
            Target: +${(stopDistance * settings.riskRewardRatio).toFixed(2)}
          </div>
        </div>

        {/* Position Size */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
          <div className="text-[11px] text-slate-400">Position Size</div>
          <div className="text-white font-bold text-sm mt-0.5">
            {positionSize ? positionSize.toFixed(4) : '--'} BTC
          </div>
          <div className="text-[10px] text-slate-400">
            ≈ ₹{positionSizeINR ? positionSizeINR.toFixed(0) : '--'}
          </div>
        </div>

        {/* Risk Amount in INR */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Risk Capital</span>
            <span className="text-cyan-400 text-[10px]">{riskPercent}% Equity</span>
          </div>
          <div className="text-cyan-300 font-bold text-sm mt-0.5">
            ₹{riskAmountINR ? riskAmountINR.toFixed(2) : '--'}
          </div>
          <div className="text-[10px] text-slate-500">
            Max Limit: ₹{accountRisk.maxRiskPerTradeINR}
          </div>
        </div>
      </div>

      {/* Anti-Slop Disclaimer Notice */}
      <div className="mt-3 flex items-start space-x-1.5 text-[10px] text-slate-500 bg-slate-950/30 p-2 rounded-lg">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Discipline Notice: Never risk more than 1% per trade. Signals require closed candles. Indicators provide probabilities, never guaranteed predictions.
        </span>
      </div>
    </div>
  );
};
