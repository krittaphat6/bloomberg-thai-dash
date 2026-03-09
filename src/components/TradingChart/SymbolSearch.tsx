import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const ASSET_TYPES = [
  { key: null, label: 'All', icon: Search },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
  { key: 'stock', label: 'Stocks', icon: TrendingUp },
  { key: 'forex', label: 'Forex', icon: DollarSign },
  { key: 'commodity', label: 'Commodities', icon: BarChart3 },
  { key: 'index', label: 'Indices', icon: LineChart },
  { key: 'futures', label: 'Futures', icon: Flame },
  { key: 'bond', label: 'Bonds', icon: Landmark },
  { key: 'set', label: 'SET', icon: Globe },
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
  const [cryptoSymbols, setCryptoSymbols] = useState<ChartSymbol[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const defaultSymbols = useMemo(() => chartDataService.getSymbolsList(), []);

  // Load all crypto symbols when crypto tab is selected
  useEffect(() => {
    if (selectedType === 'crypto' && cryptoSymbols.length === 0) {
      chartDataService.loadAllCryptoSymbols().then(setCryptoSymbols).catch(() => {});
    }
  }, [selectedType, cryptoSymbols.length]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setScreenerResults([]);
    }
  }, [isOpen]);

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
    // Build full symbol pool
    const seen = new Set<string>();
    const allSymbols: ChartSymbol[] = [];

    const addUnique = (s: ChartSymbol) => {
      if (!seen.has(s.symbol)) {
        allSymbols.push(s);
        seen.add(s.symbol);
      }
    };

    // Add defaults first
    defaultSymbols.forEach(addUnique);

    // Add loaded crypto symbols
    if (selectedType === 'crypto' || !selectedType) {
      cryptoSymbols.forEach(addUnique);
    }

    // Add screener results
    screenerResults.forEach(addUnique);

    let result = allSymbols;

    // Filter by type
    if (selectedType) {
      result = result.filter(s => s.type === selectedType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.symbol.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.exchange.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then alphabetical
    return result.sort((a, b) => {
      const aFav = favorites.includes(a.symbol) ? 0 : 1;
      const bFav = favorites.includes(b.symbol) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [defaultSymbols, cryptoSymbols, screenerResults, searchQuery, selectedType, favorites]);

  const handleSelect = (symbol: ChartSymbol) => {
    onSelectSymbol(symbol);
    onClose();
  };

  // Count per type for badges
  const typeCounts = useMemo(() => {
    const base = [...defaultSymbols];
    const seen = new Set(base.map(s => s.symbol));
    cryptoSymbols.forEach(s => { if (!seen.has(s.symbol)) { base.push(s); seen.add(s.symbol); } });
    const counts: Record<string, number> = {};
    base.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
    counts['all'] = base.length;
    return counts;
  }, [defaultSymbols, cryptoSymbols]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 bg-card border-terminal-green/30 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-terminal-green font-mono flex items-center gap-2 text-base">
            <Search className="w-4 h-4" />
            Search Any Asset — Global Markets
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ticker, name, exchange..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-10 bg-background border-terminal-green/40 focus:border-terminal-green font-mono text-sm"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-terminal-green" />
            )}
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="px-5 pb-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {ASSET_TYPES.map(({ key, label, icon: Icon }) => {
              const isActive = selectedType === key;
              const count = key ? typeCounts[key] || 0 : typeCounts['all'] || 0;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedType(key)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition-all
                    ${isActive
                      ? 'bg-terminal-green text-black font-semibold shadow-[0_0_8px_hsl(var(--terminal-green)/0.3)]'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                  {count > 0 && (
                    <span className={`text-[9px] ${isActive ? 'text-black/60' : 'text-muted-foreground/60'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-5" />

        {/* Results count */}
        <div className="px-5 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">
            {filteredSymbols.length} results
            {screenerResults.length > 0 && (
              <span className="text-terminal-green"> • {screenerResults.length} from global search</span>
            )}
          </span>
          {isSearching && (
            <span className="text-[10px] text-terminal-green font-mono flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching...
            </span>
          )}
        </div>

        {/* Symbol list */}
        <ScrollArea className="h-[420px]">
          <div className="px-3 pb-3">
            {filteredSymbols.length > 0 ? (
              <div className="grid gap-0.5">
                {filteredSymbols.map(symbol => {
                  const Icon = TYPE_ICONS[symbol.type] || Globe;
                  const isFavorite = favorites.includes(symbol.symbol);
                  const isSelected = currentSymbol?.symbol === symbol.symbol;

                  return (
                    <div
                      key={`${symbol.exchange}:${symbol.symbol}`}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all group
                        ${isSelected
                          ? 'bg-terminal-green/15 ring-1 ring-terminal-green/40'
                          : 'hover:bg-muted/40'
                        }
                      `}
                      onClick={() => handleSelect(symbol)}
                    >
                      {/* Favorite star */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFavorite(symbol.symbol);
                        }}
                        className="shrink-0 p-0.5 rounded hover:bg-muted/60 transition-colors"
                      >
                        <Star
                          className={`w-3.5 h-3.5 transition-colors ${
                            isFavorite
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-muted-foreground/40 group-hover:text-muted-foreground'
                          }`}
                        />
                      </button>

                      {/* Icon */}
                      <Icon className="w-4 h-4 shrink-0 text-terminal-green/70" />

                      {/* Symbol info */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm text-foreground">
                          {symbol.symbol}
                        </span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          {symbol.name}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 font-mono border-border/50 text-muted-foreground"
                        >
                          {symbol.exchange}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 font-mono border-terminal-green/30 text-terminal-green/70"
                        >
                          {symbol.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isSearching ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Search className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-mono">
                  No symbols found
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Try searching for any ticker or company name
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-terminal-green" />
                <p className="text-sm text-muted-foreground font-mono">
                  Searching global markets...
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SymbolSearch;
