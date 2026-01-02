import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, Plane, Ship, Cloud, Activity, Flame, BarChart3,
  MapPin, Navigation, Download, Waves, Crosshair, Search, AlertTriangle, Wind
} from 'lucide-react';
import { WeatherService, WeatherAlert } from '@/services/WeatherService';
import { ConflictService, ConflictEvent } from '@/services/ConflictService';
import CycloneService, { CycloneData } from '@/services/CycloneService';
import { toast } from 'sonner';

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

// Fly to location component
const FlyToLocation = ({ location }: { location: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo(location, 8, { duration: 1.5 });
    }
  }, [location, map]);
  return null;
};

const GlobalMapView = () => {
  const [layers, setLayers] = useState<DataLayer[]>([
    { id: 'cyclones', name: '🌀 Active Cyclones', icon: <Wind className="w-4 h-4" />, enabled: true, color: '#ff00ff' },
    { id: 'flights', name: '✈️ Live Flights', icon: <Plane className="w-4 h-4" />, enabled: true, color: '#00ff00' },
    { id: 'ships', name: '🚢 Live Ships', icon: <Ship className="w-4 h-4" />, enabled: false, color: '#00a0ff' },
    { id: 'earthquakes', name: '🌋 Earthquakes', icon: <Activity className="w-4 h-4" />, enabled: true, color: '#ff0000' },
    { id: 'weather', name: '🌦️ Weather Alerts', icon: <Cloud className="w-4 h-4" />, enabled: true, color: '#ffaa00' },
    { id: 'tsunami', name: '🌊 Tsunami Warnings', icon: <Waves className="w-4 h-4" />, enabled: true, color: '#ff0066' },
    { id: 'conflicts', name: '⚔️ Conflict Zones', icon: <Crosshair className="w-4 h-4" />, enabled: true, color: '#ff4444' },
    { id: 'wildfires', name: '🔥 Wildfires', icon: <Flame className="w-4 h-4" />, enabled: false, color: '#ff6600' },
    { id: 'markets', name: '📈 Stock Markets', icon: <BarChart3 className="w-4 h-4" />, enabled: true, color: '#00ff88' },
  ]);

  const [flights, setFlights] = useState<FlightData[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeData[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [tsunamiWarnings, setTsunamiWarnings] = useState<WeatherAlert[]>([]);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [cyclones, setCyclones] = useState<CycloneData[]>([]);
  const [cyclonesLoading, setCyclonesLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch Flights (with fallback to mock data)
  const fetchFlights = useCallback(async () => {
    try {
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

  // Fetch Weather Alerts
  const fetchWeatherAlerts = useCallback(async () => {
    try {
      const alerts = await WeatherService.getWeatherAlerts();
      setWeatherAlerts(alerts);
    } catch (err) {
      console.error('Weather alerts error:', err);
    }
  }, []);

  // Fetch Tsunami Warnings
  const fetchTsunamiWarnings = useCallback(async () => {
    try {
      const warnings = await WeatherService.getTsunamiWarnings();
      setTsunamiWarnings(warnings);
      
      if (warnings.length > 0) {
        toast.error(`🌊 TSUNAMI WARNING: ${warnings.length} active warning(s)`);
      }
    } catch (err) {
      console.error('Tsunami API error:', err);
    }
  }, []);

  // Fetch Cyclones Data
  const fetchCyclones = useCallback(async () => {
    setCyclonesLoading(true);
    try {
      const data = await CycloneService.fetchAllCyclones();
      setCyclones(data);
      if (data.length > 0) {
        toast.success(`🌀 Found ${data.length} active cyclone(s)`);
      }
    } catch (err) {
      console.error('Cyclone fetch error:', err);
    } finally {
      setCyclonesLoading(false);
    }
  }, []);

  // Fetch Conflict Data
  const fetchConflicts = useCallback(async () => {
    try {
      const data = await ConflictService.getConflictData();
      setConflicts(data);
    } catch (err) {
      console.error('Conflict data error:', err);
    }
  }, []);

  // Get User Location
  const getUserLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setFlyToTarget(loc);
          toast.success('📍 Location found!');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Could not get your location');
        }
      );
    }
  }, []);

  // Search location
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFlyToTarget([parseFloat(lat), parseFloat(lon)]);
        toast.success(`Found: ${data[0].display_name.split(',')[0]}`);
      } else {
        toast.error('Location not found');
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [searchQuery]);

  // Generate Mock Flights
  const generateMockFlights = (): FlightData[] => {
    const mockFlights: FlightData[] = [];
    const routes = [
      { from: [13.69, 100.75], to: [35.55, 139.78], country: 'Thailand' },
      { from: [1.36, 103.99], to: [22.31, 113.91], country: 'Singapore' },
      { from: [25.25, 55.36], to: [13.69, 100.75], country: 'UAE' },
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
    if (layers.find(l => l.id === 'weather')?.enabled) promises.push(fetchWeatherAlerts());
    if (layers.find(l => l.id === 'tsunami')?.enabled) promises.push(fetchTsunamiWarnings());
    if (layers.find(l => l.id === 'conflicts')?.enabled) promises.push(fetchConflicts());
    if (layers.find(l => l.id === 'cyclones')?.enabled) promises.push(fetchCyclones());
    
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

  // Weather alert icon
  const createWeatherIcon = (severity: string) => L.divIcon({
    html: `<div class="weather-marker" style="font-size: 20px; filter: drop-shadow(0 0 5px ${severity === 'extreme' ? '#ff0066' : '#ffaa00'});">
      ${severity === 'extreme' ? '⛈️' : '🌧️'}
    </div>`,
    className: 'weather-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Tsunami icon
  const createTsunamiIcon = () => L.divIcon({
    html: `<div class="tsunami-marker alert-glow" style="font-size: 24px;">🌊</div>`,
    className: 'tsunami-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  // Conflict icon
  const createConflictIcon = (severity: string) => L.divIcon({
    html: `<div class="conflict-marker" style="font-size: 18px; filter: drop-shadow(0 0 4px ${severity === 'high' ? '#ff0000' : '#ff6666'});">⚔️</div>`,
    className: 'conflict-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  // User location icon
  const createUserIcon = () => L.divIcon({
    html: `<div class="user-location-marker" style="font-size: 20px; filter: drop-shadow(0 0 6px #00aaff);">📍</div>`,
    className: 'user-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Cyclone icon
  const createCycloneIcon = (category: number) => {
    const size = 28 + category * 6;
    const color = CycloneService.getCategoryColor(category);
    
    return L.divIcon({
      className: 'cyclone-icon',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          position: relative;
          animation: spin 3s linear infinite;
        ">
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: radial-gradient(circle, ${color}40 0%, transparent 70%);
            animation: pulse 2s ease-in-out infinite;
          "></div>
          <div style="
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${size * 0.6}px;
            filter: drop-shadow(0 0 8px ${color});
          ">🌀</div>
        </div>
        <style>
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
        </style>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

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
        {/* Top Control Bar */}
        <div className="absolute top-3 left-3 right-72 z-[1000] flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-1 flex-1 max-w-md">
            <Input
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-[#1a2744] border-[#2d4a6f] text-white text-sm h-8"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSearch}
              className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-500/20"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Action Buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={getUserLocation}
            className="h-8 px-2 text-cyan-400 hover:bg-cyan-500/20"
            title="Get my location"
          >
            <Navigation className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast.info('Screenshot feature coming soon')}
            className="h-8 px-2 text-purple-400 hover:bg-purple-500/20"
            title="Screenshot"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        <MapContainer
          center={[20, 100]}
          zoom={3}
          className="w-full h-full"
          style={{ background: '#0a1628' }}
          zoomControl={false}
        >
          <FlyToLocation location={flyToTarget} />
          
          {/* Dark Theme Tile Layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Cyclones Layer */}
          {layers.find(l => l.id === 'cyclones')?.enabled && cyclones.map(cyclone => (
            <React.Fragment key={cyclone.id}>
              {/* Danger Zone Circle */}
              <Circle
                center={[cyclone.coordinates[1], cyclone.coordinates[0]]}
                radius={CycloneService.getDangerRadius(cyclone.category)}
                pathOptions={{
                  color: CycloneService.getCategoryColor(cyclone.category),
                  fillColor: CycloneService.getCategoryColor(cyclone.category),
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '10, 10'
                }}
              />
              
              {/* Forecast Track */}
              {cyclone.forecastTrack.length > 0 && (
                <Polyline
                  positions={[
                    [cyclone.coordinates[1], cyclone.coordinates[0]],
                    ...cyclone.forecastTrack.map(f => [f.lat, f.lng] as [number, number])
                  ]}
                  pathOptions={{
                    color: '#ff00ff',
                    weight: 3,
                    dashArray: '10, 10',
                    opacity: 0.7
                  }}
                />
              )}
              
              {/* Cyclone Marker */}
              <Marker
                position={[cyclone.coordinates[1], cyclone.coordinates[0]]}
                icon={createCycloneIcon(cyclone.category)}
              >
                <Popup className="dark-popup">
                  <div className="bg-[#1a2744] text-white p-3 rounded min-w-[220px] border border-purple-500/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🌀</span>
                      <div>
                        <p className="font-bold text-purple-400 text-lg">{cyclone.name}</p>
                        <p className="text-xs text-gray-300">{cyclone.type} • {cyclone.basin}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/30 p-2 rounded">
                        <p className="text-gray-400">Category</p>
                        <p className="text-white font-bold text-lg">{cyclone.category}</p>
                      </div>
                      <div className="bg-black/30 p-2 rounded">
                        <p className="text-gray-400">Wind Speed</p>
                        <p className="text-white font-bold">{cyclone.windSpeed} kt</p>
                        <p className="text-gray-400">({cyclone.windSpeedKmh} km/h)</p>
                      </div>
                      <div className="bg-black/30 p-2 rounded">
                        <p className="text-gray-400">Pressure</p>
                        <p className="text-white font-bold">{cyclone.pressure} mb</p>
                      </div>
                      <div className="bg-black/30 p-2 rounded">
                        <p className="text-gray-400">Movement</p>
                        <p className="text-white font-bold">{cyclone.movement.direction}</p>
                        <p className="text-gray-400">@ {cyclone.movement.speed} kt</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
                      <p>Source: {cyclone.source}</p>
                      <p>Updated: {new Date(cyclone.lastUpdate).toLocaleString()}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

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

          {/* Weather Alerts Layer */}
          {layers.find(l => l.id === 'weather')?.enabled && weatherAlerts.map(alert => (
            <Marker
              key={alert.id}
              position={[alert.coordinates[1], alert.coordinates[0]]}
              icon={createWeatherIcon(alert.severity)}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded min-w-[180px]">
                  <p className="font-bold text-orange-400">
                    {alert.severity === 'extreme' ? '🚨 ' : '⚠️ '}{alert.event}
                  </p>
                  <p className="text-sm text-white">{alert.location}</p>
                  <p className="text-xs text-gray-300">{alert.description}</p>
                  <p className={`text-xs mt-1 ${alert.severity === 'extreme' ? 'text-red-400' : 'text-yellow-400'}`}>
                    Severity: {alert.severity.toUpperCase()}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Tsunami Warnings Layer */}
          {layers.find(l => l.id === 'tsunami')?.enabled && tsunamiWarnings.map(warning => (
            <Marker
              key={warning.id}
              position={[warning.coordinates[1], warning.coordinates[0]]}
              icon={createTsunamiIcon()}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded min-w-[200px] border border-red-500">
                  <p className="font-bold text-red-400 text-lg">🌊 TSUNAMI WARNING</p>
                  <p className="text-sm text-white">{warning.location}</p>
                  <p className="text-xs text-gray-300">{warning.description}</p>
                  <p className="text-xs text-red-400 mt-1 font-bold">⚠️ EVACUATE TO HIGHER GROUND</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Issued: {new Date(warning.start).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Conflict Zones Layer */}
          {layers.find(l => l.id === 'conflicts')?.enabled && conflicts.map(conflict => (
            <Marker
              key={conflict.id}
              position={[conflict.coordinates[1], conflict.coordinates[0]]}
              icon={createConflictIcon(conflict.severity)}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded min-w-[180px]">
                  <p className="font-bold text-red-400">{conflict.type.toUpperCase()}</p>
                  <p className="text-sm text-white">{conflict.location}</p>
                  <p className="text-xs text-gray-300">{conflict.description}</p>
                  <p className="text-xs text-gray-400">{new Date(conflict.time).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Source: {conflict.source}</p>
                </div>
              </Popup>
            </Marker>
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

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={createUserIcon()}
            >
              <Popup className="dark-popup">
                <div className="bg-[#1a2744] text-white p-2 rounded">
                  <p className="font-bold text-cyan-400">📍 Your Location</p>
                  <p className="text-xs text-gray-300">
                    {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Enhanced Stats Overlay */}
        <div className="absolute bottom-4 left-4 bg-[#0d1f3c]/95 border border-[#1e3a5f] rounded-lg p-3 text-white text-xs z-[1000] min-w-[180px]">
          <p className="text-[#ff6b00] font-bold mb-2 flex items-center gap-1">
            🌍 LIVE GLOBAL DATA
          </p>
          <div className="space-y-1">
            {cyclones.length > 0 && (
              <p className="text-purple-400 font-bold animate-pulse flex items-center gap-1">
                🌀 Cyclones: {cyclones.length}
                {cyclonesLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
              </p>
            )}
            <p className="text-green-400">✈️ Flights: {flights.length}</p>
            <p className="text-red-400">🌋 Earthquakes: {earthquakes.length}</p>
            <p className="text-orange-400">🌦️ Weather Alerts: {weatherAlerts.length}</p>
            {tsunamiWarnings.length > 0 && (
              <p className="text-pink-400 font-bold animate-pulse">
                🌊 TSUNAMI: {tsunamiWarnings.length}
              </p>
            )}
            <p className="text-red-400">⚔️ Conflicts: {conflicts.length}</p>
            <p className="text-blue-400">📈 Markets: {marketLocations.length}</p>
          </div>
          
          {/* Cyclone Summary */}
          {cyclones.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
              <p className="text-purple-400 font-bold mb-1">🌀 ACTIVE CYCLONES</p>
              {cyclones.slice(0, 3).map(c => (
                <div key={c.id} className="mb-1">
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-gray-400">{c.windSpeed} kt • Cat {c.category} • {c.basin}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t border-[#1e3a5f]">
            <p className="text-gray-400 flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {lastUpdate?.toLocaleTimeString() || 'Loading...'}
            </p>
            {userLocation && (
              <p className="text-cyan-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                Location: Active
              </p>
            )}
          </div>
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

          {/* Alert Summary */}
          {(tsunamiWarnings.length > 0 || weatherAlerts.filter(a => a.severity === 'extreme').length > 0) && (
            <div className="p-3 border-t border-[#1e3a5f]">
              <p className="text-red-400 text-xs font-bold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                ACTIVE ALERTS
              </p>
              <div className="space-y-1 text-xs">
                {tsunamiWarnings.map(w => (
                  <p key={w.id} className="text-pink-400 animate-pulse">🌊 {w.location}</p>
                ))}
                {weatherAlerts.filter(a => a.severity === 'extreme').map(a => (
                  <p key={a.id} className="text-orange-400">⛈️ {a.location}</p>
                ))}
              </div>
            </div>
          )}

          {/* Coming Soon */}
          <div className="p-3 border-t border-[#1e3a5f]">
            <p className="text-[#ff6b00] text-xs font-bold mb-2">COMING SOON</p>
            <div className="space-y-1 text-gray-400 text-xs">
              <p>• Shipping Routes (AIS)</p>
              <p>• Oil & Gas Pipelines</p>
              <p>• Central Banks</p>
              <p>• Currency Flows</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default GlobalMapView;
