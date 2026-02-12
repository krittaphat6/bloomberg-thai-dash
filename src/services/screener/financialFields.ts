// ============================================
// Financial Statement Fields for TradingView Screener
// Balance Sheet, Income Statement, Cash Flow, Growth
// ============================================

import { FieldDef, ScreenerType } from './fields';

const EQUITY: ScreenerType[] = ['stock'];

// ---- BALANCE SHEET ----
export const BALANCE_SHEET_FIELDS: FieldDef[] = [
  // Assets
  { name: 'total_assets', label: 'Total Assets', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_current_assets', label: 'Current Assets', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'cash_n_short_term_invest', label: 'Cash & Equivalents', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'accounts_receivables_gross', label: 'Accounts Receivable', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'inventories', label: 'Inventory', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'property_plant_equipment_net', label: 'PP&E (Net)', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'goodwill', label: 'Goodwill', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'intangibles', label: 'Intangible Assets', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'other_assets_total', label: 'Other Assets', format: 'number', category: 'balance_sheet', screeners: EQUITY },

  // Liabilities
  { name: 'total_liabilities', label: 'Total Liabilities', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_current_liabilities', label: 'Current Liabilities', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'accounts_payable', label: 'Accounts Payable', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'long_term_debt_excl_current', label: 'Long-term Debt', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'short_term_debt', label: 'Short-term Debt', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_debt', label: 'Total Debt', format: 'number', category: 'balance_sheet', screeners: EQUITY },

  // Equity
  { name: 'total_equity', label: 'Total Equity', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'retained_earnings', label: 'Retained Earnings', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'total_common_equity', label: 'Common Equity', format: 'number', category: 'balance_sheet', screeners: EQUITY },
  { name: 'book_value_per_share_fq', label: 'Book Value/Share', format: 'currency', category: 'balance_sheet', screeners: EQUITY },
  { name: 'tangible_book_value_per_share_fq', label: 'Tangible BV/Share', format: 'currency', category: 'balance_sheet', screeners: EQUITY },
];

// ---- INCOME STATEMENT ----
export const INCOME_STATEMENT_FIELDS: FieldDef[] = [
  { name: 'total_revenue', label: 'Revenue', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'cost_of_revenue', label: 'Cost of Revenue (COGS)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'gross_profit', label: 'Gross Profit', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'operating_expenses_total', label: 'Operating Expenses', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'operating_income', label: 'Operating Income (EBIT)', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'ebitda', label: 'EBITDA', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'net_income', label: 'Net Income', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'interest_expense', label: 'Interest Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'tax_provision', label: 'Tax Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'research_n_development', label: 'R&D Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'selling_general_n_admin', label: 'SG&A Expense', format: 'number', category: 'income_statement', screeners: EQUITY },
  { name: 'basic_eps_net_income', label: 'Basic EPS', format: 'currency', category: 'income_statement', screeners: EQUITY },
  { name: 'diluted_eps_net_income', label: 'Diluted EPS', format: 'currency', category: 'income_statement', screeners: EQUITY },
];

// ---- CASH FLOW ----
export const CASH_FLOW_FIELDS: FieldDef[] = [
  { name: 'operating_cash_flow', label: 'Operating Cash Flow', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'capital_expenditure', label: 'Capital Expenditure', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'free_cash_flow', label: 'Free Cash Flow', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'investing_cash_flow', label: 'Cash from Investing', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'financing_cash_flow', label: 'Cash from Financing', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'net_change_in_cash', label: 'Net Change in Cash', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'depreciation_n_amortization', label: 'D&A', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'change_in_working_capital', label: 'Change in Working Capital', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'stock_based_compensation', label: 'Stock-based Comp', format: 'number', category: 'cash_flow', screeners: EQUITY },
  { name: 'cash_n_short_term_invest_fq', label: 'Cash Position (Q)', format: 'number', category: 'cash_flow', screeners: EQUITY },
];

// ---- GROWTH METRICS ----
export const GROWTH_FIELDS: FieldDef[] = [
  { name: 'revenue_growth_yoy', label: 'Revenue Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'revenue_growth_3y_cagr', label: 'Revenue Growth 3Y CAGR', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'revenue_growth_5y_cagr', label: 'Revenue Growth 5Y CAGR', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'earnings_growth_yoy', label: 'Earnings Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'earnings_growth_3y_cagr', label: 'Earnings Growth 3Y CAGR', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'fcf_growth_yoy', label: 'FCF Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'ebitda_growth_yoy', label: 'EBITDA Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'net_income_growth_yoy', label: 'Net Income Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'total_assets_growth_yoy', label: 'Assets Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
  { name: 'eps_growth_yoy', label: 'EPS Growth YoY %', format: 'percent', category: 'growth', screeners: EQUITY },
];

export const ALL_FINANCIAL_FIELDS: FieldDef[] = [
  ...BALANCE_SHEET_FIELDS,
  ...INCOME_STATEMENT_FIELDS,
  ...CASH_FLOW_FIELDS,
  ...GROWTH_FIELDS,
];
