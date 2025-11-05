import { create } from 'zustand';

export interface ThreatData {
  id: string;
  type: 'market' | 'technical' | 'systemic' | 'geopolitical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  symbols: string[];
  probability: number;
  impact: number;
  timestamp: Date;
}

export interface PredictionData {
  symbol: string;
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  targetPrice: number;
  timeframe: string;
  reasoning: string;
  timestamp: Date;
}

export interface AlertData {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  symbol?: string;
  timestamp: Date;
  isRead: boolean;
}

export interface MarketDataState {
  [symbol: string]: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    high: number;
    low: number;
    timestamp: Date;
  };
}

interface IntelligenceState {
  // Market Data
  marketData: MarketDataState;
  updateMarketData: (symbol: string, data: any) => void;
  
  // Threats
  threats: ThreatData[];
  addThreat: (threat: ThreatData) => void;
  removeThreat: (id: string) => void;
  clearThreats: () => void;
  
  // Predictions
  predictions: PredictionData[];
  addPrediction: (prediction: PredictionData) => void;
  removePrediction: (symbol: string) => void;
  clearPredictions: () => void;
  
  // Alerts
  alerts: AlertData[];
  addAlert: (alert: Omit<AlertData, 'id' | 'timestamp' | 'isRead'>) => void;
  markAlertAsRead: (id: string) => void;
  clearAlerts: () => void;
  
  // System Status
  systemStatus: {
    foundry: 'active' | 'idle' | 'error';
    gotham: 'active' | 'idle' | 'error';
    apollo: 'active' | 'idle' | 'error';
    skynet: 'active' | 'idle' | 'error';
  };
  updateSystemStatus: (module: keyof IntelligenceState['systemStatus'], status: 'active' | 'idle' | 'error') => void;
  
  // Analytics
  analytics: {
    totalDataPoints: number;
    anomaliesDetected: number;
    correlationsFound: number;
    alertsGenerated: number;
  };
  updateAnalytics: (updates: Partial<IntelligenceState['analytics']>) => void;
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  // Market Data
  marketData: {},
  updateMarketData: (symbol, data) =>
    set((state) => ({
      marketData: {
        ...state.marketData,
        [symbol]: {
          ...data,
          timestamp: new Date()
        }
      }
    })),
  
  // Threats
  threats: [],
  addThreat: (threat) =>
    set((state) => ({
      threats: [...state.threats, threat]
    })),
  removeThreat: (id) =>
    set((state) => ({
      threats: state.threats.filter(t => t.id !== id)
    })),
  clearThreats: () => set({ threats: [] }),
  
  // Predictions
  predictions: [],
  addPrediction: (prediction) =>
    set((state) => ({
      predictions: [
        ...state.predictions.filter(p => p.symbol !== prediction.symbol),
        prediction
      ]
    })),
  removePrediction: (symbol) =>
    set((state) => ({
      predictions: state.predictions.filter(p => p.symbol !== symbol)
    })),
  clearPredictions: () => set({ predictions: [] }),
  
  // Alerts
  alerts: [],
  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        {
          ...alert,
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          isRead: false
        },
        ...state.alerts
      ]
    })),
  markAlertAsRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map(a =>
        a.id === id ? { ...a, isRead: true } : a
      )
    })),
  clearAlerts: () => set({ alerts: [] }),
  
  // System Status
  systemStatus: {
    foundry: 'idle',
    gotham: 'idle',
    apollo: 'idle',
    skynet: 'idle'
  },
  updateSystemStatus: (module, status) =>
    set((state) => ({
      systemStatus: {
        ...state.systemStatus,
        [module]: status
      }
    })),
  
  // Analytics
  analytics: {
    totalDataPoints: 0,
    anomaliesDetected: 0,
    correlationsFound: 0,
    alertsGenerated: 0
  },
  updateAnalytics: (updates) =>
    set((state) => ({
      analytics: {
        ...state.analytics,
        ...updates
      }
    }))
}));
