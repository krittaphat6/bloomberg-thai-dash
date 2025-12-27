import { useState, useCallback, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { cn } from '@/lib/utils';
import { useEarthquakeData } from '@/hooks/useEarthquakeData';
import { useMarketMapData, useCentralBanks, usePorts, useOilGas, useWildfires } from '@/hooks/useMarketMapData';
import { MapLayers, DEFAULT_LAYERS, LayerConfig } from './MapLayers';
import { DataPanel } from './DataPanel';
import { MarkerPopup } from './MarkerPopup';
import { MarketData, EarthquakeFeature, BankingFeature } from '@/services/GeoDataService';
import { 
  Search, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut,
  RefreshCw,
  Camera,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Fetch data
  const { data: earthquakes = [], isLoading: loadingEQ, refetch: refetchEQ } = useEarthquakeData();
  const { data: markets = [], isLoading: loadingMarkets, refetch: refetchMarkets } = useMarketMapData();
  const { data: banks = [] } = useCentralBanks();
  const { data: ports = [] } = usePorts();
  const { data: oilGas = [] } = useOilGas();
  const { data: wildfires = [] } = useWildfires();

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
    toast.success('Data refreshed');
  }, [refetchEQ, refetchMarkets]);

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

  return (
    <div className={cn(
      "flex flex-col bg-[#0a1628] text-white overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : "h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a2744] border-b border-[#2d4a6f]">
        <div className="flex items-center gap-4">
          <h1 className="text-[#ff6600] font-bold text-sm">BLOOMBERG GLOBAL MAP</h1>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50" />
            <Input
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-7 pl-7 text-xs bg-[#0a1628] border-[#2d4a6f] text-white"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-white/60">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString()}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={cn("w-3 h-3", (loadingEQ || loadingMarkets) && "animate-spin")} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScreenshot}
            className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <Camera className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-7 px-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative bg-[#0a1628]">
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
                      fill="#1a2744"
                      stroke="#2d4a6f"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: '#2d4a6f', outline: 'none' },
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
            </ZoomableGroup>
          </ComposableMap>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="w-8 h-8 p-0 bg-[#1a2744] border-[#2d4a6f] text-white hover:bg-[#2d4a6f]"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="w-8 h-8 p-0 bg-[#1a2744] border-[#2d4a6f] text-white hover:bg-[#2d4a6f]"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Popup */}
          <MarkerPopup item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>

        {/* Sidebar - Layer Controls */}
        <div className="w-56 bg-[#1a2744] border-l border-[#2d4a6f]">
          <MapLayers layers={layers} onToggleLayer={handleToggleLayer} />
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="h-24 bg-[#1a2744] border-t border-[#2d4a6f]">
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
