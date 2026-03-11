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
    const { text, type, lang = "en" } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ symbols: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[tv-symbol-search] Searching: "${text}"`);

    // Use the TradingView scanner API to search for symbols instead of the symbol_search endpoint
    // which blocks server-side requests with 400/403
    const scanUrl = "https://scanner.tradingview.com/america/scan";
    const tvBody = {
      columns: ["name", "description", "type", "exchange", "country", "sector"],
      filter2: {
        operator: "and",
        operands: [{
          operation: { operator: "match", operand: text.trim() }
        }]
      },
      sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
      range: [0, 15],
      options: { lang },
    };

    // Try multiple markets in parallel to get broader results
    const markets = ["america", "thailand", "hongkong", "japan", "germany", "uk", "india", "singapore", "australia", "korea", "china"];
    
    const fetchMarket = async (market: string) => {
      try {
        const url = `https://scanner.tradingview.com/${market}/scan`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Origin": "https://www.tradingview.com",
            "Referer": "https://www.tradingview.com/",
          },
          body: JSON.stringify({
            ...tvBody,
            markets: [market],
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          return [];
        }
        const data = await res.json();
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
          };
        });
      } catch {
        return [];
      }
    };

    // Fetch from all markets in parallel
    const allResults = await Promise.all(markets.map(fetchMarket));
    const merged = allResults.flat();

    // Deduplicate by exchange:symbol
    const seen = new Set<string>();
    const symbols = merged.filter(s => {
      const key = `${s.exchange}:${s.symbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 20);

    console.log(`[tv-symbol-search] Found ${symbols.length} results for "${text}"`);

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
