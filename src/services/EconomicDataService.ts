// Economic Data Service - FRED API and World Bank data

export interface EconomicIndicator {
  name: string;
  last: number | string;
  previous: number | string;
  highest: number | string;
  lowest: number | string;
  unit: string;
  date: string;
  change: number;
  seriesId?: string;
}

export interface CountryEconomicData {
  country: string;
  flag: string;
  indicators: EconomicIndicator[];
}

export class EconomicDataService {
  // World Bank API (completely free, no key needed)
  private static readonly WORLD_BANK_API = 'https://api.worldbank.org/v2';
  
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Country codes for World Bank API
  private static readonly COUNTRY_CODES: Record<string, { code: string; flag: string }> = {
    'United States': { code: 'USA', flag: '🇺🇸' },
    'European Union': { code: 'EUU', flag: '🇪🇺' },
    'Japan': { code: 'JPN', flag: '🇯🇵' },
    'China': { code: 'CHN', flag: '🇨🇳' },
    'United Kingdom': { code: 'GBR', flag: '🇬🇧' },
    'Germany': { code: 'DEU', flag: '🇩🇪' },
    'France': { code: 'FRA', flag: '🇫🇷' },
    'Canada': { code: 'CAN', flag: '🇨🇦' },
    'Australia': { code: 'AUS', flag: '🇦🇺' },
    'India': { code: 'IND', flag: '🇮🇳' },
    'Thailand': { code: 'THA', flag: '🇹🇭' }
  };

  // World Bank indicator codes
  private static readonly INDICATORS: Record<string, { id: string; unit: string }> = {
    'GDP (USD Trillion)': { id: 'NY.GDP.MKTP.CD', unit: 'USD' },
    'GDP Growth Rate': { id: 'NY.GDP.MKTP.KD.ZG', unit: '%' },
    'Inflation Rate': { id: 'FP.CPI.TOTL.ZG', unit: '%' },
    'Unemployment Rate': { id: 'SL.UEM.TOTL.ZS', unit: '%' },
    'Population (Million)': { id: 'SP.POP.TOTL', unit: '' },
    'Trade Balance': { id: 'NE.RSB.GNFS.ZS', unit: '% GDP' }
  };

  // Fetch data from World Bank API
  static async fetchFromWorldBank(countryCode: string, indicator: string): Promise<any> {
    const cacheKey = `wb_${countryCode}_${indicator}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.WORLD_BANK_API}/country/${countryCode}/indicator/${indicator}?format=json&per_page=10&date=2018:2024`
      );

      if (!response.ok) throw new Error('World Bank API error');

      const data = await response.json();
      
      if (data[1] && data[1].length > 0) {
        this.cache.set(cacheKey, { data: data[1], timestamp: Date.now() });
        return data[1];
      }
      
      return null;
    } catch (error) {
      console.error(`World Bank fetch error for ${indicator}:`, error);
      return null;
    }
  }

  // Fetch key indicators for a country
  static async fetchKeyIndicators(country: string): Promise<CountryEconomicData> {
    const countryInfo = this.COUNTRY_CODES[country];
    if (!countryInfo) {
      return { country, flag: '🌍', indicators: [] };
    }

    const indicators: EconomicIndicator[] = [];

    try {
      // Fetch all indicators in parallel
      const promises = Object.entries(this.INDICATORS).map(async ([name, config]) => {
        const data = await this.fetchFromWorldBank(countryInfo.code, config.id);
        
        if (data && data.length > 0) {
          const validData = data.filter((d: any) => d.value !== null);
          
          if (validData.length > 0) {
            const latest = validData[0];
            const previous = validData.length > 1 ? validData[1] : latest;
            const allValues = validData.map((d: any) => d.value).filter((v: number) => v !== null);
            
            let value = latest.value;
            // Format GDP to trillions
            if (name.includes('GDP (USD')) {
              value = (value / 1e12).toFixed(2);
            } else if (name.includes('Population')) {
              value = (value / 1e6).toFixed(1);
            } else if (typeof value === 'number') {
              value = value.toFixed(2);
            }

            return {
              name,
              last: value,
              previous: name.includes('GDP (USD') ? (previous.value / 1e12).toFixed(2) : 
                       name.includes('Population') ? (previous.value / 1e6).toFixed(1) :
                       typeof previous.value === 'number' ? previous.value.toFixed(2) : previous.value,
              highest: Math.max(...allValues).toFixed(2),
              lowest: Math.min(...allValues).toFixed(2),
              unit: config.unit,
              date: latest.date,
              change: previous.value ? ((latest.value - previous.value) / previous.value * 100) : 0
            };
          }
        }
        return null;
      });

      const results = await Promise.all(promises);
      for (const result of results) {
        if (result !== null) {
          indicators.push(result);
        }
      }

    } catch (error) {
      console.error(`Error fetching indicators for ${country}:`, error);
    }

    // If no data, return mock data
    if (indicators.length === 0) {
      return this.getMockCountryData(country, countryInfo.flag);
    }

    return {
      country,
      flag: countryInfo.flag,
      indicators
    };
  }

  // Fetch data for all countries
  static async fetchAllCountries(): Promise<CountryEconomicData[]> {
    const countries = Object.keys(this.COUNTRY_CODES);
    
    const results = await Promise.all(
      countries.map(country => this.fetchKeyIndicators(country))
    );

    return results;
  }

  // Mock data fallback
  private static getMockCountryData(country: string, flag: string): CountryEconomicData {
    const baseData: Record<string, any> = {
      'United States': { gdp: 25.46, growth: 2.5, inflation: 3.2, unemployment: 3.7 },
      'China': { gdp: 17.96, growth: 5.2, inflation: 0.2, unemployment: 5.2 },
      'Japan': { gdp: 4.23, growth: 1.9, inflation: 3.3, unemployment: 2.6 },
      'Germany': { gdp: 4.07, growth: -0.3, inflation: 2.9, unemployment: 5.9 },
      'India': { gdp: 3.39, growth: 7.8, inflation: 5.4, unemployment: 7.1 }
    };

    const data = baseData[country] || { gdp: 1.0, growth: 2.0, inflation: 2.5, unemployment: 5.0 };

    return {
      country,
      flag,
      indicators: [
        { name: 'GDP (USD Trillion)', last: data.gdp.toFixed(2), previous: (data.gdp * 0.97).toFixed(2), highest: (data.gdp * 1.05).toFixed(2), lowest: (data.gdp * 0.85).toFixed(2), unit: 'USD', date: '2023', change: 3.0 },
        { name: 'GDP Growth Rate', last: data.growth.toFixed(1), previous: (data.growth - 0.5).toFixed(1), highest: (data.growth + 3).toFixed(1), lowest: (-5).toFixed(1), unit: '%', date: 'Q3 2024', change: 0.5 },
        { name: 'Inflation Rate', last: data.inflation.toFixed(1), previous: (data.inflation + 0.3).toFixed(1), highest: '9.1', lowest: '-0.5', unit: '%', date: 'Nov 2024', change: -0.3 },
        { name: 'Unemployment Rate', last: data.unemployment.toFixed(1), previous: (data.unemployment - 0.2).toFixed(1), highest: '14.0', lowest: '3.4', unit: '%', date: 'Nov 2024', change: 0.2 },
        { name: 'Interest Rate', last: '5.25', previous: '5.25', highest: '20.0', lowest: '0.25', unit: '%', date: 'Dec 2024', change: 0 },
        { name: 'Manufacturing PMI', last: '49.4', previous: '50.3', highest: '65.0', lowest: '35.0', unit: 'points', date: 'Nov 2024', change: -0.9 }
      ]
    };
  }
}

export const economicDataService = new EconomicDataService();
