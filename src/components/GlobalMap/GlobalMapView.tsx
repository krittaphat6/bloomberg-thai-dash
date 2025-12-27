import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Plane, Ship, Cloud, Activity, Flame, BarChart3 } from 'lucide-react';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DataLayer {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  color: string;
}

interface FlightData {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  true_track: number;
}

interface EarthquakeData {
  id: string;
  place: string;
  mag: number;
  time: number;
  coordinates: [number, number, number];
}

// Map zoom controller component
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const GlobalMapView = () => {
  const [layers, setLayers] = useState<DataLayer[]>([
    { id: 'flights', name: '✈️ Live Flights', icon: <Plane className="w-4 h-4" />, enabled: true, color: '#00ff00' },
    { id: 'ships', name: '🚢 Live Ships', icon: <Ship className="w-4 h-4" />, enabled: false, color: '#00a0ff' },
    { id: 'earthquakes', name: '🌋 Earthquakes', icon: <Activity className="w-4 h-4" />, enabled: true, color: '#ff0000' },
    { id: 'weather', name: '🌤️ Weather', icon: <Cloud className="w-4 h-4" />, enabled: false, color: '#ffaa00' },
    { id: 'wildfires', name: '🔥 Wildfires', icon: <Flame className="w-4 h-4" />, enabled: false, color: '#ff6600' },
    { id: 'markets', name: '📈 Stock Markets', icon: <BarChart3 className="w-4 h-4" />, enabled: true, color: '#00ff88' },
  ]);

  const [flights, setFlights] = useState<FlightData[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch Flights (with fallback to mock data)
  const fetchFlights = useCallback(async () => {
    try {
      // OpenSky API - may have rate limits
      const res = await fetch('https://opensky-network.org/api/states/all?lamin=5&lomin=90&lamax=25&lomax=110', {
        signal: AbortSignal.timeout(10000)
      });
      const data = await res.json();
      if (data.states) {
        const mapped: FlightData[] = data.states.slice(0, 100).map((s: any) => ({
          icao24: s[0],
          callsign: s[1]?.trim() || 'N/A',
          origin_country: s[2],
          longitude: s[5],
          latitude: s[6],
          altitude: s[7] || 0,
          velocity: s[9] || 0,
          true_track: s[10] || 0,
        })).filter((f: FlightData) => f.latitude && f.longitude);
        setFlights(mapped);
        return;
      }
    } catch (err) {
      console.log('Flight API unavailable, using mock data');
    }
    // Fallback to mock data
    setFlights(generateMockFlights());
  }, []);

  // Fetch Earthquakes from USGS
  const fetchEarthquakes = useCallback(async () => {
    try {
      const res = await fetch(
        'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=50&minmagnitude=4&orderby=time'
      );
      const data = await res.json();
      const mapped: EarthquakeData[] = data.features.map((f: any) => ({
        id: f.id,
        place: f.properties.place,
        mag: f.properties.mag,
        time: f.properties.time,
        coordinates: f.geometry.coordinates,
      }));
      setEarthquakes(mapped);
    } catch (err) {
      console.error('Earthquake API error:', err);
    }
  }, []);

  // Generate Mock Flights
  const generateMockFlights = (): FlightData[] => {
    const mockFlights: FlightData[] = [];
    const routes = [
      { from: [13.69, 100.75], to: [35.55, 139.78], country: 'Thailand' }, // BKK to NRT
      { from: [1.36, 103.99], to: [22.31, 113.91], country: 'Singapore' }, // SIN to HKG
      { from: [25.25, 55.36], to: [13.69, 100.75], country: 'UAE' }, // DXB to BKK
    ];
    
    for (let i = 0; i < 30; i++) {
      const route = routes[i % routes.length];
      const progress = Math.random();
      mockFlights.push({
        icao24: `MOCK${i}`,
        callsign: `TG${100 + i}`,
        origin_country: route.country,
        latitude: route.from[0] + (route.to[0] - route.from[0]) * progress + (Math.random() - 0.5) * 10,
        longitude: route.from[1] + (route.to[1] - route.from[1]) * progress + (Math.random() - 0.5) * 10,
        altitude: 10000 + Math.random() * 30000,
        velocity: 200 + Math.random() * 300,
        true_track: Math.random() * 360,
      });
    }
    return mockFlights;
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    const promises = [];
    if (layers.find(l => l.id === 'flights')?.enabled) promises.push(fetchFlights());
    if (layers.find(l => l.id === 'earthquakes')?.enabled) promises.push(fetchEarthquakes());
    await Promise.all(promises);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, enabled: !l.enabled } : l
    ));
  };

  // Custom plane icon
  const createPlaneIcon = (rotation: number) => L.divIcon({
    html: `<div style="transform: rotate(${rotation}deg); font-size: 16px; filter: drop-shadow(0 0 3px #00ff00);">✈️</div>`,
    className: 'plane-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Stock market locations
  const marketLocations = [
    { name: 'NYSE', lat: 40.7128, lon: -74.006, status: 'open', change: '+1.2%', index: 'DJI' },
    { name: 'NASDAQ', lat: 40.7589, lon: -73.9851, status: 'open', change: '+0.8%', index: 'IXIC' },
    { name: 'LSE', lat: 51.5074, lon: -0.1278, status: 'closed', change: '+0.5%', index: 'FTSE' },
    { name: 'TSE', lat: 35.6762, lon: 139.6503, status: 'closed', change: '-0.3%', index: 'N225' },
    { name: 'HKEX', lat: 22.3193, lon: 114.1694, status: 'closed', change: '+0.4%', index: 'HSI' },
    { name: 'SSE', lat: 31.2304, lon: 121.4737, status: 'closed', change: '+0.2%', index: 'SSEC' },
    { name: 'SET', lat: 13.7563, lon: 100.5018, status: 'open', change: '+0.9%', index: 'SET' },
    { name: 'SGX', lat: 1.3521, lon: 103.8198, status: 'closed', change: '+0.3%', index: 'STI' },
    { name: 'ASX', lat: -33.8688, lon: 151.2093, status: 'closed', change: '+0.6%', index: 'AXJO' },
    { name: 'NSE', lat: 19.0760, lon: 72.8777, status: 'closed', change: '+1.1%', index: 'NIFTY' },
  ];

  // Create market icon
  const createMarketIcon = (status: string, change: string) => {
    const isUp = change.startsWith('+');
    const color = isUp ? '#00ff88' : '#ff4444';
    return L.divIcon({
      html: `<div style="
        width: 12px; 
        height: 12px; 
        background: ${color}; 
        border-radius: 50%; 
        box-shadow: 0 0 10px ${color};
        animation: pulse 2s infinite;
      "></div>`,
      className: 'market-marker',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  return (
    <div className="w-full h-full flex relative bg-[#0a1628]">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[20, 100]}
          zoom={3}
          className="w-full h-full"
          style={{ background: '#0a1628' }}
          zoomControl={false}
        >
          {/* Dark Theme Tile Layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Flights Layer */}
          {layers.find(l => l.id === 'flights')?.enabled && flights.map(flight => (
            <Marker
              key={flight.icao24}
              position={[flight.latitude, flight.longitude]}
              icon={createPlaneIcon(flight.true_track)}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded min-w-[150px]">
                  <p className="font-bold text-green-400">{flight.callsign}</p>
                  <p className="text-xs text-gray-300">Country: {flight.origin_country}</p>
                  <p className="text-xs text-gray-300">Altitude: {Math.round(flight.altitude).toLocaleString()}m</p>
                  <p className="text-xs text-gray-300">Speed: {Math.round(flight.velocity)} km/h</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Earthquakes Layer */}
          {layers.find(l => l.id === 'earthquakes')?.enabled && earthquakes.map(quake => (
            <CircleMarker
              key={quake.id}
              center={[quake.coordinates[1], quake.coordinates[0]]}
              radius={quake.mag * 4}
              pathOptions={{
                color: '#ff0000',
                fillColor: '#ff4444',
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded min-w-[180px]">
                  <p className="font-bold text-red-400">🌋 M{quake.mag.toFixed(1)}</p>
                  <p className="text-xs text-gray-300">{quake.place}</p>
                  <p className="text-xs text-gray-300">Depth: {quake.coordinates[2].toFixed(1)} km</p>
                  <p className="text-xs text-gray-400">{new Date(quake.time).toLocaleString()}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Stock Markets Layer */}
          {layers.find(l => l.id === 'markets')?.enabled && marketLocations.map(market => (
            <Marker
              key={market.name}
              position={[market.lat, market.lon]}
              icon={createMarketIcon(market.status, market.change)}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded min-w-[120px]">
                  <p className="font-bold text-blue-400">{market.name}</p>
                  <p className="text-xs text-gray-300">{market.index}</p>
                  <p className={`text-sm font-bold ${market.status === 'open' ? 'text-green-400' : 'text-gray-500'}`}>
                    {market.status.toUpperCase()}
                  </p>
                  <p className={`text-lg font-bold ${market.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {market.change}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Stats Overlay */}
        <div className="absolute bottom-4 left-4 bg-[#0d1f3c]/90 border border-[#1e3a5f] rounded-lg p-3 text-white text-xs z-[1000]">
          <p className="text-[#ff6b00] font-bold mb-1">LIVE DATA</p>
          <p className="text-green-400">✈️ Flights: {flights.length}</p>
          <p className="text-red-400">🌋 Earthquakes: {earthquakes.length}</p>
          <p className="text-blue-400">📈 Markets: {marketLocations.length}</p>
          <p className="text-gray-400 mt-1">
            Updated: {lastUpdate?.toLocaleTimeString() || 'Loading...'}
          </p>
        </div>
      </div>

      {/* Right Sidebar - Layer Controls */}
      <div className="w-64 bg-[#0d1f3c] border-l border-[#1e3a5f] flex flex-col">
        <div className="p-3 border-b border-[#1e3a5f] flex items-center justify-between">
          <p className="text-white font-bold text-sm">Map Content</p>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={refreshData}
            disabled={loading}
            className="h-7 w-7 p-0 text-green-400 hover:bg-green-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {layers.map(layer => (
              <div
                key={layer.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-[#1e3a5f]/50 cursor-pointer"
                onClick={() => toggleLayer(layer.id)}
              >
                <Checkbox 
                  checked={layer.enabled} 
                  className="border-gray-500 data-[state=checked]:bg-green-500"
                />
                <span className="text-white text-sm">{layer.name}</span>
              </div>
            ))}
          </div>

          {/* Suggested Data Layers */}
          <div className="p-3 border-t border-[#1e3a5f]">
            <p className="text-[#ff6b00] text-xs font-bold mb-2">COMING SOON</p>
            <div className="space-y-1 text-gray-400 text-xs">
              <p>• Coronavirus Outbreak</p>
              <p>• Oil & Gas Pipelines</p>
              <p>• Shipping Routes (AIS)</p>
              <p>• Weather Events</p>
              <p>• Central Banks</p>
              <p>• Gold Mines</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default GlobalMapView;
