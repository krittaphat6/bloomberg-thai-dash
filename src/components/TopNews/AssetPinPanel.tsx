import React, { useState } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AVAILABLE_ASSETS, ASSET_DISPLAY_NAMES, AbleNewsResult } from '@/services/ableNewsIntelligence';

interface PinnedAsset {
  symbol: string;
  addedAt: number;
}

interface AssetPinPanelProps {
  pinnedAssets: PinnedAsset[];
  selectedAsset: string | null;
  analysisResults: Record<string, AbleNewsResult>;
  onPinAsset: (symbol: string) => void;
  onUnpinAsset: (symbol: string) => void;
  onSelectAsset: (symbol: string) => void;
  isAnalyzing: string | null;
}

export const AssetPinPanel: React.FC<AssetPinPanelProps> = ({
  pinnedAssets,
  selectedAsset,
  analysisResults,
  onPinAsset,
  onUnpinAsset,
  onSelectAsset,
  isAnalyzing
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getSentimentIcon = (result: AbleNewsResult | undefined) => {
    if (!result) return <Minus className="h-3 w-3 text-muted-foreground" />;
    
    if (result.P_up_pct > 55) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (result.P_up_pct < 45) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-yellow-500" />;
  };

  const getSignalColor = (result: AbleNewsResult | undefined) => {
    if (!result) return 'bg-muted text-muted-foreground';
    
    const signal = result.trading_signal.signal;
    switch (signal) {
      case 'STRONG_BUY':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'BUY':
        return 'bg-green-400/20 text-green-300 border-green-400/30';
      case 'HOLD':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'SELL':
        return 'bg-red-400/20 text-red-300 border-red-400/30';
      case 'STRONG_SELL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const allAssets = [
    ...AVAILABLE_ASSETS.forex,
    ...AVAILABLE_ASSETS.commodities,
    ...AVAILABLE_ASSETS.crypto,
    ...AVAILABLE_ASSETS.indices
  ];

  const unpinnedAssets = allAssets.filter(
    asset => !pinnedAssets.some(p => p.symbol === asset)
  );

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          📌 Pinned Assets
          <Badge variant="outline" className="text-xs">
            {pinnedAssets.length} / 10
          </Badge>
        </h3>
        
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1"
              disabled={pinnedAssets.length >= 10}
            >
              <Plus className="h-3 w-3" />
              Add Asset
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-auto">
            <DropdownMenuLabel>Forex</DropdownMenuLabel>
            {AVAILABLE_ASSETS.forex.filter(a => !pinnedAssets.some(p => p.symbol === a)).map(asset => (
              <DropdownMenuItem 
                key={asset} 
                onClick={() => { onPinAsset(asset); setIsOpen(false); }}
              >
                {ASSET_DISPLAY_NAMES[asset]} ({asset})
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Commodities</DropdownMenuLabel>
            {AVAILABLE_ASSETS.commodities.filter(a => !pinnedAssets.some(p => p.symbol === a)).map(asset => (
              <DropdownMenuItem 
                key={asset} 
                onClick={() => { onPinAsset(asset); setIsOpen(false); }}
              >
                {ASSET_DISPLAY_NAMES[asset]} ({asset})
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Crypto</DropdownMenuLabel>
            {AVAILABLE_ASSETS.crypto.filter(a => !pinnedAssets.some(p => p.symbol === a)).map(asset => (
              <DropdownMenuItem 
                key={asset} 
                onClick={() => { onPinAsset(asset); setIsOpen(false); }}
              >
                {ASSET_DISPLAY_NAMES[asset]} ({asset})
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Indices</DropdownMenuLabel>
            {AVAILABLE_ASSETS.indices.filter(a => !pinnedAssets.some(p => p.symbol === a)).map(asset => (
              <DropdownMenuItem 
                key={asset} 
                onClick={() => { onPinAsset(asset); setIsOpen(false); }}
              >
                {ASSET_DISPLAY_NAMES[asset]} ({asset})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pinned Assets Grid */}
      {pinnedAssets.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
          <p>No assets pinned yet</p>
          <p className="text-xs mt-1">Click "Add Asset" to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {pinnedAssets.map(({ symbol }) => {
            const result = analysisResults[symbol];
            const isSelected = selectedAsset === symbol;
            const isLoading = isAnalyzing === symbol;
            
            return (
              <div
                key={symbol}
                onClick={() => onSelectAsset(symbol)}
                className={`
                  relative p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }
                  ${isLoading ? 'animate-pulse' : ''}
                `}
              >
                {/* Unpin button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpinAsset(symbol);
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Asset info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    {getSentimentIcon(result)}
                    <span className="font-medium text-sm">{ASSET_DISPLAY_NAMES[symbol]}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">{symbol}</div>
                  
                  {result ? (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-green-400 text-xs font-mono">
                          ↑{result.P_up_pct}%
                        </span>
                        <span className="text-muted-foreground text-xs">/</span>
                        <span className="text-red-400 text-xs font-mono">
                          ↓{result.P_down_pct}%
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 ${getSignalColor(result)}`}
                      >
                        {result.trading_signal.icon} {result.trading_signal.signal}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoading ? 'Analyzing...' : 'Click to analyze'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
