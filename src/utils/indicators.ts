/**
 * Technical Indicator Engine for My Crypto Trader
 * Computes exact EMA, Wilder's RSI, ATR, and Supertrend on real OHLCV data.
 */

import {
  Candle,
  IndicatorSettings,
  CalculatedIndicators,
  SupertrendPoint,
  TradingSignal,
  SignalChecklist,
  AccountRiskConfig,
  Position
} from '../types/trading';

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return result;

  const k = 2 / (period + 1);

  // Initial SMA for first period
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  // Compute EMA for remaining points
  for (let i = period; i < values.length; i++) {
    result[i] = (values[i] * k) + (result[i - 1] * (1 - k));
  }

  return result;
}

/**
 * Calculates Wilder's Smoothed Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length <= period) return new Array(closes.length).fill(NaN);

  const result: number[] = new Array(closes.length).fill(NaN);
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // Initial average gain & loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - (100 / (1 + rs));
  }

  // Wilder's smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const gain = gains[i - 1];
    const loss = losses[i - 1];

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }

  return result;
}

/**
 * Calculates Average True Range (ATR) using Wilder's smoothing
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length === 0) return [];
  const tr: number[] = [];
  const atr: number[] = new Array(candles.length).fill(NaN);

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const h_l = candles[i].high - candles[i].low;
      const h_pc = Math.abs(candles[i].high - candles[i - 1].close);
      const l_pc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(h_l, h_pc, l_pc));
    }
  }

  if (candles.length < period) return atr;

  let sumTR = 0;
  for (let i = 0; i < period; i++) {
    sumTR += tr[i];
  }
  atr[period - 1] = sumTR / period;

  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  return atr;
}

/**
 * Calculates Supertrend Indicator
 * ATR Period default: 10, Multiplier default: 3.0
 */
export function calculateSupertrend(
  candles: Candle[],
  atrPeriod: number = 10,
  multiplier: number = 3.0
): SupertrendPoint[] {
  const atr = calculateATR(candles, atrPeriod);
  const result: SupertrendPoint[] = [];

  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection: 'bullish' | 'bearish' = 'bullish';

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentATR = atr[i];

    if (isNaN(currentATR) || i < atrPeriod - 1) {
      result.push({
        time: candle.time,
        value: NaN,
        direction: 'bullish',
        upperBand: NaN,
        lowerBand: NaN
      });
      continue;
    }

    const hl2 = (candle.high + candle.low) / 2;
    const basicUpperBand = hl2 + (multiplier * currentATR);
    const basicLowerBand = hl2 - (multiplier * currentATR);

    const prevClose = i > 0 ? candles[i - 1].close : candle.close;

    // Calculate Final Upper Band
    let finalUpperBand = basicUpperBand;
    if (i > atrPeriod - 1) {
      if (basicUpperBand < prevUpperBand || prevClose > prevUpperBand) {
        finalUpperBand = basicUpperBand;
      } else {
        finalUpperBand = prevUpperBand;
      }
    }

    // Calculate Final Lower Band
    let finalLowerBand = basicLowerBand;
    if (i > atrPeriod - 1) {
      if (basicLowerBand > prevLowerBand || prevClose < prevLowerBand) {
        finalLowerBand = basicLowerBand;
      } else {
        finalLowerBand = prevLowerBand;
      }
    }

    // Determine Direction and Supertrend Value
    let direction: 'bullish' | 'bearish' = prevDirection;
    let supertrendValue = 0;

    if (i === atrPeriod - 1) {
      direction = candle.close >= basicUpperBand ? 'bullish' : 'bearish';
      supertrendValue = direction === 'bullish' ? finalLowerBand : finalUpperBand;
    } else {
      if (prevSupertrend === prevUpperBand) {
        direction = candle.close > finalUpperBand ? 'bullish' : 'bearish';
      } else {
        direction = candle.close < finalLowerBand ? 'bearish' : 'bullish';
      }
      supertrendValue = direction === 'bullish' ? finalLowerBand : finalUpperBand;
    }

    prevUpperBand = finalUpperBand;
    prevLowerBand = finalLowerBand;
    prevSupertrend = supertrendValue;
    prevDirection = direction;

    result.push({
      time: candle.time,
      value: supertrendValue,
      direction,
      upperBand: finalUpperBand,
      lowerBand: finalLowerBand
    });
  }

  return result;
}

/**
 * Computes all technical indicators for the candle series
 */
export function calculateAllIndicators(
  candles: Candle[],
  settings: IndicatorSettings
): CalculatedIndicators {
  const closes = candles.map(c => c.close);
  const emaFast = calculateEMA(closes, settings.emaFast);
  const emaSlow = calculateEMA(closes, settings.emaSlow);
  const rsi = calculateRSI(closes, settings.rsiPeriod);
  const atr = calculateATR(candles, settings.atrPeriod);
  const supertrend = calculateSupertrend(candles, settings.supertrendAtrPeriod, settings.supertrendMultiplier);

  return {
    rsi,
    emaFast,
    emaSlow,
    supertrend,
    atr
  };
}

/**
 * Evaluates trade signals based on confirmed closed candle and rules
 */
export function evaluateSignal(
  candles: Candle[],
  settings: IndicatorSettings,
  accountRisk: AccountRiskConfig,
  currentPosition: Position | null,
  usdtInrRate: number = 89.45
): TradingSignal {
  const minRequiredCandles = Math.max(settings.emaSlow, settings.rsiPeriod, settings.atrPeriod, settings.supertrendAtrPeriod) + 5;
  
  const emptyChecklist: SignalChecklist = {
    rsiSatisfied: false,
    rsiValue: 0,
    rsiMessage: 'Insufficient data',
    emaSatisfied: false,
    emaFastValue: 0,
    emaSlowValue: 0,
    emaMessage: 'Insufficient data',
    supertrendSatisfied: false,
    supertrendDirection: 'bullish',
    supertrendValue: 0,
    supertrendMessage: 'Insufficient data',
    candleClosed: false,
    candleClosedMessage: 'Waiting for candle close',
    riskSatisfied: false,
    riskAmountINR: 0,
    riskLimitINR: accountRisk.maxRiskPerTradeINR,
    riskMessage: 'Risk not evaluated',
    allPassed: false
  };

  if (candles.length < minRequiredCandles) {
    return {
      type: 'WAIT',
      action: 'HOLD',
      price: candles.length ? candles[candles.length - 1].close : 0,
      stopLoss: 0,
      takeProfit: 0,
      stopDistance: 0,
      riskToRewardRatio: settings.riskRewardRatio,
      positionSize: 0,
      positionSizeINR: 0,
      riskAmountINR: 0,
      timestamp: Date.now(),
      checklist: emptyChecklist,
      mode: settings.strategyMode,
      reason: 'Loading market candle data...'
    };
  }

  const indicators = calculateAllIndicators(candles, settings);
  
  // Use the last closed candle (or current candle if evaluated on closed state)
  const lastIdx = candles.length - 1;
  const prevIdx = lastIdx - 1;
  const currentCandle = candles[lastIdx];
  const currentPrice = currentCandle.close;

  const rsiVal = indicators.rsi[lastIdx];
  const rsiPrev = indicators.rsi[prevIdx];
  const emaFastVal = indicators.emaFast[lastIdx];
  const emaSlowVal = indicators.emaSlow[lastIdx];
  const emaFastPrev = indicators.emaFast[prevIdx];
  const emaSlowPrev = indicators.emaSlow[prevIdx];
  const supertrendPoint = indicators.supertrend[lastIdx];
  const atrVal = indicators.atr[lastIdx];

  const candleClosed = currentCandle.isClosed;

  // Check for indicator-based EXIT of an active position first
  if (currentPosition && settings.indicatorExitsEnabled) {
    if (currentPosition.side === 'LONG') {
      const bearishEma = emaFastVal < emaSlowVal && emaFastPrev >= emaSlowPrev;
      const bearishSuper = supertrendPoint.direction === 'bearish';
      if (bearishEma || (bearishSuper && emaFastVal < emaSlowVal)) {
        return {
          type: 'EXIT',
          action: 'EXIT_LONG',
          price: currentPrice,
          stopLoss: currentPosition.stopLoss,
          takeProfit: currentPosition.takeProfit,
          stopDistance: currentPosition.stopDistance,
          riskToRewardRatio: settings.riskRewardRatio,
          positionSize: currentPosition.quantity,
          positionSizeINR: currentPosition.marginINR,
          riskAmountINR: currentPosition.initialRiskINR,
          timestamp: currentCandle.time * 1000,
          checklist: {
            ...emptyChecklist,
            rsiValue: rsiVal,
            emaFastValue: emaFastVal,
            emaSlowValue: emaSlowVal,
            supertrendDirection: supertrendPoint.direction,
            supertrendValue: supertrendPoint.value,
            candleClosed,
            allPassed: true
          },
          mode: settings.strategyMode,
          reason: 'Indicator Exit: EMA Fast crossed below Slow and Supertrend turned bearish',
          exitReason: 'INDICATOR_EXIT'
        };
      }
    } else if (currentPosition.side === 'SHORT') {
      const bullishEma = emaFastVal > emaSlowVal && emaFastPrev <= emaSlowPrev;
      const bullishSuper = supertrendPoint.direction === 'bullish';
      if (bullishEma || (bullishSuper && emaFastVal > emaSlowVal)) {
        return {
          type: 'EXIT',
          action: 'EXIT_SHORT',
          price: currentPrice,
          stopLoss: currentPosition.stopLoss,
          takeProfit: currentPosition.takeProfit,
          stopDistance: currentPosition.stopDistance,
          riskToRewardRatio: settings.riskRewardRatio,
          positionSize: currentPosition.quantity,
          positionSizeINR: currentPosition.marginINR,
          riskAmountINR: currentPosition.initialRiskINR,
          timestamp: currentCandle.time * 1000,
          checklist: {
            ...emptyChecklist,
            rsiValue: rsiVal,
            emaFastValue: emaFastVal,
            emaSlowValue: emaSlowVal,
            supertrendDirection: supertrendPoint.direction,
            supertrendValue: supertrendPoint.value,
            candleClosed,
            allPassed: true
          },
          mode: settings.strategyMode,
          reason: 'Indicator Exit: EMA Fast crossed above Slow and Supertrend turned bullish',
          exitReason: 'INDICATOR_EXIT'
        };
      }
    }
  }

  // Calculate Stop Distance using 1.5 * ATR(14)
  const stopDistance = Math.max(settings.atrStopMultiplier * atrVal, currentPrice * 0.003); // min 0.3% stop
  const stopLossDistancePercent = stopDistance / currentPrice;

  // Risk Management Position Sizing
  const allowedRiskINR = accountRisk.maxRiskPerTradeINR; // default ₹50 (1% of ₹5,000)
  
  // Position Size INR = Risk Amount / SL%
  let proposedPositionINR = allowedRiskINR / stopLossDistancePercent;
  // Cap at available margin times leverage
  const maxAvailablePositionINR = accountRisk.availableINR * accountRisk.leverage;
  if (proposedPositionINR > maxAvailablePositionINR) {
    proposedPositionINR = maxAvailablePositionINR;
  }
  const actualRiskINR = proposedPositionINR * stopLossDistancePercent;
  
  // Position Size in Crypto units (e.g. BTC)
  const positionSizeCrypto = proposedPositionINR / (currentPrice * usdtInrRate);

  // Validate Risk Rules
  let riskSatisfied = true;
  let riskMessage = `Valid: Risk ₹${actualRiskINR.toFixed(2)} ≤ Limit ₹${allowedRiskINR.toFixed(2)}`;
  
  if (accountRisk.isDailyLossExceeded) {
    riskSatisfied = false;
    riskMessage = `Rejected: Daily Loss Limit (-₹${accountRisk.dailyLossLimitINR}) exceeded`;
  } else if (actualRiskINR > allowedRiskINR * 1.05) {
    riskSatisfied = false;
    riskMessage = `Rejected: Calculated risk (₹${actualRiskINR.toFixed(2)}) exceeds max allowed ₹${allowedRiskINR}`;
  } else if (accountRisk.availableINR < allowedRiskINR) {
    riskSatisfied = false;
    riskMessage = `Rejected: Insufficient account balance (₹${accountRisk.availableINR.toFixed(2)})`;
  } else if (currentPosition && !accountRisk.pyramidingEnabled) {
    riskSatisfied = false;
    riskMessage = `Existing position active (Pyramiding disabled)`;
  } else if (accountRisk.emergencyStopped) {
    riskSatisfied = false;
    riskMessage = `Trading halted by Emergency Kill Switch`;
  }

  // Evaluate Confirmation Rules based on Mode
  let buyRsiPass = false;
  let buyRsiMsg = '';
  let sellRsiPass = false;
  let sellRsiMsg = '';

  let buyEmaPass = false;
  let buyEmaMsg = '';
  let sellEmaPass = false;
  let sellEmaMsg = '';

  const supertrendBullish = supertrendPoint.direction === 'bullish';
  const supertrendBearish = supertrendPoint.direction === 'bearish';

  // 1. Crossover checks (current candle cross or cross confirmed within last 2 bars)
  const isEmaBullishCrossover = (emaFastVal > emaSlowVal && emaFastPrev <= emaSlowPrev) || 
    (emaFastVal > emaSlowVal && (indicators.emaFast[lastIdx - 2] <= indicators.emaSlow[lastIdx - 2]));
  const isEmaBearishCrossover = (emaFastVal < emaSlowVal && emaFastPrev >= emaSlowPrev) || 
    (emaFastVal < emaSlowVal && (indicators.emaFast[lastIdx - 2] >= indicators.emaSlow[lastIdx - 2]));

  if (settings.strategyMode === 'MODE_A_STRICT') {
    // MODE A — Strict Confirmation
    // BUY: RSI > 65 + bullish EMA crossover + bullish Supertrend
    buyRsiPass = rsiVal > settings.rsiBuyThreshold;
    buyRsiMsg = `RSI ${rsiVal.toFixed(1)} ${buyRsiPass ? '>' : '≤'} ${settings.rsiBuyThreshold}`;
    buyEmaPass = isEmaBullishCrossover && emaFastVal > emaSlowVal;
    buyEmaMsg = buyEmaPass ? 'EMA 9 crossed above EMA 21' : `EMA 9 (${emaFastVal.toFixed(1)}) vs EMA 21 (${emaSlowVal.toFixed(1)})`;

    // SELL: RSI < 35 + bearish EMA crossover + bearish Supertrend
    sellRsiPass = rsiVal < settings.rsiSellThreshold;
    sellRsiMsg = `RSI ${rsiVal.toFixed(1)} ${sellRsiPass ? '<' : '≥'} ${settings.rsiSellThreshold}`;
    sellEmaPass = isEmaBearishCrossover && emaFastVal < emaSlowVal;
    sellEmaMsg = sellEmaPass ? 'EMA 9 crossed below EMA 21' : `EMA 9 (${emaFastVal.toFixed(1)}) vs EMA 21 (${emaSlowVal.toFixed(1)})`;
  } else {
    // MODE B — Trend Pullback
    // Identify trend using EMA 9/21 and Supertrend, wait for pullback and RSI recovery/rejection
    const isUptrend = emaFastVal > emaSlowVal && supertrendBullish;
    const isDowntrend = emaFastVal < emaSlowVal && supertrendBearish;

    // Pullback for Buy: In uptrend, RSI pulled back (below 55) and is turning up (rsiVal > rsiPrev and rsiVal >= 48)
    buyRsiPass = isUptrend && rsiVal >= 48 && rsiVal > rsiPrev && (rsiPrev < 55 || indicators.rsi[lastIdx - 2] < 50);
    buyRsiMsg = buyRsiPass 
      ? `RSI Pullback Reclaim (${rsiPrev.toFixed(1)} -> ${rsiVal.toFixed(1)})` 
      : `RSI ${rsiVal.toFixed(1)} (Need pullback rebound in uptrend)`;
    buyEmaPass = isUptrend && currentCandle.close > emaFastVal;
    buyEmaMsg = isUptrend ? 'Price holding above EMA 9 in confirmed uptrend' : 'Trend not confirmed by EMA 9/21';

    // Pullback for Sell: In downtrend, RSI pulled back up (above 45) and rejected downwards (rsiVal < rsiPrev and rsiVal <= 52)
    sellRsiPass = isDowntrend && rsiVal <= 52 && rsiVal < rsiPrev && (rsiPrev > 45 || indicators.rsi[lastIdx - 2] > 50);
    sellRsiMsg = sellRsiPass 
      ? `RSI Pullback Rejection (${rsiPrev.toFixed(1)} -> ${rsiVal.toFixed(1)})` 
      : `RSI ${rsiVal.toFixed(1)} (Need pullback rejection in downtrend)`;
    sellEmaPass = isDowntrend && currentCandle.close < emaFastVal;
    sellEmaMsg = isDowntrend ? 'Price rejected below EMA 9 in confirmed downtrend' : 'Trend not confirmed by EMA 9/21';
  }

  // Check BUY Signal
  const buyAllPassed = buyRsiPass && buyEmaPass && supertrendBullish && candleClosed && riskSatisfied;
  if (buyAllPassed) {
    const stopLossPrice = currentPrice - stopDistance;
    const targetPrice = currentPrice + (settings.riskRewardRatio * stopDistance);

    return {
      type: 'BUY',
      action: 'LONG_BUY',
      price: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: targetPrice,
      stopDistance,
      riskToRewardRatio: settings.riskRewardRatio,
      positionSize: positionSizeCrypto,
      positionSizeINR: proposedPositionINR,
      riskAmountINR: actualRiskINR,
      timestamp: currentCandle.time * 1000,
      checklist: {
        rsiSatisfied: buyRsiPass,
        rsiValue: rsiVal,
        rsiMessage: buyRsiMsg,
        emaSatisfied: buyEmaPass,
        emaFastValue: emaFastVal,
        emaSlowValue: emaSlowVal,
        emaMessage: buyEmaMsg,
        supertrendSatisfied: supertrendBullish,
        supertrendDirection: supertrendPoint.direction,
        supertrendValue: supertrendPoint.value,
        supertrendMessage: `Supertrend is Bullish (₹${supertrendPoint.value.toFixed(2)})`,
        candleClosed,
        candleClosedMessage: 'Candle is fully closed and confirmed',
        riskSatisfied,
        riskAmountINR: actualRiskINR,
        riskLimitINR: allowedRiskINR,
        riskMessage,
        allPassed: true
      },
      mode: settings.strategyMode,
      reason: `BUY Signal confirmed by ${settings.strategyMode === 'MODE_A_STRICT' ? 'Strict Confirmation' : 'Trend Pullback'}`
    };
  }

  // Check SELL Signal
  const sellAllPassed = sellRsiPass && sellEmaPass && supertrendBearish && candleClosed && riskSatisfied;
  if (sellAllPassed) {
    const stopLossPrice = currentPrice + stopDistance;
    const targetPrice = currentPrice - (settings.riskRewardRatio * stopDistance);

    return {
      type: 'SELL',
      action: 'SHORT_SELL',
      price: currentPrice,
      stopLoss: stopLossPrice,
      takeProfit: targetPrice,
      stopDistance,
      riskToRewardRatio: settings.riskRewardRatio,
      positionSize: positionSizeCrypto,
      positionSizeINR: proposedPositionINR,
      riskAmountINR: actualRiskINR,
      timestamp: currentCandle.time * 1000,
      checklist: {
        rsiSatisfied: sellRsiPass,
        rsiValue: rsiVal,
        rsiMessage: sellRsiMsg,
        emaSatisfied: sellEmaPass,
        emaFastValue: emaFastVal,
        emaSlowValue: emaSlowVal,
        emaMessage: sellEmaMsg,
        supertrendSatisfied: supertrendBearish,
        supertrendDirection: supertrendPoint.direction,
        supertrendValue: supertrendPoint.value,
        supertrendMessage: `Supertrend is Bearish (₹${supertrendPoint.value.toFixed(2)})`,
        candleClosed,
        candleClosedMessage: 'Candle is fully closed and confirmed',
        riskSatisfied,
        riskAmountINR: actualRiskINR,
        riskLimitINR: allowedRiskINR,
        riskMessage,
        allPassed: true
      },
      mode: settings.strategyMode,
      reason: `SELL Signal confirmed by ${settings.strategyMode === 'MODE_A_STRICT' ? 'Strict Confirmation' : 'Trend Pullback'}`
    };
  }

  // Default: WAIT (Show current status and which conditions are satisfied or missing)
  const isPotentialBuy = (rsiVal > 50 || supertrendBullish);
  const relevantRsiPass = isPotentialBuy ? buyRsiPass : sellRsiPass;
  const relevantRsiMsg = isPotentialBuy ? buyRsiMsg : sellRsiMsg;
  const relevantEmaPass = isPotentialBuy ? buyEmaPass : sellEmaPass;
  const relevantEmaMsg = isPotentialBuy ? buyEmaMsg : sellEmaMsg;
  const relevantSuperPass = isPotentialBuy ? supertrendBullish : supertrendBearish;
  
  return {
    type: 'WAIT',
    action: 'HOLD',
    price: currentPrice,
    stopLoss: isPotentialBuy ? currentPrice - stopDistance : currentPrice + stopDistance,
    takeProfit: isPotentialBuy 
      ? currentPrice + (settings.riskRewardRatio * stopDistance) 
      : currentPrice - (settings.riskRewardRatio * stopDistance),
    stopDistance,
    riskToRewardRatio: settings.riskRewardRatio,
    positionSize: positionSizeCrypto,
    positionSizeINR: proposedPositionINR,
    riskAmountINR: actualRiskINR,
    timestamp: currentCandle.time * 1000,
    checklist: {
      rsiSatisfied: relevantRsiPass,
      rsiValue: rsiVal,
      rsiMessage: relevantRsiMsg,
      emaSatisfied: relevantEmaPass,
      emaFastValue: emaFastVal,
      emaSlowValue: emaSlowVal,
      emaMessage: relevantEmaMsg,
      supertrendSatisfied: relevantSuperPass,
      supertrendDirection: supertrendPoint.direction,
      supertrendValue: supertrendPoint.value,
      supertrendMessage: `Supertrend: ${supertrendPoint.direction.toUpperCase()} (₹${supertrendPoint.value.toFixed(2)})`,
      candleClosed,
      candleClosedMessage: candleClosed ? 'Closed candle verified' : 'Candle in progress (signals require close)',
      riskSatisfied,
      riskAmountINR: actualRiskINR,
      riskLimitINR: allowedRiskINR,
      riskMessage,
      allPassed: false
    },
    mode: settings.strategyMode,
    reason: 'Waiting for all 5 technical and risk conditions to align'
  };
}
