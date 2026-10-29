/**
 * Automated Trading & Bot Control Panel
 * Features Emergency Kill Switch, Automated Signal Execution switch,
 * Pyramiding configuration, Indicator Exits toggle, and Live Event Audit Log.
 */

import React, { useState } from 'react';
import { AccountRiskConfig, IndicatorSettings } from '../types/trading';
import {
  Power,
  Shield,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  Terminal,
  Settings2,
  Lock,
  Layers
} from 'lucide-react';

interface BotControlPanelProps {
  accountRisk: AccountRiskConfig;
  settings: IndicatorSettings;
  eventLogs: { time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }[];
  onToggleAutomation: (enabled: boolean) => void;
  onEmergencyStop: () => void;
  onTogglePyramiding: (enabled: boolean) => void;
  onToggleIndicatorExits: (enabled: boolean) => void;
  onOpenRiskSettings: () => void;
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({
  accountRisk,
  settings,
  eventLogs,
  onToggleAutomation,
  onEmergencyStop,
  onTogglePyramiding,
  onToggleIndicatorExits,
  onOpenRiskSettings
}) => {
  const [showConfirmAutomate, setShowConfirmAutomate] = useState(false);

  const handleAutomationClick = () => {
    if (!accountRisk.automatedTradingEnabled) {
      // Require user confirmation before activating bot
      setShowConfirmAutomate(true);
    } else {
      onToggleAutomation(false);
    }
  };

  const confirmAutomation = () => {
    setShowConfirmAutomate(false);
    onToggleAutomation(true);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      {/* Top Header with Emergency Kill Switch */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Automation & Guardrails</h3>
            <p className="text-[11px] text-slate-400">Algorithmic execution & capital safety</p>
          </div>
        </div>

        {/* EMERGENCY KILL SWITCH */}
        <button
          onClick={onEmergencyStop}
          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition shadow-lg shadow-rose-600/30 active:scale-95"
          title="Emergency Stop: Close all positions, cancel all orders, halt automation"
        >
          <Power className="w-3.5 h-3.5 stroke-[3]" />
          <span>Panic Kill Switch</span>
        </button>
      </div>

      {/* Main Bot Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        {/* 1. Automated Execution Switch */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-200">Auto Signal Bot</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  accountRisk.automatedTradingEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {accountRisk.automatedTradingEnabled ? 'ARMED & ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Automatically places trades when all 5 confirmation rules pass on closed candles.
            </p>
          </div>

          <button
            onClick={handleAutomationClick}
            className={`mt-3 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              accountRisk.automatedTradingEnabled
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {accountRisk.automatedTradingEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Bot</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Arm Automated Trading</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Pyramiding Setting */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-200">Pyramiding</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  accountRisk.pyramidingEnabled
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {accountRisk.pyramidingEnabled ? 'ALLOWED' : '1 POSITION MAX'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Prevent duplicate entries. Default keeps strict single-position discipline.
            </p>
          </div>

          <button
            onClick={() => onTogglePyramiding(!accountRisk.pyramidingEnabled)}
            className="mt-3 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            {accountRisk.pyramidingEnabled ? 'Restrict to Single Trade' : 'Allow Pyramiding'}
          </button>
        </div>

        {/* 3. Indicator Exits Setting */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-200">Indicator Exits</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  settings.indicatorExitsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.indicatorExitsEnabled ? 'ENABLED' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Auto-close BUY if EMA crosses below & Supertrend flips bearish.
            </p>
          </div>

          <button
            onClick={() => onToggleIndicatorExits(!settings.indicatorExitsEnabled)}
            className="mt-3 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            {settings.indicatorExitsEnabled ? 'Disable Indicator Exits' : 'Enable Indicator Exits'}
          </button>
        </div>
      </div>

      {/* Terminal / Live Audit Log */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <div className="flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">Live Strategy Execution Log</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">Auto-refreshing</span>
        </div>

        <div className="h-28 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[11px] space-y-1">
          {eventLogs.length === 0 ? (
            <div className="text-slate-600 italic">No events recorded yet. Engine initializing...</div>
          ) : (
            eventLogs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'error'
                      ? 'text-rose-400 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Explicit User Confirmation Modal for Automated Trading */}
      {showConfirmAutomate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-white">Authorize Automated Trading</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              You are about to enable automated execution for the 15-minute Strategy Engine. When all 5 confirmations align on a closed candle, orders will be executed without manual prompts.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Trading Mode:</span>
                <span className="text-white font-bold">{accountRisk.tradingMode}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Max Risk Per Trade:</span>
                <span className="text-emerald-400 font-bold">₹{accountRisk.maxRiskPerTradeINR} (1%)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Daily Loss Limit:</span>
                <span className="text-rose-400 font-bold">₹{accountRisk.dailyLossLimitINR}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmAutomate(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAutomation}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
              >
                I Understand & Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
