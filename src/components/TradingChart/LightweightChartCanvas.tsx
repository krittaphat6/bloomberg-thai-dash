// LightweightChartCanvas - Now uses ABLE Chart Engine (custom canvas-based chart)
import React from 'react';
import { ABLEChartCanvas } from './ABLEChartEngine';
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
  onCrosshairMove?: (data: { price: number; time: number; visible: boolean }) => void;
}

// Calculate indicator values
const calculateMA = (data: OHLCVData[], length: number, isEMA: boolean): number[] => {
  const result: number[] = [];
  
  if (isEMA) {
    const k = 2 / (length + 1);
    let ema = data[0]?.close || 0;
    
    for (let i = 0; i < data.length; i++) {
      if (i < length - 1) {
        result.push(0);
      } else {
        ema = data[i].close * k + ema * (1 - k);
        result.push(ema);
      }
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      if (i < length - 1) {
        result.push(0);
      } else {
        const sum = data.slice(i - length + 1, i + 1).reduce((a, b) => a + b.close, 0);
        result.push(sum / length);
      }
    }
  }
  
  return result;
};

export const LightweightChartCanvas: React.FC<LightweightChartCanvasProps> = ({
  data,
  symbol,
  symbolType,
  timeframe,
  width,
  height,
  theme,
  indicators = [],
  onCrosshairMove,
}) => {
  // Convert ChartIndicator to IndicatorData for the ABLE engine
  const indicatorData: IndicatorData[] = indicators
    .filter(ind => ind.visible && ind.type === 'overlay')
    .map(ind => {
      let values: number[] = [];
      
      if (ind.name.startsWith('SMA') || ind.name.startsWith('EMA')) {
        const length = (ind.settings.length as number) || 20;
        const isEMA = ind.name.startsWith('EMA');
        values = calculateMA(data, length, isEMA);
      }
      
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
      onCrosshairMove={onCrosshairMove}
    />
  );
};

export default LightweightChartCanvas;
