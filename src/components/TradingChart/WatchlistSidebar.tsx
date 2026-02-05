import React, { useState, useEffect, useCallback, memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Star, 
  StarOff, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { binanceWS, PriceUpdate } from '@/services/BinanceWebSocketService';
import { ChartSymbol } from '@/services/ChartDataService';

interface WatchlistSidebarProps {
  onSelectSymbol: (symbol: ChartSymbol) => void;
  currentSymbol: string;
  className?: string;
}

interface WatchlistGroup {
  id: string;
  name: string;
  icon: string;
  expanded: boolean;
  symbols: WatchlistItem[];
}

interface WatchlistItem {
  symbol: string;
  name: string;
  exchange: string;
  type: ChartSymbol['type'];
  isFavorite?: boolean;
}

// Real-time price row with memo for performance
const PriceRow = memo(({ 
  item, 
  isSelected, 
  onSelect, 
  onToggleFavorite 
}: { 
  item: WatchlistItem; 
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) => {
  const [priceData, setPriceData] = useState<PriceUpdate | null>(null);
  
  useEffect(() => {
    if (item.type !== 'crypto') return;
    
    const unsubscribe = binanceWS.subscribeToPrice(item.symbol, (update) => {
      setPriceData(update);
    });
    
    return unsubscribe;
  }, [item.symbol, item.type]);
  
  const price = priceData?.price || 0;
  const change = priceData?.priceChangePercent || 0;
  const isPositive = change >= 0;
  
  const formatPrice = (p: number) => {
    if (p === 0) return '—';
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(6);
  };
  
  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 cursor-pointer transition-all duration-150",
        "hover:bg-muted/50 group border-l-2",
        isSelected 
          ? "bg-terminal-green/10 border-l-terminal-green" 
          : "border-l-transparent"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {item.isFavorite ? (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          ) : (
            <StarOff className="w-3 h-3 text-muted-foreground hover:text-yellow-500" />
          )}
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-semibold text-foreground truncate">
              {item.symbol.replace('USDT', '')}
            </span>
            {item.type === 'crypto' && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-orange-500/10 text-orange-400 border-orange-500/30">
                USDT
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground truncate block">
            {item.name}
          </span>
        </div>
      </div>
      
      <div className="text-right ml-2">
        <div className="font-mono text-xs font-medium text-foreground">
          {formatPrice(price)}
        </div>
        <div className={cn(
          "font-mono text-[10px] flex items-center justify-end gap-0.5",
          isPositive ? "text-green-500" : "text-red-500"
        )}>
          {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {isPositive ? '+' : ''}{change.toFixed(2)}%
        </div>
      </div>
    </div>
  );
});

PriceRow.displayName = 'PriceRow';

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  onSelectSymbol,
  currentSymbol,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Watchlist groups
  const [groups, setGroups] = useState<WatchlistGroup[]>([
    {
      id: 'favorites',
      name: 'Favorites',
      icon: '⭐',
      expanded: true,
      symbols: []
    },
    {
      id: 'crypto',
      name: 'Crypto',
      icon: '🪙',
      expanded: true,
      symbols: [
        { symbol: 'BTCUSDT', name: 'Bitcoin', exchange: 'Binance', type: 'crypto' },
        { symbol: 'ETHUSDT', name: 'Ethereum', exchange: 'Binance', type: 'crypto' },
        { symbol: 'BNBUSDT', name: 'BNB', exchange: 'Binance', type: 'crypto' },
        { symbol: 'SOLUSDT', name: 'Solana', exchange: 'Binance', type: 'crypto' },
        { symbol: 'XRPUSDT', name: 'XRP', exchange: 'Binance', type: 'crypto' },
        { symbol: 'ADAUSDT', name: 'Cardano', exchange: 'Binance', type: 'crypto' },
        { symbol: 'DOGEUSDT', name: 'Dogecoin', exchange: 'Binance', type: 'crypto' },
        { symbol: 'DOTUSDT', name: 'Polkadot', exchange: 'Binance', type: 'crypto' },
        { symbol: 'MATICUSDT', name: 'Polygon', exchange: 'Binance', type: 'crypto' },
        { symbol: 'AVAXUSDT', name: 'Avalanche', exchange: 'Binance', type: 'crypto' },
      ]
    },
    {
      id: 'defi',
      name: 'DeFi',
      icon: '🏦',
      expanded: false,
      symbols: [
        { symbol: 'UNIUSDT', name: 'Uniswap', exchange: 'Binance', type: 'crypto' },
        { symbol: 'AAVEUSDT', name: 'Aave', exchange: 'Binance', type: 'crypto' },
        { symbol: 'LINKUSDT', name: 'Chainlink', exchange: 'Binance', type: 'crypto' },
        { symbol: 'MKRUSDT', name: 'Maker', exchange: 'Binance', type: 'crypto' },
        { symbol: 'COMPUSDT', name: 'Compound', exchange: 'Binance', type: 'crypto' },
        { symbol: 'SNXUSDT', name: 'Synthetix', exchange: 'Binance', type: 'crypto' },
        { symbol: 'CRVUSDT', name: 'Curve', exchange: 'Binance', type: 'crypto' },
        { symbol: 'SUSHIUSDT', name: 'SushiSwap', exchange: 'Binance', type: 'crypto' },
      ]
    },
    {
      id: 'layer2',
      name: 'Layer 2',
      icon: '⚡',
      expanded: false,
      symbols: [
        { symbol: 'ARBUSDT', name: 'Arbitrum', exchange: 'Binance', type: 'crypto' },
        { symbol: 'OPUSDT', name: 'Optimism', exchange: 'Binance', type: 'crypto' },
        { symbol: 'IMXUSDT', name: 'Immutable X', exchange: 'Binance', type: 'crypto' },
        { symbol: 'LRCUSDT', name: 'Loopring', exchange: 'Binance', type: 'crypto' },
      ]
    },
    {
      id: 'meme',
      name: 'Meme Coins',
      icon: '🐸',
      expanded: false,
      symbols: [
        { symbol: 'SHIBUSDT', name: 'Shiba Inu', exchange: 'Binance', type: 'crypto' },
        { symbol: 'PEPEUSDT', name: 'Pepe', exchange: 'Binance', type: 'crypto' },
        { symbol: 'FLOKIUSDT', name: 'Floki', exchange: 'Binance', type: 'crypto' },
        { symbol: 'BONKUSDT', name: 'Bonk', exchange: 'Binance', type: 'crypto' },
        { symbol: 'WIFUSDT', name: 'dogwifhat', exchange: 'Binance', type: 'crypto' },
      ]
    },
    {
      id: 'gaming',
      name: 'Gaming & NFT',
      icon: '🎮',
      expanded: false,
      symbols: [
        { symbol: 'AXSUSDT', name: 'Axie Infinity', exchange: 'Binance', type: 'crypto' },
        { symbol: 'SANDUSDT', name: 'The Sandbox', exchange: 'Binance', type: 'crypto' },
        { symbol: 'MANAUSDT', name: 'Decentraland', exchange: 'Binance', type: 'crypto' },
        { symbol: 'GALAUSDT', name: 'Gala', exchange: 'Binance', type: 'crypto' },
        { symbol: 'ENJUSDT', name: 'Enjin', exchange: 'Binance', type: 'crypto' },
        { symbol: 'IMXUSDT', name: 'Immutable X', exchange: 'Binance', type: 'crypto' },
      ]
    },
    {
      id: 'indices',
      name: 'Indices',
      icon: '📊',
      expanded: false,
      symbols: [
        { symbol: 'SPY', name: 'S&P 500 ETF', exchange: 'NYSE', type: 'stock' },
        { symbol: 'QQQ', name: 'Nasdaq 100 ETF', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'DIA', name: 'Dow Jones ETF', exchange: 'NYSE', type: 'stock' },
      ]
    },
    {
      id: 'stocks',
      name: 'US Stocks',
      icon: '🇺🇸',
      expanded: false,
      symbols: [
        { symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'GOOGL', name: 'Google', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'TSLA', name: 'Tesla', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'NVDA', name: 'NVIDIA', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'META', name: 'Meta', exchange: 'NASDAQ', type: 'stock' },
        { symbol: 'AMZN', name: 'Amazon', exchange: 'NASDAQ', type: 'stock' },
      ]
    },
    {
      id: 'commodities',
      name: 'Commodities',
      icon: '🛢️',
      expanded: false,
      symbols: [
        { symbol: 'XAUUSD', name: 'Gold', exchange: 'Forex', type: 'forex' },
        { symbol: 'XAGUSD', name: 'Silver', exchange: 'Forex', type: 'forex' },
      ]
    }
  ]);
  
  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('trading-watchlist-favorites');
    if (saved) {
      try {
        const favorites = JSON.parse(saved) as WatchlistItem[];
        setGroups(prev => prev.map(g => 
          g.id === 'favorites' ? { ...g, symbols: favorites } : g
        ));
      } catch (e) {}
    }
  }, []);
  
  // Connect to WebSocket
  useEffect(() => {
    binanceWS.connect();
    
    const unsubscribe = binanceWS.subscribeToStatus(setIsConnected);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Search symbols
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await binanceWS.searchSymbols(query);
      setSearchResults(results);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, expanded: !g.expanded } : g
    ));
  };
  
  // Add to watchlist
  const addToWatchlist = (symbol: string, groupId: string = 'crypto') => {
    const newItem: WatchlistItem = {
      symbol,
      name: symbol.replace('USDT', ''),
      exchange: 'Binance',
      type: 'crypto'
    };
    
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        // Check if already exists
        if (g.symbols.some(s => s.symbol === symbol)) return g;
        return { ...g, symbols: [...g.symbols, newItem] };
      }
      return g;
    }));
    
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };
  
  // Toggle favorite
  const toggleFavorite = (item: WatchlistItem) => {
    setGroups(prev => {
      const newGroups = prev.map(g => {
        if (g.id === 'favorites') {
          const exists = g.symbols.some(s => s.symbol === item.symbol);
          if (exists) {
            return { ...g, symbols: g.symbols.filter(s => s.symbol !== item.symbol) };
          } else {
            return { ...g, symbols: [...g.symbols, { ...item, isFavorite: true }] };
          }
        }
        return g;
      });
      
      // Save to localStorage
      const favorites = newGroups.find(g => g.id === 'favorites')?.symbols || [];
      localStorage.setItem('trading-watchlist-favorites', JSON.stringify(favorites));
      
      return newGroups;
    });
  };
  
  const handleSelectSymbol = (item: WatchlistItem) => {
    onSelectSymbol({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      type: item.type
    });
  };
  
  // Check if symbol is in favorites
  const isFavorite = (symbol: string) => {
    const favGroup = groups.find(g => g.id === 'favorites');
    return favGroup?.symbols.some(s => s.symbol === symbol) || false;
  };
  
  return (
    <div className={cn("flex flex-col h-full bg-card border-l border-border", className)}>
      {/* Header */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">WATCHLIST</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] px-1 py-0",
                isConnected ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"
              )}
            >
              {isConnected ? '● LIVE' : '○ OFFLINE'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </Button>
        </div>
        
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search crypto..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-7 pl-7 text-xs bg-background/50"
              autoFocus
            />
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchResults.map(symbol => (
                  <button
                    key={symbol}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => addToWatchlist(symbol)}
                  >
                    <span className="font-mono font-semibold">{symbol}</span>
                    <Plus className="w-3 h-3 text-terminal-green" />
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md p-3 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Watchlist Groups */}
      <ScrollArea className="flex-1">
        {groups.map(group => (
          <div key={group.id} className="border-b border-border/50">
            {/* Group Header */}
            <button
              className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-muted/30 transition-colors"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{group.icon}</span>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {group.name}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  ({group.symbols.length})
                </span>
              </div>
              {group.expanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
            
            {/* Group Items */}
            {group.expanded && group.symbols.length > 0 && (
              <div>
                {group.symbols.map(item => (
                  <PriceRow
                    key={item.symbol}
                    item={{ ...item, isFavorite: isFavorite(item.symbol) }}
                    isSelected={currentSymbol === item.symbol}
                    onSelect={() => handleSelectSymbol(item)}
                    onToggleFavorite={() => toggleFavorite(item)}
                  />
                ))}
              </div>
            )}
            
            {group.expanded && group.symbols.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-muted-foreground italic">
                No symbols added
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-2 border-t border-border text-center">
        <span className="text-[9px] text-muted-foreground">
          Powered by Binance • Real-time
        </span>
      </div>
    </div>
  );
};

export default WatchlistSidebar;
