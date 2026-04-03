/**
 * OpenBB Local API Client
 * Connects to OpenBB FastAPI backend at localhost:6900
 */

const OPENBB_BASE = 'http://localhost:6900';
const CACHE_TTL = 30_000; // 30s

interface CacheEntry {
  data: any;
  ts: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}

async function openbbFetch(path: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${OPENBB_BASE}/api/v1${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const cacheKey = url.toString();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`OpenBB ${resp.status}`);
      const data = await resp.json();
      setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      lastErr = e;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ===== API Endpoints =====

export const openbb = {
  // --- Health ---
  async health(): Promise<boolean> {
    try {
      await fetch(`${OPENBB_BASE}/api/v1/system/version`, { signal: AbortSignal.timeout(5000) });
      return true;
    } catch { return false; }
  },

  // --- Equity ---
  equity: {
    quote: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/price/quote', { symbol, provider }),
    historical: (symbol: string, start_date?: string, end_date?: string, provider = 'fmp') =>
      openbbFetch('/equity/price/historical', { symbol, provider, ...(start_date && { start_date }), ...(end_date && { end_date }) }),
    search: (query: string, provider = 'fmp') =>
      openbbFetch('/equity/search', { query, provider }),
    profile: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/profile', { symbol, provider }),
    income: (symbol: string, period = 'annual', provider = 'fmp') =>
      openbbFetch('/equity/fundamental/income', { symbol, period, provider }),
    balance: (symbol: string, period = 'annual', provider = 'fmp') =>
      openbbFetch('/equity/fundamental/balance', { symbol, period, provider }),
    cashflow: (symbol: string, period = 'annual', provider = 'fmp') =>
      openbbFetch('/equity/fundamental/cash', { symbol, period, provider }),
    ratios: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/fundamental/ratios', { symbol, provider }),
    dividends: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/fundamental/dividends', { symbol, provider }),
    earnings: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/fundamental/earnings', { symbol, provider }),
    metrics: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/fundamental/metrics', { symbol, provider }),
    screener: (provider = 'fmp') =>
      openbbFetch('/equity/screener', { provider }),
    calendar: (provider = 'fmp') =>
      openbbFetch('/equity/calendar/earnings', { provider }),
    multiples: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/fundamental/multiples', { symbol, provider }),
    ownership: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/ownership/institutional', { symbol, provider }),
    shortInterest: (symbol: string, provider = 'stocksera') =>
      openbbFetch('/equity/shorts/fails_to_deliver', { symbol, provider }),
    darkPool: (symbol: string, provider = 'finra') =>
      openbbFetch('/equity/darkpool/otc', { symbol, provider }),
    analysts: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/estimates/analyst', { symbol, provider }),
    priceTarget: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/estimates/price_target', { symbol, provider }),
    insiderTrading: (symbol: string, provider = 'fmp') =>
      openbbFetch('/equity/ownership/insider_trading', { symbol, provider }),
    news: (symbol: string, provider = 'fmp') =>
      openbbFetch('/news/company', { symbol, provider }),
  },

  // --- Crypto ---
  crypto: {
    quote: (symbol: string, provider = 'fmp') =>
      openbbFetch('/crypto/price/quote', { symbol, provider }),
    historical: (symbol: string, provider = 'fmp') =>
      openbbFetch('/crypto/price/historical', { symbol, provider }),
    search: (query: string) =>
      openbbFetch('/crypto/search', { query }),
  },

  // --- Forex ---
  forex: {
    quote: (symbol: string, provider = 'fmp') =>
      openbbFetch('/currency/price/quote', { symbol, provider }),
    historical: (symbol: string, provider = 'fmp') =>
      openbbFetch('/currency/price/historical', { symbol, provider }),
    pairs: (provider = 'fmp') =>
      openbbFetch('/currency/pairs', { provider }),
  },

  // --- Commodities ---
  commodities: {
    historical: (symbol: string, provider = 'fmp') =>
      openbbFetch('/commodity/price/historical', { symbol, provider }),
  },

  // --- Economy ---
  economy: {
    calendar: (provider = 'fmp') =>
      openbbFetch('/economy/calendar', { provider }),
    gdp: (provider = 'oecd') =>
      openbbFetch('/economy/gdp/nominal', { provider }),
    cpi: (provider = 'fred') =>
      openbbFetch('/economy/cpi', { provider }),
    unemployment: (provider = 'oecd') =>
      openbbFetch('/economy/unemployment', { provider }),
    fedRate: (provider = 'fred') =>
      openbbFetch('/economy/fred_series', { series_id: 'FEDFUNDS', provider }),
    treasury: (provider = 'fmp') =>
      openbbFetch('/economy/treasury_rates', { provider }),
    indicators: (symbol: string, provider = 'fred') =>
      openbbFetch('/economy/fred_series', { series_id: symbol, provider }),
  },

  // --- ETF ---
  etf: {
    search: (query: string, provider = 'fmp') =>
      openbbFetch('/etf/search', { query, provider }),
    holdings: (symbol: string, provider = 'fmp') =>
      openbbFetch('/etf/holdings', { symbol, provider }),
    info: (symbol: string, provider = 'fmp') =>
      openbbFetch('/etf/info', { symbol, provider }),
    historical: (symbol: string, provider = 'fmp') =>
      openbbFetch('/etf/price/historical', { symbol, provider }),
  },

  // --- Fixed Income ---
  fixedIncome: {
    yieldCurve: (provider = 'fred') =>
      openbbFetch('/fixedincome/government/yield_curve', { provider }),
    corporate: (provider = 'fred') =>
      openbbFetch('/fixedincome/corporate/spot_rates', { provider }),
  },

  // --- News ---
  news: {
    world: (provider = 'benzinga') =>
      openbbFetch('/news/world', { provider }),
    company: (symbol: string, provider = 'benzinga') =>
      openbbFetch('/news/company', { symbol, provider }),
  },

  // --- Technical ---
  technical: {
    sma: (symbol: string, period = '50') =>
      openbbFetch('/technical/sma', { symbol, period }),
    rsi: (symbol: string, period = '14') =>
      openbbFetch('/technical/rsi', { symbol, period }),
    macd: (symbol: string) =>
      openbbFetch('/technical/macd', { symbol }),
    bbands: (symbol: string) =>
      openbbFetch('/technical/bbands', { symbol }),
    adx: (symbol: string) =>
      openbbFetch('/technical/adx', { symbol }),
  },

  // --- Derivatives ---
  derivatives: {
    options: (symbol: string, provider = 'cboe') =>
      openbbFetch('/derivatives/options/chains', { symbol, provider }),
    futures: (symbol: string, provider = 'yfinance') =>
      openbbFetch('/derivatives/futures/curve', { symbol, provider }),
  },

  // --- Index ---
  index: {
    market: (provider = 'fmp') =>
      openbbFetch('/index/market', { provider }),
    constituents: (symbol: string, provider = 'fmp') =>
      openbbFetch('/index/constituents', { symbol, provider }),
    historical: (symbol: string, provider = 'fmp') =>
      openbbFetch('/index/price/historical', { symbol, provider }),
  },

  // --- Alternative ---
  alternative: {
    fearGreed: () =>
      openbbFetch('/alternative/fear_and_greed', {}),
  },
};

// React hook
import { useState, useEffect, useCallback } from 'react';

export function useOpenBB<T = any>(
  fetcher: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: any) {
      setError(e.message || 'OpenBB unavailable');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export function useOpenBBHealth() {
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const check = async () => {
      const ok = await openbb.health();
      setConnected(ok);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return connected;
}
