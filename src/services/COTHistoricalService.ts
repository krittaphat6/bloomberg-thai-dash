// COT Historical Data Service - Fetch 5 years of data from CFTC

export interface COTHistoricalData {
  date: string;
  asset: string;
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialNet: number;
  nonReportableLong: number;
  nonReportableShort: number;
  nonReportableNet: number;
  openInterest: number;
  change: number;
}

export class COTHistoricalService {
  private static readonly CFTC_API = 'https://publicreporting.cftc.gov/resource/';
  private static cache: Map<string, { data: COTHistoricalData[], timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch Historical 5 years
  static async fetchHistoricalData(
    asset: string,
    startDate: Date,
    endDate: Date
  ): Promise<COTHistoricalData[]> {
    const cacheKey = `${asset}-${startDate.toISOString()}-${endDate.toISOString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const start = this.formatDate(startDate);
      const end = this.formatDate(endDate);

      // Futures Only Report (jun7-fc8e)
      const response = await fetch(
        `${this.CFTC_API}jun7-fc8e.json?` +
        `$where=market_and_exchange_names like '%25${encodeURIComponent(asset)}%25' AND ` +
        `report_date_as_yyyy_mm_dd between '${start}' and '${end}'&` +
        `$order=report_date_as_yyyy_mm_dd ASC&` +
        `$limit=1000`
      );

      if (!response.ok) throw new Error('CFTC API error');

      const data = await response.json();

      const result = data.map((item: any) => ({
        date: item.report_date_as_yyyy_mm_dd,
        asset: item.market_and_exchange_names,
        commercialLong: parseInt(item.comm_positions_long_all || 0),
        commercialShort: parseInt(item.comm_positions_short_all || 0),
        commercialNet: parseInt(item.comm_positions_long_all || 0) - parseInt(item.comm_positions_short_all || 0),
        nonCommercialLong: parseInt(item.noncomm_positions_long_all || 0),
        nonCommercialShort: parseInt(item.noncomm_positions_short_all || 0),
        nonCommercialNet: parseInt(item.noncomm_positions_long_all || 0) - parseInt(item.noncomm_positions_short_all || 0),
        nonReportableLong: parseInt(item.nonrept_positions_long_all || 0),
        nonReportableShort: parseInt(item.nonrept_positions_short_all || 0),
        nonReportableNet: parseInt(item.nonrept_positions_long_all || 0) - parseInt(item.nonrept_positions_short_all || 0),
        openInterest: parseInt(item.open_interest_all || 0),
        change: parseFloat(item.change_in_open_interest_all || 0)
      }));

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Historical fetch error:', error);
      return this.getMockHistoricalData(asset, startDate, endDate);
    }
  }

  // Get available assets list
  static async getAvailableAssets(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.CFTC_API}jun7-fc8e.json?$select=market_and_exchange_names&$group=market_and_exchange_names&$limit=200`
      );

      if (!response.ok) throw new Error('CFTC API error');
      
      const data = await response.json();
      return data.map((item: any) => item.market_and_exchange_names).filter(Boolean);
    } catch (error) {
      console.error('Assets fetch error:', error);
      return this.getDefaultAssets();
    }
  }

  static getDefaultAssets(): string[] {
    return [
      'GOLD - COMMODITY EXCHANGE INC.',
      'SILVER - COMMODITY EXCHANGE INC.',
      'COPPER-GRADE #1 - COMMODITY EXCHANGE INC.',
      'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE',
      'NATURAL GAS - NEW YORK MERCANTILE EXCHANGE',
      'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE',
      'E-MINI NASDAQ-100 - CHICAGO MERCANTILE EXCHANGE',
      'EURO FX - CHICAGO MERCANTILE EXCHANGE',
      'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
      'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
      'SWISS FRANC - CHICAGO MERCANTILE EXCHANGE',
      'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
      'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
      'U.S. DOLLAR INDEX - ICE FUTURES U.S.',
      'BITCOIN - CHICAGO MERCANTILE EXCHANGE',
      'VIX FUTURES - CBOE FUTURES EXCHANGE'
    ];
  }

  // Calculate COT Index (0-100 scale)
  static calculateCOTIndex(historicalData: COTHistoricalData[]): number {
    if (historicalData.length === 0) return 50;

    const latest = historicalData[historicalData.length - 1];
    const netPosition = latest.nonCommercialNet;

    const nets = historicalData.map(d => d.nonCommercialNet);
    const min = Math.min(...nets);
    const max = Math.max(...nets);

    if (max === min) return 50;
    return ((netPosition - min) / (max - min)) * 100;
  }

  // Export to CSV
  static exportToCSV(data: COTHistoricalData[]): string {
    const headers = [
      'Date', 'Asset', 'Comm Long', 'Comm Short', 'Comm Net',
      'Large Long', 'Large Short', 'Large Net', 'Small Long',
      'Small Short', 'Small Net', 'Open Interest', 'Change'
    ].join(',');

    const rows = data.map(d => [
      d.date, `"${d.asset}"`, d.commercialLong, d.commercialShort, d.commercialNet,
      d.nonCommercialLong, d.nonCommercialShort, d.nonCommercialNet,
      d.nonReportableLong, d.nonReportableShort, d.nonReportableNet,
      d.openInterest, d.change
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private static getMockHistoricalData(asset: string, startDate: Date, endDate: Date): COTHistoricalData[] {
    const data: COTHistoricalData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (currentDate.getDay() === 2) { // Tuesday reports
        const weekNum = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const trend = Math.sin(weekNum * 0.1) * 50000;
        
        data.push({
          date: this.formatDate(currentDate),
          asset,
          commercialLong: 150000 + Math.floor(Math.random() * 50000) + Math.floor(trend),
          commercialShort: 180000 + Math.floor(Math.random() * 50000) - Math.floor(trend * 0.5),
          commercialNet: -30000 + Math.floor(trend * 0.5),
          nonCommercialLong: 200000 + Math.floor(Math.random() * 80000) - Math.floor(trend * 0.3),
          nonCommercialShort: 120000 + Math.floor(Math.random() * 60000) + Math.floor(trend * 0.5),
          nonCommercialNet: 80000 + Math.floor(trend),
          nonReportableLong: 30000 + Math.floor(Math.random() * 10000),
          nonReportableShort: 25000 + Math.floor(Math.random() * 8000),
          nonReportableNet: 5000 + Math.floor(Math.random() * 5000),
          openInterest: 400000 + Math.floor(Math.random() * 100000),
          change: Math.floor(Math.random() * 10000) - 5000
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }
}

export const cotHistoricalService = new COTHistoricalService();
