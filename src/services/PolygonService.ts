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
  vwap?: number;
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
  insights?: Array<{ ticker: string; sentiment: string; sentiment_reasoning: string }>;
}

const CACHE = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30_000;

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

// US stock tickers organized by sector for batch loading
const MAJOR_TICKERS = [
  'AAPL','MSFT','GOOGL','META','NVDA','AMZN','TSLA','AVGO','JPM','V',
  'UNH','XOM','MA','JNJ','HD','PG','COST','ABBV','BAC','CRM',
  'MRK','LLY','NFLX','AMD','ADBE','PEP','TMO','CSCO','ACN','WMT',
  'MCD','ABT','DHR','ORCL','TXN','PM','QCOM','MS','GS','CAT',
  'BA','HON','UPS','RTX','GE','LMT','NEE','SO','DUK','BLK',
  'INTC','PLTR','SHOP','SQ','SNOW','NET','CRWD','DDOG','ZS','PANW',
  'WFC','C','SCHW','AXP','PNC','COF','FIS','CME','SPGI','ICE',
  'PFE','BMY','AMGN','GILD','ISRG','CVS','REGN','VRTX','MDT','HCA',
  'CVX','COP','SLB','EOG','MPC','OXY','PSX','VLO','HAL','DVN',
  'NKE','SBUX','TGT','LOW','KO','CL','EL','GIS','MDLZ','DE',
];

export const PolygonService = {
  /**
   * Fetch price data for all major tickers using previous_close (free tier)
   * We batch them in groups to respect rate limits
   */
  async getAllStocks(): Promise<PolygonTicker[]> {
    const results: PolygonTicker[] = [];
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < MAJOR_TICKERS.length; i += BATCH_SIZE) {
      const batch = MAJOR_TICKERS.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (ticker) => {
        try {
          const data = await invoke({ action: 'previous_close', symbol: ticker });
          const r = data?.results?.[0];
          if (r) {
            // Also fetch ticker name from cache or reference
            return {
              ticker: r.T || ticker,
              name: TICKER_NAMES[ticker] || ticker,
              price: r.c,
              change: r.c - r.o,
              changePercent: r.o > 0 ? ((r.c - r.o) / r.o) * 100 : 0,
              volume: r.v || 0,
              open: r.o,
              high: r.h,
              low: r.l,
              close: r.c,
              prevClose: r.o,
              vwap: r.vw,
            };
          }
        } catch { /* skip failed */ }
        return null;
      });
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.filter(Boolean) as PolygonTicker[]);
      
      // Small delay between batches for rate limit
      if (i + BATCH_SIZE < MAJOR_TICKERS.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return results;
  },

  async getAggregates(symbol: string, timeframe = '1/day', from?: string, to?: string, limit = 500): Promise<PolygonOHLCV[]> {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await invoke({
      action: 'aggregates', symbol, timeframe,
      from: from || defaultFrom,
      to: to || now.toISOString().split('T')[0],
      limit,
    });
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

  async getFinancials(ticker: string) {
    const data = await invoke({ action: 'financials', ticker, limit: 4 });
    return data?.results || [];
  },

  formatVolume(v: number): string {
    if (!v) return '$0';
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  },

  formatPrice(p: number): string {
    if (!p) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  },
};

// Ticker name mapping for display
const TICKER_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', GOOGL: 'Alphabet Inc.', META: 'Meta Platforms',
  NVDA: 'NVIDIA Corp.', AMZN: 'Amazon.com', TSLA: 'Tesla Inc.', AVGO: 'Broadcom Inc.',
  JPM: 'JPMorgan Chase', V: 'Visa Inc.', UNH: 'UnitedHealth Group', XOM: 'Exxon Mobil',
  MA: 'Mastercard Inc.', JNJ: 'Johnson & Johnson', HD: 'Home Depot', PG: 'Procter & Gamble',
  COST: 'Costco Wholesale', ABBV: 'AbbVie Inc.', BAC: 'Bank of America', CRM: 'Salesforce',
  MRK: 'Merck & Co.', LLY: 'Eli Lilly', NFLX: 'Netflix Inc.', AMD: 'Advanced Micro Devices',
  ADBE: 'Adobe Inc.', PEP: 'PepsiCo Inc.', TMO: 'Thermo Fisher', CSCO: 'Cisco Systems',
  ACN: 'Accenture', WMT: 'Walmart Inc.', MCD: "McDonald's", ABT: 'Abbott Labs',
  DHR: 'Danaher Corp.', ORCL: 'Oracle Corp.', TXN: 'Texas Instruments', PM: 'Philip Morris',
  QCOM: 'Qualcomm Inc.', MS: 'Morgan Stanley', GS: 'Goldman Sachs', CAT: 'Caterpillar',
  BA: 'Boeing Co.', HON: 'Honeywell', UPS: 'United Parcel Service', RTX: 'RTX Corp.',
  GE: 'GE Aerospace', LMT: 'Lockheed Martin', NEE: 'NextEra Energy', SO: 'Southern Co.',
  DUK: 'Duke Energy', BLK: 'BlackRock Inc.', INTC: 'Intel Corp.', PLTR: 'Palantir Tech.',
  SHOP: 'Shopify Inc.', SQ: 'Block Inc.', SNOW: 'Snowflake Inc.', NET: 'Cloudflare Inc.',
  CRWD: 'CrowdStrike', DDOG: 'Datadog Inc.', ZS: 'Zscaler Inc.', PANW: 'Palo Alto Networks',
  WFC: 'Wells Fargo', C: 'Citigroup Inc.', SCHW: 'Charles Schwab', AXP: 'American Express',
  PNC: 'PNC Financial', COF: 'Capital One', FIS: 'Fidelity National', CME: 'CME Group',
  SPGI: 'S&P Global', ICE: 'Intercontinental Exchange', PFE: 'Pfizer Inc.', BMY: 'Bristol-Myers Squibb',
  AMGN: 'Amgen Inc.', GILD: 'Gilead Sciences', ISRG: 'Intuitive Surgical', CVS: 'CVS Health',
  REGN: 'Regeneron', VRTX: 'Vertex Pharma', MDT: 'Medtronic', HCA: 'HCA Healthcare',
  CVX: 'Chevron Corp.', COP: 'ConocoPhillips', SLB: 'Schlumberger', EOG: 'EOG Resources',
  MPC: 'Marathon Petroleum', OXY: 'Occidental Petroleum', PSX: 'Phillips 66', VLO: 'Valero Energy',
  HAL: 'Halliburton', DVN: 'Devon Energy', NKE: 'Nike Inc.', SBUX: 'Starbucks',
  TGT: 'Target Corp.', LOW: "Lowe's", KO: 'Coca-Cola', CL: 'Colgate-Palmolive',
  EL: 'Estée Lauder', GIS: 'General Mills', MDLZ: 'Mondelez Intl.', DE: 'John Deere',
};

export default PolygonService;
