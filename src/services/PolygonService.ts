import { supabase } from '@/integrations/supabase/client';

export interface PolygonTicker {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
  marketCap?: number;
  vwap?: number;
  todaysChange?: number;
  todaysChangePerc?: number;
  updated?: number;
}

export interface PolygonOHLCV {
  o: number; h: number; l: number; c: number; v: number; t: number; vw?: number; n?: number;
}

export interface PolygonNews {
  id: string;
  title: string;
  author: string;
  published_utc: string;
  article_url: string;
  tickers: string[];
  description?: string;
  image_url?: string;
}

const CACHE = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 25_000;

function fromCache(key: string) {
  const c = CACHE.get(key);
  return c && Date.now() - c.ts < CACHE_TTL ? c.data : null;
}

async function invoke(body: Record<string, any>) {
  const key = JSON.stringify(body);
  const hit = fromCache(key);
  if (hit) return hit;
  
  const { data, error } = await supabase.functions.invoke('polygon-proxy', { body });
  if (error) throw error;
  CACHE.set(key, { data, ts: Date.now() });
  return data;
}

export const PolygonService = {
  async getAllSnapshots(): Promise<PolygonTicker[]> {
    const data = await invoke({ action: 'snapshot_all' });
    return (data?.tickers || []).map(mapSnapshot);
  },

  async getGainers(): Promise<PolygonTicker[]> {
    const data = await invoke({ action: 'snapshot_gainers' });
    return (data?.tickers || []).map(mapSnapshot);
  },

  async getLosers(): Promise<PolygonTicker[]> {
    const data = await invoke({ action: 'snapshot_losers' });
    return (data?.tickers || []).map(mapSnapshot);
  },

  async getQuotes(symbols: string[]): Promise<PolygonTicker[]> {
    const data = await invoke({ action: 'quotes', symbols });
    return (data?.tickers || []).map(mapSnapshot);
  },

  async getAggregates(symbol: string, timeframe = '1/day', from?: string, to?: string): Promise<PolygonOHLCV[]> {
    const data = await invoke({ action: 'aggregates', symbol, timeframe, from, to, limit: 500 });
    return data?.results || [];
  },

  async getTickerDetails(ticker: string) {
    const data = await invoke({ action: 'ticker_details', ticker });
    return data?.results;
  },

  async searchTickers(search: string, limit = 20) {
    const data = await invoke({ action: 'tickers', search, limit });
    return data?.results || [];
  },

  async getNews(ticker?: string, limit = 20): Promise<PolygonNews[]> {
    const data = await invoke({ action: 'news', ticker, limit });
    return data?.results || [];
  },

  async getMarketStatus() {
    return invoke({ action: 'market_status' });
  },

  async getPreviousClose(symbol: string) {
    const data = await invoke({ action: 'previous_close', symbol });
    return data?.results?.[0];
  },

  async getRelated(ticker: string) {
    const data = await invoke({ action: 'related', ticker });
    return data?.results || [];
  },

  async getFinancials(ticker: string) {
    const data = await invoke({ action: 'financials', ticker, limit: 4 });
    return data?.results || [];
  },

  formatVolume(v: number): string {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  },

  formatPrice(p: number): string {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  },
};

function mapSnapshot(t: any): PolygonTicker {
  const day = t.day || {};
  const prev = t.prevDay || {};
  const change = (day.c || 0) - (prev.c || 0);
  const changePercent = prev.c ? (change / prev.c) * 100 : t.todaysChangePerc || 0;
  return {
    ticker: t.ticker,
    name: t.ticker,
    price: day.c || t.lastTrade?.p || 0,
    change: t.todaysChange || change,
    changePercent: t.todaysChangePerc || changePercent,
    volume: day.v || 0,
    open: day.o || 0,
    high: day.h || 0,
    low: day.l || 0,
    close: day.c || 0,
    prevClose: prev.c || 0,
    vwap: day.vw || 0,
    todaysChange: t.todaysChange,
    todaysChangePerc: t.todaysChangePerc,
    updated: t.updated,
  };
}

export default PolygonService;
