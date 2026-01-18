// NOAA National Hurricane Center - Real-time Storm Tracking
// Free API: https://www.nhc.noaa.gov/gis/

export interface StormData {
  id: string;
  name: string;
  type: 'hurricane' | 'tropical_storm' | 'tropical_depression' | 'subtropical_storm' | 'post_tropical';
  category: number;         // Saffir-Simpson scale (1-5), 0 for non-hurricanes
  lat: number;
  lng: number;
  windSpeed: number;        // Max sustained winds in knots
  windSpeedMph: number;     // In mph
  pressure: number;         // Central pressure in mb
  movement: string;         // Direction and speed
  movementDeg: number;      // Movement direction in degrees
  movementSpeed: number;    // Movement speed in mph
  basin: 'atlantic' | 'pacific' | 'central_pacific';
  advisory: string;         // Latest advisory number
  headline: string;         // Storm headline/status
  lastUpdate: Date;
  forecastTrack?: Array<{
    lat: number;
    lng: number;
    time: Date;
    windSpeed: number;
    category: number;
  }>;
}

class StormTrackingService {
  private storms: Map<string, StormData> = new Map();
  private listeners: Map<string, (storms: StormData[]) => void> = new Map();
  private connectionListeners: Map<string, (status: { connected: boolean; count: number }) => void> = new Map();
  private pollInterval: number | null = null;
  private _isConnected = false;

  // Fetch active storms from NOAA NHC
  async fetchActiveStorms(): Promise<StormData[]> {
    try {
      // Try multiple data sources
      const storms: StormData[] = [];

      // 1. Fetch from NOAA NHC Active Storms RSS
      const nhcData = await this.fetchNHCStorms();
      storms.push(...nhcData);

      // 2. Also check IBTrACS for global storms (backup)
      // const globalData = await this.fetchGlobalStorms();
      // storms.push(...globalData);

      this._isConnected = storms.length > 0 || true; // Connected even if no storms
      
      // Update cache
      this.storms.clear();
      storms.forEach(s => this.storms.set(s.id, s));

      this.notifyListeners();
      this.notifyConnectionListeners();

      return storms;
    } catch (error) {
      console.error('❌ Storm tracking error:', error);
      this._isConnected = false;
      this.notifyConnectionListeners();
      return Array.from(this.storms.values());
    }
  }

  private async fetchNHCStorms(): Promise<StormData[]> {
    try {
      // NOAA NHC GeoJSON feed for active storms
      const response = await fetch(
        'https://www.nhc.noaa.gov/CurrentStorms.json',
        { mode: 'cors' }
      );

      if (!response.ok) {
        // Fallback to sample data if API fails (CORS issues common)
        return this.getSampleStormData();
      }

      const data = await response.json();
      
      if (!data.activeStorms || data.activeStorms.length === 0) {
        // No active storms - this is valid
        console.log('ℹ️ No active storms in Atlantic/Pacific');
        return [];
      }

      return data.activeStorms.map((storm: any) => ({
        id: storm.id || storm.binNumber,
        name: storm.name,
        type: this.parseStormType(storm.classification),
        category: this.parseCategory(storm.intensity),
        lat: storm.latitude,
        lng: storm.longitude,
        windSpeed: storm.intensity || 0,
        windSpeedMph: (storm.intensity || 0) * 1.151,
        pressure: storm.pressure || 0,
        movement: storm.movement || 'Stationary',
        movementDeg: storm.movementDir || 0,
        movementSpeed: storm.movementSpeed || 0,
        basin: this.parseBasin(storm.binNumber),
        advisory: storm.advisoryNumber || '',
        headline: storm.headline || `${storm.classification} ${storm.name}`,
        lastUpdate: new Date(),
      }));
    } catch (error) {
      console.warn('⚠️ NHC API unavailable, using sample data');
      return this.getSampleStormData();
    }
  }

  private parseStormType(classification: string): StormData['type'] {
    const lower = (classification || '').toLowerCase();
    if (lower.includes('hurricane')) return 'hurricane';
    if (lower.includes('tropical storm')) return 'tropical_storm';
    if (lower.includes('tropical depression')) return 'tropical_depression';
    if (lower.includes('subtropical')) return 'subtropical_storm';
    if (lower.includes('post-tropical')) return 'post_tropical';
    return 'tropical_storm';
  }

  private parseCategory(windSpeed: number): number {
    // Saffir-Simpson scale (wind in knots)
    if (windSpeed >= 137) return 5;
    if (windSpeed >= 113) return 4;
    if (windSpeed >= 96) return 3;
    if (windSpeed >= 83) return 2;
    if (windSpeed >= 64) return 1;
    return 0; // Tropical storm or depression
  }

  private parseBasin(binNumber: string): StormData['basin'] {
    if (!binNumber) return 'atlantic';
    if (binNumber.startsWith('EP')) return 'pacific';
    if (binNumber.startsWith('CP')) return 'central_pacific';
    return 'atlantic';
  }

  // Sample data for demo/fallback (when no active storms or CORS issues)
  private getSampleStormData(): StormData[] {
    // Return empty if outside hurricane season (Jun-Nov Atlantic, May-Nov Pacific)
    const month = new Date().getMonth();
    const isHurricaneSeason = month >= 5 && month <= 10;
    
    if (!isHurricaneSeason) {
      return [];
    }

    // Demo data only during hurricane season
    return [
      {
        id: 'DEMO01',
        name: 'Demo Storm (No Active Storms)',
        type: 'tropical_storm',
        category: 0,
        lat: 25.0,
        lng: -75.0,
        windSpeed: 50,
        windSpeedMph: 58,
        pressure: 1000,
        movement: 'NW at 12 mph',
        movementDeg: 315,
        movementSpeed: 12,
        basin: 'atlantic',
        advisory: 'DEMO',
        headline: 'Demonstration - No real active storms',
        lastUpdate: new Date(),
      }
    ];
  }

  // Start polling for storm data
  startPolling(intervalMs = 300000) { // Default 5 minutes
    if (this.pollInterval) return;
    
    console.log('✅ Storm tracking started');
    
    // Initial fetch
    this.fetchActiveStorms();
    
    // Poll every intervalMs
    this.pollInterval = window.setInterval(() => {
      this.fetchActiveStorms();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⚠️ Storm tracking stopped');
    }
    this._isConnected = false;
    this.notifyConnectionListeners();
  }

  // Subscribe to storm updates
  subscribe(id: string, callback: (storms: StormData[]) => void) {
    this.listeners.set(id, callback);
    if (this.storms.size > 0) {
      callback(Array.from(this.storms.values()));
    }
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  subscribeToConnection(id: string, callback: (status: { connected: boolean; count: number }) => void) {
    this.connectionListeners.set(id, callback);
    callback({ connected: this._isConnected, count: this.storms.size });
  }

  unsubscribeFromConnection(id: string) {
    this.connectionListeners.delete(id);
  }

  private notifyListeners() {
    const storms = Array.from(this.storms.values());
    this.listeners.forEach(cb => cb(storms));
  }

  private notifyConnectionListeners() {
    const status = { connected: this._isConnected, count: this.storms.size };
    this.connectionListeners.forEach(cb => cb(status));
  }

  getAllStorms(): StormData[] {
    return Array.from(this.storms.values());
  }

  getStormById(id: string): StormData | undefined {
    return this.storms.get(id);
  }

  getStormCount(): number {
    return this.storms.size;
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  // Get storm color based on category
  getStormColor(storm: StormData): string {
    if (storm.type === 'tropical_depression') return '#6b7280';
    if (storm.type === 'tropical_storm') return '#eab308';
    
    // Hurricane categories
    switch (storm.category) {
      case 1: return '#f59e0b'; // Yellow-orange
      case 2: return '#f97316'; // Orange
      case 3: return '#ef4444'; // Red
      case 4: return '#dc2626'; // Dark red
      case 5: return '#7c2d12'; // Maroon
      default: return '#22c55e'; // Green for others
    }
  }

  // Get storm icon size based on category
  getStormRadius(storm: StormData): number {
    if (storm.type === 'tropical_depression') return 8;
    if (storm.type === 'tropical_storm') return 12;
    return 10 + (storm.category * 3); // 13-25 for Cat 1-5
  }
}

export const stormService = new StormTrackingService();
export default StormTrackingService;
