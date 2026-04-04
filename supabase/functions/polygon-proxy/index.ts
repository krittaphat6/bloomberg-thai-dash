import { corsHeaders } from '@supabase/supabase-js/cors'

const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY') || '';
const BASE = 'https://api.polygon.io';
const CACHE = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000;

function cached(key: string) {
  const c = CACHE.get(key);
  if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
  return null;
}

async function polyFetch(path: string, params: Record<string, string> = {}) {
  const cacheKey = path + JSON.stringify(params);
  const hit = cached(cacheKey);
  if (hit) return hit;

  const url = new URL(path, BASE);
  url.searchParams.set('apiKey', POLYGON_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Polygon ${res.status}: ${txt}`);
  }
  const data = await res.json();
  CACHE.set(cacheKey, { data, ts: Date.now() });
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, symbols, symbol, timeframe, from, to, limit, ticker, sort, order } = body;

    let result: unknown;

    switch (action) {
      case 'grouped_daily': {
        // All tickers for a date — grouped bars
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await polyFetch(`/v2/aggs/grouped/locale/us/market/stocks/${date}`);
        break;
      }

      case 'snapshot_all': {
        // All tickers snapshot
        result = await polyFetch('/v2/snapshot/locale/us/markets/stocks/tickers', {
          ...(body.tickers ? { tickers: body.tickers } : {}),
        });
        break;
      }

      case 'snapshot_gainers': {
        result = await polyFetch('/v2/snapshot/locale/us/markets/stocks/gainers');
        break;
      }

      case 'snapshot_losers': {
        result = await polyFetch('/v2/snapshot/locale/us/markets/stocks/losers');
        break;
      }

      case 'ticker_details': {
        result = await polyFetch(`/v3/reference/tickers/${ticker || symbol}`);
        break;
      }

      case 'tickers': {
        // List tickers with search
        const params: Record<string, string> = {
          market: body.market || 'stocks',
          active: 'true',
          limit: String(limit || 100),
          order: order || 'asc',
          sort: sort || 'ticker',
        };
        if (body.search) params.search = body.search;
        if (body.type) params.type = body.type;
        if (body.exchange) params.exchange = body.exchange;
        result = await polyFetch('/v3/reference/tickers', params);
        break;
      }

      case 'aggregates': {
        // OHLCV bars
        const tf = timeframe || '1/day';
        const [mult, span] = tf.split('/');
        const fromDate = from || '2024-01-01';
        const toDate = to || new Date().toISOString().split('T')[0];
        result = await polyFetch(
          `/v2/aggs/ticker/${symbol}/range/${mult}/${span}/${fromDate}/${toDate}`,
          { adjusted: 'true', sort: 'asc', limit: String(limit || 500) }
        );
        break;
      }

      case 'previous_close': {
        result = await polyFetch(`/v2/aggs/ticker/${symbol}/prev`);
        break;
      }

      case 'quotes': {
        // Multiple symbols snapshot
        if (symbols?.length) {
          const tickers = symbols.join(',');
          result = await polyFetch('/v2/snapshot/locale/us/markets/stocks/tickers', { tickers });
        }
        break;
      }

      case 'market_status': {
        result = await polyFetch('/v1/marketstatus/now');
        break;
      }

      case 'news': {
        const params: Record<string, string> = { limit: String(limit || 20), order: 'desc', sort: 'published_utc' };
        if (ticker) params.ticker = ticker;
        result = await polyFetch('/v2/reference/news', params);
        break;
      }

      case 'related': {
        result = await polyFetch(`/v1/related-companies/${ticker || symbol}`);
        break;
      }

      case 'financials': {
        result = await polyFetch(`/vX/reference/financials`, {
          ticker: ticker || symbol,
          limit: String(limit || 4),
          sort: 'filing_date',
          order: 'desc',
        });
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
