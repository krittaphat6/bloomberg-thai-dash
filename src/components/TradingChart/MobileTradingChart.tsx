import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { 
  Search, TrendingUp, TrendingDown, RefreshCw, 
  BarChart2, Settings, X, ChevronDown, 
  Maximize, ZoomIn, ZoomOut, Bell, Palette, Menu
} from 'lucide-react';
import { chartDataService, ChartSymbol, Timeframe, OHLCVData } from '@/services/ChartDataService';
import { ChartIndicator, DEFAULT_INDICATORS } from './types';
import { ChartTheme, loadTheme, PRESET_THEMES } from './ChartThemes';
import ChartCanvas from './ChartCanvas';

interface MobileTradingChartProps {
  className?: string;
  defaultSymbol?: string;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

const MobileTradingChart: React.FC<MobileTradingChartProps> = ({
  className = '',
  defaultSymbol = 'BTCUSDT',
}) => {
  // State
  const [symbol, setSymbol] = useState<ChartSymbol>(() => {
    const symbols = chartDataService.getSymbolsList();
    return symbols.find(s => s.symbol === defaultSymbol) || symbols[0];
  });
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [data, setData] = useState<OHLCVData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Panels - mobile bottom sheets
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Theme
  const [theme, setTheme] = useState<ChartTheme>(loadTheme);

  // Chart state
  const [indicators, setIndicators] = useState<ChartIndicator[]>(() => 
    DEFAULT_INDICATORS.map((ind, i) => ({ ...ind, id: `ind-${i}` }))
  );
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [crosshair, setCrosshair] = useState({ x: 0, y: 0, price: 0, time: 0, visible: false });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 375, height: 400 });

  // Resize observer
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height - 120, // Account for mobile controls
        });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const chartData = await chartDataService.fetchData(symbol, timeframe, 300);
      setData(chartData);
      setVisibleRange({ start: Math.max(0, chartData.length - 100), end: chartData.length });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh - 1s for crypto
  useEffect(() => {
    const isCrypto = symbol.type === 'crypto';
    const interval = setInterval(fetchData, isCrypto ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [fetchData, symbol.type]);

  // Handlers
  const handleZoom = (delta: number, center: number) => {
    const range = visibleRange.end - visibleRange.start;
    const zoomFactor = delta > 0 ? 1.15 : 0.85;
    const newRange = Math.max(30, Math.min(data.length, Math.round(range * zoomFactor)));
    const centerRatio = center / dimensions.width;
    const centerIndex = visibleRange.start + range * centerRatio;
    const newStart = Math.max(0, Math.round(centerIndex - newRange * centerRatio));
    const newEnd = Math.min(data.length, newStart + newRange);
    setVisibleRange({ start: newStart, end: newEnd });
    setZoomLevel(Math.round((100 / (newEnd - newStart)) * 100));
  };

  const handlePan = (delta: number) => {
    const range = visibleRange.end - visibleRange.start;
    const candleWidth = dimensions.width / range;
    const shift = Math.round(-delta / candleWidth);
    const newStart = Math.max(0, Math.min(data.length - range, visibleRange.start + shift));
    setVisibleRange({ start: newStart, end: newStart + range });
  };

  const handleSelectSymbol = (newSymbol: ChartSymbol) => {
    setSymbol(newSymbol);
    setShowSymbolSearch(false);
  };

  const handleToggleIndicator = (id: string) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === id ? { ...ind, visible: !ind.visible } : ind))
    );
  };

  // Current price
  const currentPrice = data[data.length - 1]?.close || 0;
  const prevPrice = data[data.length - 2]?.close || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const symbols = chartDataService.getSymbolsList();

  return (
    <div ref={containerRef} className={`flex flex-col h-full bg-background ${className}`}>
      {/* Mobile Header - Compact */}
      <div className="flex items-center justify-between px-3 py-2 bg-card/80 border-b border-terminal-green/20">
        {/* Symbol & Price */}
        <button
          onClick={() => setShowSymbolSearch(true)}
          className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 active:bg-muted/50"
        >
          <span className="font-mono font-bold text-base text-terminal-green">
            {symbol.symbol}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-1">
          <span className="font-mono text-lg font-bold text-foreground">
            {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </span>
        </div>

        {/* Menu */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowSettings(true)}
        >
          <Menu className="w-5 h-5 text-terminal-green" />
        </Button>
      </div>

      {/* Timeframe Pills - Horizontal Scroll */}
      <div className="flex gap-1 px-2 py-1.5 bg-card/50 overflow-x-auto no-scrollbar">
        {TIMEFRAMES.map(tf => (
          <Button
            key={tf}
            variant={timeframe === tf ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 px-3 text-xs font-mono shrink-0 ${
              timeframe === tf 
                ? 'bg-terminal-green text-black' 
                : 'text-terminal-green'
            }`}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </Button>
        ))}
        
        {/* Quick Actions */}
        <div className="w-px h-6 bg-terminal-green/20 mx-1 shrink-0" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0"
          onClick={() => setShowIndicators(true)}
        >
          <BarChart2 className="w-4 h-4 text-terminal-green" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0"
          onClick={() => handleZoom(-1, dimensions.width / 2)}
        >
          <ZoomIn className="w-4 h-4 text-terminal-green" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0"
          onClick={() => handleZoom(1, dimensions.width / 2)}
        >
          <ZoomOut className="w-4 h-4 text-terminal-green" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 shrink-0"
          onClick={fetchData}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 text-terminal-green ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Chart Canvas - Full Width */}
      <div className="flex-1 relative">
        {isLoading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-terminal-green" />
          </div>
        ) : (
          <ChartCanvas
            data={data}
            width={dimensions.width}
            height={dimensions.height}
            indicators={indicators}
            drawings={[]}
            selectedDrawingTool={null}
            onAddDrawing={() => {}}
            crosshair={crosshair}
            onCrosshairMove={setCrosshair}
            visibleRange={visibleRange}
            onZoom={handleZoom}
            onPan={handlePan}
            theme={theme}
            customIndicators={[]}
          />
        )}

        {/* Active Indicators Badge */}
        {indicators.filter(i => i.visible).length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[60%]">
            {indicators.filter(i => i.visible && i.name !== 'Volume').slice(0, 3).map(ind => (
              <Badge 
                key={ind.id} 
                variant="outline" 
                className="text-[9px] py-0 px-1.5"
                style={{ borderColor: ind.color, color: ind.color }}
              >
                {ind.name}
              </Badge>
            ))}
            {indicators.filter(i => i.visible && i.name !== 'Volume').length > 3 && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                +{indicators.filter(i => i.visible && i.name !== 'Volume').length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Symbol Search Sheet */}
      <Sheet open={showSymbolSearch} onOpenChange={setShowSymbolSearch}>
        <SheetContent side="bottom" className="h-[70vh] bg-card border-t border-terminal-green/30">
          <SheetHeader>
            <SheetTitle className="text-terminal-green font-mono">Select Symbol</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4">
            <div className="grid grid-cols-2 gap-2 pb-8">
              {symbols.map(sym => (
                <button
                  key={sym.symbol}
                  onClick={() => handleSelectSymbol(sym)}
                  className={`p-3 rounded-lg text-left transition-colors ${
                    symbol.symbol === sym.symbol 
                      ? 'bg-terminal-green/20 border border-terminal-green' 
                      : 'bg-muted/30 border border-transparent'
                  }`}
                >
                  <div className="font-mono font-bold text-sm">{sym.symbol}</div>
                  <div className="text-xs text-muted-foreground">{sym.name}</div>
                  <Badge variant="outline" className="text-[9px] mt-1">{sym.exchange}</Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Indicators Sheet */}
      <Sheet open={showIndicators} onOpenChange={setShowIndicators}>
        <SheetContent side="bottom" className="h-[60vh] bg-card border-t border-terminal-green/30">
          <SheetHeader>
            <SheetTitle className="text-terminal-green font-mono flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Indicators
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4">
            <div className="space-y-3 pb-8">
              {indicators.map(indicator => (
                <div
                  key={indicator.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: indicator.color }}
                    />
                    <div>
                      <span className="font-mono text-sm">{indicator.name}</span>
                      <Badge variant="outline" className="ml-2 text-[9px]">
                        {indicator.type}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={indicator.visible}
                    onCheckedChange={() => handleToggleIndicator(indicator.id)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="h-[50vh] bg-card border-t border-terminal-green/30">
          <SheetHeader>
            <SheetTitle className="text-terminal-green font-mono flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4">
            <div className="space-y-3 pb-8">
              {/* Theme Selection */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-sm">Theme</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESET_THEMES).map(([name, presetTheme]) => (
                    <button
                      key={name}
                      onClick={() => setTheme(presetTheme)}
                      className={`p-2 rounded text-xs font-mono transition-colors ${
                        theme.name === name 
                          ? 'bg-terminal-green/20 border border-terminal-green' 
                          : 'bg-muted/50 border border-transparent'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => containerRef.current?.requestFullscreen?.()}
              >
                <Maximize className="w-4 h-4" />
                Fullscreen
              </Button>

              {/* Alerts */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => toast({ title: 'Coming Soon', description: 'Price alerts' })}
              >
                <Bell className="w-4 h-4" />
                Price Alerts
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileTradingChart;