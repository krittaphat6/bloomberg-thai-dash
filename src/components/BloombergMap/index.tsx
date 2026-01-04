import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
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
  Anchor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface BloombergMapProps {
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const BloombergMap = ({ className, isFullscreen, onToggleFullscreen }: BloombergMapProps) => {
  const [layers, setLayers] = useState<LayerConfig[]>(DEFAULT_LAYERS);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AIS Ships state
  const [aisShips, setAisShips] = useState<AISShipData[]>([]);
  const [aisConnected, setAisConnected] = useState(false);
  const [aisShipCount, setAisShipCount] = useState(0);

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
    setPosition(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 8) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPosition(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 1) }));
  }, []);

  const handleMoveEnd = useCallback((position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
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

  const getMarketColor = (market: MarketData) => {
    if (market.changePercent > 1) return '#00ff00';
    if (market.changePercent > 0) return '#00cc00';
    if (market.changePercent < -1) return '#ff0000';
    if (market.changePercent < 0) return '#cc0000';
    return '#ffcc00';
  };

  const getEarthquakeSize = (magnitude: number) => {
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
              className="w-48 h-7 pl-7 text-xs bg-background border-border"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 100 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={handleMoveEnd}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: 'hsl(var(--accent))', outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Market Markers */}
              {isLayerEnabled('markets') && markets.map((market) => (
                <Marker
                  key={market.id}
                  coordinates={market.coordinates}
                  onClick={() => setSelectedItem(market)}
                >
                  <circle
                    r={6 / position.zoom}
                    fill={getMarketColor(market)}
                    stroke="#fff"
                    strokeWidth={0.5 / position.zoom}
                    style={{ cursor: 'pointer' }}
                  />
                </Marker>
              ))}

              {/* Earthquake Markers */}
              {isLayerEnabled('earthquakes') && earthquakes.map((quake) => (
                <Marker
                  key={quake.id}
                  coordinates={quake.coordinates}
                  onClick={() => setSelectedItem(quake)}
                >
                  <circle
                    r={getEarthquakeSize(quake.magnitude) / position.zoom}
                    fill="rgba(255, 68, 68, 0.6)"
                    stroke="#ff4444"
                    strokeWidth={1 / position.zoom}
                    style={{ cursor: 'pointer' }}
                    className="animate-pulse"
                  />
                </Marker>
              ))}

              {/* Banking Markers */}
              {isLayerEnabled('banking') && banks.map((bank) => (
                <Marker
                  key={bank.id}
                  coordinates={bank.coordinates}
                  onClick={() => setSelectedItem(bank)}
                >
                  <circle
                    r={8 / position.zoom}
                    fill="#00a0ff"
                    stroke="#fff"
                    strokeWidth={0.5 / position.zoom}
                    style={{ cursor: 'pointer' }}
                  />
                  <text
                    textAnchor="middle"
                    y={3 / position.zoom}
                    style={{ 
                      fontSize: `${8 / position.zoom}px`, 
                      fill: '#fff',
                      fontWeight: 'bold',
                      pointerEvents: 'none'
                    }}
                  >
                    🏦
                  </text>
                </Marker>
              ))}

              {/* Shipping/Port Markers */}
              {isLayerEnabled('shipping') && ports.map((port) => (
                <Marker
                  key={port.id}
                  coordinates={port.coordinates}
                  onClick={() => setSelectedItem(port)}
                >
                  <circle
                    r={5 / position.zoom}
                    fill="#4169e1"
                    stroke="#fff"
                    strokeWidth={0.5 / position.zoom}
                    style={{ cursor: 'pointer' }}
                  />
                </Marker>
              ))}

              {/* Oil & Gas Markers */}
              {isLayerEnabled('oil_gas') && oilGas.map((facility) => (
                <Marker
                  key={facility.id}
                  coordinates={facility.coordinates}
                  onClick={() => setSelectedItem(facility)}
                >
                  <circle
                    r={5 / position.zoom}
                    fill="#8b4513"
                    stroke="#fff"
                    strokeWidth={0.5 / position.zoom}
                    style={{ cursor: 'pointer' }}
                  />
                </Marker>
              ))}

              {/* Wildfire Markers */}
              {isLayerEnabled('wildfires') && wildfires.map((fire) => (
                <Marker
                  key={fire.id}
                  coordinates={fire.coordinates}
                >
                  <circle
                    r={4 / position.zoom}
                    fill="#ff6600"
                    stroke="#ff0000"
                    strokeWidth={0.5 / position.zoom}
                    className="animate-pulse"
                  />
                </Marker>
              ))}

              {/* AIS Ships Markers */}
              {isLayerEnabled('ais_ships') && aisShips.map((ship) => (
                <Marker
                  key={ship.mmsi}
                  coordinates={[ship.lng, ship.lat]}
                  onClick={() => setSelectedItem({
                    id: ship.mmsi,
                    name: ship.name,
                    type: 'ship',
                    shipType: ship.shipTypeName,
                    flag: ship.flag,
                    speed: ship.speed,
                    course: ship.course,
                    destination: ship.destination,
                    coordinates: [ship.lng, ship.lat]
                  })}
                >
                  <g transform={`rotate(${ship.heading || ship.course || 0})`}>
                    <polygon
                      points="0,-5 3,5 0,3 -3,5"
                      fill={getShipColor(ship.shipTypeName)}
                      stroke="#fff"
                      strokeWidth={0.3 / position.zoom}
                      style={{ 
                        cursor: 'pointer',
                        filter: `drop-shadow(0 0 2px ${getShipColor(ship.shipTypeName)})`
                      }}
                      transform={`scale(${1 / position.zoom})`}
                    />
                  </g>
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>

          {/* AIS Status Badge */}
          {isLayerEnabled('ais_ships') && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
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
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
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
        <div className="w-56 bg-card border-l border-border">
          <MapLayers layers={layers} onToggleLayer={handleToggleLayer} />
        </div>
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
