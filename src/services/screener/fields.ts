// ============================================
// TradingView Screener Fields - Matching tvscreener library
// 130+ fields across 10 categories
// ============================================

export type FieldFormat = 'currency' | 'percent' | 'number' | 'text' | 'date' | 'rating';

export type FieldCategory =
  | 'price'
  | 'valuation'
  | 'technical'
  | 'oscillator'
  | 'moving_average'
  | 'performance'
  | 'fundamental'
  | 'dividend'
  | 'recommendation'
  | 'pivot'
  | 'info'
  | 'volatility'
  | 'volume'
  | 'bollinger'
  | 'earnings';

export interface FieldDef {
  name: string;         // TradingView API field name
  label: string;        // Human-readable label
  format: FieldFormat;
  category: FieldCategory;
  screeners: ScreenerType[];  // Which screeners support this field
  description?: string;
}

export type ScreenerType = 'stock' | 'crypto' | 'forex' | 'bond' | 'futures' | 'coin';

// Available time intervals for technical fields
export const TIME_INTERVALS = [
  { code: '', label: 'Daily (Default)' },
  { code: '1', label: '1 Minute' },
  { code: '5', label: '5 Minutes' },
  { code: '15', label: '15 Minutes' },
  { code: '30', label: '30 Minutes' },
  { code: '60', label: '1 Hour' },
  { code: '120', label: '2 Hours' },
  { code: '240', label: '4 Hours' },
  { code: '1W', label: 'Weekly' },
  { code: '1M', label: 'Monthly' },
] as const;

export const FIELD_CATEGORIES: { id: FieldCategory; label: string; icon: string }[] = [
  { id: 'price', label: 'Price & Volume', icon: '💰' },
  { id: 'volume', label: 'Volume', icon: '📊' },
  { id: 'valuation', label: 'Valuation', icon: '📐' },
  { id: 'fundamental', label: 'Fundamentals', icon: '📋' },
  { id: 'dividend', label: 'Dividends', icon: '💵' },
  { id: 'earnings', label: 'Earnings', icon: '💹' },
  { id: 'oscillator', label: 'Oscillators', icon: '📈' },
  { id: 'moving_average', label: 'Moving Averages', icon: '〰️' },
  { id: 'bollinger', label: 'Bollinger Bands', icon: '📉' },
  { id: 'pivot', label: 'Pivot Points', icon: '🎯' },
  { id: 'performance', label: 'Performance', icon: '🏆' },
  { id: 'volatility', label: 'Volatility', icon: '⚡' },
  { id: 'recommendation', label: 'Recommendations', icon: '⭐' },
  { id: 'info', label: 'Info', icon: 'ℹ️' },
];

const ALL: ScreenerType[] = ['stock', 'crypto', 'forex', 'bond', 'futures', 'coin'];
const EQUITY: ScreenerType[] = ['stock'];
const EQUITY_CRYPTO: ScreenerType[] = ['stock', 'crypto', 'coin'];
const NO_BOND: ScreenerType[] = ['stock', 'crypto', 'forex', 'futures', 'coin'];

// ============ COMPLETE FIELD DEFINITIONS ============

export const ALL_FIELDS: FieldDef[] = [
  // ---- PRICE & VOLUME ----
  { name: 'close', label: 'Price', format: 'currency', category: 'price', screeners: ALL },
  { name: 'open', label: 'Open', format: 'currency', category: 'price', screeners: ALL },
  { name: 'high', label: 'High', format: 'currency', category: 'price', screeners: ALL },
  { name: 'low', label: 'Low', format: 'currency', category: 'price', screeners: ALL },
  { name: 'change', label: 'Change %', format: 'percent', category: 'price', screeners: ALL },
  { name: 'change_abs', label: 'Change (Abs)', format: 'currency', category: 'price', screeners: ALL },
  { name: 'premarket_close', label: 'Pre-Market Price', format: 'currency', category: 'price', screeners: EQUITY },
  { name: 'premarket_change', label: 'Pre-Market Change %', format: 'percent', category: 'price', screeners: EQUITY },
  { name: 'postmarket_close', label: 'Post-Market Price', format: 'currency', category: 'price', screeners: EQUITY },
  { name: 'postmarket_change', label: 'Post-Market Change %', format: 'percent', category: 'price', screeners: EQUITY },
  { name: 'bid', label: 'Bid', format: 'currency', category: 'price', screeners: ['forex'] },
  { name: 'ask', label: 'Ask', format: 'currency', category: 'price', screeners: ['forex'] },
  { name: 'spread_raw', label: 'Spread', format: 'number', category: 'price', screeners: ['forex'] },
  { name: 'gap', label: 'Gap %', format: 'percent', category: 'price', screeners: EQUITY },
  { name: '52_week_high', label: '52W High', format: 'currency', category: 'price', screeners: EQUITY },
  { name: '52_week_low', label: '52W Low', format: 'currency', category: 'price', screeners: EQUITY },

  // ---- VOLUME ----
  { name: 'volume', label: 'Volume', format: 'number', category: 'volume', screeners: ALL },
  { name: 'average_volume_10d_calc', label: 'Avg Vol (10D)', format: 'number', category: 'volume', screeners: NO_BOND },
  { name: 'average_volume_30d_calc', label: 'Avg Vol (30D)', format: 'number', category: 'volume', screeners: NO_BOND },
  { name: 'average_volume_60d_calc', label: 'Avg Vol (60D)', format: 'number', category: 'volume', screeners: NO_BOND },
  { name: 'average_volume_90d_calc', label: 'Avg Vol (90D)', format: 'number', category: 'volume', screeners: NO_BOND },
  { name: 'relative_volume_10d_calc', label: 'Relative Volume', format: 'number', category: 'volume', screeners: NO_BOND },
  { name: '24h_vol|5', label: 'Volume 24h', format: 'number', category: 'volume', screeners: ['crypto', 'coin'] },
  { name: '24h_vol_change|5', label: 'Vol Change 24h', format: 'percent', category: 'volume', screeners: ['crypto', 'coin'] },
  { name: 'open_interest', label: 'Open Interest', format: 'number', category: 'volume', screeners: ['futures'] },

  // ---- VALUATION ----
  { name: 'price_earnings_ttm', label: 'P/E Ratio (TTM)', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'price_book_fq', label: 'P/B Ratio', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'price_sales_current', label: 'P/S Ratio', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'enterprise_value_ebitda_ttm', label: 'EV/EBITDA', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'price_earnings_to_growth_ttm', label: 'PEG Ratio', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'market_cap_basic', label: 'Market Cap', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'market_cap_calc', label: 'Market Cap', format: 'number', category: 'valuation', screeners: ['crypto', 'coin'] },
  { name: 'enterprise_value_fq', label: 'Enterprise Value', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'price_free_cash_flow_ttm', label: 'P/FCF', format: 'number', category: 'valuation', screeners: EQUITY },
  { name: 'number_of_employees', label: 'Employees', format: 'number', category: 'valuation', screeners: EQUITY },

  // ---- FUNDAMENTAL ----
  { name: 'return_on_equity', label: 'ROE %', format: 'percent', category: 'fundamental', screeners: EQUITY },
  { name: 'return_on_assets', label: 'ROA %', format: 'percent', category: 'fundamental', screeners: EQUITY },
  { name: 'return_on_invested_capital', label: 'ROIC %', format: 'percent', category: 'fundamental', screeners: EQUITY },
  { name: 'gross_margin', label: 'Gross Margin %', format: 'percent', category: 'fundamental', screeners: EQUITY },
  { name: 'net_margin', label: 'Net Margin %', format: 'percent', category: 'fundamental', screeners: EQUITY },
  { name: 'operating_margin', label: 'Operating Margin %', format: 'percent', category: 'fundamental', screeners: EQUITY },
  { name: 'total_revenue', label: 'Revenue', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'revenue_per_share_ttm', label: 'Revenue/Share', format: 'currency', category: 'fundamental', screeners: EQUITY },
  { name: 'total_debt', label: 'Total Debt', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'debt_to_equity', label: 'Debt/Equity', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'current_ratio', label: 'Current Ratio', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'quick_ratio', label: 'Quick Ratio', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'total_shares_outstanding_fundamental', label: 'Shares Outstanding', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'float_shares_outstanding', label: 'Float', format: 'number', category: 'fundamental', screeners: EQUITY },
  { name: 'beta_1_year', label: 'Beta (1Y)', format: 'number', category: 'fundamental', screeners: EQUITY },

  // ---- DIVIDEND ----
  { name: 'dividend_yield_recent', label: 'Dividend Yield %', format: 'percent', category: 'dividend', screeners: EQUITY },
  { name: 'dividends_per_share_fq', label: 'Dividend/Share', format: 'currency', category: 'dividend', screeners: EQUITY },
  { name: 'dividend_payout_ratio_ttm', label: 'Payout Ratio %', format: 'percent', category: 'dividend', screeners: EQUITY },
  { name: 'dps_common_stock_prim_issue_fy', label: 'Annual Dividend', format: 'currency', category: 'dividend', screeners: EQUITY },

  // ---- EARNINGS ----
  { name: 'earnings_per_share_basic_ttm', label: 'EPS (TTM)', format: 'currency', category: 'earnings', screeners: EQUITY },
  { name: 'earnings_per_share_fwd', label: 'EPS (FWD)', format: 'currency', category: 'earnings', screeners: EQUITY },
  { name: 'earnings_per_share_diluted_ttm', label: 'EPS Diluted', format: 'currency', category: 'earnings', screeners: EQUITY },
  { name: 'revenue_growth_quarterly', label: 'Revenue Growth (Q)', format: 'percent', category: 'earnings', screeners: EQUITY },
  { name: 'earnings_release_date', label: 'Earnings Date', format: 'date', category: 'earnings', screeners: EQUITY },
  { name: 'earnings_per_share_surprise_percent_ttm', label: 'EPS Surprise %', format: 'percent', category: 'earnings', screeners: EQUITY },

  // ---- OSCILLATORS ----
  { name: 'RSI', label: 'RSI (14)', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'RSI7', label: 'RSI (7)', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'MACD.macd', label: 'MACD Line', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'MACD.signal', label: 'MACD Signal', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'Stoch.K', label: 'Stochastic %K', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'Stoch.D', label: 'Stochastic %D', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'CCI20', label: 'CCI (20)', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'ADX', label: 'ADX (14)', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'ADX+DI', label: 'ADX +DI', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'ADX-DI', label: 'ADX -DI', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'ATR', label: 'ATR (14)', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'Mom', label: 'Momentum (10)', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'W.R', label: 'Williams %R', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'AO', label: 'Awesome Oscillator', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'UO', label: 'Ultimate Oscillator', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'Ichimoku.BLine', label: 'Ichimoku Base', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'Ichimoku.CLine', label: 'Ichimoku Conversion', format: 'number', category: 'oscillator', screeners: ALL },
  { name: 'VWMA', label: 'VWMA', format: 'number', category: 'oscillator', screeners: NO_BOND },
  { name: 'HullMA9', label: 'Hull MA (9)', format: 'number', category: 'oscillator', screeners: ALL },

  // ---- MOVING AVERAGES ----
  { name: 'SMA5', label: 'SMA 5', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'SMA10', label: 'SMA 10', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'SMA20', label: 'SMA 20', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'SMA30', label: 'SMA 30', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'SMA50', label: 'SMA 50', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'SMA100', label: 'SMA 100', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'SMA200', label: 'SMA 200', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA5', label: 'EMA 5', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA10', label: 'EMA 10', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA20', label: 'EMA 20', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA30', label: 'EMA 30', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA50', label: 'EMA 50', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA100', label: 'EMA 100', format: 'number', category: 'moving_average', screeners: ALL },
  { name: 'EMA200', label: 'EMA 200', format: 'number', category: 'moving_average', screeners: ALL },

  // ---- BOLLINGER BANDS ----
  { name: 'BB.upper', label: 'BB Upper (20)', format: 'number', category: 'bollinger', screeners: ALL },
  { name: 'BB.lower', label: 'BB Lower (20)', format: 'number', category: 'bollinger', screeners: ALL },
  { name: 'BB.basis', label: 'BB Basis (20)', format: 'number', category: 'bollinger', screeners: ALL },

  // ---- PIVOT POINTS ----
  { name: 'Pivot.M.Classic.Middle', label: 'Pivot', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Classic.R1', label: 'Pivot R1', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Classic.R2', label: 'Pivot R2', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Classic.R3', label: 'Pivot R3', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Classic.S1', label: 'Pivot S1', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Classic.S2', label: 'Pivot S2', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Classic.S3', label: 'Pivot S3', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.Middle', label: 'Fib Pivot', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.R1', label: 'Fib R1', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.R2', label: 'Fib R2', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.R3', label: 'Fib R3', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.S1', label: 'Fib S1', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.S2', label: 'Fib S2', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Fibonacci.S3', label: 'Fib S3', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Camarilla.R1', label: 'Camarilla R1', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Camarilla.R2', label: 'Camarilla R2', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Camarilla.R3', label: 'Camarilla R3', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Camarilla.S1', label: 'Camarilla S1', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Camarilla.S2', label: 'Camarilla S2', format: 'number', category: 'pivot', screeners: ALL },
  { name: 'Pivot.M.Camarilla.S3', label: 'Camarilla S3', format: 'number', category: 'pivot', screeners: ALL },

  // ---- PERFORMANCE ----
  { name: 'Perf.W', label: '1 Week %', format: 'percent', category: 'performance', screeners: ALL },
  { name: 'Perf.1M', label: '1 Month %', format: 'percent', category: 'performance', screeners: ALL },
  { name: 'Perf.3M', label: '3 Months %', format: 'percent', category: 'performance', screeners: ALL },
  { name: 'Perf.6M', label: '6 Months %', format: 'percent', category: 'performance', screeners: ALL },
  { name: 'Perf.YTD', label: 'YTD %', format: 'percent', category: 'performance', screeners: ALL },
  { name: 'Perf.Y', label: '1 Year %', format: 'percent', category: 'performance', screeners: ALL },
  { name: 'Perf.5Y', label: '5 Years %', format: 'percent', category: 'performance', screeners: EQUITY },
  { name: 'Perf.All', label: 'All Time %', format: 'percent', category: 'performance', screeners: ALL },

  // ---- VOLATILITY ----
  { name: 'Volatility.D', label: 'Volatility (Day)', format: 'percent', category: 'volatility', screeners: ALL },
  { name: 'Volatility.W', label: 'Volatility (Week)', format: 'percent', category: 'volatility', screeners: ALL },
  { name: 'Volatility.M', label: 'Volatility (Month)', format: 'percent', category: 'volatility', screeners: ALL },

  // ---- RECOMMENDATIONS ----
  { name: 'Recommend.All', label: 'Overall Rating', format: 'rating', category: 'recommendation', screeners: ALL },
  { name: 'Recommend.MA', label: 'MA Rating', format: 'rating', category: 'recommendation', screeners: ALL },
  { name: 'Recommend.Other', label: 'Oscillator Rating', format: 'rating', category: 'recommendation', screeners: ALL },

  // ---- INFO ----
  { name: 'name', label: 'Ticker', format: 'text', category: 'info', screeners: ALL },
  { name: 'description', label: 'Name', format: 'text', category: 'info', screeners: ALL },
  { name: 'exchange', label: 'Exchange', format: 'text', category: 'info', screeners: ALL },
  { name: 'sector', label: 'Sector', format: 'text', category: 'info', screeners: EQUITY },
  { name: 'industry', label: 'Industry', format: 'text', category: 'info', screeners: EQUITY },
  { name: 'type', label: 'Type', format: 'text', category: 'info', screeners: ALL },
  { name: 'country', label: 'Country', format: 'text', category: 'info', screeners: EQUITY },
  { name: 'currency', label: 'Currency', format: 'text', category: 'info', screeners: ALL },

  // ---- BOND-SPECIFIC ----
  { name: 'yield_recent', label: 'Yield', format: 'percent', category: 'price', screeners: ['bond'] },
  { name: 'coupon', label: 'Coupon', format: 'percent', category: 'price', screeners: ['bond'] },
];

// ---- HELPER FUNCTIONS ----

export function getFieldsForScreener(type: ScreenerType): FieldDef[] {
  return ALL_FIELDS.filter(f => f.screeners.includes(type));
}

export function getFieldsByCategory(type: ScreenerType, category: FieldCategory): FieldDef[] {
  return ALL_FIELDS.filter(f => f.screeners.includes(type) && f.category === category);
}

export function getCategoriesForScreener(type: ScreenerType): FieldCategory[] {
  const cats = new Set<FieldCategory>();
  ALL_FIELDS.filter(f => f.screeners.includes(type)).forEach(f => cats.add(f.category));
  return Array.from(cats);
}

export function searchFields(query: string, type?: ScreenerType): FieldDef[] {
  const q = query.toLowerCase();
  return ALL_FIELDS.filter(f => {
    if (type && !f.screeners.includes(type)) return false;
    return f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q);
  });
}

export function getNumericFields(type: ScreenerType): FieldDef[] {
  return getFieldsForScreener(type).filter(f => f.format !== 'text' && f.format !== 'date');
}

// Apply time interval suffix to a field name
export function withInterval(fieldName: string, interval: string): string {
  if (!interval || interval === '1D') return fieldName;
  return `${fieldName}|${interval}`;
}
