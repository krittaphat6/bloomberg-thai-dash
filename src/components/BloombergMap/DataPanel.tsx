import { TrendingUp, TrendingDown, Activity, Globe, CloudLightning, AlertTriangle, CheckCircle, Radio, CloudRain, Thermometer, Wind, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketData, EarthquakeFeature, BankingFeature } from '@/services/GeoDataService';
import type { CycloneData } from '@/services/GlobalCycloneService';
import { globalCycloneService } from '@/services/GlobalCycloneService';

interface DataPanelProps {
  markets: MarketData[];
  earthquakes: EarthquakeFeature[];
  banks: BankingFeature[];
  cyclones?: CycloneData[];
  selectedItem: any | null;
  weatherLayersEnabled?: {
    clouds: boolean;
    rain: boolean;
    temp: boolean;
    wind: boolean;
  };
}

export const DataPanel = ({ 
  markets, 
  earthquakes, 
  banks, 
  cyclones = [], 
  selectedItem,
  weatherLayersEnabled = { clouds: false, rain: false, temp: false, wind: false }
}: DataPanelProps) => {
  const upMarkets = markets.filter(m => m.changePercent > 0).length;
  const downMarkets = markets.filter(m => m.changePercent < 0).length;
  const recentQuakes = earthquakes.filter(e => Date.now() - e.time < 24 * 60 * 60 * 1000).length;
  const avgMagnitude = earthquakes.length > 0 
    ? (earthquakes.reduce((acc, e) => acc + e.magnitude, 0) / earthquakes.length).toFixed(1)
    : '0.0';

  const noActiveInfo = globalCycloneService.getNoActiveInfo();
  const hasActiveStorms = cyclones.length > 0;

  return (
    <div className="h-full flex">
      {/* Statistics */}
      <div className="flex-1 grid grid-cols-4 gap-2 p-2">
        {/* Markets Summary */}
        <div className="bg-[#1a2744]/80 rounded p-2 border border-[#2d4a6f]">
          <div className="flex items-center gap-1 text-[#ff6600] text-[10px] font-bold mb-1">
            <Globe className="w-3 h-3" />
            MARKETS
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#00ff00]" />
              <span className="text-[#00ff00] text-sm font-bold">{upMarkets}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-[#ff0000]" />
              <span className="text-[#ff0000] text-sm font-bold">{downMarkets}</span>
            </div>
          </div>
          <div className="text-[9px] text-white/50 mt-1">
            {markets.length} exchanges tracked
          </div>
        </div>

        {/* Earthquakes Summary */}
        <div className="bg-[#1a2744]/80 rounded p-2 border border-[#2d4a6f]">
          <div className="flex items-center gap-1 text-[#ff4444] text-[10px] font-bold mb-1">
            <Activity className="w-3 h-3" />
            SEISMIC
          </div>
          <div className="text-white text-sm font-bold">{recentQuakes} events</div>
          <div className="text-[9px] text-white/50 mt-1">
            Avg mag: {avgMagnitude} (24h)
          </div>
        </div>

        {/* Central Banks */}
        <div className="bg-[#1a2744]/80 rounded p-2 border border-[#2d4a6f]">
          <div className="flex items-center gap-1 text-[#00a0ff] text-[10px] font-bold mb-1">
            🏦 BANKS
          </div>
          <div className="text-white text-sm font-bold">{banks.length} banks</div>
          <div className="text-[9px] text-white/50 mt-1">
            FED: {banks.find(b => b.id === 'FED')?.interestRate}%
          </div>
        </div>

        {/* Selected Item Detail */}
        <div className="bg-[#1a2744]/80 rounded p-2 border border-[#2d4a6f]">
          <div className="text-[10px] font-bold text-[#ff6600] mb-1">SELECTED</div>
          {selectedItem ? (
            <div>
              <div className="text-white text-xs font-bold truncate">
                {selectedItem.name || selectedItem.place || 'Unknown'}
              </div>
              <div className="text-[9px] text-white/50 mt-1">
                {selectedItem.type === 'market' && `${selectedItem.changePercent?.toFixed(2)}%`}
                {selectedItem.type === 'earthquake' && `M${selectedItem.magnitude}`}
                {selectedItem.type === 'banking' && `${selectedItem.interestRate}%`}
                {selectedItem.type === 'ship' && `${selectedItem.shipType} • ${selectedItem.speed?.toFixed(1)} kts`}
                {selectedItem.type === 'flight' && `Alt: ${Math.round(selectedItem.altitude)}m • ${Math.round(selectedItem.velocity)} m/s`}
                {selectedItem.type === 'storm' && `Cat ${selectedItem.category} • ${selectedItem.windSpeed} kts`}
                {selectedItem.type === 'cyclone' && `${selectedItem.typeLabel} • ${selectedItem.windSpeed} kts`}
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-white/50">Click on map to select</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="w-64 border-l border-[#2d4a6f] p-2 overflow-y-auto">
        {/* Real-time Weather Status */}
        <div className="mb-3">
          <div className="flex items-center gap-1 text-[#00d4ff] text-[10px] font-bold mb-2">
            <Radio className="w-3 h-3 animate-pulse" />
            REAL-TIME WEATHER DATA
          </div>
          
          <div className="grid grid-cols-2 gap-1 text-[8px]">
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded",
              weatherLayersEnabled.clouds ? "bg-blue-500/20 text-blue-300" : "bg-gray-700/30 text-gray-500"
            )}>
              <Cloud className="w-2.5 h-2.5" />
              <span>Clouds</span>
              {weatherLayersEnabled.clouds && <CheckCircle className="w-2 h-2 ml-auto" />}
            </div>
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded",
              weatherLayersEnabled.rain ? "bg-cyan-500/20 text-cyan-300" : "bg-gray-700/30 text-gray-500"
            )}>
              <CloudRain className="w-2.5 h-2.5" />
              <span>Rain</span>
              {weatherLayersEnabled.rain && <CheckCircle className="w-2 h-2 ml-auto" />}
            </div>
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded",
              weatherLayersEnabled.temp ? "bg-orange-500/20 text-orange-300" : "bg-gray-700/30 text-gray-500"
            )}>
              <Thermometer className="w-2.5 h-2.5" />
              <span>Temp</span>
              {weatherLayersEnabled.temp && <CheckCircle className="w-2 h-2 ml-auto" />}
            </div>
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded",
              weatherLayersEnabled.wind ? "bg-teal-500/20 text-teal-300" : "bg-gray-700/30 text-gray-500"
            )}>
              <Wind className="w-2.5 h-2.5" />
              <span>Wind</span>
              {weatherLayersEnabled.wind && <CheckCircle className="w-2 h-2 ml-auto" />}
            </div>
          </div>
          
          <div className="text-[7px] text-white/40 mt-1">
            Data from OpenWeatherMap (Real-time)
          </div>
        </div>

        <div className="text-[10px] font-bold text-[#ff6600] mb-2">LEGEND</div>
        <div className="space-y-1 text-[9px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00ff00]" />
            <span className="text-white/80">Market Up</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff0000]" />
            <span className="text-white/80">Market Down</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff4444] animate-pulse" />
            <span className="text-white/80">Earthquake</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00a0ff]" />
            <span className="text-white/80">Central Bank</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff6600]" />
            <span className="text-white/80">Wildfire</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 flex items-center justify-center">
              <span className="text-[8px]">✈️</span>
            </div>
            <span className="text-white/80">Flight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 flex items-center justify-center">
              <span className="text-[8px]">🚢</span>
            </div>
            <span className="text-white/80">Ship</span>
          </div>
        </div>

        {/* Active Cyclones Section - REAL-TIME ONLY */}
        <div className="mt-3 pt-2 border-t border-[#2d4a6f]">
          <div className="flex items-center gap-1 text-[10px] font-bold mb-2">
            <CloudLightning className="w-3 h-3 text-[#ef4444]" />
            <span className="text-[#ef4444]">TROPICAL CYCLONES</span>
            <span className="text-[7px] text-green-400 ml-1">(REAL-TIME)</span>
          </div>
          
          {hasActiveStorms ? (
            <div className="space-y-1.5">
              {cyclones.map((c) => (
                <div key={c.id} className="bg-[#0a1628]/50 rounded p-1.5 border border-[#2d4a6f]/50">
                  <div className="flex items-center gap-2 text-[9px]">
                    <div 
                      className="w-2.5 h-2.5 rounded-full animate-pulse" 
                      style={{ backgroundColor: getCategoryColor(c.category) }}
                    />
                    <span className="text-white/90 font-medium">{c.name}</span>
                    <span className="text-white/50 ml-auto">{c.typeLabel}</span>
                  </div>
                  
                  {/* Forecast summary */}
                  {c.forecastTrack && c.forecastTrack.length > 1 && (
                    <div className="mt-1 text-[8px] text-white/60">
                      <div className="flex items-center gap-1">
                        <span>📍 {c.windSpeed}kts → </span>
                        <span className={cn(
                          c.forecastTrack[c.forecastTrack.length - 1].windSpeed > c.windSpeed 
                            ? "text-red-400" 
                            : "text-green-400"
                        )}>
                          {c.forecastTrack[c.forecastTrack.length - 1].windSpeed}kts
                        </span>
                        <span className="text-white/40">
                          ({c.forecastTrack.length - 1} pts)
                        </span>
                      </div>
                      <div className="text-white/40">
                        Track: {c.movement.direction} @ {c.movement.speed}mph
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#0a1628]/50 rounded p-2 border border-[#2d4a6f]/50">
              <div className="flex items-center gap-1.5 text-[9px] text-green-400 mb-1">
                <CheckCircle className="w-3 h-3" />
                <span>No Active Cyclones</span>
              </div>
              
              {noActiveInfo && (
                <div className="text-[8px] text-white/50 space-y-1">
                  <p>This is normal seasonal behavior.</p>
                  <div className="mt-1.5">
                    <p className="text-white/60 font-medium mb-0.5">Hurricane Seasons:</p>
                    {noActiveInfo.regions.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex justify-between text-[7px]">
                        <span>{r.name.replace(' Hurricane Season', '').replace(' Typhoon Season', '').replace(' Cyclone Season', '')}</span>
                        <span className="text-white/40">{r.period}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-1.5 text-[7px] text-white/40">
                Sources: {noActiveInfo?.sources.join(', ') || 'NOAA NHC, JMA, JTWC'}
              </div>
            </div>
          )}
        </div>

        {/* Saffir-Simpson Scale */}
        <div className="mt-3 pt-2 border-t border-[#2d4a6f]">
          <div className="text-[9px] text-white/60 mb-1">Saffir-Simpson Scale</div>
          <div className="grid grid-cols-6 gap-0.5">
            {['TS', '1', '2', '3', '4', '5'].map((label, i) => (
              <div key={label} className="text-center">
                <div 
                  className="w-3 h-3 mx-auto rounded-full" 
                  style={{ backgroundColor: getCategoryColor(i) }}
                />
                <span className="text-[7px] text-white/50">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wind Field Forecast Legend */}
        <div className="mt-2 text-[8px]">
          <div className="text-white/60 mb-1">Forecast Track</div>
          <div className="flex items-center gap-1">
            <div className="w-8 border-t-2 border-dashed border-white/60" />
            <span className="text-white/50">Projected Path</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-2 h-2 rounded-full border-2 border-white/60" />
            <span className="text-white/50">Time Points</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function getCategoryColor(category: number): string {
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
