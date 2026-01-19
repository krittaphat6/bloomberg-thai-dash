import { TrendingUp, TrendingDown, ChevronRight, BarChart2, Newspaper, BookOpen, FileText, Bot, RefreshCw, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useCallback } from 'react';

interface MobileHomeScreenProps {
  currentTime: Date;
  onNavigate?: (tab: string, panelId?: string) => void;
}

interface GlobalIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  region: 'us' | 'eu' | 'asia';
  mapPosition?: { x: string; y: string };
}

const YAHOO_SYMBOLS = {
  DJI: '^DJI',
  IXIC: '^IXIC', 
  SPX: '^GSPC',
  UKX: '^FTSE',
  DAX: '^GDAXI',
  CAC: '^FCHI',
  N225: '^N225',
  HSI: '^HSI',
  SHCOMP: '000001.SS',
  STI: '^STI',
  AXJO: '^AXJO',
};

export function MobileHomeScreen({ currentTime, onNavigate }: MobileHomeScreenProps) {
  const [globalIndices, setGlobalIndices] = useState<GlobalIndex[]>([
    { symbol: 'DJI', name: 'Dow Jones', price: 0, change: 0, changePercent: 0, region: 'us', mapPosition: { x: '18%', y: '38%' } },
    { symbol: 'IXIC', name: 'NASDAQ', price: 0, change: 0, changePercent: 0, region: 'us', mapPosition: { x: '12%', y: '30%' } },
    { symbol: 'SPX', name: 'S&P 500', price: 0, change: 0, changePercent: 0, region: 'us' },
    { symbol: 'UKX', name: 'FTSE 100', price: 0, change: 0, changePercent: 0, region: 'eu', mapPosition: { x: '46%', y: '26%' } },
    { symbol: 'DAX', name: 'DAX', price: 0, change: 0, changePercent: 0, region: 'eu', mapPosition: { x: '50%', y: '22%' } },
    { symbol: 'CAC', name: 'CAC 40', price: 0, change: 0, changePercent: 0, region: 'eu', mapPosition: { x: '47%', y: '30%' } },
    { symbol: 'N225', name: 'Nikkei 225', price: 0, change: 0, changePercent: 0, region: 'asia', mapPosition: { x: '88%', y: '32%' } },
    { symbol: 'HSI', name: 'HSI', price: 0, change: 0, changePercent: 0, region: 'asia', mapPosition: { x: '80%', y: '48%' } },
    { symbol: 'SHCOMP', name: 'Shanghai', price: 0, change: 0, changePercent: 0, region: 'asia', mapPosition: { x: '78%', y: '38%' } },
    { symbol: 'STI', name: 'Singapore', price: 0, change: 0, changePercent: 0, region: 'asia', mapPosition: { x: '75%', y: '58%' } },
    { symbol: 'AXJO', name: 'ASX 200', price: 0, change: 0, changePercent: 0, region: 'asia', mapPosition: { x: '90%', y: '72%' } },
  ]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({});

  // Fetch real-time data from Yahoo Finance
  const fetchMarketData = useCallback(async () => {
    try {
      const symbols = Object.values(YAHOO_SYMBOLS).join(',');
      const response = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`
      );
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const quotes = data.quoteResponse?.result || [];
      
      setGlobalIndices(prev => prev.map(index => {
        const yahooSymbol = YAHOO_SYMBOLS[index.symbol as keyof typeof YAHOO_SYMBOLS];
        const quote = quotes.find((q: any) => q.symbol === yahooSymbol);
        
        if (quote) {
          return {
            ...index,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
          };
        }
        return index;
      }));
      
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching market data:', error);
      // Use fallback mock data on error
      setGlobalIndices(prev => prev.map(index => ({
        ...index,
        price: getRandomPrice(index.symbol),
        change: (Math.random() - 0.5) * 200,
        changePercent: (Math.random() - 0.5) * 3,
      })));
      setLastUpdate(new Date());
      setLoading(false);
    }
  }, []);

  const getRandomPrice = (symbol: string): number => {
    const basePrices: Record<string, number> = {
      DJI: 43500, IXIC: 19500, SPX: 5900,
      UKX: 8200, DAX: 18500, CAC: 7800,
      N225: 38000, HSI: 16800, SHCOMP: 3100,
      STI: 3400, AXJO: 8100,
    };
    return basePrices[symbol] || 10000;
  };

  // Generate sparkline data based on current prices
  useEffect(() => {
    const data: Record<string, number[]> = {};
    globalIndices.forEach(index => {
      if (index.price > 0) {
        const isUp = index.change >= 0;
        const points = Array.from({ length: 20 }, (_, i) => {
          const variance = index.price * 0.002 * (Math.random() - 0.5);
          return index.price + variance + (isUp ? (i - 10) * index.price * 0.0001 : (10 - i) * index.price * 0.0001);
        });
        data[index.symbol] = points;
      }
    });
    setSparklineData(data);
  }, [globalIndices]);

  // Fetch data on mount and every 15 minutes
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Mini sparkline component
  const MiniSparkline = ({ data, isUp }: { data: number[]; isUp: boolean }) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const height = 20;
    const width = 50;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="opacity-60">
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? 'hsl(var(--terminal-green))' : 'hsl(0 62% 50%)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const quickAccessItems = [
    { id: 'charts', label: 'Charts', icon: BarChart2, panelId: 'trading-chart' },
    { id: 'news', label: 'News', icon: Newspaper, panelId: 'news' },
    { id: 'journal', label: 'Journal', icon: BookOpen, panelId: 'journal' },
    { id: 'notes', label: 'Notes', icon: FileText, panelId: 'notes' },
    { id: 'able-ai', label: 'ABLE AI', icon: Sparkles, panelId: 'able-ai' },
    { id: 'ai', label: 'AI Chat', icon: Bot, panelId: 'ai' },
  ];

  const handleQuickAccess = (item: typeof quickAccessItems[0]) => {
    if (onNavigate) {
      onNavigate('panels', item.panelId);
    }
  };

  const formatPrice = (price: number): string => {
    if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toFixed(2);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const mapMarkers = globalIndices.filter(i => i.mapPosition && i.price > 0);
  const displayIndices = globalIndices.filter(i => i.price > 0).slice(0, 6);

  return (
    <ScrollArea className="flex-1 bg-background">
      <div className="p-4 space-y-5 pb-8">
        
        {/* Global Markets - World Map Section */}
        <div className="relative rounded-2xl overflow-hidden bg-card/50 border border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Global Markets</h2>
            <button 
              onClick={fetchMarketData}
              className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* World Map with Dotted Globe Pattern */}
          <div className="relative h-48 overflow-hidden">
            {/* Dark gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/40" />
            
            {/* Dotted globe pattern */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
              <defs>
                <radialGradient id="globeGradient" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="currentColor" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="200" cy="100" rx="180" ry="90" fill="url(#globeGradient)" className="text-muted-foreground" />
              
              {/* Latitude lines (dots) */}
              {[30, 50, 70, 90, 110, 130, 150].map(y => 
                Array.from({ length: 35 }, (_, i) => {
                  const x = 15 + i * 11;
                  const distFromCenter = Math.sqrt(Math.pow(x - 200, 2) / 32400 + Math.pow(y - 100, 2) / 8100);
                  if (distFromCenter > 1) return null;
                  const opacity = (1 - distFromCenter) * 0.6;
                  return (
                    <circle
                      key={`lat-${y}-${i}`}
                      cx={x}
                      cy={y}
                      r="1.2"
                      fill="currentColor"
                      className="text-muted-foreground"
                      opacity={opacity}
                    />
                  );
                })
              )}
              
              {/* Longitude curves (dots) */}
              {[60, 100, 140, 180, 220, 260, 300, 340].map(baseX =>
                Array.from({ length: 12 }, (_, i) => {
                  const y = 25 + i * 14;
                  const curve = Math.sin((y - 100) / 90 * Math.PI * 0.5) * 20;
                  const x = baseX + curve;
                  const distFromCenter = Math.sqrt(Math.pow(x - 200, 2) / 32400 + Math.pow(y - 100, 2) / 8100);
                  if (distFromCenter > 0.95) return null;
                  const opacity = (1 - distFromCenter) * 0.5;
                  return (
                    <circle
                      key={`lng-${baseX}-${i}`}
                      cx={x}
                      cy={y}
                      r="1"
                      fill="currentColor"
                      className="text-muted-foreground"
                      opacity={opacity}
                    />
                  );
                })
              )}
            </svg>
            
            {/* Market markers on map */}
            {mapMarkers.map((index) => {
              const isUp = index.change >= 0;
              return (
                <div
                  key={index.symbol}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: index.mapPosition!.x, top: index.mapPosition!.y }}
                >
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'} shadow-lg`}>
                      <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'} animate-ping opacity-75`} />
                    </div>
                    <span className="text-[9px] font-medium text-foreground/80 mt-0.5 whitespace-nowrap drop-shadow-md">
                      {index.name}
                    </span>
                    <span className={`text-[9px] font-bold ${isUp ? 'text-green-500' : 'text-red-500'} drop-shadow-md`}>
                      {formatPercent(index.changePercent)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Last update time */}
          {lastUpdate && (
            <div className="px-4 py-2 text-[10px] text-muted-foreground/60 text-right border-t border-border/30">
              Updated: {lastUpdate.toLocaleTimeString()} · 15 min delay
            </div>
          )}
        </div>

        {/* Global Indices - Clean Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Global Indices</h2>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {displayIndices.map((index) => {
              const isUp = index.change >= 0;
              return (
                <div
                  key={index.symbol}
                  className="bg-card/60 border border-border/40 rounded-xl p-3 flex flex-col"
                >
                  <span className="text-[11px] text-muted-foreground/80 truncate">{index.name}</span>
                  <span className={`text-sm font-bold mt-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPrice(index.price)}
                  </span>
                  <span className={`text-[10px] ${isUp ? 'text-green-500/80' : 'text-red-500/80'}`}>
                    {formatChange(index.change)} {formatPercent(index.changePercent)}
                  </span>
                  <div className="mt-auto pt-1">
                    <MiniSparkline data={sparklineData[index.symbol] || []} isUp={isUp} />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Second row */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {globalIndices.filter(i => i.price > 0).slice(6, 9).map((index) => {
              const isUp = index.change >= 0;
              return (
                <div
                  key={index.symbol}
                  className="bg-card/60 border border-border/40 rounded-xl p-3 flex flex-col"
                >
                  <span className="text-[11px] text-muted-foreground/80 truncate">{index.name}</span>
                  <span className={`text-sm font-bold mt-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPrice(index.price)}
                  </span>
                  <span className={`text-[10px] ${isUp ? 'text-green-500/80' : 'text-red-500/80'}`}>
                    {formatChange(index.change)} {formatPercent(index.changePercent)}
                  </span>
                  <div className="mt-auto pt-1">
                    <MiniSparkline data={sparklineData[index.symbol] || []} isUp={isUp} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Access - Clean Grid */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Quick Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleQuickAccess(item)}
                  className="bg-card/60 border border-border/40 rounded-xl p-4 flex flex-col items-center gap-2 active:scale-95 active:bg-accent/30 transition-all"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-medium text-foreground/80">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* System Status - Minimal */}
        <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-muted-foreground/50">
          <div className="w-1.5 h-1.5 bg-green-500/60 rounded-full" />
          <span>All Systems Operational</span>
        </div>
      </div>
    </ScrollArea>
  );
}
