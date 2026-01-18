import { TrendingUp, TrendingDown, Activity, Globe, CloudLightning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketData, EarthquakeFeature, BankingFeature } from '@/services/GeoDataService';
import type { CycloneData } from '@/services/GlobalCycloneService';

interface DataPanelProps {
  markets: MarketData[];
  earthquakes: EarthquakeFeature[];
  banks: BankingFeature[];
  cyclones?: CycloneData[];
  selectedItem: any | null;
}

export const DataPanel = ({ markets, earthquakes, banks, cyclones = [], selectedItem }: DataPanelProps) => {
  const upMarkets = markets.filter(m => m.changePercent > 0).length;
  const downMarkets = markets.filter(m => m.changePercent < 0).length;
  const recentQuakes = earthquakes.filter(e => Date.now() - e.time < 24 * 60 * 60 * 1000).length;
  const avgMagnitude = earthquakes.length > 0 
    ? (earthquakes.reduce((acc, e) => acc + e.magnitude, 0) / earthquakes.length).toFixed(1)
    : '0.0';

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
      <div className="w-56 border-l border-[#2d4a6f] p-2 overflow-y-auto">
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

        {/* Active Cyclones Section */}
        <div className="mt-3 pt-2 border-t border-[#2d4a6f]">
          <div className="flex items-center gap-1 text-[#ef4444] text-[10px] font-bold mb-2">
            <CloudLightning className="w-3 h-3" />
            ACTIVE CYCLONES
          </div>
          
          {cyclones.length > 0 ? (
            <div className="space-y-1.5">
              {cyclones.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-[9px]">
                  <div 
                    className="w-2.5 h-2.5 rounded-full animate-pulse" 
                    style={{ backgroundColor: getCategoryColor(c.category) }}
                  />
                  <span className="text-white/90">{c.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[9px] text-white/50">No active cyclones</div>
          )}

          {/* Cyclone Wind Fields Forecast Legend */}
          <div className="mt-3 text-[9px]">
            <div className="text-white/60 mb-1">Cyclone Wind Fields Forecast</div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 rounded-sm opacity-60" style={{ background: 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)' }} />
                <span className="text-white/70">39.1 (mph) 57.5</span>
                <span className="text-white/50">73.7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Saffir-Simpson Scale */}
        <div className="mt-3 pt-2 border-t border-[#2d4a6f]">
          <div className="text-[9px] text-white/60 mb-1">Saffir-Simpson Scale</div>
          <div className="grid grid-cols-6 gap-0.5">
            <div className="text-center">
              <div className="w-3 h-3 mx-auto rounded-full bg-[#22c55e]" />
              <span className="text-[7px] text-white/50">TS</span>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 mx-auto rounded-full bg-[#84cc16]" />
              <span className="text-[7px] text-white/50">1</span>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 mx-auto rounded-full bg-[#eab308]" />
              <span className="text-[7px] text-white/50">2</span>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 mx-auto rounded-full bg-[#f97316]" />
              <span className="text-[7px] text-white/50">3</span>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 mx-auto rounded-full bg-[#ef4444]" />
              <span className="text-[7px] text-white/50">4</span>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 mx-auto rounded-full bg-[#dc2626]" />
              <span className="text-[7px] text-white/50">5</span>
            </div>
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
