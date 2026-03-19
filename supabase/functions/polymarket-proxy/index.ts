import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';
const DATA_API = 'https://data-api.polymarket.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();
    let result: any = null;

    switch (action) {
      case 'events': {
        const qp = new URLSearchParams({
          limit: params?.limit?.toString() || '100',
          active: params?.active?.toString() || 'true',
          closed: params?.closed?.toString() || 'false',
          order: params?.order || 'volume24hr',
          ascending: 'false',
          ...(params?.tag && { tag: params.tag }),
          ...(params?.offset !== undefined && { offset: params.offset.toString() }),
        });
        const res = await fetch(`${GAMMA_API}/events?${qp}`);
        result = await res.json();
        break;
      }
      case 'event_detail': {
        const res = await fetch(`${GAMMA_API}/events/${params.eventId}`);
        result = await res.json();
        break;
      }
      case 'markets': {
        const qp = new URLSearchParams({
          limit: params?.limit?.toString() || '100',
          active: params?.active?.toString() || 'true',
          closed: params?.closed?.toString() || 'false',
          order: params?.order || 'volume24hr',
          ascending: 'false',
          ...(params?.tag && { tag: params.tag }),
          ...(params?.offset !== undefined && { offset: params.offset.toString() }),
        });
        const res = await fetch(`${GAMMA_API}/markets?${qp}`);
        result = await res.json();
        break;
      }
      case 'market_detail': {
        const res = await fetch(`${GAMMA_API}/markets/${params.marketId}`);
        result = await res.json();
        break;
      }
      case 'search': {
        const res = await fetch(`${GAMMA_API}/events?limit=20&active=true&closed=false&title_contains=${encodeURIComponent(params.query)}`);
        result = await res.json();
        break;
      }
      case 'tags': {
        const res = await fetch(`${GAMMA_API}/events/tags`);
        result = await res.json();
        break;
      }
      case 'price_history': {
        const qp = new URLSearchParams({
          market: params.tokenId,
          interval: params.interval || 'max',
          fidelity: params.fidelity?.toString() || '60',
        });
        const res = await fetch(`${CLOB_API}/prices-history?${qp}`);
        result = await res.json();
        break;
      }
      case 'orderbook': {
        const res = await fetch(`${CLOB_API}/book?token_id=${params.tokenId}`);
        result = await res.json();
        break;
      }
      case 'spread': {
        const res = await fetch(`${CLOB_API}/spread?token_id=${params.tokenId}`);
        result = await res.json();
        break;
      }
      case 'trades': {
        const qp = new URLSearchParams();
        if (params?.market) qp.set('market', params.market);
        if (params?.asset_id) qp.set('asset', params.asset_id);
        if (params?.limit) qp.set('limit', params.limit.toString());
        const res = await fetch(`${DATA_API}/trades?${qp}`);
        result = await res.json();
        break;
      }
      case 'holders': {
        const qp = new URLSearchParams({ market: params.market });
        if (params?.limit) qp.set('limit', params.limit.toString());
        const res = await fetch(`${GAMMA_API}/markets/${params.market}/holders?${qp}`);
        result = await res.json();
        break;
      }
      case 'open_interest': {
        const res = await fetch(`${CLOB_API}/spread?token_id=${params.market}`);
        result = await res.json();
        break;
      }
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result, timestamp: Date.now() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Polymarket proxy error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
