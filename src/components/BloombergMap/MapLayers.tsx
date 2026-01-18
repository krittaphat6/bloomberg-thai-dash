import { Check, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LayerConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  color: string;
  description: string;
  hasSettings?: boolean;
}

interface MapLayersProps {
  layers: LayerConfig[];
  onToggleLayer: (layerId: string) => void;
  onOpenSettings?: (layerId: string) => void;
}

export const MapLayers = ({ layers, onToggleLayer, onOpenSettings }: MapLayersProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-[#2d4a6f]">
        <h2 className="text-sm font-bold text-[#ff6600]">DATA LAYERS</h2>
        <p className="text-[10px] text-white/60 mt-1">Toggle layers on/off</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onToggleLayer(layer.id)}
            className={cn(
              "w-full flex items-center gap-2 p-2 rounded transition-all text-left",
              "hover:bg-white/5",
              layer.enabled ? "bg-white/10" : "bg-transparent"
            )}
          >
            <div 
              className={cn(
                "w-4 h-4 rounded flex items-center justify-center",
                layer.enabled ? "bg-[#00ff00]" : "border border-white/30"
              )}
            >
              {layer.enabled && <Check className="w-3 h-3 text-black" />}
            </div>
            
            <span className="text-base">{layer.icon}</span>
            
            <div className="flex-1 min-w-0">
              <div className={cn(
                "text-xs font-medium truncate",
                layer.enabled ? "text-white" : "text-white/70"
              )}>
                {layer.name}
              </div>
              <div className="text-[9px] text-white/50 truncate">
                {layer.description}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {layer.hasSettings && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenSettings?.(layer.id);
                  }}
                  className="p-1 rounded hover:bg-white/20 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-3 h-3 text-white/60 hover:text-white" />
                </button>
              )}
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: layer.color }}
              />
            </div>
          </button>
        ))}
      </div>
      
      <div className="p-3 border-t border-[#2d4a6f]">
        <div className="text-[10px] text-white/50">
          <div className="flex justify-between">
            <span>Active layers:</span>
            <span className="text-[#00ff00]">{layers.filter(l => l.enabled).length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Total layers:</span>
            <span>{layers.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'markets', name: 'World Equity Markets', icon: '📈', enabled: true, color: '#00ff00', description: 'Stock exchanges worldwide' },
  { id: 'earthquakes', name: 'Earthquakes', icon: '🌋', enabled: false, color: '#ff4444', description: 'USGS real-time data' },
  { id: 'ais_ships', name: 'Live AIS Ships', icon: '🚢', enabled: false, color: '#00a0ff', description: 'Real-time vessel tracking', hasSettings: true },
  { id: 'flights', name: 'Live Flights', icon: '✈️', enabled: false, color: '#f59e0b', description: 'OpenSky Network real-time' },
  { id: 'storms', name: 'Active Storms', icon: '🌀', enabled: false, color: '#ef4444', description: 'NOAA hurricanes & storms' },
  { id: 'wildfires', name: 'Wildfires', icon: '🔥', enabled: false, color: '#ff6600', description: 'NASA FIRMS data' },
  { id: 'banking', name: 'Central Banks', icon: '🏦', enabled: false, color: '#00a0ff', description: 'Interest rates & meetings' },
  { id: 'oil_gas', name: 'Oil & Gas', icon: '🛢️', enabled: false, color: '#8b4513', description: 'Fields, refineries, LNG' },
  { id: 'shipping', name: 'Ports & Routes', icon: '⚓', enabled: false, color: '#4169e1', description: 'Major ports worldwide' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭', enabled: false, color: '#808080', description: 'PMI data by country' },
  { id: 'retail', name: 'Retail', icon: '🛒', enabled: false, color: '#9932cc', description: 'Consumer confidence' },
  { id: 'agriculture', name: 'Agriculture', icon: '🌾', enabled: false, color: '#228b22', description: 'Commodity regions' },
  { id: 'power', name: 'Power/Energy', icon: '⚡', enabled: false, color: '#ffd700', description: 'Power plants & grid' },
  { id: 'metals', name: 'Metal Mines', icon: '⛏️', enabled: false, color: '#cd853f', description: 'Gold, silver, copper' },
  { id: 'natgas', name: 'Natural Gas', icon: '🔵', enabled: false, color: '#87ceeb', description: 'LNG terminals, pipelines' },
  { id: 'infrastructure', name: 'Infrastructure', icon: '🏗️', enabled: false, color: '#708090', description: 'Major projects' },
  { id: 'disease', name: 'Disease Outbreaks', icon: '🦠', enabled: false, color: '#800080', description: 'WHO data' },
];
