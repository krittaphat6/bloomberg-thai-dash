// Trading Chart Types
export interface DrawingTool {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'rectangle' | 'triangle' | 'text' | 'arrow';
  points: { x: number; y: number; price?: number; time?: number }[];
  color: string;
  lineWidth: number;
  isComplete: boolean;
}

export interface ChartIndicator {
  id: string;
  name: string;
  type: 'overlay' | 'oscillator';
  visible: boolean;
  settings: Record<string, number | string | boolean>;
  pineScript?: string;
  color: string;
}

export interface ChartAlert {
  id: string;
  symbol: string;
  condition: 'crosses_above' | 'crosses_below' | 'greater_than' | 'less_than';
  value: number;
  message: string;
  triggered: boolean;
  createdAt: number;
}

export interface ChartLayout {
  id: string;
  name: string;
  rows: number;
  cols: number;
  charts: { row: number; col: number; symbol: string; timeframe: string }[];
}

export interface CrosshairData {
  x: number;
  y: number;
  price: number;
  time: number;
  visible: boolean;
}

export const CHART_COLORS = {
  bullish: '#22c55e',
  bearish: '#ef4444',
  volume: '#3b82f6',
  grid: '#1e293b',
  text: '#94a3b8',
  crosshair: '#64748b',
  background: '#0f172a',
};

export const DEFAULT_INDICATORS: Omit<ChartIndicator, 'id'>[] = [
  { name: 'SMA 20', type: 'overlay', visible: false, settings: { length: 20 }, color: '#3b82f6' },
  { name: 'SMA 50', type: 'overlay', visible: false, settings: { length: 50 }, color: '#f97316' },
  { name: 'SMA 200', type: 'overlay', visible: false, settings: { length: 200 }, color: '#a855f7' },
  { name: 'EMA 9', type: 'overlay', visible: false, settings: { length: 9 }, color: '#22c55e' },
  { name: 'EMA 21', type: 'overlay', visible: false, settings: { length: 21 }, color: '#eab308' },
  { name: 'Bollinger Bands', type: 'overlay', visible: false, settings: { length: 20, mult: 2 }, color: '#8b5cf6' },
  { name: 'RSI', type: 'oscillator', visible: false, settings: { length: 14 }, color: '#f97316' },
  { name: 'MACD', type: 'oscillator', visible: false, settings: { fast: 12, slow: 26, signal: 9 }, color: '#3b82f6' },
  { name: 'Stochastic', type: 'oscillator', visible: false, settings: { k: 14, d: 3, smooth: 3 }, color: '#22c55e' },
  { name: 'Volume', type: 'oscillator', visible: true, settings: {}, color: '#3b82f6' },
];
