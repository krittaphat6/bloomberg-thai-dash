// Real-time price service for financial assets
// Uses free APIs to fetch live prices

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: Date;
}

// Yahoo Finance symbols mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  XAUUSD: 'GC=F', // Gold futures
  XAGUSD: 'SI=F', // Silver futures
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
  SOLUSD: 'SOL-USD',
  XRPUSD: 'XRP-USD',
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  AUDUSD: 'AUDUSD=X',
  USDCHF: 'USDCHF=X',
  USDCAD: 'USDCAD=X',
  NZDUSD: 'NZDUSD=X',
  USOIL: 'CL=F', // WTI Crude
  UKOIL: 'BZ=F', // Brent Crude
  US500: 'ES=F', // S&P 500 futures
  US30: 'YM=F', // Dow futures
  US100: 'NQ=F', // Nasdaq futures
  DE40: '^GDAXI', // DAX
  JP225: '^N225', // Nikkei
};

// Cache for prices
const priceCache = new Map<string, { data: PriceData; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export async function fetchRealTimePrice(symbol: string): Promise<PriceData | null> {
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const yahooSymbol = YAHOO_SYMBOLS[symbol];
  if (!yahooSymbol) {
    console.warn(`No Yahoo symbol mapping for ${symbol}`);
    return null;
  }

  try {
    // Use Yahoo Finance v8 API through CORS proxy
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data returned');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    // Get last valid price from close array
    let price = meta.regularMarketPrice;
    if (!price && quote?.close) {
      const closes = quote.close.filter((c: number | null) => c !== null);
      price = closes[closes.length - 1];
    }

    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    // Get high/low from today's data
    let high = meta.regularMarketDayHigh;
    let low = meta.regularMarketDayLow;
    
    if (!high && quote?.high) {
      high = Math.max(...quote.high.filter((h: number | null) => h !== null));
    }
    if (!low && quote?.low) {
      low = Math.min(...quote.low.filter((l: number | null) => l !== null && l > 0));
    }

    const priceData: PriceData = {
      symbol,
      price: price || 0,
      change: change || 0,
      changePercent: changePercent || 0,
      high: high || price || 0,
      low: low || price || 0,
      timestamp: new Date()
    };

    // Update cache
    priceCache.set(symbol, { data: priceData, timestamp: Date.now() });

    return priceData;

  } catch (error) {
    console.warn(`Failed to fetch price for ${symbol}:`, error);
    
    // Return cached data if available even if expired
    if (cached) {
      return cached.data;
    }
    
    return null;
  }
}

export async function fetchMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
  const results = new Map<string, PriceData>();
  
  // Fetch in parallel with rate limiting
  const batchSize = 3;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(s => fetchRealTimePrice(s));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach((data, idx) => {
      if (data) {
        results.set(batch[idx], data);
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// Alternative: Use CoinGecko for crypto (free, no key needed)
export async function fetchCryptoPrice(symbol: string): Promise<PriceData | null> {
  const coinIds: Record<string, string> = {
    BTCUSD: 'bitcoin',
    ETHUSD: 'ethereum',
    SOLUSD: 'solana',
    XRPUSD: 'ripple'
  };

  const coinId = coinIds[symbol];
  if (!coinId) return null;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_high_low=true`
    );
    
    const data = await response.json();
    const coin = data[coinId];
    
    if (!coin) return null;

    return {
      symbol,
      price: coin.usd || 0,
      change: (coin.usd_24h_change / 100) * coin.usd || 0,
      changePercent: coin.usd_24h_change || 0,
      high: coin.usd_24h_high || coin.usd || 0,
      low: coin.usd_24h_low || coin.usd || 0,
      timestamp: new Date()
    };
  } catch (error) {
    console.warn(`CoinGecko error for ${symbol}:`, error);
    return null;
  }
}

// Simulated prices for when APIs are blocked (development fallback)
export function getSimulatedPrice(symbol: string): PriceData {
  const basePrices: Record<string, number> = {
    XAUUSD: 2650 + Math.random() * 20,
    XAGUSD: 30 + Math.random() * 0.5,
    BTCUSD: 98000 + Math.random() * 2000,
    ETHUSD: 3400 + Math.random() * 100,
    SOLUSD: 180 + Math.random() * 10,
    XRPUSD: 2.2 + Math.random() * 0.1,
    EURUSD: 1.03 + Math.random() * 0.005,
    GBPUSD: 1.24 + Math.random() * 0.005,
    USDJPY: 157 + Math.random() * 0.5,
    AUDUSD: 0.62 + Math.random() * 0.005,
    USOIL: 74 + Math.random() * 1,
    US500: 5900 + Math.random() * 20,
    US30: 42500 + Math.random() * 100,
    US100: 21200 + Math.random() * 50
  };

  const price = basePrices[symbol] || 100;
  const changePercent = (Math.random() - 0.5) * 2; // -1% to +1%
  const change = price * (changePercent / 100);

  return {
    symbol,
    price,
    change,
    changePercent,
    high: price * 1.01,
    low: price * 0.99,
    timestamp: new Date()
  };
}
