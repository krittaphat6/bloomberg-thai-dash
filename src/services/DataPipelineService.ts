import { supabase } from '@/integrations/supabase/client';
import { DATA_SOURCES } from '@/config/DataSourceConfig';

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  bid?: number;
  ask?: number;
  source: string;
  timestamp: string;
}

export class DataPipelineService {
  private cache: Map<string, { data: MarketQuote; timestamp: number }> = new Map();
  private rateLimiter: Map<string, number[]> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  private canMakeRequest(apiName: string): boolean {
    const config = DATA_SOURCES[apiName];
    if (!config || !config.enabled) return false;

    const now = Date.now();
    const requests = this.rateLimiter.get(apiName) || [];
    const recentRequests = requests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= config.rateLimit) {
      return false;
    }

    this.rateLimiter.set(apiName, [...recentRequests, now]);
    return true;
  }

  private getCached(symbol: string): MarketQuote | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp < 60000) { // 1 minute cache
      return cached.data;
    }

    this.cache.delete(symbol);
    return null;
  }

  private setCache(symbol: string, data: MarketQuote): void {
    this.cache.set(symbol, { data, timestamp: Date.now() });
  }

  async fetchMarketData(symbols: string[]): Promise<MarketQuote[]> {
    const results: MarketQuote[] = [];

    for (const symbol of symbols) {
      // Check cache first
      const cached = this.getCached(symbol);
      if (cached) {
        results.push(cached);
        continue;
      }

      // Try APIs in priority order
      let quote: MarketQuote | null = null;
      
      // Try Twelve Data
      if (this.canMakeRequest('twelveData') && DATA_SOURCES.twelveData.apiKey) {
        quote = await this.fetchFromTwelveData(symbol);
      }

      // Fallback to Yahoo Finance
      if (!quote && this.canMakeRequest('yahooFinance') && DATA_SOURCES.yahooFinance.apiKey) {
        quote = await this.fetchFromYahooFinance(symbol);
      }

      // Fallback to Alpha Vantage
      if (!quote && this.canMakeRequest('alphaVantage') && DATA_SOURCES.alphaVantage.apiKey) {
        quote = await this.fetchFromAlphaVantage(symbol);
      }

      // Last resort: fetch from database
      if (!quote) {
        const dbQuotes = await this.fetchFromDatabase([symbol]);
        quote = dbQuotes[0] || null;
      }

      if (quote) {
        this.setCache(symbol, quote);
        results.push(quote);
      }
    }

    // Store to database
    if (results.length > 0) {
      await this.saveToDatabase(results);
    }

    return results;
  }

  private async fetchFromTwelveData(symbol: string): Promise<MarketQuote | null> {
    try {
      const config = DATA_SOURCES.twelveData;
      const url = `${config.baseUrl}/quote?symbol=${symbol}&apikey=${config.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        await this.logAPIUsage('twelveData', 'error', { status: response.status });
        return null;
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        await this.logAPIUsage('twelveData', 'error', data);
        return null;
      }

      await this.logAPIUsage('twelveData', 'success');

      return {
        symbol: data.symbol,
        price: parseFloat(data.close || data.price),
        change: parseFloat(data.change),
        changePercent: parseFloat(data.percent_change),
        volume: parseInt(data.volume),
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        open: parseFloat(data.open),
        source: 'twelveData',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.logAPIUsage('twelveData', 'error', error);
      return null;
    }
  }

  private async fetchFromYahooFinance(symbol: string): Promise<MarketQuote | null> {
    try {
      const config = DATA_SOURCES.yahooFinance;
      const url = `${config.baseUrl}/api/v1/markets/quote?symbol=${symbol}`;
      
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': config.apiKey || '',
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com',
        },
      });

      if (!response.ok) {
        await this.logAPIUsage('yahooFinance', 'error', { status: response.status });
        return null;
      }

      const data = await response.json();
      await this.logAPIUsage('yahooFinance', 'success');

      return {
        symbol: data.symbol,
        price: data.regularMarketPrice,
        change: data.regularMarketChange,
        changePercent: data.regularMarketChangePercent,
        volume: data.regularMarketVolume,
        high: data.regularMarketDayHigh,
        low: data.regularMarketDayLow,
        open: data.regularMarketOpen,
        bid: data.bid,
        ask: data.ask,
        source: 'yahooFinance',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.logAPIUsage('yahooFinance', 'error', error);
      return null;
    }
  }

  private async fetchFromAlphaVantage(symbol: string): Promise<MarketQuote | null> {
    try {
      const config = DATA_SOURCES.alphaVantage;
      const url = `${config.baseUrl}/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${config.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        await this.logAPIUsage('alphaVantage', 'error', { status: response.status });
        return null;
      }

      const data = await response.json();
      const quote = data['Global Quote'];

      if (!quote) {
        await this.logAPIUsage('alphaVantage', 'error', { message: 'No data' });
        return null;
      }

      await this.logAPIUsage('alphaVantage', 'success');

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        source: 'alphaVantage',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await this.logAPIUsage('alphaVantage', 'error', error);
      return null;
    }
  }

  private async saveToDatabase(quotes: MarketQuote[]): Promise<void> {
    try {
      const records = quotes.map(quote => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        change_percent: quote.changePercent,
        volume: quote.volume,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        bid: quote.bid,
        ask: quote.ask,
        source: quote.source,
        timestamp: quote.timestamp,
      }));

      const { error } = await supabase
        .from('market_data')
        .insert(records);

      if (error) {
        console.error('Error saving to database:', error);
      }
    } catch (error) {
      console.error('Error in saveToDatabase:', error);
    }
  }

  private async fetchFromDatabase(symbols: string[]): Promise<MarketQuote[]> {
    try {
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .in('symbol', symbols)
        .order('timestamp', { ascending: false })
        .limit(symbols.length);

      if (error) throw error;

      return (data || []).map(row => ({
        symbol: row.symbol,
        price: parseFloat(row.price as any),
        change: parseFloat(row.change as any),
        changePercent: parseFloat(row.change_percent as any),
        volume: parseInt(row.volume as any),
        high: parseFloat(row.high as any),
        low: parseFloat(row.low as any),
        open: parseFloat(row.open as any),
        bid: row.bid ? parseFloat(row.bid as any) : undefined,
        ask: row.ask ? parseFloat(row.ask as any) : undefined,
        source: row.source,
        timestamp: row.timestamp || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching from database:', error);
      return [];
    }
  }

  private async logAPIUsage(apiName: string, status: string, error?: any): Promise<void> {
    try {
      await supabase
        .from('api_usage_logs')
        .insert({
          api_name: apiName,
          status_code: error?.status || (status === 'success' ? 200 : 500),
          error_message: error ? JSON.stringify(error) : null,
          timestamp: new Date().toISOString(),
        });
    } catch (e) {
      console.error('Error logging API usage:', e);
    }
  }

  async startRealtimeStream(symbols: string[]): Promise<void> {
    // Implement WebSocket connections for real-time data
    const wsUrl = 'wss://ws.twelvedata.com/v1/quotes/price';
    const apiKey = DATA_SOURCES.twelveData.apiKey;

    if (!apiKey) {
      console.warn('No API key for real-time streaming');
      return;
    }

    const ws = new WebSocket(`${wsUrl}?apikey=${apiKey}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        action: 'subscribe',
        params: {
          symbols: symbols.join(','),
        },
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'price') {
          const quote: MarketQuote = {
            symbol: data.symbol,
            price: parseFloat(data.price),
            change: 0, // Calculate from previous
            changePercent: 0,
            volume: 0,
            high: 0,
            low: 0,
            open: 0,
            source: 'twelveData-ws',
            timestamp: new Date().toISOString(),
          };
          
          await this.saveToDatabase([quote]);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnection after 5 seconds
      setTimeout(() => this.startRealtimeStream(symbols), 5000);
    };

    this.wsConnections.set('main', ws);
  }

  cleanup(): void {
    this.wsConnections.forEach(ws => ws.close());
    this.wsConnections.clear();
    this.cache.clear();
    this.rateLimiter.clear();
  }
}

export const dataPipelineService = new DataPipelineService();
