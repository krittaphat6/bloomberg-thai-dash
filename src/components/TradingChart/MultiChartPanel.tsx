import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { chartDataService, ChartSymbol, Timeframe, OHLCVData } from '@/services/ChartDataService';
import { ChartTheme } from './ChartThemes';
import LightweightChartCanvas from './LightweightChartCanvas';

interface MultiChartPanelProps {
  id: string;
  symbol: ChartSymbol;
  timeframe: Timeframe;
  theme: ChartTheme;
  syncSymbol?: ChartSymbol;
  syncTimeframe?: Timeframe;
  syncCrosshair?: boolean;
  onSymbolChange?: (symbol: ChartSymbol) => void;
  onClose?: () => void;
  isMainPanel?: boolean;
}

const MultiChartPanel: React.FC<MultiChartPanelProps> = ({
  id,
  symbol: initialSymbol,
  timeframe: initialTimeframe,
  theme,
  syncSymbol,
  syncTimeframe,
  syncCrosshair,
  onSymbolChange,
  onClose,
  isMainPanel = false,
}) => {
  const [symbol, setSymbol] = useState<ChartSymbol>(syncSymbol || initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(syncTimeframe || initialTimeframe);
  const [data, setData] = useState<OHLCVData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSymbolInput, setShowSymbolInput] = useState(false);
  const [symbolQuery, setSymbolQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChartSymbol[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  // Sync with parent
  useEffect(() => {
    if (syncSymbol && syncSymbol.symbol !== symbol.symbol) {
      setSymbol(syncSymbol);
    }
  }, [syncSymbol]);

  useEffect(() => {
    if (syncTimeframe && syncTimeframe !== timeframe) {
      setTimeframe(syncTimeframe);
    }
  }, [syncTimeframe]);

  // Resize observer
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height - 32, // Subtract header height
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
      const limit = symbol.type === 'crypto' ? 1000 : 500;
      const chartData = await chartDataService.fetchData(symbol, timeframe, limit);
      setData(chartData);
    } catch (err) {
      console.error('Panel fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    const isCrypto = symbol.type === 'crypto';
    const interval = setInterval(fetchData, isCrypto ? 5000 : 60000);
    return () => clearInterval(interval);
  }, [fetchData, symbol.type]);

  // Search symbols
  const handleSearch = useCallback(async (query: string) => {
    setSymbolQuery(query);
    if (query.length >= 1) {
      const results = await chartDataService.searchSymbols(query);
      setSearchResults(results.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleSelectSymbol = (newSymbol: ChartSymbol) => {
    setSymbol(newSymbol);
    setShowSymbolInput(false);
    setSymbolQuery('');
    onSymbolChange?.(newSymbol);
  };

  // Current price
  const currentPrice = data[data.length - 1]?.close || 0;
  const prevPrice = data[data.length - 2]?.close || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const isPositive = priceChange >= 0;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full border border-terminal-green/20 rounded overflow-hidden bg-background"
    >
      {/* Mini Header */}
      <div className="h-8 flex items-center justify-between px-2 bg-card/80 border-b border-terminal-green/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          {showSymbolInput ? (
            <div className="relative">
              <input
                type="text"
                value={symbolQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="w-32 h-6 px-2 text-xs bg-muted rounded border border-terminal-green/30 focus:outline-none focus:border-terminal-green"
                autoFocus
                onBlur={() => setTimeout(() => setShowSymbolInput(false), 200)}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-7 left-0 w-48 bg-card border border-terminal-green/30 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchResults.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => handleSelectSymbol(s)}
                      className="w-full px-2 py-1.5 text-left text-xs hover:bg-muted/50 flex items-center justify-between"
                    >
                      <span className="font-mono text-terminal-green">{s.symbol}</span>
                      <Badge variant="outline" className="text-[8px]">{s.exchange}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSymbolInput(true)}
              className="flex items-center gap-1 text-xs font-mono text-terminal-green hover:text-terminal-green/80"
            >
              <Search className="w-3 h-3" />
              {symbol.symbol}
            </button>
          )}
          
          <span className={`text-[10px] ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Timeframe quick switch */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="h-5 px-1 text-[10px] bg-muted rounded border-none focus:outline-none text-muted-foreground"
          >
            {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="h-5 w-5 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          {!isMainPanel && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-0">
        {isLoading && data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-terminal-green" />
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
            indicators={[]}
          />
        )}
      </div>
    </div>
  );
};

export default MultiChartPanel;
