// ============================================
// Screener Presets & Strategy Templates
// Matching tvscreener library presets
// ============================================

import { FieldDef, ALL_FIELDS, ScreenerType } from './fields';

// ---- FIELD PRESETS (curated column groups) ----

export interface FieldPreset {
  id: string;
  label: string;
  screeners: ScreenerType[];
  fieldNames: string[];
}

export const FIELD_PRESETS: FieldPreset[] = [
  // Stock Presets
  { id: 'stock_price', label: 'Price Overview', screeners: ['stock'], fieldNames: ['description', 'close', 'change', 'volume', 'market_cap_basic', 'relative_volume_10d_calc'] },
  { id: 'stock_valuation', label: 'Valuation', screeners: ['stock'], fieldNames: ['description', 'close', 'price_earnings_ttm', 'price_book_fq', 'price_sales_current', 'enterprise_value_ebitda_ttm', 'market_cap_basic'] },
  { id: 'stock_dividend', label: 'Dividends', screeners: ['stock'], fieldNames: ['description', 'close', 'dividend_yield_recent', 'dividends_per_share_fq', 'dividend_payout_ratio_ttm'] },
  { id: 'stock_profitability', label: 'Profitability', screeners: ['stock'], fieldNames: ['description', 'close', 'return_on_equity', 'return_on_assets', 'gross_margin', 'net_margin', 'operating_margin'] },
  { id: 'stock_performance', label: 'Performance', screeners: ['stock'], fieldNames: ['description', 'close', 'change', 'Perf.W', 'Perf.1M', 'Perf.3M', 'Perf.6M', 'Perf.YTD', 'Perf.Y'] },
  { id: 'stock_oscillators', label: 'Oscillators', screeners: ['stock'], fieldNames: ['description', 'close', 'RSI', 'MACD.macd', 'MACD.signal', 'Stoch.K', 'Stoch.D', 'CCI20', 'ADX', 'W.R', 'Mom'] },
  { id: 'stock_moving_avg', label: 'Moving Averages', screeners: ['stock'], fieldNames: ['description', 'close', 'SMA10', 'SMA20', 'SMA50', 'SMA100', 'SMA200', 'EMA20', 'EMA50', 'EMA200'] },
  { id: 'stock_earnings', label: 'Earnings', screeners: ['stock'], fieldNames: ['description', 'close', 'earnings_per_share_basic_ttm', 'earnings_per_share_fwd', 'revenue_growth_quarterly', 'earnings_per_share_surprise_percent_ttm'] },
  { id: 'stock_volume', label: 'Volume Analysis', screeners: ['stock'], fieldNames: ['description', 'close', 'volume', 'average_volume_10d_calc', 'average_volume_30d_calc', 'relative_volume_10d_calc'] },
  { id: 'stock_bollinger', label: 'Bollinger Bands', screeners: ['stock'], fieldNames: ['description', 'close', 'BB.upper', 'BB.lower', 'BB.basis'] },
  { id: 'stock_pivot', label: 'Pivot Points', screeners: ['stock'], fieldNames: ['description', 'close', 'Pivot.M.Classic.Middle', 'Pivot.M.Classic.R1', 'Pivot.M.Classic.R2', 'Pivot.M.Classic.S1', 'Pivot.M.Classic.S2'] },

  // Financial Statement Presets
  { id: 'fin_balance_sheet', label: '📋 Balance Sheet', screeners: ['stock'], fieldNames: ['description', 'close', 'total_assets', 'total_current_assets', 'cash_n_equivalents_fq', 'total_liabilities_fq', 'total_current_liabilities_fq', 'long_term_debt_fq', 'total_debt', 'net_debt', 'total_equity_fq', 'book_value_per_share_fq'] },
  { id: 'fin_income_statement', label: '📊 Income Statement', screeners: ['stock'], fieldNames: ['description', 'close', 'total_revenue', 'cost_of_revenue', 'gross_profit', 'oper_income_ttm', 'ebitda', 'net_income', 'earnings_per_share_basic_ttm', 'earnings_per_share_diluted_ttm', 'interest_expense', 'tax_provision'] },
  { id: 'fin_cash_flow', label: '💰 Cash Flow', screeners: ['stock'], fieldNames: ['description', 'close', 'cash_f_operating_activities_ttm', 'capital_expenditures_ttm', 'free_cash_flow_ttm', 'cash_f_investing_activities_ttm', 'cash_f_financing_activities_ttm', 'dividends_paid', 'free_cash_flow_margin_ttm'] },
  { id: 'fin_margins_ratios', label: '📐 Margins & Ratios', screeners: ['stock'], fieldNames: ['description', 'close', 'gross_margin', 'operating_margin', 'after_tax_margin', 'ebitda_margin_ttm', 'return_on_equity', 'return_on_assets', 'return_on_invested_capital', 'debt_to_equity', 'current_ratio', 'quick_ratio'] },
  { id: 'fin_growth', label: '📈 Growth Metrics', screeners: ['stock'], fieldNames: ['description', 'close', 'total_revenue_yoy_growth_fy', 'total_revenue_yoy_growth_ttm', 'earnings_per_share_diluted_yoy_growth_fy', 'net_income_yoy_growth_fy', 'ebitda_yoy_growth_fy', 'gross_profit_yoy_growth_fy', 'free_cash_flow_yoy_growth_fy', 'total_assets_yoy_growth_fy'] },
  { id: 'fin_debt_analysis', label: '🏦 Debt Analysis', screeners: ['stock'], fieldNames: ['description', 'close', 'total_debt', 'net_debt', 'long_term_debt_fq', 'short_term_debt_fq', 'debt_to_equity', 'net_debt_to_ebitda_fq', 'debt_to_asset_fq', 'debt_to_revenue_ttm', 'interst_cover_ttm', 'cash_n_short_term_invest_to_total_debt_fq'] },
  { id: 'fin_efficiency', label: '⚙️ Efficiency', screeners: ['stock'], fieldNames: ['description', 'close', 'asset_turnover_current', 'invent_turnover_current', 'receivables_turnover_current', 'revenue_per_employee', 'research_and_dev_ratio_ttm', 'sell_gen_admin_exp_other_ratio_ttm'] },
  { id: 'fin_per_share', label: '📌 Per Share Data', screeners: ['stock'], fieldNames: ['description', 'close', 'earnings_per_share_basic_ttm', 'earnings_per_share_diluted_ttm', 'earnings_per_share_fq', 'book_value_per_share_fq', 'tangible_book_value_per_share_fq', 'dividends_per_share_fq', 'revenue_per_employee'] },

  // Crypto Presets
  { id: 'crypto_price', label: 'Price Overview', screeners: ['crypto', 'coin'], fieldNames: ['description', 'close', 'change', '24h_vol|5', 'market_cap_calc'] },
  { id: 'crypto_technical', label: 'Technical', screeners: ['crypto', 'coin'], fieldNames: ['description', 'close', 'RSI', 'MACD.macd', 'Stoch.K', 'Recommend.All'] },
  { id: 'crypto_performance', label: 'Performance', screeners: ['crypto', 'coin'], fieldNames: ['description', 'close', 'change', 'Perf.W', 'Perf.1M', 'Perf.3M'] },

  // Forex Presets
  { id: 'forex_price', label: 'Price Overview', screeners: ['forex'], fieldNames: ['description', 'close', 'change', 'bid', 'ask', 'spread_raw'] },
  { id: 'forex_technical', label: 'Technical', screeners: ['forex'], fieldNames: ['description', 'close', 'RSI', 'MACD.macd', 'Stoch.K', 'ADX', 'ATR', 'Recommend.All'] },
  { id: 'forex_performance', label: 'Performance', screeners: ['forex'], fieldNames: ['description', 'close', 'change', 'Perf.W', 'Perf.1M', 'Perf.3M'] },

  // Bond Presets
  { id: 'bond_basic', label: 'Basic', screeners: ['bond'], fieldNames: ['description', 'close', 'change', 'yield_recent', 'coupon'] },
  { id: 'bond_yield', label: 'Yield Analysis', screeners: ['bond'], fieldNames: ['description', 'close', 'yield_recent', 'coupon', 'RSI', 'Recommend.All'] },

  // Futures Presets
  { id: 'futures_price', label: 'Price Overview', screeners: ['futures'], fieldNames: ['description', 'close', 'change', 'volume', 'open_interest', 'high', 'low'] },
  { id: 'futures_technical', label: 'Technical', screeners: ['futures'], fieldNames: ['description', 'close', 'RSI', 'MACD.macd', 'Stoch.K', 'ADX', 'Recommend.All'] },
];

// ---- STRATEGY PRESETS (filter + field combos) ----

export interface StrategyPreset {
  id: string;
  label: string;
  emoji: string;
  screeners: ScreenerType[];
  category: 'momentum' | 'value' | 'technical' | 'volume' | 'dividend' | 'financial' | 'custom';
  description: string;
  filters: { field: string; operator: string; value: any }[];
  columns: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  // ---- MOMENTUM ----
  {
    id: 'top_gainers', label: 'Top Gainers', emoji: '🚀', screeners: ['stock', 'crypto', 'coin'],
    category: 'momentum', description: 'Biggest price gainers today (>3%)',
    filters: [{ field: 'change', operator: '>', value: 3 }],
    columns: ['description', 'close', 'change', 'volume', 'RSI', 'Recommend.All'],
    sort: { field: 'change', direction: 'desc' },
  },
  {
    id: 'top_losers', label: 'Top Losers', emoji: '📉', screeners: ['stock', 'crypto', 'coin'],
    category: 'momentum', description: 'Biggest price losers today (<-3%)',
    filters: [{ field: 'change', operator: '<', value: -3 }],
    columns: ['description', 'close', 'change', 'volume', 'RSI', 'Recommend.All'],
    sort: { field: 'change', direction: 'asc' },
  },
  {
    id: 'hot_movers_crypto', label: 'Hot Movers (>10%)', emoji: '🔥', screeners: ['crypto', 'coin'],
    category: 'momentum', description: 'Crypto with >10% change in 24h',
    filters: [{ field: 'change', operator: '>', value: 10 }],
    columns: ['description', 'close', 'change', '24h_vol|5', 'RSI'],
    sort: { field: 'change', direction: 'desc' },
  },

  // ---- TECHNICAL - OVERSOLD/OVERBOUGHT ----
  {
    id: 'oversold', label: 'Oversold (RSI < 30)', emoji: '📊', screeners: ['stock', 'crypto', 'forex', 'coin'],
    category: 'technical', description: 'RSI below 30 - potential bounce',
    filters: [{ field: 'RSI', operator: '<', value: 30 }],
    columns: ['description', 'close', 'change', 'RSI', 'MACD.macd', 'Stoch.K', 'Recommend.All'],
    sort: { field: 'RSI', direction: 'asc' },
  },
  {
    id: 'overbought', label: 'Overbought (RSI > 70)', emoji: '⚠️', screeners: ['stock', 'crypto', 'forex', 'coin'],
    category: 'technical', description: 'RSI above 70 - potential pullback',
    filters: [{ field: 'RSI', operator: '>', value: 70 }],
    columns: ['description', 'close', 'change', 'RSI', 'MACD.macd', 'Stoch.K', 'Recommend.All'],
    sort: { field: 'RSI', direction: 'desc' },
  },
  {
    id: 'oversold_volume', label: 'Oversold + High Vol', emoji: '💎', screeners: ['stock'],
    category: 'technical', description: 'RSI < 30 with above-average volume',
    filters: [
      { field: 'RSI', operator: '<', value: 30 },
      { field: 'relative_volume_10d_calc', operator: '>', value: 1.5 },
    ],
    columns: ['description', 'close', 'change', 'volume', 'relative_volume_10d_calc', 'RSI', 'MACD.macd'],
    sort: { field: 'RSI', direction: 'asc' },
  },

  // ---- TECHNICAL - MOVING AVERAGES ----
  {
    id: 'golden_cross', label: 'Golden Cross Zone', emoji: '✨', screeners: ['stock', 'crypto'],
    category: 'technical', description: 'Price above SMA50, SMA50 near SMA200',
    filters: [
      { field: 'close', operator: '>', value: 0 }, // placeholder - real filter would be close > SMA50
    ],
    columns: ['description', 'close', 'change', 'SMA50', 'SMA200', 'RSI', 'volume'],
    sort: { field: 'change', direction: 'desc' },
  },
  {
    id: 'above_sma200', label: 'Above SMA 200', emoji: '📈', screeners: ['stock', 'crypto', 'forex'],
    category: 'technical', description: 'Stocks trading above 200-day SMA',
    filters: [],
    columns: ['description', 'close', 'change', 'SMA200', 'RSI', 'Perf.1M', 'volume'],
    sort: { field: 'market_cap_basic', direction: 'desc' },
  },

  // ---- TECHNICAL - STRONG SIGNALS ----
  {
    id: 'strong_buy', label: 'Strong Buy Signal', emoji: '🟢', screeners: ['stock', 'crypto', 'forex'],
    category: 'technical', description: 'Overall technical rating: Strong Buy',
    filters: [{ field: 'Recommend.All', operator: '>', value: 0.5 }],
    columns: ['description', 'close', 'change', 'Recommend.All', 'Recommend.MA', 'Recommend.Other', 'RSI'],
    sort: { field: 'Recommend.All', direction: 'desc' },
  },
  {
    id: 'strong_sell', label: 'Strong Sell Signal', emoji: '🔴', screeners: ['stock', 'crypto', 'forex'],
    category: 'technical', description: 'Overall technical rating: Strong Sell',
    filters: [{ field: 'Recommend.All', operator: '<', value: -0.5 }],
    columns: ['description', 'close', 'change', 'Recommend.All', 'Recommend.MA', 'Recommend.Other', 'RSI'],
    sort: { field: 'Recommend.All', direction: 'asc' },
  },

  // ---- VOLUME ----
  {
    id: 'volume_spike', label: 'Volume Spike', emoji: '🌊', screeners: ['stock'],
    category: 'volume', description: 'Unusual volume (>2x average)',
    filters: [{ field: 'relative_volume_10d_calc', operator: '>', value: 2.0 }],
    columns: ['description', 'close', 'change', 'volume', 'relative_volume_10d_calc', 'average_volume_10d_calc', 'RSI'],
    sort: { field: 'relative_volume_10d_calc', direction: 'desc' },
  },
  {
    id: 'high_volume_breakout', label: 'High Volume Breakout', emoji: '💥', screeners: ['stock'],
    category: 'volume', description: 'Rising price + high relative volume',
    filters: [
      { field: 'change', operator: '>', value: 2 },
      { field: 'relative_volume_10d_calc', operator: '>', value: 2.0 },
    ],
    columns: ['description', 'close', 'change', 'volume', 'relative_volume_10d_calc', 'RSI', 'SMA50'],
    sort: { field: 'change', direction: 'desc' },
  },

  // ---- VALUE ----
  {
    id: 'value_stocks', label: 'Value Stocks', emoji: '💰', screeners: ['stock'],
    category: 'value', description: 'Low P/E with positive earnings',
    filters: [
      { field: 'price_earnings_ttm', operator: '>', value: 0 },
      { field: 'price_earnings_ttm', operator: '<', value: 15 },
    ],
    columns: ['description', 'close', 'change', 'price_earnings_ttm', 'price_book_fq', 'dividend_yield_recent', 'market_cap_basic'],
    sort: { field: 'price_earnings_ttm', direction: 'asc' },
  },
  {
    id: 'growth_stocks', label: 'Growth Stocks', emoji: '🌱', screeners: ['stock'],
    category: 'value', description: 'High revenue growth with strong margins',
    filters: [
      { field: 'revenue_growth_quarterly', operator: '>', value: 20 },
    ],
    columns: ['description', 'close', 'change', 'revenue_growth_quarterly', 'gross_margin', 'market_cap_basic', 'price_earnings_ttm'],
    sort: { field: 'revenue_growth_quarterly', direction: 'desc' },
  },
  {
    id: 'large_cap', label: 'Large Cap (>$10B)', emoji: '🏢', screeners: ['stock'],
    category: 'value', description: 'Companies with market cap over $10B',
    filters: [{ field: 'market_cap_basic', operator: '>', value: 10000000000 }],
    columns: ['description', 'close', 'change', 'market_cap_basic', 'price_earnings_ttm', 'volume'],
    sort: { field: 'market_cap_basic', direction: 'desc' },
  },

  // ---- DIVIDEND ----
  {
    id: 'high_dividend', label: 'High Dividend Yield', emoji: '💵', screeners: ['stock'],
    category: 'dividend', description: 'Dividend yield > 4%',
    filters: [{ field: 'dividend_yield_recent', operator: '>', value: 4 }],
    columns: ['description', 'close', 'dividend_yield_recent', 'dividends_per_share_fq', 'dividend_payout_ratio_ttm', 'price_earnings_ttm'],
    sort: { field: 'dividend_yield_recent', direction: 'desc' },
  },
  {
    id: 'sustainable_dividend', label: 'Sustainable Dividend', emoji: '🌿', screeners: ['stock'],
    category: 'dividend', description: 'Good yield with safe payout ratio',
    filters: [
      { field: 'dividend_yield_recent', operator: '>', value: 2 },
      { field: 'dividend_payout_ratio_ttm', operator: '<', value: 60 },
    ],
    columns: ['description', 'close', 'dividend_yield_recent', 'dividend_payout_ratio_ttm', 'return_on_equity', 'debt_to_equity'],
    sort: { field: 'dividend_yield_recent', direction: 'desc' },
  },

  // ---- CUSTOM / SPECIAL ----
  {
    id: 'most_volatile', label: 'Most Volatile', emoji: '⚡', screeners: ['stock', 'crypto'],
    category: 'custom', description: 'Highest daily volatility',
    filters: [{ field: 'Volatility.D', operator: '>', value: 3 }],
    columns: ['description', 'close', 'change', 'Volatility.D', 'Volatility.W', 'ATR', 'volume'],
    sort: { field: 'Volatility.D', direction: 'desc' },
  },
  {
    id: 'best_monthly', label: 'Best Month Performers', emoji: '🏆', screeners: ['stock', 'crypto', 'forex'],
    category: 'custom', description: 'Top monthly performers',
    filters: [{ field: 'Perf.1M', operator: '>', value: 10 }],
    columns: ['description', 'close', 'change', 'Perf.W', 'Perf.1M', 'Perf.3M', 'RSI'],
    sort: { field: 'Perf.1M', direction: 'desc' },
  },

  // ---- FINANCIAL STATEMENT STRATEGIES ----
  {
    id: 'strong_balance_sheet', label: 'Strong Balance Sheet', emoji: '🏦', screeners: ['stock'],
    category: 'financial', description: 'Low debt, high equity, strong current ratio',
    filters: [
      { field: 'current_ratio', operator: '>', value: 1.5 },
      { field: 'debt_to_equity', operator: '<', value: 0.5 },
    ],
    columns: ['description', 'close', 'total_assets', 'total_liabilities_fq', 'total_equity_fq', 'current_ratio', 'debt_to_equity', 'net_debt', 'cash_n_equivalents_fq'],
    sort: { field: 'market_cap_basic', direction: 'desc' },
  },
  {
    id: 'cash_rich', label: 'Cash Rich Companies', emoji: '💎', screeners: ['stock'],
    category: 'financial', description: 'High cash reserves relative to debt',
    filters: [
      { field: 'cash_n_short_term_invest_to_total_debt_fq', operator: '>', value: 1 },
    ],
    columns: ['description', 'close', 'cash_n_equivalents_fq', 'cash_n_short_term_invest_fq', 'total_debt', 'net_debt', 'cash_n_short_term_invest_to_total_debt_fq', 'market_cap_basic'],
    sort: { field: 'cash_n_short_term_invest_to_total_debt_fq', direction: 'desc' },
  },
  {
    id: 'high_profitability', label: 'High Profitability', emoji: '🏆', screeners: ['stock'],
    category: 'financial', description: 'ROE > 20%, high margins',
    filters: [
      { field: 'return_on_equity', operator: '>', value: 20 },
      { field: 'gross_margin', operator: '>', value: 40 },
    ],
    columns: ['description', 'close', 'return_on_equity', 'return_on_assets', 'return_on_invested_capital', 'gross_margin', 'operating_margin', 'after_tax_margin', 'ebitda_margin_ttm'],
    sort: { field: 'return_on_equity', direction: 'desc' },
  },
  {
    id: 'revenue_growth_machine', label: 'Revenue Growth Machine', emoji: '🚀', screeners: ['stock'],
    category: 'financial', description: 'Revenue growing >25% YoY with improving margins',
    filters: [
      { field: 'total_revenue_yoy_growth_fy', operator: '>', value: 25 },
    ],
    columns: ['description', 'close', 'total_revenue', 'total_revenue_yoy_growth_fy', 'total_revenue_yoy_growth_ttm', 'gross_profit_yoy_growth_fy', 'net_income_yoy_growth_fy', 'ebitda_yoy_growth_fy', 'gross_margin'],
    sort: { field: 'total_revenue_yoy_growth_fy', direction: 'desc' },
  },
  {
    id: 'fcf_powerhouse', label: 'FCF Powerhouse', emoji: '💸', screeners: ['stock'],
    category: 'financial', description: 'Strong free cash flow with high FCF margin',
    filters: [
      { field: 'free_cash_flow_margin_ttm', operator: '>', value: 15 },
    ],
    columns: ['description', 'close', 'free_cash_flow_ttm', 'free_cash_flow_margin_ttm', 'cash_f_operating_activities_ttm', 'capital_expenditures_ttm', 'free_cash_flow_yoy_growth_ttm', 'dividends_paid'],
    sort: { field: 'free_cash_flow_margin_ttm', direction: 'desc' },
  },
  {
    id: 'low_debt_high_return', label: 'Low Debt + High Return', emoji: '🎯', screeners: ['stock'],
    category: 'financial', description: 'D/E < 0.3, ROIC > 15%',
    filters: [
      { field: 'debt_to_equity', operator: '<', value: 0.3 },
      { field: 'return_on_invested_capital', operator: '>', value: 15 },
    ],
    columns: ['description', 'close', 'debt_to_equity', 'return_on_invested_capital', 'return_on_equity', 'net_debt_to_ebitda_fq', 'interst_cover_ttm', 'free_cash_flow_ttm'],
    sort: { field: 'return_on_invested_capital', direction: 'desc' },
  },
  {
    id: 'earnings_beat', label: 'EPS Growth Leaders', emoji: '📈', screeners: ['stock'],
    category: 'financial', description: 'EPS growing >30% YoY',
    filters: [
      { field: 'earnings_per_share_diluted_yoy_growth_fy', operator: '>', value: 30 },
    ],
    columns: ['description', 'close', 'earnings_per_share_basic_ttm', 'earnings_per_share_diluted_yoy_growth_fy', 'earnings_per_share_diluted_yoy_growth_ttm', 'net_income', 'net_income_yoy_growth_fy', 'price_earnings_ttm'],
    sort: { field: 'earnings_per_share_diluted_yoy_growth_fy', direction: 'desc' },
  },
  {
    id: 'full_financial_overview', label: 'Full Financial Overview', emoji: '📑', screeners: ['stock'],
    category: 'financial', description: 'Complete financial snapshot: Revenue, Income, FCF, Margins, Returns',
    filters: [],
    columns: ['description', 'close', 'total_revenue', 'gross_profit', 'net_income', 'ebitda', 'free_cash_flow_ttm', 'gross_margin', 'operating_margin', 'return_on_equity', 'debt_to_equity', 'current_ratio'],
    sort: { field: 'market_cap_basic', direction: 'desc' },
  },
];

export function getPresetsForScreener(type: ScreenerType): FieldPreset[] {
  return FIELD_PRESETS.filter(p => p.screeners.includes(type));
}

export function getStrategiesForScreener(type: ScreenerType): StrategyPreset[] {
  return STRATEGY_PRESETS.filter(s => s.screeners.includes(type));
}

export function getStrategyCategories(): string[] {
  return [...new Set(STRATEGY_PRESETS.map(s => s.category))];
}
