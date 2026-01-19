import { TrendingUp, TrendingDown, ChevronRight, BarChart2, Newspaper, Calendar, BookOpen, FileText, Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';

interface MobileHomeScreenProps {
  currentTime: Date;
  onNavigate?: (tab: string, panelId?: string) => void;
}

interface GlobalIndex {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
  region: 'us' | 'eu' | 'asia';
  mapPosition?: { x: string; y: string };
}

export function MobileHomeScreen({ currentTime, onNavigate }: MobileHomeScreenProps) {
  const [sparklineData, setSparklineData] = useState<Record<string, number[]>>({});

  // Global indices data
  const globalIndices: GlobalIndex[] = [
    // US Markets
    { symbol: 'DJI', name: 'Dow Jones', price: '49,359.33', change: '-83.11', changePercent: '-0.17%', isUp: false, region: 'us', mapPosition: { x: '18%', y: '35%' } },
    { symbol: 'IXIC', name: 'NASDAQ', price: '23,515.39', change: '-14.63', changePercent: '-0.06%', isUp: false, region: 'us', mapPosition: { x: '15%', y: '28%' } },
    { symbol: 'SPX', name: 'S&P 500', price: '6,940.01', change: '-4.46', changePercent: '-0.06%', isUp: false, region: 'us' },
    // Europe Markets
    { symbol: 'UKX', name: 'FTSE 100', price: '8,505.22', change: '-33.18', changePercent: '-0.39%', isUp: false, region: 'eu', mapPosition: { x: '47%', y: '25%' } },
    { symbol: 'DAX', name: 'DAX', price: '21,394.93', change: '-288.41', changePercent: '-1.33%', isUp: false, region: 'eu', mapPosition: { x: '50%', y: '22%' } },
    { symbol: 'CAC', name: 'CAC 40', price: '7,709.75', change: '-139.61', changePercent: '-1.78%', isUp: false, region: 'eu', mapPosition: { x: '48%', y: '28%' } },
    // Asia Markets
    { symbol: 'N225', name: 'Nikkei 225', price: '53,583.57', change: '-352.60', changePercent: '-0.65%', isUp: false, region: 'asia', mapPosition: { x: '85%', y: '30%' } },
    { symbol: 'HSI', name: 'HSI', price: '26,563.90', change: '-281.06', changePercent: '-1.05%', isUp: false, region: 'asia', mapPosition: { x: '78%', y: '45%' } },
    { symbol: 'SHCOMP', name: 'Shanghai', price: '3,241.82', change: '+9.41', changePercent: '+0.29%', isUp: true, region: 'asia', mapPosition: { x: '75%', y: '35%' } },
    { symbol: 'STI', name: 'Singapore', price: '4,834.88', change: '-14.22', changePercent: '-0.29%', isUp: false, region: 'asia', mapPosition: { x: '72%', y: '55%' } },
    { symbol: 'AXJO', name: 'ASX 200', price: '8,329.20', change: '-27.53', changePercent: '-0.33%', isUp: false, region: 'asia', mapPosition: { x: '88%', y: '70%' } },
  ];

  // Generate fake sparkline data
  useEffect(() => {
    const data: Record<string, number[]> = {};
    globalIndices.forEach(index => {
      const base = parseFloat(index.price.replace(/,/g, ''));
      const points = Array.from({ length: 20 }, (_, i) => {
        const variance = base * 0.005 * (Math.random() - 0.5);
        return base + variance + (index.isUp ? i * base * 0.0002 : -i * base * 0.0002);
      });
      data[index.symbol] = points;
    });
    setSparklineData(data);
  }, []);

  // Mini sparkline component
  const MiniSparkline = ({ data, isUp }: { data: number[]; isUp: boolean }) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const height = 24;
    const width = 60;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="mt-2">
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
    { id: 'calendar', label: 'Calendar', icon: Calendar, panelId: 'calendar' },
    { id: 'journal', label: 'Journal', icon: BookOpen, panelId: 'journal' },
    { id: 'notes', label: 'Notes', icon: FileText, panelId: 'notes' },
    { id: 'ai', label: 'AI', icon: Bot, panelId: 'ai' },
  ];

  const handleQuickAccess = (item: typeof quickAccessItems[0]) => {
    if (onNavigate) {
      onNavigate('panels', item.panelId);
    }
  };

  // Map markers for showing on the world map
  const mapMarkers = globalIndices.filter(i => i.mapPosition);

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {/* World Map with Global Indices */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-card/80 to-card/40 border border-border">
          {/* Map header */}
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <span className="text-sm font-medium text-foreground">Global Markets</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
          
          {/* World Map */}
          <div className="relative h-44 bg-gradient-to-b from-background/50 to-background/20">
            {/* Dotted globe pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 180">
              {/* Generate dot pattern for globe effect */}
              {Array.from({ length: 15 }, (_, row) => 
                Array.from({ length: 30 }, (_, col) => {
                  const x = (col / 29) * 400;
                  const y = (row / 14) * 180;
                  // Create globe-like curvature
                  const centerX = 200;
                  const centerY = 90;
                  const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                  const maxDistance = 180;
                  const opacity = 1 - (distance / maxDistance) * 0.7;
                  if (opacity < 0.3) return null;
                  return (
                    <circle
                      key={`${row}-${col}`}
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill="currentColor"
                      className="text-muted-foreground"
                      opacity={opacity}
                    />
                  );
                })
              )}
            </svg>
            
            {/* Market markers on map */}
            {mapMarkers.map((index) => (
              <div
                key={index.symbol}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: index.mapPosition!.x, top: index.mapPosition!.y }}
              >
                <div className={`flex flex-col items-center ${index.isUp ? '' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${index.isUp ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  <div className="text-[9px] font-medium text-foreground whitespace-nowrap mt-0.5">
                    {index.name}
                  </div>
                  <div className={`text-[8px] font-medium ${index.isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {index.changePercent}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Indices Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Global Indices</h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {globalIndices.slice(0, 6).map((index) => (
                <div
                  key={index.symbol}
                  className="w-[140px] bg-card border border-border rounded-lg p-3 flex-shrink-0"
                >
                  <div className="text-xs text-muted-foreground mb-1">{index.name}</div>
                  <div className={`text-base font-bold ${index.isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {index.price}
                  </div>
                  <div className={`text-xs ${index.isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {index.change} {index.changePercent}
                  </div>
                  <MiniSparkline data={sparklineData[index.symbol] || []} isUp={index.isUp} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Second row */}
          <div className="overflow-x-auto -mx-4 px-4 mt-3">
            <div className="flex gap-3" style={{ width: 'max-content' }}>
              {globalIndices.slice(6).map((index) => (
                <div
                  key={index.symbol}
                  className="w-[140px] bg-card border border-border rounded-lg p-3 flex-shrink-0"
                >
                  <div className="text-xs text-muted-foreground mb-1">{index.name}</div>
                  <div className={`text-base font-bold ${index.isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {index.price}
                  </div>
                  <div className={`text-xs ${index.isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {index.change} {index.changePercent}
                  </div>
                  <MiniSparkline data={sparklineData[index.symbol] || []} isUp={index.isUp} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h3 className="text-sm font-bold text-terminal-green mb-3">
            Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleQuickAccess(item)}
                  className="bg-card border border-border rounded-lg p-3 flex flex-col items-center gap-2 text-sm font-medium text-terminal-green active:bg-accent/50 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>System Status</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
