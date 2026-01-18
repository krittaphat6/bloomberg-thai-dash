// Global Cyclone/Storm Service - Multi-source real-time tropical cyclone tracking
// Uses Edge Function to bypass CORS and aggregate data from NOAA, JMA, JTWC
// NO DEMO DATA - Only real-time data from official sources

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
  isRealTime: boolean;
}

interface NoActiveStormsInfo {
  message: string;
  sources: string[];
  regions: Array<{ name: string; period: string }>;
}

interface CacheEntry {
  data: CycloneData[];
  noActiveInfo: NoActiveStormsInfo | null;
  timestamp: number;
  isRealTime: boolean;
  hasActiveStorms: boolean;
}

class GlobalCycloneService {
  private cyclones: Map<string, CycloneData> = new Map();
  private listeners: Map<string, (cyclones: CycloneData[]) => void> = new Map();
  private connectionListeners: Map<string, (status: ConnectionStatus) => void> = new Map();
  private pollInterval: number | null = null;
  private _isConnected = false;
  private _hasActiveStorms = false;
  private _noActiveInfo: NoActiveStormsInfo | null = null;
  private cache: CacheEntry | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Connection status type
  get connectionStatus(): ConnectionStatus {
    return {
      connected: this._isConnected,
      count: this.cyclones.size,
      isRealTime: true,
      hasActiveStorms: this._hasActiveStorms,
      noActiveInfo: this._noActiveInfo,
    };
  }

  // Main function: Fetch from Edge Function
  async fetchAllCyclones(): Promise<CycloneData[]> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
        return this.cache.data;
      }

      console.log('🌀 Fetching real-time cyclone data via Edge Function...');

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
      this._hasActiveStorms = data.hasActiveStorms || allCyclones.length > 0;
      this._noActiveInfo = data.noActiveInfo || null;
      
      this.cache = { 
        data: allCyclones, 
        noActiveInfo: this._noActiveInfo,
        timestamp: Date.now(),
        isRealTime: data.isRealTime ?? true,
        hasActiveStorms: this._hasActiveStorms,
      };

      // Update internal state
      this.cyclones.clear();
      allCyclones.forEach(c => this.cyclones.set(c.id, c));

      this.notifyListeners();
      this.notifyConnectionListeners();

      if (this._hasActiveStorms) {
        console.log(`✅ Fetched ${allCyclones.length} active cyclones (REAL-TIME)`);
      } else {
        console.log('ℹ️ No active cyclones currently - this is normal seasonal behavior');
      }
      
      return allCyclones;
    } catch (error) {
      console.error('❌ Global cyclone fetch error:', error);
      this._isConnected = false;
      this.notifyConnectionListeners();
      
      // Return cached data if available
      if (this.cyclones.size > 0) {
        return Array.from(this.cyclones.values());
      }
      
      // Return empty array - NO DEMO DATA
      return [];
    }
  }

  // Get no active storms info
  getNoActiveInfo(): NoActiveStormsInfo | null {
    return this._noActiveInfo;
  }

  // Check if there are active storms
  hasActiveStorms(): boolean {
    return this._hasActiveStorms;
  }

  // Subscription methods
  startPolling(intervalMs = 300000) {
    if (this.pollInterval) return;
    console.log('🌀 Global cyclone tracking started (REAL-TIME DATA ONLY)');
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

  subscribeToConnection(id: string, callback: (status: ConnectionStatus) => void) {
    this.connectionListeners.set(id, callback);
    callback(this.connectionStatus);
  }

  unsubscribeFromConnection(id: string) {
    this.connectionListeners.delete(id);
  }

  private notifyListeners() {
    const cyclones = Array.from(this.cyclones.values());
    this.listeners.forEach(cb => cb(cyclones));
  }

  private notifyConnectionListeners() {
    const status = this.connectionStatus;
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

interface ConnectionStatus {
  connected: boolean;
  count: number;
  isRealTime: boolean;
  hasActiveStorms: boolean;
  noActiveInfo: NoActiveStormsInfo | null;
}

export const globalCycloneService = new GlobalCycloneService();
export default GlobalCycloneService;
