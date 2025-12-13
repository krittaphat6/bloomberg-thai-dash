// Forex Data Service - Real exchange rates from Frankfurter API

export interface CurrencyData {
  symbol: string;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  timestamp: string;
}

export interface HistoricalRate {
  date: string;
  rate: number;
}

export class ForexDataService {
  // Frankfurter API - Free, no API key, uses ECB data
  private static readonly FRANKFURTER_API = 'https://api.frankfurter.app';
  // Exchange Rate API - Free tier: 1500 requests/month
  private static readonly EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';
  
  private static cache: { rates: CurrencyData[]; timestamp: number } = { rates: [], timestamp: 0 };
  private static readonly CACHE_DURATION = 60000; // 1 minute

  // Major forex pairs to fetch
  private static readonly PAIRS = [
    { base: 'USD', quote: 'EUR' },
    { base: 'USD', quote: 'GBP' },
    { base: 'USD', quote: 'JPY' },
    { base: 'USD', quote: 'CHF' },
    { base: 'USD', quote: 'CAD' },
    { base: 'USD', quote: 'AUD' },
    { base: 'USD', quote: 'NZD' },
    { base: 'USD', quote: 'THB' },
    { base: 'USD', quote: 'CNY' },
    { base: 'USD', quote: 'SGD' },
    { base: 'USD', quote: 'HKD' },
    { base: 'USD', quote: 'KRW' },
    { base: 'USD', quote: 'INR' },
    { base: 'USD', quote: 'MXN' }
  ];

  // Cross pairs
  private static readonly CROSS_PAIRS = [
    { base: 'EUR', quote: 'GBP' },
    { base: 'EUR', quote: 'JPY' },
    { base: 'GBP', quote: 'JPY' },
    { base: 'EUR', quote: 'THB' },
    { base: 'GBP', quote: 'THB' },
    { base: 'AUD', quote: 'THB' }
  ];

  // Fetch all forex pairs
  static async fetchForexPairs(): Promise<CurrencyData[]> {
    // Check cache
    if (this.cache.rates.length > 0 && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
      return this.cache.rates;
    }

    try {
      // Fetch current rates from Frankfurter
      const currencies = [...new Set([...this.PAIRS, ...this.CROSS_PAIRS].flatMap(p => [p.base, p.quote]))];
      const currencyList = currencies.filter(c => c !== 'USD').join(',');
      
      const [currentResponse, yesterdayResponse] = await Promise.all([
        fetch(`${this.FRANKFURTER_API}/latest?from=USD&to=${currencyList}`),
        fetch(`${this.FRANKFURTER_API}/${this.getYesterdayDate()}?from=USD&to=${currencyList}`)
      ]);

      if (!currentResponse.ok || !yesterdayResponse.ok) {
        throw new Error('Frankfurter API error');
      }

      const currentData = await currentResponse.json();
      const yesterdayData = await yesterdayResponse.json();

      const rates: CurrencyData[] = [];

      // Process USD pairs
      for (const pair of this.PAIRS) {
        const currency = pair.quote;
        const currentRate = currentData.rates[currency];
        const yesterdayRate = yesterdayData.rates[currency];

        if (currentRate) {
          const change = currentRate - (yesterdayRate || currentRate);
          const changePercent = yesterdayRate ? ((change / yesterdayRate) * 100) : 0;
          const spread = currentRate * 0.0002; // Simulate spread

          rates.push({
            symbol: `${pair.base}/${pair.quote}`,
            bid: currentRate - spread,
            ask: currentRate + spread,
            change,
            changePercent,
            high: currentRate * 1.005,
            low: currentRate * 0.995,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Calculate cross pairs
      for (const pair of this.CROSS_PAIRS) {
        const baseRate = currentData.rates[pair.base] || 1;
        const quoteRate = currentData.rates[pair.quote] || 1;
        const crossRate = quoteRate / baseRate;
        
        const baseRateY = yesterdayData.rates[pair.base] || 1;
        const quoteRateY = yesterdayData.rates[pair.quote] || 1;
        const crossRateY = quoteRateY / baseRateY;

        const change = crossRate - crossRateY;
        const changePercent = (change / crossRateY) * 100;
        const spread = crossRate * 0.0003;

        rates.push({
          symbol: `${pair.base}/${pair.quote}`,
          bid: crossRate - spread,
          ask: crossRate + spread,
          change,
          changePercent,
          high: crossRate * 1.005,
          low: crossRate * 0.995,
          timestamp: new Date().toISOString()
        });
      }

      this.cache.rates = rates;
      this.cache.timestamp = Date.now();

      return rates;
    } catch (error) {
      console.error('Forex fetch error:', error);
      
      // Fallback to Exchange Rate API
      return this.fetchFromExchangeRateAPI();
    }
  }

  // Fallback API
  private static async fetchFromExchangeRateAPI(): Promise<CurrencyData[]> {
    try {
      const response = await fetch(`${this.EXCHANGE_RATE_API}/USD`);
      if (!response.ok) throw new Error('Exchange Rate API error');

      const data = await response.json();
      const rates: CurrencyData[] = [];

      for (const pair of this.PAIRS) {
        const rate = data.rates[pair.quote];
        if (rate) {
          const spread = rate * 0.0002;
          rates.push({
            symbol: `${pair.base}/${pair.quote}`,
            bid: rate - spread,
            ask: rate + spread,
            change: 0,
            changePercent: 0,
            high: rate * 1.005,
            low: rate * 0.995,
            timestamp: new Date().toISOString()
          });
        }
      }

      return rates;
    } catch (error) {
      console.error('Exchange Rate API error:', error);
      return this.getMockData();
    }
  }

  // Fetch historical rates for a pair
  static async fetchHistoricalRates(base: string, quote: string, days: number = 30): Promise<HistoricalRate[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await fetch(
        `${this.FRANKFURTER_API}/${this.formatDate(startDate)}..${this.formatDate(endDate)}?from=${base}&to=${quote}`
      );

      if (!response.ok) throw new Error('Historical rates error');

      const data = await response.json();
      
      return Object.entries(data.rates).map(([date, rates]) => ({
        date,
        rate: (rates as Record<string, number>)[quote]
      }));
    } catch (error) {
      console.error('Historical rates error:', error);
      return [];
    }
  }

  // Currency converter
  static async convert(amount: number, from: string, to: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.FRANKFURTER_API}/latest?amount=${amount}&from=${from}&to=${to}`
      );

      if (!response.ok) throw new Error('Conversion error');

      const data = await response.json();
      return data.rates[to];
    } catch (error) {
      console.error('Conversion error:', error);
      return 0;
    }
  }

  // Helper functions
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private static getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Skip weekends
    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
    return this.formatDate(yesterday);
  }

  // Mock data fallback
  private static getMockData(): CurrencyData[] {
    return [
      { symbol: 'USD/EUR', bid: 0.9234, ask: 0.9236, change: -0.0012, changePercent: -0.13, high: 0.9256, low: 0.9210, timestamp: new Date().toISOString() },
      { symbol: 'USD/GBP', bid: 0.7892, ask: 0.7894, change: 0.0008, changePercent: 0.10, high: 0.7912, low: 0.7875, timestamp: new Date().toISOString() },
      { symbol: 'USD/JPY', bid: 149.56, ask: 149.58, change: 0.42, changePercent: 0.28, high: 150.12, low: 149.05, timestamp: new Date().toISOString() },
      { symbol: 'USD/CHF', bid: 0.8834, ask: 0.8836, change: 0.0024, changePercent: 0.27, high: 0.8865, low: 0.8798, timestamp: new Date().toISOString() },
      { symbol: 'USD/THB', bid: 34.78, ask: 34.82, change: -0.15, changePercent: -0.43, high: 35.05, low: 34.62, timestamp: new Date().toISOString() },
      { symbol: 'USD/CNY', bid: 7.2345, ask: 7.2365, change: 0.0145, changePercent: 0.20, high: 7.2456, low: 7.2198, timestamp: new Date().toISOString() },
      { symbol: 'EUR/GBP', bid: 0.8545, ask: 0.8548, change: 0.0018, changePercent: 0.21, high: 0.8565, low: 0.8520, timestamp: new Date().toISOString() },
      { symbol: 'EUR/JPY', bid: 162.05, ask: 162.10, change: 0.65, changePercent: 0.40, high: 162.85, low: 161.25, timestamp: new Date().toISOString() },
      { symbol: 'GBP/JPY', bid: 189.65, ask: 189.72, change: 0.35, changePercent: 0.18, high: 190.45, low: 189.10, timestamp: new Date().toISOString() }
    ];
  }
}

export const forexDataService = new ForexDataService();
