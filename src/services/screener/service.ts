// ============================================
// MarketScreener Service - TradingView API Integration
// Matches tvscreener library architecture
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { FieldDef, ScreenerType, ALL_FIELDS, getFieldsForScreener } from './fields';

export interface FilterCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'between' | 'not_between' | 'isin';
  value: any;
}

export class MarketScreener {
  private type: ScreenerType;
  private filters: FilterCondition[] = [];
  private selectedColumns: string[] = [];
  private sortConfig?: { field: string; direction: 'asc' | 'desc' };
  private rangeConfig: [number, number] = [0, 150];
  private searchQuery?: string;
  private marketFilter?: string[];
  private indexFilter?: string;

  constructor(type: ScreenerType) {
    this.type = type;
  }

  select(...fieldNames: string[]): this {
    this.selectedColumns = fieldNames;
    return this;
  }

  where(condition: FilterCondition): this {
    this.filters.push(condition);
    return this;
  }

  sortBy(field: string, direction: 'asc' | 'desc' = 'desc'): this {
    this.sortConfig = { field, direction };
    return this;
  }

  setRange(from: number, to: number): this {
    this.rangeConfig = [from, Math.min(to, 5000)];
    return this;
  }

  search(query: string): this {
    this.searchQuery = query;
    return this;
  }

  setMarkets(...markets: string[]): this {
    this.marketFilter = markets;
    return this;
  }

  setIndex(index: string): this {
    this.indexFilter = index;
    return this;
  }

  getType(): ScreenerType { return this.type; }
  getFilters(): FilterCondition[] { return this.filters; }
  getColumns(): string[] { return this.selectedColumns; }

  async get(): Promise<{ data: any[]; totalCount: number; error?: string; fallback?: boolean }> {
    try {
      const response = await supabase.functions.invoke('tv-screener', {
        body: {
          type: this.type,
          columns: this.selectedColumns,
          filters: this.filters,
          sort: this.sortConfig ? {
            sortBy: this.sortConfig.field,
            sortOrder: this.sortConfig.direction,
          } : undefined,
          range: this.rangeConfig,
          search: this.searchQuery,
          markets: this.marketFilter,
          index: this.indexFilter,
        },
      });

      if (response.error) {
        console.warn('[MarketScreener] Edge function error, using fallback:', response.error);
        return this.getFallbackData();
      }

      const result = response.data;
      if (result.fallback || !result.data || result.data.length === 0) {
        console.log('[MarketScreener] No API data, using fallback');
        return this.getFallbackData();
      }

      return { data: result.data, totalCount: result.totalCount };
    } catch (error) {
      console.warn('[MarketScreener] Error, using fallback:', error);
      return this.getFallbackData();
    }
  }

  // Fallback mock data when API is unavailable
  private getFallbackData(): { data: any[]; totalCount: number; fallback: boolean } {
    let data: any[];
    switch (this.type) {
      case 'stock': data = generateMockStocks(); break;
      case 'crypto': data = generateMockCrypto(); break;
      case 'forex': data = generateMockForex(); break;
      case 'bond': data = generateMockBonds(); break;
      case 'futures': data = generateMockFutures(); break;
      case 'coin': data = generateMockCrypto(); break;
      default: data = [];
    }

    // Apply filters locally
    data = data.filter(item => this.applyLocalFilters(item));

    // Apply sort
    if (this.sortConfig) {
      const { field, direction } = this.sortConfig;
      data.sort((a, b) => {
        const aVal = a[field] ?? 0;
        const bVal = b[field] ?? 0;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Apply range
    data = data.slice(this.rangeConfig[0], this.rangeConfig[1]);

    return { data, totalCount: data.length, fallback: true };
  }

  private applyLocalFilters(item: any): boolean {
    return this.filters.every(filter => {
      const value = item[filter.field];
      if (value === undefined || value === null) return true;
      switch (filter.operator) {
        case '>': return value > filter.value;
        case '<': return value < filter.value;
        case '>=': return value >= filter.value;
        case '<=': return value <= filter.value;
        case '=': return value === filter.value;
        case '!=': return value !== filter.value;
        case 'between': return Array.isArray(filter.value) && value >= filter.value[0] && value <= filter.value[1];
        case 'not_between': return Array.isArray(filter.value) && (value < filter.value[0] || value > filter.value[1]);
        case 'isin': return Array.isArray(filter.value) && filter.value.includes(value);
        default: return true;
      }
    });
  }
}

// ---- MOCK DATA GENERATORS (fallback) ----

const STOCK_NAMES: [string, string][] = [
  ['AAPL', 'Apple Inc.'], ['MSFT', 'Microsoft Corp.'], ['AMZN', 'Amazon.com'], ['NVDA', 'NVIDIA Corp.'],
  ['GOOGL', 'Alphabet Inc.'], ['META', 'Meta Platforms'], ['TSLA', 'Tesla Inc.'], ['BRK.B', 'Berkshire Hathaway'],
  ['JPM', 'JPMorgan Chase'], ['V', 'Visa Inc.'], ['UNH', 'UnitedHealth'], ['JNJ', 'Johnson & Johnson'],
  ['WMT', 'Walmart Inc.'], ['PG', 'Procter & Gamble'], ['MA', 'Mastercard'], ['LLY', 'Eli Lilly'],
  ['AVGO', 'Broadcom Inc.'], ['HD', 'Home Depot'], ['CVX', 'Chevron Corp.'], ['KO', 'Coca-Cola Co.'],
  ['ABBV', 'AbbVie Inc.'], ['MRK', 'Merck & Co.'], ['PEP', 'PepsiCo Inc.'], ['COST', 'Costco'],
  ['ADBE', 'Adobe Inc.'], ['CRM', 'Salesforce Inc.'], ['ORCL', 'Oracle Corp.'], ['NFLX', 'Netflix Inc.'],
  ['AMD', 'AMD'], ['INTC', 'Intel Corp.'], ['PFE', 'Pfizer Inc.'], ['DIS', 'Walt Disney'],
  ['CSCO', 'Cisco Systems'], ['NKE', 'Nike Inc.'], ['BA', 'Boeing Co.'], ['GS', 'Goldman Sachs'],
  ['MS', 'Morgan Stanley'], ['CAT', 'Caterpillar'], ['IBM', 'IBM'], ['GE', 'GE Aerospace'],
  ['PYPL', 'PayPal Holdings'], ['UBER', 'Uber Technologies'], ['SQ', 'Block Inc.'], ['PLTR', 'Palantir'],
  ['CRWD', 'CrowdStrike'], ['SNOW', 'Snowflake'], ['COIN', 'Coinbase'], ['SHOP', 'Shopify'],
  ['SQ', 'Block Inc.'], ['ABNB', 'Airbnb'],
];

const SECTORS = ['Technology', 'Healthcare', 'Financial', 'Energy', 'Consumer Cyclical', 'Industrial', 'Communication', 'Consumer Defensive', 'Utilities', 'Real Estate'];

function generateMockStocks(): any[] {
  return STOCK_NAMES.map(([sym, name], i) => {
    const price = +(50 + Math.random() * 450).toFixed(2);
    const change = +((Math.random() - 0.5) * 10).toFixed(2);
    const rsi = +(Math.random() * 100).toFixed(1);
    const sma50 = +(price * (0.95 + Math.random() * 0.1)).toFixed(2);
    const sma200 = +(price * (0.9 + Math.random() * 0.2)).toFixed(2);
    return {
      symbol: `NASDAQ:${sym}`,
      name: sym, description: name, close: price,
      change, change_abs: +(price * change / 100).toFixed(2),
      volume: Math.floor(Math.random() * 50000000) + 100000,
      market_cap_basic: Math.floor(Math.random() * 2e12) + 1e9,
      price_earnings_ttm: +(10 + Math.random() * 40).toFixed(2),
      price_book_fq: +(1 + Math.random() * 15).toFixed(2),
      price_sales_current: +(1 + Math.random() * 20).toFixed(2),
      enterprise_value_ebitda_ttm: +(5 + Math.random() * 30).toFixed(2),
      RSI: rsi, 'MACD.macd': +((Math.random() - 0.5) * 5).toFixed(3),
      'MACD.signal': +((Math.random() - 0.5) * 3).toFixed(3),
      'Stoch.K': +(Math.random() * 100).toFixed(1),
      'Stoch.D': +(Math.random() * 100).toFixed(1),
      CCI20: +((Math.random() - 0.5) * 400).toFixed(1),
      ADX: +(10 + Math.random() * 50).toFixed(1),
      ATR: +(price * 0.01 + Math.random() * price * 0.03).toFixed(2),
      Mom: +((Math.random() - 0.5) * 20).toFixed(2),
      'W.R': +(-100 * Math.random()).toFixed(1),
      SMA50: sma50, SMA200: sma200, SMA20: +(price * (0.97 + Math.random() * 0.06)).toFixed(2),
      EMA20: +(price * (0.97 + Math.random() * 0.06)).toFixed(2),
      EMA50: +(price * (0.95 + Math.random() * 0.1)).toFixed(2),
      'BB.upper': +(price * 1.05).toFixed(2), 'BB.lower': +(price * 0.95).toFixed(2),
      'Recommend.All': +((Math.random() - 0.5) * 2).toFixed(3),
      'Recommend.MA': +((Math.random() - 0.5) * 2).toFixed(3),
      'Recommend.Other': +((Math.random() - 0.5) * 2).toFixed(3),
      'Perf.W': +((Math.random() - 0.5) * 10).toFixed(2),
      'Perf.1M': +((Math.random() - 0.5) * 20).toFixed(2),
      'Perf.3M': +((Math.random() - 0.5) * 30).toFixed(2),
      'Perf.6M': +((Math.random() - 0.5) * 40).toFixed(2),
      'Perf.YTD': +((Math.random() - 0.5) * 30).toFixed(2),
      'Perf.Y': +((Math.random() - 0.5) * 50).toFixed(2),
      'Volatility.D': +(1 + Math.random() * 5).toFixed(2),
      relative_volume_10d_calc: +(0.3 + Math.random() * 3).toFixed(2),
      average_volume_10d_calc: Math.floor(Math.random() * 30000000) + 500000,
      sector: SECTORS[i % SECTORS.length],
      exchange: ['NYSE', 'NASDAQ'][Math.floor(Math.random() * 2)],
      return_on_equity: +((Math.random() - 0.2) * 40).toFixed(2),
      gross_margin: +(20 + Math.random() * 60).toFixed(2),
      net_margin: +(5 + Math.random() * 30).toFixed(2),
      dividend_yield_recent: +(Math.random() * 5).toFixed(2),
      earnings_per_share_basic_ttm: +(1 + Math.random() * 15).toFixed(2),
    };
  });
}

const CRYPTO_DATA: [string, string, number][] = [
  ['BTC', 'Bitcoin', 95000], ['ETH', 'Ethereum', 3200], ['BNB', 'BNB', 600],
  ['SOL', 'Solana', 180], ['XRP', 'XRP', 2.5], ['ADA', 'Cardano', 0.8],
  ['AVAX', 'Avalanche', 35], ['DOT', 'Polkadot', 7], ['DOGE', 'Dogecoin', 0.3],
  ['LINK', 'Chainlink', 15], ['MATIC', 'Polygon', 0.8], ['LTC', 'Litecoin', 85],
  ['UNI', 'Uniswap', 12], ['ATOM', 'Cosmos', 9], ['XLM', 'Stellar', 0.4],
  ['NEAR', 'Near Protocol', 5], ['APT', 'Aptos', 10], ['ARB', 'Arbitrum', 1.2],
  ['OP', 'Optimism', 2], ['SUI', 'Sui', 1.5], ['FIL', 'Filecoin', 5],
  ['AAVE', 'Aave', 300], ['MKR', 'Maker', 2800], ['RNDR', 'Render', 8],
  ['INJ', 'Injective', 25], ['PEPE', 'Pepe', 0.00001], ['WLD', 'Worldcoin', 3],
  ['KAS', 'Kaspa', 0.15], ['SEI', 'Sei', 0.5], ['TIA', 'Celestia', 8],
];

function generateMockCrypto(): any[] {
  return CRYPTO_DATA.map(([sym, name, base]) => {
    const price = +(base * (0.9 + Math.random() * 0.2)).toFixed(base < 1 ? 6 : 2);
    const change = +((Math.random() - 0.5) * 20).toFixed(2);
    return {
      symbol: `BINANCE:${sym}USDT`,
      name: sym, description: name, close: price,
      change, change_abs: +(price * change / 100).toFixed(base < 1 ? 8 : 4),
      '24h_vol|5': Math.floor(Math.random() * 5e9) + 1e7,
      '24h_vol_change|5': +((Math.random() - 0.5) * 50).toFixed(2),
      market_cap_calc: Math.floor(Math.random() * 500e9) + 1e8,
      RSI: +(Math.random() * 100).toFixed(1),
      'MACD.macd': +((Math.random() - 0.5) * 5).toFixed(3),
      'Recommend.All': +((Math.random() - 0.5) * 2).toFixed(3),
      'Perf.W': +((Math.random() - 0.5) * 15).toFixed(2),
      'Perf.1M': +((Math.random() - 0.5) * 30).toFixed(2),
      'Perf.3M': +((Math.random() - 0.5) * 50).toFixed(2),
      'Volatility.D': +(2 + Math.random() * 8).toFixed(2),
      'Stoch.K': +(Math.random() * 100).toFixed(1),
    };
  });
}

const FOREX_DATA: [string, number][] = [
  ['EUR/USD', 1.085], ['GBP/USD', 1.27], ['USD/JPY', 149.5], ['AUD/USD', 0.655],
  ['USD/CAD', 1.36], ['NZD/USD', 0.615], ['USD/CHF', 0.88], ['EUR/GBP', 0.855],
  ['EUR/JPY', 162], ['GBP/JPY', 190], ['AUD/JPY', 98], ['EUR/AUD', 1.66],
  ['GBP/AUD', 1.94], ['USD/SGD', 1.34], ['USD/THB', 34.5],
];

function generateMockForex(): any[] {
  return FOREX_DATA.map(([sym, base]) => {
    const isJpy = sym.includes('JPY') || sym.includes('THB');
    const price = +(base * (0.998 + Math.random() * 0.004)).toFixed(isJpy ? 3 : 5);
    return {
      symbol: `FX:${sym.replace('/', '')}`,
      name: sym, description: sym, close: price,
      change: +((Math.random() - 0.5) * 2).toFixed(2),
      bid: +(price - 0.0001).toFixed(isJpy ? 3 : 5),
      ask: +(price + 0.0001).toFixed(isJpy ? 3 : 5),
      spread_raw: +(0.1 + Math.random() * 2).toFixed(1),
      RSI: +(Math.random() * 100).toFixed(1),
      'MACD.macd': +((Math.random() - 0.5) * 0.01).toFixed(5),
      'Recommend.All': +((Math.random() - 0.5) * 2).toFixed(3),
      'Stoch.K': +(Math.random() * 100).toFixed(1), 'Stoch.D': +(Math.random() * 100).toFixed(1),
      ADX: +(10 + Math.random() * 50).toFixed(1),
      ATR: +(price * 0.005).toFixed(isJpy ? 3 : 5),
      SMA50: +(price * (0.99 + Math.random() * 0.02)).toFixed(isJpy ? 3 : 5),
      SMA200: +(price * (0.98 + Math.random() * 0.04)).toFixed(isJpy ? 3 : 5),
      'Perf.W': +((Math.random() - 0.5) * 3).toFixed(2),
      'Perf.1M': +((Math.random() - 0.5) * 5).toFixed(2),
    };
  });
}

function generateMockBonds(): any[] {
  const bonds: [string, string][] = [
    ['US10Y', 'US 10-Year'], ['US2Y', 'US 2-Year'], ['US5Y', 'US 5-Year'], ['US30Y', 'US 30-Year'],
    ['DE10Y', 'Germany 10Y'], ['JP10Y', 'Japan 10Y'], ['GB10Y', 'UK 10Y'], ['FR10Y', 'France 10Y'],
    ['IT10Y', 'Italy 10Y'], ['AU10Y', 'Australia 10Y'],
  ];
  return bonds.map(([sym, name]) => ({
    symbol: sym, name: sym, description: name,
    close: +(2 + Math.random() * 3).toFixed(3),
    change: +((Math.random() - 0.5) * 0.5).toFixed(2),
    yield_recent: +(2 + Math.random() * 3).toFixed(3),
    coupon: +(1 + Math.random() * 4).toFixed(2),
    RSI: +(Math.random() * 100).toFixed(1),
    'Recommend.All': +((Math.random() - 0.5) * 2).toFixed(3),
  }));
}

function generateMockFutures(): any[] {
  const futures: [string, string, number][] = [
    ['ES', 'E-mini S&P 500', 5200], ['NQ', 'E-mini NASDAQ', 18500], ['YM', 'E-mini Dow', 39000],
    ['GC', 'Gold', 2650], ['SI', 'Silver', 31], ['CL', 'Crude Oil', 72],
    ['NG', 'Natural Gas', 3.2], ['ZB', 'US T-Bond', 118], ['ZN', '10Y T-Note', 110],
    ['6E', 'Euro FX', 1.085],
  ];
  return futures.map(([sym, name, base]) => ({
    symbol: `CME:${sym}`, name: sym, description: name,
    close: +(base * (0.99 + Math.random() * 0.02)).toFixed(2),
    change: +((Math.random() - 0.5) * 4).toFixed(2),
    change_abs: +((Math.random() - 0.5) * base * 0.02).toFixed(2),
    volume: Math.floor(Math.random() * 2000000) + 50000,
    open_interest: Math.floor(Math.random() * 500000) + 10000,
    high: +(base * 1.01).toFixed(2), low: +(base * 0.99).toFixed(2),
    RSI: +(Math.random() * 100).toFixed(1),
    'MACD.macd': +((Math.random() - 0.5) * 10).toFixed(3),
    'Recommend.All': +((Math.random() - 0.5) * 2).toFixed(3),
    'Perf.W': +((Math.random() - 0.5) * 5).toFixed(2),
  }));
}
