// ============================================
// Financial Statement Fields for TradingView Screener
// Matching tvscreener stock.py field definitions
// Balance Sheet, Income Statement, Cash Flow, Growth, Ratios
// ============================================

import { FieldDef, ScreenerType } from './fields';

const EQUITY: ScreenerType[] = ['stock'];

// ---- BALANCE SHEET ----
export const BALANCE_SHEET_FIELDS: FieldDef[] = [
  // Assets
  { name: 'total_assets', label: 'Total Assets (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_current_assets', label: 'Current Assets (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'cash_n_equivalents_fq', label: 'Cash & Equivalents (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'cash_n_equivalents_fy', label: 'Cash & Equivalents (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'cash_n_short_term_invest_fq', label: 'Cash & ST Invest (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'cash_n_short_term_invest_fy', label: 'Cash & ST Invest (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'accounts_receivables_gross', label: 'Accounts Receivable', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'inventories', label: 'Inventory', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'property_plant_equipment_net', label: 'PP&E (Net)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'goodwill', label: 'Goodwill', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'goodwill_fq', label: 'Goodwill (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'goodwill_fy', label: 'Goodwill (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'intangibles', label: 'Intangible Assets', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'other_assets_total', label: 'Other Assets', format: 'number', category: 'balance_sheet', screeners: EQUITY },

  // Liabilities
  { name: 'total_liabilities_fq', label: 'Total Liabilities (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_liabilities_fy', label: 'Total Liabilities (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_current_liabilities_fq', label: 'Current Liabilities (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'accounts_payable', label: 'Accounts Payable', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'long_term_debt_fq', label: 'Long-term Debt (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'long_term_debt_fy', label: 'Long-term Debt (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'short_term_debt_fq', label: 'Short-term Debt (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'short_term_debt_fy', label: 'Short-term Debt (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_debt', label: 'Total Debt', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'net_debt', label: 'Net Debt (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },

  // Equity
  { name: 'total_equity_fq', label: 'Total Equity (MRQ)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_equity_fy', label: 'Total Equity (FY)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'retained_earnings', label: 'Retained Earnings', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_common_equity', label: 'Common Equity', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'book_value_per_share_fq', label: 'Book Value/Share', format: 'currency', category: 'balance_sheet', screeners: EQUITY },
  { name: 'tangible_book_value_per_share_fq', label: 'Tangible BV/Share', format: 'currency', category: 'balance_sheet', screeners: EQUITY },

  // Growth
  { name: 'total_assets_yoy_growth_fy', label: 'Assets Growth YoY (FY)', format: 'percent', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_assets_qoq_growth_fq', label: 'Assets Growth QoQ', format: 'percent', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_assets_yoy_growth_fq', label: 'Assets Growth YoY (Q)', format: 'percent', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_debt_yoy_growth_fy', label: 'Debt Growth YoY (FY)', format: 'percent', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_debt_qoq_growth_fq', label: 'Debt Growth QoQ', format: 'percent', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_debt_yoy_growth_fq', label: 'Debt Growth YoY (Q)', format: 'percent', category: 'balance_sheet', screeners: EQUITY },
];

// ---- INCOME STATEMENT ----
export const INCOME_STATEMENT_FIELDS: FieldDef[] = [
  { name: 'total_revenue', label: 'Revenue (FY)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'last_annual_revenue', label: 'Last Year Revenue (FY)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'cost_of_revenue', label: 'Cost of Revenue (COGS)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'gross_profit', label: 'Gross Profit (FY)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'gross_profit_fq', label: 'Gross Profit (MRQ)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'operating_expenses_total', label: 'Operating Expenses', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'oper_income_fy', label: 'Operating Income (FY)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'oper_income_ttm', label: 'Operating Income (TTM)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'ebitda', label: 'EBITDA (TTM)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'net_income', label: 'Net Income (FY)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'interest_expense', label: 'Interest Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'tax_provision', label: 'Tax Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'research_and_dev_fy', label: 'R&D Expense (FY)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'research_and_dev_fq', label: 'R&D Expense (MRQ)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'selling_general_n_admin', label: 'SG&A Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'basic_eps_net_income', label: 'Basic EPS (FY)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_basic_ttm', label: 'Basic EPS (TTM)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'last_annual_eps', label: 'EPS Diluted (FY)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_diluted_ttm', label: 'EPS Diluted (TTM)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_fq', label: 'EPS Diluted (MRQ)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_forecast_next_fq', label: 'EPS Forecast (MRQ)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'revenue_per_employee', label: 'Revenue per Employee (FY)', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'revenue_forecast_fq', label: 'Revenue Estimate (MRQ)', format: 'currency', category: 'income_statement', screeners: EQUITY },

  // Revenue Growth
  { name: 'total_revenue_yoy_growth_fy', label: 'Revenue Growth YoY (FY)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'total_revenue_qoq_growth_fq', label: 'Revenue Growth QoQ', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'total_revenue_yoy_growth_fq', label: 'Revenue Growth YoY (Q)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'total_revenue_yoy_growth_ttm', label: 'Revenue Growth YoY (TTM)', format: 'percent', category: 'income_statement', screeners: EQUITY },

  // Earnings Growth
  { name: 'earnings_per_share_diluted_yoy_growth_fy', label: 'EPS Growth YoY (FY)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_diluted_qoq_growth_fq', label: 'EPS Growth QoQ', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_diluted_yoy_growth_fq', label: 'EPS Growth YoY (Q)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'earnings_per_share_diluted_yoy_growth_ttm', label: 'EPS Growth YoY (TTM)', format: 'percent', category: 'income_statement', screeners: EQUITY },

  // EBITDA Growth
  { name: 'ebitda_yoy_growth_fy', label: 'EBITDA Growth YoY (FY)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'ebitda_qoq_growth_fq', label: 'EBITDA Growth QoQ', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'ebitda_yoy_growth_fq', label: 'EBITDA Growth YoY (Q)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'ebitda_yoy_growth_ttm', label: 'EBITDA Growth YoY (TTM)', format: 'percent', category: 'income_statement', screeners: EQUITY },

  // Gross Profit Growth
  { name: 'gross_profit_yoy_growth_fy', label: 'Gross Profit Growth YoY (FY)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'gross_profit_qoq_growth_fq', label: 'Gross Profit Growth QoQ', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'gross_profit_yoy_growth_fq', label: 'Gross Profit Growth YoY (Q)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'gross_profit_yoy_growth_ttm', label: 'Gross Profit Growth YoY (TTM)', format: 'percent', category: 'income_statement', screeners: EQUITY },

  // Net Income Growth
  { name: 'net_income_yoy_growth_fy', label: 'Net Income Growth YoY (FY)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'net_income_qoq_growth_fq', label: 'Net Income Growth QoQ', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'net_income_yoy_growth_fq', label: 'Net Income Growth YoY (Q)', format: 'percent', category: 'income_statement', screeners: EQUITY },
  { name: 'net_income_yoy_growth_ttm', label: 'Net Income Growth YoY (TTM)', format: 'percent', category: 'income_statement', screeners: EQUITY },
];

// ---- CASH FLOW ----
export const CASH_FLOW_FIELDS: FieldDef[] = [
  { name: 'cash_f_operating_activities_ttm', label: 'Operating Cash Flow (TTM)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'cash_f_operating_activities_fy', label: 'Operating Cash Flow (FY)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'capital_expenditures_ttm', label: 'CapEx (TTM)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'capital_expenditures_fy', label: 'CapEx (FY)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'capital_expenditures_fq', label: 'CapEx (MRQ)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'capital_expenditures_yoy_growth_fy', label: 'CapEx Growth YoY', format: 'percent', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow', label: 'Free Cash Flow', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow_ttm', label: 'Free Cash Flow (TTM)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow_fy', label: 'Free Cash Flow (FY)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'cash_f_investing_activities_ttm', label: 'Cash from Investing (TTM)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'cash_f_investing_activities_fy', label: 'Cash from Investing (FY)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'cash_f_financing_activities_ttm', label: 'Cash from Financing (TTM)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'cash_f_financing_activities_fy', label: 'Cash from Financing (FY)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'dividends_paid', label: 'Dividends Paid (FY)', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'total_cash_dividends_paid_ttm', label: 'Dividends Paid (TTM)', format: 'number', category: 'cash_flow', screeners: EQUITY },

  // FCF Growth
  { name: 'free_cash_flow_yoy_growth_fy', label: 'FCF Growth YoY (FY)', format: 'percent', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow_qoq_growth_fq', label: 'FCF Growth QoQ', format: 'percent', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow_yoy_growth_fq', label: 'FCF Growth YoY (Q)', format: 'percent', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow_yoy_growth_ttm', label: 'FCF Growth YoY (TTM)', format: 'percent', category: 'cash_flow', screeners: EQUITY },

  // Margins
  { name: 'free_cash_flow_margin_fy', label: 'FCF Margin (FY)', format: 'percent', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow_margin_ttm', label: 'FCF Margin (TTM)', format: 'percent', category: 'cash_flow', screeners: EQUITY },
];

// ---- GROWTH & RATIOS ----
export const GROWTH_FIELDS: FieldDef[] = [
  // Margins
  { name: 'gross_margin', label: 'Gross Margin (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'gross_profit_margin_fy', label: 'Gross Margin (FY)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'operating_margin', label: 'Operating Margin (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'oper_income_margin_fy', label: 'Operating Margin (FY)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'after_tax_margin', label: 'Net Margin (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'net_income_bef_disc_oper_margin_fy', label: 'Net Margin (FY)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'ebitda_margin_ttm', label: 'EBITDA Margin (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'ebitda_margin_fy', label: 'EBITDA Margin (FY)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'pre_tax_margin', label: 'Pretax Margin (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },

  // Returns
  { name: 'return_on_equity', label: 'ROE (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_equity_fq', label: 'ROE (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_assets', label: 'ROA (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_assets_fq', label: 'ROA (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_invested_capital', label: 'ROIC (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_invested_capital_fq', label: 'ROIC (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_common_equity_ttm', label: 'ROCE (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_capital_employed_fq', label: 'ROCE (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_total_capital_fq', label: 'Return on Total Capital (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_tang_assets_fq', label: 'Return on Tang. Assets (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'return_on_tang_equity_fq', label: 'Return on Tang. Equity (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },

  // Debt Ratios
  { name: 'debt_to_equity', label: 'Debt/Equity', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'current_ratio', label: 'Current Ratio', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'current_ratio_fq', label: 'Current Ratio (MRQ)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'quick_ratio', label: 'Quick Ratio', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'quick_ratio_fq', label: 'Quick Ratio (MRQ)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'net_debt_to_ebitda_fq', label: 'Net Debt/EBITDA (MRQ)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'debt_to_revenue_ttm', label: 'Debt/Revenue (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'debt_to_asset_fq', label: 'Debt/Assets (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'shrhldrs_equity_to_total_assets_fq', label: 'Equity/Assets (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'cash_n_short_term_invest_to_total_debt_fq', label: 'Cash/Debt (MRQ)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'total_debt_to_capital_fq', label: 'Debt/Capital (MRQ)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'interst_cover_ttm', label: 'Interest Coverage (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'ebitda_interst_cover_ttm', label: 'EBITDA Interest Coverage (TTM)', format: 'number', category: 'growth', screeners: EQUITY },

  // Efficiency
  { name: 'invent_turnover_current', label: 'Inventory Turnover', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'asset_turnover_current', label: 'Asset Turnover', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'receivables_turnover_current', label: 'Receivables Turnover', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'research_and_dev_ratio_ttm', label: 'R&D Ratio (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'sell_gen_admin_exp_other_ratio_ttm', label: 'SG&A Ratio (TTM)', format: 'percent', category: 'growth', screeners: EQUITY },

  // Valuation extras
  { name: 'earnings_yield', label: 'Earnings Yield %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'price_target_average', label: 'Target Price (Average)', format: 'currency', category: 'growth', screeners: EQUITY },
  { name: 'enterprise_value_to_ebit_ttm', label: 'EV/EBIT (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'enterprise_value_to_revenue_ttm', label: 'EV/Revenue (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'price_revenue_ttm', label: 'P/Revenue (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'price_to_cash_f_operating_activities_ttm', label: 'P/Cash Flow (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'price_to_cash_ratio', label: 'P/Cash Ratio', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'price_earnings_growth_ttm', label: 'PEG Ratio (TTM)', format: 'number', category: 'growth', screeners: EQUITY },

  // Dividend extras
  { name: 'continuous_dividend_growth', label: 'Consecutive Div Growth (Y)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'continuous_dividend_payout', label: 'Consecutive Div Payout (Y)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'dividends_yield', label: 'Dividend Yield %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'dividends_yield_current', label: 'Dividend Yield Current %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'cash_dividend_coverage_ratio_ttm', label: 'Cash Div Coverage (TTM)', format: 'number', category: 'growth', screeners: EQUITY },
  { name: 'dps_common_stock_prim_issue_yoy_growth_fy', label: 'DPS Growth YoY', format: 'percent', category: 'growth', screeners: EQUITY },
];

export const ALL_FINANCIAL_FIELDS: FieldDef[] = [
  ...BALANCE_SHEET_FIELDS,
  ...INCOME_STATEMENT_FIELDS,
  ...CASH_FLOW_FIELDS,
  ...GROWTH_FIELDS,
];
