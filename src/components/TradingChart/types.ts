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
  type: 'overlay' | 'oscillator' | 'dom';
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
  { name: 'DOM', type: 'dom', visible: true, settings: { rows: 15, showImbalance: true }, color: '#00ff88' },
  { name: 'Volume', type: 'oscillator', visible: true, settings: {}, color: '#3b82f6' },
];
