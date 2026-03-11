import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Summary columns
const SUMMARY_COLUMNS = [
  "name", "description", "close", "change", "market_cap_basic",
  "price_earnings_ttm", "earnings_per_share_basic_ttm",
  "total_revenue", "net_income", "total_assets",
  "total_debt",
  "earnings_per_share_diluted_ttm",
  "dividends_yield", "dividend_yield_recent",
  "earnings_release_date", "earnings_release_next_date",
  "sector", "industry", "exchange",
  "Recommend.All", "RSI", "MACD.macd",
  "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y",
  "SMA50", "SMA200", "price_52_week_high", "price_52_week_low",
  "number_of_employees",
];

// Full financial statement columns
const FINANCIAL_STATEMENT_COLUMNS = [
  // Income Statement
  "total_revenue", "last_annual_revenue", "cost_of_goods",
  "gross_profit", "gross_profit_fq", "operating_expenses",
  "oper_income", "oper_income_fq", "ebitda",
  "net_income", "interest_expense_fq", "tax_expense_fq",
  "research_and_dev", "sell_gen_admin",
  "basic_eps_net_income", "earnings_per_share_basic_ttm",
  "last_annual_eps", "earnings_per_share_diluted_ttm",
  "earnings_per_share_fq", "revenue_per_employee",
  // Revenue Growth
  "total_revenue_yoy_growth_fy", "total_revenue_qoq_growth_fq",
  "total_revenue_yoy_growth_fq", "total_revenue_yoy_growth_ttm",
  // EPS Growth
  "earnings_per_share_diluted_yoy_growth_fy",
  "earnings_per_share_diluted_yoy_growth_ttm",
  // EBITDA Growth
  "ebitda_yoy_growth_fy", "ebitda_yoy_growth_ttm",
  // Net Income Growth
  "net_income_yoy_growth_fy", "net_income_yoy_growth_ttm",

  // Balance Sheet
  "total_assets", "total_current_assets",
  "cash_n_equivalents_fq", "cash_n_short_term_invest_fq",
  "accounts_receivable", "inventories_total",
  "net_ppe", "goodwill", "intangibles_total",
  "total_liabilities_fq", "total_current_liabilities",
  "accounts_payable", "long_term_debt", "short_term_debt",
  "total_debt", "net_debt",
  "total_equity", "retained_earnings", "common_equity_total",
  "book_value_per_share", "tangible_book_value_per_share",

  // Cash Flow
  "cash_f_operating_activities_ttm", "cash_f_operating_activities",
  "capital_expenditures_ttm", "capital_expenditures",
  "free_cash_flow_ttm", "free_cash_flow",
  "cash_f_investing_activities_ttm", "cash_f_financing_activities_ttm",
  "dividends_paid", "total_cash_dividends_paid_ttm",

  // Margins
  "gross_margin", "gross_margin_fq",
  "operating_margin", "operating_margin_fq",
  "net_margin", "net_margin_fq",
  "ebitda_margin", "ebitda_margin_fq",
  "pre_tax_margin", "free_cash_flow_margin",

  // Returns
  "return_on_equity", "return_on_assets",
  "return_on_invested_capital",

  // Ratios
  "debt_to_equity", "current_ratio", "quick_ratio",
  "price_revenue_ttm", "enterprise_value_to_ebit",
  "enterprise_value_to_revenue",
  "price_to_operating_cash_flow",
  "peg_ratio",
  "enterprise_value", "price_book_ratio", "price_sales_ratio",

  // Dividends
  "dividends_yield", "dividends_yield_current",
  "continuous_dividend_growth", "continuous_dividend_payout",
];

const EXCHANGE_TO_MARKET: Record<string, string> = {
  SET: "thailand", BKK: "thailand", TFEX: "thailand",
  NASDAQ: "america", NYSE: "america", AMEX: "america",
  TSE: "japan", TYO: "japan",
  HKEX: "hongkong", HKG: "hongkong",
  LSE: "uk", LON: "uk",
  XETR: "germany", FRA: "germany", FWB: "germany",
  SSE: "china", SZSE: "china",
  BSE: "india", NSE: "india",
  ASX: "australia", SGX: "singapore",
  BURSA: "malaysia", MYX: "malaysia",
  KRX: "korea", TWSE: "taiwan",
  IDX: "indonesia", PSE: "philippines",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, exchange, type = "all", mode = "filings" } = await req.json();

    if (!symbol) {
      return new Response(JSON.stringify({ filings: [], financials: null, error: "Symbol required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const market = EXCHANGE_TO_MARKET[exchange?.toUpperCase()] || "america";
    const scanUrl = `https://scanner.tradingview.com/${market}/scan`;
    const fullSymbol = exchange ? `${exchange}:${symbol}` : symbol;

    // Choose columns based on mode
    const allCols = mode === "statements"
      ? [...new Set([...SUMMARY_COLUMNS, ...FINANCIAL_STATEMENT_COLUMNS])]
      : SUMMARY_COLUMNS;

    console.log(`[tv-filings] mode=${mode} symbol=${fullSymbol} market=${market} cols=${allCols.length}`);

    const tvHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Origin": "https://www.tradingview.com",
      "Referer": "https://www.tradingview.com/",
    };

    let financials: any = null;
    let currentCols = [...allCols];
    let maxRetries = 30;

    // Retry loop: if a field is unknown, remove it and retry
    while (maxRetries-- > 0) {
      const tvBody = {
        columns: currentCols,
        filter: [],
        symbols: { tickers: [fullSymbol], query: { types: [] } },
        sort: { sortBy: "name", sortOrder: "asc" },
        range: [0, 1],
        options: { lang: "en" },
      };

      const tvResponse = await fetch(scanUrl, {
        method: "POST",
        headers: tvHeaders,
        body: JSON.stringify(tvBody),
      });

      if (tvResponse.ok) {
        const tvData = await tvResponse.json();
        console.log(`[tv-filings] Got ${tvData.data?.length || 0} results for ${fullSymbol}`);

        if (tvData.data && tvData.data.length > 0) {
          const match = tvData.data[0];
          const row: any = { symbol: match.s };
          currentCols.forEach((col: string, i: number) => {
            row[col] = match.d?.[i] ?? null;
          });
          financials = row;
        }
        break; // success
      } else {
        const errorText = await tvResponse.text();
        console.error(`[tv-filings] TV API error ${tvResponse.status}: ${errorText}`);

        // Parse JSON error to extract unknown field name
        try {
          const errJson = JSON.parse(errorText);
          const errMsg = errJson.error || '';
          const unknownMatch = errMsg.match(/Unknown field "([^"]+)"/);
          if (unknownMatch && maxRetries > 0) {
            const badField = unknownMatch[1];
            console.log(`[tv-filings] Removing unknown field: ${badField}, retrying... (${currentCols.length - 1} cols left)`);
            currentCols = currentCols.filter(c => c !== badField);
            continue;
          }
        } catch {}
        break; // give up
      }
    }

    const filings = mode === "filings"
      ? generateFilingsFromFinancials(financials, fullSymbol, type)
      : [];

    return new Response(JSON.stringify({ filings, financials }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tv-filings] Error:", error);
    return new Response(JSON.stringify({ filings: [], financials: null, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFilingsFromFinancials(financials: any, symbol: string, typeFilter: string): any[] {
  const filings: any[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const quarterMonths = [
    { q: "Q1", months: [3, 5] },
    { q: "Q2", months: [6, 8] },
    { q: "Q3", months: [9, 11] },
    { q: "Q4", months: [12, 2] },
  ];

  for (let year = currentYear; year >= currentYear - 2; year--) {
    if (typeFilter === "all" || typeFilter === "annual") {
      const reportDate = new Date(year + 1, 2, 15);
      if (reportDate <= now) {
        filings.push({
          id: `${symbol}-annual-${year}`, symbol,
          title: `Annual Report ${year}`,
          titleTh: `รายงานประจำปี ${year}`,
          type: "annual", form: "56-1",
          date: formatDate(reportDate),
          quarter: `FY ${year}`, year,
          documents: [
            { type: "annual_report", label: "รายงานประจำปี", icon: "📋" },
            { type: "financial_statements", label: "งบการเงิน", icon: "📊" },
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
        const docs: any[] = [{ type: "interim_report", label: "รายงานระหว่างกาล", icon: "📄" }];
        if (qm.q === "Q2" || qm.q === "Q4") docs.push({ type: "slides", label: "สไลด์", icon: "📊" });
        docs.push({ type: "earnings", label: "หนังสือรับรอง", icon: "📃" });
        filings.push({
          id: `${symbol}-${qm.q}-${year}`, symbol,
          title: `${qm.q} ${year}`,
          titleTh: `รายงานระหว่างกาล ${qm.q} ${year}`,
          type: "interim", form: "10-Q",
          date: formatDate(reportDate),
          quarter: `${qm.q} ${year}`, year,
          documents: docs,
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "slides") {
      for (let m = 0; m < 12; m += 3) {
        const presDate = new Date(year, m + 1, 10);
        if (presDate <= now && presDate > new Date(currentYear - 2, 0, 1)) {
          filings.push({
            id: `${symbol}-pres-${year}-${m}`, symbol,
            title: "Investor Presentation",
            titleTh: "สไลด์นักลงทุน", type: "slides",
            form: "", date: formatDate(presDate),
            quarter: "", year,
            documents: [{ type: "slides", label: "สไลด์", icon: "📊" }],
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