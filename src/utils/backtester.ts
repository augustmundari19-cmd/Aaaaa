/**
 * Backtesting Engine for My Crypto Trader
 * Rigorously simulates historical strategy performance without look-ahead bias,
 * including exchange taker fees (0.05%) and realistic market slippage (0.05%).
 */

import {
  Candle,
  IndicatorSettings,
  BacktestResult,
  TradeHistoryItem,
  AccountRiskConfig,
  PositionSide
} from '../types/trading';
import { calculateAllIndicators } from './indicators';

export function runBacktest(
  candles: Candle[],
  settings: IndicatorSettings,
  initialCapitalINR: number = 5000,
  riskPercent: number = 0.01, // 1%
  slippagePct: number = 0.0005, // 0.05%
  feePct: number = 0.0005, // 0.05% maker/taker
  usdtInrRate: number = 89.45
): BacktestResult {
  if (candles.length < 50) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      netPnLINR: 0,
      netPnLPercent: 0,
      profitFactor: 0,
      maxDrawdownINR: 0,
      maxDrawdownPercent: 0,
      totalFeesINR: 0,
      averageTradeINR: 0,
      trades: [],
      equityCurve: [{ time: candles[0]?.time || 0, equityINR: initialCapitalINR }]
    };
  }

  // Precompute indicators for all candles
  const indicators = calculateAllIndicators(candles, settings);

  let currentCapital = initialCapitalINR;
  let peakCapital = initialCapitalINR;
  let maxDrawdownINR = 0;
  let maxDrawdownPercent = 0;
  let totalFeesINR = 0;

  const trades: TradeHistoryItem[] = [];
  const equityCurve: { time: number; equityINR: number }[] = [
    { time: candles[30].time * 1000, equityINR: initialCapitalINR }
  ];

  interface ActiveBacktestTrade {
    id: string;
    symbol: string;
    side: PositionSide;
    entryPrice: number;
    quantity: number;
    positionSizeINR: number;
    stopLoss: number;
    takeProfit: number;
    entryTime: number;
    entryFee: number;
  }

  let activeTrade: ActiveBacktestTrade | null = null;
  const startIndex = Math.max(settings.emaSlow, settings.rsiPeriod, settings.atrPeriod, settings.supertrendAtrPeriod) + 2;

  for (let i = startIndex; i < candles.length; i++) {
    const currentCandle = candles[i];
    const prevCandle = candles[i - 1];

    // 1. Manage Active Trade if exists (checking intra-candle High/Low)
    if (activeTrade) {
      let exitPrice = 0;
      let exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'INDICATOR_EXIT' | null = null;

      if (activeTrade.side === 'LONG') {
        // Did it hit Stop Loss?
        if (currentCandle.low <= activeTrade.stopLoss) {
          exitPrice = activeTrade.stopLoss * (1 - slippagePct); // slippage against trader
          exitReason = 'STOP_LOSS';
        }
        // Did it hit Take Profit?
        else if (currentCandle.high >= activeTrade.takeProfit) {
          exitPrice = activeTrade.takeProfit * (1 - slippagePct);
          exitReason = 'TAKE_PROFIT';
        }
        // Indicator-based exit condition
        else if (settings.indicatorExitsEnabled) {
          const emaFast = indicators.emaFast[i];
          const emaSlow = indicators.emaSlow[i];
          const supertrend = indicators.supertrend[i];
          if (emaFast < emaSlow && supertrend.direction === 'bearish') {
            exitPrice = currentCandle.close * (1 - slippagePct);
            exitReason = 'INDICATOR_EXIT';
          }
        }
      } else {
        // SHORT position
        // Did it hit Stop Loss?
        if (currentCandle.high >= activeTrade.stopLoss) {
          exitPrice = activeTrade.stopLoss * (1 + slippagePct);
          exitReason = 'STOP_LOSS';
        }
        // Did it hit Take Profit?
        else if (currentCandle.low <= activeTrade.takeProfit) {
          exitPrice = activeTrade.takeProfit * (1 + slippagePct);
          exitReason = 'TAKE_PROFIT';
        }
        // Indicator-based exit
        else if (settings.indicatorExitsEnabled) {
          const emaFast = indicators.emaFast[i];
          const emaSlow = indicators.emaSlow[i];
          const supertrend = indicators.supertrend[i];
          if (emaFast > emaSlow && supertrend.direction === 'bullish') {
            exitPrice = currentCandle.close * (1 + slippagePct);
            exitReason = 'INDICATOR_EXIT';
          }
        }
      }

      // Close the trade if triggered
      if (exitReason && exitPrice > 0) {
        const exitFee = (activeTrade.positionSizeINR * (exitPrice / activeTrade.entryPrice)) * feePct;
        const totalTradeFee = activeTrade.entryFee + exitFee;
        totalFeesINR += totalTradeFee;

        let grossPnLPercent = 0;
        if (activeTrade.side === 'LONG') {
          grossPnLPercent = (exitPrice - activeTrade.entryPrice) / activeTrade.entryPrice;
        } else {
          grossPnLPercent = (activeTrade.entryPrice - exitPrice) / activeTrade.entryPrice;
        }

        const grossPnLINR = activeTrade.positionSizeINR * grossPnLPercent;
        const netPnLINR = grossPnLINR - totalTradeFee;
        const netPnLPercent = (netPnLINR / activeTrade.positionSizeINR) * 100;

        currentCapital += netPnLINR;

        // Track peak and drawdown
        if (currentCapital > peakCapital) {
          peakCapital = currentCapital;
        }
        const currentDrawdown = peakCapital - currentCapital;
        const currentDrawdownPct = (currentDrawdown / peakCapital) * 100;
        if (currentDrawdown > maxDrawdownINR) {
          maxDrawdownINR = currentDrawdown;
          maxDrawdownPercent = currentDrawdownPct;
        }

        trades.push({
          id: activeTrade.id,
          symbol: activeTrade.symbol,
          side: activeTrade.side,
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          quantity: activeTrade.quantity,
          realizedPnL: netPnLINR,
          realizedPnLPercent: netPnLPercent,
          exitReason,
          fees: totalTradeFee,
          entryTime: activeTrade.entryTime,
          exitTime: currentCandle.time * 1000
        });

        equityCurve.push({
          time: currentCandle.time * 1000,
          equityINR: Math.round(currentCapital * 100) / 100
        });

        activeTrade = null;
      }
    }

    // 2. Check for New Entry Signal on PREVIOUS closed candle (avoids lookahead)
    if (!activeTrade) {
      const evalIdx = i - 1; // Evaluated on closed bar
      const rsiVal = indicators.rsi[evalIdx];
      const rsiPrev = indicators.rsi[evalIdx - 1];
      const emaFastVal = indicators.emaFast[evalIdx];
      const emaSlowVal = indicators.emaSlow[evalIdx];
      const emaFastPrev = indicators.emaFast[evalIdx - 1];
      const emaSlowPrev = indicators.emaSlow[evalIdx - 1];
      const supertrend = indicators.supertrend[evalIdx];
      const atrVal = indicators.atr[evalIdx];

      if (isNaN(rsiVal) || isNaN(emaFastVal) || isNaN(supertrend.value) || isNaN(atrVal)) {
        continue;
      }

      const supertrendBullish = supertrend.direction === 'bullish';
      const supertrendBearish = supertrend.direction === 'bearish';

      let buySignal = false;
      let sellSignal = false;

      if (settings.strategyMode === 'MODE_A_STRICT') {
        const isEmaBullishCross = emaFastVal > emaSlowVal && emaFastPrev <= emaSlowPrev;
        const isEmaBearishCross = emaFastVal < emaSlowVal && emaFastPrev >= emaSlowPrev;

        buySignal = rsiVal > settings.rsiBuyThreshold && isEmaBullishCross && supertrendBullish;
        sellSignal = rsiVal < settings.rsiSellThreshold && isEmaBearishCross && supertrendBearish;
      } else {
        // Mode B: Pullback in direction of trend
        const isUptrend = emaFastVal > emaSlowVal && supertrendBullish;
        const isDowntrend = emaFastVal < emaSlowVal && supertrendBearish;

        buySignal = isUptrend && rsiVal >= 48 && rsiVal > rsiPrev && rsiPrev < 55 && prevCandle.close > emaFastVal;
        sellSignal = isDowntrend && rsiVal <= 52 && rsiVal < rsiPrev && rsiPrev > 45 && prevCandle.close < emaFastVal;
      }

      // Enter trade at current open price with slippage
      if (buySignal || sellSignal) {
        const side: PositionSide = buySignal ? 'LONG' : 'SHORT';
        const entryPrice = buySignal 
          ? currentCandle.open * (1 + slippagePct) 
          : currentCandle.open * (1 - slippagePct);

        const stopDistance = settings.atrStopMultiplier * atrVal;
        const stopDistancePct = stopDistance / entryPrice;

        const riskCapitalINR = currentCapital * riskPercent; // e.g. 1% of equity
        let positionSizeINR = riskCapitalINR / stopDistancePct;

        // Cap to available capital
        if (positionSizeINR > currentCapital * 0.95) {
          positionSizeINR = currentCapital * 0.95;
        }

        const quantity = positionSizeINR / (entryPrice * usdtInrRate);
        const entryFee = positionSizeINR * feePct;

        const stopLoss = buySignal ? entryPrice - stopDistance : entryPrice + stopDistance;
        const takeProfit = buySignal 
          ? entryPrice + (settings.riskRewardRatio * stopDistance)
          : entryPrice - (settings.riskRewardRatio * stopDistance);

        activeTrade = {
          id: `bt_${i}_${Date.now()}`,
          symbol: 'BTC/USDT',
          side,
          entryPrice,
          quantity,
          positionSizeINR,
          stopLoss,
          takeProfit,
          entryTime: currentCandle.time * 1000,
          entryFee
        };
      }
    }
  }

  // Calculate backtest performance summary
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.realizedPnL > 0).length;
  const losingTrades = trades.filter(t => t.realizedPnL < 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const grossProfitINR = trades.filter(t => t.realizedPnL > 0).reduce((acc, t) => acc + t.realizedPnL, 0);
  const grossLossINR = Math.abs(trades.filter(t => t.realizedPnL < 0).reduce((acc, t) => acc + t.realizedPnL, 0));
  const profitFactor = grossLossINR > 0 ? grossProfitINR / grossLossINR : (grossProfitINR > 0 ? 99.9 : 0);

  const netPnLINR = currentCapital - initialCapitalINR;
  const netPnLPercent = (netPnLINR / initialCapitalINR) * 100;
  const averageTradeINR = totalTrades > 0 ? netPnLINR / totalTrades : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 10) / 10,
    netPnLINR: Math.round(netPnLINR * 100) / 100,
    netPnLPercent: Math.round(netPnLPercent * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdownINR: Math.round(maxDrawdownINR * 100) / 100,
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 10) / 10,
    totalFeesINR: Math.round(totalFeesINR * 100) / 100,
    averageTradeINR: Math.round(averageTradeINR * 100) / 100,
    trades: trades.reverse(), // most recent first
    equityCurve
  };
}
