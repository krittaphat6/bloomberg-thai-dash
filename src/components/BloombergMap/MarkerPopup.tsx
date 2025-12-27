import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketData, EarthquakeFeature, BankingFeature, PortFeature, OilGasFeature } from '@/services/GeoDataService';

interface MarkerPopupProps {
  item: MarketData | EarthquakeFeature | BankingFeature | PortFeature | OilGasFeature | null;
  onClose: () => void;
}

export const MarkerPopup = ({ item, onClose }: MarkerPopupProps) => {
  if (!item) return null;

  const renderContent = () => {
    if (item.type === 'market') {
      const market = item as MarketData;
      const isUp = market.changePercent > 0;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#ff6600] font-bold">{market.id}</span>
            <span className={cn("text-sm font-bold", isUp ? "text-[#00ff00]" : "text-[#ff0000]")}>
              {isUp ? '+' : ''}{market.changePercent.toFixed(2)}%
            </span>
          </div>
          <div className="text-white text-xs">{market.name}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/50">Country:</span>
              <span className="text-white ml-1">{market.country}</span>
            </div>
            <div>
              <span className="text-white/50">Currency:</span>
              <span className="text-white ml-1">{market.currency}</span>
            </div>
            <div>
              <span className="text-white/50">Volume:</span>
              <span className="text-white ml-1">{(market.volume / 1000000).toFixed(1)}M</span>
            </div>
            <div>
              <span className="text-white/50">Symbol:</span>
              <span className="text-white ml-1">{market.symbol}</span>
            </div>
          </div>
        </div>
      );
    }

    if (item.type === 'earthquake') {
      const quake = item as EarthquakeFeature;
      const magColor = quake.magnitude >= 6 ? '#ff0000' : quake.magnitude >= 5 ? '#ff6600' : '#ffcc00';
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#ff4444] font-bold">🌋 EARTHQUAKE</span>
            <span className="text-xl font-bold" style={{ color: magColor }}>
              M{quake.magnitude.toFixed(1)}
            </span>
          </div>
          <div className="text-white text-xs">{quake.place}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/50">Depth:</span>
              <span className="text-white ml-1">{quake.depth.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-white/50">Time:</span>
              <span className="text-white ml-1">{new Date(quake.time).toLocaleTimeString()}</span>
            </div>
          </div>
          <a 
            href={quake.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#00a0ff] text-[10px] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View on USGS
          </a>
        </div>
      );
    }

    if (item.type === 'banking') {
      const bank = item as BankingFeature;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#00a0ff] font-bold">🏦 {bank.id}</span>
            <span className="text-lg font-bold text-white">{bank.interestRate}%</span>
          </div>
          <div className="text-white text-xs">{bank.name}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/50">Country:</span>
              <span className="text-white ml-1">{bank.country}</span>
            </div>
            <div>
              <span className="text-white/50">Currency:</span>
              <span className="text-white ml-1">{bank.currency}</span>
            </div>
          </div>
        </div>
      );
    }

    if (item.type === 'port') {
      const port = item as PortFeature;
      return (
        <div className="space-y-2">
          <div className="text-[#4169e1] font-bold">🚢 {port.name}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/50">Country:</span>
              <span className="text-white ml-1">{port.country}</span>
            </div>
            <div>
              <span className="text-white/50">Volume:</span>
              <span className="text-white ml-1">{port.volume?.toLocaleString()} TEU</span>
            </div>
          </div>
        </div>
      );
    }

    if (item.type === 'oil_gas') {
      const facility = item as OilGasFeature;
      return (
        <div className="space-y-2">
          <div className="text-[#8b4513] font-bold">🛢️ {facility.name}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-white/50">Type:</span>
              <span className="text-white ml-1 capitalize">{facility.facilityType}</span>
            </div>
            <div>
              <span className="text-white/50">Country:</span>
              <span className="text-white ml-1">{facility.country}</span>
            </div>
            {facility.production && (
              <div className="col-span-2">
                <span className="text-white/50">Production:</span>
                <span className="text-white ml-1">{facility.production} kbd</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="absolute top-4 left-4 z-50 bg-[#0a1628]/95 border border-[#2d4a6f] rounded-lg p-3 min-w-[250px] max-w-[300px] shadow-xl backdrop-blur-sm">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-white/50 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
      {renderContent()}
    </div>
  );
};
