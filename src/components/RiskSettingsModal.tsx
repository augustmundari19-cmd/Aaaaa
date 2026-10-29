/**
 * Risk & Technical Indicator Settings Modal
 * Allows adjusting RSI, EMA, Supertrend, ATR, Capital, Risk per trade (1%),
 * and Daily Loss Limit.
 */

import React, { useState } from 'react';
import { IndicatorSettings, AccountRiskConfig } from '../types/trading';
import { Sliders, X, RotateCcw, Check, Shield, TrendingUp } from 'lucide-react';

interface RiskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: IndicatorSettings;
  accountRisk: AccountRiskConfig;
  onSaveSettings: (newSettings: IndicatorSettings, newRisk: AccountRiskConfig) => void;
}

export const RiskSettingsModal: React.FC<RiskSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  accountRisk,
  onSaveSettings
}) => {
  if (!isOpen) return null;

  const [localSettings, setLocalSettings] = useState<IndicatorSettings>({ ...settings });
  const [capitalINR, setCapitalINR] = useState<number>(accountRisk.equityINR);
  const [riskPercent, setRiskPercent] = useState<number>(accountRisk.riskPerTradePercent);
  const [dailyLossINR, setDailyLossINR] = useState<number>(accountRisk.dailyLossLimitINR);

  // Default values specified in user prompt
  const handleResetDefaults = () => {
    setLocalSettings({
      rsiPeriod: 14,
      rsiBuyThreshold: 65,
      rsiSellThreshold: 35,
      emaFast: 9,
      emaSlow: 21,
      supertrendAtrPeriod: 10,
      supertrendMultiplier: 3.0,
      atrPeriod: 14,
      atrStopMultiplier: 1.5,
      riskRewardRatio: 2.0,
      timeframe: '15m',
      strategyMode: 'MODE_A_STRICT',
      indicatorExitsEnabled: true
    });
    setCapitalINR(5000);
    setRiskPercent(1);
    setDailyLossINR(250);
  };

  const handleSave = () => {
    const updatedRisk: AccountRiskConfig = {
      ...accountRisk,
      equityINR: capitalINR,
      riskPerTradePercent: riskPercent,
      maxRiskPerTradeINR: (capitalINR * riskPercent) / 100,
      dailyLossLimitINR: dailyLossINR
    };

    onSaveSettings(localSettings, updatedRisk);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Strategy & Risk Configuration</h3>
              <p className="text-xs text-slate-400">Calibrate indicators and money management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 my-4">
          {/* Section 1: Capital & Risk Management */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Capital & Account Risk (INR)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Trading Equity (₹)</label>
                <input
                  type="number"
                  value={capitalINR}
                  onChange={(e) => setCapitalINR(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: ₹5,000</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Max Risk / Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-emerald-400 font-mono">
                  = ₹{((capitalINR * riskPercent) / 100).toFixed(0)} cap
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Daily Loss Limit (₹)</label>
                <input
                  type="number"
                  value={dailyLossINR}
                  onChange={(e) => setDailyLossINR(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: ₹250 (5%)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Technical Indicators */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Technical Indicators</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* RSI */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">RSI Period</label>
                <input
                  type="number"
                  value={localSettings.rsiPeriod}
                  onChange={(e) => setLocalSettings({ ...localSettings, rsiPeriod: parseInt(e.target.value, 10) || 14 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 14</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">RSI Buy Threshold</label>
                <input
                  type="number"
                  value={localSettings.rsiBuyThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, rsiBuyThreshold: parseInt(e.target.value, 10) || 65 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 65</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">RSI Sell Threshold</label>
                <input
                  type="number"
                  value={localSettings.rsiSellThreshold}
                  onChange={(e) => setLocalSettings({ ...localSettings, rsiSellThreshold: parseInt(e.target.value, 10) || 35 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 35</span>
              </div>

              {/* EMA */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">EMA Fast</label>
                <input
                  type="number"
                  value={localSettings.emaFast}
                  onChange={(e) => setLocalSettings({ ...localSettings, emaFast: parseInt(e.target.value, 10) || 9 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 9</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">EMA Slow</label>
                <input
                  type="number"
                  value={localSettings.emaSlow}
                  onChange={(e) => setLocalSettings({ ...localSettings, emaSlow: parseInt(e.target.value, 10) || 21 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 21</span>
              </div>

              {/* Supertrend */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Supertrend ATR</label>
                <input
                  type="number"
                  value={localSettings.supertrendAtrPeriod}
                  onChange={(e) => setLocalSettings({ ...localSettings, supertrendAtrPeriod: parseInt(e.target.value, 10) || 10 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 10</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Supertrend Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.supertrendMultiplier}
                  onChange={(e) => setLocalSettings({ ...localSettings, supertrendMultiplier: parseFloat(e.target.value) || 3.0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 3.0</span>
              </div>

              {/* Stop Loss & Target Multipliers */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">ATR SL Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={localSettings.atrStopMultiplier}
                  onChange={(e) => setLocalSettings({ ...localSettings, atrStopMultiplier: parseFloat(e.target.value) || 1.5 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 1.5× ATR</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Risk-Reward Ratio</label>
                <input
                  type="number"
                  step="0.5"
                  value={localSettings.riskRewardRatio}
                  onChange={(e) => setLocalSettings({ ...localSettings, riskRewardRatio: parseFloat(e.target.value) || 2.0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 1:2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20 flex items-center space-x-1"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
