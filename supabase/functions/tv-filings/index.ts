import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Universal safe columns (work across ALL markets including Thailand)
const SAFE_COLUMNS = [
  "name", "description", "close", "change", "change_abs",
  "volume", "market_cap_basic", "price_earnings_ttm",
  "earnings_per_share_basic_ttm", "earnings_per_share_diluted_ttm",
  "sector", "industry", "exchange",
  "RSI", "MACD.macd", "Recommend.All",
  "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y",
  "dividend_yield_recent", "dividends_yield",
  "SMA50", "SMA200",
  "price_52_week_high", "price_52_week_low",
  "number_of_employees",
  "average_volume_10d_calc", "Volatility.D",
  "total_revenue", "net_income", "total_assets", "total_debt",
  "gross_profit", "ebitda", "oper_income",
  "gross_margin", "operating_margin", "net_margin",
  "return_on_equity", "return_on_assets",
  "debt_to_equity", "current_ratio", "quick_ratio",
  "price_book_ratio", "price_sales_ratio",
  "enterprise_value",
  "free_cash_flow",
];

// Extended columns (only for markets that support them, e.g. America)
const EXTENDED_COLUMNS = [
  "last_annual_revenue", "last_annual_eps",
  "earnings_per_share_fq", "revenue_per_employee",
  "total_revenue_yoy_growth_fy", "total_revenue_yoy_growth_ttm",
  "earnings_per_share_diluted_yoy_growth_fy",
  "ebitda_yoy_growth_fy", "net_income_yoy_growth_fy",
  "total_current_assets", "cash_n_equivalents_fq",
  "accounts_receivable", "inventories_total", "net_ppe", "goodwill",
  "total_liabilities_fq", "net_debt",
  "cash_f_operating_activities_ttm", "capital_expenditures_ttm",
  "free_cash_flow_ttm", "cash_f_investing_activities_ttm",
  "cash_f_financing_activities_ttm", "dividends_paid",
  "return_on_invested_capital",
  "price_revenue_ttm", "peg_ratio",
  "enterprise_value_to_ebit", "enterprise_value_to_revenue",
  "pre_tax_margin",
  "continuous_dividend_growth", "continuous_dividend_payout",
  "dividends_yield_current",
  "earnings_release_date", "earnings_release_next_date",
];

// Core fields that usually support historical lookback in TV scanner ([1]..[N])
const HISTORY_BASE_COLUMNS = [
  "total_revenue",
  "gross_profit",
  "ebitda",
  "net_income",
  "earnings_per_share_diluted_ttm",
  "price_earnings_ttm",
  "price_sales_ratio",
  "dividends_yield",
  "return_on_equity",
  "debt_to_equity",
  "current_ratio",
  "quick_ratio",
  "total_assets",
  "total_liabilities_fq",
  "total_debt",
  "free_cash_flow",
  "cash_f_operating_activities_ttm",
];

const DEFAULT_HISTORY_PERIODS = 11;

const EXCHANGE_TO_MARKET: Record<string, string> = {
  SET: "thailand", BKK: "thailand", TFEX: "thailand",
  NASDAQ: "america", NYSE: "america", AMEX: "america", OTC: "america",
  TSE: "japan", TYO: "japan",
  HKEX: "hongkong", HKG: "hongkong",
  LSE: "uk", LON: "uk",
  XETR: "germany", FRA: "germany", FWB: "germany", GETTEX: "germany",
  SSE: "china", SZSE: "china",
  BSE: "india", NSE: "india",
  ASX: "australia", SGX: "singapore",
  BURSA: "malaysia", MYX: "malaysia",
  KRX: "korea", TWSE: "taiwan",
  IDX: "indonesia", PSE: "philippines",
  EURONEXT: "france", NEO: "canada",
  BMFBOVESPA: "brazil", LSX: "uk",
};

const TV_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Origin": "https://www.tradingview.com",
  "Referer": "https://www.tradingview.com/",
};

function buildHistoricalColumns(baseColumns: string[], periods: number): string[] {
  const cols: string[] = [];
  for (const base of baseColumns) {
    for (let i = 1; i <= periods; i++) {
      cols.push(`${base}[${i}]`);
    }
  }
  return cols;
}

function generateQuarterLabels(periods: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  for (let i = periods; i >= 0; i--) {
    const offset = currentQuarter - 1 - i;
    const yearOffset = Math.floor(offset / 4);
    const quarterBase = ((offset % 4) + 4) % 4;
    const quarter = quarterBase + 1;
    const year = now.getFullYear() + yearOffset;
    labels.push(`Q${quarter} '${String(year).slice(-2)}`);
  }

  return labels;
}

function buildStatementSeries(financials: Record<string, any> | null, periods: number) {
  if (!financials) return null;

  const metrics: Record<string, (number | null)[]> = {};

  for (const baseField of HISTORY_BASE_COLUMNS) {
    const values: (number | null)[] = [];
    for (let i = periods; i >= 1; i--) {
      const prevKey = `${baseField}[${i}]`;
      const prevValue = financials[prevKey];
      values.push(prevValue == null || Number.isNaN(Number(prevValue)) ? null : Number(prevValue));
    }

    const currentValue = financials[baseField];
    values.push(currentValue == null || Number.isNaN(Number(currentValue)) ? null : Number(currentValue));

    if (values.some((v) => v != null)) {
      metrics[baseField] = values;
    }
  }

  return {
    periods: generateQuarterLabels(periods),
    metrics,
  };
}

async function fetchWithAutoFix(scanUrl: string, fullSymbol: string, columns: string[]): Promise<any> {
  let currentCols = [...columns];
  let maxRetries = 40;

  while (maxRetries-- > 0) {
    const body = {
      columns: currentCols,
      filter: [],
      symbols: { tickers: [fullSymbol], query: { types: [] } },
      sort: { sortBy: "name", sortOrder: "asc" },
      range: [0, 1],
      options: { lang: "en" },
    };

    const res = await fetch(scanUrl, {
      method: "POST",
      headers: TV_HEADERS,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const match = data.data[0];
        const row: any = { symbol: match.s };
        currentCols.forEach((col, i) => {
          row[col] = match.d?.[i] ?? null;
        });
        return row;
      }
      return null;
    }

    // Handle unknown field errors
    const errorText = await res.text();
    try {
      const errJson = JSON.parse(errorText);
      const errMsg = errJson.error || '';
      const unknownMatch = errMsg.match(/Unknown field "([^"]+)"/);
      if (unknownMatch) {
        const badField = unknownMatch[1];
        console.log(`[tv-filings] Removing: ${badField} (${currentCols.length - 1} left)`);
        currentCols = currentCols.filter(c => c !== badField);
        continue;
      }
    } catch {}
    
    console.error(`[tv-filings] API error: ${errorText.substring(0, 200)}`);
    return null;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      symbol,
      exchange,
      type = "all",
      mode = "filings",
      historyPeriods = DEFAULT_HISTORY_PERIODS,
    } = await req.json();

    if (!symbol) {
      return new Response(JSON.stringify({ filings: [], financials: null, statementSeries: null, error: "Symbol required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const market = EXCHANGE_TO_MARKET[exchange?.toUpperCase()] || "america";
    const scanUrl = `https://scanner.tradingview.com/${market}/scan`;
    const fullSymbol = exchange ? `${exchange}:${symbol}` : symbol;
    const safeHistoryPeriods = Number.isFinite(Number(historyPeriods))
      ? Math.max(0, Math.min(12, Number(historyPeriods)))
      : DEFAULT_HISTORY_PERIODS;

    // Choose columns: safe set for all, extended + historical lookback for statements mode
    let columns = [...SAFE_COLUMNS];
    if (mode === "statements") {
      columns = [
        ...new Set([
          ...SAFE_COLUMNS,
          ...EXTENDED_COLUMNS,
          ...buildHistoricalColumns(HISTORY_BASE_COLUMNS, safeHistoryPeriods),
        ]),
      ];
    }

    console.log(`[tv-filings] mode=${mode} symbol=${fullSymbol} market=${market} cols=${columns.length}`);

    const financials = await fetchWithAutoFix(scanUrl, fullSymbol, columns);
    const statementSeries = mode === "statements"
      ? buildStatementSeries(financials, safeHistoryPeriods)
      : null;

    if (financials) {
      console.log(`[tv-filings] Success: ${Object.keys(financials).filter(k => financials[k] != null).length} fields with data`);
    } else {
      console.log(`[tv-filings] No data returned for ${fullSymbol}`);
    }

    const filings = mode === "filings"
      ? generateFilingsFromFinancials(financials, fullSymbol, type, exchange)
      : [];

    return new Response(JSON.stringify({ filings, financials, statementSeries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tv-filings] Error:", error);
    return new Response(JSON.stringify({ filings: [], financials: null, statementSeries: null, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getTradingViewSymbolUrl(symbol: string, exchange?: string): string {
  const normalized = symbol.includes(":") ? symbol.replace(":", "-") : `${exchange || ""}-${symbol}`.replace(/^-/, "");
  return `https://www.tradingview.com/symbols/${normalized}`;
}

function generateFilingsFromFinancials(financials: any, symbol: string, typeFilter: string, exchange?: string): any[] {
  const filings: any[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const quarterMonths = [
    { q: "Q1", months: [3, 5] },
    { q: "Q2", months: [6, 8] },
    { q: "Q3", months: [9, 11] },
    { q: "Q4", months: [12, 2] },
  ];

  const tvBaseUrl = getTradingViewSymbolUrl(symbol, exchange);

  for (let year = currentYear; year >= currentYear - 2; year--) {
    if (typeFilter === "all" || typeFilter === "annual") {
      const reportDate = new Date(year + 1, 2, 15);
      if (reportDate <= now) {
        filings.push({
          id: `${symbol}-annual-${year}`,
          symbol,
          title: `Annual Report ${year}`,
          titleTh: `รายงานประจำปี ${year}`,
          type: "annual",
          form: "56-1",
          date: formatDate(reportDate),
          quarter: `FY ${year}`,
          year,
          documents: [
            { type: "annual_report", label: "รายงานประจำปี", icon: "📋", url: `${tvBaseUrl}/financials-overview/` },
            { type: "financial_statements", label: "งบการเงิน", icon: "📊", url: `${tvBaseUrl}/financials-income-statement/` },
          ],
        });
      }
    }

    for (const qm of quarterMonths) {
      if (typeFilter !== "all" && typeFilter !== "quarterly" && typeFilter !== "interim") continue;
      const reportMonth = qm.q === "Q4" ? qm.months[1] : qm.months[1];
      const reportYear = qm.q === "Q4" ? year + 1 : year;
      const reportDate = new Date(reportYear, reportMonth - 1, 15);
      if (reportDate <= now) {
        const docs: any[] = [
          { type: "interim_report", label: "รายงานระหว่างกาล", icon: "📄", url: `${tvBaseUrl}/financials-income-statement/` },
        ];
        if (qm.q === "Q2" || qm.q === "Q4") {
          docs.push({ type: "slides", label: "สไลด์", icon: "📊", url: `${tvBaseUrl}/financials-overview/` });
        }
        docs.push({ type: "earnings", label: "หนังสือรับรอง", icon: "📃", url: `${tvBaseUrl}/financials-statistics-and-ratios/` });

        filings.push({
          id: `${symbol}-${qm.q}-${year}`,
          symbol,
          title: `${qm.q} ${year}`,
          titleTh: `รายงานระหว่างกาล ${qm.q} ${year}`,
          type: "interim",
          form: "10-Q",
          date: formatDate(reportDate),
          quarter: `${qm.q} ${year}`,
          year,
          documents: docs,
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "slides") {
      for (let m = 0; m < 12; m += 3) {
        const presDate = new Date(year, m + 1, 10);
        if (presDate <= now && presDate > new Date(currentYear - 2, 0, 1)) {
          filings.push({
            id: `${symbol}-pres-${year}-${m}`,
            symbol,
            title: "Investor Presentation",
            titleTh: "สไลด์นักลงทุน",
            type: "slides",
            form: "",
            date: formatDate(presDate),
            quarter: "",
            year,
            documents: [
              { type: "slides", label: "สไลด์", icon: "📊", url: `${tvBaseUrl}/financials-overview/` },
            ],
          });
        }
      }
    }
  }

  filings.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  return filings;
}

function formatDate(d: Date): string {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function parseDate(s: string): Date {
  try { return new Date(s); } catch { return new Date(); }
}
