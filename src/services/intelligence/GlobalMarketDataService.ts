import { supabase } from '@/integrations/supabase/client';

const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'demo';
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || '';

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high: number;
  low: number;
  open: number;
  close: number;
  previousClose: number;
  exchange: string;
  country: string;
  sector?: string;
  industry?: string;
  timestamp: Date;
}

export interface MarketConnection {
  from: string;
  to: string;
  type: 'sector' | 'supplier' | 'competitor' | 'correlation';
  strength: number;
}

class GlobalMarketDataService {
  private static instance: GlobalMarketDataService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute

  private constructor() {}

  static getInstance(): GlobalMarketDataService {
    if (!GlobalMarketDataService.instance) {
      GlobalMarketDataService.instance = new GlobalMarketDataService();
    }
    return GlobalMarketDataService.instance;
  }

  async fetchGlobalMarketData(symbols: string[]): Promise<MarketQuote[]> {
    const quotes: MarketQuote[] = [];

    for (const symbol of symbols) {
      try {
        const cached = this.getFromCache(symbol);
        if (cached) {
          quotes.push(cached);
          continue;
        }

        // Try multiple sources with fallback
        let quote = await this.fetchYahooFinance(symbol);
        if (!quote && FINNHUB_KEY) {
          quote = await this.fetchFinnhub(symbol);
        }
        if (!quote && ALPHA_VANTAGE_KEY !== 'demo') {
          quote = await this.fetchAlphaVantage(symbol);
        }
        
        if (quote) {
          quotes.push(quote);
          this.setCache(symbol, quote);
        }
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
      }
    }

    return quotes;
  }

  private async fetchYahooFinance(symbol: string): Promise<MarketQuote | null> {
    try {
      // Use market-data-proxy edge function to avoid CORS
      const { data, error } = await supabase.functions.invoke('market-data-proxy', {
        body: {
          source: 'yahoo',
          symbols: [symbol],
          range: '1d',
          interval: '1d'
        }
      });

      if (error) throw error;

      const result = data?.yahoo?.[symbol];
      if (!result) throw new Error('No data returned');

      const meta = result.meta;
      const quotes = result.quotes;
      
      const currentPrice = meta?.regularMarketPrice || quotes?.close?.[quotes.close.length - 1];
      const previousClose = meta?.previousClose || meta?.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: meta?.symbol || symbol,
        name: meta?.longName || meta?.symbol || symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: meta?.regularMarketVolume || quotes?.volume?.[quotes.volume.length - 1] || 0,
        marketCap: meta?.marketCap,
        high: meta?.regularMarketDayHigh || Math.max(...(quotes?.high?.filter((h: number) => h) || [currentPrice])),
        low: meta?.regularMarketDayLow || Math.min(...(quotes?.low?.filter((l: number) => l) || [currentPrice])),
        open: quotes?.open?.[0] || currentPrice,
        close: currentPrice,
        previousClose: previousClose,
        exchange: meta?.exchangeName || 'Unknown',
        country: this.getCountryFromExchange(meta?.exchangeName || ''),
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Yahoo Finance error for ${symbol}:`, error);
      return null;
    }
  }

  async getMarketConnections(symbols: string[]): Promise<MarketConnection[]> {
    const connections: MarketConnection[] = [];
    const quotes = await this.fetchGlobalMarketData(symbols);
    
    for (let i = 0; i < quotes.length; i++) {
      for (let j = i + 1; j < quotes.length; j++) {
        const quote1 = quotes[i];
        const quote2 = quotes[j];
        
        if (quote1.sector && quote1.sector === quote2.sector) {
          connections.push({
            from: quote1.symbol,
            to: quote2.symbol,
            type: 'sector',
            strength: 0.7
          });
        }
        
        const correlation = this.calculateCorrelation(
          quote1.changePercent,
          quote2.changePercent
        );
        
        if (Math.abs(correlation) > 0.5) {
          connections.push({
            from: quote1.symbol,
            to: quote2.symbol,
            type: 'correlation',
            strength: Math.abs(correlation)
          });
        }
      }
    }

    return connections;
  }

  private calculateCorrelation(val1: number, val2: number): number {
    if ((val1 > 0 && val2 > 0) || (val1 < 0 && val2 < 0)) {
      return 0.6 + Math.random() * 0.3;
    }
    return -(0.4 + Math.random() * 0.2);
  }

  private getCountryFromExchange(exchange: string): string {
    const exchangeMap: { [key: string]: string } = {
      'NMS': 'US', 'NYQ': 'US', 'PCX': 'US',
      'LSE': 'UK', 'FRA': 'DE', 'EPA': 'FR',
      'HKG': 'HK', 'JPX': 'JP', 'SHE': 'CN', 'SHH': 'CN',
      'BKK': 'TH', 'SET': 'TH',
      'SES': 'SG', 'KSC': 'KR', 'NSE': 'IN', 'BSE': 'IN'
    };
    return exchangeMap[exchange] || 'GLOBAL';
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchAlphaVantage(symbol: string): Promise<MarketQuote | null> {
    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: ALPHA_VANTAGE_KEY
        }
      });

      const quote = response.data['Global Quote'];
      if (!quote || !quote['05. price']) return null;

      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

      return {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'],
        price,
        change,
        changePercent,
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        close: price,
        previousClose: parseFloat(quote['08. previous close']),
        exchange: 'US',
        country: 'US',
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error);
      return null;
    }
  }

  private async fetchFinnhub(symbol: string): Promise<MarketQuote | null> {
    try {
      const response = await axios.get('https://finnhub.io/api/v1/quote', {
        params: {
          symbol: symbol,
          token: FINNHUB_KEY
        }
      });

      const data = response.data;
      if (!data.c) return null;

      const price = data.c;
      const change = data.d;
      const changePercent = data.dp;

      return {
        symbol,
        name: symbol,
        price,
        change,
        changePercent,
        volume: 0,
        high: data.h,
        low: data.l,
        open: data.o,
        close: price,
        previousClose: data.pc,
        exchange: 'US',
        country: 'US',
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Finnhub error for ${symbol}:`, error);
      return null;
    }
  }
}

export const globalMarketDataService = GlobalMarketDataService.getInstance();
