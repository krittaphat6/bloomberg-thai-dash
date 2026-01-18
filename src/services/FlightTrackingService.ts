// OpenSky Network - Real-time Flight Tracking
// Free API: https://openskynetwork.github.io/opensky-api/

export interface FlightData {
  icao24: string;         // Unique ICAO 24-bit address
  callsign: string;       // Callsign (flight number)
  originCountry: string;  // Country of origin
  lat: number;            // Latitude
  lng: number;            // Longitude
  altitude: number;       // Altitude in meters
  velocity: number;       // Velocity in m/s
  heading: number;        // True heading in degrees
  verticalRate: number;   // Vertical rate in m/s
  onGround: boolean;      // Is on ground
  squawk: string;         // Transponder code
  lastUpdate: Date;       // Last update time
}

export interface FlightBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

class FlightTrackingService {
  private flights: Map<string, FlightData> = new Map();
  private listeners: Map<string, (flights: FlightData[]) => void> = new Map();
  private connectionListeners: Map<string, (status: { connected: boolean; count: number }) => void> = new Map();
  private pollInterval: number | null = null;
  private _isConnected = false;
  private lastFetchTime = 0;

  // Fetch flights from OpenSky Network (free, no API key required)
  async fetchFlights(bounds?: FlightBounds): Promise<FlightData[]> {
    try {
      let url = 'https://opensky-network.org/api/states/all';
      
      // Add bounding box if provided (reduces data)
      if (bounds) {
        url += `?lamin=${bounds.minLat}&lomin=${bounds.minLng}&lamax=${bounds.maxLat}&lomax=${bounds.maxLng}`;
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        // Rate limited - OpenSky has 10 req/min for anonymous users
        if (response.status === 429) {
          console.warn('⚠️ OpenSky rate limit hit, will retry later');
          return Array.from(this.flights.values());
        }
        throw new Error(`OpenSky API error: ${response.status}`);
      }

      const data = await response.json();
      this._isConnected = true;
      this.lastFetchTime = Date.now();
      
      if (!data.states) {
        return [];
      }

      const flights: FlightData[] = data.states
        .filter((state: any[]) => state[5] !== null && state[6] !== null) // Filter out nulls
        .map((state: any[]) => ({
          icao24: state[0] || '',
          callsign: (state[1] || '').trim(),
          originCountry: state[2] || 'Unknown',
          lat: state[6],
          lng: state[5],
          altitude: state[7] || state[13] || 0, // barometric or geometric
          velocity: state[9] || 0,
          heading: state[10] || 0,
          verticalRate: state[11] || 0,
          onGround: state[8] || false,
          squawk: state[14] || '',
          lastUpdate: new Date((state[3] || state[4] || Date.now() / 1000) * 1000),
        }));

      // Update cache
      flights.forEach(f => this.flights.set(f.icao24, f));
      
      // Notify listeners
      this.notifyListeners();
      this.notifyConnectionListeners();

      return flights;
    } catch (error) {
      console.error('❌ Flight tracking error:', error);
      this._isConnected = false;
      this.notifyConnectionListeners();
      return Array.from(this.flights.values());
    }
  }

  // Start polling for flight data
  startPolling(bounds?: FlightBounds, intervalMs = 15000) {
    if (this.pollInterval) return;
    
    console.log('✅ Flight tracking started');
    
    // Initial fetch
    this.fetchFlights(bounds);
    
    // Poll every intervalMs (min 10s for OpenSky rate limit)
    const safeInterval = Math.max(intervalMs, 10000);
    this.pollInterval = window.setInterval(() => {
      this.fetchFlights(bounds);
    }, safeInterval);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('⚠️ Flight tracking stopped');
    }
    this._isConnected = false;
    this.notifyConnectionListeners();
  }

  // Subscribe to flight updates
  subscribe(id: string, callback: (flights: FlightData[]) => void) {
    this.listeners.set(id, callback);
    // Immediately send current data
    if (this.flights.size > 0) {
      callback(Array.from(this.flights.values()));
    }
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  // Subscribe to connection status
  subscribeToConnection(id: string, callback: (status: { connected: boolean; count: number }) => void) {
    this.connectionListeners.set(id, callback);
    callback({ connected: this._isConnected, count: this.flights.size });
  }

  unsubscribeFromConnection(id: string) {
    this.connectionListeners.delete(id);
  }

  private notifyListeners() {
    const flights = Array.from(this.flights.values());
    this.listeners.forEach(cb => cb(flights));
  }

  private notifyConnectionListeners() {
    const status = { connected: this._isConnected, count: this.flights.size };
    this.connectionListeners.forEach(cb => cb(status));
  }

  getAllFlights(): FlightData[] {
    return Array.from(this.flights.values());
  }

  getFlightsByBounds(bounds: FlightBounds): FlightData[] {
    return this.getAllFlights().filter(f =>
      f.lat >= bounds.minLat && f.lat <= bounds.maxLat &&
      f.lng >= bounds.minLng && f.lng <= bounds.maxLng
    );
  }

  getFlightCount(): number {
    return this.flights.size;
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  clearCache() {
    this.flights.clear();
    this.notifyListeners();
    this.notifyConnectionListeners();
  }
}

export const flightService = new FlightTrackingService();
export default FlightTrackingService;
