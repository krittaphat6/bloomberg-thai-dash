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
  { id: 'conflicts', name: 'Active Conflicts', icon: '⚔️', enabled: true, color: '#ef4444', description: 'War zones & hotspots' },
  { id: 'military_bases', name: 'Military Bases', icon: '🎖️', enabled: false, color: '#3b82f6', description: '220+ bases worldwide' },
  { id: 'nuclear', name: 'Nuclear Facilities', icon: '☢️', enabled: false, color: '#f59e0b', description: 'Power, enrichment, weapons' },
  { id: 'cables', name: 'Undersea Cables', icon: '🔌', enabled: false, color: '#06b6d4', description: 'Internet backbone' },
  { id: 'pipelines', name: 'Oil & Gas Pipelines', icon: '🛢️', enabled: false, color: '#8b4513', description: 'Major energy routes' },
  { id: 'datacenters', name: 'Data Centers', icon: '🖥️', enabled: false, color: '#8b5cf6', description: 'Hyperscale clusters' },
  { id: 'chokepoints', name: 'Strategic Chokepoints', icon: '⚠️', enabled: true, color: '#ff6600', description: 'Critical trade routes' },
  { id: 'hotspots', name: 'Intel Hotspots', icon: '🎯', enabled: false, color: '#ec4899', description: 'Geopolitical focal points' },
  { id: 'earthquakes', name: 'Earthquakes', icon: '🌋', enabled: false, color: '#ff4444', description: 'USGS real-time data' },
  { id: 'storms', name: 'Active Cyclones', icon: '🌀', enabled: false, color: '#ef4444', description: 'Hurricanes, Typhoons' },
  { id: 'wildfires', name: 'Wildfires/Fires', icon: '🔥', enabled: false, color: '#ff6600', description: 'NASA FIRMS data' },
  { id: 'disasters', name: 'GDACS Disasters', icon: '🌍', enabled: false, color: '#dc2626', description: 'UN disaster alerts' },
  { id: 'ais_ships', name: 'Live AIS Ships', icon: '🚢', enabled: false, color: '#00a0ff', description: 'Real-time vessel tracking', hasSettings: true },
  { id: 'flights', name: 'Live Flights', icon: '✈️', enabled: false, color: '#f59e0b', description: 'OpenSky Network' },
  { id: 'weather_clouds', name: 'Weather: Clouds', icon: '☁️', enabled: false, color: '#a0a0a0', description: 'Global cloud coverage' },
  { id: 'weather_rain', name: 'Weather: Rain', icon: '🌧️', enabled: false, color: '#3b82f6', description: 'Rain radar overlay' },
  { id: 'weather_temp', name: 'Weather: Temp', icon: '🌡️', enabled: false, color: '#ef4444', description: 'Temperature map' },
  { id: 'weather_wind', name: 'Weather: Wind', icon: '💨', enabled: false, color: '#06b6d4', description: 'Wind speed' },
  { id: 'banking', name: 'Central Banks', icon: '🏦', enabled: false, color: '#00a0ff', description: 'Interest rates' },
  { id: 'oil_gas', name: 'Oil & Gas Fields', icon: '⛽', enabled: false, color: '#8b4513', description: 'Fields, refineries' },
  { id: 'shipping', name: 'Ports & Routes', icon: '⚓', enabled: false, color: '#4169e1', description: 'Major ports' },
  { id: 'disease', name: 'Disease Outbreaks', icon: '🦠', enabled: false, color: '#800080', description: 'WHO data' },
];
