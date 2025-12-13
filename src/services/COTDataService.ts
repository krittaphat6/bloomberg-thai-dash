// COT Data Service - Commitment of Traders Data from CFTC
export interface COTPosition {
  asset: string;
  commercialLong: number;
  commercialShort: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonReportableLong: number;
  nonReportableShort: number;
  openInterest: number;
  change: number;
  date: string;
  contractCode?: string;
}

export class COTDataService {
  private static readonly CFTC_API = 'https://publicreporting.cftc.gov/resource/';
  private static cache: COTPosition[] = [];
  private static lastFetch: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch Futures Only Report from CFTC
  static async fetchFuturesReport(): Promise<COTPosition[]> {
    // Check cache
    if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // CFTC API - Futures Only Report (Legacy Format)
      const response = await fetch(
        `${this.CFTC_API}jun7-fc8e.json?$limit=100&$order=report_date_as_yyyy_mm_dd DESC`
      );

      if (!response.ok) throw new Error('Failed to fetch COT data');

      const data = await response.json();

      const positions = data.map((item: any) => ({
        asset: this.formatAssetName(item.market_and_exchange_names || ''),
        commercialLong: parseInt(item.comm_positions_long_all || 0),
        commercialShort: parseInt(item.comm_positions_short_all || 0),
        nonCommercialLong: parseInt(item.noncomm_positions_long_all || 0),
        nonCommercialShort: parseInt(item.noncomm_positions_short_all || 0),
        nonReportableLong: parseInt(item.nonrept_positions_long_all || 0),
        nonReportableShort: parseInt(item.nonrept_positions_short_all || 0),
        openInterest: parseInt(item.open_interest_all || 0),
        change: parseFloat(item.change_in_comm_long_all || 0),
        date: item.report_date_as_yyyy_mm_dd || '',
        contractCode: item.cftc_contract_market_code
      }));

      // Deduplicate by asset (keep latest)
      const uniquePositions = this.deduplicateByAsset(positions);
      
      this.cache = uniquePositions;
      this.lastFetch = Date.now();

      return uniquePositions;
    } catch (error) {
      console.error('CFTC API error:', error);
      // Return fallback data if API fails
      return this.getMockData();
    }
  }

  // Fetch Disaggregated Report
  static async fetchDisaggregatedReport(): Promise<COTPosition[]> {
    try {
      const response = await fetch(
        `${this.CFTC_API}72hh-3qpy.json?$limit=100&$order=report_date_as_yyyy_mm_dd DESC`
      );

      if (!response.ok) throw new Error('Failed to fetch disaggregated data');

      const data = await response.json();

      return data.map((item: any) => ({
        asset: this.formatAssetName(item.market_and_exchange_names || ''),
        commercialLong: parseInt(item.prod_merc_positions_long_all || 0),
        commercialShort: parseInt(item.prod_merc_positions_short_all || 0),
        nonCommercialLong: parseInt(item.m_money_positions_long_all || 0),
        nonCommercialShort: parseInt(item.m_money_positions_short_all || 0),
        nonReportableLong: parseInt(item.other_rept_positions_long_all || 0),
        nonReportableShort: parseInt(item.other_rept_positions_short_all || 0),
        openInterest: parseInt(item.open_interest_all || 0),
        change: 0,
        date: item.report_date_as_yyyy_mm_dd || ''
      }));
    } catch (error) {
      console.error('Disaggregated COT error:', error);
      return [];
    }
  }

  // Format asset name for display
  private static formatAssetName(fullName: string): string {
    // Extract the main commodity/asset name from CFTC format
    const mappings: Record<string, string> = {
      'EURO FX': 'EUR',
      'BRITISH POUND': 'GBP',
      'JAPANESE YEN': 'JPY',
      'SWISS FRANC': 'CHF',
      'CANADIAN DOLLAR': 'CAD',
      'AUSTRALIAN DOLLAR': 'AUD',
      'NEW ZEALAND DOLLAR': 'NZD',
      'MEXICAN PESO': 'MXN',
      'GOLD': 'GOLD',
      'SILVER': 'SILVER',
      'COPPER': 'COPPER',
      'CRUDE OIL': 'CRUDE OIL',
      'NATURAL GAS': 'NATURAL GAS',
      'S&P 500': 'S&P 500',
      'E-MINI S&P': 'S&P 500',
      'NASDAQ': 'NASDAQ',
      'E-MINI NASDAQ': 'NASDAQ',
      'DOW JONES': 'DOW JONES',
      'E-MINI DOW': 'DOW JONES',
      'RUSSELL 2000': 'RUSSELL 2000',
      'WHEAT': 'WHEAT',
      'CORN': 'CORN',
      'SOYBEANS': 'SOYBEANS',
      'COTTON': 'COTTON',
      'SUGAR': 'SUGAR',
      'COFFEE': 'COFFEE',
      'COCOA': 'COCOA',
      'BITCOIN': 'BITCOIN',
      'VIX': 'VIX'
    };

    const upperName = fullName.toUpperCase();
    for (const [key, value] of Object.entries(mappings)) {
      if (upperName.includes(key)) {
        return value;
      }
    }

    // Return first part of the name if no mapping found
    return fullName.split(' - ')[0].substring(0, 15);
  }

  // Deduplicate positions by asset name
  private static deduplicateByAsset(positions: COTPosition[]): COTPosition[] {
    const seen = new Map<string, COTPosition>();
    
    for (const pos of positions) {
      if (!seen.has(pos.asset)) {
        seen.set(pos.asset, pos);
      }
    }

    return Array.from(seen.values());
  }

  // Fallback mock data
  private static getMockData(): COTPosition[] {
    const assets = [
      'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'MXN',
      'GOLD', 'SILVER', 'COPPER', 'CRUDE OIL', 'NATURAL GAS',
      'S&P 500', 'NASDAQ', 'DOW JONES', 'RUSSELL 2000',
      'WHEAT', 'CORN', 'SOYBEANS', 'COTTON', 'SUGAR'
    ];

    const today = new Date().toISOString().split('T')[0];

    return assets.map(asset => ({
      asset,
      commercialLong: Math.floor(20000 + Math.random() * 100000),
      commercialShort: Math.floor(25000 + Math.random() * 90000),
      nonCommercialLong: Math.floor(15000 + Math.random() * 80000),
      nonCommercialShort: Math.floor(18000 + Math.random() * 75000),
      nonReportableLong: Math.floor(5000 + Math.random() * 20000),
      nonReportableShort: Math.floor(5500 + Math.random() * 18000),
      openInterest: Math.floor(100000 + Math.random() * 500000),
      change: -15 + Math.random() * 30,
      date: today
    }));
  }
}

export const cotDataService = new COTDataService();
