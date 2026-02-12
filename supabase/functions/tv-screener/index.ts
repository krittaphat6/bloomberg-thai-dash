import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All supported market scan URLs for TradingView
const STOCK_SCAN_URLS: Record<string, string> = {
  america: "https://scanner.tradingview.com/america/scan",
  canada: "https://scanner.tradingview.com/canada/scan",
  mexico: "https://scanner.tradingview.com/mexico/scan",
  uk: "https://scanner.tradingview.com/uk/scan",
  germany: "https://scanner.tradingview.com/germany/scan",
  france: "https://scanner.tradingview.com/france/scan",
  italy: "https://scanner.tradingview.com/italy/scan",
  spain: "https://scanner.tradingview.com/spain/scan",
  switzerland: "https://scanner.tradingview.com/switzerland/scan",
  netherlands: "https://scanner.tradingview.com/netherlands/scan",
  belgium: "https://scanner.tradingview.com/belgium/scan",
  sweden: "https://scanner.tradingview.com/sweden/scan",
  norway: "https://scanner.tradingview.com/norway/scan",
  denmark: "https://scanner.tradingview.com/denmark/scan",
  finland: "https://scanner.tradingview.com/finland/scan",
  poland: "https://scanner.tradingview.com/poland/scan",
  russia: "https://scanner.tradingview.com/russia/scan",
  austria: "https://scanner.tradingview.com/austria/scan",
  portugal: "https://scanner.tradingview.com/portugal/scan",
  greece: "https://scanner.tradingview.com/greece/scan",
  ireland: "https://scanner.tradingview.com/ireland/scan",
  iceland: "https://scanner.tradingview.com/iceland/scan",
  hungary: "https://scanner.tradingview.com/hungary/scan",
  czech: "https://scanner.tradingview.com/czech/scan",
  romania: "https://scanner.tradingview.com/romania/scan",
  japan: "https://scanner.tradingview.com/japan/scan",
  china: "https://scanner.tradingview.com/china/scan",
  hongkong: "https://scanner.tradingview.com/hongkong/scan",
  india: "https://scanner.tradingview.com/india/scan",
  korea: "https://scanner.tradingview.com/korea/scan",
  taiwan: "https://scanner.tradingview.com/taiwan/scan",
  singapore: "https://scanner.tradingview.com/singapore/scan",
  thailand: "https://scanner.tradingview.com/thailand/scan",
  malaysia: "https://scanner.tradingview.com/malaysia/scan",
  indonesia: "https://scanner.tradingview.com/indonesia/scan",
  philippines: "https://scanner.tradingview.com/philippines/scan",
  vietnam: "https://scanner.tradingview.com/vietnam/scan",
  pakistan: "https://scanner.tradingview.com/pakistan/scan",
  bangladesh: "https://scanner.tradingview.com/bangladesh/scan",
  srilanka: "https://scanner.tradingview.com/srilanka/scan",
  australia: "https://scanner.tradingview.com/australia/scan",
  newzealand: "https://scanner.tradingview.com/newzealand/scan",
  brazil: "https://scanner.tradingview.com/brazil/scan",
  argentina: "https://scanner.tradingview.com/argentina/scan",
  chile: "https://scanner.tradingview.com/chile/scan",
  colombia: "https://scanner.tradingview.com/colombia/scan",
  peru: "https://scanner.tradingview.com/peru/scan",
  israel: "https://scanner.tradingview.com/israel/scan",
  turkey: "https://scanner.tradingview.com/turkey/scan",
  saudi: "https://scanner.tradingview.com/saudi/scan",
  uae: "https://scanner.tradingview.com/uae/scan",
  qatar: "https://scanner.tradingview.com/qatar/scan",
  kuwait: "https://scanner.tradingview.com/kuwait/scan",
  bahrain: "https://scanner.tradingview.com/bahrain/scan",
  egypt: "https://scanner.tradingview.com/egypt/scan",
  southafrica: "https://scanner.tradingview.com/southafrica/scan",
  nigeria: "https://scanner.tradingview.com/nigeria/scan",
  kenya: "https://scanner.tradingview.com/kenya/scan",
};

const NON_STOCK_URLS: Record<string, string> = {
  crypto: "https://scanner.tradingview.com/crypto/scan",
  forex: "https://scanner.tradingview.com/forex/scan",
  bond: "https://scanner.tradingview.com/bond/scan",
  futures: "https://scanner.tradingview.com/america/scan",
  coin: "https://scanner.tradingview.com/coin/scan",
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
      markets = [],
      search,
      index,
    } = body;

    // Determine scan URL based on type and market
    let scanUrl: string;
    if (type === "stock") {
      const marketCode = markets.length > 0 ? markets[0] : "america";
      scanUrl = STOCK_SCAN_URLS[marketCode] || STOCK_SCAN_URLS["america"];
    } else {
      scanUrl = NON_STOCK_URLS[type] || NON_STOCK_URLS["crypto"];
    }

    // Build TradingView filter format
    const tvFilters = filters.map((f: any) => {
      const filter: any = {
        left: f.field,
        operation: OPERATION_MAP[f.operator] || "greater",
      };

      if (f.operator === "between" || f.operator === "not_between") {
        filter.right = f.value;
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
      tvBody.markets = markets.length > 0 ? markets : ["america"];
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

    console.log(`[tv-screener] Scanning ${type} @ ${scanUrl}, filters: ${tvFilters.length}, columns: ${columns.length}, markets: ${JSON.stringify(markets)}`);

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
