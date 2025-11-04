export interface APIConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  cacheDuration: number; // milliseconds
  priority: number; // 1 = highest priority
  enabled: boolean;
}

export const DATA_SOURCES: Record<string, APIConfig> = {
  twelveData: {
    name: 'Twelve Data',
    baseUrl: 'https://api.twelvedata.com',
    apiKey: import.meta.env.VITE_TWELVE_DATA_API_KEY,
    rateLimit: 8, // Free tier: 8 req/min
    cacheDuration: 60000, // 1 minute
    priority: 1,
    enabled: true
  },
  yahooFinance: {
    name: 'Yahoo Finance',
    baseUrl: 'https://yahoo-finance15.p.rapidapi.com',
    apiKey: import.meta.env.VITE_RAPIDAPI_KEY,
    rateLimit: 10,
    cacheDuration: 60000,
    priority: 2,
    enabled: true
  },
  alphaVantage: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co',
    apiKey: import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'demo',
    rateLimit: 5,
    cacheDuration: 60000,
    priority: 3,
    enabled: true
  },
  newsAPI: {
    name: 'NewsAPI',
    baseUrl: 'https://newsapi.org/v2',
    apiKey: import.meta.env.VITE_NEWSAPI_KEY,
    rateLimit: 100,
    cacheDuration: 300000, // 5 minutes
    priority: 1,
    enabled: true
  }
};

export const WEBSOCKET_ENDPOINTS = {
  twelveData: 'wss://ws.twelvedata.com/v1/quotes/price',
  yahooFinance: 'wss://streamer.finance.yahoo.com'
};

export const DEFAULT_SYMBOLS = [
  'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 
  'NVDA', 'META', 'BTC-USD', 'ETH-USD'
];
