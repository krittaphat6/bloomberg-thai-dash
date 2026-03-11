import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALL_MARKETS = [
  "america", "thailand", "hongkong", "japan", "germany", "uk",
  "india", "singapore", "australia", "korea", "china", "taiwan",
  "malaysia", "indonesia", "france", "canada", "brazil",
];

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

    const query = text.trim().toUpperCase();
    console.log(`[tv-symbol-search] Searching: "${query}"`);

    // Strategy: use filter with "name" field using "match" operation
    // This is different from filter2 — it's TradingView's standard filter array
    const fetchMarket = async (market: string): Promise<any[]> => {
      const url = `https://scanner.tradingview.com/${market}/scan`;

      // Try approach 1: use filter array with "match" on name
      const bodies = [
        // Approach 1: filter with match
        {
          columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic"],
          filter: [{ left: "name", operation: "match", right: query }],
          sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
          range: [0, 15],
          markets: [market],
          options: { lang },
          symbols: { query: { types: [] } },
        },
        // Approach 2: use symbols.tickers with prefix
        {
          columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic"],
          sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
          range: [0, 15],
          markets: [market],
          options: { lang },
          symbols: {
            query: { types: [] },
            tickers: [`${market.toUpperCase()}:${query}`],
          },
        },
      ];

      for (const body of bodies) {
        try {
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

          if (res.ok) {
            const data = await res.json();
            const items = (data.data || []).map((item: any) => {
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
            if (items.length > 0) return items;
          } else {
            await res.text(); // consume body
          }
        } catch {
          // try next approach
        }
      }
      return [];
    };

    // Fetch all markets in parallel
    const allResults = await Promise.all(ALL_MARKETS.map(fetchMarket));
    const merged = allResults.flat();

    // Sort: exact match > starts with > market cap
    merged.sort((a, b) => {
      const aExact = a.symbol.toUpperCase() === query ? 0 : 1;
      const bExact = b.symbol.toUpperCase() === query ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;

      const aStarts = a.symbol.toUpperCase().startsWith(query) ? 0 : 1;
      const bStarts = b.symbol.toUpperCase().startsWith(query) ? 0 : 1;
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
