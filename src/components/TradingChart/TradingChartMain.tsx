import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { chartDataService, ChartSymbol, Timeframe, OHLCVData } from '@/services/ChartDataService';
import { ChartIndicator, ChartAlert, DrawingTool, CrosshairData, DEFAULT_INDICATORS } from './types';
import { PineScriptResult, OHLCData } from '@/utils/PineScriptRunner';
import ChartCanvas from './ChartCanvas';
import ChartToolbar from './ChartToolbar';
import SymbolSearch from './SymbolSearch';
import IndicatorsPanel from './IndicatorsPanel';
import PineScriptEditor from './PineScriptEditor';
import AlertsPanel from './AlertsPanel';

interface TradingChartMainProps {
  className?: string;
  defaultSymbol?: string;
}

const TradingChartMain: React.FC<TradingChartMainProps> = ({
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
  const [error, setError] = useState<string | null>(null);

  // Panels
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showPineScript, setShowPineScript] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  // Chart state
  const [indicators, setIndicators] = useState<ChartIndicator[]>(() => 
    DEFAULT_INDICATORS.map((ind, i) => ({ ...ind, id: `ind-${i}` }))
  );
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [alerts, setAlerts] = useState<ChartAlert[]>([]);
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('chart-favorites');
    return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'AAPL'];
  });

  // Zoom/Pan state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 200 });
  const [crosshair, setCrosshair] = useState<CrosshairData>({
    x: 0, y: 0, price: 0, time: 0, visible: false,
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Resize observer
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height - 50, // Minus toolbar height
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
    setError(null);

    try {
      const chartData = await chartDataService.fetchData(symbol, timeframe, 500);
      setData(chartData);
      setVisibleRange({ start: Math.max(0, chartData.length - 200), end: chartData.length });
    } catch (err) {
      setError('Failed to fetch data');
      toast({
        title: 'Error',
        description: 'Failed to fetch chart data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check alerts
  useEffect(() => {
    if (data.length === 0) return;

    const currentPrice = data[data.length - 1]?.close || 0;
    const prevPrice = data[data.length - 2]?.close || currentPrice;

    alerts.forEach(alert => {
      if (alert.triggered || alert.symbol !== symbol.symbol) return;

      let shouldTrigger = false;

      switch (alert.condition) {
        case 'crosses_above':
          shouldTrigger = prevPrice < alert.value && currentPrice >= alert.value;
          break;
        case 'crosses_below':
          shouldTrigger = prevPrice > alert.value && currentPrice <= alert.value;
          break;
        case 'greater_than':
          shouldTrigger = currentPrice > alert.value;
          break;
        case 'less_than':
          shouldTrigger = currentPrice < alert.value;
          break;
      }

      if (shouldTrigger) {
        setAlerts(prev =>
          prev.map(a => (a.id === alert.id ? { ...a, triggered: true } : a))
        );
        toast({
          title: '🔔 Alert Triggered!',
          description: alert.message,
        });
        // Play sound
        const audio = new AudioContext();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.frequency.value = 880;
        gain.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
      }
    });
  }, [data, alerts, symbol]);

  // Handlers
  const handleZoom = (delta: number, center: number) => {
    const range = visibleRange.end - visibleRange.start;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newRange = Math.max(50, Math.min(data.length, Math.round(range * zoomFactor)));
    const centerRatio = (center - 10) / (dimensions.width - 90);
    const centerIndex = visibleRange.start + range * centerRatio;
    const newStart = Math.max(0, Math.round(centerIndex - newRange * centerRatio));
    const newEnd = Math.min(data.length, newStart + newRange);
    setVisibleRange({ start: newStart, end: newEnd });
  };

  const handlePan = (delta: number) => {
    const range = visibleRange.end - visibleRange.start;
    const candleWidth = (dimensions.width - 90) / range;
    const shift = Math.round(-delta / candleWidth);
    const newStart = Math.max(0, Math.min(data.length - range, visibleRange.start + shift));
    setVisibleRange({ start: newStart, end: newStart + range });
  };

  const handleSelectSymbol = (newSymbol: ChartSymbol) => {
    setSymbol(newSymbol);
  };

  const handleToggleFavorite = (sym: string) => {
    const updated = favorites.includes(sym)
      ? favorites.filter(f => f !== sym)
      : [...favorites, sym];
    setFavorites(updated);
    localStorage.setItem('chart-favorites', JSON.stringify(updated));
  };

  const handleToggleIndicator = (id: string) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === id ? { ...ind, visible: !ind.visible } : ind))
    );
  };

  const handleUpdateIndicator = (id: string, settings: Record<string, any>) => {
    setIndicators(prev =>
      prev.map(ind => (ind.id === id ? { ...ind, settings } : ind))
    );
  };

  const handleApplyPineScript = (results: PineScriptResult[], name: string) => {
    results.forEach((result, i) => {
      const newIndicator: ChartIndicator = {
        id: `pine-${Date.now()}-${i}`,
        name: result.name,
        type: 'overlay',
        visible: true,
        settings: {},
        color: result.color || '#f97316',
        pineScript: name,
      };
      setIndicators(prev => [...prev, newIndicator]);
    });
  };

  // Current price
  const currentPrice = data[data.length - 1]?.close || 0;
  const prevPrice = data[data.length - 2]?.close || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Convert OHLCV to OHLC for PineScript
  const ohlcData: OHLCData[] = data.map(d => ({
    timestamp: d.timestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
  }));

  return (
    <div ref={containerRef} className={`flex flex-col h-full bg-[#0f172a] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/50 border-b border-terminal-green/20">
        <div className="flex items-center gap-4">
          {/* Symbol selector */}
          <button
            onClick={() => setShowSymbolSearch(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono font-bold text-lg text-terminal-green">
              {symbol.symbol}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {symbol.exchange}
            </Badge>
          </button>

          {/* Price display */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-foreground">
              {currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: symbol.type === 'crypto' ? 2 : 2,
              })}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-mono text-sm">
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="text-terminal-green"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Toolbar */}
      <ChartToolbar
        selectedDrawingTool={selectedDrawingTool}
        onSelectDrawingTool={setSelectedDrawingTool}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        onToggleIndicators={() => setShowIndicators(true)}
        onTogglePineScript={() => setShowPineScript(true)}
        onToggleAlerts={() => setShowAlerts(true)}
        onToggleMultiChart={() => toast({ title: 'Coming Soon', description: 'Multi-chart layout' })}
        onResetZoom={() => setVisibleRange({ start: Math.max(0, data.length - 200), end: data.length })}
        onZoomIn={() => handleZoom(-1, dimensions.width / 2)}
        onZoomOut={() => handleZoom(1, dimensions.width / 2)}
        onFullscreen={() => containerRef.current?.requestFullscreen?.()}
        onClearDrawings={() => setDrawings([])}
        onSaveChart={() => {
          localStorage.setItem(`chart-${symbol.symbol}`, JSON.stringify({ drawings, indicators }));
          toast({ title: 'Chart Saved' });
        }}
        onScreenshot={() => toast({ title: 'Screenshot', description: 'Feature coming soon' })}
      />

      {/* Chart Canvas */}
      <div className="flex-1 relative">
        {isLoading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-terminal-green" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          <ChartCanvas
            data={data}
            width={dimensions.width}
            height={dimensions.height}
            indicators={indicators}
            drawings={drawings}
            selectedDrawingTool={selectedDrawingTool}
            onAddDrawing={(drawing) => setDrawings(prev => [...prev, drawing])}
            crosshair={crosshair}
            onCrosshairMove={setCrosshair}
            visibleRange={visibleRange}
            onZoom={handleZoom}
            onPan={handlePan}
          />
        )}

        {/* Crosshair info */}
        {crosshair.visible && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-card/80 rounded text-xs font-mono">
            <span className="text-muted-foreground">Price: </span>
            <span className="text-foreground">{crosshair.price.toFixed(2)}</span>
            {crosshair.time > 0 && (
              <>
                <span className="text-muted-foreground ml-3">Time: </span>
                <span className="text-foreground">
                  {new Date(crosshair.time).toLocaleString()}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Panels */}
      <SymbolSearch
        isOpen={showSymbolSearch}
        onClose={() => setShowSymbolSearch(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={symbol}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />

      <IndicatorsPanel
        isOpen={showIndicators}
        onClose={() => setShowIndicators(false)}
        indicators={indicators}
        onToggleIndicator={handleToggleIndicator}
        onUpdateIndicator={handleUpdateIndicator}
        onAddCustomIndicator={(ind) => setIndicators(prev => [...prev, ind])}
        onRemoveIndicator={(id) => setIndicators(prev => prev.filter(i => i.id !== id))}
      />

      <PineScriptEditor
        isOpen={showPineScript}
        onClose={() => setShowPineScript(false)}
        chartData={ohlcData}
        onApplyIndicator={handleApplyPineScript}
      />

      <AlertsPanel
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
        alerts={alerts}
        onAddAlert={(alert) => setAlerts(prev => [...prev, alert])}
        onRemoveAlert={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
        onToggleAlert={(id) => setAlerts(prev =>
          prev.map(a => (a.id === id ? { ...a, triggered: !a.triggered } : a))
        )}
        currentSymbol={symbol.symbol}
        currentPrice={currentPrice}
      />
    </div>
  );
};

export default TradingChartMain;
