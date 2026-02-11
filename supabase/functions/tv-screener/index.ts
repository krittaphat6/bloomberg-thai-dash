import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKET_MAP: Record<string, string> = {
  stock: "america",
  crypto: "crypto",
  forex: "forex",
  bond: "bond",
  futures: "america",
  coin: "coin",
};

const SCAN_TYPES: Record<string, string> = {
  stock: "stock",
  crypto: "crypto",
  forex: "forex",
  bond: "bond",
  futures: "futures",
  coin: "coin",
};

const OPERATION_MAP: Record<string, string> = {
  ">": "greater",
  "<": "less",
  ">=": "egreater",
  "<=": "eless",
  "=": "equal",
  "!=": "nequal",
  between: "in_range",
  not_between: "not_in_range",
  isin: "in_range",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      type = "stock",
      columns = [],
      filters = [],
      sort,
      range = [0, 150],
      markets,
      search,
      index,
    } = body;

    const market = MARKET_MAP[type] || "america";
    const scanUrl = `https://scanner.tradingview.com/${market}/scan`;

    // Build TradingView filter format
    const tvFilters = filters.map((f: any) => {
      const filter: any = {
        left: f.field,
        operation: OPERATION_MAP[f.operator] || "greater",
      };

      if (f.operator === "between" || f.operator === "not_between") {
        filter.right = f.value; // array [min, max]
      } else if (f.operator === "isin") {
        filter.right = f.value;
        filter.operation = "in_range";
      } else {
        filter.right = f.value;
      }

      return filter;
    });

    // Build request body
    const tvBody: any = {
      columns: columns.length > 0 ? columns : getDefaultColumns(type),
      filter: tvFilters,
      sort: sort || { sortBy: getDefaultSort(type), sortOrder: "desc" },
      range: range,
      options: { lang: "en" },
    };

    // Add market filter for stocks
    if (type === "stock") {
      tvBody.markets = markets || ["america"];
      tvBody.symbols = { query: { types: [] } };
    }

    // Add index filter
    if (index) {
      tvBody.preset = index;
    }

    // Add search
    if (search) {
      tvBody.filter2 = { operator: "and", operands: [{ operation: { operator: "match", operand: search } }] };
    }

    console.log(`[tv-screener] Scanning ${type}, filters: ${tvFilters.length}, columns: ${columns.length}`);

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

    if (!tvResponse.ok) {
      const errorText = await tvResponse.text();
      console.error(`[tv-screener] TV API error ${tvResponse.status}: ${errorText}`);
      
      // Fallback to mock data
      return new Response(JSON.stringify({
        data: [],
        totalCount: 0,
        error: `TradingView API returned ${tvResponse.status}`,
        fallback: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tvData = await tvResponse.json();

    // Transform TV response to our format
    const requestedColumns = columns.length > 0 ? columns : getDefaultColumns(type);
    const results = (tvData.data || []).map((item: any) => {
      const row: any = { symbol: item.s };
      if (item.d && Array.isArray(item.d)) {
        requestedColumns.forEach((col: string, i: number) => {
          row[col] = item.d[i];
        });
      }
      return row;
    });

    console.log(`[tv-screener] Got ${results.length} results from ${tvData.totalCount || 0} total`);

    return new Response(JSON.stringify({
      data: results,
      totalCount: tvData.totalCount || results.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tv-screener] Error:", error);
    return new Response(JSON.stringify({
      data: [],
      totalCount: 0,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDefaultColumns(type: string): string[] {
  switch (type) {
    case "stock":
      return [
        "name", "description", "close", "change", "change_abs",
        "volume", "market_cap_basic", "price_earnings_ttm",
        "earnings_per_share_basic_ttm", "sector", "exchange",
        "RSI", "MACD.macd", "Recommend.All", "Perf.W", "Perf.1M",
        "dividend_yield_recent", "SMA50", "SMA200", "relative_volume_10d_calc",
        "average_volume_10d_calc", "Volatility.D",
      ];
    case "crypto":
      return [
        "name", "description", "close", "change", "change_abs",
        "24h_vol|5", "market_cap_calc", "RSI",
        "MACD.macd", "Recommend.All", "Perf.W", "Perf.1M",
        "Volatility.D", "24h_vol_change|5",
      ];
    case "forex":
      return [
        "name", "description", "close", "change", "change_abs",
        "bid", "ask", "spread_raw",
        "RSI", "MACD.macd", "Recommend.All",
        "Perf.W", "Perf.1M", "SMA50", "SMA200",
        "ATR", "Stoch.K", "Stoch.D",
      ];
    case "bond":
      return [
        "name", "description", "close", "change",
        "yield_recent", "coupon",
        "RSI", "Recommend.All",
      ];
    case "futures":
      return [
        "name", "description", "close", "change", "change_abs",
        "volume", "open_interest",
        "RSI", "MACD.macd", "Recommend.All",
        "high", "low", "Perf.W",
      ];
    case "coin":
      return [
        "name", "description", "close", "change",
        "24h_vol|5", "market_cap_calc",
        "RSI", "Recommend.All",
      ];
    default:
      return ["name", "description", "close", "change", "volume"];
  }
}

function getDefaultSort(type: string): string {
  switch (type) {
    case "stock": return "market_cap_basic";
    case "crypto": return "market_cap_calc";
    case "forex": return "name";
    case "bond": return "name";
    case "futures": return "name";
    case "coin": return "market_cap_calc";
    default: return "name";
  }
}
