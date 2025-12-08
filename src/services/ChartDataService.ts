// Chart Data Service - Fetch OHLCV data from multiple sources
export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSymbol {
  symbol: string;
  name: string;
  exchange: string;
  type: 'crypto' | 'stock' | 'forex' | 'set';
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W' | '1M';

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
};

class ChartDataService {
  private cache: Map<string, { data: OHLCVData[]; timestamp: number }> = new Map();
  private cacheDuration = 60000; // 1 minute cache

  // Popular symbols list
  getSymbolsList(): ChartSymbol[] {
    return [
      // Crypto
      { symbol: 'BTCUSDT', name: 'Bitcoin', exchange: 'Binance', type: 'crypto' },
      { symbol: 'ETHUSDT', name: 'Ethereum', exchange: 'Binance', type: 'crypto' },
      { symbol: 'BNBUSDT', name: 'BNB', exchange: 'Binance', type: 'crypto' },
      { symbol: 'SOLUSDT', name: 'Solana', exchange: 'Binance', type: 'crypto' },
      { symbol: 'XRPUSDT', name: 'XRP', exchange: 'Binance', type: 'crypto' },
      // US Stocks
      { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'GOOGL', name: 'Google', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'NYSE', type: 'stock' },
      // Forex
      { symbol: 'EURUSD', name: 'EUR/USD', exchange: 'Forex', type: 'forex' },
      { symbol: 'GBPUSD', name: 'GBP/USD', exchange: 'Forex', type: 'forex' },
      { symbol: 'USDJPY', name: 'USD/JPY', exchange: 'Forex', type: 'forex' },
      { symbol: 'XAUUSD', name: 'Gold', exchange: 'Forex', type: 'forex' },
      // SET (Thai Stock)
      { symbol: 'PTT.BK', name: 'PTT', exchange: 'SET', type: 'set' },
      { symbol: 'ADVANC.BK', name: 'AIS', exchange: 'SET', type: 'set' },
      { symbol: 'GULF.BK', name: 'Gulf Energy', exchange: 'SET', type: 'set' },
      { symbol: 'KBANK.BK', name: 'Kasikornbank', exchange: 'SET', type: 'set' },
      { symbol: 'SCB.BK', name: 'SCB', exchange: 'SET', type: 'set' },
    ];
  }

  // Fetch crypto data from Binance (free, no API key)
  async fetchCryptoData(symbol: string, timeframe: Timeframe, limit: number = 500): Promise<OHLCVData[]> {
    const cacheKey = `crypto:${symbol}:${timeframe}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const interval = this.binanceInterval(timeframe);
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      
      if (!response.ok) throw new Error('Binance API error');
      
      const data = await response.json();
      const ohlcv: OHLCVData[] = data.map((k: any[]) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
      
      this.setCache(cacheKey, ohlcv);
      return ohlcv;
    } catch (error) {
      console.error('Crypto fetch error:', error);
      return this.generateMockData(symbol, timeframe, limit);
    }
  }

  // Fetch stock data from Yahoo Finance (free, no API key)
  async fetchStockData(symbol: string, timeframe: Timeframe, limit: number = 500): Promise<OHLCVData[]> {
    const cacheKey = `stock:${symbol}:${timeframe}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const range = this.yahooRange(timeframe);
      const interval = this.yahooInterval(timeframe);
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`
      );
      
      if (!response.ok) throw new Error('Yahoo Finance API error');
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result?.timestamp) throw new Error('No data');
      
      const quotes = result.indicators?.quote?.[0];
      const ohlcv: OHLCVData[] = result.timestamp.map((t: number, i: number) => ({
        timestamp: t * 1000,
        open: quotes?.open?.[i] || 0,
        high: quotes?.high?.[i] || 0,
        low: quotes?.low?.[i] || 0,
        close: quotes?.close?.[i] || 0,
        volume: quotes?.volume?.[i] || 0,
      })).filter((d: OHLCVData) => d.open > 0);
      
      this.setCache(cacheKey, ohlcv);
      return ohlcv.slice(-limit);
    } catch (error) {
      console.error('Stock fetch error:', error);
      return this.generateMockData(symbol, timeframe, limit);
    }
  }

  // Fetch Forex data (using free API or mock)
  async fetchForexData(symbol: string, timeframe: Timeframe, limit: number = 500): Promise<OHLCVData[]> {
    // For forex, we'll use mock data as free APIs are limited
    // In production, you would use a paid API like Oanda or FXCM
    return this.generateMockData(symbol, timeframe, limit);
  }

  // Universal fetch function
  async fetchData(symbol: ChartSymbol, timeframe: Timeframe, limit: number = 500): Promise<OHLCVData[]> {
    switch (symbol.type) {
      case 'crypto':
        return this.fetchCryptoData(symbol.symbol, timeframe, limit);
      case 'stock':
      case 'set':
        return this.fetchStockData(symbol.symbol, timeframe, limit);
      case 'forex':
        return this.fetchForexData(symbol.symbol, timeframe, limit);
      default:
        return this.generateMockData(symbol.symbol, timeframe, limit);
    }
  }

  // Generate realistic mock OHLCV data
  generateMockData(symbol: string, timeframe: Timeframe, limit: number): OHLCVData[] {
    const data: OHLCVData[] = [];
    const now = Date.now();
    const tfMs = TIMEFRAME_MS[timeframe];
    
    // Different base prices for different symbols
    let basePrice = 100;
    if (symbol.includes('BTC')) basePrice = 45000;
    else if (symbol.includes('ETH')) basePrice = 2500;
    else if (symbol.includes('XAU')) basePrice = 1950;
    else if (symbol.includes('EUR') || symbol.includes('GBP')) basePrice = 1.1;
    else if (symbol.includes('JPY')) basePrice = 150;
    
    let price = basePrice;
    const volatility = basePrice * 0.02; // 2% volatility

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * tfMs);
      const change = (Math.random() - 0.5) * volatility;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.floor(Math.random() * 1000000) + 500000;

      data.push({ timestamp, open, high, low, close, volume });
      price = close;
    }

    return data;
  }

  // Helper functions
  private binanceInterval(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M'
    };
    return map[tf];
  }

  private yahooInterval(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '1h', '1D': '1d', '1W': '1wk', '1M': '1mo'
    };
    return map[tf];
  }

  private yahooRange(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1d', '5m': '5d', '15m': '5d', '30m': '1mo',
      '1h': '1mo', '4h': '3mo', '1D': '1y', '1W': '5y', '1M': '10y'
    };
    return map[tf];
  }

  private getFromCache(key: string): OHLCVData[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: OHLCVData[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const chartDataService = new ChartDataService();
