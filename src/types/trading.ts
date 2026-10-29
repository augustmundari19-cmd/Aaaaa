/**
 * Types and interfaces for My Crypto Trader
 */

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export type StrategyMode = 'MODE_A_STRICT' | 'MODE_B_PULLBACK';

export interface IndicatorSettings {
  rsiPeriod: number; // default: 14
  rsiBuyThreshold: number; // default: 65
  rsiSellThreshold: number; // default: 35
  emaFast: number; // default: 9
  emaSlow: number; // default: 21
  supertrendAtrPeriod: number; // default: 10
  supertrendMultiplier: number; // default: 3.0
  atrPeriod: number; // default: 14 for Stop Loss
  atrStopMultiplier: number; // default: 1.5
  riskRewardRatio: number; // default: 2.0 (1:2)
  timeframe: string; // default: '15m'
  strategyMode: StrategyMode;
  indicatorExitsEnabled: boolean; // default: true
}

export interface SupertrendPoint {
  time: number;
  value: number;
  direction: 'bullish' | 'bearish';
  upperBand: number;
  lowerBand: number;
}

export interface CalculatedIndicators {
  rsi: number[];
  emaFast: number[];
  emaSlow: number[];
  supertrend: SupertrendPoint[];
  atr: number[];
}

export interface SignalChecklist {
  rsiSatisfied: boolean;
  rsiValue: number;
  rsiMessage: string;
  
  emaSatisfied: boolean;
  emaFastValue: number;
  emaSlowValue: number;
  emaMessage: string;
  
  supertrendSatisfied: boolean;
  supertrendDirection: 'bullish' | 'bearish';
  supertrendValue: number;
  supertrendMessage: string;
  
  candleClosed: boolean;
  candleClosedMessage: string;
  
  riskSatisfied: boolean;
  riskAmountINR: number;
  riskLimitINR: number;
  riskMessage: string;
  
  allPassed: boolean;
}

export type SignalType = 'BUY' | 'SELL' | 'WAIT' | 'EXIT';
export type TradeAction = 'LONG_BUY' | 'SHORT_SELL' | 'EXIT_LONG' | 'EXIT_SHORT' | 'HOLD';

export interface TradingSignal {
  type: SignalType;
  action: TradeAction;
  price: number;
  stopLoss: number;
  takeProfit: number;
  stopDistance: number;
  riskToRewardRatio: number;
  positionSize: number; // in crypto units (e.g. BTC)
  positionSizeINR: number; // in INR
  riskAmountINR: number; // in INR
  timestamp: number;
  checklist: SignalChecklist;
  mode: StrategyMode;
  reason: string;
  exitReason?: string;
}

export type PositionSide = 'LONG' | 'SHORT';

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  stopDistance: number;
  unrealizedPnL: number; // in INR
  unrealizedPnLPercent: number;
  marginINR: number;
  leverage: number;
  openTime: number;
  initialRiskINR: number;
  status: 'OPEN' | 'CLOSED';
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  realizedPnL: number; // in INR
  realizedPnLPercent: number;
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'INDICATOR_EXIT' | 'MANUAL' | 'EMERGENCY_STOP';
  fees: number; // in INR
  entryTime: number;
  exitTime: number;
}

export interface AccountRiskConfig {
  equityINR: number; // default: ₹5,000
  availableINR: number;
  riskPerTradePercent: number; // default: 1%
  maxRiskPerTradeINR: number; // default: ₹50
  dailyLossLimitINR: number; // default: ₹250 (5%)
  dailyRealizedLossINR: number;
  isDailyLossExceeded: boolean;
  tradingMode: 'PAPER' | 'LIVE_COINDCX';
  automatedTradingEnabled: boolean;
  pyramidingEnabled: boolean; // default: false
  emergencyStopped: boolean;
  leverage: number; // default: 1x (Spot) or up to 10x
}

export interface CoinDCXTicker {
  market: string;
  last_price: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
  volume: string;
  change_24_hour: string;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  netPnLINR: number;
  netPnLPercent: number;
  profitFactor: number;
  maxDrawdownINR: number;
  maxDrawdownPercent: number;
  totalFeesINR: number;
  averageTradeINR: number;
  trades: TradeHistoryItem[];
  equityCurve: { time: number; equityINR: number }[];
}
