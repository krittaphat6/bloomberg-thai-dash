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

    // Scan all markets in parallel — each market gets its own scanner request
    // and we filter client-side by symbol name matching
    const fetchMarket = async (market: string): Promise<any[]> => {
      try {
        const url = `https://scanner.tradingview.com/${market}/scan`;
        const body: any = {
          columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic"],
          sort: { sortBy: "name", sortOrder: "asc" },
          range: [0, 5000],
          markets: [market],
          options: { lang },
          symbols: { query: { types: [] } },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Origin": "https://www.tradingview.com",
            "Referer": "https://www.tradingview.com/",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          await res.text();
          return [];
        }

        const data = await res.json();
        const results: any[] = [];

        for (const item of data.data || []) {
          const name = (item.d?.[0] || "").toUpperCase();
          // Match: exact, starts with, or contains the query
          if (name === query || name.startsWith(query)) {
            const parts = (item.s || "").split(":");
            results.push({
              symbol: parts.length > 1 ? parts[1] : parts[0],
              description: item.d?.[1] || "",
              type: item.d?.[2] || "stock",
              exchange: parts.length > 1 ? parts[0] : "",
              country: "",
              sector: item.d?.[4] || "",
              market_cap: item.d?.[5] || 0,
              _exactMatch: name === query,
              _startsMatch: name.startsWith(query),
            });
          }
        }
        return results;
      } catch {
        return [];
      }
    };

    const allResults = await Promise.all(ALL_MARKETS.map(fetchMarket));
    const merged = allResults.flat();

    // Sort: exact matches first, then starts-with, then by market cap
    merged.sort((a, b) => {
      if (a._exactMatch !== b._exactMatch) return a._exactMatch ? -1 : 1;
      if (a._startsMatch !== b._startsMatch) return a._startsMatch ? -1 : 1;
      return (b.market_cap || 0) - (a.market_cap || 0);
    });

    // Deduplicate and clean up
    const seen = new Set<string>();
    const symbols = merged
      .filter(s => {
        const key = `${s.exchange}:${s.symbol}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 25)
      .map(({ _exactMatch, _startsMatch, ...rest }) => rest);

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
