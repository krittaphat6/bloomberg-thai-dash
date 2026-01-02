// CycloneService.ts - ดึงข้อมูลพายุจาก NOAA และ JMA (ฟรี ไม่ต้อง API key)

export interface CycloneData {
  id: string;
  name: string;
  category: number;
  type: string;
  coordinates: [number, number];
  windSpeed: number;
  windSpeedKmh: number;
  pressure: number;
  movement: { direction: string; speed: number };
  forecastTrack: Array<{ lat: number; lng: number; time: string; windSpeed: number }>;
  lastUpdate: string;
  basin: string;
  advisory?: string;
  source: string;
}

// NOAA NHC API - Atlantic & East Pacific (ฟรี)
const NHC_API = 'https://www.nhc.noaa.gov/CurrentStorms.json';

// JMA - Japan Meteorological Agency (West Pacific)
const JMA_URL = 'https://www.jma.go.jp/bosai/typhoon/data/targetTyphoon.json';

export class CycloneService {
  private static cache: { data: CycloneData[]; timestamp: number } | null = null;
  private static CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // ดึงข้อมูลจาก NOAA NHC (Atlantic + East Pacific)
  static async fetchNOAAStorms(): Promise<CycloneData[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(NHC_API, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('NOAA API error');
      
      const data = await response.json();
      const storms: CycloneData[] = [];
      
      if (data.activeStorms && Array.isArray(data.activeStorms)) {
        for (const storm of data.activeStorms) {
          const lat = parseFloat(storm.latitude) || 0;
          const lng = parseFloat(storm.longitude) || 0;
          
          if (lat === 0 && lng === 0) continue;
          
          storms.push({
            id: `noaa-${storm.id || storm.binNumber || Math.random()}`,
            name: storm.name || 'Unnamed',
            category: this.parseCategory(storm.classification),
            type: storm.classification || 'Tropical Storm',
            coordinates: [lng, lat],
            windSpeed: parseInt(storm.intensity) || 0,
            windSpeedKmh: Math.round((parseInt(storm.intensity) || 0) * 1.852),
            pressure: parseInt(storm.pressure) || 0,
            movement: {
              direction: storm.movementDir || 'N/A',
              speed: parseInt(storm.movementSpeed) || 0
            },
            forecastTrack: [],
            lastUpdate: storm.lastUpdate || new Date().toISOString(),
            basin: storm.basin === 'AT' ? 'Atlantic' : 'East Pacific',
            advisory: storm.publicAdvisory?.url,
            source: 'NOAA NHC'
          });
        }
      }
      
      return storms;
    } catch (error) {
      console.warn('NOAA fetch error:', error);
      return [];
    }
  }

  // ดึงข้อมูลจาก JMA (Japan - West Pacific)
  static async fetchJMAStorms(): Promise<CycloneData[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(JMA_URL, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const storms: CycloneData[] = [];
      
      if (Array.isArray(data)) {
        for (const typhoon of data) {
          const lat = parseFloat(typhoon.lat);
          const lng = parseFloat(typhoon.lng);
          
          if (isNaN(lat) || isNaN(lng)) continue;
          
          storms.push({
            id: `jma-${typhoon.id || typhoon.name || Math.random()}`,
            name: typhoon.name || typhoon.namej || 'Unnamed',
            category: this.parseJMACategory(typhoon.class),
            type: typhoon.class || 'Typhoon',
            coordinates: [lng, lat],
            windSpeed: parseInt(typhoon.wind) || 0,
            windSpeedKmh: parseInt(typhoon.windKmh) || Math.round((parseInt(typhoon.wind) || 0) * 1.852),
            pressure: parseInt(typhoon.pressure) || 0,
            movement: {
              direction: typhoon.moveDir || 'N/A',
              speed: parseInt(typhoon.moveSpeed) || 0
            },
            forecastTrack: this.parseJMAForecast(typhoon.forecast),
            lastUpdate: typhoon.time || new Date().toISOString(),
            basin: 'West Pacific',
            source: 'JMA'
          });
        }
      }
      
      return storms;
    } catch (error) {
      console.warn('JMA fetch error:', error);
      return [];
    }
  }

  private static parseJMAForecast(forecast: any[]): Array<{ lat: number; lng: number; time: string; windSpeed: number }> {
    if (!Array.isArray(forecast)) return [];
    return forecast.map(f => ({
      lat: parseFloat(f.lat) || 0,
      lng: parseFloat(f.lng) || 0,
      time: f.time || '',
      windSpeed: parseInt(f.wind) || 0
    })).filter(f => f.lat !== 0 || f.lng !== 0);
  }

  private static parseCategory(classification: string): number {
    if (!classification) return 1;
    const c = classification.toUpperCase();
    if (c.includes('MAJOR') || c.includes('CAT 5') || c.includes('CAT 4') || c.includes('CAT 3')) return 4;
    if (c.includes('HURRICANE') || c.includes('TYPHOON')) return 3;
    if (c.includes('TROPICAL STORM')) return 2;
    if (c.includes('DEPRESSION')) return 1;
    return 1;
  }

  private static parseJMACategory(cls: string): number {
    if (!cls) return 1;
    if (cls.includes('猛烈') || cls.includes('Super')) return 5;
    if (cls.includes('非常に強い') || cls.includes('Very Strong')) return 4;
    if (cls.includes('強い') || cls.includes('Strong')) return 3;
    if (cls.includes('台風') || cls.includes('Typhoon')) return 2;
    return 1;
  }

  // Generate mock cyclones for demo when no real storms
  private static generateMockCyclones(): CycloneData[] {
    return [
      {
        id: 'mock-1',
        name: 'DEMO STORM',
        category: 3,
        type: 'Tropical Storm (Demo)',
        coordinates: [130, 20],
        windSpeed: 85,
        windSpeedKmh: 157,
        pressure: 970,
        movement: { direction: 'NW', speed: 15 },
        forecastTrack: [
          { lat: 22, lng: 128, time: '+24h', windSpeed: 90 },
          { lat: 24, lng: 126, time: '+48h', windSpeed: 95 },
          { lat: 26, lng: 124, time: '+72h', windSpeed: 85 }
        ],
        lastUpdate: new Date().toISOString(),
        basin: 'West Pacific',
        source: 'Demo Data'
      }
    ];
  }

  // Main function: ดึงข้อมูลจากทุกแหล่ง
  static async fetchAllCyclones(): Promise<CycloneData[]> {
    // Check cache
    if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_DURATION) {
      return this.cache.data;
    }

    const [noaaStorms, jmaStorms] = await Promise.all([
      this.fetchNOAAStorms(),
      this.fetchJMAStorms()
    ]);

    // รวมข้อมูล และลบ duplicates
    let allStorms = [...noaaStorms, ...jmaStorms];
    const uniqueStorms = this.removeDuplicates(allStorms);

    // If no storms, return mock for demo
    const finalStorms = uniqueStorms.length > 0 ? uniqueStorms : this.generateMockCyclones();

    // Update cache
    this.cache = { data: finalStorms, timestamp: Date.now() };

    return finalStorms;
  }

  private static removeDuplicates(storms: CycloneData[]): CycloneData[] {
    const seen = new Map<string, CycloneData>();
    
    for (const storm of storms) {
      const key = storm.name.toLowerCase();
      if (!seen.has(key) || storm.source === 'NOAA NHC') {
        seen.set(key, storm);
      }
    }
    
    return Array.from(seen.values());
  }

  // Get category color
  static getCategoryColor(category: number): string {
    const colors = ['#ffcc00', '#ff9900', '#ff6600', '#ff3300', '#ff0000'];
    return colors[Math.min(category - 1, 4)] || '#ff00ff';
  }

  // Get danger radius in km
  static getDangerRadius(category: number): number {
    return 100000 + category * 50000; // 100-350 km radius
  }
}

export default CycloneService;
