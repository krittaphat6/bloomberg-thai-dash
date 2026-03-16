import { supabase } from '@/integrations/supabase/client';

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  volume24hr: number;
  markets: PolymarketMarket[];
  tags: string[];
  commentCount: number;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  liquidity: string;
  volume: string;
  volume24hr: number;
  outcomes: string;
  outcomePrices: string;
  clobTokenIds: string;
  active: boolean;
  closed: boolean;
  enableOrderBook: boolean;
  image: string;
  icon: string;
  description: string;
  tags: string[];
}

export interface OrderbookData {
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
  hash: string;
  timestamp: string;
  market: string;
}

export interface PriceHistoryPoint {
  t: number;
  p: number;
}

const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 60_000;

function getCached<T>(key: string): T | null {
  const c = cache.get(key);
  if (c && Date.now() - c.timestamp < CACHE_DURATION) return c.data as T;
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function callProxy(action: string, params: Record<string, any> = {}): Promise<any> {
  const { data, error } = await supabase.functions.invoke('polymarket-proxy', {
    body: { action, params },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Proxy call failed');
  return data.data;
}

export const PolymarketService = {
  async getTrendingEvents(limit = 20, tag?: string): Promise<PolymarketEvent[]> {
    const ck = `events_${limit}_${tag || 'all'}`;
    const cached = getCached<PolymarketEvent[]>(ck);
    if (cached) return cached;
    const result = await callProxy('events', { limit, tag, order: 'volume24hr' });
    setCache(ck, result);
    return result;
  },

  async getMarkets(limit = 50, tag?: string): Promise<PolymarketMarket[]> {
    const ck = `markets_${limit}_${tag || 'all'}`;
    const cached = getCached<PolymarketMarket[]>(ck);
    if (cached) return cached;
    const result = await callProxy('markets', { limit, tag });
    setCache(ck, result);
    return result;
  },

  async searchEvents(query: string): Promise<PolymarketEvent[]> {
    return await callProxy('search', { query });
  },

  async getPriceHistory(tokenId: string, interval = 'max', fidelity = 60): Promise<PriceHistoryPoint[]> {
    const ck = `history_${tokenId}_${interval}`;
    const cached = getCached<PriceHistoryPoint[]>(ck);
    if (cached) return cached;
    const result = await callProxy('price_history', { tokenId, interval, fidelity });
    const history = result?.history || [];
    setCache(ck, history);
    return history;
  },

  async getOrderbook(tokenId: string): Promise<OrderbookData> {
    return await callProxy('orderbook', { tokenId });
  },

  parseOutcomes(market: PolymarketMarket): { outcome: string; price: number; tokenId: string }[] {
    try {
      const outcomes: string[] = JSON.parse(market.outcomes || '[]');
      const prices: string[] = JSON.parse(market.outcomePrices || '[]');
      const tokenIds: string[] = JSON.parse(market.clobTokenIds || '[]');
      return outcomes.map((o, i) => ({
        outcome: o,
        price: parseFloat(prices[i] || '0'),
        tokenId: tokenIds[i] || '',
      }));
    } catch {
      return [];
    }
  },

  formatVolume(vol: number): string {
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  },

  formatProbability(price: number): string {
    return `${Math.round(price * 100)}%`;
  },
};
