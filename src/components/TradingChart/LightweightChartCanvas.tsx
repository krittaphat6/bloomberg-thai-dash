// LightweightChartCanvas - Now uses ABLE Chart Engine (custom canvas-based chart)
import React from 'react';
import { ABLEChartCanvas, DOMConfig } from './ABLEChartEngine';
import { OHLCVData } from '@/services/ChartDataService';
import { ChartTheme } from './ChartThemes';
import { ChartIndicator, DrawingTool } from './types';
import { IndicatorData } from './ABLEChartEngine/types';
import { DeepChartsConfig } from './indicators/DeepChartsEngine';

interface LightweightChartCanvasProps {
  data: OHLCVData[];
  symbol: string;
  symbolType: 'crypto' | 'stock' | 'forex' | 'set' | 'futures' | 'bond' | 'index' | 'commodity';
  timeframe: string;
  width: number;
  height: number;
  theme: ChartTheme;
  indicators?: ChartIndicator[];
  drawingMode?: string | null;
  domFullscreen?: boolean;
  onDOMFullscreenChange?: (isFullscreen: boolean) => void;
  onCrosshairMove?: (data: { price: number; time: number; visible: boolean }) => void;
  deepChartsConfig?: DeepChartsConfig;
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
  drawingMode,
  domFullscreen,
  onDOMFullscreenChange,
  onCrosshairMove,
  deepChartsConfig,
}) => {
  // Filter for DOM indicator
  const domIndicator = indicators.find(ind => ind.name === 'DOM');
  const isDOMEnabled = domIndicator?.visible === true;
  
  // DOM config
  const domConfig: DOMConfig = {
    enabled: isDOMEnabled,
    rows: (domIndicator?.settings?.rows as number) || 15,
    showVolumeBars: true,
    showImbalance: true,
    position: 'right',
    opacity: 0.95,
  };

  // Convert other indicators
  const indicatorData: IndicatorData[] = indicators
    .filter(ind => ind.visible && ind.name !== 'DOM' && ind.name !== 'DeepCharts')
    .map(ind => ({
      id: ind.id,
      name: ind.name,
      type: ind.type,
      values: [],
      color: ind.color,
      visible: ind.visible,
    }));

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
      drawingMode={drawingMode as any}
      domConfig={domConfig}
      deepChartsConfig={deepChartsConfig}
      domFullscreen={domFullscreen}
      onDOMFullscreenChange={onDOMFullscreenChange}
      onCrosshairMove={onCrosshairMove}
    />
  );
};

export default LightweightChartCanvas;
