// ============ CONFIGURATION ============
export interface MarketRegime {
  id: string;
  name: string;
  probability: number;
  winRateModifier: number;
  avgWinMultiplier: number;
  avgLossMultiplier: number;
  volatilityMultiplier: number;
  color: string;
  icon: string;
}

export interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  allocation: number;
  correlation: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}

export interface AdvancedSimConfig {
  // Basic (existing)
  startingCapital: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  riskPerTrade: number;
  numTrades: number;
  numSimulations: number;
  positionSizing: 'fixedPercent' | 'fixedDollar' | 'kelly' | 'halfKelly' | 'quarterKelly' | 'antiMartingale';
  includeSlippage: boolean;
  slippagePercent: number;
  includeCommission: boolean;
  commissionPerTrade: number;
  enableCompounding: boolean;
  maxDrawdownStop: number | null;
  
  // NEW: Market Regimes
  enableRegimes: boolean;
  regimes: MarketRegime[];
  regimeSwitchFrequency: number;
  
  // NEW: Sequence Risk
  sequenceRiskMode: 'normal' | 'badStart' | 'retirement';
  badStartLosses: number;
  retirementWithdrawal: number;
  
  // NEW: Correlation/Portfolio
  enablePortfolio: boolean;
  portfolioAssets: PortfolioAsset[];
  
  // NEW: Time Projection
  tradingDaysPerYear: number;
  avgTradesPerDay: number;
}

// ============ RESULTS ============
export interface AdvancedSimResult {
  finalCapital: number;
  totalReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  equityCurve: number[];
  drawdownCurve: number[];
  numWins: number;
  numLosses: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  profitFactor: number;
  totalWinAmount: number;
  totalLossAmount: number;
  
  // NEW
  regimeHistory?: string[];
  timeInEachRegime?: Record<string, number>;
  drawdownDurations: number[];
  recoveryTimes: number[];
  monthlyReturns: number[];
}

export interface PercentileData {
  return: number;
  returnPercent: number;
  maxDrawdown: number;
  finalCapital: number;
}

export interface RegimePerformance {
  regimeId: string;
  regimeName: string;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface AdvancedSimStats {
  // Existing
  medianReturn: number;
  meanReturn: number;
  stdDevReturn: number;
  bestCase: number;
  worstCase: number;
  medianReturnPct: number;
  winProbability: number;
  lossProbability: number;
  breakevenProbability: number;
  probabilityOfRuin: number;
  medianMaxDD: number;
  worstMaxDD: number;
  avgDDDuration: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  avgWinRate: number;
  expectedValuePerTrade: number;
  
  // NEW: Risk Metrics
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  
  // NEW: Performance Ratios
  ulcerIndex: number;
  painIndex: number;
  calmarRatio: number;
  marRatio: number;
  omegaRatio: number;
  tailRatio: number;
  gainToPainRatio: number;
  
  // NEW: Optimal Sizing
  optimalF: number;
  kellyFraction: number;
  halfKelly: number;
  quarterKelly: number;
  
  // NEW: Time Analysis
  maxDrawdownDuration: number;
  avgRecoveryTime: number;
  timeInDrawdownPercent: number;
  
  // NEW: Projections
  projectedDailyReturn: number;
  projectedWeeklyReturn: number;
  projectedMonthlyReturn: number;
  projectedYearlyReturn: number;
  
  // NEW: Percentiles (expanded)
  percentiles: {
    p1: PercentileData;
    p5: PercentileData;
    p10: PercentileData;
    p25: PercentileData;
    p50: PercentileData;
    p75: PercentileData;
    p90: PercentileData;
    p95: PercentileData;
    p99: PercentileData;
  };
  
  // NEW: Regime Performance
  regimePerformance?: RegimePerformance[];
  
  // Distribution data
  returnDistribution: { range: string; frequency: number; count: number; midpoint: number }[];
  ddDistribution: { range: string; frequency: number; count: number }[];
}

// ============ SCENARIOS ============
export interface SimScenario {
  id: string;
  name: string;
  description: string;
  config: AdvancedSimConfig;
  results: AdvancedSimResult[] | null;
  stats: AdvancedSimStats | null;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  createdAt: Date;
  color: string;
}

// Default regime presets
export const DEFAULT_REGIMES: MarketRegime[] = [
  {
    id: 'trending',
    name: 'Trending',
    probability: 30,
    winRateModifier: 10,
    avgWinMultiplier: 1.3,
    avgLossMultiplier: 0.8,
    volatilityMultiplier: 0.8,
    color: '#22c55e',
    icon: '📈'
  },
  {
    id: 'ranging',
    name: 'Ranging',
    probability: 40,
    winRateModifier: 0,
    avgWinMultiplier: 0.9,
    avgLossMultiplier: 1.0,
    volatilityMultiplier: 1.0,
    color: '#eab308',
    icon: '📊'
  },
  {
    id: 'volatile',
    name: 'Volatile',
    probability: 20,
    winRateModifier: -5,
    avgWinMultiplier: 1.5,
    avgLossMultiplier: 1.3,
    volatilityMultiplier: 1.5,
    color: '#f97316',
    icon: '🌪️'
  },
  {
    id: 'quiet',
    name: 'Quiet',
    probability: 10,
    winRateModifier: 5,
    avgWinMultiplier: 0.7,
    avgLossMultiplier: 0.7,
    volatilityMultiplier: 0.5,
    color: '#3b82f6',
    icon: '😴'
  }
];

// Default config
export const DEFAULT_ADVANCED_CONFIG: AdvancedSimConfig = {
  startingCapital: 10000,
  winRate: 60,
  avgWin: 150,
  avgLoss: 100,
  riskPerTrade: 2,
  numTrades: 100,
  numSimulations: 10000,
  positionSizing: 'fixedPercent',
  includeSlippage: false,
  slippagePercent: 0.5,
  includeCommission: false,
  commissionPerTrade: 7,
  enableCompounding: true,
  maxDrawdownStop: null,
  enableRegimes: false,
  regimes: DEFAULT_REGIMES,
  regimeSwitchFrequency: 25,
  sequenceRiskMode: 'normal',
  badStartLosses: 5,
  retirementWithdrawal: 500,
  enablePortfolio: false,
  portfolioAssets: [],
  tradingDaysPerYear: 252,
  avgTradesPerDay: 2
};
