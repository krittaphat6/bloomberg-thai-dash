import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIORITY_MARKETS = ["america", "thailand"];
const OTHER_MARKETS = [
  "hongkong", "japan", "germany", "uk", "india", "singapore",
  "australia", "korea", "china", "taiwan", "malaysia", "indonesia",
  "france", "canada", "brazil",
];

async function searchMarket(market: string, query: string, lang: string): Promise<any[]> {
  try {
    const url = `https://scanner.tradingview.com/${market}/scan`;
    const body = {
      columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic"],
      sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
      range: [0, 30],
      markets: [market],
      options: { lang },
      symbols: { query: { types: [] } },
      filter2: {
        operator: "and",
        operands: [
          {
            operation: {
              operator: "match",
              operand: query,
            },
          },
        ],
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // If filter2 match fails, try without it — fetch all and filter client-side
      const body2 = {
        columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic"],
        sort: { sortBy: "name", sortOrder: "asc" },
        range: [0, 200],
        markets: [market],
        options: { lang },
        symbols: { query: { types: [] } },
      };

      const res2 = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Origin": "https://www.tradingview.com",
          "Referer": "https://www.tradingview.com/",
        },
        body: JSON.stringify(body2),
      });

      if (!res2.ok) {
        await res2.text();
        return [];
      }

      const data2 = await res2.json();
      return extractMatches(data2, query);
    }

    const data = await res.json();
    return extractResults(data);
  } catch {
    return [];
  }
}

function extractResults(data: any): any[] {
  return (data.data || []).map((item: any) => {
    const parts = (item.s || "").split(":");
    return {
      symbol: parts.length > 1 ? parts[1] : parts[0],
      description: item.d?.[1] || "",
      type: item.d?.[2] || "stock",
      exchange: parts.length > 1 ? parts[0] : "",
      sector: item.d?.[4] || "",
      market_cap: item.d?.[5] || 0,
    };
  });
}

function extractMatches(data: any, query: string): any[] {
  const uq = query.toUpperCase();
  const results: any[] = [];
  for (const item of data.data || []) {
    const name = (item.d?.[0] || "").toUpperCase();
    if (name === uq || name.startsWith(uq)) {
      const parts = (item.s || "").split(":");
      results.push({
        symbol: parts.length > 1 ? parts[1] : parts[0],
        description: item.d?.[1] || "",
        type: item.d?.[2] || "stock",
        exchange: parts.length > 1 ? parts[0] : "",
        sector: item.d?.[4] || "",
        market_cap: item.d?.[5] || 0,
      });
    }
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, lang = "en" } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ symbols: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = text.trim();
    console.log(`[tv-symbol-search] Searching: "${query}"`);

    // Search priority markets first, then others in parallel
    const [priorityResults, otherResults] = await Promise.all([
      Promise.all(PRIORITY_MARKETS.map(m => searchMarket(m, query, lang))),
      Promise.all(OTHER_MARKETS.map(m => searchMarket(m, query, lang))),
    ]);

    const merged = [...priorityResults.flat(), ...otherResults.flat()];

    // Sort: exact match > starts with > market cap
    const uq = query.toUpperCase();
    merged.sort((a, b) => {
      const aExact = a.symbol.toUpperCase() === uq ? 0 : 1;
      const bExact = b.symbol.toUpperCase() === uq ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      const aStarts = a.symbol.toUpperCase().startsWith(uq) ? 0 : 1;
      const bStarts = b.symbol.toUpperCase().startsWith(uq) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;

      return (b.market_cap || 0) - (a.market_cap || 0);
    });

    // Deduplicate
    const seen = new Set<string>();
    const symbols = merged
      .filter(s => {
        const key = `${s.exchange}:${s.symbol}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 25);

    console.log(`[tv-symbol-search] Found ${symbols.length} results for "${query}"`);

    return new Response(JSON.stringify({ symbols }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tv-symbol-search] Error:", error);
    return new Response(JSON.stringify({ symbols: [], error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
