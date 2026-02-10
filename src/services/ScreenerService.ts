export type ScreenerType = 'stock' | 'crypto' | 'forex' | 'bond' | 'futures' | 'coin';

export interface FilterCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'between' | 'isin';
  value: any;
}

export class Field {
  constructor(public name: string, public type: string, public label: string) {}

  gt(value: number): FilterCondition {
    return { field: this.name, operator: '>', value };
  }

  lt(value: number): FilterCondition {
    return { field: this.name, operator: '<', value };
  }

  gte(value: number): FilterCondition {
    return { field: this.name, operator: '>=', value };
  }

  lte(value: number): FilterCondition {
    return { field: this.name, operator: '<=', value };
  }

  between(min: number, max: number): FilterCondition {
    return { field: this.name, operator: 'between', value: [min, max] };
  }

  isin(values: any[]): FilterCondition {
    return { field: this.name, operator: 'isin', value: values };
  }
}

export const StockField = {
  SYMBOL: new Field('symbol', 'string', 'Symbol'),
  NAME: new Field('name', 'string', 'Name'),
  PRICE: new Field('price', 'number', 'Price'),
  CHANGE_PERCENT: new Field('change_percent', 'number', 'Change %'),
  VOLUME: new Field('volume', 'number', 'Volume'),
  MARKET_CAP: new Field('market_cap', 'number', 'Market Cap'),
  PE_RATIO: new Field('pe_ratio', 'number', 'P/E Ratio'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)'),
  MACD: new Field('macd', 'number', 'MACD'),
  SECTOR: new Field('sector', 'string', 'Sector'),
  EXCHANGE: new Field('exchange', 'string', 'Exchange'),
};

export const CryptoField = {
  SYMBOL: new Field('symbol', 'string', 'Symbol'),
  NAME: new Field('name', 'string', 'Name'),
  PRICE: new Field('price', 'number', 'Price'),
  CHANGE_24H: new Field('change_24h', 'number', 'Change 24h'),
  VOLUME_24H: new Field('volume_24h', 'number', 'Volume 24h'),
  MARKET_CAP: new Field('market_cap', 'number', 'Market Cap'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)'),
};

export const ForexField = {
  SYMBOL: new Field('symbol', 'string', 'Pair'),
  PRICE: new Field('price', 'number', 'Price'),
  CHANGE_PERCENT: new Field('change_percent', 'number', 'Change %'),
  RSI_14: new Field('rsi_14', 'number', 'RSI(14)'),
};

export const STOCK_PRICE_FIELDS = [
  StockField.SYMBOL, StockField.NAME, StockField.PRICE,
  StockField.CHANGE_PERCENT, StockField.VOLUME,
];

export const STOCK_VALUATION_FIELDS = [
  StockField.SYMBOL, StockField.NAME, StockField.PRICE,
  StockField.PE_RATIO, StockField.MARKET_CAP,
];

export const CRYPTO_PRICE_FIELDS = [
  CryptoField.SYMBOL, CryptoField.NAME, CryptoField.PRICE,
  CryptoField.CHANGE_24H, CryptoField.VOLUME_24H,
];

const STOCK_NAMES = [
  'Apple Inc.', 'Microsoft Corp.', 'Amazon.com', 'NVIDIA Corp.', 'Alphabet Inc.',
  'Meta Platforms', 'Tesla Inc.', 'Berkshire Hathaway', 'JPMorgan Chase', 'Visa Inc.',
  'UnitedHealth', 'Johnson & Johnson', 'Walmart Inc.', 'Procter & Gamble', 'Mastercard',
  'Eli Lilly', 'Samsung Electronics', 'Broadcom Inc.', 'Home Depot', 'Chevron Corp.',
  'Coca-Cola Co.', 'AbbVie Inc.', 'Merck & Co.', 'PepsiCo Inc.', 'Costco Wholesale',
  'Adobe Inc.', 'Salesforce Inc.', 'Oracle Corp.', 'Netflix Inc.', 'AMD',
  'Intel Corp.', 'Pfizer Inc.', 'Walt Disney', 'Cisco Systems', 'Comcast Corp.',
  'Nike Inc.', 'Boeing Co.', 'Goldman Sachs', 'Morgan Stanley', 'Caterpillar',
  'IBM', 'GE Aerospace', 'Honeywell', 'Lockheed Martin', 'Starbucks Corp.',
  'PayPal Holdings', 'Uber Technologies', 'Block Inc.', 'Palantir Technologies', 'CrowdStrike',
];

const STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'META', 'TSLA', 'BRK.B', 'JPM', 'V',
  'UNH', 'JNJ', 'WMT', 'PG', 'MA', 'LLY', 'SSNLF', 'AVGO', 'HD', 'CVX',
  'KO', 'ABBV', 'MRK', 'PEP', 'COST', 'ADBE', 'CRM', 'ORCL', 'NFLX', 'AMD',
  'INTC', 'PFE', 'DIS', 'CSCO', 'CMCSA', 'NKE', 'BA', 'GS', 'MS', 'CAT',
  'IBM', 'GE', 'HON', 'LMT', 'SBUX', 'PYPL', 'UBER', 'SQ', 'PLTR', 'CRWD',
];

const CRYPTO_NAMES = [
  'Bitcoin', 'Ethereum', 'BNB', 'Solana', 'XRP', 'Cardano', 'Avalanche', 'Polkadot',
  'Dogecoin', 'Chainlink', 'Polygon', 'Litecoin', 'Uniswap', 'Cosmos', 'Stellar',
  'Near Protocol', 'Aptos', 'Arbitrum', 'Optimism', 'Sui',
  'Filecoin', 'Aave', 'Maker', 'Render', 'Injective',
  'Pepe', 'Bonk', 'Floki', 'Worldcoin', 'Kaspa',
];

const CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT',
  'DOGE', 'LINK', 'MATIC', 'LTC', 'UNI', 'ATOM', 'XLM',
  'NEAR', 'APT', 'ARB', 'OP', 'SUI',
  'FIL', 'AAVE', 'MKR', 'RNDR', 'INJ',
  'PEPE', 'BONK', 'FLOKI', 'WLD', 'KAS',
];

const FOREX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
  'NZD/USD', 'USD/CHF', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
  'AUD/JPY', 'EUR/AUD', 'GBP/AUD', 'USD/SGD', 'USD/THB',
];

export class MarketScreener {
  private type: ScreenerType;
  private filters: FilterCondition[] = [];
  private selectedFields: Field[] = [];
  private sortField?: string;
  private sortDirection: 'asc' | 'desc' = 'desc';
  private limitCount: number = 50;

  constructor(type: ScreenerType) {
    this.type = type;
  }

  select(...fields: Field[]): this {
    this.selectedFields = fields;
    return this;
  }

  where(condition: FilterCondition): this {
    this.filters.push(condition);
    return this;
  }

  orderBy(field: Field, direction: 'asc' | 'desc' = 'desc'): this {
    this.sortField = field.name;
    this.sortDirection = direction;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  async get(): Promise<any[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    let data = this.getMockData();

    if (this.sortField) {
      data.sort((a, b) => {
        const aVal = a[this.sortField!];
        const bVal = b[this.sortField!];
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return data.slice(0, this.limitCount);
  }

  private getMockData(): any[] {
    switch (this.type) {
      case 'stock': return this.generateMockStocks();
      case 'crypto': return this.generateMockCrypto();
      case 'forex': return this.generateMockForex();
      case 'bond': return this.generateMockBonds();
      case 'futures': return this.generateMockFutures();
      case 'coin': return this.generateMockCrypto(); // Same as crypto for now
      default: return [];
    }
  }

  private generateMockStocks(): any[] {
    const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Telecom'];
    const exchanges = ['NYSE', 'NASDAQ', 'AMEX'];

    return STOCK_SYMBOLS.map((symbol, i) => ({
      symbol,
      name: STOCK_NAMES[i] || `Company ${i + 1}`,
      price: +(50 + Math.random() * 450).toFixed(2),
      change_percent: +((Math.random() - 0.5) * 10).toFixed(2),
      volume: Math.floor(Math.random() * 50000000) + 100000,
      market_cap: Math.floor(Math.random() * 2000000000000) + 1000000000,
      pe_ratio: +(10 + Math.random() * 40).toFixed(2),
      rsi_14: +(Math.random() * 100).toFixed(1),
      macd: +((Math.random() - 0.5) * 5).toFixed(3),
      sector: sectors[i % sectors.length],
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
    })).filter(item => this.applyFilters(item));
  }

  private generateMockCrypto(): any[] {
    const basePrices = [95000, 3200, 600, 180, 2.5, 0.8, 35, 7, 0.3, 15, 0.8, 85, 12, 9, 0.4, 5, 10, 1.2, 2, 1.5, 5, 300, 2800, 8, 25, 0.00001, 0.00003, 0.0002, 3, 0.15];
    return CRYPTO_SYMBOLS.map((symbol, i) => ({
      symbol,
      name: CRYPTO_NAMES[i] || `Crypto ${i + 1}`,
      price: +(basePrices[i] * (0.9 + Math.random() * 0.2)).toFixed(basePrices[i] < 1 ? 6 : 2),
      change_24h: +((Math.random() - 0.5) * 20).toFixed(2),
      volume_24h: Math.floor(Math.random() * 5000000000) + 10000000,
      market_cap: Math.floor(Math.random() * 500000000000) + 100000000,
      rsi_14: +(Math.random() * 100).toFixed(1),
    })).filter(item => this.applyFilters(item));
  }

  private generateMockForex(): any[] {
    const basePrices = [1.085, 1.27, 149.5, 0.655, 1.36, 0.615, 0.88, 0.855, 162, 190, 98, 1.66, 1.94, 1.34, 34.5];
    return FOREX_PAIRS.map((symbol, i) => ({
      symbol,
      price: +(basePrices[i] * (0.998 + Math.random() * 0.004)).toFixed(symbol.includes('JPY') || symbol.includes('THB') ? 3 : 5),
      change_percent: +((Math.random() - 0.5) * 2).toFixed(2),
      rsi_14: +(Math.random() * 100).toFixed(1),
    })).filter(item => this.applyFilters(item));
  }

  private generateMockBonds(): any[] {
    const bonds = ['US10Y', 'US2Y', 'US5Y', 'US30Y', 'DE10Y', 'JP10Y', 'GB10Y', 'FR10Y', 'IT10Y', 'AU10Y'];
    return bonds.map(symbol => ({
      symbol,
      name: symbol.replace(/(\d+)Y/, ' $1-Year'),
      price: +(2 + Math.random() * 3).toFixed(3),
      change_percent: +((Math.random() - 0.5) * 0.5).toFixed(2),
      rsi_14: +(Math.random() * 100).toFixed(1),
    })).filter(item => this.applyFilters(item));
  }

  private generateMockFutures(): any[] {
    const futures = [
      { symbol: 'ES', name: 'E-mini S&P 500', base: 5200 },
      { symbol: 'NQ', name: 'E-mini NASDAQ', base: 18500 },
      { symbol: 'YM', name: 'E-mini Dow', base: 39000 },
      { symbol: 'GC', name: 'Gold', base: 2650 },
      { symbol: 'SI', name: 'Silver', base: 31 },
      { symbol: 'CL', name: 'Crude Oil', base: 72 },
      { symbol: 'NG', name: 'Natural Gas', base: 3.2 },
      { symbol: 'ZB', name: 'US Treasury Bond', base: 118 },
      { symbol: 'ZN', name: '10-Year T-Note', base: 110 },
      { symbol: '6E', name: 'Euro FX', base: 1.085 },
    ];
    return futures.map(f => ({
      symbol: f.symbol,
      name: f.name,
      price: +(f.base * (0.99 + Math.random() * 0.02)).toFixed(2),
      change_percent: +((Math.random() - 0.5) * 4).toFixed(2),
      volume: Math.floor(Math.random() * 2000000) + 50000,
      rsi_14: +(Math.random() * 100).toFixed(1),
    })).filter(item => this.applyFilters(item));
  }

  private applyFilters(item: any): boolean {
    return this.filters.every(filter => {
      const value = item[filter.field];
      if (value === undefined) return true;
      switch (filter.operator) {
        case '>': return value > filter.value;
        case '<': return value < filter.value;
        case '>=': return value >= filter.value;
        case '<=': return value <= filter.value;
        case '=': return value === filter.value;
        case '!=': return value !== filter.value;
        case 'between': return value >= filter.value[0] && value <= filter.value[1];
        case 'isin': return filter.value.includes(value);
        default: return true;
      }
    });
  }
}
