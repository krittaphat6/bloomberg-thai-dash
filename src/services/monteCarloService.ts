import { 
  AdvancedSimConfig, 
  AdvancedSimResult, 
  AdvancedSimStats, 
  MarketRegime,
  RegimePerformance,
  PercentileData,
  DEFAULT_REGIMES 
} from '@/types/monteCarlo';

// ============ RISK METRICS ============

// Value at Risk (VaR) - returns the loss at given confidence level
export function calculateVaR(results: AdvancedSimResult[], confidence: number): number {
  const returns = results.map(r => r.totalReturn).sort((a, b) => a - b);
  const index = Math.floor(returns.length * (1 - confidence));
  return Math.abs(returns[Math.max(0, index)]);
}

// Conditional VaR (Expected Shortfall) - average of losses beyond VaR
export function calculateCVaR(results: AdvancedSimResult[], confidence: number): number {
  const returns = results.map(r => r.totalReturn).sort((a, b) => a - b);
  const varIndex = Math.floor(returns.length * (1 - confidence));
  const tailReturns = returns.slice(0, Math.max(1, varIndex));
  return Math.abs(tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length);
}

// Ulcer Index - measures downside volatility
export function calculateUlcerIndex(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;
  let peak = equityCurve[0];
  let sumSquaredDD = 0;
  
  equityCurve.forEach(value => {
    if (value > peak) peak = value;
    const dd = ((peak - value) / peak) * 100;
    sumSquaredDD += dd * dd;
  });
  
  return Math.sqrt(sumSquaredDD / equityCurve.length);
}

// Pain Index - average drawdown
export function calculatePainIndex(drawdownCurve: number[]): number {
  if (drawdownCurve.length === 0) return 0;
  return drawdownCurve.reduce((a, b) => a + b, 0) / drawdownCurve.length;
}

// Calmar Ratio - CAGR / Max Drawdown
export function calculateCalmarRatio(
  returns: number[], 
  maxDD: number, 
  years: number
): number {
  if (maxDD === 0 || years === 0) return 0;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const cagr = Math.pow(1 + avgReturn / 100, 1 / years) - 1;
  return (cagr * 100) / maxDD;
}

// MAR Ratio - similar to Calmar but uses different time periods
export function calculateMARRatio(cagr: number, maxDD: number): number {
  return maxDD > 0 ? cagr / maxDD : 0;
}

// Omega Ratio - probability weighted ratio of gains vs losses
export function calculateOmegaRatio(returns: number[], threshold: number = 0): number {
  const gains = returns.filter(r => r > threshold)
    .reduce((a, b) => a + (b - threshold), 0);
  const losses = returns.filter(r => r <= threshold)
    .reduce((a, b) => a + Math.abs(b - threshold), 0);
  return losses > 0 ? gains / losses : (gains > 0 ? 999 : 0);
}

// Tail Ratio - ratio of right tail to left tail
export function calculateTailRatio(returns: number[]): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p5 = sorted[Math.floor(sorted.length * 0.05)];
  return p5 !== 0 ? Math.abs(p95 / p5) : 0;
}

// Gain to Pain Ratio
export function calculateGainToPainRatio(returns: number[]): number {
  const totalGain = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
  const totalPain = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
  return totalPain > 0 ? totalGain / totalPain : totalGain > 0 ? 999 : 0;
}

// Optimal f - Kelly criterion
export function calculateOptimalF(winRate: number, avgWin: number, avgLoss: number): number {
  const p = winRate / 100;
  const q = 1 - p;
  const b = avgWin / avgLoss;
  const f = (p * b - q) / b;
  return Math.max(0, Math.min(f, 1));
}

// Drawdown Duration Analysis
export function analyzeDrawdownDurations(drawdownCurve: number[]): {
  durations: number[];
  avgDuration: number;
  maxDuration: number;
  recoveryTimes: number[];
  avgRecoveryTime: number;
  timeInDrawdownPercent: number;
} {
  const durations: number[] = [];
  const recoveryTimes: number[] = [];
  let currentDuration = 0;
  let inDrawdown = false;
  let totalTimeInDD = 0;
  
  drawdownCurve.forEach((dd) => {
    if (dd > 0) {
      currentDuration++;
      inDrawdown = true;
      totalTimeInDD++;
    } else if (inDrawdown) {
      durations.push(currentDuration);
      recoveryTimes.push(currentDuration);
      currentDuration = 0;
      inDrawdown = false;
    }
  });
  
  if (currentDuration > 0) durations.push(currentDuration);
  
  return {
    durations,
    avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    recoveryTimes,
    avgRecoveryTime: recoveryTimes.length > 0 ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length : 0,
    timeInDrawdownPercent: drawdownCurve.length > 0 ? (totalTimeInDD / drawdownCurve.length) * 100 : 0
  };
}

// ============ REGIME SIMULATION ============

// Regime selection based on probability
function selectRegime(regimes: MarketRegime[]): MarketRegime {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const regime of regimes) {
    cumulative += regime.probability;
    if (rand <= cumulative) return regime;
  }
  return regimes[0];
}

// Enhanced simulation with regimes
export function runRegimeSimulation(config: AdvancedSimConfig): AdvancedSimResult {
  let capital = config.startingCapital;
  let peak = capital;
  let maxDD = 0;
  
  const equity: number[] = [capital];
  const drawdown: number[] = [0];
  const regimeHistory: string[] = [];
  const timeInEachRegime: Record<string, number> = {};
  
  const regimes = config.enableRegimes ? config.regimes : DEFAULT_REGIMES;
  let currentRegime = selectRegime(regimes);
  let regimeTradesRemaining = config.regimeSwitchFrequency + 
    Math.floor((Math.random() - 0.5) * config.regimeSwitchFrequency * 0.5);
  
  let wins = 0, losses = 0;
  let consecutiveWins = 0, consecutiveLosses = 0;
  let maxConsecutiveWins = 0, maxConsecutiveLosses = 0;
  let largestWin = 0, largestLoss = 0;
  let totalWinAmount = 0, totalLossAmount = 0;
  
  // Handle bad start mode
  let forcedLossesRemaining = config.sequenceRiskMode === 'badStart' ? config.badStartLosses : 0;
  
  for (let i = 0; i < config.numTrades; i++) {
    // Check max drawdown stop
    const currentDD = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    if (config.maxDrawdownStop && currentDD >= config.maxDrawdownStop) break;
    
    // Switch regime if needed
    if (regimeTradesRemaining <= 0 && config.enableRegimes) {
      currentRegime = selectRegime(regimes);
      regimeTradesRemaining = config.regimeSwitchFrequency + 
        Math.floor((Math.random() - 0.5) * config.regimeSwitchFrequency * 0.5);
    }
    regimeTradesRemaining--;
    regimeHistory.push(currentRegime.id);
    timeInEachRegime[currentRegime.id] = (timeInEachRegime[currentRegime.id] || 0) + 1;
    
    // Calculate effective parameters based on regime
    const effectiveWinRate = config.enableRegimes 
      ? Math.max(0, Math.min(100, config.winRate + currentRegime.winRateModifier))
      : config.winRate;
    const effectiveAvgWin = config.enableRegimes 
      ? config.avgWin * currentRegime.avgWinMultiplier 
      : config.avgWin;
    const effectiveAvgLoss = config.enableRegimes 
      ? config.avgLoss * currentRegime.avgLossMultiplier 
      : config.avgLoss;
    const volatility = config.enableRegimes 
      ? currentRegime.volatilityMultiplier 
      : 1;
    
    // Determine win/loss (forced loss if in bad start mode)
    const isWin = forcedLossesRemaining > 0 
      ? false 
      : Math.random() < (effectiveWinRate / 100);
    
    if (forcedLossesRemaining > 0) forcedLossesRemaining--;
    
    // Calculate position size
    let positionSize: number;
    const baseCapital = config.enableCompounding ? capital : config.startingCapital;
    const optimalF = calculateOptimalF(effectiveWinRate, effectiveAvgWin, effectiveAvgLoss);
    
    switch (config.positionSizing) {
      case 'kelly':
        positionSize = baseCapital * Math.min(optimalF, 0.25);
        break;
      case 'halfKelly':
        positionSize = baseCapital * Math.min(optimalF / 2, 0.15);
        break;
      case 'quarterKelly':
        positionSize = baseCapital * Math.min(optimalF / 4, 0.10);
        break;
      case 'antiMartingale':
        const multiplier = Math.min(1 + (consecutiveWins * 0.2), 2);
        positionSize = baseCapital * (config.riskPerTrade / 100) * multiplier;
        break;
      case 'fixedDollar':
        positionSize = config.startingCapital * (config.riskPerTrade / 100);
        break;
      default: // fixedPercent
        positionSize = baseCapital * (config.riskPerTrade / 100);
    }
    
    // Calculate P&L with variance
    const variance = 0.3 * volatility;
    const randomMultiplier = 1 + (Math.random() - 0.5) * 2 * variance;
    
    let pnl: number;
    if (isWin) {
      pnl = positionSize * (effectiveAvgWin / effectiveAvgLoss) * randomMultiplier;
      wins++;
      consecutiveWins++;
      consecutiveLosses = 0;
      largestWin = Math.max(largestWin, pnl);
      totalWinAmount += pnl;
    } else {
      pnl = -positionSize * randomMultiplier;
      losses++;
      consecutiveLosses++;
      consecutiveWins = 0;
      largestLoss = Math.min(largestLoss, pnl);
      totalLossAmount += Math.abs(pnl);
    }
    
    // Apply slippage and commission
    if (config.includeSlippage) pnl *= (1 - config.slippagePercent / 100);
    if (config.includeCommission) pnl -= config.commissionPerTrade;
    
    // Handle retirement withdrawal
    if (config.sequenceRiskMode === 'retirement' && i > 0 && i % 20 === 0) {
      capital -= config.retirementWithdrawal;
    }
    
    capital += pnl;
    maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
    maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    
    if (capital > peak) peak = capital;
    const dd = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    maxDD = Math.max(maxDD, dd);
    
    equity.push(capital);
    drawdown.push(dd);
    
    // Ruin check
    if (capital < config.startingCapital * 0.1) break;
  }
  
  const ddAnalysis = analyzeDrawdownDurations(drawdown);
  
  return {
    finalCapital: capital,
    totalReturn: capital - config.startingCapital,
    returnPercent: ((capital - config.startingCapital) / config.startingCapital) * 100,
    maxDrawdown: maxDD,
    equityCurve: equity,
    drawdownCurve: drawdown,
    numWins: wins,
    numLosses: losses,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    profitFactor: totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0,
    totalWinAmount,
    totalLossAmount,
    regimeHistory,
    timeInEachRegime,
    drawdownDurations: ddAnalysis.durations,
    recoveryTimes: ddAnalysis.recoveryTimes,
    monthlyReturns: []
  };
}

// ============ STATISTICS CALCULATION ============

export function calculateAdvancedStatistics(
  results: AdvancedSimResult[], 
  config: AdvancedSimConfig
): AdvancedSimStats {
  const returns = results.map(r => r.totalReturn).sort((a, b) => a - b);
  const returnPcts = results.map(r => r.returnPercent).sort((a, b) => a - b);
  const maxDDs = results.map(r => r.maxDrawdown).sort((a, b) => a - b);
  const finalCapitals = results.map(r => r.finalCapital).sort((a, b) => a - b);

  const getPercentile = (arr: number[], p: number) => {
    const idx = Math.floor(arr.length * p);
    return arr[Math.min(idx, arr.length - 1)];
  };

  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const stdDev = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const avg = mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(mean(squareDiffs));
  };

  const avgReturn = mean(returns);
  const stdReturn = stdDev(returns);
  const avgWins = results.map(r => r.numWins);
  const avgPF = mean(results.map(r => r.profitFactor));

  const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn : 0;
  const downsideReturns = returns.filter(r => r < 0);
  const downsideStd = downsideReturns.length > 0 ? stdDev(downsideReturns) : stdReturn;
  const sortinoRatio = downsideStd > 0 ? avgReturn / downsideStd : 0;

  // VaR & CVaR
  const var95 = calculateVaR(results, 0.95);
  const var99 = calculateVaR(results, 0.99);
  const cvar95 = calculateCVaR(results, 0.95);
  const cvar99 = calculateCVaR(results, 0.99);

  // Performance ratios
  const avgEquityCurve = results[0]?.equityCurve || [];
  const ulcerIndex = calculateUlcerIndex(avgEquityCurve);
  const avgDrawdownCurve = results[0]?.drawdownCurve || [];
  const painIndex = calculatePainIndex(avgDrawdownCurve);
  
  const medianMaxDD = getPercentile(maxDDs, 0.5);
  const years = config.numTrades / (config.tradingDaysPerYear * config.avgTradesPerDay);
  const calmarRatio = calculateCalmarRatio(returnPcts, medianMaxDD, years);
  const marRatio = calculateMARRatio(mean(returnPcts), medianMaxDD);
  const omegaRatio = calculateOmegaRatio(returnPcts);
  const tailRatio = calculateTailRatio(returns);
  const gainToPainRatio = calculateGainToPainRatio(returns);

  // Optimal sizing
  const optimalF = calculateOptimalF(config.winRate, config.avgWin, config.avgLoss);
  const kellyFraction = optimalF * 100;
  const halfKelly = kellyFraction / 2;
  const quarterKelly = kellyFraction / 4;

  // Time analysis
  const allDDAnalysis = results.map(r => analyzeDrawdownDurations(r.drawdownCurve));
  const avgDDDuration = mean(allDDAnalysis.map(a => a.avgDuration));
  const maxDrawdownDuration = Math.max(...allDDAnalysis.map(a => a.maxDuration));
  const avgRecoveryTime = mean(allDDAnalysis.map(a => a.avgRecoveryTime));
  const timeInDrawdownPercent = mean(allDDAnalysis.map(a => a.timeInDrawdownPercent));

  // Projections
  const avgDailyReturn = avgReturn / config.numTrades;
  const projectedDailyReturn = avgDailyReturn * config.avgTradesPerDay;
  const projectedWeeklyReturn = projectedDailyReturn * 5;
  const projectedMonthlyReturn = projectedDailyReturn * 21;
  const projectedYearlyReturn = projectedDailyReturn * config.tradingDaysPerYear;

  // Percentiles
  const createPercentileData = (p: number): PercentileData => ({
    return: getPercentile(returns, p),
    returnPercent: getPercentile(returnPcts, p),
    maxDrawdown: getPercentile(maxDDs, p),
    finalCapital: getPercentile(finalCapitals, p)
  });

  // Regime performance
  let regimePerformance: RegimePerformance[] | undefined;
  if (config.enableRegimes && results[0]?.regimeHistory) {
    const regimeStats: Record<string, { wins: number; losses: number; returns: number[]; dds: number[] }> = {};
    
    results.forEach(result => {
      if (result.regimeHistory) {
        result.regimeHistory.forEach((regimeId, i) => {
          if (!regimeStats[regimeId]) {
            regimeStats[regimeId] = { wins: 0, losses: 0, returns: [], dds: [] };
          }
          // Simplified tracking
          const regime = config.regimes.find(r => r.id === regimeId);
          if (regime) {
            regimeStats[regimeId].returns.push(result.returnPercent / result.regimeHistory!.length);
            regimeStats[regimeId].dds.push(result.maxDrawdown);
          }
        });
      }
    });

    regimePerformance = config.regimes.map(regime => ({
      regimeId: regime.id,
      regimeName: regime.name,
      totalTrades: regimeStats[regime.id]?.returns.length || 0,
      winRate: config.winRate + regime.winRateModifier,
      avgReturn: mean(regimeStats[regime.id]?.returns || []),
      maxDrawdown: Math.max(...(regimeStats[regime.id]?.dds || [0])),
      profitFactor: avgPF * regime.avgWinMultiplier / regime.avgLossMultiplier
    }));
  }

  // Distribution data
  const createHistogramData = (data: number[], bins: number) => {
    if (data.length === 0) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins || 1;

    const histogram = Array(bins).fill(0);
    data.forEach(val => {
      const binIdx = Math.min(Math.floor((val - min) / binWidth), bins - 1);
      histogram[binIdx]++;
    });

    return histogram.map((count, i) => ({
      range: `${(min + i * binWidth).toFixed(0)}`,
      frequency: (count / data.length) * 100,
      count,
      midpoint: min + (i + 0.5) * binWidth
    }));
  };

  return {
    medianReturn: getPercentile(returns, 0.5),
    meanReturn: avgReturn,
    stdDevReturn: stdReturn,
    bestCase: getPercentile(returns, 0.95),
    worstCase: getPercentile(returns, 0.05),
    medianReturnPct: getPercentile(returnPcts, 0.5),
    winProbability: (results.filter(r => r.totalReturn > 0).length / results.length) * 100,
    lossProbability: (results.filter(r => r.totalReturn < 0).length / results.length) * 100,
    breakevenProbability: (results.filter(r => Math.abs(r.totalReturn) < config.startingCapital * 0.05).length / results.length) * 100,
    probabilityOfRuin: (results.filter(r => r.finalCapital < config.startingCapital * 0.5).length / results.length) * 100,
    medianMaxDD: getPercentile(maxDDs, 0.5),
    worstMaxDD: getPercentile(maxDDs, 0.95),
    avgDDDuration,
    sharpeRatio,
    sortinoRatio,
    profitFactor: avgPF,
    avgWinRate: (mean(avgWins) / config.numTrades) * 100,
    expectedValuePerTrade: avgReturn / config.numTrades,
    var95,
    var99,
    cvar95,
    cvar99,
    ulcerIndex,
    painIndex,
    calmarRatio,
    marRatio,
    omegaRatio,
    tailRatio,
    gainToPainRatio,
    optimalF: optimalF * 100,
    kellyFraction,
    halfKelly,
    quarterKelly,
    maxDrawdownDuration,
    avgRecoveryTime,
    timeInDrawdownPercent,
    projectedDailyReturn,
    projectedWeeklyReturn,
    projectedMonthlyReturn,
    projectedYearlyReturn,
    percentiles: {
      p1: createPercentileData(0.01),
      p5: createPercentileData(0.05),
      p10: createPercentileData(0.10),
      p25: createPercentileData(0.25),
      p50: createPercentileData(0.50),
      p75: createPercentileData(0.75),
      p90: createPercentileData(0.90),
      p95: createPercentileData(0.95),
      p99: createPercentileData(0.99)
    },
    regimePerformance,
    returnDistribution: createHistogramData(returns, 30),
    ddDistribution: createHistogramData(maxDDs, 6)
  };
}

// Run multiple simulations
export async function runMonteCarloSimulations(
  config: AdvancedSimConfig,
  onProgress?: (progress: number) => void
): Promise<AdvancedSimResult[]> {
  const results: AdvancedSimResult[] = [];
  const batchSize = 500;
  const totalSims = config.numSimulations;

  for (let i = 0; i < totalSims; i += batchSize) {
    const batch = Math.min(batchSize, totalSims - i);
    for (let j = 0; j < batch; j++) {
      results.push(runRegimeSimulation(config));
    }
    const progress = ((i + batch) / totalSims) * 100;
    onProgress?.(progress);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}
