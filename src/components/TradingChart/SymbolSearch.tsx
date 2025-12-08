import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Star, TrendingUp, Bitcoin, DollarSign, Globe } from 'lucide-react';
import { ChartSymbol, chartDataService } from '@/services/ChartDataService';

interface SymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: ChartSymbol) => void;
  currentSymbol?: ChartSymbol;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
}

const TYPE_ICONS = {
  crypto: Bitcoin,
  stock: TrendingUp,
  forex: DollarSign,
  set: Globe,
};

const TYPE_COLORS = {
  crypto: 'text-orange-500',
  stock: 'text-green-500',
  forex: 'text-blue-500',
  set: 'text-purple-500',
};

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

  const symbols = useMemo(() => chartDataService.getSymbolsList(), []);

  const filteredSymbols = useMemo(() => {
    let result = symbols;

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

    // Sort favorites first
    return result.sort((a, b) => {
      const aFav = favorites.includes(a.symbol);
      const bFav = favorites.includes(b.symbol);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [symbols, searchQuery, selectedType, favorites]);

  const handleSelect = (symbol: ChartSymbol) => {
    onSelectSymbol(symbol);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-terminal-green/30">
        <DialogHeader>
          <DialogTitle className="text-terminal-green font-mono">Search Symbol</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols... (e.g., BTC, AAPL, EUR)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-terminal-green/30 focus:border-terminal-green"
              autoFocus
            />
          </div>

          {/* Type filters */}
          <div className="flex gap-2">
            <Button
              variant={selectedType === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(null)}
              className={selectedType === null ? 'bg-terminal-green text-black' : ''}
            >
              All
            </Button>
            {(['crypto', 'stock', 'forex', 'set'] as const).map(type => {
              const Icon = TYPE_ICONS[type];
              return (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className={`gap-1 ${selectedType === type ? 'bg-terminal-green text-black' : ''}`}
                >
                  <Icon className="w-3 h-3" />
                  {type === 'set' ? 'SET' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              );
            })}
          </div>

          {/* Symbol list */}
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredSymbols.map(symbol => {
              const Icon = TYPE_ICONS[symbol.type];
              const isFavorite = favorites.includes(symbol.symbol);
              const isSelected = currentSymbol?.symbol === symbol.symbol;

              return (
                <div
                  key={symbol.symbol}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
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
                    className="p-1 hover:bg-muted rounded"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                      }`}
                    />
                  </button>

                  <Icon className={`w-4 h-4 ${TYPE_COLORS[symbol.type]}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-foreground">
                        {symbol.symbol}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1">
                        {symbol.exchange}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{symbol.name}</p>
                  </div>
                </div>
              );
            })}

            {filteredSymbols.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No symbols found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SymbolSearch;
