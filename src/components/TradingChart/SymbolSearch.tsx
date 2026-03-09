import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Search, Star, TrendingUp, Bitcoin, DollarSign, Globe, BarChart3, Landmark, Flame, LineChart, Loader2, X, Zap } from 'lucide-react';
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
  crypto: Bitcoin, stock: TrendingUp, forex: DollarSign, set: Globe,
  futures: Flame, commodity: BarChart3, index: LineChart, bond: Landmark,
};

const TYPE_BG: Record<string, string> = {
  crypto: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  stock: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  forex: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  set: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  futures: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  commodity: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  index: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  bond: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const TYPE_ICON_COLOR: Record<string, string> = {
  crypto: 'text-amber-400', stock: 'text-blue-400', forex: 'text-emerald-400',
  set: 'text-purple-400', futures: 'text-orange-400', commodity: 'text-yellow-400',
  index: 'text-cyan-400', bond: 'text-rose-400',
};

const TABS = [
  { key: null, label: 'All', icon: Zap },
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
  isOpen, onClose, onSelectSymbol, currentSymbol, favorites, onToggleFavorite,
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
    if (!isOpen) { setSearchQuery(''); setScreenerResults([]); }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setScreenerResults([]); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await chartDataService.searchViaScreener(searchQuery);
        setScreenerResults(results);
      } catch { setScreenerResults([]); }
      finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredSymbols = useMemo(() => {
    const seen = new Set<string>();
    const all: ChartSymbol[] = [];
    const add = (s: ChartSymbol) => { if (!seen.has(s.symbol)) { all.push(s); seen.add(s.symbol); } };
    defaultSymbols.forEach(add);
    if (selectedType === 'crypto' || !selectedType) cryptoSymbols.forEach(add);
    screenerResults.forEach(add);

    let result = all;
    if (selectedType) result = result.filter(s => s.type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.exchange.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const af = favorites.includes(a.symbol) ? 0 : 1;
      const bf = favorites.includes(b.symbol) ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [defaultSymbols, cryptoSymbols, screenerResults, searchQuery, selectedType, favorites]);

  const typeCounts = useMemo(() => {
    const base = [...defaultSymbols];
    const seen = new Set(base.map(s => s.symbol));
    cryptoSymbols.forEach(s => { if (!seen.has(s.symbol)) { base.push(s); seen.add(s.symbol); } });
    const c: Record<string, number> = {};
    base.forEach(s => { c[s.type] = (c[s.type] || 0) + 1; });
    c['all'] = base.length;
    return c;
  }, [defaultSymbols, cryptoSymbols]);

  const handleSelect = useCallback((symbol: ChartSymbol) => {
    onSelectSymbol(symbol);
    onClose();
  }, [onSelectSymbol, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.4)] overflow-hidden rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-xl">

        {/* Search bar */}
        <div className="p-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground)/0.4)]" />
            <Input
              placeholder="Search symbol or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-10 bg-[hsl(var(--muted)/0.3)] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--terminal-green)/0.5)] font-mono text-sm rounded-xl placeholder:text-[hsl(var(--muted-foreground)/0.35)]"
              autoFocus
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[hsl(var(--terminal-green))]" />
            ) : searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground)/0.4)] hover:text-[hsl(var(--foreground))]" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = selectedType === key;
              const count = key ? typeCounts[key] || 0 : typeCounts['all'] || 0;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedType(key)}
                  className={`
                    flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all
                    ${isActive
                      ? 'bg-[hsl(var(--terminal-green)/0.15)] text-[hsl(var(--terminal-green))] ring-1 ring-[hsl(var(--terminal-green)/0.3)]'
                      : 'text-[hsl(var(--muted-foreground)/0.6)] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.3)]'
                    }
                  `}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`text-[9px] ml-0.5 ${isActive ? 'text-[hsl(var(--terminal-green)/0.6)]' : 'text-[hsl(var(--muted-foreground)/0.3)]'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider + count */}
        <div className="h-px bg-[hsl(var(--border)/0.3)]" />
        <div className="px-4 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground)/0.4)]">
            {filteredSymbols.length} instruments
          </span>
          <div className="flex gap-6 text-[10px] font-mono text-[hsl(var(--muted-foreground)/0.3)] uppercase tracking-widest">
            <span>Symbol</span>
            <span>Exchange</span>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="h-[400px]">
          {filteredSymbols.length > 0 ? (
            <div className="px-2 pb-2">
              {filteredSymbols.map((symbol) => {
                const Icon = TYPE_ICONS[symbol.type] || Globe;
                const iconColor = TYPE_ICON_COLOR[symbol.type] || 'text-[hsl(var(--muted-foreground))]';
                const badgeCls = TYPE_BG[symbol.type] || 'bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))]';
                const isFav = favorites.includes(symbol.symbol);
                const isActive = currentSymbol?.symbol === symbol.symbol;

                return (
                  <div
                    key={`${symbol.exchange}:${symbol.symbol}`}
                    onClick={() => handleSelect(symbol)}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all group
                      ${isActive
                        ? 'bg-[hsl(var(--terminal-green)/0.08)] ring-1 ring-[hsl(var(--terminal-green)/0.2)]'
                        : 'hover:bg-[hsl(var(--muted)/0.2)]'
                      }
                    `}
                  >
                    {/* Fav */}
                    <button
                      onClick={e => { e.stopPropagation(); onToggleFavorite(symbol.symbol); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400 text-amber-400 !opacity-100' : 'text-[hsl(var(--muted-foreground)/0.4)]'}`} />
                    </button>

                    {/* Type icon */}
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${badgeCls} border`}>
                      <Icon className="w-3 h-3" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-mono font-semibold text-[13px] text-[hsl(var(--foreground))]">
                        {symbol.symbol}
                      </span>
                      <span className="text-[11px] text-[hsl(var(--muted-foreground)/0.45)] truncate">
                        {symbol.name}
                      </span>
                    </div>

                    {/* Exchange badge */}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground)/0.5)] uppercase tracking-wider shrink-0">
                      {symbol.exchange}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : !isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Search className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.1)]" />
              <p className="text-xs text-[hsl(var(--muted-foreground)/0.3)] font-mono">No results</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--terminal-green)/0.4)]" />
              <p className="text-xs text-[hsl(var(--muted-foreground)/0.3)] font-mono">Searching...</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SymbolSearch;
