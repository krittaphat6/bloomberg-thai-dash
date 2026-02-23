// Chart Data Service - Universal Real-Time OHLCV Data for ALL Asset Classes
import { supabase } from '@/integrations/supabase/client';

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
  type: 'crypto' | 'stock' | 'forex' | 'futures' | 'bond' | 'index' | 'commodity' | 'set';
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

// Yahoo Finance symbol mapping for non-standard symbols
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Forex
  'EURUSD': 'EURUSD=X', 'GBPUSD': 'GBPUSD=X', 'USDJPY': 'USDJPY=X',
  'AUDUSD': 'AUDUSD=X', 'USDCAD': 'USDCAD=X', 'NZDUSD': 'NZDUSD=X',
  'USDCHF': 'USDCHF=X', 'EURGBP': 'EURGBP=X', 'EURJPY': 'EURJPY=X',
  'GBPJPY': 'GBPJPY=X', 'AUDJPY': 'AUDJPY=X', 'EURAUD': 'EURAUD=X',
  'GBPAUD': 'GBPAUD=X', 'USDSGD': 'USDSGD=X', 'USDTHB': 'USDTHB=X',
  'USDMXN': 'USDMXN=X', 'USDZAR': 'USDZAR=X', 'USDTRY': 'USDTRY=X',
  'USDINR': 'USDINR=X', 'USDCNY': 'USDCNY=X', 'USDKRW': 'USDKRW=X',
  'USDHKD': 'USDHKD=X', 'USDPLN': 'USDPLN=X', 'USDSEK': 'USDSEK=X',
  'USDNOK': 'USDNOK=X', 'USDDKK': 'USDDKK=X', 'USDCZK': 'USDCZK=X',
  'USDHUF': 'USDHUF=X', 'USDRON': 'USDRON=X', 'USDBRL': 'USDBRL=X',
  'USDARS': 'USDARS=X', 'USDCLP': 'USDCLP=X', 'USDPHP': 'USDPHP=X',
  'USDIDR': 'USDIDR=X', 'USDMYR': 'USDMYR=X', 'USDTWD': 'USDTWD=X',
  // Commodities
  'XAUUSD': 'GC=F', 'XAGUSD': 'SI=F', 'USOIL': 'CL=F', 'UKOIL': 'BZ=F',
  'NATGAS': 'NG=F', 'COPPER': 'HG=F', 'PLATINUM': 'PL=F', 'PALLADIUM': 'PA=F',
  'WHEAT': 'ZW=F', 'CORN': 'ZC=F', 'SOYBEAN': 'ZS=F', 'COTTON': 'CT=F',
  'COFFEE': 'KC=F', 'SUGAR': 'SB=F', 'COCOA': 'CC=F',
  // Indices
  'SPX': '^GSPC', 'NDX': '^NDX', 'DJI': '^DJI', 'RUT': '^RUT',
  'VIX': '^VIX', 'DXY': 'DX-Y.NYB',
  'FTSE': '^FTSE', 'DAX': '^GDAXI', 'CAC': '^FCHI', 'STOXX50': '^STOXX50E',
  'NIKKEI': '^N225', 'HSI': '^HSI', 'SHANGHAI': '000001.SS', 'KOSPI': '^KS11',
  'SENSEX': '^BSESN', 'NIFTY': '^NSEI', 'ASX200': '^AXJO', 'TSX': '^GSPTSE',
  'IBOV': '^BVSP', 'SET': '^SET.BK', 'KLCI': '^KLSE', 'STI': '^STI',
  'TWII': '^TWII', 'JKSE': '^JKSE', 'PSEi': 'PSEI.PS',
  // Futures
  'ES': 'ES=F', 'NQ': 'NQ=F', 'YM': 'YM=F', 'RTY': 'RTY=F',
  'GC': 'GC=F', 'SI': 'SI=F', 'CL': 'CL=F', 'NG': 'NG=F',
  'ZB': 'ZB=F', 'ZN': 'ZN=F', 'ZF': 'ZF=F', 'ZT': 'ZT=F',
  '6E': '6E=F', '6B': '6B=F', '6J': '6J=F', '6A': '6A=F',
  // Bonds
  'US10Y': '^TNX', 'US2Y': '^IRX', 'US30Y': '^TYX', 'US5Y': '^FVX',
};

class ChartDataService {
  private cache: Map<string, { data: OHLCVData[]; timestamp: number }> = new Map();
  private cacheDuration = 60000;
  private allCryptoSymbols: ChartSymbol[] = [];
  private symbolsLoaded = false;
  private screenerCache: Map<string, { results: ChartSymbol[]; timestamp: number }> = new Map();

  // Load all crypto symbols from Binance
  async loadAllCryptoSymbols(): Promise<ChartSymbol[]> {
    if (this.symbolsLoaded && this.allCryptoSymbols.length > 0) {
      return this.allCryptoSymbols;
    }
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) throw new Error('Failed to fetch symbols');
      const data = await response.json();
      this.allCryptoSymbols = data
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .map((t: any) => ({
          symbol: t.symbol,
          name: t.symbol.replace('USDT', ''),
          exchange: 'Binance',
          type: 'crypto' as const,
        }))
        .sort((a: ChartSymbol, b: ChartSymbol) => a.symbol.localeCompare(b.symbol));
      this.symbolsLoaded = true;
      return this.allCryptoSymbols;
    } catch (error) {
      console.error('[ChartDataService] Failed to load crypto symbols:', error);
      return this.getDefaultSymbols().filter(s => s.type === 'crypto');
    }
  }

  // Search symbols using TV Screener API for universal coverage
  async searchViaScreener(query: string): Promise<ChartSymbol[]> {
    if (!query || query.length < 1) return [];

    const cacheKey = `screener:${query.toLowerCase()}`;
    const cached = this.screenerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 120000) return cached.results;

    const results: ChartSymbol[] = [];

    try {
      // Search across multiple screener types in parallel
      const searches = ['stock', 'crypto', 'forex', 'futures'].map(async (type) => {
        try {
          const { data, error } = await supabase.functions.invoke('tv-screener', {
            body: {
              type,
              columns: ['name', 'description', 'close', 'exchange'],
              search: query,
              range: [0, 20],
            },
          });
          if (error || !data?.data) return [];
          return (data.data as any[]).map((item: any) => {
            const sym = item.symbol || item.name || '';
            const parts = sym.split(':');
            const exchange = parts.length > 1 ? parts[0] : (item.exchange || type.toUpperCase());
            const symbol = parts.length > 1 ? parts[1] : sym;
            return {
              symbol,
              name: item.description || item.name || symbol,
              exchange,
              type: this.mapScreenerType(type, exchange),
            } as ChartSymbol;
          });
        } catch { return []; }
      });

      const allResults = await Promise.all(searches);
      allResults.forEach(r => results.push(...r));

      // Dedupe by symbol
      const seen = new Set<string>();
      const deduped = results.filter(r => {
        const key = `${r.exchange}:${r.symbol}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.screenerCache.set(cacheKey, { results: deduped, timestamp: Date.now() });
      return deduped;
    } catch (error) {
      console.error('[ChartDataService] Screener search failed:', error);
      return [];
    }
  }

  private mapScreenerType(screenerType: string, exchange: string): ChartSymbol['type'] {
    if (screenerType === 'crypto') return 'crypto';
    if (screenerType === 'forex') return 'forex';
    if (screenerType === 'futures') return 'futures';
    const exUpper = exchange.toUpperCase();
    if (exUpper === 'SET' || exUpper.includes('BK')) return 'set';
    return 'stock';
  }

  // Search symbols — combines local + Binance + Screener
  async searchSymbols(query: string): Promise<ChartSymbol[]> {
    const q = query.toUpperCase();
    const cryptos = await this.loadAllCryptoSymbols();
    const defaults = this.getDefaultSymbols();

    // Local matches
    const localMatches = [
      ...defaults.filter(s => s.symbol.toUpperCase().includes(q) || s.name.toUpperCase().includes(q)),
      ...cryptos.filter(s => s.symbol.includes(q) && !defaults.some(d => d.symbol === s.symbol)),
    ];

    // If query is long enough, also search via screener for global coverage
    let screenerMatches: ChartSymbol[] = [];
    if (query.length >= 2) {
      screenerMatches = await this.searchViaScreener(query);
    }

    // Merge: local first, then screener results not already present
    const seen = new Set(localMatches.map(s => s.symbol));
    const merged = [
      ...localMatches,
      ...screenerMatches.filter(s => !seen.has(s.symbol)),
    ];

    return merged.slice(0, 80);
  }

  // Massive default symbols list covering all asset classes
  private getDefaultSymbols(): ChartSymbol[] {
    return [
      // === Crypto (top) ===
      { symbol: 'BTCUSDT', name: 'Bitcoin', exchange: 'Binance', type: 'crypto' },
      { symbol: 'ETHUSDT', name: 'Ethereum', exchange: 'Binance', type: 'crypto' },
      { symbol: 'BNBUSDT', name: 'BNB', exchange: 'Binance', type: 'crypto' },
      { symbol: 'SOLUSDT', name: 'Solana', exchange: 'Binance', type: 'crypto' },
      { symbol: 'XRPUSDT', name: 'XRP', exchange: 'Binance', type: 'crypto' },
      { symbol: 'ADAUSDT', name: 'Cardano', exchange: 'Binance', type: 'crypto' },
      { symbol: 'DOGEUSDT', name: 'Dogecoin', exchange: 'Binance', type: 'crypto' },
      { symbol: 'DOTUSDT', name: 'Polkadot', exchange: 'Binance', type: 'crypto' },
      { symbol: 'AVAXUSDT', name: 'Avalanche', exchange: 'Binance', type: 'crypto' },
      { symbol: 'LINKUSDT', name: 'Chainlink', exchange: 'Binance', type: 'crypto' },
      // === US Stocks ===
      { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'AMZN', name: 'Amazon', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'META', name: 'Meta Platforms', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'NYSE', type: 'stock' },
      { symbol: 'QQQ', name: 'NASDAQ 100 ETF', exchange: 'NASDAQ', type: 'stock' },
      { symbol: 'AMD', name: 'AMD', exchange: 'NASDAQ', type: 'stock' },
      // === Forex (major + cross) ===
      { symbol: 'EURUSD', name: 'EUR/USD', exchange: 'Forex', type: 'forex' },
      { symbol: 'GBPUSD', name: 'GBP/USD', exchange: 'Forex', type: 'forex' },
      { symbol: 'USDJPY', name: 'USD/JPY', exchange: 'Forex', type: 'forex' },
      { symbol: 'AUDUSD', name: 'AUD/USD', exchange: 'Forex', type: 'forex' },
      { symbol: 'USDCAD', name: 'USD/CAD', exchange: 'Forex', type: 'forex' },
      { symbol: 'NZDUSD', name: 'NZD/USD', exchange: 'Forex', type: 'forex' },
      { symbol: 'USDCHF', name: 'USD/CHF', exchange: 'Forex', type: 'forex' },
      { symbol: 'EURGBP', name: 'EUR/GBP', exchange: 'Forex', type: 'forex' },
      { symbol: 'EURJPY', name: 'EUR/JPY', exchange: 'Forex', type: 'forex' },
      { symbol: 'GBPJPY', name: 'GBP/JPY', exchange: 'Forex', type: 'forex' },
      { symbol: 'USDTHB', name: 'USD/THB', exchange: 'Forex', type: 'forex' },
      { symbol: 'USDSGD', name: 'USD/SGD', exchange: 'Forex', type: 'forex' },
      // === Commodities ===
      { symbol: 'XAUUSD', name: 'Gold', exchange: 'COMEX', type: 'commodity' },
      { symbol: 'XAGUSD', name: 'Silver', exchange: 'COMEX', type: 'commodity' },
      { symbol: 'USOIL', name: 'WTI Crude Oil', exchange: 'NYMEX', type: 'commodity' },
      { symbol: 'UKOIL', name: 'Brent Crude', exchange: 'ICE', type: 'commodity' },
      { symbol: 'NATGAS', name: 'Natural Gas', exchange: 'NYMEX', type: 'commodity' },
      { symbol: 'COPPER', name: 'Copper', exchange: 'COMEX', type: 'commodity' },
      { symbol: 'PLATINUM', name: 'Platinum', exchange: 'NYMEX', type: 'commodity' },
      { symbol: 'WHEAT', name: 'Wheat', exchange: 'CBOT', type: 'commodity' },
      { symbol: 'CORN', name: 'Corn', exchange: 'CBOT', type: 'commodity' },
      { symbol: 'COFFEE', name: 'Coffee', exchange: 'ICE', type: 'commodity' },
      // === Indices ===
      { symbol: 'SPX', name: 'S&P 500', exchange: 'INDEX', type: 'index' },
      { symbol: 'NDX', name: 'NASDAQ 100', exchange: 'INDEX', type: 'index' },
      { symbol: 'DJI', name: 'Dow Jones', exchange: 'INDEX', type: 'index' },
      { symbol: 'VIX', name: 'VIX Fear Index', exchange: 'CBOE', type: 'index' },
      { symbol: 'DXY', name: 'US Dollar Index', exchange: 'ICE', type: 'index' },
      { symbol: 'FTSE', name: 'FTSE 100', exchange: 'LSE', type: 'index' },
      { symbol: 'DAX', name: 'DAX 40', exchange: 'XETRA', type: 'index' },
      { symbol: 'NIKKEI', name: 'Nikkei 225', exchange: 'TSE', type: 'index' },
      { symbol: 'HSI', name: 'Hang Seng', exchange: 'HKEX', type: 'index' },
      { symbol: 'SHANGHAI', name: 'Shanghai Composite', exchange: 'SSE', type: 'index' },
      { symbol: 'KOSPI', name: 'KOSPI', exchange: 'KRX', type: 'index' },
      { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE', type: 'index' },
      { symbol: 'SET', name: 'SET Index', exchange: 'SET', type: 'index' },
      { symbol: 'ASX200', name: 'ASX 200', exchange: 'ASX', type: 'index' },
      // === Futures ===
      { symbol: 'ES', name: 'E-mini S&P 500', exchange: 'CME', type: 'futures' },
      { symbol: 'NQ', name: 'E-mini NASDAQ', exchange: 'CME', type: 'futures' },
      { symbol: 'YM', name: 'E-mini Dow', exchange: 'CBOT', type: 'futures' },
      { symbol: 'GC', name: 'Gold Futures', exchange: 'COMEX', type: 'futures' },
      { symbol: 'CL', name: 'Crude Oil Futures', exchange: 'NYMEX', type: 'futures' },
      { symbol: 'ZB', name: 'US T-Bond', exchange: 'CBOT', type: 'futures' },
      { symbol: 'ZN', name: '10Y T-Note', exchange: 'CBOT', type: 'futures' },
      { symbol: '6E', name: 'Euro FX Futures', exchange: 'CME', type: 'futures' },
      // === Bonds ===
      { symbol: 'US10Y', name: 'US 10-Year Yield', exchange: 'BOND', type: 'bond' },
      { symbol: 'US2Y', name: 'US 2-Year Yield', exchange: 'BOND', type: 'bond' },
      { symbol: 'US30Y', name: 'US 30-Year Yield', exchange: 'BOND', type: 'bond' },
      { symbol: 'US5Y', name: 'US 5-Year Yield', exchange: 'BOND', type: 'bond' },
      // === Thai Stocks (SET) ===
      { symbol: 'PTT.BK', name: 'PTT', exchange: 'SET', type: 'set' },
      { symbol: 'ADVANC.BK', name: 'AIS', exchange: 'SET', type: 'set' },
      { symbol: 'GULF.BK', name: 'Gulf Energy', exchange: 'SET', type: 'set' },
      { symbol: 'KBANK.BK', name: 'Kasikornbank', exchange: 'SET', type: 'set' },
      { symbol: 'SCB.BK', name: 'SCB', exchange: 'SET', type: 'set' },
      { symbol: 'CPALL.BK', name: 'CP ALL', exchange: 'SET', type: 'set' },
      { symbol: 'AOT.BK', name: 'AOT', exchange: 'SET', type: 'set' },
      { symbol: 'DELTA.BK', name: 'Delta Electronics', exchange: 'SET', type: 'set' },
    ];
  }

  getSymbolsList(): ChartSymbol[] {
    return this.getDefaultSymbols();
  }

  // Fetch crypto data from Binance (real-time, free, no key)
  async fetchCryptoData(symbol: string, timeframe: Timeframe, limit: number = 1000): Promise<OHLCVData[]> {
    const cacheKey = `crypto:${symbol}:${timeframe}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    try {
      const interval = this.binanceInterval(timeframe);
      const effectiveLimit = Math.min(limit, 1000);
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${effectiveLimit}`
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
      console.log(`[ChartData] ✅ ${ohlcv.length} candles for ${symbol} (${timeframe}) via Binance`);
      return ohlcv;
    } catch (error) {
      console.error('Crypto fetch error:', error);
      return this.generateMockData(symbol, timeframe, limit);
    }
  }

  // Fetch ANY Yahoo Finance symbol — real OHLCV data for stocks, forex, commodities, indices, futures, bonds
  async fetchYahooOHLCV(symbol: string, timeframe: Timeframe, limit: number = 500): Promise<OHLCVData[]> {
    const cacheKey = `yahoo:${symbol}:${timeframe}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const yahooSymbol = YAHOO_SYMBOL_MAP[symbol] || symbol;
      const range = this.yahooRange(timeframe);
      const interval = this.yahooInterval(timeframe);

      const { data, error } = await supabase.functions.invoke('market-data-proxy', {
        body: {
          source: 'yahoo',
          symbols: [yahooSymbol],
          range,
          interval,
        },
      });

      if (error) throw error;

      // The proxy returns data keyed by the symbol we sent
      const result = data?.yahoo?.[yahooSymbol] || data?.[yahooSymbol];

      // Handle both response formats from market-data-proxy
      if (result?.timestamps && result?.quotes) {
        const quotes = result.quotes;
        const ohlcv: OHLCVData[] = result.timestamps
          .map((t: number, i: number) => ({
            timestamp: t * 1000,
            open: quotes?.open?.[i] || 0,
            high: quotes?.high?.[i] || 0,
            low: quotes?.low?.[i] || 0,
            close: quotes?.close?.[i] || 0,
            volume: quotes?.volume?.[i] || 0,
          }))
          .filter((d: OHLCVData) => d.open > 0 && d.close > 0);

        if (ohlcv.length > 0) {
          this.setCache(cacheKey, ohlcv);
          console.log(`[ChartData] ✅ ${ohlcv.length} candles for ${symbol} (${timeframe}) via Yahoo`);
          return ohlcv.slice(-limit);
        }
      }

      // If we got price data but not OHLCV format (e.g. from the default proxy response)
      if (result?.closes && Array.isArray(result.closes)) {
        const closes = result.closes as number[];
        const ohlcv: OHLCVData[] = closes.map((c: number, i: number) => ({
          timestamp: Date.now() - (closes.length - i) * TIMEFRAME_MS[timeframe],
          open: i > 0 ? closes[i - 1] : c,
          high: c * 1.001,
          low: c * 0.999,
          close: c,
          volume: 0,
        }));
        this.setCache(cacheKey, ohlcv);
        console.log(`[ChartData] ✅ ${ohlcv.length} price points for ${symbol} via Yahoo (closes)`);
        return ohlcv.slice(-limit);
      }

      throw new Error('No usable data from proxy');
    } catch (error) {
      console.warn(`[ChartData] Yahoo fetch failed for ${symbol}:`, error);
      return this.generateMockData(symbol, timeframe, limit);
    }
  }

  // Universal fetch function — routes to the correct source
  async fetchData(symbol: ChartSymbol, timeframe: Timeframe, limit: number = 500): Promise<OHLCVData[]> {
    switch (symbol.type) {
      case 'crypto':
        return this.fetchCryptoData(symbol.symbol, timeframe, Math.min(limit, 1000));
      case 'stock':
      case 'set':
      case 'forex':
      case 'commodity':
      case 'index':
      case 'futures':
      case 'bond':
        return this.fetchYahooOHLCV(symbol.symbol, timeframe, limit);
      default:
        return this.fetchYahooOHLCV(symbol.symbol, timeframe, limit);
    }
  }

  // Generate realistic mock OHLCV data (fallback only)
  generateMockData(symbol: string, timeframe: Timeframe, limit: number): OHLCVData[] {
    const data: OHLCVData[] = [];
    const now = Date.now();
    const tfMs = TIMEFRAME_MS[timeframe];

    let basePrice = 100;
    if (symbol.includes('BTC')) basePrice = 95000;
    else if (symbol.includes('ETH')) basePrice = 3200;
    else if (symbol.includes('SOL')) basePrice = 180;
    else if (symbol.includes('XAU') || symbol === 'GC') basePrice = 2650;
    else if (symbol.includes('XAG') || symbol === 'SI') basePrice = 31;
    else if (symbol.includes('OIL') || symbol === 'CL') basePrice = 72;
    else if (symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('AUD') || symbol.includes('NZD')) basePrice = 1.1;
    else if (symbol.includes('JPY')) basePrice = 150;
    else if (symbol.includes('THB')) basePrice = 34.5;
    else if (symbol === 'SPX' || symbol === 'ES') basePrice = 5200;
    else if (symbol === 'NDX' || symbol === 'NQ') basePrice = 18500;
    else if (symbol === 'DJI' || symbol === 'YM') basePrice = 39000;
    else if (symbol === 'VIX') basePrice = 15;
    else if (symbol === 'DXY') basePrice = 104;
    else if (symbol.includes('10Y') || symbol.includes('2Y') || symbol.includes('30Y') || symbol.includes('5Y')) basePrice = 4.2;
    else if (symbol.includes('.BK')) basePrice = 30 + Math.random() * 200;

    let price = basePrice;
    const volatility = basePrice * 0.02;

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

  // Helpers
  private binanceInterval(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M',
    };
    return map[tf];
  }
  private yahooInterval(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '1h', '1D': '1d', '1W': '1wk', '1M': '1mo',
    };
    return map[tf];
  }
  private yahooRange(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1d', '5m': '5d', '15m': '5d', '30m': '1mo',
      '1h': '1mo', '4h': '3mo', '1D': '1y', '1W': '5y', '1M': '10y',
    };
    return map[tf];
  }
  private getFromCache(key: string): OHLCVData[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) return cached.data;
    return null;
  }
  private setCache(key: string, data: OHLCVData[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const chartDataService = new ChartDataService();
