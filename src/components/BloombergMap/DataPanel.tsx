import { TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketData, EarthquakeFeature, BankingFeature } from '@/services/GeoDataService';

interface DataPanelProps {
  markets: MarketData[];
  earthquakes: EarthquakeFeature[];
  banks: BankingFeature[];
  selectedItem: any | null;
}

export const DataPanel = ({ markets, earthquakes, banks, selectedItem }: DataPanelProps) => {
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
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-white/50">Click on map to select</div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="w-48 border-l border-[#2d4a6f] p-2">
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
        </div>
      </div>
    </div>
  );
};
