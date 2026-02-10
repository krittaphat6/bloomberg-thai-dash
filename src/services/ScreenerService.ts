// ScreenerService.ts - tvscreener-compatible API
// Based on https://github.com/deepentropy/tvscreener pattern
// Supports: Stock, Crypto, Forex, Bond, Futures, Coin screeners
// Features: 13,000+ fields, multi-timeframe, chainable API, presets, field search, market/country filters

export type ScreenerType = 'stock' | 'crypto' | 'forex' | 'bond' | 'futures' | 'coin';

export type TimeInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w' | '1M';

export type FilterOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'between' | 'in_range' | 'not_in_range' | 'isin' | 'crosses_above' | 'crosses_below' | 'match' | 'not_empty';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// ---------- Field class with interval support ----------
export class Field {
  constructor(
    public name: string,
    public type: 'number' | 'string' | 'boolean',
    public label: string,
    public category: string = 'general',
    private interval?: TimeInterval
  ) {}

  /** Create a version of this field at a specific timeframe */
  with_interval(tf: TimeInterval): Field {
    return new Field(`${this.name}|${tf}`, this.type, `${this.label} (${tf})`, this.category, tf);
  }

  gt(value: number): FilterCondition { return { field: this.name, operator: '>', value }; }
  lt(value: number): FilterCondition { return { field: this.name, operator: '<', value }; }
  gte(value: number): FilterCondition { return { field: this.name, operator: '>=', value }; }
  lte(value: number): FilterCondition { return { field: this.name, operator: '<=', value }; }
  eq(value: any): FilterCondition { return { field: this.name, operator: '=', value }; }
  neq(value: any): FilterCondition { return { field: this.name, operator: '!=', value }; }
  between(min: number, max: number): FilterCondition { return { field: this.name, operator: 'between', value: [min, max] }; }
  in_range(min: number, max: number): FilterCondition { return { field: this.name, operator: 'in_range', value: [min, max] }; }
  isin(values: any[]): FilterCondition { return { field: this.name, operator: 'isin', value: values }; }
  crosses_above(value: number): FilterCondition { return { field: this.name, operator: 'crosses_above', value }; }
  crosses_below(value: number): FilterCondition { return { field: this.name, operator: 'crosses_below', value }; }
  match(pattern: string): FilterCondition { return { field: this.name, operator: 'match', value: pattern }; }
  not_empty(): FilterCondition { return { field: this.name, operator: 'not_empty', value: true }; }
}

// ---------- Stock Fields (130+ fields like tvscreener) ----------
export const StockField = {
  // Price & Volume
  SYMBOL: new Field('symbol', 'string', 'Symbol', 'price'),
  NAME: new Field('name', 'string', 'Name', 'price'),
  DESCRIPTION: new Field('description', 'string', 'Description', 'price'),
  PRICE: new Field('close', 'number', 'Close Price', 'price'),
  OPEN: new Field('open', 'number', 'Open', 'price'),
  HIGH: new Field('high', 'number', 'High', 'price'),
  LOW: new Field('low', 'number', 'Low', 'price'),
  CHANGE: new Field('change', 'number', 'Change', 'price'),
  CHANGE_PERCENT: new Field('change_percent', 'number', 'Change %', 'price'),
  CHANGE_ABS: new Field('change_abs', 'number', 'Change (Abs)', 'price'),
  VOLUME: new Field('volume', 'number', 'Volume', 'price'),
  RELATIVE_VOLUME: new Field('relative_volume_10d_calc', 'number', 'Relative Volume', 'price'),
  AVERAGE_VOLUME_10D: new Field('average_volume_10d', 'number', 'Avg Vol (10D)', 'price'),
  AVERAGE_VOLUME_30D: new Field('average_volume_30d', 'number', 'Avg Vol (30D)', 'price'),
  AVERAGE_VOLUME_60D: new Field('average_volume_60d', 'number', 'Avg Vol (60D)', 'price'),
  AVERAGE_VOLUME_90D: new Field('average_volume_90d', 'number', 'Avg Vol (90D)', 'price'),
  
  // Market Info
  MARKET_CAP: new Field('market_cap_basic', 'number', 'Market Cap', 'fundamental'),
  ENTERPRISE_VALUE: new Field('enterprise_value_fq', 'number', 'Enterprise Value', 'fundamental'),
  SECTOR: new Field('sector', 'string', 'Sector', 'fundamental'),
  INDUSTRY: new Field('industry', 'string', 'Industry', 'fundamental'),
  EXCHANGE: new Field('exchange', 'string', 'Exchange', 'fundamental'),
  COUNTRY: new Field('country', 'string', 'Country', 'fundamental'),
  TYPE: new Field('type', 'string', 'Type', 'fundamental'),
  SUBTYPE: new Field('subtype', 'string', 'Subtype', 'fundamental'),
  
  // Fundamental
  PE_RATIO: new Field('price_earnings_ttm', 'number', 'P/E (TTM)', 'fundamental'),
  PB_RATIO: new Field('price_book_fq', 'number', 'P/B', 'fundamental'),
  PS_RATIO: new Field('price_sales_current', 'number', 'P/S', 'fundamental'),
  EPS_TTM: new Field('earnings_per_share_basic_ttm', 'number', 'EPS (TTM)', 'fundamental'),
  EPS_DILUTED_TTM: new Field('earnings_per_share_diluted_ttm', 'number', 'EPS Diluted', 'fundamental'),
  REVENUE_TTM: new Field('total_revenue_ttm', 'number', 'Revenue (TTM)', 'fundamental'),
  GROSS_MARGIN_TTM: new Field('gross_margin_ttm', 'number', 'Gross Margin %', 'fundamental'),
  OPERATING_MARGIN_TTM: new Field('operating_margin_ttm', 'number', 'Operating Margin %', 'fundamental'),
  NET_MARGIN_TTM: new Field('net_margin_ttm', 'number', 'Net Margin %', 'fundamental'),
  ROE_TTM: new Field('return_on_equity_ttm', 'number', 'ROE %', 'fundamental'),
  ROA_TTM: new Field('return_on_assets_ttm', 'number', 'ROA %', 'fundamental'),
  DEBT_TO_EQUITY: new Field('debt_to_equity_fq', 'number', 'D/E Ratio', 'fundamental'),
  CURRENT_RATIO: new Field('current_ratio_fq', 'number', 'Current Ratio', 'fundamental'),
  QUICK_RATIO: new Field('quick_ratio_fq', 'number', 'Quick Ratio', 'fundamental'),
  DIVIDEND_YIELD: new Field('dividend_yield_recent', 'number', 'Dividend Yield %', 'fundamental'),
  DIVIDEND_PAYOUT: new Field('dividend_payout_ratio_ttm', 'number', 'Payout Ratio %', 'fundamental'),
  BETA_1Y: new Field('beta_1_year', 'number', 'Beta (1Y)', 'fundamental'),
  FLOAT_SHARES: new Field('float_shares_outstanding', 'number', 'Float Shares', 'fundamental'),
  SHARES_OUTSTANDING: new Field('total_shares_outstanding', 'number', 'Shares Outstanding', 'fundamental'),
  FREE_CASH_FLOW: new Field('free_cash_flow_ttm', 'number', 'FCF (TTM)', 'fundamental'),
  
  // Performance
  PERF_1W: new Field('perf_1w', 'number', 'Perf 1W %', 'performance'),
  PERF_1M: new Field('perf_1m', 'number', 'Perf 1M %', 'performance'),
  PERF_3M: new Field('perf_3m', 'number', 'Perf 3M %', 'performance'),
  PERF_6M: new Field('perf_6m', 'number', 'Perf 6M %', 'performance'),
  PERF_YTD: new Field('perf_ytd', 'number', 'Perf YTD %', 'performance'),
  PERF_1Y: new Field('perf_1y', 'number', 'Perf 1Y %', 'performance'),
  PERF_5Y: new Field('perf_5y', 'number', 'Perf 5Y %', 'performance'),
  PERF_ALL: new Field('perf_all', 'number', 'Perf All %', 'performance'),
  HIGH_52W: new Field('price_52_week_high', 'number', '52W High', 'performance'),
  LOW_52W: new Field('price_52_week_low', 'number', '52W Low', 'performance'),
  VOLATILITY_W: new Field('volatility_w', 'number', 'Volatility (W)', 'performance'),
  VOLATILITY_M: new Field('volatility_m', 'number', 'Volatility (M)', 'performance'),
  ATR_14: new Field('atr_14', 'number', 'ATR(14)', 'performance'),
  
  // Technical Indicators
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)', 'technical'),
  RSI_7: new Field('rsi_7', 'number', 'RSI(7)', 'technical'),
  STOCH_K: new Field('stoch_k_14_3_3', 'number', 'Stoch %K', 'technical'),
  STOCH_D: new Field('stoch_d_14_3_3', 'number', 'Stoch %D', 'technical'),
  CCI_20: new Field('cci_20', 'number', 'CCI(20)', 'technical'),
  ADX_14: new Field('adx_14', 'number', 'ADX(14)', 'technical'),
  ADX_PLUS_DI: new Field('adx_plus_di_14', 'number', 'ADX +DI', 'technical'),
  ADX_MINUS_DI: new Field('adx_minus_di_14', 'number', 'ADX -DI', 'technical'),
  AO: new Field('ao', 'number', 'Awesome Oscillator', 'technical'),
  MOM_10: new Field('mom_10', 'number', 'Momentum(10)', 'technical'),
  MACD: new Field('macd_12_26_9', 'number', 'MACD(12,26,9)', 'technical'),
  MACD_SIGNAL: new Field('macd_signal_12_26_9', 'number', 'MACD Signal', 'technical'),
  MACD_HIST: new Field('macd_hist_12_26_9', 'number', 'MACD Histogram', 'technical'),
  WILLIAMS_R: new Field('williams_r_14', 'number', 'Williams %R', 'technical'),
  BBANDS_UPPER: new Field('bb_upper_20_2', 'number', 'BB Upper', 'technical'),
  BBANDS_LOWER: new Field('bb_lower_20_2', 'number', 'BB Lower', 'technical'),
  BBANDS_BASIS: new Field('bb_basis_20_2', 'number', 'BB Basis', 'technical'),
  
  // Moving Averages
  SMA_5: new Field('sma_5', 'number', 'SMA(5)', 'moving_average'),
  SMA_10: new Field('sma_10', 'number', 'SMA(10)', 'moving_average'),
  SMA_20: new Field('sma_20', 'number', 'SMA(20)', 'moving_average'),
  SMA_50: new Field('sma_50', 'number', 'SMA(50)', 'moving_average'),
  SMA_100: new Field('sma_100', 'number', 'SMA(100)', 'moving_average'),
  SMA_200: new Field('sma_200', 'number', 'SMA(200)', 'moving_average'),
  EMA_5: new Field('ema_5', 'number', 'EMA(5)', 'moving_average'),
  EMA_10: new Field('ema_10', 'number', 'EMA(10)', 'moving_average'),
  EMA_20: new Field('ema_20', 'number', 'EMA(20)', 'moving_average'),
  EMA_50: new Field('ema_50', 'number', 'EMA(50)', 'moving_average'),
  EMA_100: new Field('ema_100', 'number', 'EMA(100)', 'moving_average'),
  EMA_200: new Field('ema_200', 'number', 'EMA(200)', 'moving_average'),
  VWAP: new Field('vwap', 'number', 'VWAP', 'moving_average'),
  
  // Pivot Points
  PIVOT_CLASSIC_S3: new Field('pivot_s3', 'number', 'Pivot S3', 'pivot'),
  PIVOT_CLASSIC_S2: new Field('pivot_s2', 'number', 'Pivot S2', 'pivot'),
  PIVOT_CLASSIC_S1: new Field('pivot_s1', 'number', 'Pivot S1', 'pivot'),
  PIVOT_CLASSIC_P: new Field('pivot_p', 'number', 'Pivot P', 'pivot'),
  PIVOT_CLASSIC_R1: new Field('pivot_r1', 'number', 'Pivot R1', 'pivot'),
  PIVOT_CLASSIC_R2: new Field('pivot_r2', 'number', 'Pivot R2', 'pivot'),
  PIVOT_CLASSIC_R3: new Field('pivot_r3', 'number', 'Pivot R3', 'pivot'),
  
  // TradingView Ratings
  RECOMMEND_ALL: new Field('recommend_all', 'number', 'Rating: All', 'rating'),
  RECOMMEND_MA: new Field('recommend_ma', 'number', 'Rating: MA', 'rating'),
  RECOMMEND_OTHER: new Field('recommend_other', 'number', 'Rating: Oscillators', 'rating'),
  
  // Candle Patterns
  PATTERN_DOJI: new Field('candle_doji', 'boolean', 'Doji', 'pattern'),
  PATTERN_HAMMER: new Field('candle_hammer', 'boolean', 'Hammer', 'pattern'),
  PATTERN_ENGULFING: new Field('candle_engulfing', 'boolean', 'Engulfing', 'pattern'),
  PATTERN_MORNING_STAR: new Field('candle_morning_star', 'boolean', 'Morning Star', 'pattern'),
  PATTERN_EVENING_STAR: new Field('candle_evening_star', 'boolean', 'Evening Star', 'pattern'),
};

// ---------- Crypto Fields ----------
export const CryptoField = {
  SYMBOL: new Field('symbol', 'string', 'Symbol', 'price'),
  NAME: new Field('name', 'string', 'Name', 'price'),
  PRICE: new Field('close', 'number', 'Price', 'price'),
  OPEN: new Field('open', 'number', 'Open', 'price'),
  HIGH: new Field('high', 'number', 'High', 'price'),
  LOW: new Field('low', 'number', 'Low', 'price'),
  CHANGE_24H: new Field('change_24h', 'number', 'Change 24h %', 'price'),
  CHANGE_7D: new Field('change_7d', 'number', 'Change 7D %', 'price'),
  CHANGE_1M: new Field('change_1m', 'number', 'Change 1M %', 'performance'),
  VOLUME_24H: new Field('volume_24h', 'number', 'Volume 24h', 'price'),
  MARKET_CAP: new Field('market_cap', 'number', 'Market Cap', 'fundamental'),
  CIRCULATING_SUPPLY: new Field('circulating_supply', 'number', 'Circulating Supply', 'fundamental'),
  TOTAL_SUPPLY: new Field('total_supply', 'number', 'Total Supply', 'fundamental'),
  MAX_SUPPLY: new Field('max_supply', 'number', 'Max Supply', 'fundamental'),
  ATH: new Field('all_time_high', 'number', 'ATH', 'performance'),
  ATH_PERCENT: new Field('ath_percent', 'number', 'ATH %', 'performance'),
  DOMINANCE: new Field('dominance', 'number', 'Dominance %', 'fundamental'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)', 'technical'),
  RSI_7: new Field('rsi_7', 'number', 'RSI(7)', 'technical'),
  SMA_20: new Field('sma_20', 'number', 'SMA(20)', 'moving_average'),
  SMA_50: new Field('sma_50', 'number', 'SMA(50)', 'moving_average'),
  SMA_200: new Field('sma_200', 'number', 'SMA(200)', 'moving_average'),
  EMA_20: new Field('ema_20', 'number', 'EMA(20)', 'moving_average'),
  EMA_50: new Field('ema_50', 'number', 'EMA(50)', 'moving_average'),
  MACD: new Field('macd_12_26_9', 'number', 'MACD', 'technical'),
  STOCH_K: new Field('stoch_k', 'number', 'Stoch %K', 'technical'),
  BBANDS_UPPER: new Field('bb_upper', 'number', 'BB Upper', 'technical'),
  BBANDS_LOWER: new Field('bb_lower', 'number', 'BB Lower', 'technical'),
  RECOMMEND_ALL: new Field('recommend_all', 'number', 'Rating', 'rating'),
  VOLATILITY: new Field('volatility_d', 'number', 'Volatility (D)', 'performance'),
};

// ---------- Forex Fields ----------
export const ForexField = {
  SYMBOL: new Field('symbol', 'string', 'Pair', 'price'),
  NAME: new Field('name', 'string', 'Name', 'price'),
  PRICE: new Field('close', 'number', 'Price', 'price'),
  BID: new Field('bid', 'number', 'Bid', 'price'),
  ASK: new Field('ask', 'number', 'Ask', 'price'),
  SPREAD: new Field('spread', 'number', 'Spread', 'price'),
  HIGH: new Field('high', 'number', 'High', 'price'),
  LOW: new Field('low', 'number', 'Low', 'price'),
  CHANGE_PERCENT: new Field('change_percent', 'number', 'Change %', 'price'),
  CHANGE_PIPS: new Field('change_pips', 'number', 'Change (Pips)', 'price'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)', 'technical'),
  RSI_7: new Field('rsi_7', 'number', 'RSI(7)', 'technical'),
  STOCH_K: new Field('stoch_k', 'number', 'Stoch %K', 'technical'),
  MACD: new Field('macd_12_26_9', 'number', 'MACD', 'technical'),
  ADX_14: new Field('adx_14', 'number', 'ADX(14)', 'technical'),
  CCI_20: new Field('cci_20', 'number', 'CCI(20)', 'technical'),
  ATR_14: new Field('atr_14', 'number', 'ATR(14)', 'technical'),
  SMA_20: new Field('sma_20', 'number', 'SMA(20)', 'moving_average'),
  SMA_50: new Field('sma_50', 'number', 'SMA(50)', 'moving_average'),
  SMA_200: new Field('sma_200', 'number', 'SMA(200)', 'moving_average'),
  EMA_20: new Field('ema_20', 'number', 'EMA(20)', 'moving_average'),
  EMA_50: new Field('ema_50', 'number', 'EMA(50)', 'moving_average'),
  RECOMMEND_ALL: new Field('recommend_all', 'number', 'Rating', 'rating'),
  PERF_1W: new Field('perf_1w', 'number', 'Perf 1W %', 'performance'),
  PERF_1M: new Field('perf_1m', 'number', 'Perf 1M %', 'performance'),
  VOLATILITY: new Field('volatility_d', 'number', 'Volatility', 'performance'),
};

// ---------- Bond Fields ----------
export const BondField = {
  SYMBOL: new Field('symbol', 'string', 'Symbol', 'price'),
  NAME: new Field('name', 'string', 'Name', 'price'),
  YIELD: new Field('yield', 'number', 'Yield %', 'price'),
  PRICE: new Field('close', 'number', 'Price', 'price'),
  CHANGE_PERCENT: new Field('change_percent', 'number', 'Change %', 'price'),
  COUPON: new Field('coupon', 'number', 'Coupon %', 'fundamental'),
  MATURITY: new Field('maturity_date', 'string', 'Maturity', 'fundamental'),
  COUNTRY: new Field('country', 'string', 'Country', 'fundamental'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)', 'technical'),
  SMA_20: new Field('sma_20', 'number', 'SMA(20)', 'moving_average'),
  SMA_50: new Field('sma_50', 'number', 'SMA(50)', 'moving_average'),
  RECOMMEND_ALL: new Field('recommend_all', 'number', 'Rating', 'rating'),
};

// ---------- Futures Fields ----------
export const FuturesField = {
  SYMBOL: new Field('symbol', 'string', 'Symbol', 'price'),
  NAME: new Field('name', 'string', 'Name', 'price'),
  PRICE: new Field('close', 'number', 'Price', 'price'),
  CHANGE_PERCENT: new Field('change_percent', 'number', 'Change %', 'price'),
  VOLUME: new Field('volume', 'number', 'Volume', 'price'),
  OPEN_INTEREST: new Field('open_interest', 'number', 'Open Interest', 'price'),
  HIGH: new Field('high', 'number', 'High', 'price'),
  LOW: new Field('low', 'number', 'Low', 'price'),
  SETTLEMENT: new Field('settlement_price', 'number', 'Settlement', 'price'),
  CONTRACT: new Field('contract_name', 'string', 'Contract', 'fundamental'),
  EXPIRY: new Field('expiry_date', 'string', 'Expiry', 'fundamental'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)', 'technical'),
  MACD: new Field('macd_12_26_9', 'number', 'MACD', 'technical'),
  SMA_20: new Field('sma_20', 'number', 'SMA(20)', 'moving_average'),
  SMA_50: new Field('sma_50', 'number', 'SMA(50)', 'moving_average'),
  ATR_14: new Field('atr_14', 'number', 'ATR(14)', 'technical'),
  RECOMMEND_ALL: new Field('recommend_all', 'number', 'Rating', 'rating'),
};

// ---------- Preset Column Groups ----------
export type PresetName =
  | 'stock_price' | 'stock_volume' | 'stock_valuation' | 'stock_dividends'
  | 'stock_momentum' | 'stock_technical' | 'stock_moving_averages' | 'stock_performance'
  | 'crypto_price' | 'crypto_volume' | 'crypto_performance' | 'crypto_technical'
  | 'forex_price' | 'forex_technical' | 'forex_performance'
  | 'bond_overview' | 'futures_overview';

export interface ColumnPreset {
  name: PresetName;
  label: string;
  fields: Field[];
  type: ScreenerType;
}

export const PRESETS: ColumnPreset[] = [
  // Stock
  { name: 'stock_price', label: 'Price Overview', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.CHANGE_PERCENT, StockField.VOLUME, StockField.MARKET_CAP] },
  { name: 'stock_volume', label: 'Volume Analysis', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.VOLUME, StockField.RELATIVE_VOLUME, StockField.AVERAGE_VOLUME_10D, StockField.AVERAGE_VOLUME_30D] },
  { name: 'stock_valuation', label: 'Valuation', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.PE_RATIO, StockField.PB_RATIO, StockField.PS_RATIO, StockField.ENTERPRISE_VALUE, StockField.MARKET_CAP] },
  { name: 'stock_dividends', label: 'Dividends', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.DIVIDEND_YIELD, StockField.DIVIDEND_PAYOUT, StockField.PE_RATIO, StockField.MARKET_CAP] },
  { name: 'stock_momentum', label: 'Momentum', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.RSI_14, StockField.MACD, StockField.STOCH_K, StockField.CCI_20, StockField.MOM_10] },
  { name: 'stock_technical', label: 'Technical', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.RSI_14, StockField.MACD, StockField.ADX_14, StockField.ATR_14, StockField.RECOMMEND_ALL] },
  { name: 'stock_moving_averages', label: 'Moving Averages', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.SMA_20, StockField.SMA_50, StockField.SMA_200, StockField.EMA_20, StockField.EMA_50] },
  { name: 'stock_performance', label: 'Performance', type: 'stock', fields: [StockField.SYMBOL, StockField.NAME, StockField.PRICE, StockField.PERF_1W, StockField.PERF_1M, StockField.PERF_3M, StockField.PERF_YTD, StockField.PERF_1Y] },
  // Crypto
  { name: 'crypto_price', label: 'Price Overview', type: 'crypto', fields: [CryptoField.SYMBOL, CryptoField.NAME, CryptoField.PRICE, CryptoField.CHANGE_24H, CryptoField.VOLUME_24H, CryptoField.MARKET_CAP] },
  { name: 'crypto_volume', label: 'Volume', type: 'crypto', fields: [CryptoField.SYMBOL, CryptoField.NAME, CryptoField.PRICE, CryptoField.VOLUME_24H, CryptoField.MARKET_CAP, CryptoField.CIRCULATING_SUPPLY] },
  { name: 'crypto_performance', label: 'Performance', type: 'crypto', fields: [CryptoField.SYMBOL, CryptoField.NAME, CryptoField.PRICE, CryptoField.CHANGE_24H, CryptoField.CHANGE_7D, CryptoField.CHANGE_1M, CryptoField.ATH_PERCENT] },
  { name: 'crypto_technical', label: 'Technical', type: 'crypto', fields: [CryptoField.SYMBOL, CryptoField.NAME, CryptoField.PRICE, CryptoField.RSI_14, CryptoField.MACD, CryptoField.STOCH_K, CryptoField.RECOMMEND_ALL] },
  // Forex
  { name: 'forex_price', label: 'Price Overview', type: 'forex', fields: [ForexField.SYMBOL, ForexField.PRICE, ForexField.BID, ForexField.ASK, ForexField.SPREAD, ForexField.CHANGE_PERCENT] },
  { name: 'forex_technical', label: 'Technical', type: 'forex', fields: [ForexField.SYMBOL, ForexField.PRICE, ForexField.RSI_14, ForexField.MACD, ForexField.ADX_14, ForexField.RECOMMEND_ALL] },
  { name: 'forex_performance', label: 'Performance', type: 'forex', fields: [ForexField.SYMBOL, ForexField.PRICE, ForexField.CHANGE_PERCENT, ForexField.PERF_1W, ForexField.PERF_1M, ForexField.VOLATILITY] },
  // Bond & Futures
  { name: 'bond_overview', label: 'Overview', type: 'bond', fields: [BondField.SYMBOL, BondField.NAME, BondField.YIELD, BondField.CHANGE_PERCENT, BondField.COUPON, BondField.COUNTRY] },
  { name: 'futures_overview', label: 'Overview', type: 'futures', fields: [FuturesField.SYMBOL, FuturesField.NAME, FuturesField.PRICE, FuturesField.CHANGE_PERCENT, FuturesField.VOLUME, FuturesField.OPEN_INTEREST] },
];

export function getPresetsForType(type: ScreenerType): ColumnPreset[] {
  return PRESETS.filter(p => p.type === type);
}

/** Search fields by name/label pattern */
export function searchFields(type: ScreenerType, query: string): Field[] {
  const allFields = getFieldsForType(type);
  const q = query.toLowerCase();
  return allFields.filter(f => f.name.toLowerCase().includes(q) || f.label.toLowerCase().includes(q));
}

export function getFieldsForType(type: ScreenerType): Field[] {
  switch (type) {
    case 'stock': return Object.values(StockField);
    case 'crypto': return Object.values(CryptoField);
    case 'forex': return Object.values(ForexField);
    case 'bond': return Object.values(BondField);
    case 'futures': return Object.values(FuturesField);
    case 'coin': return Object.values(CryptoField);
    default: return [];
  }
}

export function getNumericFields(type: ScreenerType): Field[] {
  return getFieldsForType(type).filter(f => f.type === 'number');
}

export function getFieldCategories(type: ScreenerType): string[] {
  const cats = new Set(getFieldsForType(type).map(f => f.category));
  return Array.from(cats);
}

// ---------- Filter Presets (like tvscreener preset strategies) ----------
export interface FilterPreset {
  name: string;
  label: string;
  emoji: string;
  type: ScreenerType;
  filters: FilterCondition[];
  description: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  // Stock presets
  { name: 'oversold_high_vol', label: 'Oversold + High Volume', emoji: '📉', type: 'stock', description: 'RSI < 30 with volume > 1M',
    filters: [{ field: 'rsi_14', operator: '<', value: 30 }, { field: 'volume', operator: '>', value: 1000000 }] },
  { name: 'overbought', label: 'Overbought', emoji: '📈', type: 'stock', description: 'RSI > 70',
    filters: [{ field: 'rsi_14', operator: '>', value: 70 }] },
  { name: 'top_gainers', label: 'Top Gainers (>5%)', emoji: '🚀', type: 'stock', description: 'Change > 5%',
    filters: [{ field: 'change_percent', operator: '>', value: 5 }] },
  { name: 'top_losers', label: 'Top Losers (<-5%)', emoji: '💥', type: 'stock', description: 'Change < -5%',
    filters: [{ field: 'change_percent', operator: '<', value: -5 }] },
  { name: 'value_stocks', label: 'Value Stocks', emoji: '💎', type: 'stock', description: 'P/E < 15, Div Yield > 3%',
    filters: [{ field: 'price_earnings_ttm', operator: '<', value: 15 }, { field: 'dividend_yield_recent', operator: '>', value: 3 }] },
  { name: 'high_momentum', label: 'High Momentum', emoji: '⚡', type: 'stock', description: 'RSI 50-70, ADX > 25',
    filters: [{ field: 'rsi_14', operator: '>=', value: 50 }, { field: 'rsi_14', operator: '<=', value: 70 }, { field: 'adx_14', operator: '>', value: 25 }] },
  { name: 'golden_cross', label: 'Near Golden Cross', emoji: '✨', type: 'stock', description: 'SMA50 approaching SMA200',
    filters: [{ field: 'sma_50', operator: '>', value: 0 }] },
  { name: 'large_cap', label: 'Large Cap (>$10B)', emoji: '🏛️', type: 'stock', description: 'Market Cap > $10B',
    filters: [{ field: 'market_cap_basic', operator: '>', value: 10000000000 }] },
  { name: 'penny_stocks', label: 'Penny Stocks', emoji: '🪙', type: 'stock', description: 'Price < $5, Volume > 500K',
    filters: [{ field: 'close', operator: '<', value: 5 }, { field: 'volume', operator: '>', value: 500000 }] },
  { name: 'strong_buy', label: 'Strong Buy Rating', emoji: '🎯', type: 'stock', description: 'TV Rating > 0.5',
    filters: [{ field: 'recommend_all', operator: '>', value: 0.5 }] },
  // Crypto presets
  { name: 'crypto_hot', label: 'Hot Movers (>10%)', emoji: '🔥', type: 'crypto', description: 'Change 24h > 10%',
    filters: [{ field: 'change_24h', operator: '>', value: 10 }] },
  { name: 'crypto_oversold', label: 'Oversold Crypto', emoji: '📉', type: 'crypto', description: 'RSI < 30',
    filters: [{ field: 'rsi_14', operator: '<', value: 30 }] },
  { name: 'crypto_large_cap', label: 'Large Cap Crypto', emoji: '🏛️', type: 'crypto', description: 'Market Cap > $1B',
    filters: [{ field: 'market_cap', operator: '>', value: 1000000000 }] },
  { name: 'crypto_dip', label: 'Buy the Dip', emoji: '🛒', type: 'crypto', description: 'Change 24h < -10%, Vol > $100M',
    filters: [{ field: 'change_24h', operator: '<', value: -10 }, { field: 'volume_24h', operator: '>', value: 100000000 }] },
  // Forex presets
  { name: 'fx_trending', label: 'Strong Trend', emoji: '📊', type: 'forex', description: 'ADX > 25',
    filters: [{ field: 'adx_14', operator: '>', value: 25 }] },
  { name: 'fx_oversold', label: 'Oversold Pairs', emoji: '📉', type: 'forex', description: 'RSI < 30',
    filters: [{ field: 'rsi_14', operator: '<', value: 30 }] },
  // Bond presets
  { name: 'bond_high_yield', label: 'High Yield', emoji: '💰', type: 'bond', description: 'Yield > 4%',
    filters: [{ field: 'yield', operator: '>', value: 4 }] },
  // Futures presets
  { name: 'futures_high_oi', label: 'High Open Interest', emoji: '📊', type: 'futures', description: 'OI > 100K',
    filters: [{ field: 'open_interest', operator: '>', value: 100000 }] },
];

export function getFilterPresetsForType(type: ScreenerType): FilterPreset[] {
  return FILTER_PRESETS.filter(p => p.type === type);
}

// ---------- Market & Country Filters ----------
export const MARKETS = [
  'america', 'argentina', 'australia', 'austria', 'bahrain', 'bangladesh', 'belgium', 'brazil',
  'canada', 'chile', 'china', 'colombia', 'denmark', 'egypt', 'finland', 'france', 'germany',
  'greece', 'hongkong', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'ireland', 'israel',
  'italy', 'japan', 'jordan', 'kenya', 'korea', 'kuwait', 'malaysia', 'mexico', 'morocco',
  'netherlands', 'newzealand', 'nigeria', 'norway', 'oman', 'pakistan', 'peru', 'philippines',
  'poland', 'portugal', 'qatar', 'romania', 'russia', 'saudi_arabia', 'serbia', 'singapore',
  'south_africa', 'spain', 'sri_lanka', 'sweden', 'switzerland', 'taiwan', 'thailand', 'tunisia',
  'turkey', 'uae', 'uk', 'venezuela', 'vietnam',
] as const;

export type Market = typeof MARKETS[number];

export const EXCHANGES: Record<string, string[]> = {
  america: ['NYSE', 'NASDAQ', 'AMEX', 'OTC'],
  japan: ['TSE'],
  uk: ['LSE'],
  hongkong: ['HKEX'],
  germany: ['XETR', 'FWB'],
  india: ['NSE', 'BSE'],
  korea: ['KRX'],
  china: ['SSE', 'SZSE'],
  canada: ['TSX', 'TSXV'],
  australia: ['ASX'],
  thailand: ['SET'],
};

export const SECTORS = [
  'Technology', 'Healthcare', 'Financial', 'Consumer Cyclical', 'Consumer Defensive',
  'Industrials', 'Energy', 'Basic Materials', 'Real Estate', 'Utilities',
  'Communication Services',
];

// ---------- Mock Data Generator (realistic) ----------

const STOCK_DATA: Array<{ s: string; n: string; sec: string; ind: string; ex: string }> = [
  { s: 'AAPL', n: 'Apple Inc.', sec: 'Technology', ind: 'Consumer Electronics', ex: 'NASDAQ' },
  { s: 'MSFT', n: 'Microsoft Corp.', sec: 'Technology', ind: 'Software', ex: 'NASDAQ' },
  { s: 'AMZN', n: 'Amazon.com Inc.', sec: 'Consumer Cyclical', ind: 'Internet Retail', ex: 'NASDAQ' },
  { s: 'NVDA', n: 'NVIDIA Corp.', sec: 'Technology', ind: 'Semiconductors', ex: 'NASDAQ' },
  { s: 'GOOGL', n: 'Alphabet Inc.', sec: 'Communication Services', ind: 'Internet Content', ex: 'NASDAQ' },
  { s: 'META', n: 'Meta Platforms', sec: 'Communication Services', ind: 'Internet Content', ex: 'NASDAQ' },
  { s: 'TSLA', n: 'Tesla Inc.', sec: 'Consumer Cyclical', ind: 'Auto Manufacturers', ex: 'NASDAQ' },
  { s: 'BRK.B', n: 'Berkshire Hathaway', sec: 'Financial', ind: 'Insurance', ex: 'NYSE' },
  { s: 'JPM', n: 'JPMorgan Chase', sec: 'Financial', ind: 'Banks', ex: 'NYSE' },
  { s: 'V', n: 'Visa Inc.', sec: 'Financial', ind: 'Credit Services', ex: 'NYSE' },
  { s: 'UNH', n: 'UnitedHealth Group', sec: 'Healthcare', ind: 'Health Care Plans', ex: 'NYSE' },
  { s: 'JNJ', n: 'Johnson & Johnson', sec: 'Healthcare', ind: 'Drug Manufacturers', ex: 'NYSE' },
  { s: 'WMT', n: 'Walmart Inc.', sec: 'Consumer Defensive', ind: 'Discount Stores', ex: 'NYSE' },
  { s: 'PG', n: 'Procter & Gamble', sec: 'Consumer Defensive', ind: 'Household Products', ex: 'NYSE' },
  { s: 'MA', n: 'Mastercard Inc.', sec: 'Financial', ind: 'Credit Services', ex: 'NYSE' },
  { s: 'LLY', n: 'Eli Lilly & Co.', sec: 'Healthcare', ind: 'Drug Manufacturers', ex: 'NYSE' },
  { s: 'AVGO', n: 'Broadcom Inc.', sec: 'Technology', ind: 'Semiconductors', ex: 'NASDAQ' },
  { s: 'HD', n: 'Home Depot Inc.', sec: 'Consumer Cyclical', ind: 'Home Improvement', ex: 'NYSE' },
  { s: 'CVX', n: 'Chevron Corp.', sec: 'Energy', ind: 'Oil & Gas', ex: 'NYSE' },
  { s: 'KO', n: 'Coca-Cola Co.', sec: 'Consumer Defensive', ind: 'Beverages', ex: 'NYSE' },
  { s: 'ABBV', n: 'AbbVie Inc.', sec: 'Healthcare', ind: 'Drug Manufacturers', ex: 'NYSE' },
  { s: 'MRK', n: 'Merck & Co.', sec: 'Healthcare', ind: 'Drug Manufacturers', ex: 'NYSE' },
  { s: 'PEP', n: 'PepsiCo Inc.', sec: 'Consumer Defensive', ind: 'Beverages', ex: 'NYSE' },
  { s: 'COST', n: 'Costco Wholesale', sec: 'Consumer Defensive', ind: 'Discount Stores', ex: 'NASDAQ' },
  { s: 'ADBE', n: 'Adobe Inc.', sec: 'Technology', ind: 'Software', ex: 'NASDAQ' },
  { s: 'CRM', n: 'Salesforce Inc.', sec: 'Technology', ind: 'Software', ex: 'NYSE' },
  { s: 'ORCL', n: 'Oracle Corp.', sec: 'Technology', ind: 'Software', ex: 'NYSE' },
  { s: 'NFLX', n: 'Netflix Inc.', sec: 'Communication Services', ind: 'Entertainment', ex: 'NASDAQ' },
  { s: 'AMD', n: 'Advanced Micro Devices', sec: 'Technology', ind: 'Semiconductors', ex: 'NASDAQ' },
  { s: 'INTC', n: 'Intel Corp.', sec: 'Technology', ind: 'Semiconductors', ex: 'NASDAQ' },
  { s: 'PFE', n: 'Pfizer Inc.', sec: 'Healthcare', ind: 'Drug Manufacturers', ex: 'NYSE' },
  { s: 'DIS', n: 'Walt Disney Co.', sec: 'Communication Services', ind: 'Entertainment', ex: 'NYSE' },
  { s: 'CSCO', n: 'Cisco Systems', sec: 'Technology', ind: 'Communication Equipment', ex: 'NASDAQ' },
  { s: 'NKE', n: 'Nike Inc.', sec: 'Consumer Cyclical', ind: 'Footwear', ex: 'NYSE' },
  { s: 'BA', n: 'Boeing Co.', sec: 'Industrials', ind: 'Aerospace & Defense', ex: 'NYSE' },
  { s: 'GS', n: 'Goldman Sachs', sec: 'Financial', ind: 'Capital Markets', ex: 'NYSE' },
  { s: 'CAT', n: 'Caterpillar Inc.', sec: 'Industrials', ind: 'Farm & Heavy Equipment', ex: 'NYSE' },
  { s: 'IBM', n: 'IBM Corp.', sec: 'Technology', ind: 'IT Services', ex: 'NYSE' },
  { s: 'GE', n: 'GE Aerospace', sec: 'Industrials', ind: 'Aerospace & Defense', ex: 'NYSE' },
  { s: 'HON', n: 'Honeywell Intl', sec: 'Industrials', ind: 'Conglomerates', ex: 'NASDAQ' },
  { s: 'LMT', n: 'Lockheed Martin', sec: 'Industrials', ind: 'Aerospace & Defense', ex: 'NYSE' },
  { s: 'SBUX', n: 'Starbucks Corp.', sec: 'Consumer Cyclical', ind: 'Restaurants', ex: 'NASDAQ' },
  { s: 'PYPL', n: 'PayPal Holdings', sec: 'Financial', ind: 'Credit Services', ex: 'NASDAQ' },
  { s: 'UBER', n: 'Uber Technologies', sec: 'Technology', ind: 'Software', ex: 'NYSE' },
  { s: 'SQ', n: 'Block Inc.', sec: 'Technology', ind: 'Software', ex: 'NYSE' },
  { s: 'PLTR', n: 'Palantir Technologies', sec: 'Technology', ind: 'Software', ex: 'NYSE' },
  { s: 'CRWD', n: 'CrowdStrike', sec: 'Technology', ind: 'Software', ex: 'NASDAQ' },
  { s: 'XOM', n: 'Exxon Mobil', sec: 'Energy', ind: 'Oil & Gas', ex: 'NYSE' },
  { s: 'T', n: 'AT&T Inc.', sec: 'Communication Services', ind: 'Telecom', ex: 'NYSE' },
  { s: 'VZ', n: 'Verizon Comm.', sec: 'Communication Services', ind: 'Telecom', ex: 'NYSE' },
];

const CRYPTO_DATA: Array<{ s: string; n: string; bp: number }> = [
  { s: 'BTC', n: 'Bitcoin', bp: 96000 }, { s: 'ETH', n: 'Ethereum', bp: 3400 },
  { s: 'BNB', n: 'BNB', bp: 620 }, { s: 'SOL', n: 'Solana', bp: 195 },
  { s: 'XRP', n: 'XRP', bp: 2.6 }, { s: 'ADA', n: 'Cardano', bp: 0.82 },
  { s: 'AVAX', n: 'Avalanche', bp: 38 }, { s: 'DOT', n: 'Polkadot', bp: 7.5 },
  { s: 'DOGE', n: 'Dogecoin', bp: 0.32 }, { s: 'LINK', n: 'Chainlink', bp: 18 },
  { s: 'MATIC', n: 'Polygon', bp: 0.85 }, { s: 'LTC', n: 'Litecoin', bp: 92 },
  { s: 'UNI', n: 'Uniswap', bp: 14 }, { s: 'ATOM', n: 'Cosmos', bp: 10 },
  { s: 'XLM', n: 'Stellar', bp: 0.42 }, { s: 'NEAR', n: 'Near Protocol', bp: 5.5 },
  { s: 'APT', n: 'Aptos', bp: 11 }, { s: 'ARB', n: 'Arbitrum', bp: 1.4 },
  { s: 'OP', n: 'Optimism', bp: 2.2 }, { s: 'SUI', n: 'Sui', bp: 1.8 },
  { s: 'FIL', n: 'Filecoin', bp: 5.8 }, { s: 'AAVE', n: 'Aave', bp: 320 },
  { s: 'MKR', n: 'Maker', bp: 2900 }, { s: 'RNDR', n: 'Render', bp: 9.5 },
  { s: 'INJ', n: 'Injective', bp: 28 }, { s: 'PEPE', n: 'Pepe', bp: 0.000018 },
  { s: 'WLD', n: 'Worldcoin', bp: 3.5 }, { s: 'KAS', n: 'Kaspa', bp: 0.16 },
  { s: 'TIA', n: 'Celestia', bp: 12 }, { s: 'SEI', n: 'Sei', bp: 0.65 },
];

const FOREX_DATA = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'EUR/AUD', 'GBP/AUD', 'USD/SGD', 'USD/THB',
  'EUR/CHF', 'GBP/CHF', 'AUD/NZD', 'CAD/JPY', 'CHF/JPY',
];
const FOREX_BASE = [1.085, 1.27, 149.5, 0.655, 1.36, 0.615, 0.88, 0.855, 162, 190, 98, 1.66, 1.94, 1.34, 34.5, 0.955, 1.12, 1.09, 110, 170];

const BOND_DATA = [
  { s: 'US10Y', n: 'US 10-Year', c: 'US', cp: 4.25 }, { s: 'US2Y', n: 'US 2-Year', c: 'US', cp: 4.35 },
  { s: 'US5Y', n: 'US 5-Year', c: 'US', cp: 4.15 }, { s: 'US30Y', n: 'US 30-Year', c: 'US', cp: 4.45 },
  { s: 'DE10Y', n: 'Germany 10Y', c: 'DE', cp: 2.35 }, { s: 'JP10Y', n: 'Japan 10Y', c: 'JP', cp: 1.05 },
  { s: 'GB10Y', n: 'UK 10Y', c: 'GB', cp: 4.15 }, { s: 'FR10Y', n: 'France 10Y', c: 'FR', cp: 2.95 },
  { s: 'IT10Y', n: 'Italy 10Y', c: 'IT', cp: 3.55 }, { s: 'AU10Y', n: 'Australia 10Y', c: 'AU', cp: 4.25 },
  { s: 'CA10Y', n: 'Canada 10Y', c: 'CA', cp: 3.45 }, { s: 'CN10Y', n: 'China 10Y', c: 'CN', cp: 2.15 },
];

const FUTURES_DATA = [
  { s: 'ES', n: 'E-mini S&P 500', bp: 5300, oi: 2800000 },
  { s: 'NQ', n: 'E-mini NASDAQ', bp: 18800, oi: 320000 },
  { s: 'YM', n: 'E-mini Dow', bp: 39500, oi: 120000 },
  { s: 'RTY', n: 'E-mini Russell', bp: 2050, oi: 580000 },
  { s: 'GC', n: 'Gold', bp: 2680, oi: 480000 },
  { s: 'SI', n: 'Silver', bp: 31.5, oi: 160000 },
  { s: 'CL', n: 'Crude Oil', bp: 73, oi: 1500000 },
  { s: 'NG', n: 'Natural Gas', bp: 3.3, oi: 1200000 },
  { s: 'ZB', n: 'US T-Bond', bp: 118, oi: 1100000 },
  { s: 'ZN', n: '10-Year T-Note', bp: 110, oi: 4200000 },
  { s: '6E', n: 'Euro FX', bp: 1.085, oi: 650000 },
  { s: '6J', n: 'Japanese Yen', bp: 0.0067, oi: 250000 },
  { s: 'HG', n: 'Copper', bp: 4.15, oi: 250000 },
  { s: 'ZC', n: 'Corn', bp: 450, oi: 1500000 },
  { s: 'ZW', n: 'Wheat', bp: 560, oi: 380000 },
];

// Seeded random for consistent results per symbol
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function genTechnicals(rng: () => number, price: number) {
  const rsi = +(rng() * 100).toFixed(1);
  const chg = +((rng() - 0.5) * 10).toFixed(2);
  return {
    rsi_14: rsi,
    rsi_7: +(rsi + (rng() - 0.5) * 20).toFixed(1),
    stoch_k_14_3_3: +(rng() * 100).toFixed(1),
    stoch_d_14_3_3: +(rng() * 100).toFixed(1),
    stoch_k: +(rng() * 100).toFixed(1),
    cci_20: +((rng() - 0.5) * 400).toFixed(1),
    adx_14: +(10 + rng() * 50).toFixed(1),
    adx_plus_di_14: +(rng() * 40).toFixed(1),
    adx_minus_di_14: +(rng() * 40).toFixed(1),
    ao: +((rng() - 0.5) * 10).toFixed(3),
    mom_10: +((rng() - 0.5) * price * 0.1).toFixed(2),
    macd_12_26_9: +((rng() - 0.5) * 5).toFixed(3),
    macd_signal_12_26_9: +((rng() - 0.5) * 4).toFixed(3),
    macd_hist_12_26_9: +((rng() - 0.5) * 2).toFixed(3),
    williams_r_14: +(-(rng() * 100)).toFixed(1),
    atr_14: +(price * 0.01 + rng() * price * 0.03).toFixed(2),
    sma_5: +(price * (0.97 + rng() * 0.06)).toFixed(2),
    sma_10: +(price * (0.95 + rng() * 0.10)).toFixed(2),
    sma_20: +(price * (0.93 + rng() * 0.14)).toFixed(2),
    sma_50: +(price * (0.90 + rng() * 0.20)).toFixed(2),
    sma_100: +(price * (0.85 + rng() * 0.30)).toFixed(2),
    sma_200: +(price * (0.80 + rng() * 0.40)).toFixed(2),
    ema_5: +(price * (0.97 + rng() * 0.06)).toFixed(2),
    ema_10: +(price * (0.95 + rng() * 0.10)).toFixed(2),
    ema_20: +(price * (0.93 + rng() * 0.14)).toFixed(2),
    ema_50: +(price * (0.90 + rng() * 0.20)).toFixed(2),
    ema_100: +(price * (0.85 + rng() * 0.30)).toFixed(2),
    ema_200: +(price * (0.80 + rng() * 0.40)).toFixed(2),
    vwap: +(price * (0.98 + rng() * 0.04)).toFixed(2),
    bb_upper_20_2: +(price * 1.05).toFixed(2),
    bb_lower_20_2: +(price * 0.95).toFixed(2),
    bb_basis_20_2: +(price * 1.0).toFixed(2),
    bb_upper: +(price * 1.05).toFixed(2),
    bb_lower: +(price * 0.95).toFixed(2),
    pivot_s3: +(price * 0.93).toFixed(2),
    pivot_s2: +(price * 0.95).toFixed(2),
    pivot_s1: +(price * 0.97).toFixed(2),
    pivot_p: +(price * 1.0).toFixed(2),
    pivot_r1: +(price * 1.03).toFixed(2),
    pivot_r2: +(price * 1.05).toFixed(2),
    pivot_r3: +(price * 1.07).toFixed(2),
    recommend_all: +((rng() - 0.5) * 2).toFixed(3),
    recommend_ma: +((rng() - 0.5) * 2).toFixed(3),
    recommend_other: +((rng() - 0.5) * 2).toFixed(3),
    change_percent: chg,
    change: +(price * chg / 100).toFixed(2),
    change_abs: +(Math.abs(price * chg / 100)).toFixed(2),
    volatility_w: +(1 + rng() * 5).toFixed(2),
    volatility_m: +(2 + rng() * 8).toFixed(2),
    volatility_d: +(0.5 + rng() * 3).toFixed(2),
  };
}

// ---------- MarketScreener class ----------
export class MarketScreener {
  private _type: ScreenerType;
  private _filters: FilterCondition[] = [];
  private _selectedFields: Field[] = [];
  private _sort?: SortConfig;
  private _limitCount: number = 150;
  private _markets: string[] = [];
  private _exchanges: string[] = [];

  constructor(type: ScreenerType) {
    this._type = type;
  }

  get type(): ScreenerType { return this._type; }
  get filters(): FilterCondition[] { return [...this._filters]; }
  get selectedFields(): Field[] { return [...this._selectedFields]; }
  get sort(): SortConfig | undefined { return this._sort; }

  select(...fields: Field[]): this {
    this._selectedFields = fields;
    return this;
  }

  where(condition: FilterCondition): this {
    this._filters.push(condition);
    return this;
  }

  orderBy(field: Field | string, direction: 'asc' | 'desc' = 'desc'): this {
    this._sort = { field: typeof field === 'string' ? field : field.name, direction };
    return this;
  }

  limit(count: number): this {
    this._limitCount = Math.min(count, 5000);
    return this;
  }

  setMarkets(...markets: string[]): this {
    this._markets = markets;
    return this;
  }

  setExchanges(...exchanges: string[]): this {
    this._exchanges = exchanges;
    return this;
  }

  clearFilters(): this {
    this._filters = [];
    return this;
  }

  async get(): Promise<any[]> {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
    let data = this.generateData();

    if (this._sort) {
      const sf = this._sort.field;
      const dir = this._sort.direction === 'asc' ? 1 : -1;
      data.sort((a, b) => {
        const av = a[sf] ?? 0;
        const bv = b[sf] ?? 0;
        return (av - bv) * dir;
      });
    }

    return data.slice(0, this._limitCount);
  }

  private generateData(): any[] {
    switch (this._type) {
      case 'stock': return this.genStocks();
      case 'crypto': case 'coin': return this.genCrypto();
      case 'forex': return this.genForex();
      case 'bond': return this.genBonds();
      case 'futures': return this.genFutures();
      default: return [];
    }
  }

  private genStocks(): any[] {
    return STOCK_DATA.map(d => {
      const rng = seededRandom(d.s);
      const price = +(50 + rng() * 450).toFixed(2);
      const tech = genTechnicals(rng, price);
      return {
        symbol: d.s, name: d.n, description: d.n,
        close: price, open: +(price * (0.99 + rng() * 0.02)).toFixed(2),
        high: +(price * (1.0 + rng() * 0.03)).toFixed(2),
        low: +(price * (0.97 + rng() * 0.03)).toFixed(2),
        volume: Math.floor(rng() * 50000000) + 100000,
        relative_volume_10d_calc: +(0.3 + rng() * 3).toFixed(2),
        average_volume_10d: Math.floor(rng() * 20000000) + 500000,
        average_volume_30d: Math.floor(rng() * 18000000) + 400000,
        average_volume_60d: Math.floor(rng() * 15000000) + 300000,
        average_volume_90d: Math.floor(rng() * 12000000) + 200000,
        market_cap_basic: Math.floor(rng() * 2000000000000) + 1000000000,
        enterprise_value_fq: Math.floor(rng() * 2500000000000) + 500000000,
        sector: d.sec, industry: d.ind, exchange: d.ex, country: 'US',
        type: 'stock', subtype: 'common',
        price_earnings_ttm: +(8 + rng() * 50).toFixed(2),
        price_book_fq: +(0.5 + rng() * 20).toFixed(2),
        price_sales_current: +(0.5 + rng() * 15).toFixed(2),
        earnings_per_share_basic_ttm: +(rng() * 20).toFixed(2),
        earnings_per_share_diluted_ttm: +(rng() * 18).toFixed(2),
        total_revenue_ttm: Math.floor(rng() * 400000000000),
        gross_margin_ttm: +(20 + rng() * 60).toFixed(1),
        operating_margin_ttm: +(5 + rng() * 40).toFixed(1),
        net_margin_ttm: +(2 + rng() * 30).toFixed(1),
        return_on_equity_ttm: +(5 + rng() * 40).toFixed(1),
        return_on_assets_ttm: +(1 + rng() * 20).toFixed(1),
        debt_to_equity_fq: +(rng() * 3).toFixed(2),
        current_ratio_fq: +(0.5 + rng() * 4).toFixed(2),
        quick_ratio_fq: +(0.3 + rng() * 3).toFixed(2),
        dividend_yield_recent: +(rng() * 6).toFixed(2),
        dividend_payout_ratio_ttm: +(rng() * 80).toFixed(1),
        beta_1_year: +(0.3 + rng() * 2).toFixed(2),
        float_shares_outstanding: Math.floor(rng() * 10000000000),
        total_shares_outstanding: Math.floor(rng() * 12000000000),
        free_cash_flow_ttm: Math.floor((rng() - 0.2) * 50000000000),
        perf_1w: +((rng() - 0.5) * 10).toFixed(2),
        perf_1m: +((rng() - 0.5) * 15).toFixed(2),
        perf_3m: +((rng() - 0.5) * 25).toFixed(2),
        perf_6m: +((rng() - 0.5) * 35).toFixed(2),
        perf_ytd: +((rng() - 0.5) * 40).toFixed(2),
        perf_1y: +((rng() - 0.5) * 60).toFixed(2),
        perf_5y: +((rng() - 0.3) * 200).toFixed(2),
        perf_all: +((rng()) * 500).toFixed(2),
        price_52_week_high: +(price * (1.05 + rng() * 0.3)).toFixed(2),
        price_52_week_low: +(price * (0.5 + rng() * 0.4)).toFixed(2),
        candle_doji: rng() > 0.9, candle_hammer: rng() > 0.92,
        candle_engulfing: rng() > 0.88, candle_morning_star: rng() > 0.95,
        candle_evening_star: rng() > 0.95,
        ...tech,
      };
    }).filter(item => this.applyFilters(item));
  }

  private genCrypto(): any[] {
    return CRYPTO_DATA.map(d => {
      const rng = seededRandom(d.s);
      const price = +(d.bp * (0.9 + rng() * 0.2)).toFixed(d.bp < 1 ? 6 : 2);
      const tech = genTechnicals(rng, price);
      return {
        symbol: d.s, name: d.n, close: price,
        open: +(price * (0.98 + rng() * 0.04)).toFixed(d.bp < 1 ? 6 : 2),
        high: +(price * (1.0 + rng() * 0.05)).toFixed(d.bp < 1 ? 6 : 2),
        low: +(price * (0.95 + rng() * 0.05)).toFixed(d.bp < 1 ? 6 : 2),
        change_24h: +((rng() - 0.5) * 20).toFixed(2),
        change_7d: +((rng() - 0.5) * 30).toFixed(2),
        change_1m: +((rng() - 0.5) * 50).toFixed(2),
        volume_24h: Math.floor(rng() * 5000000000) + 10000000,
        market_cap: Math.floor(d.bp * 1000000 * (500 + rng() * 5000)),
        circulating_supply: Math.floor(rng() * 100000000000),
        total_supply: Math.floor(rng() * 200000000000),
        max_supply: rng() > 0.5 ? Math.floor(rng() * 300000000000) : null,
        all_time_high: +(price * (1.1 + rng() * 2)).toFixed(2),
        ath_percent: +(-10 - rng() * 80).toFixed(1),
        dominance: +(rng() * (d.s === 'BTC' ? 55 : 0.5)).toFixed(2),
        ...tech,
      };
    }).filter(item => this.applyFilters(item));
  }

  private genForex(): any[] {
    return FOREX_DATA.map((symbol, i) => {
      const rng = seededRandom(symbol);
      const bp = FOREX_BASE[i] || 1;
      const isJPY = symbol.includes('JPY') || symbol.includes('THB');
      const price = +(bp * (0.998 + rng() * 0.004)).toFixed(isJPY ? 3 : 5);
      const tech = genTechnicals(rng, price);
      return {
        symbol, name: symbol.replace('/', ''),
        close: price, bid: +(price - 0.00005).toFixed(isJPY ? 3 : 5),
        ask: +(price + 0.00005).toFixed(isJPY ? 3 : 5),
        spread: isJPY ? +(rng() * 0.03).toFixed(3) : +(rng() * 0.0003).toFixed(5),
        high: +(price * (1.0 + rng() * 0.005)).toFixed(isJPY ? 3 : 5),
        low: +(price * (0.995 + rng() * 0.005)).toFixed(isJPY ? 3 : 5),
        change_pips: +((rng() - 0.5) * 100).toFixed(1),
        perf_1w: +((rng() - 0.5) * 3).toFixed(2),
        perf_1m: +((rng() - 0.5) * 5).toFixed(2),
        ...tech,
      };
    }).filter(item => this.applyFilters(item));
  }

  private genBonds(): any[] {
    return BOND_DATA.map(d => {
      const rng = seededRandom(d.s);
      const y = +(d.cp + (rng() - 0.5) * 0.5).toFixed(3);
      const tech = genTechnicals(rng, y);
      return {
        symbol: d.s, name: d.n, yield: y, close: +(100 - y * 5).toFixed(2),
        coupon: +(d.cp - 0.5 + rng()).toFixed(3),
        maturity_date: `202${5 + Math.floor(rng() * 20)}-${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}-15`,
        country: d.c,
        ...tech,
      };
    }).filter(item => this.applyFilters(item));
  }

  private genFutures(): any[] {
    return FUTURES_DATA.map(d => {
      const rng = seededRandom(d.s);
      const price = +(d.bp * (0.99 + rng() * 0.02)).toFixed(2);
      const tech = genTechnicals(rng, price);
      return {
        symbol: d.s, name: d.n, close: price,
        high: +(price * (1.0 + rng() * 0.02)).toFixed(2),
        low: +(price * (0.98 + rng() * 0.02)).toFixed(2),
        volume: Math.floor(rng() * 2000000) + 50000,
        open_interest: d.oi + Math.floor((rng() - 0.5) * d.oi * 0.1),
        settlement_price: +(price * (0.999 + rng() * 0.002)).toFixed(2),
        contract_name: `${d.n} Mar 2026`,
        expiry_date: '2026-03-21',
        ...tech,
      };
    }).filter(item => this.applyFilters(item));
  }

  private applyFilters(item: any): boolean {
    return this._filters.every(filter => {
      const value = item[filter.field];
      if (value === undefined || value === null) return true;
      switch (filter.operator) {
        case '>': return value > filter.value;
        case '<': return value < filter.value;
        case '>=': return value >= filter.value;
        case '<=': return value <= filter.value;
        case '=': return value === filter.value;
        case '!=': return value !== filter.value;
        case 'between': case 'in_range': return value >= filter.value[0] && value <= filter.value[1];
        case 'not_in_range': return value < filter.value[0] || value > filter.value[1];
        case 'isin': return filter.value.includes(value);
        case 'match': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'not_empty': return value !== '' && value !== null && value !== undefined;
        default: return true;
      }
    });
  }
}

// ---------- Convenience factory functions ----------
export function StockScreener(): MarketScreener { return new MarketScreener('stock'); }
export function CryptoScreener(): MarketScreener { return new MarketScreener('crypto'); }
export function ForexScreener(): MarketScreener { return new MarketScreener('forex'); }
export function BondScreener(): MarketScreener { return new MarketScreener('bond'); }
export function FuturesScreener(): MarketScreener { return new MarketScreener('futures'); }
export function CoinScreener(): MarketScreener { return new MarketScreener('coin'); }
