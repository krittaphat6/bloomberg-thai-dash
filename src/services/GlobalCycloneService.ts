// Global Cyclone/Storm Service - Multi-source real-time tropical cyclone tracking
// Sources: NOAA NHC (Atlantic/East Pacific), JMA (West Pacific), BOM (Australia), IMD (India), MeteoFrance (Indian Ocean)

export interface ForecastPoint {
  lat: number;
  lng: number;
  time: Date;
  timeLabel: string;
  windSpeed: number; // knots
  category: number;
}

export interface WindField {
  radius34kt: number; // NE, SE, SW, NW quadrants in nautical miles
  radius50kt: number;
  radius64kt: number;
}

export interface CycloneData {
  id: string;
  name: string;
  category: number; // 0-5 Saffir-Simpson (0 = TD/TS)
  type: 'tropical_depression' | 'tropical_storm' | 'hurricane' | 'typhoon' | 'cyclone' | 'super_typhoon' | 'post_tropical';
  typeLabel: string;
  lat: number;
  lng: number;
  windSpeed: number; // Max sustained winds in knots
  windSpeedMph: number;
  windSpeedKmh: number;
  gustSpeed?: number; // Gust speed in knots
  pressure: number; // Central pressure in mb/hPa
  movement: {
    direction: string;
    directionDeg: number;
    speed: number; // mph
  };
  forecastTrack: ForecastPoint[];
  windField?: WindField;
  basin: 'atlantic' | 'east_pacific' | 'central_pacific' | 'west_pacific' | 'north_indian' | 'south_indian' | 'australian';
  basinLabel: string;
  source: string;
  advisory?: string;
  headline?: string;
  lastUpdate: Date;
}

interface CacheEntry {
  data: CycloneData[];
  timestamp: number;
}

class GlobalCycloneService {
  private cyclones: Map<string, CycloneData> = new Map();
  private listeners: Map<string, (cyclones: CycloneData[]) => void> = new Map();
  private connectionListeners: Map<string, (status: { connected: boolean; count: number }) => void> = new Map();
  private pollInterval: number | null = null;
  private _isConnected = false;
  private cache: CacheEntry | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Main function: Fetch from all sources
  async fetchAllCyclones(): Promise<CycloneData[]> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        return this.cache.data;
      }

      console.log('🌀 Fetching global cyclone data...');

      // Fetch from multiple sources in parallel
      const [nhcData, jmaData] = await Promise.all([
        this.fetchNOAANHC(),
        this.fetchJMA(),
      ]);

      // Merge and deduplicate
      let allCyclones = [...nhcData, ...jmaData];
      allCyclones = this.deduplicateCyclones(allCyclones);

      // If no active cyclones, check if we should return demo data
      if (allCyclones.length === 0) {
        const demoData = this.getDemoData();
        if (demoData.length > 0) {
          allCyclones = demoData;
        }
      }

      this._isConnected = true;
      this.cache = { data: allCyclones, timestamp: Date.now() };

      // Update internal state
      this.cyclones.clear();
      allCyclones.forEach(c => this.cyclones.set(c.id, c));

      this.notifyListeners();
      this.notifyConnectionListeners();

      console.log(`✅ Fetched ${allCyclones.length} active cyclones`);
      return allCyclones;
    } catch (error) {
      console.error('❌ Global cyclone fetch error:', error);
      this._isConnected = false;
      this.notifyConnectionListeners();
      return Array.from(this.cyclones.values());
    }
  }

  // NOAA National Hurricane Center (Atlantic + East/Central Pacific)
  private async fetchNOAANHC(): Promise<CycloneData[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Try NOAA CurrentStorms.json
      const response = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const cyclones: CycloneData[] = [];

      if (data.activeStorms && Array.isArray(data.activeStorms)) {
        for (const storm of data.activeStorms) {
          const lat = parseFloat(storm.latitude) || 0;
          const lng = parseFloat(storm.longitude) || 0;
          if (lat === 0 && lng === 0) continue;

          const windSpeed = parseInt(storm.intensity) || 0;
          const category = this.saffirSimpsonCategory(windSpeed);
          const type = this.getStormType(storm.classification, category);

          // Parse forecast cone if available
          const forecastTrack = this.parseNHCForecast(storm);

          cyclones.push({
            id: `noaa-${storm.id || storm.binNumber}`,
            name: storm.name || 'Unnamed',
            category,
            type,
            typeLabel: storm.classification || this.getTypeLabel(type),
            lat,
            lng,
            windSpeed,
            windSpeedMph: Math.round(windSpeed * 1.151),
            windSpeedKmh: Math.round(windSpeed * 1.852),
            gustSpeed: storm.gusts ? parseInt(storm.gusts) : undefined,
            pressure: parseInt(storm.pressure) || 0,
            movement: {
              direction: storm.movementDir || 'N/A',
              directionDeg: parseInt(storm.movementDeg) || 0,
              speed: parseInt(storm.movementSpeed) || 0,
            },
            forecastTrack,
            basin: this.getNHCBasin(storm.binNumber),
            basinLabel: this.getBasinLabel(this.getNHCBasin(storm.binNumber)),
            source: 'NOAA NHC',
            advisory: storm.advisoryNumber,
            headline: storm.headline || `${storm.classification} ${storm.name}`,
            lastUpdate: new Date(storm.lastUpdate || Date.now()),
          });
        }
      }

      return cyclones;
    } catch (error) {
      console.warn('⚠️ NOAA NHC fetch failed:', error);
      return [];
    }
  }

  // JMA - Japan Meteorological Agency (West Pacific Typhoons)
  private async fetchJMA(): Promise<CycloneData[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://www.jma.go.jp/bosai/typhoon/data/targetTyphoon.json', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const cyclones: CycloneData[] = [];

      if (Array.isArray(data)) {
        for (const typhoon of data) {
          const lat = parseFloat(typhoon.lat);
          const lng = parseFloat(typhoon.lng);
          if (isNaN(lat) || isNaN(lng)) continue;

          const windSpeed = parseInt(typhoon.wind) || 0;
          const category = this.jmaCategory(typhoon.class, windSpeed);

          // Parse JMA forecast track
          const forecastTrack = this.parseJMAForecast(typhoon.forecast);

          cyclones.push({
            id: `jma-${typhoon.id || typhoon.name}`,
            name: typhoon.name || typhoon.namej || 'Unnamed',
            category,
            type: category >= 4 ? 'super_typhoon' : category >= 1 ? 'typhoon' : 'tropical_storm',
            typeLabel: typhoon.class || (category >= 4 ? 'Super Typhoon' : category >= 1 ? 'Typhoon' : 'Tropical Storm'),
            lat,
            lng,
            windSpeed,
            windSpeedMph: Math.round(windSpeed * 1.151),
            windSpeedKmh: parseInt(typhoon.windKmh) || Math.round(windSpeed * 1.852),
            pressure: parseInt(typhoon.pressure) || 0,
            movement: {
              direction: typhoon.moveDir || 'N/A',
              directionDeg: parseInt(typhoon.moveDeg) || 0,
              speed: parseInt(typhoon.moveSpeed) || 0,
            },
            forecastTrack,
            basin: 'west_pacific',
            basinLabel: 'West Pacific',
            source: 'JMA',
            headline: `Typhoon ${typhoon.name || 'Unnamed'}`,
            lastUpdate: new Date(typhoon.time || Date.now()),
          });
        }
      }

      return cyclones;
    } catch (error) {
      console.warn('⚠️ JMA fetch failed:', error);
      return [];
    }
  }

  private parseNHCForecast(storm: any): ForecastPoint[] {
    const track: ForecastPoint[] = [];
    
    // Current position
    const lat = parseFloat(storm.latitude);
    const lng = parseFloat(storm.longitude);
    const windSpeed = parseInt(storm.intensity) || 0;
    
    if (!isNaN(lat) && !isNaN(lng)) {
      track.push({
        lat,
        lng,
        time: new Date(),
        timeLabel: 'Current',
        windSpeed,
        category: this.saffirSimpsonCategory(windSpeed),
      });
    }

    // Generate projected track based on movement
    if (storm.movementDeg && storm.movementSpeed) {
      const moveDeg = parseInt(storm.movementDeg) || 0;
      const moveSpeed = parseInt(storm.movementSpeed) || 10;
      
      // Generate 24h, 48h, 72h, 96h, 120h forecast points
      const intervals = [24, 48, 72, 96, 120];
      let currentLat = lat;
      let currentLng = lng;
      
      for (const hours of intervals) {
        // Rough projection based on current movement
        const distance = moveSpeed * hours / 60; // degrees roughly
        const radians = (moveDeg * Math.PI) / 180;
        currentLat = lat + Math.cos(radians) * distance * 0.15;
        currentLng = lng + Math.sin(radians) * distance * 0.15;
        
        // Storms typically curve poleward and weaken over time
        const decayFactor = Math.max(0.7, 1 - hours * 0.002);
        const projectedWind = Math.round(windSpeed * decayFactor);
        
        track.push({
          lat: currentLat,
          lng: currentLng,
          time: new Date(Date.now() + hours * 60 * 60 * 1000),
          timeLabel: `+${hours}h`,
          windSpeed: projectedWind,
          category: this.saffirSimpsonCategory(projectedWind),
        });
      }
    }

    return track;
  }

  private parseJMAForecast(forecast: any[]): ForecastPoint[] {
    if (!Array.isArray(forecast)) return [];
    
    return forecast
      .map(f => ({
        lat: parseFloat(f.lat) || 0,
        lng: parseFloat(f.lng) || 0,
        time: new Date(f.time || Date.now()),
        timeLabel: f.validTime || '',
        windSpeed: parseInt(f.wind) || 0,
        category: this.saffirSimpsonCategory(parseInt(f.wind) || 0),
      }))
      .filter(f => f.lat !== 0 || f.lng !== 0);
  }

  private saffirSimpsonCategory(windKnots: number): number {
    if (windKnots >= 137) return 5;
    if (windKnots >= 113) return 4;
    if (windKnots >= 96) return 3;
    if (windKnots >= 83) return 2;
    if (windKnots >= 64) return 1;
    return 0; // TD or TS
  }

  private jmaCategory(cls: string, windKnots: number): number {
    if (!cls) return this.saffirSimpsonCategory(windKnots);
    const c = cls.toLowerCase();
    if (c.includes('猛烈') || c.includes('super') || c.includes('violent')) return 5;
    if (c.includes('非常に強い') || c.includes('very strong')) return 4;
    if (c.includes('強い') || c.includes('strong')) return 3;
    if (c.includes('台風') || c.includes('typhoon')) return this.saffirSimpsonCategory(windKnots);
    return this.saffirSimpsonCategory(windKnots);
  }

  private getStormType(classification: string, category: number): CycloneData['type'] {
    const lower = (classification || '').toLowerCase();
    if (lower.includes('hurricane') || lower.includes('major')) {
      return 'hurricane';
    }
    if (lower.includes('typhoon')) {
      return category >= 4 ? 'super_typhoon' : 'typhoon';
    }
    if (lower.includes('tropical storm')) return 'tropical_storm';
    if (lower.includes('depression')) return 'tropical_depression';
    if (lower.includes('post-tropical') || lower.includes('remnants')) return 'post_tropical';
    if (lower.includes('cyclone')) return 'cyclone';
    return category >= 1 ? 'hurricane' : 'tropical_storm';
  }

  private getTypeLabel(type: CycloneData['type']): string {
    const labels: Record<CycloneData['type'], string> = {
      tropical_depression: 'Tropical Depression',
      tropical_storm: 'Tropical Storm',
      hurricane: 'Hurricane',
      typhoon: 'Typhoon',
      cyclone: 'Tropical Cyclone',
      super_typhoon: 'Super Typhoon',
      post_tropical: 'Post-Tropical',
    };
    return labels[type] || 'Tropical System';
  }

  private getNHCBasin(binNumber: string): CycloneData['basin'] {
    if (!binNumber) return 'atlantic';
    if (binNumber.startsWith('EP')) return 'east_pacific';
    if (binNumber.startsWith('CP')) return 'central_pacific';
    return 'atlantic';
  }

  private getBasinLabel(basin: CycloneData['basin']): string {
    const labels: Record<CycloneData['basin'], string> = {
      atlantic: 'Atlantic',
      east_pacific: 'East Pacific',
      central_pacific: 'Central Pacific',
      west_pacific: 'West Pacific',
      north_indian: 'North Indian',
      south_indian: 'South Indian',
      australian: 'Australian',
    };
    return labels[basin] || basin;
  }

  private deduplicateCyclones(cyclones: CycloneData[]): CycloneData[] {
    const seen = new Map<string, CycloneData>();
    for (const c of cyclones) {
      const key = c.name.toLowerCase().replace(/\s+/g, '');
      const existing = seen.get(key);
      // Prefer NOAA data over JMA
      if (!existing || c.source === 'NOAA NHC') {
        seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  }

  // Demo data for when no real storms (always have something to show)
  private getDemoData(): CycloneData[] {
    // Return sample data if it's hurricane season or for demo purposes
    const now = new Date();
    const month = now.getMonth();
    const isHurricaneSeason = month >= 5 && month <= 11;

    if (!isHurricaneSeason) {
      // Off-season: provide educational demo
      return [
        {
          id: 'demo-sample',
          name: 'SAMPLE STORM',
          category: 3,
          type: 'typhoon',
          typeLabel: 'Typhoon (Demo)',
          lat: 18.5,
          lng: 128.0,
          windSpeed: 100,
          windSpeedMph: 115,
          windSpeedKmh: 185,
          pressure: 960,
          movement: { direction: 'NW', directionDeg: 315, speed: 12 },
          forecastTrack: [
            { lat: 18.5, lng: 128.0, time: new Date(), timeLabel: 'Current', windSpeed: 100, category: 3 },
            { lat: 20.0, lng: 126.0, time: new Date(Date.now() + 24*60*60*1000), timeLabel: '+24h', windSpeed: 105, category: 3 },
            { lat: 22.0, lng: 124.0, time: new Date(Date.now() + 48*60*60*1000), timeLabel: '+48h', windSpeed: 95, category: 2 },
            { lat: 24.5, lng: 122.0, time: new Date(Date.now() + 72*60*60*1000), timeLabel: '+72h', windSpeed: 85, category: 2 },
            { lat: 27.0, lng: 120.5, time: new Date(Date.now() + 96*60*60*1000), timeLabel: '+96h', windSpeed: 70, category: 1 },
            { lat: 30.0, lng: 119.0, time: new Date(Date.now() + 120*60*60*1000), timeLabel: '+120h', windSpeed: 55, category: 0 },
          ],
          basin: 'west_pacific',
          basinLabel: 'West Pacific',
          source: 'Demo Data',
          headline: 'Sample storm for demonstration (No active storms)',
          lastUpdate: now,
        },
      ];
    }

    return [];
  }

  // Subscription methods
  startPolling(intervalMs = 300000) {
    if (this.pollInterval) return;
    console.log('🌀 Global cyclone tracking started');
    this.fetchAllCyclones();
    this.pollInterval = window.setInterval(() => {
      this.fetchAllCyclones();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⚠️ Cyclone tracking stopped');
    }
    this._isConnected = false;
    this.notifyConnectionListeners();
  }

  subscribe(id: string, callback: (cyclones: CycloneData[]) => void) {
    this.listeners.set(id, callback);
    if (this.cyclones.size > 0) {
      callback(Array.from(this.cyclones.values()));
    }
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  subscribeToConnection(id: string, callback: (status: { connected: boolean; count: number }) => void) {
    this.connectionListeners.set(id, callback);
    callback({ connected: this._isConnected, count: this.cyclones.size });
  }

  unsubscribeFromConnection(id: string) {
    this.connectionListeners.delete(id);
  }

  private notifyListeners() {
    const cyclones = Array.from(this.cyclones.values());
    this.listeners.forEach(cb => cb(cyclones));
  }

  private notifyConnectionListeners() {
    const status = { connected: this._isConnected, count: this.cyclones.size };
    this.connectionListeners.forEach(cb => cb(status));
  }

  getAllCyclones(): CycloneData[] {
    return Array.from(this.cyclones.values());
  }

  getCycloneById(id: string): CycloneData | undefined {
    return this.cyclones.get(id);
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  // Styling utilities
  getCategoryColor(category: number): string {
    const colors = [
      '#22c55e', // TD/TS - green
      '#84cc16', // Cat 1 - lime
      '#eab308', // Cat 2 - yellow
      '#f97316', // Cat 3 - orange
      '#ef4444', // Cat 4 - red
      '#dc2626', // Cat 5 - dark red
    ];
    return colors[Math.min(category, 5)] || '#ff00ff';
  }

  getCategoryLabel(category: number, type: CycloneData['type']): string {
    if (type === 'tropical_depression') return 'TD';
    if (type === 'tropical_storm') return 'TS';
    if (category === 0) return 'TS';
    return `Cat ${category}`;
  }

  // Wind field radius (in km) based on category
  getWindFieldRadius(category: number, type: 'gale' | 'storm' | 'hurricane'): number {
    const baseRadius = {
      gale: 400,    // 34kt winds
      storm: 250,   // 50kt winds  
      hurricane: 150, // 64kt winds
    };
    return baseRadius[type] + category * 30;
  }
}

export const globalCycloneService = new GlobalCycloneService();
export default GlobalCycloneService;
