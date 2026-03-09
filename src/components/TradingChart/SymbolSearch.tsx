import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Search, Star, TrendingUp, Bitcoin, DollarSign, Globe, BarChart3, Landmark, Flame, LineChart, Loader2, X } from 'lucide-react';
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

const TABS = [
  { key: null, label: 'All' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'stock', label: 'Stocks' },
  { key: 'forex', label: 'Forex' },
  { key: 'index', label: 'Indices' },
  { key: 'commodity', label: 'Cmdty' },
  { key: 'futures', label: 'Futures' },
  { key: 'bond', label: 'Bonds' },
  { key: 'set', label: 'SET' },
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

  const handleSelect = useCallback((symbol: ChartSymbol) => {
    onSelectSymbol(symbol);
    onClose();
  }, [onSelectSymbol, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px] p-0 gap-0 border-0 overflow-hidden rounded-lg shadow-2xl shadow-black/80"
        style={{ background: '#1e1e1e' }}
      >
        {/* Search */}
        <div className="border-b" style={{ borderColor: '#333' }}>
          <div className="flex items-center px-3 gap-2">
            <Search className="w-4 h-4 shrink-0" style={{ color: '#666' }} />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-0 shadow-none h-11 bg-transparent focus-visible:ring-0 font-mono text-sm px-0"
              style={{ color: '#d4d4d4' }}
              autoFocus
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: '#4ade80' }} />
            ) : searchQuery && (
              <button onClick={() => setSearchQuery('')} className="shrink-0">
                <X className="w-3.5 h-3.5" style={{ color: '#666' }} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs — TradingView style underline tabs */}
        <div className="border-b flex overflow-hidden" style={{ borderColor: '#333' }}>
          <div className="flex overflow-x-auto scrollbar-none w-full">
            {TABS.map(({ key, label }) => {
              const isActive = selectedType === key;
              return (
                <button
                  key={label}
                  onClick={() => setSelectedType(key)}
                  className="relative px-3 py-2 text-xs font-mono whitespace-nowrap transition-colors"
                  style={{
                    color: isActive ? '#4ade80' : '#888',
                  }}
                >
                  {label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#4ade80' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-4 py-1.5 border-b" style={{ borderColor: '#2a2a2a' }}>
          <span className="text-[10px] font-mono uppercase tracking-wider flex-1" style={{ color: '#555' }}>Symbol</span>
          <span className="text-[10px] font-mono uppercase tracking-wider w-24 text-right" style={{ color: '#555' }}>Source</span>
        </div>

        {/* Results */}
        <ScrollArea className="h-[min(420px,50vh)]">
          {filteredSymbols.length > 0 ? (
            <div>
              {filteredSymbols.map((symbol) => {
                const Icon = TYPE_ICONS[symbol.type] || Globe;
                const isFav = favorites.includes(symbol.symbol);
                const isActive = currentSymbol?.symbol === symbol.symbol;

                return (
                  <div
                    key={`${symbol.exchange}:${symbol.symbol}`}
                    onClick={() => handleSelect(symbol)}
                    className="flex items-center gap-3 px-4 py-[7px] cursor-pointer transition-colors group"
                    style={{
                      background: isActive ? '#2a3a2a' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#262626'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Fav star */}
                    <button
                      onClick={e => { e.stopPropagation(); onToggleFavorite(symbol.symbol); }}
                      className="shrink-0"
                    >
                      <Star className="w-3 h-3 transition-colors" style={{
                        color: isFav ? '#facc15' : '#444',
                        fill: isFav ? '#facc15' : 'none',
                      }} />
                    </button>

                    {/* Symbol + name */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="font-mono font-bold text-[13px]" style={{ color: '#e0e0e0' }}>
                        {symbol.symbol}
                      </span>
                      <span className="text-[11px] truncate" style={{ color: '#666' }}>
                        {symbol.name}
                      </span>
                    </div>

                    {/* Exchange */}
                    <span className="text-[10px] font-mono uppercase w-24 text-right shrink-0" style={{ color: '#555' }}>
                      {symbol.exchange}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : !isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Search className="w-6 h-6" style={{ color: '#333' }} />
              <p className="text-xs font-mono" style={{ color: '#444' }}>No results found</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4ade80' }} />
              <p className="text-xs font-mono" style={{ color: '#444' }}>Searching...</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-1.5 flex items-center justify-between" style={{ borderColor: '#333' }}>
          <span className="text-[10px] font-mono" style={{ color: '#555' }}>
            {filteredSymbols.length} results
          </span>
          <span className="text-[10px] font-mono" style={{ color: '#444' }}>
            ↵ Select · ESC Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SymbolSearch;
