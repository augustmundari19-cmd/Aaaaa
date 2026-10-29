/**
 * Android Build Instructions & Deployment Guide Modal
 * Comprehensive walkthrough for building the Android APK via Capacitor or TWA,
 * backend configuration, and CoinDCX production deployment.
 */

import React, { useState } from 'react';
import { Smartphone, X, Copy, Check, Terminal, Shield, Code, ChevronRight } from 'lucide-react';

interface AndroidBuildGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidBuildGuideModal: React.FC<AndroidBuildGuideModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const capacitorCommands = `# 1. Install Capacitor CLI and Android platform
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor with App ID
npx cap init "My Crypto Trader" "com.mycryptotrader.app" --web-dir dist

# 3. Build the web app assets
npm run build

# 4. Add the Android platform
npx cap add android

# 5. Sync and copy built assets to native Android project
npx cap sync

# 6. Open project in Android Studio to build APK or AAB
npx cap open android`;

  const androidManifestSnippet = `<!-- Add to android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.mycryptotrader.app">
    
    <!-- Required for real-time WebSocket and CoinDCX REST data -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Note: Disallow unnecessary permissions for maximum safety -->
</manifest>`;

  const backendEnvConfig = `# Backend Server Environment Variables (.env)
PORT=3000
NODE_ENV=production

# CoinDCX API Credentials (Keep strictly on server, never in APK bundle)
COINDCX_API_KEY="your_api_key_from_coindcx"
COINDCX_API_SECRET="your_api_secret_from_coindcx"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Android Build & Deployment Guide</h3>
              <p className="text-xs text-slate-400">Step-by-step instructions to compile the native Android APK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4 text-xs">
          {/* Step 1: Capacitor Native Android Export */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Export Native Android Project (Capacitor)</span>
              </div>
              <button
                onClick={() => handleCopy('cap', capacitorCommands)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
              >
                {copiedKey === 'cap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cap' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {capacitorCommands}
            </pre>
          </div>

          {/* Step 2: AndroidManifest.xml Security */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>AndroidManifest.xml Permissions</span>
              </div>
              <button
                onClick={() => handleCopy('manifest', androidManifestSnippet)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
              >
                {copiedKey === 'manifest' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'manifest' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {androidManifestSnippet}
            </pre>
          </div>

          {/* Step 3: Backend Security & Credentials Isolation */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Backend Architecture & Security Isolation</span>
              </div>
              <button
                onClick={() => handleCopy('backend', backendEnvConfig)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
              >
                {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'backend' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Crucial: Never compile private CoinDCX API keys into the Android APK binary (they can be decompiled). Instead, all order placement and HMAC signatures are computed server-side via <code className="text-emerald-400">server.ts</code>.
            </p>
            <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
              {backendEnvConfig}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
