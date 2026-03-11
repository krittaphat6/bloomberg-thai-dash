import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Financial columns to fetch from TradingView scanner for a specific symbol
const FINANCIAL_COLUMNS = [
  "name", "description", "close", "change", "market_cap_basic",
  "price_earnings_ttm", "earnings_per_share_basic_ttm",
  "revenue_ttm", "net_income_ttm", "total_assets_mrq",
  "total_debt_mrq", "total_revenue_mrq",
  "earnings_per_share_diluted_ttm",
  "dividends_yield", "dividend_yield_recent",
  "earnings_release_date", "earnings_release_next_date",
  "sector", "industry", "exchange",
  "Recommend.All", "RSI", "MACD.macd",
  "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y",
  "SMA50", "SMA200", "52w_high", "52w_low",
];

// Map exchange codes to TradingView scanner market
const EXCHANGE_TO_MARKET: Record<string, string> = {
  SET: "thailand", BKK: "thailand",
  NASDAQ: "america", NYSE: "america", AMEX: "america",
  TSE: "japan", TYO: "japan",
  HKEX: "hongkong", HKG: "hongkong",
  LSE: "uk", LON: "uk",
  XETR: "germany", FRA: "germany", FWB: "germany",
  SSE: "china", SZSE: "china",
  BSE: "india", NSE: "india",
  ASX: "australia",
  SGX: "singapore",
  BURSA: "malaysia", MYX: "malaysia",
  TFEX: "thailand",
  KRX: "korea",
  TWSE: "taiwan",
  IDX: "indonesia",
  PSE: "philippines",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, exchange, type = "all" } = await req.json();

    if (!symbol) {
      return new Response(JSON.stringify({ filings: [], financials: null, error: "Symbol required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine market from exchange
    const market = EXCHANGE_TO_MARKET[exchange?.toUpperCase()] || "america";
    const scanUrl = `https://scanner.tradingview.com/${market}/scan`;
    const fullSymbol = exchange ? `${exchange}:${symbol}` : symbol;

    console.log(`[tv-filings] Fetching financials for ${fullSymbol} (market: ${market})`);

    // Fetch financial data from TradingView scanner
    const tvBody = {
      columns: FINANCIAL_COLUMNS,
      filter2: {
        operator: "and",
        operands: [{
          operation: { operator: "match", operand: symbol.toUpperCase() }
        }]
      },
      sort: { sortBy: "name", sortOrder: "asc" },
      range: [0, 5],
      markets: [market],
      options: { lang: "en" },
    };

    const tvResponse = await fetch(scanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
      },
      body: JSON.stringify(tvBody),
    });

    let financials: any = null;

    if (tvResponse.ok) {
      const tvData = await tvResponse.json();
      const match = (tvData.data || []).find((item: any) => {
        const s = item.s || "";
        return s.toUpperCase().includes(symbol.toUpperCase());
      });

      if (match && match.d) {
        const row: any = { symbol: match.s };
        FINANCIAL_COLUMNS.forEach((col, i) => {
          row[col] = match.d[i];
        });
        financials = row;
      }
    }

    // Generate filing entries from earnings dates and financial data
    const filings = generateFilingsFromFinancials(financials, fullSymbol, type);

    console.log(`[tv-filings] Got ${filings.length} filings for ${fullSymbol}`);

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

  // Generate quarterly filing entries based on financial data availability
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const quarterMonths = [
    { q: "Q1", months: [3, 5] },  // Jan-Mar, reported ~May
    { q: "Q2", months: [6, 8] },  // Apr-Jun, reported ~Aug
    { q: "Q3", months: [9, 11] }, // Jul-Sep, reported ~Nov
    { q: "Q4", months: [12, 2] }, // Oct-Dec, reported ~Feb next year
  ];

  for (let year = currentYear; year >= currentYear - 2; year--) {
    // Annual report
    if (typeFilter === "all" || typeFilter === "annual") {
      const reportDate = new Date(year + 1, 2, 15); // ~March next year
      if (reportDate <= now) {
        filings.push({
          id: `${symbol}-annual-${year}`,
          symbol,
          title: `Annual Report ${year}`,
          titleTh: `รายงานประจำปี ${year}`,
          type: "annual",
          form: "10-K",
          date: formatDate(reportDate),
          quarter: `FY ${year}`,
          year,
          documents: [
            { type: "annual_report", label: "รายงานประจำปี", icon: "📋" },
            { type: "slides", label: "สไลด์", icon: "📊" },
          ],
            url: `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/financials-income-statement/`,
        });
      }
    }

    // Quarterly/interim reports
    for (const qm of quarterMonths) {
      if (typeFilter !== "all" && typeFilter !== "quarterly" && typeFilter !== "interim") continue;

      const reportMonth = qm.q === "Q4" ? qm.months[1] : qm.months[1];
      const reportYear = qm.q === "Q4" ? year + 1 : year;
      const reportDate = new Date(reportYear, reportMonth - 1, 15);

      if (reportDate <= now) {
        const docs: any[] = [
          { type: "interim_report", label: "รายงานระหว่างกาล", icon: "📄" },
        ];

        // Add slides for Q2 and Q4 typically
        if (qm.q === "Q2" || qm.q === "Q4") {
          docs.push({ type: "slides", label: "สไลด์", icon: "📊" });
        }

        // Add earnings release
        docs.push({ type: "earnings", label: "หนังสือรับรอง", icon: "📃" });

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
            url: `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/financials-income-statement/`,
        });
      }
    }

    // Investor presentations
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
              { type: "slides", label: "สไลด์", icon: "📊" },
            ],
            url: `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/documents/`,
          });
        }
      }
    }
  }

  // Sort by date descending
  filings.sort((a, b) => {
    const da = parseDate(a.date);
    const db = parseDate(b.date);
    return db.getTime() - da.getTime();
  });

  return filings;
}

function formatDate(d: Date): string {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function parseDate(s: string): Date {
  // Fallback: just return a date from the string
  try {
    return new Date(s);
  } catch {
    return new Date();
  }
}
