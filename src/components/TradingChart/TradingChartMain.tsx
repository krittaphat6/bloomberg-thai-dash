import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, TrendingUp, TrendingDown, RefreshCw, PanelRightClose, PanelRight } from 'lucide-react';
import { chartDataService, ChartSymbol, Timeframe, OHLCVData } from '@/services/ChartDataService';
import { ChartIndicator, ChartAlert, DrawingTool, CrosshairData, DEFAULT_INDICATORS } from './types';
import { PineScriptResult, OHLCData } from '@/utils/PineScriptRunner';
import { ChartTheme, loadTheme, saveTheme, PRESET_THEMES } from './ChartThemes';
import LightweightChartCanvas from './LightweightChartCanvas';
import ChartToolbar from './ChartToolbar';
import SymbolSearch from './SymbolSearch';
import IndicatorsPanel from './IndicatorsPanel';
import PineScriptEditor from './PineScriptEditor';
import AlertsPanel from './AlertsPanel';
import ThemePanel from './ThemePanel';
import LayoutSelector from './LayoutSelector';
import MultiChartLayout from './MultiChartLayout';
import CustomIndicatorsPanel from './CustomIndicatorsPanel';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import MobileTradingChart from './MobileTradingChart';
import WatchlistSidebar from './WatchlistSidebar';
import ChartIndicatorsList from './ChartIndicatorsList';
import BrokerConnectButton from './BrokerConnectButton';
import { useIsMobile } from '@/hooks/use-mobile';

interface TradingChartMainProps {
  className?: string;
  defaultSymbol?: string;
}

interface ActiveCustomIndicator {
  id: string;
  name: string;
  scriptId: string;
  visible: boolean;
  color: string;
  results: PineScriptResult[];
}

const TradingChartMain: React.FC<TradingChartMainProps> = ({
  className = '',
  defaultSymbol = 'BTCUSDT',
}) => {
  const isMobile = useIsMobile();

  // Return mobile version for iPhone/mobile
  if (isMobile) {
    return <MobileTradingChart className={className} defaultSymbol={defaultSymbol} />;
  }

  return <DesktopTradingChart className={className} defaultSymbol={defaultSymbol} />;
};

// Desktop version component
const DesktopTradingChart: React.FC<TradingChartMainProps> = ({
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
  const [showTheme, setShowTheme] = useState(false);
  const [showCustomIndicators, setShowCustomIndicators] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [currentLayout, setCurrentLayout] = useState('1');
  const [layoutSyncSymbol, setLayoutSyncSymbol] = useState(true);
  const [layoutSyncTimeframe, setLayoutSyncTimeframe] = useState(true);
  const [layoutSyncCrosshair, setLayoutSyncCrosshair] = useState(true);

  const createDefaultIndicators = () =>
    DEFAULT_INDICATORS.map((ind, i) => ({ ...ind, id: `ind-${i}` }));

  // TradingView-like: indicators belong to the last focused chart panel
  const [activePanelId, setActivePanelId] = useState<string>('main');
  const [panelIndicators, setPanelIndicators] = useState<Record<string, ChartIndicator[]>>(() => ({
    main: createDefaultIndicators(),
  }));
  const [domFullscreenByPanel, setDomFullscreenByPanel] = useState<Record<string, boolean>>({});
  const [indicatorsListCollapsed, setIndicatorsListCollapsed] = useState(false);

  // Theme
  const [theme, setTheme] = useState<ChartTheme>(loadTheme);

  const activeIndicators = panelIndicators[activePanelId] ?? [];
  const isDOMFullscreen = domFullscreenByPanel[activePanelId] ?? false;

  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [alerts, setAlerts] = useState<ChartAlert[]>([]);
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('chart-favorites');
    return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'AAPL'];
  });
  const [customIndicators, setCustomIndicators] = useState<ActiveCustomIndicator[]>([]);

  // When going back to single-chart layout, always focus the main panel
  useEffect(() => {
    if (currentLayout === '1') {
      setActivePanelId('main');
    }
  }, [currentLayout]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 200 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [crosshair, setCrosshair] = useState<CrosshairData>({
    x: 0, y: 0, price: 0, time: 0, visible: false,
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Resize observer for chart container
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (chartContainerRef.current) {
      observer.observe(chartContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoom(-1, dimensions.width / 2);
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoom(1, dimensions.width / 2);
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSaveChart();
        }
        return;
      }

      // Navigation
      if (e.key === 'ArrowLeft') {
        handlePan(50);
      } else if (e.key === 'ArrowRight') {
        handlePan(-50);
      } else if (e.key === 'Home') {
        setVisibleRange({ start: 0, end: 200 });
      } else if (e.key === 'End') {
        setVisibleRange({ start: Math.max(0, data.length - 200), end: data.length });
      }

      // Panel toggles
      if (e.key === 'i' || e.key === 'I') {
        setShowIndicators(prev => !prev);
      } else if (e.key === 'p' || e.key === 'P') {
        setShowPineScript(prev => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        setShowTheme(prev => !prev);
      } else if (e.key === 'Escape') {
        setSelectedDrawingTool(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dimensions, data.length]);

  // Fetch data - 1000 candles for crypto, 500 for others
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Crypto: fetch maximum 1000 candles from Binance for full historical view
      const limit = symbol.type === 'crypto' ? 1000 : 500;
      const chartData = await chartDataService.fetchData(symbol, timeframe, limit);
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

  // Auto refresh - 1s for crypto, 60s for others
  useEffect(() => {
    const isCrypto = symbol.type === 'crypto';
    const interval = setInterval(fetchData, isCrypto ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [fetchData, symbol.type]);

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
    
    // Update zoom level indicator
    const newZoom = Math.round((200 / (newEnd - newStart)) * 100);
    setZoomLevel(Math.max(10, Math.min(500, newZoom)));
  };

  const handleZoomReset = () => {
    setVisibleRange({ start: Math.max(0, data.length - 200), end: data.length });
    setZoomLevel(100);
  };

  const handleZoomChange = (level: number) => {
    const targetRange = Math.round(200 * (100 / level));
    const currentCenter = (visibleRange.start + visibleRange.end) / 2;
    const newStart = Math.max(0, Math.round(currentCenter - targetRange / 2));
    const newEnd = Math.min(data.length, newStart + targetRange);
    setVisibleRange({ start: newStart, end: newEnd });
    setZoomLevel(level);
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

  const updatePanelIndicators = useCallback(
    (panelId: string, updater: (prev: ChartIndicator[]) => ChartIndicator[]) => {
      setPanelIndicators(prev => ({
        ...prev,
        [panelId]: updater(prev[panelId] ?? []),
      }));
    },
    []
  );

  const setPanelDomFullscreen = useCallback((panelId: string, next: boolean) => {
    setDomFullscreenByPanel(prev => ({ ...prev, [panelId]: next }));
  }, []);

  const handleToggleIndicator = (panelId: string, id: string) => {
    updatePanelIndicators(panelId, prev =>
      prev.map(ind => (ind.id === id ? { ...ind, visible: !ind.visible } : ind))
    );
  };

  const handleUpdateIndicator = (panelId: string, id: string, settings: Record<string, any>) => {
    updatePanelIndicators(panelId, prev =>
      prev.map(ind => (ind.id === id ? { ...ind, settings } : ind))
    );
  };

  const handleAddIndicator = (panelId: string, indicator: ChartIndicator) => {
    updatePanelIndicators(panelId, prev => [...prev, indicator]);
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
      handleAddIndicator(activePanelId, newIndicator);
    });
  };

  const handleThemeChange = (newTheme: ChartTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleAddCustomIndicator = (indicator: ActiveCustomIndicator) => {
    setCustomIndicators(prev => [...prev, indicator]);
  };

  const handleRemoveCustomIndicator = (id: string) => {
    setCustomIndicators(prev => prev.filter(i => i.id !== id));
  };

  const handleToggleCustomIndicator = (id: string) => {
    setCustomIndicators(prev =>
      prev.map(i => (i.id === id ? { ...i, visible: !i.visible } : i))
    );
  };

  // Remove indicator from chart (panel scoped)
  const handleRemoveIndicator = (panelId: string, id: string) => {
    updatePanelIndicators(panelId, prev => prev.filter(i => i.id !== id));
    setPanelDomFullscreen(panelId, false);

    toast({
      title: 'Indicator Removed',
      description: 'Indicator has been removed from chart',
    });
  };

  // Open indicator settings (focus panel, open panel)
  const handleIndicatorSettings = (panelId: string, id: string) => {
    setActivePanelId(panelId);
    setShowIndicators(true);
  };

  const handleSaveChart = () => {
    localStorage.setItem(
      `chart-${symbol.symbol}`,
      JSON.stringify({ drawings, indicators: activeIndicators })
    );
    toast({ title: 'Chart Saved' });
  };

  const handleScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${symbol.symbol}-${timeframe}-chart.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast({ title: 'Screenshot saved' });
    }
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
    <div ref={containerRef} className={`flex h-full ${className}`} style={{ backgroundColor: theme.colors.background }}>
      {/* Main Chart Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-card/50 border-b border-terminal-green/20">
          <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">
                {currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
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

          <div className="flex items-center gap-2">
            {/* Broker Connect Button */}
            <BrokerConnectButton 
              symbol={symbol.symbol} 
              currentPrice={currentPrice}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="text-terminal-green"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWatchlist(!showWatchlist)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showWatchlist ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </Button>
          </div>
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
          onToggleMultiChart={() => setShowLayoutSelector(true)}
          onToggleTheme={() => setShowTheme(true)}
          onToggleCustomIndicators={() => setShowCustomIndicators(true)}
          onToggleKeyboardHelp={() => setShowKeyboardHelp(true)}
          zoomLevel={zoomLevel}
          onZoomIn={() => handleZoom(-1, dimensions.width / 2)}
          onZoomOut={() => handleZoom(1, dimensions.width / 2)}
          onZoomReset={handleZoomReset}
          onZoomChange={handleZoomChange}
          onFullscreen={() => containerRef.current?.requestFullscreen?.()}
          onClearDrawings={() => setDrawings([])}
          onSaveChart={handleSaveChart}
          onScreenshot={handleScreenshot}
        />

        {/* Chart Canvas - Single or Multi-panel based on layout */}
        <div ref={chartContainerRef} className="flex-1 relative min-h-0">
          {currentLayout === '1' ? (
            // Single chart mode
            <>
              {isLoading && data.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-terminal-green" />
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center text-destructive">
                  {error}
                </div>
              ) : (
                <LightweightChartCanvas
                  data={data}
                  symbol={symbol.symbol}
                  symbolType={symbol.type}
                  timeframe={timeframe}
                  width={dimensions.width}
                  height={dimensions.height}
                  theme={theme}
                  indicators={panelIndicators.main ?? []}
                  domFullscreen={domFullscreenByPanel.main ?? false}
                  onDOMFullscreenChange={(next) => setPanelDomFullscreen('main', next)}
                  onCrosshairMove={(data) => setCrosshair({ ...crosshair, ...data, x: 0, y: 0 })}
                />
              )}

              {/* Indicators List - TradingView style */}
              <ChartIndicatorsList
                indicators={panelIndicators.main ?? []}
                onToggleVisibility={(id) => handleToggleIndicator('main', id)}
                onRemove={(id) => handleRemoveIndicator('main', id)}
                onSettings={(id) => handleIndicatorSettings('main', id)}
                collapsed={indicatorsListCollapsed}
                onToggleCollapse={() => setIndicatorsListCollapsed(!indicatorsListCollapsed)}
              />

              {/* Crosshair info - moved to right side */}
              {crosshair.visible && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-card/80 rounded text-xs font-mono">
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
            </>
          ) : (
            // Multi-chart layout mode
            <MultiChartLayout
              layoutId={currentLayout}
              mainSymbol={symbol}
              timeframe={timeframe}
              theme={theme}
              syncSymbol={layoutSyncSymbol}
              syncTimeframe={layoutSyncTimeframe}
              syncCrosshair={layoutSyncCrosshair}
              onMainSymbolChange={handleSelectSymbol}
              indicatorsByPanel={panelIndicators}
              domFullscreenByPanel={domFullscreenByPanel}
              onDOMFullscreenChangeForPanel={setPanelDomFullscreen}
              onFocusPanel={(panelId) => setActivePanelId(panelId)}
            />
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
          indicators={activeIndicators}
          onToggleIndicator={(id) => handleToggleIndicator(activePanelId, id)}
          onUpdateIndicator={(id, settings) => handleUpdateIndicator(activePanelId, id, settings)}
          onAddCustomIndicator={(ind) => handleAddIndicator(activePanelId, ind)}
          onRemoveIndicator={(id) => handleRemoveIndicator(activePanelId, id)}
          chartPanels={
            currentLayout === '1'
              ? [{ id: 'main', label: 'Main Chart' }]
              : Array.from({ length: parseInt(currentLayout) || 2 }, (_, i) => ({
                  id: `panel-${i}`,
                  label: i === 0 ? 'Main Chart' : `Chart ${i + 1}`,
                }))
          }
          selectedDOMPanel={activePanelId}
          onSelectDOMPanel={setActivePanelId}
          onDOMClose={() => setPanelDomFullscreen(activePanelId, false)}
          isDOMFullscreen={isDOMFullscreen}
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

        <ThemePanel
          isOpen={showTheme}
          onClose={() => setShowTheme(false)}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
        />

        <CustomIndicatorsPanel
          isOpen={showCustomIndicators}
          onClose={() => setShowCustomIndicators(false)}
          chartData={ohlcData}
          activeIndicators={customIndicators}
          onAddIndicator={handleAddCustomIndicator}
          onRemoveIndicator={handleRemoveCustomIndicator}
          onToggleIndicator={handleToggleCustomIndicator}
          onOpenPineEditor={() => {
            setShowCustomIndicators(false);
            setShowPineScript(true);
          }}
        />

        <KeyboardShortcutsHelp
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
        />

        <LayoutSelector
          isOpen={showLayoutSelector}
          onClose={() => setShowLayoutSelector(false)}
          currentLayout={currentLayout}
          onLayoutChange={setCurrentLayout}
        />
      </div>

      {/* Watchlist Sidebar */}
      {showWatchlist && (
        <WatchlistSidebar
          onSelectSymbol={handleSelectSymbol}
          currentSymbol={symbol.symbol}
          className="w-64 flex-shrink-0"
        />
      )}
    </div>
  );
};

export default TradingChartMain;
