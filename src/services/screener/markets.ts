// ============================================
// Market & Exchange Definitions
// Supports 40+ countries and 10+ crypto exchanges
// ============================================

export type MarketRegion = 'north_america' | 'europe' | 'asia' | 'latin_america' | 'middle_east' | 'oceania';

export interface MarketInfo {
  code: string;
  label: string;
  flag: string;
  region: MarketRegion;
  exchanges: string[];
}

export interface CryptoExchange {
  code: string;
  label: string;
  icon: string;
}

export const REGION_LABELS: Record<MarketRegion, { label: string; icon: string }> = {
  north_america: { label: 'North America', icon: '🌎' },
  europe: { label: 'Europe', icon: '🇪🇺' },
  asia: { label: 'Asia', icon: '🌏' },
  oceania: { label: 'Oceania', icon: '🌊' },
  latin_america: { label: 'Latin America', icon: '🌎' },
  middle_east: { label: 'Middle East & Africa', icon: '🌍' },
};

export const STOCK_MARKETS: MarketInfo[] = [
  // North America
  { code: 'america', label: 'United States', flag: '🇺🇸', region: 'north_america', exchanges: ['NYSE', 'NASDAQ', 'AMEX', 'OTC'] },
  { code: 'canada', label: 'Canada', flag: '🇨🇦', region: 'north_america', exchanges: ['TSX', 'TSXV'] },
  { code: 'mexico', label: 'Mexico', flag: '🇲🇽', region: 'north_america', exchanges: ['BMV'] },

  // Europe
  { code: 'uk', label: 'United Kingdom', flag: '🇬🇧', region: 'europe', exchanges: ['LSE', 'AIM'] },
  { code: 'germany', label: 'Germany', flag: '🇩🇪', region: 'europe', exchanges: ['XETRA', 'FWB'] },
  { code: 'france', label: 'France', flag: '🇫🇷', region: 'europe', exchanges: ['EPA'] },
  { code: 'italy', label: 'Italy', flag: '🇮🇹', region: 'europe', exchanges: ['MIL'] },
  { code: 'spain', label: 'Spain', flag: '🇪🇸', region: 'europe', exchanges: ['BME'] },
  { code: 'switzerland', label: 'Switzerland', flag: '🇨🇭', region: 'europe', exchanges: ['SIX'] },
  { code: 'netherlands', label: 'Netherlands', flag: '🇳🇱', region: 'europe', exchanges: ['AMS'] },
  { code: 'belgium', label: 'Belgium', flag: '🇧🇪', region: 'europe', exchanges: ['EBR'] },
  { code: 'sweden', label: 'Sweden', flag: '🇸🇪', region: 'europe', exchanges: ['STO'] },
  { code: 'norway', label: 'Norway', flag: '🇳🇴', region: 'europe', exchanges: ['OSL'] },
  { code: 'denmark', label: 'Denmark', flag: '🇩🇰', region: 'europe', exchanges: ['CPH'] },
  { code: 'finland', label: 'Finland', flag: '🇫🇮', region: 'europe', exchanges: ['HEL'] },
  { code: 'poland', label: 'Poland', flag: '🇵🇱', region: 'europe', exchanges: ['WSE'] },
  { code: 'russia', label: 'Russia', flag: '🇷🇺', region: 'europe', exchanges: ['MOEX'] },
  { code: 'austria', label: 'Austria', flag: '🇦🇹', region: 'europe', exchanges: ['VIE'] },
  { code: 'portugal', label: 'Portugal', flag: '🇵🇹', region: 'europe', exchanges: ['ELI'] },
  { code: 'greece', label: 'Greece', flag: '🇬🇷', region: 'europe', exchanges: ['ATHEX'] },
  { code: 'ireland', label: 'Ireland', flag: '🇮🇪', region: 'europe', exchanges: ['ISE'] },
  { code: 'iceland', label: 'Iceland', flag: '🇮🇸', region: 'europe', exchanges: ['ICE'] },
  { code: 'hungary', label: 'Hungary', flag: '🇭🇺', region: 'europe', exchanges: ['BUD'] },
  { code: 'czech', label: 'Czech Republic', flag: '🇨🇿', region: 'europe', exchanges: ['PSE'] },
  { code: 'romania', label: 'Romania', flag: '🇷🇴', region: 'europe', exchanges: ['BVB'] },

  // Asia
  { code: 'japan', label: 'Japan', flag: '🇯🇵', region: 'asia', exchanges: ['TSE', 'JPX'] },
  { code: 'china', label: 'China', flag: '🇨🇳', region: 'asia', exchanges: ['SSE', 'SZSE'] },
  { code: 'hongkong', label: 'Hong Kong', flag: '🇭🇰', region: 'asia', exchanges: ['HKEX'] },
  { code: 'india', label: 'India', flag: '🇮🇳', region: 'asia', exchanges: ['NSE', 'BSE'] },
  { code: 'korea', label: 'South Korea', flag: '🇰🇷', region: 'asia', exchanges: ['KRX'] },
  { code: 'taiwan', label: 'Taiwan', flag: '🇹🇼', region: 'asia', exchanges: ['TWSE'] },
  { code: 'singapore', label: 'Singapore', flag: '🇸🇬', region: 'asia', exchanges: ['SGX'] },
  { code: 'thailand', label: 'Thailand', flag: '🇹🇭', region: 'asia', exchanges: ['SET'] },
  { code: 'malaysia', label: 'Malaysia', flag: '🇲🇾', region: 'asia', exchanges: ['KLSE'] },
  { code: 'indonesia', label: 'Indonesia', flag: '🇮🇩', region: 'asia', exchanges: ['IDX'] },
  { code: 'philippines', label: 'Philippines', flag: '🇵🇭', region: 'asia', exchanges: ['PSE'] },
  { code: 'vietnam', label: 'Vietnam', flag: '🇻🇳', region: 'asia', exchanges: ['HOSE'] },
  { code: 'pakistan', label: 'Pakistan', flag: '🇵🇰', region: 'asia', exchanges: ['KSE'] },
  { code: 'bangladesh', label: 'Bangladesh', flag: '🇧🇩', region: 'asia', exchanges: ['DSE'] },
  { code: 'srilanka', label: 'Sri Lanka', flag: '🇱🇰', region: 'asia', exchanges: ['CSE'] },

  // Oceania
  { code: 'australia', label: 'Australia', flag: '🇦🇺', region: 'oceania', exchanges: ['ASX'] },
  { code: 'newzealand', label: 'New Zealand', flag: '🇳🇿', region: 'oceania', exchanges: ['NZX'] },

  // Latin America
  { code: 'brazil', label: 'Brazil', flag: '🇧🇷', region: 'latin_america', exchanges: ['B3'] },
  { code: 'argentina', label: 'Argentina', flag: '🇦🇷', region: 'latin_america', exchanges: ['BCBA'] },
  { code: 'chile', label: 'Chile', flag: '🇨🇱', region: 'latin_america', exchanges: ['SSE'] },
  { code: 'colombia', label: 'Colombia', flag: '🇨🇴', region: 'latin_america', exchanges: ['BVC'] },
  { code: 'peru', label: 'Peru', flag: '🇵🇪', region: 'latin_america', exchanges: ['BVL'] },

  // Middle East & Africa
  { code: 'israel', label: 'Israel', flag: '🇮🇱', region: 'middle_east', exchanges: ['TASE'] },
  { code: 'turkey', label: 'Turkey', flag: '🇹🇷', region: 'middle_east', exchanges: ['BIST'] },
  { code: 'saudi', label: 'Saudi Arabia', flag: '🇸🇦', region: 'middle_east', exchanges: ['Tadawul'] },
  { code: 'uae', label: 'UAE', flag: '🇦🇪', region: 'middle_east', exchanges: ['DFM', 'ADX'] },
  { code: 'qatar', label: 'Qatar', flag: '🇶🇦', region: 'middle_east', exchanges: ['QSE'] },
  { code: 'kuwait', label: 'Kuwait', flag: '🇰🇼', region: 'middle_east', exchanges: ['BK'] },
  { code: 'bahrain', label: 'Bahrain', flag: '🇧🇭', region: 'middle_east', exchanges: ['BSE'] },
  { code: 'egypt', label: 'Egypt', flag: '🇪🇬', region: 'middle_east', exchanges: ['EGX'] },
  { code: 'southafrica', label: 'South Africa', flag: '🇿🇦', region: 'middle_east', exchanges: ['JSE'] },
  { code: 'nigeria', label: 'Nigeria', flag: '🇳🇬', region: 'middle_east', exchanges: ['NSE'] },
  { code: 'kenya', label: 'Kenya', flag: '🇰🇪', region: 'middle_east', exchanges: ['NSE'] },
];

export const CRYPTO_EXCHANGES: CryptoExchange[] = [
  { code: 'BINANCE', label: 'Binance', icon: '🟡' },
  { code: 'COINBASE', label: 'Coinbase', icon: '🔵' },
  { code: 'KRAKEN', label: 'Kraken', icon: '🟣' },
  { code: 'BYBIT', label: 'Bybit', icon: '🟠' },
  { code: 'OKX', label: 'OKX', icon: '⚫' },
  { code: 'KUCOIN', label: 'KuCoin', icon: '🟢' },
  { code: 'HUOBI', label: 'Huobi', icon: '🔴' },
  { code: 'GATE', label: 'Gate.io', icon: '🟤' },
  { code: 'BITFINEX', label: 'Bitfinex', icon: '🟢' },
  { code: 'BITSTAMP', label: 'Bitstamp', icon: '🔵' },
  { code: 'MEXC', label: 'MEXC', icon: '🔷' },
  { code: 'BITGET', label: 'Bitget', icon: '🔶' },
];

export function getMarketsByRegion(): Record<MarketRegion, MarketInfo[]> {
  const regions = {} as Record<MarketRegion, MarketInfo[]>;
  STOCK_MARKETS.forEach(market => {
    if (!regions[market.region]) regions[market.region] = [];
    regions[market.region].push(market);
  });
  return regions;
}

export function getAllMarketCodes(): string[] {
  return STOCK_MARKETS.map(m => m.code);
}

export function getMarketByCode(code: string): MarketInfo | undefined {
  return STOCK_MARKETS.find(m => m.code === code);
}
