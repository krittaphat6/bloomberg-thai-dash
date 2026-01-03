// AISStream.io WebSocket Service - Real-time Ship Data

export interface AISShipData {
  mmsi: string;
  name: string;
  shipType: number;
  shipTypeName: string;
  lat: number;
  lng: number;
  speed: number;        // knots
  course: number;       // degrees
  heading: number;
  destination: string;
  eta: string;
  flag: string;
  length: number;
  width: number;
  draught: number;
  callsign: string;
  imo: string;
  lastUpdate: Date;
}

export interface ShipRoute {
  mmsi: string;
  origin: { port: string; lat: number; lng: number };
  destination: { port: string; lat: number; lng: number };
  waypoints: { lat: number; lng: number; timestamp: Date }[];
  estimatedArrival: Date;
  distanceNM: number;
  progress: number;  // 0-100%
}

class AISStreamService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private listeners: Map<string, (data: AISShipData) => void> = new Map();
  private shipData: Map<string, AISShipData> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  connect(boundingBoxes: number[][][] = [[[-90, -180], [90, 180]]]) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
    if (!this.apiKey) {
      console.warn('⚠️ AISStream API key not configured');
      return;
    }

    this.isConnecting = true;
    this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

    this.ws.onopen = () => {
      console.log('✅ AISStream connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      const subscriptionMessage = {
        Apikey: this.apiKey,
        BoundingBoxes: boundingBoxes,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData']
      };
      
      this.ws?.send(JSON.stringify(subscriptionMessage));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const shipData = this.parseAISMessage(data);
        
        if (shipData) {
          this.shipData.set(shipData.mmsi, shipData);
          this.notifyListeners(shipData);
        }
      } catch (err) {
        console.error('AIS parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('⚠️ AISStream disconnected');
      this.isConnecting = false;
      this.attemptReconnect(boundingBoxes);
    };

    this.ws.onerror = (error) => {
      console.error('❌ AISStream error:', error);
      this.isConnecting = false;
    };
  }

  private parseAISMessage(data: any): AISShipData | null {
    const msg = data.Message;
    const meta = data.MetaData;
    
    if (!msg || !meta) return null;

    // Position Report
    if (msg.PositionReport) {
      const pos = msg.PositionReport;
      return {
        mmsi: meta.MMSI?.toString() || '',
        name: meta.ShipName || 'Unknown',
        shipType: meta.ShipType || 0,
        shipTypeName: this.getShipTypeName(meta.ShipType),
        lat: pos.Latitude,
        lng: pos.Longitude,
        speed: pos.Sog || 0,
        course: pos.Cog || 0,
        heading: pos.TrueHeading || pos.Cog || 0,
        destination: meta.Destination || '',
        eta: meta.ETA || '',
        flag: this.getCountryFromMMSI(meta.MMSI?.toString()),
        length: (meta.Dimension?.A || 0) + (meta.Dimension?.B || 0),
        width: (meta.Dimension?.C || 0) + (meta.Dimension?.D || 0),
        draught: meta.Draught || 0,
        callsign: meta.CallSign || '',
        imo: meta.IMONumber?.toString() || '',
        lastUpdate: new Date()
      };
    }

    return null;
  }

  private getShipTypeName(type: number): string {
    const types: Record<number, string> = {
      30: 'Fishing',
      31: 'Towing',
      32: 'Towing (Large)',
      33: 'Dredging',
      34: 'Diving',
      35: 'Military',
      36: 'Sailing',
      37: 'Pleasure',
      40: 'High Speed',
      50: 'Pilot',
      51: 'Search & Rescue',
      52: 'Tug',
      53: 'Port Tender',
      54: 'Anti-pollution',
      55: 'Law Enforcement',
      60: 'Passenger',
      70: 'Cargo',
      80: 'Tanker',
      90: 'Other'
    };
    
    const baseType = Math.floor(type / 10) * 10;
    return types[type] || types[baseType] || 'Unknown';
  }

  private getCountryFromMMSI(mmsi: string): string {
    if (!mmsi || mmsi.length < 3) return 'Unknown';
    
    const mid = mmsi.substring(0, 3);
    const countries: Record<string, string> = {
      '201': 'Albania', '211': 'Germany', '219': 'Denmark', '220': 'Denmark',
      '224': 'Spain', '226': 'France', '227': 'France', '228': 'France',
      '230': 'Finland', '232': 'UK', '233': 'UK', '234': 'UK', '235': 'UK',
      '237': 'Greece', '238': 'Croatia', '239': 'Greece', '240': 'Greece',
      '244': 'Netherlands', '245': 'Netherlands', '246': 'Netherlands', '247': 'Italy',
      '249': 'Malta', '250': 'Ireland', '256': 'Malta', '257': 'Norway',
      '258': 'Norway', '259': 'Norway', '261': 'Poland', '263': 'Portugal',
      '265': 'Sweden', '266': 'Sweden', '271': 'Turkey', '272': 'Ukraine',
      '273': 'Russia', '303': 'USA', '304': 'Antigua', '305': 'Antigua',
      '308': 'Bahamas', '309': 'Bahamas', '311': 'Bahamas', '312': 'Belize',
      '314': 'Barbados', '316': 'Canada', '338': 'USA', '339': 'Jamaica',
      '345': 'Mexico', '351': 'Panama', '352': 'Panama', '353': 'Panama',
      '354': 'Panama', '355': 'Panama', '356': 'Panama', '357': 'Panama',
      '366': 'USA', '367': 'USA', '368': 'USA', '369': 'USA',
      '370': 'Panama', '371': 'Panama', '372': 'Panama', '373': 'Panama',
      '374': 'Panama', '375': 'St Vincent', '376': 'St Vincent',
      '412': 'China', '413': 'China', '414': 'China', '416': 'Taiwan',
      '419': 'India', '431': 'Japan', '432': 'Japan', '440': 'South Korea',
      '441': 'South Korea', '453': 'Macao', '461': 'Oman', '470': 'UAE',
      '477': 'Hong Kong', '503': 'Australia', '512': 'New Zealand',
      '525': 'Indonesia', '533': 'Malaysia', '548': 'Philippines',
      '563': 'Singapore', '564': 'Singapore', '565': 'Singapore',
      '566': 'Singapore', '567': 'Thailand', '574': 'Vietnam',
      '601': 'South Africa', '603': 'Angola', '622': 'Egypt',
      '636': 'Liberia', '637': 'Liberia', '657': 'Nigeria',
      '701': 'Argentina', '710': 'Brazil', '725': 'Chile', '730': 'Colombia',
      '735': 'Ecuador', '760': 'Peru', '770': 'Uruguay', '775': 'Venezuela'
    };
    
    return countries[mid] || 'Unknown';
  }

  private attemptReconnect(boundingBoxes: number[][][]) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached for AISStream');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 AIS reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(boundingBoxes), delay);
  }

  subscribe(id: string, callback: (data: AISShipData) => void) {
    this.listeners.set(id, callback);
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  private notifyListeners(data: AISShipData) {
    this.listeners.forEach(callback => callback(data));
  }

  getAllShips(): AISShipData[] {
    return Array.from(this.shipData.values());
  }

  getShipsByRegion(minLat: number, maxLat: number, minLng: number, maxLng: number): AISShipData[] {
    return this.getAllShips().filter(ship => 
      ship.lat >= minLat && ship.lat <= maxLat &&
      ship.lng >= minLng && ship.lng <= maxLng
    );
  }

  getShipByMMSI(mmsi: string): AISShipData | undefined {
    return this.shipData.get(mmsi);
  }

  getShipCount(): number {
    return this.shipData.size;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.isConnecting = false;
  }
}

// Get API key from environment
const AISSTREAM_API_KEY = import.meta.env.VITE_AISSTREAM_API_KEY || '';

export const aisService = new AISStreamService(AISSTREAM_API_KEY);

export default AISStreamService;
