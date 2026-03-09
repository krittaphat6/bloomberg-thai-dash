import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
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
  crypto: 'text-amber-400',
  stock: 'text-blue-400',
  forex: 'text-emerald-400',
  set: 'text-purple-400',
  futures: 'text-orange-400',
  commodity: 'text-yellow-500',
  index: 'text-cyan-400',
  bond: 'text-rose-400',
};

const ASSET_TYPES = [
  { key: null, label: 'All', icon: Search, color: 'text-foreground' },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'text-amber-400' },
  { key: 'stock', label: 'Stocks', icon: TrendingUp, color: 'text-blue-400' },
  { key: 'forex', label: 'Forex', icon: DollarSign, color: 'text-emerald-400' },
  { key: 'commodity', label: 'Commodities', icon: BarChart3, color: 'text-yellow-500' },
  { key: 'index', label: 'Indices', icon: LineChart, color: 'text-cyan-400' },
  { key: 'futures', label: 'Futures', icon: Flame, color: 'text-orange-400' },
  { key: 'bond', label: 'Bonds', icon: Landmark, color: 'text-rose-400' },
  { key: 'set', label: 'SET', icon: Globe, color: 'text-purple-400' },
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

  useEffect(() => {
    if (selectedType === 'crypto' && cryptoSymbols.length === 0) {
      chartDataService.loadAllCryptoSymbols().then(setCryptoSymbols).catch(() => {});
    }
  }, [selectedType, cryptoSymbols.length]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setScreenerResults([]);
    }
  }, [isOpen]);

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
    const seen = new Set<string>();
    const allSymbols: ChartSymbol[] = [];
    const addUnique = (s: ChartSymbol) => {
      if (!seen.has(s.symbol)) { allSymbols.push(s); seen.add(s.symbol); }
    };
    defaultSymbols.forEach(addUnique);
    if (selectedType === 'crypto' || !selectedType) cryptoSymbols.forEach(addUnique);
    screenerResults.forEach(addUnique);

    let result = allSymbols;
    if (selectedType) result = result.filter(s => s.type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.exchange.toLowerCase().includes(q)
      );
    }
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
      <DialogContent className="sm:max-w-[680px] p-0 gap-0 bg-[hsl(var(--card))] border border-[hsl(var(--terminal-green)/0.2)] overflow-hidden rounded-xl shadow-2xl shadow-black/50">
        
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[hsl(var(--border)/0.5)]">
          <h2 className="text-[hsl(var(--terminal-green))] font-mono text-sm font-semibold tracking-wider mb-4 flex items-center gap-2">
            <Search className="w-4 h-4" />
            SEARCH GLOBAL MARKETS
          </h2>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground)/0.5)]" />
            <Input
              placeholder="Search ticker, name, exchange..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-10 h-11 bg-[hsl(var(--background))] border-[hsl(var(--border)/0.3)] focus:border-[hsl(var(--terminal-green)/0.6)] focus:ring-1 focus:ring-[hsl(var(--terminal-green)/0.2)] font-mono text-sm rounded-lg placeholder:text-[hsl(var(--muted-foreground)/0.4)]"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[hsl(var(--terminal-green))]" />
            )}
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="px-4 py-2.5 border-b border-[hsl(var(--border)/0.3)] bg-[hsl(var(--background)/0.3)]">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {ASSET_TYPES.map(({ key, label, icon: Icon, color }) => {
              const isActive = selectedType === key;
              const count = key ? typeCounts[key] || 0 : typeCounts['all'] || 0;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedType(key)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all duration-200
                    ${isActive
                      ? 'bg-[hsl(var(--terminal-green))] text-black font-bold shadow-lg shadow-[hsl(var(--terminal-green)/0.15)]'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)] hover:text-[hsl(var(--foreground))]'
                    }
                  `}
                >
                  <Icon className={`w-3 h-3 ${isActive ? '' : color}`} />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`text-[9px] font-normal ml-0.5 ${isActive ? 'text-black/50' : 'text-[hsl(var(--muted-foreground)/0.4)]'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results header */}
        <div className="px-6 py-2 flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground)/0.6)] font-mono border-b border-[hsl(var(--border)/0.2)]">
          <span>{filteredSymbols.length} results</span>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right">EXCHANGE</span>
            <span className="w-14 text-right">TYPE</span>
          </div>
        </div>

        {/* Symbol list */}
        <ScrollArea className="h-[440px]">
          {filteredSymbols.length > 0 ? (
            <div className="py-1">
              {filteredSymbols.map((symbol, idx) => {
                const Icon = TYPE_ICONS[symbol.type] || Globe;
                const iconColor = TYPE_COLORS[symbol.type] || 'text-[hsl(var(--muted-foreground))]';
                const isFavorite = favorites.includes(symbol.symbol);
                const isSelected = currentSymbol?.symbol === symbol.symbol;

                return (
                  <div
                    key={`${symbol.exchange}:${symbol.symbol}`}
                    className={`
                      flex items-center gap-3 px-6 py-2 cursor-pointer transition-all duration-100 group
                      ${isSelected
                        ? 'bg-[hsl(var(--terminal-green)/0.1)] border-l-2 border-l-[hsl(var(--terminal-green))]'
                        : 'hover:bg-[hsl(var(--muted)/0.3)] border-l-2 border-l-transparent'
                      }
                    `}
                    onClick={() => handleSelect(symbol)}
                  >
                    {/* Favorite */}
                    <button
                      onClick={e => { e.stopPropagation(); onToggleFavorite(symbol.symbol); }}
                      className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          isFavorite
                            ? 'fill-yellow-500 text-yellow-500 opacity-100'
                            : 'text-[hsl(var(--muted-foreground))]'
                        }`}
                      />
                    </button>

                    {/* Icon */}
                    <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />

                    {/* Symbol + Name */}
                    <div className="flex-1 min-w-0 flex items-baseline gap-2.5">
                      <span className="font-mono font-bold text-sm text-[hsl(var(--foreground))] tracking-wide">
                        {symbol.symbol}
                      </span>
                      <span className="text-xs text-[hsl(var(--muted-foreground)/0.5)] truncate">
                        {symbol.name}
                      </span>
                    </div>

                    {/* Exchange + Type */}
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground)/0.4)] w-20 text-right">
                        {symbol.exchange}
                      </span>
                      <span className={`text-[10px] font-mono w-14 text-right uppercase tracking-wider ${iconColor}`}>
                        {symbol.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Search className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.15)]" />
              <p className="text-sm text-[hsl(var(--muted-foreground)/0.4)] font-mono">
                No symbols found
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--terminal-green)/0.5)]" />
              <p className="text-sm text-[hsl(var(--muted-foreground)/0.4)] font-mono">
                Searching...
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SymbolSearch;
