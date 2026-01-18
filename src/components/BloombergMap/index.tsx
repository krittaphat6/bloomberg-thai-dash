import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import { useEarthquakeData } from '@/hooks/useEarthquakeData';
import { useMarketMapData, useCentralBanks, usePorts, useOilGas, useWildfires, useShips } from '@/hooks/useMarketMapData';
import { MapLayers, DEFAULT_LAYERS, LayerConfig } from './MapLayers';
import { DataPanel } from './DataPanel';
import { MarkerPopup } from './MarkerPopup';
import { MarketData, EarthquakeFeature, BankingFeature, ShipFeature } from '@/services/GeoDataService';
import { aisService, AISShipData } from '@/services/AISStreamService';
import { 
  Search, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut,
  RefreshCw,
  Camera,
  Clock,
  Ship,
  X,
  Trash2,
  Map,
  Moon,
  Satellite,
  MapPin,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface BloombergMapProps {
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type MapStyleType = 'standard' | 'dark' | 'satellite';

// Custom component to track zoom level and provide map ref
const MapController = ({ 
  onZoomChange, 
  onMapReady 
}: { 
  onZoomChange: (zoom: number) => void;
  onMapReady: (map: L.Map) => void;
}) => {
  const map = useMap();
  
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  
  return null;
};

export const BloombergMap = ({ className, isFullscreen, onToggleFullscreen }: BloombergMapProps) => {
  const [layers, setLayers] = useState<LayerConfig[]>(DEFAULT_LAYERS);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapStyle, setMapStyle] = useState<MapStyleType>('standard');
  const [currentZoom, setCurrentZoom] = useState(3);
  const [tilesLoading, setTilesLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  
  // AIS Ships state
  const [aisShips, setAisShips] = useState<AISShipData[]>([]);
  const [aisConnected, setAisConnected] = useState(false);
  const [aisShipCount, setAisShipCount] = useState(0);
  const [showAISSettings, setShowAISSettings] = useState(false);
  const [aisApiKey, setAisApiKey] = useState(aisService.getApiKey());

  // Fetch data
  const { data: earthquakes = [], isLoading: loadingEQ, refetch: refetchEQ } = useEarthquakeData();
  const { data: markets = [], isLoading: loadingMarkets, refetch: refetchMarkets } = useMarketMapData();
  const { data: banks = [] } = useCentralBanks();
  const { data: ports = [] } = usePorts();
  const { data: oilGas = [] } = useOilGas();
  const { data: wildfires = [] } = useWildfires();
  const { data: ships = [], isLoading: loadingShips, refetch: refetchShips } = useShips();

  // AIS WebSocket connection
  useEffect(() => {
    const aisLayerEnabled = layers.find(l => l.id === 'ais_ships')?.enabled;
    
    if (aisLayerEnabled) {
      aisService.connect([[[-90, -180], [90, 180]]]);
      
      aisService.subscribeToConnection('bloomberg-map', (connected) => {
        setAisConnected(connected);
      });
      
      aisService.subscribeToAllShips('bloomberg-map', (ships) => {
        setAisShips(ships.slice(0, 300)); // Limit for performance
        setAisShipCount(ships.length);
      });
      
      return () => {
        aisService.unsubscribeFromConnection('bloomberg-map');
        aisService.unsubscribeFromAllShips('bloomberg-map');
      };
    } else {
      setAisShips([]);
      setAisConnected(false);
    }
  }, [layers]);

  const isLayerEnabled = useCallback((layerId: string) => {
    return layers.find(l => l.id === layerId)?.enabled ?? false;
  }, [layers]);

  const handleToggleLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  }, []);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetchEQ();
    refetchMarkets();
    refetchShips();
    toast.success('Data refreshed');
  }, [refetchEQ, refetchMarkets, refetchShips]);

  const handleScreenshot = useCallback(() => {
    toast.info('Screenshot feature coming soon');
  }, []);

  const handleOpenLayerSettings = useCallback((layerId: string) => {
    if (layerId === 'ais_ships') {
      setShowAISSettings(true);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const results = await response.json();
      
      if (results.length > 0 && mapRef.current) {
        const { lat, lon } = results[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 12);
        toast.success(`Found: ${results[0].display_name.split(',')[0]}`);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      toast.error('Search failed');
    }
  }, [searchQuery]);

  // Get tile layer URL based on map style
  const getTileLayerUrl = useCallback(() => {
    switch(mapStyle) {
      case 'standard':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  }, [mapStyle]);

  // Get label layer URL
  const getLabelLayerUrl = useCallback(() => {
    if (mapStyle === 'standard') return null;
    return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';
  }, [mapStyle]);

  // Get attribution based on style
  const getAttribution = useCallback(() => {
    switch(mapStyle) {
      case 'standard':
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      case 'dark':
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
      case 'satellite':
        return '&copy; <a href="https://www.esri.com/">Esri</a> World Imagery';
      default:
        return '';
    }
  }, [mapStyle]);

  const getMarketColor = (market: MarketData) => {
    if (market.changePercent > 1) return '#00ff00';
    if (market.changePercent > 0) return '#00cc00';
    if (market.changePercent < -1) return '#ff0000';
    if (market.changePercent < 0) return '#cc0000';
    return '#ffcc00';
  };

  const getEarthquakeRadius = (magnitude: number) => {
    if (magnitude >= 7) return 16;
    if (magnitude >= 6) return 12;
    if (magnitude >= 5) return 8;
    return 5;
  };

  const getShipColor = (shipType: string) => {
    const colors: Record<string, string> = {
      'Tanker': '#ef4444',
      'Cargo': '#22c55e',
      'Passenger': '#3b82f6',
      'Fishing': '#f59e0b',
      'Military': '#6b7280',
      'Tug': '#8b5cf6',
      'Sailing': '#06b6d4',
      'High Speed': '#ec4899',
    };
    return colors[shipType] || '#00a0ff';
  };

  // Create ship icon
  const createShipIcon = (shipType: string, heading: number) => {
    const color = getShipColor(shipType);
    return L.divIcon({
      className: 'custom-ship-icon',
      html: `<div style="transform: rotate(${heading}deg); filter: drop-shadow(0 0 2px ${color});">
        <svg width="12" height="16" viewBox="0 0 12 16">
          <polygon points="6,0 12,14 6,11 0,14" fill="${color}" stroke="white" stroke-width="0.5"/>
        </svg>
      </div>`,
      iconSize: [12, 16],
      iconAnchor: [6, 8],
    });
  };

  return (
    <div className={cn(
      "flex flex-col bg-background text-foreground overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : "h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-terminal-orange font-bold text-sm">BLOOMBERG GLOBAL MAP</h1>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-48 h-7 pl-7 text-xs bg-background border-border"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Level Indicator */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background/50 px-2 py-1 rounded">
            <MapPin className="w-3 h-3" />
            Zoom: {currentZoom}
          </div>

          {/* Tiles Loading Indicator */}
          {tilesLoading && (
            <div className="flex items-center gap-1 text-[10px] text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading...
            </div>
          )}
          
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString()}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <RefreshCw className={cn("w-3 h-3", (loadingEQ || loadingMarkets) && "animate-spin")} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScreenshot}
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Camera className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative bg-background">
          <MapContainer
            center={[20, 100]}
            zoom={3}
            className="w-full h-full"
            style={{ 
              background: mapStyle === 'dark' ? '#0a1628' : mapStyle === 'satellite' ? '#1a1a2e' : '#e0e0e0' 
            }}
            zoomControl={false}
            maxZoom={19}
            minZoom={2}
          >
            <MapController 
              onZoomChange={setCurrentZoom} 
              onMapReady={(map) => { mapRef.current = map; }}
            />
            
            {/* Main Tile Layer */}
            <TileLayer
              key={`main-${mapStyle}`}
              url={getTileLayerUrl()}
              attribution={getAttribution()}
              maxZoom={19}
              minZoom={2}
              eventHandlers={{
                loading: () => setTilesLoading(true),
                load: () => setTilesLoading(false),
              }}
            />
            
            {/* Labels Layer for Dark/Satellite modes */}
            {getLabelLayerUrl() && (
              <TileLayer
                key={`labels-${mapStyle}`}
                url={getLabelLayerUrl()!}
                attribution=""
                pane="overlayPane"
                zIndex={650}
                maxZoom={19}
              />
            )}

            {/* Market Markers */}
            {isLayerEnabled('markets') && markets.map((market) => (
              <CircleMarker
                key={market.id}
                center={[market.coordinates[1], market.coordinates[0]]}
                radius={6}
                pathOptions={{
                  fillColor: getMarketColor(market),
                  fillOpacity: 0.8,
                  color: '#fff',
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => setSelectedItem(market),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{market.name}</strong>
                    <br />
                    Change: {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Earthquake Markers */}
            {isLayerEnabled('earthquakes') && earthquakes.map((quake) => (
              <CircleMarker
                key={quake.id}
                center={[quake.coordinates[1], quake.coordinates[0]]}
                radius={getEarthquakeRadius(quake.magnitude)}
                pathOptions={{
                  fillColor: 'rgba(255, 68, 68, 0.6)',
                  fillOpacity: 0.6,
                  color: '#ff4444',
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedItem(quake),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>Magnitude: {quake.magnitude}</strong>
                    <br />
                    {quake.place}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Banking Markers */}
            {isLayerEnabled('banking') && banks.map((bank) => (
              <CircleMarker
                key={bank.id}
                center={[bank.coordinates[1], bank.coordinates[0]]}
                radius={8}
                pathOptions={{
                  fillColor: '#00a0ff',
                  fillOpacity: 0.8,
                  color: '#fff',
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => setSelectedItem(bank),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>🏦 {bank.name}</strong>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Port Markers */}
            {isLayerEnabled('shipping') && ports.map((port) => (
              <CircleMarker
                key={port.id}
                center={[port.coordinates[1], port.coordinates[0]]}
                radius={5}
                pathOptions={{
                  fillColor: '#4169e1',
                  fillOpacity: 0.8,
                  color: '#fff',
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => setSelectedItem(port),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>⚓ {port.name}</strong>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Oil & Gas Markers */}
            {isLayerEnabled('oil_gas') && oilGas.map((facility) => (
              <CircleMarker
                key={facility.id}
                center={[facility.coordinates[1], facility.coordinates[0]]}
                radius={5}
                pathOptions={{
                  fillColor: '#8b4513',
                  fillOpacity: 0.8,
                  color: '#fff',
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => setSelectedItem(facility),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>🛢️ {facility.name}</strong>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Wildfire Markers */}
            {isLayerEnabled('wildfires') && wildfires.map((fire) => (
              <CircleMarker
                key={fire.id}
                center={[fire.coordinates[1], fire.coordinates[0]]}
                radius={4}
                pathOptions={{
                  fillColor: '#ff6600',
                  fillOpacity: 0.8,
                  color: '#ff0000',
                  weight: 1,
                }}
                className="animate-pulse"
              >
                <Popup>
                  <div className="text-xs">
                    <strong>🔥 Wildfire</strong>
                    <br />
                    Location: {fire.coordinates[1].toFixed(2)}, {fire.coordinates[0].toFixed(2)}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* AIS Ships */}
            {isLayerEnabled('ais_ships') && aisShips.map((ship) => (
              <Marker
                key={ship.mmsi}
                position={[ship.lat, ship.lng]}
                icon={createShipIcon(ship.shipTypeName, ship.heading || ship.course || 0)}
                eventHandlers={{
                  click: () => setSelectedItem({
                    id: ship.mmsi,
                    name: ship.name,
                    type: 'ship',
                    shipType: ship.shipTypeName,
                    flag: ship.flag,
                    speed: ship.speed,
                    course: ship.course,
                    destination: ship.destination,
                    coordinates: [ship.lng, ship.lat]
                  }),
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{ship.name || 'Unknown Vessel'}</strong>
                    <br />
                    Type: {ship.shipTypeName}
                    <br />
                    Speed: {ship.speed?.toFixed(1) || 'N/A'} knots
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* AIS Status Badge */}
          {isLayerEnabled('ais_ships') && (
            <div className="absolute top-4 left-4 flex items-center gap-2 z-[1000]">
              <Badge className={cn(
                "text-[10px] px-2 py-0.5",
                aisConnected 
                  ? "bg-green-500/20 text-green-400 border-green-500/50" 
                  : "bg-red-500/20 text-red-400 border-red-500/50"
              )}>
                <Ship className="w-3 h-3 mr-1" />
                {aisConnected ? `${aisShipCount} Ships Live` : 'Connecting...'}
              </Badge>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-[1000]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="w-8 h-8 p-0 bg-card border-border hover:bg-accent"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="w-8 h-8 p-0 bg-card border-border hover:bg-accent"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Popup */}
          <MarkerPopup item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>

        {/* Sidebar - Layer Controls */}
        <div className="w-56 bg-card border-l border-border overflow-y-auto">
          {/* Map Style Selector */}
          <div className="p-3 border-b border-border">
            <p className="text-foreground font-bold text-sm mb-2">Map Style</p>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant={mapStyle === 'standard' ? 'default' : 'outline'}
                onClick={() => setMapStyle('standard')}
                className="flex-1 text-[10px] px-1"
              >
                <Map className="w-3 h-3 mr-1" />
                Standard
              </Button>
              <Button 
                size="sm" 
                variant={mapStyle === 'dark' ? 'default' : 'outline'}
                onClick={() => setMapStyle('dark')}
                className="flex-1 text-[10px] px-1"
              >
                <Moon className="w-3 h-3 mr-1" />
                Dark
              </Button>
              <Button 
                size="sm" 
                variant={mapStyle === 'satellite' ? 'default' : 'outline'}
                onClick={() => setMapStyle('satellite')}
                className="flex-1 text-[10px] px-1"
              >
                <Satellite className="w-3 h-3 mr-1" />
                Sat
              </Button>
            </div>
          </div>

          <MapLayers 
            layers={layers} 
            onToggleLayer={handleToggleLayer} 
            onOpenSettings={handleOpenLayerSettings}
          />
        </div>

        {/* AIS Settings Panel */}
        {showAISSettings && (
          <div className="absolute top-12 right-60 w-72 bg-card border border-border rounded-lg shadow-xl z-[1001]">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#00a0ff]" />
                <span className="font-bold text-sm">AIS Settings</span>
              </div>
              <button 
                onClick={() => setShowAISSettings(false)}
                className="p-1 rounded hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={aisApiKey}
                    onChange={(e) => setAisApiKey(e.target.value)}
                    placeholder="Enter AISStream API Key..."
                    className="flex-1 h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs"
                    onClick={() => {
                      aisService.setApiKey(aisApiKey);
                      setTimeout(() => aisService.connect([[[-90, -180], [90, 180]]]), 300);
                      toast.success('API Key saved & reconnecting...');
                    }}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Get free API key at <a href="https://aisstream.io" target="_blank" rel="noopener noreferrer" className="text-[#00a0ff] hover:underline">aisstream.io</a>
                </p>
              </div>

              {/* Connection Status */}
              <div className="p-3 rounded bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge className={cn(
                    "text-[10px]",
                    aisConnected 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-red-500/20 text-red-400"
                  )}>
                    {aisConnected ? '🟢 Connected' : '🔴 Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ships Tracked</span>
                  <span className="text-sm font-mono text-[#00a0ff]">{aisShipCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Ship Type Stats */}
              {aisConnected && aisShips.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">By Type:</span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center justify-between p-1.5 rounded bg-red-500/10">
                      <span>🛢️ Tanker</span>
                      <span className="text-red-400">{aisShips.filter(s => s.shipTypeName === 'Tanker').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-green-500/10">
                      <span>📦 Cargo</span>
                      <span className="text-green-400">{aisShips.filter(s => s.shipTypeName === 'Cargo').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-blue-500/10">
                      <span>🚢 Passenger</span>
                      <span className="text-blue-400">{aisShips.filter(s => s.shipTypeName === 'Passenger').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-yellow-500/10">
                      <span>🎣 Fishing</span>
                      <span className="text-yellow-400">{aisShips.filter(s => s.shipTypeName === 'Fishing').length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => {
                    aisService.clearCache();
                    toast.info('Ship cache cleared');
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear Cache
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => {
                    aisService.disconnect();
                    setTimeout(() => aisService.connect([[[-90, -180], [90, 180]]]), 500);
                    toast.success('Reconnecting...');
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reconnect
                </Button>
              </div>

              {/* API Info */}
              <div className="pt-2 border-t border-border">
                <p className="text-[9px] text-muted-foreground text-center">
                  Powered by AISStream.io • Real-time AIS data
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="h-24 bg-card border-t border-border">
        <DataPanel 
          markets={markets} 
          earthquakes={earthquakes} 
          banks={banks}
          selectedItem={selectedItem}
        />
      </div>
    </div>
  );
};

export default BloombergMap;
