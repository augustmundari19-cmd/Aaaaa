/**
 * CoinDCX Exchange Settings & Security Modal
 * Configures CoinDCX API integration, verifies credentials securely via backend proxy,
 * checks restricted permissions (withdrawals disabled), and manages Paper vs Live modes.
 */

import React, { useState } from 'react';
import { AccountRiskConfig } from '../types/trading';
import {
  ShieldCheck,
  X,
  Key,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  RefreshCw,
  Server
} from 'lucide-react';

interface ExchangeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountRisk: AccountRiskConfig;
  onUpdateMode: (mode: 'PAPER' | 'LIVE_COINDCX') => void;
}

export const ExchangeSettingsModal: React.FC<ExchangeSettingsModalProps> = ({
  isOpen,
  onClose,
  accountRisk,
  onUpdateMode
}) => {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    tested: boolean;
    valid: boolean;
    message: string;
    details?: any;
  }>({
    tested: false,
    valid: false,
    message: ''
  });

  const handleVerify = async () => {
    if (!apiKey || !apiSecret) {
      setVerifyStatus({
        tested: true,
        valid: false,
        message: 'Please enter both CoinDCX API Key and Secret'
      });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus({ tested: false, valid: false, message: '' });

    try {
      const res = await fetch('/api/coindcx/verify-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret })
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setVerifyStatus({
          tested: true,
          valid: true,
          message: `Successfully authenticated! Connected to CoinDCX account (${data.userData.first_name})`,
          details: data.permissions
        });
      } else {
        setVerifyStatus({
          tested: true,
          valid: false,
          message: data.error || 'Authentication failed. Please check your API key and IP whitelist.'
        });
      }
    } catch (err: any) {
      setVerifyStatus({
        tested: true,
        valid: false,
        message: `Network error: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">CoinDCX Exchange Gateway</h3>
              <p className="text-xs text-slate-400">Secure backend proxy & API authorization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector (Paper Trading vs Live CoinDCX) */}
        <div className="my-4">
          <label className="text-xs font-semibold text-slate-300 block mb-2">Execution Environment</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateMode('PAPER')}
              className={`p-3 rounded-xl border text-left transition ${
                accountRisk.tradingMode === 'PAPER'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">Paper Trading</span>
                {accountRisk.tradingMode === 'PAPER' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Safe sandbox simulation with real live price tick feed and fee model. No real funds needed.
              </p>
            </button>

            <button
              onClick={() => onUpdateMode('LIVE_COINDCX')}
              className={`p-3 rounded-xl border text-left transition ${
                accountRisk.tradingMode === 'LIVE_COINDCX'
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-400">Live CoinDCX</span>
                {accountRisk.tradingMode === 'LIVE_COINDCX' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Connect your real CoinDCX API credentials for live exchange order routing.
              </p>
            </button>
          </div>
        </div>

        {/* CoinDCX API Credentials (Backend Proxy Enforced) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">CoinDCX API Credentials</span>
            <span className="text-[10px] text-slate-500 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Proxy Signature HMAC-SHA256</span>
            </span>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">API Key</label>
            <input
              type="text"
              placeholder="e.g. 5f8a92b... (from CoinDCX API Management)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">API Secret</label>
            <input
              type="password"
              placeholder="Enter your secret key"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Verification Status */}
          {verifyStatus.tested && (
            <div
              className={`p-2.5 rounded-lg text-xs font-mono flex items-start space-x-2 ${
                verifyStatus.valid
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {verifyStatus.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{verifyStatus.message}</span>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition flex items-center justify-center space-x-1.5"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying with CoinDCX Servers...</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5" />
                <span>Test & Verify Credentials</span>
              </>
            )}
          </button>
        </div>

        {/* Security Checklist (Mandatory Guidelines) */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
          <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>CoinDCX API Security Checklist</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Read Permission: Enabled for balances & order history</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Trade Permission: Enabled for spot / futures order placement</span>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Withdrawal Permission: DISABLED (Mandatory requirement for safety)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>IP Whitelisting: Recommended for your dedicated cloud/server IP</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
