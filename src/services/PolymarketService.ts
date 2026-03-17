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

export interface MarketHolder {
  proxyWallet: string;
  asset: string;
  size: number;
  avgPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  title: string;
  outcome: string;
}

export interface TradeData {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  outcome: string;
  bucket_index: number;
  title: string;
}

const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 30_000;

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

  async getAllActiveEvents(): Promise<PolymarketEvent[]> {
    const ck = 'all_active_events';
    const cached = getCached<PolymarketEvent[]>(ck);
    if (cached) return cached;

    const allEvents: PolymarketEvent[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore && offset < 500) {
      try {
        const result = await callProxy('events', { limit, offset, order: 'volume24hr' });
        if (!result || !Array.isArray(result) || result.length === 0) {
          hasMore = false;
        } else {
          allEvents.push(...result);
          offset += limit;
          if (result.length < limit) hasMore = false;
        }
      } catch {
        hasMore = false;
      }
    }
    console.log(`[Polymarket] Fetched ${allEvents.length} total active events`);
    setCache(ck, allEvents);
    return allEvents;
  },

  async getAllActiveMarkets(): Promise<PolymarketMarket[]> {
    const ck = 'all_active_markets';
    const cached = getCached<PolymarketMarket[]>(ck);
    if (cached) return cached;

    const allMarkets: PolymarketMarket[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore && offset < 500) {
      try {
        const result = await callProxy('markets', { limit, offset, order: 'volume24hr' });
        if (!result || !Array.isArray(result) || result.length === 0) {
          hasMore = false;
        } else {
          allMarkets.push(...result);
          offset += limit;
          if (result.length < limit) hasMore = false;
        }
      } catch {
        hasMore = false;
      }
    }
    console.log(`[Polymarket] Fetched ${allMarkets.length} total active markets`);
    setCache(ck, allMarkets);
    return allMarkets;
  },

  extractTokenIds(markets: PolymarketMarket[]): string[] {
    const tokenIds: string[] = [];
    for (const market of markets) {
      try {
        const ids: string[] = JSON.parse(market.clobTokenIds || '[]');
        tokenIds.push(...ids.filter(Boolean));
      } catch { /* skip */ }
    }
    return tokenIds;
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

  async getSpread(tokenId: string): Promise<any> {
    return await callProxy('spread', { tokenId });
  },

  async getRecentTrades(market: string, limit = 20): Promise<TradeData[]> {
    try { return await callProxy('trades', { market, limit }); }
    catch { return []; }
  },

  async getHolders(market: string, limit = 10): Promise<MarketHolder[]> {
    try { return await callProxy('holders', { market, limit }); }
    catch { return []; }
  },

  async getOpenInterest(market: string): Promise<any> {
    try { return await callProxy('open_interest', { market }); }
    catch { return null; }
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
    } catch { return []; }
  },

  formatVolume(vol: number): string {
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  },

  formatProbability(price: number): string {
    return `${Math.round(price * 100)}%`;
  },

  kellyFraction(probability: number, odds: number): number {
    const q = 1 - probability;
    const kelly = (probability * odds - q) / odds;
    return Math.max(0, Math.min(kelly, 1));
  },

  expectedValue(probability: number, betAmount: number, payout: number): number {
    return probability * payout - (1 - probability) * betAmount;
  },

  impliedProbability(price: number): number {
    return Math.max(0, Math.min(price, 1));
  },

  breakEvenProb(price: number): number { return price; },

  potentialROI(entryPrice: number): number {
    if (entryPrice <= 0 || entryPrice >= 1) return 0;
    return ((1 - entryPrice) / entryPrice) * 100;
  },

  predictionSharpe(probability: number, price: number): number {
    const edge = probability - price;
    const variance = price * (1 - price);
    if (variance <= 0) return 0;
    return edge / Math.sqrt(variance);
  },

  riskReward(entryPrice: number): { risk: number; reward: number; ratio: number } {
    const risk = entryPrice;
    const reward = 1 - entryPrice;
    return { risk, reward, ratio: reward > 0 ? risk / reward : Infinity };
  },
};
