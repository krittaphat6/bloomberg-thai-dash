// ABLE Chart Engine Types
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartViewport {
  startIndex: number;
  endIndex: number;
  priceMin: number;
  priceMax: number;
  offsetX: number;
  scaleX: number;
  scaleY: number;
}

export interface ChartThemeColors {
  background: string;
  grid: string;
  text: string;
  crosshair: string;
  bullCandle: { fill: string; border: string };
  bearCandle: { fill: string; border: string };
  volumeUp: string;
  volumeDown: string;
}

export interface DrawingObject {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'rectangle';
  points: { x: number; y: number; price: number; time: number }[];
  color: string;
  lineWidth: number;
  isComplete: boolean;
}

export interface CrosshairState {
  visible: boolean;
  x: number;
  y: number;
  price: number;
  time: number;
  candle: Candle | null;
}

export interface ChartDimensions {
  width: number;
  height: number;
  chartArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  priceAxisWidth: number;
  timeAxisHeight: number;
  volumeHeight: number;
}

export interface IndicatorData {
  id: string;
  name: string;
  type: 'overlay' | 'oscillator';
  values: number[];
  color: string;
  visible: boolean;
}

export type ChartMode = 'normal' | 'drawing' | 'measuring';
export type DrawingType = 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'rectangle';
