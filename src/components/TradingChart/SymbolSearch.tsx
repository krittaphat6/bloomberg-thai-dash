import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Star, TrendingUp, Bitcoin, DollarSign, Globe, BarChart3, Landmark, Flame, LineChart, Loader2 } from 'lucide-react';
import { ChartSymbol, chartDataService } from '@/services/ChartDataService';

interface SymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: ChartSymbol) => void;
  currentSymbol?: ChartSymbol;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
}

const TYPE_ICONS: Record<string, any> = {
  crypto: Bitcoin,
  stock: TrendingUp,
  forex: DollarSign,
  set: Globe,
  futures: Flame,
  commodity: BarChart3,
  index: LineChart,
  bond: Landmark,
};

const TYPE_COLORS: Record<string, string> = {
  crypto: 'text-orange-500',
  stock: 'text-green-500',
  forex: 'text-blue-500',
  set: 'text-purple-500',
  futures: 'text-red-500',
  commodity: 'text-yellow-500',
  index: 'text-cyan-500',
  bond: 'text-emerald-500',
};

const ASSET_TYPES = [
  { key: null, label: 'All' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'stock', label: 'Stocks' },
  { key: 'forex', label: 'Forex' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'index', label: 'Indices' },
  { key: 'futures', label: 'Futures' },
  { key: 'bond', label: 'Bonds' },
  { key: 'set', label: 'SET' },
] as const;

const SymbolSearch: React.FC<SymbolSearchProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol,
  favorites,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [screenerResults, setScreenerResults] = useState<ChartSymbol[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const defaultSymbols = useMemo(() => chartDataService.getSymbolsList(), []);

  // Debounced screener search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setScreenerResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await chartDataService.searchViaScreener(searchQuery);
        setScreenerResults(results);
      } catch {
        setScreenerResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredSymbols = useMemo(() => {
    // Merge default + screener results
    const allSymbols = [...defaultSymbols];
    const seen = new Set(allSymbols.map(s => s.symbol));
    screenerResults.forEach(s => {
      if (!seen.has(s.symbol)) {
        allSymbols.push(s);
        seen.add(s.symbol);
      }
    });

    let result = allSymbols;

    if (selectedType) {
      result = result.filter(s => s.type === selectedType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.symbol.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.exchange.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then by name
    return result.sort((a, b) => {
      const aFav = favorites.includes(a.symbol);
      const bFav = favorites.includes(b.symbol);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [defaultSymbols, screenerResults, searchQuery, selectedType, favorites]);

  const handleSelect = (symbol: ChartSymbol) => {
    onSelectSymbol(symbol);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-green font-mono flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Any Asset — Global Markets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks, crypto, forex, commodities, indices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-background border-border focus:border-terminal-green"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-terminal-green" />
            )}
          </div>

          {/* Type filters — scrollable */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {ASSET_TYPES.map(({ key, label }) => {
              const Icon = key ? TYPE_ICONS[key] : Search;
              const isActive = selectedType === key;
              return (
                <Button
                  key={label}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(key)}
                  className={`gap-1 shrink-0 text-xs ${isActive ? 'bg-terminal-green text-black' : 'border-border'}`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {label}
                </Button>
              );
            })}
          </div>

          {/* Results count */}
          <div className="text-[10px] text-muted-foreground px-1">
            {filteredSymbols.length} results
            {screenerResults.length > 0 && ` • ${screenerResults.length} from global search`}
          </div>

          {/* Symbol list */}
          <div className="max-h-[400px] overflow-y-auto space-y-0.5">
            {filteredSymbols.map(symbol => {
              const Icon = TYPE_ICONS[symbol.type] || Globe;
              const isFavorite = favorites.includes(symbol.symbol);
              const isSelected = currentSymbol?.symbol === symbol.symbol;

              return (
                <div
                  key={`${symbol.exchange}:${symbol.symbol}`}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-terminal-green/20 border border-terminal-green/50'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelect(symbol)}
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleFavorite(symbol.symbol);
                    }}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                      }`}
                    />
                  </button>

                  <Icon className={`w-4 h-4 ${TYPE_COLORS[symbol.type] || 'text-muted-foreground'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm text-foreground">
                        {symbol.symbol}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {symbol.exchange}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${TYPE_COLORS[symbol.type] || ''}`}>
                        {symbol.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{symbol.name}</p>
                  </div>
                </div>
              );
            })}

            {filteredSymbols.length === 0 && !isSearching && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No symbols found — try searching for any ticker
              </div>
            )}
            {isSearching && filteredSymbols.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching global markets...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SymbolSearch;
