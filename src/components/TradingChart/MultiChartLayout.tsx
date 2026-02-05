import React, { useMemo } from 'react';
import { ChartSymbol, Timeframe } from '@/services/ChartDataService';
import { ChartTheme } from './ChartThemes';
import MultiChartPanel from './MultiChartPanel';

// Layout configuration type
interface LayoutConfig {
  id: string;
  panels: number[][]; // Each sub-array represents a row, numbers are column spans
}

// All layout configurations
const LAYOUT_CONFIGS: Record<string, LayoutConfig> = {
  '1': { id: '1', panels: [[1]] },
  '2-h': { id: '2-h', panels: [[1], [1]] },
  '2-v': { id: '2-v', panels: [[1, 1]] },
  '3-top': { id: '3-top', panels: [[1], [1, 1]] },
  '3-bottom': { id: '3-bottom', panels: [[1, 1], [1]] },
  '3-left': { id: '3-left', panels: [[1, 2]] },
  '3-h': { id: '3-h', panels: [[1], [1], [1]] },
  '3-v': { id: '3-v', panels: [[1, 1, 1]] },
  '3-right': { id: '3-right', panels: [[2, 1]] },
  '3-big-left': { id: '3-big-left', panels: [[1, 2]] },
  '4-grid': { id: '4-grid', panels: [[1, 1], [1, 1]] },
  '4-top': { id: '4-top', panels: [[1], [1, 1, 1]] },
  '4-bottom': { id: '4-bottom', panels: [[1, 1, 1], [1]] },
  '4-left': { id: '4-left', panels: [[1, 1, 1], [1, 1, 1]] },
  '4-right': { id: '4-right', panels: [[2, 1], [1, 1]] },
  '4-h': { id: '4-h', panels: [[1], [1], [1], [1]] },
  '4-v': { id: '4-v', panels: [[1, 1, 1, 1]] },
  '5-cross': { id: '5-cross', panels: [[1, 1], [1], [1, 1]] },
  '5-top': { id: '5-top', panels: [[1], [1, 1], [1, 1]] },
  '5-grid': { id: '5-grid', panels: [[1, 1, 1], [1, 1]] },
  '6-grid': { id: '6-grid', panels: [[1, 1], [1, 1], [1, 1]] },
  '6-wide': { id: '6-wide', panels: [[1, 1, 1], [1, 1, 1]] },
  '8-grid': { id: '8-grid', panels: [[1, 1, 1, 1], [1, 1, 1, 1]] },
  '9-grid': { id: '9-grid', panels: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  '12-grid': { id: '12-grid', panels: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
  '16-grid': { id: '16-grid', panels: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
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
}) => {
  // Get layout config
  const config = LAYOUT_CONFIGS[layoutId] || LAYOUT_CONFIGS['1'];
  
  // Calculate total panels needed
  const totalPanels = useMemo(() => {
    return config.panels.reduce((sum, row) => sum + row.length, 0);
  }, [config]);

  // Generate panel configs
  const panelConfigs = useMemo(() => {
    const configs: { id: string; symbol: ChartSymbol; isMain: boolean; rowIndex: number; colIndex: number }[] = [];
    let panelIndex = 0;
    
    config.panels.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        configs.push({
          id: `panel-${rowIndex}-${colIndex}`,
          symbol: panelIndex === 0 ? mainSymbol : DEFAULT_PANEL_SYMBOLS[panelIndex % DEFAULT_PANEL_SYMBOLS.length],
          isMain: panelIndex === 0,
          rowIndex,
          colIndex,
        });
        panelIndex++;
      });
    });
    
    return configs;
  }, [config, mainSymbol]);

  // Generate CSS grid template
  const gridStyle = useMemo(() => {
    const rows = config.panels.length;
    const maxCols = Math.max(...config.panels.map(r => r.length));
    
    return {
      display: 'grid',
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
      gap: '4px',
      height: '100%',
      width: '100%',
    };
  }, [config]);

  // Render panels per row
  const renderPanels = () => {
    let panelIdx = 0;
    
    return config.panels.map((row, rowIndex) => {
      const maxCols = Math.max(...config.panels.map(r => r.length));
      
      return row.map((span, colIndex) => {
        const panelConfig = panelConfigs[panelIdx];
        panelIdx++;
        
        // Calculate grid span
        const colSpan = Math.floor(maxCols / row.length);
        
        return (
          <div
            key={panelConfig.id}
            style={{
              gridColumn: `span ${colSpan}`,
            }}
          >
            <MultiChartPanel
              id={panelConfig.id}
              symbol={panelConfig.symbol}
              timeframe={timeframe}
              theme={theme}
              syncSymbol={syncSymbol ? mainSymbol : undefined}
              syncTimeframe={syncTimeframe ? timeframe : undefined}
              syncCrosshair={syncCrosshair}
              onSymbolChange={panelConfig.isMain ? onMainSymbolChange : undefined}
              isMainPanel={panelConfig.isMain}
            />
          </div>
        );
      });
    });
  };

  return (
    <div style={gridStyle} className="p-1">
      {renderPanels()}
    </div>
  );
};

export default MultiChartLayout;
