import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Try TradingView symbol search API (GET request with query params)
    const searchUrl = `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(query)}&hl=1&exchange=&lang=${lang}&search_type=&domain=production&sort_by_country=US`;

    let symbols: any[] = [];

    try {
      const res = await fetch(searchUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.symbols || data || [];
        symbols = items.slice(0, 25).map((item: any) => ({
          symbol: item.symbol || "",
          description: item.description || "",
          type: item.type || "stock",
          exchange: item.exchange || "",
          country: item.country || "",
          provider_id: item.provider_id || "",
          currency_code: item.currency_code || "",
          logo_id: item.logoid || "",
        }));
        console.log(`[tv-symbol-search] v3 API returned ${symbols.length} results`);
      } else {
        const errBody = await res.text();
        console.log(`[tv-symbol-search] v3 API returned ${res.status}, falling back to scanner. Body: ${errBody.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`[tv-symbol-search] v3 API fetch error: ${e.message}, falling back to scanner`);
    }

    // Fallback: use scanner API to find symbols across multiple markets
    if (symbols.length === 0) {
      console.log(`[tv-symbol-search] Using scanner fallback for "${query}"`);

      const markets = ["america", "thailand", "hongkong", "japan", "germany", "uk", "india", "singapore", "australia", "korea"];

      const fetchMarket = async (market: string): Promise<any[]> => {
        try {
          const url = `https://scanner.tradingview.com/${market}/scan`;
          // Use symbols.tickers to find exact + prefix matches
          const body = {
            columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic"],
            sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
            range: [0, 10],
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
            const name = item.d?.[0] || "";
            const upperName = name.toUpperCase();
            const upperQuery = query.toUpperCase();
            // Client-side filter: name starts with or contains query
            if (upperName.startsWith(upperQuery) || upperName.includes(upperQuery)) {
              const parts = (item.s || "").split(":");
              results.push({
                symbol: parts.length > 1 ? parts[1] : parts[0],
                description: item.d?.[1] || "",
                type: item.d?.[2] || "stock",
                exchange: parts.length > 1 ? parts[0] : "",
                country: "",
                market_cap: item.d?.[5] || 0,
              });
            }
          }
          return results;
        } catch {
          return [];
        }
      };

      const allResults = await Promise.all(markets.map(fetchMarket));
      const merged = allResults.flat();

      // Sort: exact matches first, then starts-with, then contains
      const upperQuery = query.toUpperCase();
      merged.sort((a, b) => {
        const aExact = a.symbol.toUpperCase() === upperQuery ? 0 : 1;
        const bExact = b.symbol.toUpperCase() === upperQuery ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const aStarts = a.symbol.toUpperCase().startsWith(upperQuery) ? 0 : 1;
        const bStarts = b.symbol.toUpperCase().startsWith(upperQuery) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;

        return (b.market_cap || 0) - (a.market_cap || 0);
      });

      const seen = new Set<string>();
      symbols = merged.filter(s => {
        const key = `${s.exchange}:${s.symbol}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 25);
    }

    console.log(`[tv-symbol-search] Final: ${symbols.length} results for "${query}"`);

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
