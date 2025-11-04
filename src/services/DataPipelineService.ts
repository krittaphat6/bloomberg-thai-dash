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
  timestamp: Date;
  source: string;
}

class DataPipelineService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private rateLimiters: Map<string, number[]> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  // Rate limiting checker
  private canMakeRequest(apiName: string): boolean {
    const config = DATA_SOURCES[apiName];
    if (!config) return false;

    const now = Date.now();
    const requests = this.rateLimiters.get(apiName) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= config.rateLimit) {
      console.warn(`⚠️ Rate limit reached for ${apiName}`);
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimiters.set(apiName, recentRequests);
    return true;
  }

  // Cache management
  private getCached<T>(key: string, maxAge: number): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Fetch market data with fallback strategy
  async fetchMarketData(symbols: string[]): Promise<MarketQuote[]> {
    const cacheKey = `market:${symbols.join(',')}`;
    const cached = this.getCached<MarketQuote[]>(cacheKey, 60000);
    
    if (cached) {
      console.log('✅ Using cached market data');
      return cached;
    }

    // Try each API in priority order
    const apis = Object.entries(DATA_SOURCES)
      .filter(([_, config]) => config.enabled && config.name !== 'NewsAPI')
      .sort((a, b) => a[1].priority - b[1].priority);

    for (const [apiName, config] of apis) {
      if (!this.canMakeRequest(apiName)) continue;

      try {
        let data: MarketQuote[];

        switch (apiName) {
          case 'twelveData':
            data = await this.fetchFromTwelveData(symbols);
            break;
          case 'yahooFinance':
            data = await this.fetchFromYahooFinance(symbols);
            break;
          case 'alphaVantage':
            data = await this.fetchFromAlphaVantage(symbols);
            break;
          default:
            continue;
        }

        // Save to Supabase
        await this.saveToDatabase(data);

        // Cache results
        this.setCache(cacheKey, data);
        
        console.log(`✅ Fetched data from ${config.name}`);
        return data;

      } catch (error) {
        console.error(`❌ ${config.name} failed:`, error);
        await this.logAPIUsage(apiName, 'error', error);
        continue;
      }
    }

    // If all APIs fail, get last known data from Supabase
    console.warn('⚠️ All APIs failed, using database fallback');
    return await this.fetchFromDatabase(symbols);
  }

  // Twelve Data implementation
  private async fetchFromTwelveData(symbols: string[]): Promise<MarketQuote[]> {
    const apiKey = DATA_SOURCES.twelveData.apiKey;
    if (!apiKey) throw new Error('Twelve Data API key not configured');

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.message || 'API returned error');
        }
        
        return {
          symbol: data.symbol,
          price: parseFloat(data.close || data.price || '0'),
          change: parseFloat(data.change || '0'),
          changePercent: parseFloat(data.percent_change || '0'),
          volume: parseInt(data.volume || '0'),
          high: parseFloat(data.high || '0'),
          low: parseFloat(data.low || '0'),
          open: parseFloat(data.open || '0'),
          timestamp: new Date(),
          source: 'twelvedata'
        } as MarketQuote;
      })
    );

    return results;
  }

  // Yahoo Finance implementation
  private async fetchFromYahooFinance(symbols: string[]): Promise<MarketQuote[]> {
    const apiKey = DATA_SOURCES.yahooFinance.apiKey;
    if (!apiKey) throw new Error('RapidAPI key not configured');

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/quote?ticker=${symbol}`,
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
            }
          }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const quote = data.body?.[0];

        if (!quote) throw new Error('No quote data returned');

        return {
          symbol: quote.symbol,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0,
          high: quote.regularMarketDayHigh || 0,
          low: quote.regularMarketDayLow || 0,
          open: quote.regularMarketOpen || 0,
          bid: quote.bid,
          ask: quote.ask,
          timestamp: new Date(),
          source: 'yahoo'
        } as MarketQuote;
      })
    );

    return results;
  }

  // Alpha Vantage implementation
  private async fetchFromAlphaVantage(symbols: string[]): Promise<MarketQuote[]> {
    const apiKey = DATA_SOURCES.alphaVantage.apiKey || 'demo';

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const quote = data['Global Quote'];

        if (!quote) throw new Error('No quote data returned');

        return {
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price'] || '0'),
          change: parseFloat(quote['09. change'] || '0'),
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
          volume: parseInt(quote['06. volume'] || '0'),
          high: parseFloat(quote['03. high'] || '0'),
          low: parseFloat(quote['04. low'] || '0'),
          open: parseFloat(quote['02. open'] || '0'),
          timestamp: new Date(),
          source: 'alphavantage'
        } as MarketQuote;
      })
    );

    return results;
  }

  // Save to Supabase
  private async saveToDatabase(quotes: MarketQuote[]): Promise<void> {
    const records = quotes.map(q => ({
      symbol: q.symbol,
      price: q.price,
      volume: q.volume,
      change: q.change,
      change_percent: q.changePercent,
      high: q.high,
      low: q.low,
      open: q.open,
      bid: q.bid,
      ask: q.ask,
      source: q.source,
      timestamp: q.timestamp.toISOString()
    }));

    const { error } = await supabase
      .from('market_data')
      .insert(records);

    if (error) {
      console.error('Failed to save to database:', error);
    }
  }

  // Fetch from Supabase (fallback)
  private async fetchFromDatabase(symbols: string[]): Promise<MarketQuote[]> {
    const { data, error } = await supabase
      .from('market_data')
      .select('*')
      .in('symbol', symbols)
      .order('timestamp', { ascending: false });

    if (error || !data) {
      console.error('Database fallback failed:', error);
      return [];
    }

    // Get most recent quote for each symbol
    const latestQuotes = new Map<string, any>();
    for (const row of data) {
      if (!latestQuotes.has(row.symbol)) {
        latestQuotes.set(row.symbol, row);
      }
    }

    return Array.from(latestQuotes.values()).map(d => ({
      symbol: d.symbol,
      price: parseFloat(d.price),
      change: parseFloat(d.change),
      changePercent: parseFloat(d.change_percent),
      volume: parseInt(d.volume),
      high: parseFloat(d.high),
      low: parseFloat(d.low),
      open: parseFloat(d.open),
      bid: d.bid ? parseFloat(d.bid) : undefined,
      ask: d.ask ? parseFloat(d.ask) : undefined,
      timestamp: new Date(d.timestamp),
      source: d.source
    }));
  }

  // Log API usage
  private async logAPIUsage(apiName: string, status: string, error?: any): Promise<void> {
    try {
      await supabase
        .from('api_usage_logs')
        .insert({
          api_name: apiName,
          status_code: error ? 0 : 200,
          error_message: error?.message
        });
    } catch (e) {
      console.error('Failed to log API usage:', e);
    }
  }

  // Cleanup
  cleanup(): void {
    this.wsConnections.forEach(ws => ws.close());
    this.wsConnections.clear();
    this.cache.clear();
    this.rateLimiters.clear();
  }
}

export const dataPipelineService = new DataPipelineService();
