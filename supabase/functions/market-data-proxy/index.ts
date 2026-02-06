// supabase/functions/market-data-proxy/index.ts
// Edge Function proxy สำหรับ fetch market data (หลีกเลี่ยง CORS)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MarketDataRequest {
  symbols: string[];  // e.g., ['GC=F', '^VIX', '^TNX']
  range?: string;     // '1d', '5d', '1mo', '3mo'
  interval?: string;  // '1d', '1h', '1m'
}

interface MarketDataResponse {
  success: boolean;
  data: Record<string, any>;
  error?: string;
}

// Yahoo Finance symbol mapping
const SYMBOL_MAP: Record<string, string> = {
  'XAUUSD': 'GC=F',
  'XAGUSD': 'SI=F',
  'BTCUSD': 'BTC-USD',
  'ETHUSD': 'ETH-USD',
  'EURUSD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USDJPY': 'USDJPY=X',
  'USOIL': 'CL=F',
  'US500': 'ES=F',
  'US100': 'NQ=F',
  'VIX': '^VIX',
  '10Y': '^TNX',
  '3M': '^IRX',
  'DXY': 'DX-Y.NYB',
  'GLD': 'GLD',
  'SPY': 'SPY',
};

async function fetchYahooQuote(symbol: string, range = '3mo', interval = '1d'): Promise<any> {
  try {
    const yahooSymbol = SYMBOL_MAP[symbol] || symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Yahoo API returned ${response.status} for ${symbol}`);
      return null;
    }
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      console.warn(`No data returned for ${symbol}`);
      return null;
    }
    
    // Process and return useful data
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = (quotes.close || []).filter((c: number) => c != null);
    const highs = (quotes.high || []).filter((h: number) => h != null);
    const lows = (quotes.low || []).filter((l: number) => l != null);
    const volumes = (quotes.volume || []).filter((v: number) => v != null);
    
    // Calculate technical indicators
    const currentPrice = result.meta?.regularMarketPrice || closes[closes.length - 1];
    const previousClose = result.meta?.previousClose || closes[closes.length - 2];
    const change24h = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
    
    // Calculate MAs
    const ma20 = calculateSMA(closes, 20);
    const ma50 = calculateSMA(closes, 50);
    const ma200 = calculateSMA(closes, Math.min(200, closes.length));
    
    // Calculate RSI
    const rsi14 = calculateRSI(closes, 14);
    
    // Calculate ATR
    const atr14 = calculateATR(highs, lows, closes, 14);
    
    return {
      symbol,
      yahooSymbol,
      price: currentPrice,
      previousClose,
      change24h,
      volume: volumes[volumes.length - 1] || 0,
      avgVolume: volumes.length > 0 ? volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length : 0,
      high: highs[highs.length - 1],
      low: lows[lows.length - 1],
      ma20,
      ma50,
      ma200,
      rsi14,
      atr14,
      closes: closes.slice(-60), // Last 60 data points
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate ATR
function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0;
  
  let atr = 0;
  for (let i = highs.length - period; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atr += tr;
  }
  return atr / period;
}

async function fetchBinanceTicker(symbol: string): Promise<any> {
  try {
    const binanceSymbol = symbol.replace('USD', 'USDT');
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    };
  } catch (error) {
    console.warn(`Binance fetch error for ${symbol}:`, error);
    return null;
  }
}

// Fetch multiple Binance tickers at once (used by Watchlist realtime fallback)
async function fetchBinanceTickers(symbols: string[]): Promise<{ tickers: Record<string, any>; timestamp: number } | null> {
  try {
    const binanceSymbols = symbols
      .map((s) => s.replace('USD', 'USDT').toUpperCase())
      .filter(Boolean);

    if (binanceSymbols.length === 0) return { tickers: {}, timestamp: Date.now() };

    // Binance supports batch via `symbols=["BTCUSDT","ETHUSDT"]`
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(binanceSymbols))}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Binance tickers returned ${response.status}`);
      return null;
    }

    const arr = await response.json();
    const tickers: Record<string, any> = {};

    for (const t of Array.isArray(arr) ? arr : []) {
      const sym = String(t.symbol || '').toUpperCase();
      if (!sym) continue;
      tickers[sym] = {
        symbol: sym,
        price: parseFloat(t.lastPrice),
        priceChange: parseFloat(t.priceChange),
        priceChangePercent: parseFloat(t.priceChangePercent),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        volume24h: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume),
      };
    }

    return { tickers, timestamp: Date.now() };
  } catch (error) {
    console.warn('Binance tickers fetch error:', error);
    return null;
  }
}

async function fetchWorldBankData(): Promise<any> {
  try {
    const [gdpRes, inflationRes, unemploymentRes] = await Promise.all([
      fetch('https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=1'),
      fetch('https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1'),
      fetch('https://api.worldbank.org/v2/country/USA/indicator/SL.UEM.TOTL.ZS?format=json&per_page=1'),
    ]);

    const gdpData = await gdpRes.json();
    const inflationData = await inflationRes.json();
    const unemploymentData = await unemploymentRes.json();

    return {
      gdpGrowth: gdpData[1]?.[0]?.value || null,
      inflationRate: inflationData[1]?.[0]?.value || null,
      unemploymentRate: unemploymentData[1]?.[0]?.value || null,
      year: gdpData[1]?.[0]?.date || null,
    };
  } catch (error) {
    console.error('World Bank API error:', error);
    return null;
  }
}

// Fetch Binance Order Book (depth) for DOM
async function fetchBinanceDepth(symbol: string, limit: number = 20): Promise<any> {
  try {
    // Ensure symbol ends with USDT - avoid double replacing (BTCUSDT -> BTCUSDTT)
    let binanceSymbol = symbol.toUpperCase();
    if (!binanceSymbol.endsWith('USDT') && !binanceSymbol.endsWith('BUSD')) {
      binanceSymbol = binanceSymbol.replace('USD', '') + 'USDT';
    }
    
    // Try multiple endpoints - some may be blocked
    const endpoints = [
      `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`,
      `https://data-api.binance.vision/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`,
      `https://api1.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`,
    ];
    
    let data: any = null;
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          data = await response.json();
          break;
        }
      } catch (e) {
        console.warn(`Binance depth endpoint failed: ${url}`);
      }
    }
    
    if (!data || !data.bids) {
      console.warn(`Binance depth: no data for ${binanceSymbol}`);
      return null;
    }
    
    // Process bids and asks
    const bids = (data.bids || []).map((b: [string, string]) => ({
      price: parseFloat(b[0]),
      quantity: parseFloat(b[1]),
    }));
    
    const asks = (data.asks || []).map((a: [string, string]) => ({
      price: parseFloat(a[0]),
      quantity: parseFloat(a[1]),
    }));
    
    // Calculate cumulative totals
    let bidTotal = 0;
    bids.forEach((b: any) => {
      bidTotal += b.quantity;
      b.total = bidTotal;
    });
    
    let askTotal = 0;
    asks.forEach((a: any) => {
      askTotal += a.quantity;
      a.total = askTotal;
    });
    
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
    
    const totalBidVolume = bids.reduce((s: number, b: any) => s + b.quantity, 0);
    const totalAskVolume = asks.reduce((s: number, a: any) => s + a.quantity, 0);
    const total = totalBidVolume + totalAskVolume;
    const imbalance = total > 0 ? ((totalBidVolume - totalAskVolume) / total) * 100 : 0;
    
    return {
      symbol,
      lastUpdateId: data.lastUpdateId,
      bids,
      asks,
      midPrice,
      spread,
      spreadPercent,
      totalBidVolume,
      totalAskVolume,
      imbalance,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Binance depth error for ${symbol}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      symbols = [], 
      includeEconomic = true, 
      includeCrypto = true,
      // New: depth endpoint for DOM
      action,
      symbol: depthSymbol,
      limit: depthLimit,
    } = body;
    
    // Handle specific actions
    if (action === 'tickers') {
      const tickersData = await fetchBinanceTickers(symbols || []);
      return new Response(JSON.stringify({
        success: !!tickersData,
        data: tickersData || { tickers: {}, timestamp: Date.now() },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'depth' && depthSymbol) {
      const depthData = await fetchBinanceDepth(depthSymbol, depthLimit || 20);
      return new Response(JSON.stringify({
        success: !!depthData,
        data: depthData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const response: MarketDataResponse = {
      success: true,
      data: {},
    };

    // Default symbols to fetch if none provided
    const symbolsToFetch = symbols.length > 0 ? symbols : [
      'VIX', '10Y', '3M', 'DXY', 'GLD', 'SPY'
    ];

    // Fetch all Yahoo quotes in parallel
    const yahooPromises = symbolsToFetch.map((s: string) => fetchYahooQuote(s));
    const yahooResults = await Promise.all(yahooPromises);
    
    yahooResults.forEach((result, idx) => {
      if (result) {
        response.data[symbolsToFetch[idx]] = result;
      }
    });

    // Fetch crypto data from Binance
    if (includeCrypto) {
      const cryptoSymbols = ['BTCUSD', 'ETHUSD'];
      const cryptoPromises = cryptoSymbols.map(s => fetchBinanceTicker(s));
      const cryptoResults = await Promise.all(cryptoPromises);
      
      cryptoResults.forEach((result, idx) => {
        if (result) {
          response.data[cryptoSymbols[idx]] = result;
        }
      });
    }

    // Fetch economic data
    if (includeEconomic) {
      const economicData = await fetchWorldBankData();
      if (economicData) {
        response.data['economic'] = economicData;
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Market data proxy error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
