/**
 * Interactive Professional Candlestick Chart for My Crypto Trader
 * High-performance Canvas rendering with EMA 9/21, Supertrend, Volume,
 * RSI sub-panel (65/35 levels), ATR readout, and active SL/TP overlay.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Candle,
  IndicatorSettings,
  CalculatedIndicators,
  TradingSignal,
  Position
} from '../types/trading';
import { calculateAllIndicators } from '../utils/indicators';
import { ZoomIn, ZoomOut, RefreshCw, Layers, Crosshair } from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  symbol: string;
  settings: IndicatorSettings;
  signal: TradingSignal | null;
  currentPosition: Position | null;
  onTimeframeChange: (tf: string) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  symbol,
  settings,
  signal,
  currentPosition,
  onTimeframeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport navigation state
  const [visibleBars, setVisibleBars] = useState<number>(65);
  const [scrollOffset, setScrollOffset] = useState<number>(0); // 0 means scrolled to latest candle
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Indicators calculation
  const indicators: CalculatedIndicators = useMemo(() => {
    return calculateAllIndicators(candles, settings);
  }, [candles, settings]);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];

  // Handle Zoom In / Zoom Out
  const handleZoom = (direction: 'in' | 'out') => {
    setVisibleBars((prev) => {
      if (direction === 'in') return Math.max(25, prev - 15);
      return Math.min(candles.length, prev + 15);
    });
  };

  const handleResetView = () => {
    setScrollOffset(0);
    setVisibleBars(65);
  };

  // Render Chart Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Layout configuration
    const rsiPaneHeight = 90;
    const paddingRight = 68; // Price scale width
    const paddingBottom = 22; // Time scale height
    const mainChartHeight = height - rsiPaneHeight - paddingBottom - 10;
    const chartWidth = width - paddingRight;

    // Slicing visible candles
    const totalCandles = candles.length;
    const endIndex = Math.max(1, totalCandles - scrollOffset);
    const startIndex = Math.max(0, endIndex - visibleBars);
    const sliceCount = endIndex - startIndex;

    if (sliceCount <= 0) return;

    const visibleCandles = candles.slice(startIndex, endIndex);

    // Find Price Bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    for (let i = startIndex; i < endIndex; i++) {
      const c = candles[i];
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;

      // Include EMA lines in bounds
      const fEma = indicators.emaFast[i];
      const sEma = indicators.emaSlow[i];
      if (!isNaN(fEma)) {
        if (fEma < minPrice) minPrice = fEma;
        if (fEma > maxPrice) maxPrice = fEma;
      }
      if (!isNaN(sEma)) {
        if (sEma < minPrice) minPrice = sEma;
        if (sEma > maxPrice) maxPrice = sEma;
      }

      // Include Supertrend in bounds
      const st = indicators.supertrend[i];
      if (st && !isNaN(st.value)) {
        if (st.value < minPrice) minPrice = st.value;
        if (st.value > maxPrice) maxPrice = st.value;
      }
    }

    // Add padding to price range
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;
    const effectivePriceRange = maxPrice - minPrice;

    // Helper conversion functions
    const candleWidth = chartWidth / sliceCount;
    const barSpacing = Math.max(1, candleWidth * 0.2);
    const barBodyWidth = Math.max(1.5, candleWidth - barSpacing);

    const getYForPrice = (p: number) => {
      return mainChartHeight - ((p - minPrice) / effectivePriceRange) * mainChartHeight;
    };

    const getXForIndex = (localIdx: number) => {
      return localIdx * candleWidth + candleWidth / 2;
    };

    // 1. Draw Grid lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)'; // slate-700/25

    // Horizontal price grid
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const y = (mainChartHeight / priceSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = maxPrice - (i / priceSteps) * effectivePriceRange;
      ctx.fillStyle = '#64748B'; // slate-500
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceVal >= 1000 ? priceVal.toFixed(1) : priceVal.toFixed(2), chartWidth + 6, y + 3);
    }

    // Vertical time grid
    const timeSteps = Math.min(sliceCount, 6);
    for (let i = 0; i < timeSteps; i++) {
      const idx = Math.floor((i / timeSteps) * sliceCount);
      const x = getXForIndex(idx);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mainChartHeight);
      ctx.stroke();

      const timeVal = new Date(visibleCandles[idx].time * 1000);
      const timeStr = timeVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, mainChartHeight + 14);
    }

    // 2. Draw Volume Bars in main pane (bottom 20%)
    const volumeHeightMax = mainChartHeight * 0.22;
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = localIdxToX(i);
      const volHeight = (c.volume / (maxVolume || 1)) * volumeHeightMax;
      const y = mainChartHeight - volHeight;
      const isGreen = c.close >= c.open;

      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)';
      ctx.fillRect(x - barBodyWidth / 2, y, barBodyWidth, volHeight);
    }

    function localIdxToX(localIdx: number) {
      return localIdx * candleWidth + candleWidth / 2;
    }

    // 3. Draw Candlesticks
    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i];
      const x = localIdxToX(i);
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#10B981' : '#EF4444'; // Emerald vs Rose

      const openY = getYForPrice(c.open);
      const closeY = getYForPrice(c.close);
      const highY = getYForPrice(c.high);
      const lowY = getYForPrice(c.low);

      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));

      // Draw Wick
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw Body
      ctx.fillStyle = color;
      ctx.fillRect(x - barBodyWidth / 2, bodyTop, barBodyWidth, bodyHeight);
    }

    // 4. Draw Supertrend Overlay (Colored Line & Dots)
    ctx.lineWidth = 2;
    for (let i = 1; i < visibleCandles.length; i++) {
      const globalIdx = startIndex + i;
      const prevGlobalIdx = globalIdx - 1;

      const stCurr = indicators.supertrend[globalIdx];
      const stPrev = indicators.supertrend[prevGlobalIdx];

      if (stCurr && stPrev && !isNaN(stCurr.value) && !isNaN(stPrev.value)) {
        const x1 = localIdxToX(i - 1);
        const y1 = getYForPrice(stPrev.value);
        const x2 = localIdxToX(i);
        const y2 = getYForPrice(stCurr.value);

        const isBull = stCurr.direction === 'bullish';
        ctx.strokeStyle = isBull ? '#22C55E' : '#F43F5E';

        // Draw line segment
        if (stCurr.direction === stPrev.direction) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Draw direction dot at flips
        if (stCurr.direction !== stPrev.direction) {
          ctx.fillStyle = isBull ? '#22C55E' : '#F43F5E';
          ctx.beginPath();
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Draw EMA 9 (Fast - Cyan)
    ctx.beginPath();
    ctx.strokeStyle = '#06B6D4'; // Cyan 500
    ctx.lineWidth = 1.8;
    let startedEma9 = false;
    for (let i = 0; i < visibleCandles.length; i++) {
      const globalIdx = startIndex + i;
      const emaVal = indicators.emaFast[globalIdx];
      if (!isNaN(emaVal)) {
        const x = localIdxToX(i);
        const y = getYForPrice(emaVal);
        if (!startedEma9) {
          ctx.moveTo(x, y);
          startedEma9 = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // 6. Draw EMA 21 (Slow - Amber/Gold)
    ctx.beginPath();
    ctx.strokeStyle = '#F59E0B'; // Amber 500
    ctx.lineWidth = 1.8;
    let startedEma21 = false;
    for (let i = 0; i < visibleCandles.length; i++) {
      const globalIdx = startIndex + i;
      const emaVal = indicators.emaSlow[globalIdx];
      if (!isNaN(emaVal)) {
        const x = localIdxToX(i);
        const y = getYForPrice(emaVal);
        if (!startedEma21) {
          ctx.moveTo(x, y);
          startedEma21 = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // 7. Active Position or Signal Stop Loss & Take Profit Lines
    const activeTarget = currentPosition ? currentPosition.takeProfit : (signal?.takeProfit || 0);
    const activeStop = currentPosition ? currentPosition.stopLoss : (signal?.stopLoss || 0);
    const activeEntry = currentPosition ? currentPosition.entryPrice : (signal?.price || 0);

    if (activeTarget > 0 && activeStop > 0) {
      // Take Profit Line (Green dashed)
      const tpY = getYForPrice(activeTarget);
      if (tpY >= 0 && tpY <= mainChartHeight) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.2;
        ctx.moveTo(0, tpY);
        ctx.lineTo(chartWidth, tpY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#10B981';
        ctx.fillRect(chartWidth + 2, tpY - 9, 62, 18);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`TP ${activeTarget.toFixed(1)}`, chartWidth + 5, tpY + 3);
      }

      // Stop Loss Line (Red dashed)
      const slY = getYForPrice(activeStop);
      if (slY >= 0 && slY <= mainChartHeight) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.2;
        ctx.moveTo(0, slY);
        ctx.lineTo(chartWidth, slY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(chartWidth + 2, slY - 9, 62, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`SL ${activeStop.toFixed(1)}`, chartWidth + 5, slY + 3);
      }

      // Entry Price Line (Blue dotted)
      if (currentPosition) {
        const entY = getYForPrice(activeEntry);
        if (entY >= 0 && entY <= mainChartHeight) {
          ctx.beginPath();
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1;
          ctx.moveTo(0, entY);
          ctx.lineTo(chartWidth, entY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // 8. RSI Sub-Panel
    const rsiTop = height - rsiPaneHeight - paddingBottom;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, rsiTop, chartWidth, rsiPaneHeight);

    // RSI Pane Divider
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rsiTop);
    ctx.lineTo(width, rsiTop);
    ctx.stroke();

    // Helper for RSI Y coordinate (0-100 scale)
    const getRsiY = (val: number) => {
      const clamped = Math.max(0, Math.min(100, val));
      return rsiTop + rsiPaneHeight - (clamped / 100) * rsiPaneHeight;
    };

    // RSI 65 (Buy Threshold line)
    const rsi65Y = getRsiY(settings.rsiBuyThreshold);
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, rsi65Y);
    ctx.lineTo(chartWidth, rsi65Y);
    ctx.stroke();
    ctx.fillStyle = '#10B981';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`${settings.rsiBuyThreshold} BUY`, chartWidth + 6, rsi65Y + 3);

    // RSI 35 (Sell Threshold line)
    const rsi35Y = getRsiY(settings.rsiSellThreshold);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.moveTo(0, rsi35Y);
    ctx.lineTo(chartWidth, rsi35Y);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.fillText(`${settings.rsiSellThreshold} SELL`, chartWidth + 6, rsi35Y + 3);

    // RSI 50 Neutral line
    const rsi50Y = getRsiY(50);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.moveTo(0, rsi50Y);
    ctx.lineTo(chartWidth, rsi50Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // RSI Curve
    ctx.beginPath();
    ctx.strokeStyle = '#818CF8'; // Indigo 400
    ctx.lineWidth = 1.8;
    let startedRsi = false;
    for (let i = 0; i < visibleCandles.length; i++) {
      const globalIdx = startIndex + i;
      const rVal = indicators.rsi[globalIdx];
      if (!isNaN(rVal)) {
        const x = localIdxToX(i);
        const y = getRsiY(rVal);
        if (!startedRsi) {
          ctx.moveTo(x, y);
          startedRsi = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // 9. Interactive Crosshair and Hover Info
    if (crosshairPos && crosshairPos.x < chartWidth && crosshairPos.y < height - paddingBottom) {
      // Vertical crosshair
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, height - paddingBottom);
      ctx.stroke();

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(chartWidth, crosshairPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag at crosshair on right axis
      if (crosshairPos.y <= mainChartHeight) {
        const hoveredPrice = maxPrice - (crosshairPos.y / mainChartHeight) * effectivePriceRange;
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(chartWidth + 2, crosshairPos.y - 9, 62, 18);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(hoveredPrice.toFixed(2), chartWidth + 5, crosshairPos.y + 3);
      }
    }
  }, [candles, visibleBars, scrollOffset, settings, indicators, crosshairPos, signal, currentPosition]);

  // Handle Mouse / Touch Events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCrosshairPos({ x, y });

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      if (Math.abs(deltaX) > 4) {
        const barsShift = Math.round(deltaX / (rect.width / visibleBars));
        setScrollOffset((prev) => {
          const next = prev + barsShift;
          return Math.max(0, Math.min(candles.length - visibleBars, next));
        });
        setDragStartX(e.clientX);
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerLeave = () => {
    setIsDragging(false);
    setCrosshairPos(null);
  };

  // Current values for legend readout
  const latestIdx = candles.length - 1;
  const latestCandle = candles[latestIdx];
  const latestRsi = indicators.rsi[latestIdx];
  const latestEmaFast = indicators.emaFast[latestIdx];
  const latestEmaSlow = indicators.emaSlow[latestIdx];
  const latestSupertrend = indicators.supertrend[latestIdx];
  const latestAtr = indicators.atr[latestIdx];

  return (
    <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Chart Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-slate-800 gap-2 bg-slate-950/60">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-white text-base tracking-tight">{symbol}</span>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              LIVE
            </span>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                  settings.timeframe === tf
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Indicators Readout Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-slate-400">EMA(9):</span>
            <span className="text-cyan-300 font-semibold">{latestEmaFast ? latestEmaFast.toFixed(1) : '--'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">EMA(21):</span>
            <span className="text-amber-300 font-semibold">{latestEmaSlow ? latestEmaSlow.toFixed(1) : '--'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span
              className={`w-2 h-2 rounded-full ${
                latestSupertrend?.direction === 'bullish' ? 'bg-green-500' : 'bg-rose-500'
              }`}
            ></span>
            <span className="text-slate-400">ST(10,3):</span>
            <span
              className={`font-semibold ${
                latestSupertrend?.direction === 'bullish' ? 'text-green-400' : 'text-rose-400'
              }`}
            >
              {latestSupertrend?.value ? latestSupertrend.value.toFixed(1) : '--'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span className="text-slate-400">RSI(14):</span>
            <span
              className={`font-semibold ${
                latestRsi >= settings.rsiBuyThreshold
                  ? 'text-emerald-400'
                  : latestRsi <= settings.rsiSellThreshold
                  ? 'text-rose-400'
                  : 'text-indigo-300'
              }`}
            >
              {latestRsi ? latestRsi.toFixed(1) : '--'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">ATR(14):</span>
            <span className="text-slate-200 font-semibold">{latestAtr ? latestAtr.toFixed(1) : '--'}</span>
          </div>
        </div>

        {/* Chart View Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleZoom('in')}
            title="Zoom In"
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            title="Zoom Out"
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            title="Reset View"
            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div ref={containerRef} className="relative w-full h-[380px] sm:h-[440px] select-none touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Watermark / Mode Badge */}
        <div className="absolute top-3 left-4 pointer-events-none flex flex-col space-y-1 opacity-70">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {settings.strategyMode === 'MODE_A_STRICT' ? 'Mode A: Strict Confirmation' : 'Mode B: Trend Pullback'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Timeframe: {settings.timeframe} • R:R 1:{settings.riskRewardRatio} • SL 1.5×ATR
          </span>
        </div>
      </div>
    </div>
  );
};
