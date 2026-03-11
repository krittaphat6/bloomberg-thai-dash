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

    const params = new URLSearchParams({
      text: text.trim(),
      lang,
      type: type || "",
      exchange: "",
    });

    const url = `https://symbol-search.tradingview.com/symbol_search/v3/?${params}`;

    console.log(`[tv-symbol-search] Searching: "${text}"`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://www.tradingview.com",
        "Referer": "https://www.tradingview.com/",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[tv-symbol-search] API error: ${response.status}`);
      return new Response(JSON.stringify({ symbols: [], error: `API returned ${response.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Transform TradingView response to clean format
    const symbols = (data.symbols || data || []).slice(0, 20).map((item: any) => ({
      symbol: item.symbol || "",
      description: item.description || "",
      type: item.type || "stock",
      exchange: item.exchange || "",
      provider_id: item.provider_id || "",
      currency_code: item.currency_code || "",
      country: item.country || "",
      logo_id: item.logoid || "",
      logo_urls: item.logo_urls || [],
    }));

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
