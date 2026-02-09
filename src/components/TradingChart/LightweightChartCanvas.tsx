// LightweightChartCanvas - Now uses ABLE Chart Engine (custom canvas-based chart)
import React from 'react';
import { ABLEChartCanvas, DOMConfig } from './ABLEChartEngine';
import { OHLCVData } from '@/services/ChartDataService';
import { ChartTheme } from './ChartThemes';
import { ChartIndicator, DrawingTool } from './types';
import { IndicatorData } from './ABLEChartEngine/types';

interface LightweightChartCanvasProps {
  data: OHLCVData[];
  symbol: string;
  symbolType: 'crypto' | 'stock' | 'forex' | 'set';
  timeframe: string;
  width: number;
  height: number;
  theme: ChartTheme;
  indicators?: ChartIndicator[];
  domFullscreen?: boolean;
  onDOMFullscreenChange?: (isFullscreen: boolean) => void;
  onCrosshairMove?: (data: { price: number; time: number; visible: boolean }) => void;
}

export const LightweightChartCanvas: React.FC<LightweightChartCanvasProps> = ({
  data,
  symbol,
  symbolType,
  timeframe,
  width,
  height,
  theme,
  indicators = [],
  domFullscreen,
  onDOMFullscreenChange,
  onCrosshairMove,
}) => {
  // Filter for DOM indicator - only show DOM when explicitly enabled via indicator
  const domIndicator = indicators.find(ind => ind.name === 'DOM');
  const isDOMEnabled = domIndicator?.visible === true;
  
  // Filter for OI Bubbles indicator
  const oiBubblesIndicator = indicators.find(ind => ind.name === 'OI Bubbles');
  const isOIBubblesEnabled = oiBubblesIndicator?.visible === true;
  
  // DOM config - ONLY enabled when DOM indicator is visible (removed auto-enable for crypto)
  const domConfig: DOMConfig = {
    enabled: isDOMEnabled,
    rows: (domIndicator?.settings?.rows as number) || 15,
    showVolumeBars: true,
    showImbalance: true,
    position: 'right',
    opacity: 0.95,
  };
  
  // OI Bubbles config
  const oiBubblesConfig = isOIBubblesEnabled ? {
    enabled: true,
    threshold: (oiBubblesIndicator?.settings?.threshold as number) || 1.5,
    extremeThreshold: (oiBubblesIndicator?.settings?.extremeThreshold as number) || 3.0,
  } : undefined;

  // Convert other indicators (SMA/EMA) if any - but DOM is primary
  const indicatorData: IndicatorData[] = indicators
    .filter(ind => ind.visible && ind.type === 'overlay' && ind.name !== 'DOM')
    .map(ind => {
      let values: number[] = [];
      
      // Skip calculating MA values - DOM is the focus now
      return {
        id: ind.id,
        name: ind.name,
        type: ind.type,
        values,
        color: ind.color,
        visible: ind.visible,
      };
    });

  if (width <= 0 || height <= 0) {
    return (
      <div 
        className="flex items-center justify-center bg-background text-muted-foreground"
        style={{ width: '100%', height: '100%', minHeight: 400 }}
      >
        Loading chart...
      </div>
    );
  }

  return (
    <ABLEChartCanvas
      data={data}
      symbol={symbol}
      symbolType={symbolType}
      timeframe={timeframe}
      width={width}
      height={height}
      theme={theme}
      indicators={indicatorData}
      domConfig={domConfig}
      oiBubblesConfig={oiBubblesConfig}
      domFullscreen={domFullscreen}
      onDOMFullscreenChange={onDOMFullscreenChange}
      onCrosshairMove={onCrosshairMove}
    />
  );
};

export default LightweightChartCanvas;
