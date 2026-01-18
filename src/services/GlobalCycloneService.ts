// Global Cyclone/Storm Service - Multi-source real-time tropical cyclone tracking
// Uses Edge Function to bypass CORS and aggregate data from NOAA, JMA, etc.

import { supabase } from '@/integrations/supabase/client';

export interface ForecastPoint {
  lat: number;
  lng: number;
  time: Date | string;
  timeLabel: string;
  windSpeed: number; // knots
  category: number;
}

export interface WindField {
  radius34kt: number;
  radius50kt: number;
  radius64kt: number;
}

export interface CycloneData {
  id: string;
  name: string;
  category: number; // 0-5 Saffir-Simpson (0 = TD/TS)
  type: string;
  typeLabel: string;
  lat: number;
  lng: number;
  windSpeed: number; // Max sustained winds in knots
  windSpeedMph: number;
  windSpeedKmh: number;
  gustSpeed?: number;
  pressure: number; // Central pressure in mb/hPa
  movement: {
    direction: string;
    directionDeg: number;
    speed: number; // mph
  };
  forecastTrack: ForecastPoint[];
  windField?: WindField;
  basin: string;
  basinLabel: string;
  source: string;
  advisory?: string;
  headline?: string;
  lastUpdate: Date | string;
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

  // Main function: Fetch from Edge Function
  async fetchAllCyclones(): Promise<CycloneData[]> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        return this.cache.data;
      }

      console.log('🌀 Fetching global cyclone data via Edge Function...');

      const { data, error } = await supabase.functions.invoke('global-weather', {
        body: {},
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch cyclone data');
      }

      const allCyclones: CycloneData[] = data.cyclones || [];

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
      
      // Return cached data if available
      if (this.cyclones.size > 0) {
        return Array.from(this.cyclones.values());
      }
      
      // Return demo data as fallback
      return this.getDemoData();
    }
  }

  // Demo data for when API fails
  private getDemoData(): CycloneData[] {
    const now = new Date();
    return [
      {
        id: 'demo-ma-on',
        name: 'MA-ON',
        category: 2,
        type: 'typhoon',
        typeLabel: 'Typhoon',
        lat: 18.5,
        lng: 128.0,
        windSpeed: 85,
        windSpeedMph: 98,
        windSpeedKmh: 157,
        pressure: 970,
        movement: { direction: 'NW', directionDeg: 315, speed: 12 },
        forecastTrack: [
          { lat: 18.5, lng: 128.0, time: now.toISOString(), timeLabel: 'Current', windSpeed: 85, category: 2 },
          { lat: 20.0, lng: 126.0, time: new Date(now.getTime() + 24*60*60*1000).toISOString(), timeLabel: '00:00 AM Thu', windSpeed: 90, category: 2 },
          { lat: 22.0, lng: 124.0, time: new Date(now.getTime() + 48*60*60*1000).toISOString(), timeLabel: '18:00 PM Thu', windSpeed: 100, category: 3 },
          { lat: 24.0, lng: 122.0, time: new Date(now.getTime() + 72*60*60*1000).toISOString(), timeLabel: '12:00 PM Fri', windSpeed: 85, category: 2 },
          { lat: 26.5, lng: 120.0, time: new Date(now.getTime() + 96*60*60*1000).toISOString(), timeLabel: '00:00 AM Sat', windSpeed: 65, category: 1 },
        ],
        basin: 'west_pacific',
        basinLabel: 'West Pacific',
        source: 'Demo Data',
        headline: 'Sample Typhoon MA-ON (Demo)',
        lastUpdate: now.toISOString(),
      }
    ];
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

  getCategoryLabel(category: number, type: string): string {
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
