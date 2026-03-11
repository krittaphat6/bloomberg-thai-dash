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

    // Use TradingView's scanner with search parameter
    const markets = ["america", "thailand", "hongkong", "japan", "germany", "uk", "india", "singapore", "australia", "korea"];
    
    const fetchMarket = async (market: string): Promise<any[]> => {
      try {
        const url = `https://scanner.tradingview.com/${market}/scan`;
        const body = {
          columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic", "close", "change"],
          sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
          range: [0, 10],
          markets: [market],
          options: { lang },
          symbols: { query: { types: [] } },
          filter2: {
            operator: "and",
            operands: [
              {
                operation: {
                  operator: "match",
                  operand: query.toUpperCase(),
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
          // Try without filter2, just use symbols.tickers approach
          const body2 = {
            columns: ["name", "description", "type", "exchange", "sector", "market_cap_basic", "close", "change"],
            sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
            range: [0, 10],
            markets: [market],
            options: { lang },
            symbols: {
              query: {
                types: [],
              },
              tickers: [],
            },
            filter: [
              {
                left: "name",
                operation: "match",
                right: query.toUpperCase(),
              },
            ],
          };
          
          const res2 = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Origin": "https://www.tradingview.com",
              "Referer": "https://www.tradingview.com/",
            },
            body: JSON.stringify(body2),
          });
          
          if (!res2.ok) {
            const errText = await res2.text();
            console.error(`[tv-symbol-search] ${market} fallback error ${res2.status}: ${errText.substring(0, 200)}`);
            return [];
          }
          
          const data2 = await res2.json();
          return parseResults(data2);
        }

        const data = await res.json();
        return parseResults(data);
      } catch (e) {
        console.error(`[tv-symbol-search] ${market} error:`, e.message);
        return [];
      }
    };

    const parseResults = (data: any): any[] => {
      return (data.data || []).map((item: any) => {
        const parts = (item.s || "").split(":");
        const exchange = parts.length > 1 ? parts[0] : "";
        const symbol = parts.length > 1 ? parts[1] : parts[0];
        return {
          symbol,
          description: item.d?.[1] || "",
          type: item.d?.[2] || "stock",
          exchange,
          country: item.d?.[4] || "",
          market_cap: item.d?.[5] || 0,
          close: item.d?.[6] || 0,
          change: item.d?.[7] || 0,
        };
      });
    };

    // Fetch from priority markets first, then others
    const priorityMarkets = ["america", "thailand"];
    const otherMarkets = markets.filter(m => !priorityMarkets.includes(m));
    
    const [priorityResults, otherResults] = await Promise.all([
      Promise.all(priorityMarkets.map(fetchMarket)),
      Promise.all(otherMarkets.map(fetchMarket)),
    ]);

    const merged = [...priorityResults.flat(), ...otherResults.flat()];

    // Deduplicate
    const seen = new Set<string>();
    const symbols = merged.filter(s => {
      const key = `${s.exchange}:${s.symbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 25);

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
