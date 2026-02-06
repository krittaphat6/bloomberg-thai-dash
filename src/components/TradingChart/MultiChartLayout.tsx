import React, { useMemo, useRef, useEffect, useState } from 'react';
import { ChartSymbol, Timeframe } from '@/services/ChartDataService';
import { ChartTheme } from './ChartThemes';
import MultiChartPanel from './MultiChartPanel';
import type { ChartIndicator } from './types';

// Layout configuration type
interface LayoutConfig {
  id: string;
  rows: number;
  cols: number;
  panels: { row: number; col: number; rowSpan?: number; colSpan?: number }[];
}

// All layout configurations with explicit grid positions
const LAYOUT_CONFIGS: Record<string, LayoutConfig> = {
  '1': { id: '1', rows: 1, cols: 1, panels: [{ row: 1, col: 1 }] },
  '2-h': { id: '2-h', rows: 2, cols: 1, panels: [{ row: 1, col: 1 }, { row: 2, col: 1 }] },
  '2-v': { id: '2-v', rows: 1, cols: 2, panels: [{ row: 1, col: 1 }, { row: 1, col: 2 }] },
  '3-top': { id: '3-top', rows: 2, cols: 2, panels: [
    { row: 1, col: 1, colSpan: 2 },
    { row: 2, col: 1 }, { row: 2, col: 2 }
  ]},
  '3-bottom': { id: '3-bottom', rows: 2, cols: 2, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 1, colSpan: 2 }
  ]},
  '3-left': { id: '3-left', rows: 2, cols: 2, panels: [
    { row: 1, col: 1, rowSpan: 2 },
    { row: 1, col: 2 }, { row: 2, col: 2 }
  ]},
  '3-h': { id: '3-h', rows: 3, cols: 1, panels: [
    { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }
  ]},
  '3-v': { id: '3-v', rows: 1, cols: 3, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }
  ]},
  '3-right': { id: '3-right', rows: 2, cols: 2, panels: [
    { row: 1, col: 1 }, { row: 2, col: 1 },
    { row: 1, col: 2, rowSpan: 2 }
  ]},
  '4-grid': { id: '4-grid', rows: 2, cols: 2, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 1 }, { row: 2, col: 2 }
  ]},
  '4-top': { id: '4-top', rows: 2, cols: 3, panels: [
    { row: 1, col: 1, colSpan: 3 },
    { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }
  ]},
  '4-bottom': { id: '4-bottom', rows: 2, cols: 3, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
    { row: 2, col: 1, colSpan: 3 }
  ]},
  '4-left': { id: '4-left', rows: 3, cols: 2, panels: [
    { row: 1, col: 1, rowSpan: 3 },
    { row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }
  ]},
  '4-right': { id: '4-right', rows: 3, cols: 2, panels: [
    { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 },
    { row: 1, col: 2, rowSpan: 3 }
  ]},
  '4-h': { id: '4-h', rows: 4, cols: 1, panels: [
    { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }, { row: 4, col: 1 }
  ]},
  '4-v': { id: '4-v', rows: 1, cols: 4, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }
  ]},
  '5-cross': { id: '5-cross', rows: 3, cols: 2, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 1, colSpan: 2 },
    { row: 3, col: 1 }, { row: 3, col: 2 }
  ]},
  '5-top': { id: '5-top', rows: 3, cols: 2, panels: [
    { row: 1, col: 1, colSpan: 2 },
    { row: 2, col: 1 }, { row: 2, col: 2 },
    { row: 3, col: 1 }, { row: 3, col: 2 }
  ]},
  '5-grid': { id: '5-grid', rows: 2, cols: 3, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
    { row: 2, col: 1 }, { row: 2, col: 2 }
  ]},
  '6-grid': { id: '6-grid', rows: 3, cols: 2, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 1 }, { row: 2, col: 2 },
    { row: 3, col: 1 }, { row: 3, col: 2 }
  ]},
  '6-wide': { id: '6-wide', rows: 2, cols: 3, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
    { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }
  ]},
  '8-grid': { id: '8-grid', rows: 2, cols: 4, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
    { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }
  ]},
  '9-grid': { id: '9-grid', rows: 3, cols: 3, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
    { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
    { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }
  ]},
  '12-grid': { id: '12-grid', rows: 3, cols: 4, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
    { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
    { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 }
  ]},
  '16-grid': { id: '16-grid', rows: 4, cols: 4, panels: [
    { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
    { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 },
    { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 },
    { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }
  ]},
};

// Default symbols for panels
const DEFAULT_PANEL_SYMBOLS: ChartSymbol[] = [
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
  { symbol: 'LINKUSDT', name: 'Chainlink', exchange: 'Binance', type: 'crypto' },
  { symbol: 'ATOMUSDT', name: 'Cosmos', exchange: 'Binance', type: 'crypto' },
  { symbol: 'LTCUSDT', name: 'Litecoin', exchange: 'Binance', type: 'crypto' },
  { symbol: 'UNIUSDT', name: 'Uniswap', exchange: 'Binance', type: 'crypto' },
  { symbol: 'NEARUSDT', name: 'Near', exchange: 'Binance', type: 'crypto' },
  { symbol: 'AAVEUSDT', name: 'Aave', exchange: 'Binance', type: 'crypto' },
];

interface MultiChartLayoutProps {
  layoutId: string;
  mainSymbol: ChartSymbol;
  timeframe: Timeframe;
  theme: ChartTheme;
  syncSymbol: boolean;
  syncTimeframe: boolean;
  syncCrosshair: boolean;
  onMainSymbolChange: (symbol: ChartSymbol) => void;
  indicatorsByPanel?: Record<string, ChartIndicator[]>;
  domFullscreenByPanel?: Record<string, boolean>;
  onDOMFullscreenChangeForPanel?: (panelId: string, isFullscreen: boolean) => void;
  onFocusPanel?: (panelId: string) => void;
}

const MultiChartLayout: React.FC<MultiChartLayoutProps> = ({
  layoutId,
  mainSymbol,
  timeframe,
  theme,
  syncSymbol,
  syncTimeframe,
  syncCrosshair,
  onMainSymbolChange,
  indicatorsByPanel = {},
  domFullscreenByPanel = {},
  onDOMFullscreenChangeForPanel,
  onFocusPanel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Get layout config
  const config = LAYOUT_CONFIGS[layoutId] || LAYOUT_CONFIGS['1'];

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    observer.observe(container);
    
    // Initial size
    const rect = container.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    
    return () => observer.disconnect();
  }, []);

  // Generate panel configs with symbols
  const panelConfigs = useMemo(() => {
    return config.panels.map((panel, index) => ({
      ...panel,
      id: `panel-${index}`,
      symbol: index === 0 ? mainSymbol : DEFAULT_PANEL_SYMBOLS[index % DEFAULT_PANEL_SYMBOLS.length],
      isMain: index === 0,
    }));
  }, [config, mainSymbol]);

  // Calculate minimum dimensions based on layout
  const minPanelHeight = 120;
  const minPanelWidth = 150;
  const gap = 4;
  
  // Calculate actual cell dimensions
  const cellWidth = containerSize.width > 0 
    ? Math.max(minPanelWidth, (containerSize.width - gap * (config.cols - 1)) / config.cols)
    : minPanelWidth;
  const cellHeight = containerSize.height > 0 
    ? Math.max(minPanelHeight, (containerSize.height - gap * (config.rows - 1)) / config.rows)
    : minPanelHeight;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-auto"
      style={{ 
        padding: '2px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${config.rows}, minmax(${minPanelHeight}px, 1fr))`,
          gridTemplateColumns: `repeat(${config.cols}, minmax(${minPanelWidth}px, 1fr))`,
          gap: `${gap}px`,
          width: '100%',
          height: '100%',
          minWidth: config.cols * minPanelWidth + (config.cols - 1) * gap,
          minHeight: config.rows * minPanelHeight + (config.rows - 1) * gap,
        }}
      >
        {panelConfigs.map((panelConfig) => (
          <div
            key={panelConfig.id}
            style={{
              gridRow: panelConfig.rowSpan 
                ? `${panelConfig.row} / span ${panelConfig.rowSpan}`
                : panelConfig.row,
              gridColumn: panelConfig.colSpan 
                ? `${panelConfig.col} / span ${panelConfig.colSpan}`
                : panelConfig.col,
              minHeight: minPanelHeight,
              minWidth: minPanelWidth,
            }}
          >
            <MultiChartPanel
              id={panelConfig.id}
              symbol={panelConfig.symbol}
              timeframe={timeframe}
              theme={theme}
              indicators={indicatorsByPanel[panelConfig.id] ?? []}
              domFullscreen={domFullscreenByPanel[panelConfig.id] ?? false}
              onDOMFullscreenChange={(next) => onDOMFullscreenChangeForPanel?.(panelConfig.id, next)}
              onFocus={onFocusPanel}
              syncSymbol={syncSymbol ? mainSymbol : undefined}
              syncTimeframe={syncTimeframe ? timeframe : undefined}
              syncCrosshair={syncCrosshair}
              onSymbolChange={panelConfig.isMain ? onMainSymbolChange : undefined}
              isMainPanel={panelConfig.isMain}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiChartLayout;
