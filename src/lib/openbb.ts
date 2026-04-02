import { useState, useEffect, useCallback, useRef } from 'react';

const OPENBB_BASE = 'http://localhost:6900';
const CACHE_TTL = 30_000;

interface CacheEntry { data: any; ts: number }
const cache = new Map<string, CacheEntry>();

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
}

export async function openbbFetch<T = any>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  retries = 3
): Promise<T> {
  const url = new URL(`${OPENBB_BASE}${endpoint}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  
  const cacheKey = url.toString();
  const cached = getCached(cacheKey);
  if (cached) return cached as T;

  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`OpenBB ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const data = json?.results ?? json;
      setCache(cacheKey, data);
      return data as T;
    } catch (e: any) {
      lastError = e;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastError ?? new Error('OpenBB fetch failed');
}

export async function checkOpenBBConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENBB_BASE}/api/v1/system/user`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useOpenBB() {
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const check = async () => setIsConnected(await checkOpenBBConnection());
    check();
    intervalRef.current = setInterval(check, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchEquity = useCallback((symbol: string, provider = 'fmp') =>
    openbbFetch('/api/v1/equity/price/quote', { symbol, provider }), []);

  const fetchEquityHistorical = useCallback((symbol: string, provider = 'fmp') =>
    openbbFetch('/api/v1/equity/price/historical', { symbol, provider }), []);

  const fetchForex = useCallback((symbol: string, provider = 'fmp') =>
    openbbFetch('/api/v1/currency/price/historical', { symbol, provider }), []);

  const fetchEconomy = useCallback((country: string, provider = 'oecd') =>
    openbbFetch('/api/v1/economy/indicators', { country, provider }), []);

  const fetchCrypto = useCallback((symbol: string, provider = 'fmp') =>
    openbbFetch('/api/v1/crypto/price/historical', { symbol, provider }), []);

  const fetchOptions = useCallback((symbol: string, provider = 'cboe') =>
    openbbFetch('/api/v1/derivatives/options/chains', { symbol, provider }), []);

  const fetchNews = useCallback((query: string, provider = 'fmp') =>
    openbbFetch('/api/v1/news/company', { symbols: query, provider }), []);

  const fetchScreener = useCallback((provider = 'fmp') =>
    openbbFetch('/api/v1/equity/screener', { provider }), []);

  const fetchDarkPool = useCallback((symbol: string, provider = 'finra') =>
    openbbFetch('/api/v1/equity/darkpool/otc', { symbol, provider }), []);

  const fetchShortInterest = useCallback((symbol: string, provider = 'finra') =>
    openbbFetch('/api/v1/equity/shorts/short_volume', { symbol, provider }), []);

  const fetchFTD = useCallback((symbol: string, provider = 'sec') =>
    openbbFetch('/api/v1/equity/shorts/fails_to_deliver', { symbol, provider }), []);

  const fetchEstimates = useCallback((symbol: string, provider = 'fmp') =>
    openbbFetch('/api/v1/equity/estimates/consensus', { symbol, provider }), []);

  const fetchPriceTarget = useCallback((symbol: string, provider = 'fmp') =>
    openbbFetch('/api/v1/equity/estimates/price_target', { symbol, provider }), []);

  const fetchYieldCurve = useCallback((provider = 'fred') =>
    openbbFetch('/api/v1/fixedincome/government/us_yield_curve', { provider }), []);

  const fetchETFSearch = useCallback((query: string, provider = 'fmp') =>
    openbbFetch('/api/v1/etf/search', { query, provider }), []);

  const fetchCommodity = useCallback((symbol: string, provider = 'yfinance') =>
    openbbFetch('/api/v1/commodity/price/historical', { symbol, provider }), []);

  return {
    isConnected,
    fetchEquity, fetchEquityHistorical, fetchForex, fetchEconomy,
    fetchCrypto, fetchOptions, fetchNews, fetchScreener,
    fetchDarkPool, fetchShortInterest, fetchFTD,
    fetchEstimates, fetchPriceTarget, fetchYieldCurve,
    fetchETFSearch, fetchCommodity,
  };
}
