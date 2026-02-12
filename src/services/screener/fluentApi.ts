// ============================================
// Fluent API for Screener - tvscreener-style
// Field class with comparison operators
// ============================================

import { FilterCondition } from './service';

export class Field {
  constructor(
    public name: string,
    public label: string,
    public format: string
  ) {}

  gt(value: number): FilterCondition {
    return { field: this.name, operator: '>', value };
  }

  lt(value: number): FilterCondition {
    return { field: this.name, operator: '<', value };
  }

  gte(value: number): FilterCondition {
    return { field: this.name, operator: '>=', value };
  }

  lte(value: number): FilterCondition {
    return { field: this.name, operator: '<=', value };
  }

  eq(value: any): FilterCondition {
    return { field: this.name, operator: '=', value };
  }

  neq(value: any): FilterCondition {
    return { field: this.name, operator: '!=', value };
  }

  between(min: number, max: number): FilterCondition {
    return { field: this.name, operator: 'between', value: [min, max] };
  }

  notBetween(min: number, max: number): FilterCondition {
    return { field: this.name, operator: 'not_between', value: [min, max] };
  }

  isin(values: any[]): FilterCondition {
    return { field: this.name, operator: 'isin', value: values };
  }

  /** Create a time-interval variant of this field (e.g., RSI → RSI|5) */
  withInterval(interval: string): Field {
    return new Field(`${this.name}|${interval}`, `${this.label} (${interval})`, this.format);
  }
}

// ---- STOCK FIELDS ----
export const StockField = {
  // Price
  PRICE: new Field('close', 'Price', 'currency'),
  OPEN: new Field('open', 'Open', 'currency'),
  HIGH: new Field('high', 'High', 'currency'),
  LOW: new Field('low', 'Low', 'currency'),
  CHANGE: new Field('change', 'Change %', 'percent'),
  CHANGE_ABS: new Field('change_abs', 'Change (Abs)', 'currency'),
  GAP: new Field('gap', 'Gap %', 'percent'),
  WEEK_52_HIGH: new Field('52_week_high', '52W High', 'currency'),
  WEEK_52_LOW: new Field('52_week_low', '52W Low', 'currency'),

  // Volume
  VOLUME: new Field('volume', 'Volume', 'number'),
  AVG_VOL_10D: new Field('average_volume_10d_calc', 'Avg Vol (10D)', 'number'),
  AVG_VOL_30D: new Field('average_volume_30d_calc', 'Avg Vol (30D)', 'number'),
  REL_VOLUME: new Field('relative_volume_10d_calc', 'Relative Volume', 'number'),

  // Valuation
  MARKET_CAP: new Field('market_cap_basic', 'Market Cap', 'number'),
  PE_RATIO: new Field('price_earnings_ttm', 'P/E Ratio', 'number'),
  PB_RATIO: new Field('price_book_fq', 'P/B Ratio', 'number'),
  PS_RATIO: new Field('price_sales_current', 'P/S Ratio', 'number'),
  EV_EBITDA: new Field('enterprise_value_ebitda_ttm', 'EV/EBITDA', 'number'),
  PEG: new Field('price_earnings_to_growth_ttm', 'PEG Ratio', 'number'),

  // Fundamental
  ROE: new Field('return_on_equity', 'ROE %', 'percent'),
  ROA: new Field('return_on_assets', 'ROA %', 'percent'),
  GROSS_MARGIN: new Field('gross_margin', 'Gross Margin %', 'percent'),
  NET_MARGIN: new Field('net_margin', 'Net Margin %', 'percent'),
  OPERATING_MARGIN: new Field('operating_margin', 'Operating Margin %', 'percent'),
  DEBT_EQUITY: new Field('debt_to_equity', 'Debt/Equity', 'number'),
  CURRENT_RATIO: new Field('current_ratio', 'Current Ratio', 'number'),

  // Dividend
  DIV_YIELD: new Field('dividend_yield_recent', 'Div Yield %', 'percent'),
  PAYOUT_RATIO: new Field('dividend_payout_ratio_ttm', 'Payout Ratio %', 'percent'),

  // Earnings
  EPS: new Field('earnings_per_share_basic_ttm', 'EPS (TTM)', 'currency'),
  EPS_FWD: new Field('earnings_per_share_fwd', 'EPS (FWD)', 'currency'),
  REV_GROWTH_Q: new Field('revenue_growth_quarterly', 'Revenue Growth (Q)', 'percent'),

  // Oscillators
  RSI: new Field('RSI', 'RSI (14)', 'number'),
  RSI7: new Field('RSI7', 'RSI (7)', 'number'),
  MACD: new Field('MACD.macd', 'MACD Line', 'number'),
  MACD_SIGNAL: new Field('MACD.signal', 'MACD Signal', 'number'),
  STOCH_K: new Field('Stoch.K', 'Stochastic %K', 'number'),
  STOCH_D: new Field('Stoch.D', 'Stochastic %D', 'number'),
  CCI: new Field('CCI20', 'CCI (20)', 'number'),
  ADX: new Field('ADX', 'ADX (14)', 'number'),
  ATR: new Field('ATR', 'ATR (14)', 'number'),
  MOM: new Field('Mom', 'Momentum', 'number'),
  WILLIAMS_R: new Field('W.R', 'Williams %R', 'number'),

  // Moving Averages
  SMA20: new Field('SMA20', 'SMA 20', 'number'),
  SMA50: new Field('SMA50', 'SMA 50', 'number'),
  SMA200: new Field('SMA200', 'SMA 200', 'number'),
  EMA20: new Field('EMA20', 'EMA 20', 'number'),
  EMA50: new Field('EMA50', 'EMA 50', 'number'),
  EMA200: new Field('EMA200', 'EMA 200', 'number'),

  // Recommendations
  RATING: new Field('Recommend.All', 'Overall Rating', 'rating'),
  RATING_MA: new Field('Recommend.MA', 'MA Rating', 'rating'),
  RATING_OSC: new Field('Recommend.Other', 'Oscillator Rating', 'rating'),

  // Performance
  PERF_W: new Field('Perf.W', '1 Week %', 'percent'),
  PERF_1M: new Field('Perf.1M', '1 Month %', 'percent'),
  PERF_3M: new Field('Perf.3M', '3 Months %', 'percent'),
  PERF_6M: new Field('Perf.6M', '6 Months %', 'percent'),
  PERF_YTD: new Field('Perf.YTD', 'YTD %', 'percent'),
  PERF_Y: new Field('Perf.Y', '1 Year %', 'percent'),

  // Volatility
  VOLATILITY_D: new Field('Volatility.D', 'Volatility (Day)', 'percent'),
  VOLATILITY_W: new Field('Volatility.W', 'Volatility (Week)', 'percent'),

  // Financial Statements
  REVENUE: new Field('total_revenue', 'Revenue', 'number'),
  NET_INCOME: new Field('net_income', 'Net Income', 'number'),
  EBITDA: new Field('ebitda', 'EBITDA', 'number'),
  FREE_CASH_FLOW: new Field('free_cash_flow', 'Free Cash Flow', 'number'),
  TOTAL_ASSETS: new Field('total_assets', 'Total Assets', 'number'),
  TOTAL_EQUITY: new Field('total_equity', 'Total Equity', 'number'),
};

// ---- CRYPTO FIELDS ----
export const CryptoField = {
  PRICE: new Field('close', 'Price', 'currency'),
  CHANGE: new Field('change', 'Change %', 'percent'),
  VOLUME_24H: new Field('24h_vol|5', 'Volume 24h', 'number'),
  VOL_CHANGE_24H: new Field('24h_vol_change|5', 'Vol Change 24h', 'percent'),
  MARKET_CAP: new Field('market_cap_calc', 'Market Cap', 'number'),
  RSI: new Field('RSI', 'RSI (14)', 'number'),
  MACD: new Field('MACD.macd', 'MACD Line', 'number'),
  STOCH_K: new Field('Stoch.K', 'Stochastic %K', 'number'),
  RATING: new Field('Recommend.All', 'Overall Rating', 'rating'),
  PERF_W: new Field('Perf.W', '1 Week %', 'percent'),
  PERF_1M: new Field('Perf.1M', '1 Month %', 'percent'),
  VOLATILITY_D: new Field('Volatility.D', 'Volatility (Day)', 'percent'),
};

// ---- FOREX FIELDS ----
export const ForexField = {
  PRICE: new Field('close', 'Price', 'currency'),
  CHANGE: new Field('change', 'Change %', 'percent'),
  BID: new Field('bid', 'Bid', 'currency'),
  ASK: new Field('ask', 'Ask', 'currency'),
  SPREAD: new Field('spread_raw', 'Spread', 'number'),
  RSI: new Field('RSI', 'RSI (14)', 'number'),
  MACD: new Field('MACD.macd', 'MACD Line', 'number'),
  STOCH_K: new Field('Stoch.K', 'Stochastic %K', 'number'),
  ADX: new Field('ADX', 'ADX (14)', 'number'),
  ATR: new Field('ATR', 'ATR (14)', 'number'),
  SMA50: new Field('SMA50', 'SMA 50', 'number'),
  SMA200: new Field('SMA200', 'SMA 200', 'number'),
  RATING: new Field('Recommend.All', 'Overall Rating', 'rating'),
  PERF_W: new Field('Perf.W', '1 Week %', 'percent'),
  PERF_1M: new Field('Perf.1M', '1 Month %', 'percent'),
};

// ---- FUTURES FIELDS ----
export const FuturesField = {
  PRICE: new Field('close', 'Price', 'currency'),
  CHANGE: new Field('change', 'Change %', 'percent'),
  VOLUME: new Field('volume', 'Volume', 'number'),
  OPEN_INTEREST: new Field('open_interest', 'Open Interest', 'number'),
  RSI: new Field('RSI', 'RSI (14)', 'number'),
  MACD: new Field('MACD.macd', 'MACD Line', 'number'),
  RATING: new Field('Recommend.All', 'Overall Rating', 'rating'),
};

// ---- BOND FIELDS ----
export const BondField = {
  PRICE: new Field('close', 'Price', 'currency'),
  CHANGE: new Field('change', 'Change %', 'percent'),
  YIELD: new Field('yield_recent', 'Yield', 'percent'),
  COUPON: new Field('coupon', 'Coupon', 'percent'),
  RSI: new Field('RSI', 'RSI (14)', 'number'),
  RATING: new Field('Recommend.All', 'Overall Rating', 'rating'),
};
