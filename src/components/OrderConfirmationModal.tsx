/**
 * Order Confirmation & Execution Modal for My Crypto Trader
 * Provides pre-trade verification screen, side validation (Long vs Short vs Close),
 * leverage/liquidation calculator, fee breakdown, and explicit confirmation.
 */

import React, { useState } from 'react';
import {
  TradingSignal,
  AccountRiskConfig,
  PositionSide,
  Position
} from '../types/trading';
import {
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  X,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: TradingSignal | null;
  accountRisk: AccountRiskConfig;
  currentPrice: number;
  usdtInrRate: number;
  currentPosition: Position | null;
  onExecuteTrade: (params: {
    symbol: string;
    side: PositionSide;
    orderType: 'MARKET' | 'LIMIT';
    price: number;
    quantity: number;
    stopLoss: number;
    takeProfit: number;
    marginINR: number;
    leverage: number;
    initialRiskINR: number;
  }) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  signal,
  accountRisk,
  currentPrice,
  usdtInrRate,
  currentPosition,
  onExecuteTrade
}) => {
  if (!isOpen) return null;

  // Initial proposed side from signal or fallback to LONG
  const defaultSide: PositionSide = signal?.type === 'SELL' ? 'SHORT' : 'LONG';
  const [side, setSide] = useState<PositionSide>(defaultSide);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [leverage, setLeverage] = useState<number>(accountRisk.leverage || 1);
  
  // Custom or default SL/TP
  const defaultStop = signal?.stopLoss || (side === 'LONG' ? currentPrice * 0.985 : currentPrice * 1.015);
  const defaultTarget = signal?.takeProfit || (side === 'LONG' ? currentPrice * 1.03 : currentPrice * 0.97);

  const [stopLoss, setStopLoss] = useState<number>(defaultStop);
  const [takeProfit, setTakeProfit] = useState<number>(defaultTarget);

  // Position Sizing based on risk
  const targetRiskINR = accountRisk.maxRiskPerTradeINR; // default ₹50
  const stopDistance = Math.abs(currentPrice - stopLoss);
  const stopDistancePct = stopDistance / currentPrice || 0.015;

  // Margin in INR required to risk targetRiskINR on SL:
  // PositionSizeINR = targetRiskINR / (stopDistancePct * leverage)
  let positionSizeINR = targetRiskINR / stopDistancePct;
  let marginINR = positionSizeINR / leverage;

  if (marginINR > accountRisk.availableINR) {
    marginINR = accountRisk.availableINR;
    positionSizeINR = marginINR * leverage;
  }

  const actualRiskINR = positionSizeINR * stopDistancePct;
  const quantityCrypto = positionSizeINR / (currentPrice * usdtInrRate);
  
  // Estimated exchange fee (0.05% taker fee)
  const estimatedFeeINR = positionSizeINR * 0.0005;

  // Estimated liquidation price
  const maintenanceMargin = 0.005; // 0.5%
  const estimatedLiqPrice = side === 'LONG'
    ? currentPrice * (1 - (1 / leverage) + maintenanceMargin)
    : currentPrice * (1 + (1 / leverage) - maintenanceMargin);

  // Risk Check
  const riskExceeded = actualRiskINR > accountRisk.maxRiskPerTradeINR * 1.1;
  const hasExistingPosition = currentPosition !== null && !accountRisk.pyramidingEnabled;

  const handleConfirm = () => {
    if (riskExceeded && !confirm("Calculated risk exceeds your strict ₹50 limit. Do you still wish to proceed?")) {
      return;
    }

    onExecuteTrade({
      symbol: 'BTC/USDT',
      side,
      orderType,
      price: currentPrice,
      quantity: quantityCrypto,
      stopLoss,
      takeProfit,
      marginINR,
      leverage,
      initialRiskINR: actualRiskINR
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Order Placement</h3>
              <p className="text-xs text-slate-400">
                Mode: <span className="font-semibold text-emerald-400">{accountRisk.tradingMode}</span>
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

        {/* Existing Position Warning */}
        {hasExistingPosition && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Active Position Warning:</span> You already have an open {currentPosition?.side} position. Opening a new trade with pyramiding disabled will close or modify your exposure.
            </div>
          </div>
        )}

        {/* Position Side Toggle (Long vs Short) */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => {
              setSide('LONG');
              setStopLoss(currentPrice - (signal?.stopDistance || currentPrice * 0.015));
              setTakeProfit(currentPrice + 2 * (signal?.stopDistance || currentPrice * 0.015));
            }}
            className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition border ${
              side === 'LONG'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>Open Long (Buy)</span>
          </button>

          <button
            onClick={() => {
              setSide('SHORT');
              setStopLoss(currentPrice + (signal?.stopDistance || currentPrice * 0.015));
              setTakeProfit(currentPrice - 2 * (signal?.stopDistance || currentPrice * 0.015));
            }}
            className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition border ${
              side === 'SHORT'
                ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 stroke-[3]" />
            <span>Open Short (Sell)</span>
          </button>
        </div>

        {/* Leverage Selector */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
            <span>Leverage (Futures Risk Setting)</span>
            <span className="font-mono text-cyan-400 font-bold">{leverage}x</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition border ${
                  leverage === lev
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {lev}x {lev === 1 ? '(Spot)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Calculated Breakdown Table */}
        <div className="mt-4 p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span>Market Reference:</span>
            <span className="text-white font-bold">${currentPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Stop-Loss (1.5× ATR):</span>
            <span className="text-rose-400 font-bold">
              ${stopLoss.toFixed(2)} (-{(stopDistancePct * 100).toFixed(2)}%)
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Take-Profit (1:2 R:R):</span>
            <span className="text-emerald-400 font-bold">
              ${takeProfit.toFixed(2)} (+{(stopDistancePct * 200).toFixed(2)}%)
            </span>
          </div>

          <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-slate-400">
            <span>Allocated Margin:</span>
            <span className="text-slate-200 font-semibold">₹{marginINR.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Position Notional (with {leverage}x):</span>
            <span className="text-white font-bold">
              ₹{positionSizeINR.toFixed(2)} ({quantityCrypto.toFixed(4)} BTC)
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Maximum Planned Risk:</span>
            <span className="text-cyan-400 font-bold">
              ₹{actualRiskINR.toFixed(2)} (Cap: ₹{accountRisk.maxRiskPerTradeINR})
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Estimated Exchange Fees:</span>
            <span className="text-slate-300">₹{estimatedFeeINR.toFixed(2)} (0.05% Taker)</span>
          </div>

          {leverage > 1 && (
            <div className="flex justify-between items-center text-amber-400 pt-1 border-t border-slate-800/60 font-semibold">
              <span>Estimated Liquidation:</span>
              <span>${estimatedLiqPrice.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Safety Disclaimer */}
        <div className="mt-3 text-[10px] text-slate-400 flex items-start space-x-1.5 p-2 rounded-lg bg-slate-950/40">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Strict Risk Control: Protective Stop-Loss and Take-Profit orders will be registered with the trade lifecycle engine immediately upon execution.
          </span>
        </div>

        {/* Confirmation Actions */}
        <div className="mt-5 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-lg flex items-center space-x-1.5 ${
              side === 'LONG'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25'
            }`}
          >
            <span>Confirm & Place {side} Order</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
