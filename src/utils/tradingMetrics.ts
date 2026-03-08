// Trading Metrics Calculation Utility
// Comprehensive analytics for Trading Journal — World-Class Edition

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  lotSize?: number;
  contractSize?: number;
  leverage?: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  notes?: string;
  tags?: string[];
  commission?: number;
  swap?: number;
  dividends?: number;
  folderId?: string;
  entryTime?: string;
  exitTime?: string;

  // Psychology & Emotion
  emotion?: 'confident' | 'fearful' | 'greedy' | 'revenge' | 'fomo' | 'calm' | 'anxious' | 'euphoric' | 'bored' | 'frustrated';
  emotionScore?: number;
  disciplineRating?: 'A' | 'B' | 'C' | 'D' | 'F';
  followedPlan?: boolean;
  mistakes?: string[];
  entryQuality?: number;
  exitQuality?: number;
  managementQuality?: number;

  // Advanced trade data
  rMultiple?: number;
  initialRisk?: number;
  stopLoss?: number;
  takeProfit?: number;
  mae?: number;
  mfe?: number;
  maePercent?: number;
  mfePercent?: number;
  efficiency?: number;
  runningPnL?: number[];

  // Setup & context
  setup?: string;
  timeframe?: string;
  session?: 'asian' | 'london' | 'new_york' | 'pre_market' | 'after_hours' | 'regular';
  marketCondition?: 'trending' | 'ranging' | 'volatile' | 'news';
  confidence?: number;
  plannedTrade?: boolean;
  missedTrade?: boolean;
  screenshots?: string[];

  // Time
  holdingMinutes?: number;
}

export interface TradingMetrics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  
  winRate: number;
  longWinRate: number;
  shortWinRate: number;
  
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  netProfitPercent: number;
  openPnL: number;
  openPnLPercent: number;
  
  avgTrade: number;
  avgTradePercent: number;
  avgWinningTrade: number;
  avgWinningTradePercent: number;
  avgLosingTrade: number;
  avgLosingTradePercent: number;
  avgWinLossRatio: number;
  
  largestWin: number;
  largestWinPercent: number;
  largestLoss: number;
  largestLossPercent: number;
  
  sharpeRatio: number;
  sortinoRatio: number | null;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxRunUp: number;
  maxRunUpPercent: number;
  
  avgBarsInTrade: number;
  avgBarsInWinningTrade: number;
  avgBarsInLosingTrade: number;
  avgTimeInProfit: string;
  avgTimeInDrawdown: string;
  
  longTrades: number;
  shortTrades: number;
  longPnL: number;
  shortPnL: number;
  longNetProfit: number;
  shortNetProfit: number;
  
  equityCurve: EquityPoint[];

  // Advanced Risk-Adjusted Metrics
  calmarRatio: number;
  omegaRatio: number;
  sqn: number;
  ulcerIndex: number;
  gainToPainRatio: number;
  kellyCriterion: number;
  halfKelly: number;

  // R-Multiple Metrics
  avgRMultiple: number;
  totalRMultiple: number;
  rMultipleStdDev: number;
  expectancyR: number;

  // Drawdown Advanced
  avgDrawdown: number;
  avgDrawdownDuration: number;
  longestDrawdownDuration: number;
  currentDrawdownFromPeak: number;
  recoveryFactor: number;
  drawdownCount: number;

  // Psychology Metrics
  avgEmotionScore: number;
  avgEntryQuality: number;
  avgExitQuality: number;
  avgManagementQuality: number;
  disciplineScore: number;
  revengeTradeCount: number;
  fomoTradeCount: number;
  followedPlanRate: number;
  avgRMultipleWhenCalm: number;
  avgRMultipleWhenRevenge: number;
  costOfEmotions: Record<string, number>;

  // Time Analytics
  bestHour: number;
  worstHour: number;
  bestDayOfWeek: string;
  worstDayOfWeek: string;
  avgHoldingMinutes: number;
  pnlByHour: Record<number, number>;
  pnlByDayOfWeek: Record<string, number>;
  pnlBySession: Record<string, number>;

  // Setup Analytics
  pnlBySetup: Record<string, { pnl: number; count: number; winRate: number }>;
  pnlByTimeframe: Record<string, number>;

  // Streaks
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  avgWinStreakLength: number;
  avgLossStreakLength: number;

  // Monte Carlo ready
  rMultiples: number[];
  dailyReturns: number[];

  // VAMI
  vami: number;
}

export interface EquityPoint {
  date: string;
  cumulativePnL: number;
  dailyPnL: number;
  drawdown: number;
  runUp: number;
  tradeCount: number;
}

export interface PnLDistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  type: 'loss' | 'neutral' | 'profit';
}

export interface SymbolPerformance {
  symbol: string;
  type: 'CFD' | 'STOCK';
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netPnL: number;
  profitFactor: number;
  avgTrade: number;
}

export interface MonteCarloResult {
  percentile5: number[];
  percentile25: number[];
  percentile50: number[];
  percentile75: number[];
  percentile95: number[];
  probOfRuin: number;
  expectedMaxDrawdown: number;
  expectedReturn: number;
}

export interface PsychologyAlert {
  type: 'revenge_trading' | 'fomo' | 'overconfidence' | 'tilt' | 'overtrading';
  severity: 'low' | 'medium' | 'high';
  message: string;
  dollarImpact: number;
  tradeIds: string[];
}

export interface DimensionStats {
  pnl: number;
  count: number;
  winRate: number;
  avgR: number;
  profitFactor: number;
}

// ======= CORE CALCULATION =======

export function calculateMetrics(trades: Trade[], initialCapital: number = 100): TradingMetrics {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
  const openTradesArr = trades.filter(t => t.status === 'OPEN');
  const winners = closedTrades.filter(t => t.pnl! > 0);
  const losers = closedTrades.filter(t => t.pnl! < 0);
  const breakEven = closedTrades.filter(t => t.pnl === 0);
  
  const longTrades = closedTrades.filter(t => t.side === 'LONG');
  const shortTrades = closedTrades.filter(t => t.side === 'SHORT');
  const longWinners = longTrades.filter(t => t.pnl! > 0);
  const shortWinners = shortTrades.filter(t => t.pnl! > 0);
  
  const grossProfit = winners.reduce((sum, t) => sum + t.pnl!, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl!, 0));
  const netProfit = grossProfit - grossLoss;
  const openPnL = openTradesArr.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  const returns = closedTrades.map(t => t.pnlPercentage || 0);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVariance = negativeReturns.length > 0 
    ? negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDev > 0 ? avgReturn / downsideDev : null;
  
  const equityCurve = calculateEquityCurve(closedTrades, initialCapital);
  const maxDrawdown = equityCurve.reduce((max, p) => Math.max(max, p.drawdown), 0);
  const maxRunUp = equityCurve.reduce((max, p) => Math.max(max, p.runUp), 0);
  
  const longPnL = longTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const shortPnL = shortTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // R-Multiples
  const rMultiples = calculateRMultiples(closedTrades);
  const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;
  const totalRMultiple = rMultiples.reduce((a, b) => a + b, 0);
  const rVariance = rMultiples.length > 1 
    ? rMultiples.reduce((sum, r) => sum + Math.pow(r - avgRMultiple, 2), 0) / (rMultiples.length - 1) : 0;
  const rMultipleStdDev = Math.sqrt(rVariance);

  // SQN
  const sqn = calculateSQN(rMultiples);

  // Kelly
  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 1;
  const kellyCriterion = calculateKellyCriterion(winRate / 100, avgWin, avgLoss);
  
  // Advanced ratios
  const dailyReturns = equityCurve.map(e => e.dailyPnL / Math.max(initialCapital, 1));
  const cagr = closedTrades.length > 0 ? (netProfit / initialCapital) : 0;
  const calmarRatio = calculateCalmarRatio(cagr, maxDrawdown > 0 ? maxDrawdown / initialCapital : 0);
  const omegaRatio = calculateOmegaRatio(dailyReturns);
  const ulcerIndex = calculateUlcerIndex(equityCurve);
  const negReturnSum = dailyReturns.filter(r => r < 0).reduce((s, r) => s + Math.abs(r), 0);
  const gainToPainRatio = negReturnSum > 0 ? dailyReturns.reduce((s, r) => s + r, 0) / negReturnSum : 0;
  const vami = calculateVAMI(closedTrades);

  // Drawdown advanced
  let drawdownCount = 0;
  let inDrawdown = false;
  let drawdownDurations: number[] = [];
  let currentDDLength = 0;
  let totalDrawdown = 0;
  equityCurve.forEach(p => {
    if (p.drawdown > 0) {
      if (!inDrawdown) { drawdownCount++; inDrawdown = true; currentDDLength = 0; }
      currentDDLength++;
      totalDrawdown += p.drawdown;
    } else {
      if (inDrawdown) { drawdownDurations.push(currentDDLength); inDrawdown = false; }
    }
  });
  if (inDrawdown) drawdownDurations.push(currentDDLength);
  const currentDrawdownFromPeak = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].drawdown : 0;

  // Streaks
  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWin = 0, tempLoss = 0;
  const winStreaks: number[] = [];
  const lossStreaks: number[] = [];
  closedTrades.forEach(t => {
    if (t.pnl! > 0) {
      tempWin++; if (tempLoss > 0) { lossStreaks.push(tempLoss); tempLoss = 0; }
      longestWinStreak = Math.max(longestWinStreak, tempWin);
    } else if (t.pnl! < 0) {
      tempLoss++; if (tempWin > 0) { winStreaks.push(tempWin); tempWin = 0; }
      longestLossStreak = Math.max(longestLossStreak, tempLoss);
    }
  });
  if (tempWin > 0) { winStreaks.push(tempWin); currentStreak = tempWin; }
  if (tempLoss > 0) { lossStreaks.push(tempLoss); currentStreak = -tempLoss; }

  // Psychology
  const emotionTrades = closedTrades.filter(t => t.emotionScore !== undefined);
  const entryQTrades = closedTrades.filter(t => t.entryQuality !== undefined);
  const exitQTrades = closedTrades.filter(t => t.exitQuality !== undefined);
  const mgmtQTrades = closedTrades.filter(t => t.managementQuality !== undefined);
  const planTrades = closedTrades.filter(t => t.followedPlan !== undefined);
  const revengeTrades = closedTrades.filter(t => t.emotion === 'revenge');
  const fomoTrades = closedTrades.filter(t => t.emotion === 'fomo');
  const calmTrades = closedTrades.filter(t => t.emotion === 'calm');
  
  const disciplineMap: Record<string, number> = { 'A': 100, 'B': 80, 'C': 60, 'D': 40, 'F': 20 };
  const disciplineTrades = closedTrades.filter(t => t.disciplineRating);
  const disciplineScore = disciplineTrades.length > 0
    ? disciplineTrades.reduce((s, t) => s + (disciplineMap[t.disciplineRating!] || 0), 0) / disciplineTrades.length
    : 0;

  const costOfEmotions: Record<string, number> = {};
  closedTrades.forEach(t => {
    if (t.emotion) {
      costOfEmotions[t.emotion] = (costOfEmotions[t.emotion] || 0) + (t.pnl || 0);
    }
  });

  // Time Analytics
  const pnlByHour: Record<number, number> = {};
  const pnlByDayOfWeek: Record<string, number> = {};
  const pnlBySession: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  closedTrades.forEach(t => {
    const d = new Date(t.entryTime || t.date);
    const hour = d.getHours();
    const day = dayNames[d.getDay()];
    pnlByHour[hour] = (pnlByHour[hour] || 0) + (t.pnl || 0);
    pnlByDayOfWeek[day] = (pnlByDayOfWeek[day] || 0) + (t.pnl || 0);
    if (t.session) {
      pnlBySession[t.session] = (pnlBySession[t.session] || 0) + (t.pnl || 0);
    }
  });

  const hourEntries = Object.entries(pnlByHour);
  const bestHour = hourEntries.length > 0 ? Number(hourEntries.sort((a, b) => b[1] - a[1])[0][0]) : 0;
  const worstHour = hourEntries.length > 0 ? Number(hourEntries.sort((a, b) => a[1] - b[1])[0][0]) : 0;
  const dayEntries = Object.entries(pnlByDayOfWeek);
  const bestDayOfWeek = dayEntries.length > 0 ? dayEntries.sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
  const worstDayOfWeek = dayEntries.length > 0 ? dayEntries.sort((a, b) => a[1] - b[1])[0][0] : 'N/A';

  // Setup analytics
  const pnlBySetup: Record<string, { pnl: number; count: number; winRate: number }> = {};
  const pnlByTimeframe: Record<string, number> = {};
  closedTrades.forEach(t => {
    if (t.setup) {
      if (!pnlBySetup[t.setup]) pnlBySetup[t.setup] = { pnl: 0, count: 0, winRate: 0 };
      pnlBySetup[t.setup].pnl += t.pnl || 0;
      pnlBySetup[t.setup].count++;
    }
    if (t.timeframe) {
      pnlByTimeframe[t.timeframe] = (pnlByTimeframe[t.timeframe] || 0) + (t.pnl || 0);
    }
  });
  Object.keys(pnlBySetup).forEach(setup => {
    const setupTrades = closedTrades.filter(t => t.setup === setup);
    const setupWins = setupTrades.filter(t => t.pnl! > 0).length;
    pnlBySetup[setup].winRate = setupTrades.length > 0 ? (setupWins / setupTrades.length) * 100 : 0;
  });

  const holdingTrades = closedTrades.filter(t => t.holdingMinutes !== undefined);
  const avgHoldingMinutes = holdingTrades.length > 0
    ? holdingTrades.reduce((s, t) => s + (t.holdingMinutes || 0), 0) / holdingTrades.length : 0;

  const calmR = calmTrades.filter(t => t.rMultiple !== undefined);
  const revengeR = revengeTrades.filter(t => t.rMultiple !== undefined);

  return {
    totalTrades: closedTrades.length,
    openTrades: openTradesArr.length,
    closedTrades: closedTrades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakEvenTrades: breakEven.length,
    
    winRate,
    longWinRate: longTrades.length > 0 ? (longWinners.length / longTrades.length) * 100 : 0,
    shortWinRate: shortTrades.length > 0 ? (shortWinners.length / shortTrades.length) * 100 : 0,
    
    grossProfit,
    grossLoss,
    netProfit,
    netProfitPercent: initialCapital > 0 ? (netProfit / initialCapital) * 100 : 0,
    openPnL,
    openPnLPercent: initialCapital > 0 ? (openPnL / initialCapital) * 100 : 0,
    
    avgTrade: closedTrades.length > 0 ? netProfit / closedTrades.length : 0,
    avgTradePercent: returns.length > 0 ? avgReturn : 0,
    avgWinningTrade: winners.length > 0 ? grossProfit / winners.length : 0,
    avgWinningTradePercent: winners.length > 0 
      ? winners.reduce((sum, t) => sum + (t.pnlPercentage || 0), 0) / winners.length : 0,
    avgLosingTrade: losers.length > 0 ? grossLoss / losers.length : 0,
    avgLosingTradePercent: losers.length > 0 
      ? Math.abs(losers.reduce((sum, t) => sum + (t.pnlPercentage || 0), 0) / losers.length) : 0,
    avgWinLossRatio: grossLoss > 0 && winners.length > 0 && losers.length > 0
      ? (grossProfit / winners.length) / (grossLoss / losers.length) : 0,
    
    largestWin: winners.length > 0 ? Math.max(...winners.map(t => t.pnl!)) : 0,
    largestWinPercent: winners.length > 0 ? Math.max(...winners.map(t => t.pnlPercentage || 0)) : 0,
    largestLoss: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnl!))) : 0,
    largestLossPercent: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnlPercentage || 0))) : 0,
    
    sharpeRatio,
    sortinoRatio,
    profitFactor,
    maxDrawdown,
    maxDrawdownPercent: initialCapital > 0 ? (maxDrawdown / initialCapital) * 100 : 0,
    maxRunUp,
    maxRunUpPercent: initialCapital > 0 ? (maxRunUp / initialCapital) * 100 : 0,
    
    avgBarsInTrade: 0,
    avgBarsInWinningTrade: 0,
    avgBarsInLosingTrade: 0,
    avgTimeInProfit: '—',
    avgTimeInDrawdown: '—',
    
    longTrades: longTrades.length,
    shortTrades: shortTrades.length,
    longPnL,
    shortPnL,
    longNetProfit: longPnL,
    shortNetProfit: shortPnL,
    
    equityCurve,

    // Advanced
    calmarRatio,
    omegaRatio,
    sqn,
    ulcerIndex,
    gainToPainRatio,
    kellyCriterion,
    halfKelly: kellyCriterion / 2,

    avgRMultiple,
    totalRMultiple,
    rMultipleStdDev,
    expectancyR: avgRMultiple,

    avgDrawdown: drawdownCount > 0 ? totalDrawdown / drawdownCount : 0,
    avgDrawdownDuration: drawdownDurations.length > 0 ? drawdownDurations.reduce((a, b) => a + b, 0) / drawdownDurations.length : 0,
    longestDrawdownDuration: drawdownDurations.length > 0 ? Math.max(...drawdownDurations) : 0,
    currentDrawdownFromPeak,
    recoveryFactor: maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? 999 : 0,
    drawdownCount,

    avgEmotionScore: emotionTrades.length > 0 ? emotionTrades.reduce((s, t) => s + (t.emotionScore || 0), 0) / emotionTrades.length : 0,
    avgEntryQuality: entryQTrades.length > 0 ? entryQTrades.reduce((s, t) => s + (t.entryQuality || 0), 0) / entryQTrades.length : 0,
    avgExitQuality: exitQTrades.length > 0 ? exitQTrades.reduce((s, t) => s + (t.exitQuality || 0), 0) / exitQTrades.length : 0,
    avgManagementQuality: mgmtQTrades.length > 0 ? mgmtQTrades.reduce((s, t) => s + (t.managementQuality || 0), 0) / mgmtQTrades.length : 0,
    disciplineScore,
    revengeTradeCount: revengeTrades.length,
    fomoTradeCount: fomoTrades.length,
    followedPlanRate: planTrades.length > 0 ? (planTrades.filter(t => t.followedPlan).length / planTrades.length) * 100 : 0,
    avgRMultipleWhenCalm: calmR.length > 0 ? calmR.reduce((s, t) => s + (t.rMultiple || 0), 0) / calmR.length : 0,
    avgRMultipleWhenRevenge: revengeR.length > 0 ? revengeR.reduce((s, t) => s + (t.rMultiple || 0), 0) / revengeR.length : 0,
    costOfEmotions,

    bestHour,
    worstHour,
    bestDayOfWeek,
    worstDayOfWeek,
    avgHoldingMinutes,
    pnlByHour,
    pnlByDayOfWeek,
    pnlBySession,

    pnlBySetup,
    pnlByTimeframe,

    currentStreak,
    longestWinStreak,
    longestLossStreak,
    avgWinStreakLength: winStreaks.length > 0 ? winStreaks.reduce((a, b) => a + b, 0) / winStreaks.length : 0,
    avgLossStreakLength: lossStreaks.length > 0 ? lossStreaks.reduce((a, b) => a + b, 0) / lossStreaks.length : 0,

    rMultiples,
    dailyReturns,
    vami,
  };
}

// ======= EQUITY CURVE =======

export function calculateEquityCurve(trades: Trade[], initialCapital: number): EquityPoint[] {
  const sortedTrades = [...trades]
    .filter(t => t.status === 'CLOSED' && t.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  if (sortedTrades.length === 0) return [];
  
  const dailyPnL = new Map<string, { pnl: number; count: number }>();
  sortedTrades.forEach(trade => {
    const date = trade.date;
    const existing = dailyPnL.get(date) || { pnl: 0, count: 0 };
    existing.pnl += trade.pnl || 0;
    existing.count += 1;
    dailyPnL.set(date, existing);
  });
  
  const equityCurve: EquityPoint[] = [];
  let cumulative = 0;
  let peak = 0;
  let trough = 0;
  
  Array.from(dailyPnL.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .forEach(([date, data]) => {
      cumulative += data.pnl;
      if (cumulative > peak) { peak = cumulative; trough = cumulative; }
      if (cumulative < trough) trough = cumulative;
      equityCurve.push({
        date,
        cumulativePnL: cumulative,
        dailyPnL: data.pnl,
        drawdown: peak - cumulative,
        runUp: cumulative - trough,
        tradeCount: data.count
      });
    });
  
  return equityCurve;
}

// ======= P&L DISTRIBUTION =======

export function calculatePnLDistribution(trades: Trade[], bucketSize: number = 0.1): PnLDistributionBucket[] {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnlPercentage !== undefined);
  if (closedTrades.length === 0) return [];
  
  const pnlPercentages = closedTrades.map(t => t.pnlPercentage!);
  const min = Math.floor(Math.min(...pnlPercentages) / bucketSize) * bucketSize;
  const max = Math.ceil(Math.max(...pnlPercentages) / bucketSize) * bucketSize;
  
  const buckets: PnLDistributionBucket[] = [];
  for (let i = min; i < max; i += bucketSize) {
    const bucketMin = i;
    const bucketMax = i + bucketSize;
    const count = closedTrades.filter(t => t.pnlPercentage! >= bucketMin && t.pnlPercentage! < bucketMax).length;
    buckets.push({
      range: `${bucketMin.toFixed(1)}%`,
      min: bucketMin, max: bucketMax, count,
      type: bucketMin < 0 ? 'loss' : bucketMin === 0 ? 'neutral' : 'profit'
    });
  }
  return buckets;
}

// ======= SYMBOL PERFORMANCE =======

export function calculateSymbolPerformance(trades: Trade[]): SymbolPerformance[] {
  const symbolStats = new Map<string, SymbolPerformance>();
  trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(trade => {
    const symbol = trade.symbol;
    if (!symbolStats.has(symbol)) {
      symbolStats.set(symbol, {
        symbol, type: trade.type, totalTrades: 0, winCount: 0, lossCount: 0,
        winRate: 0, grossProfit: 0, grossLoss: 0, netPnL: 0, profitFactor: 0, avgTrade: 0
      });
    }
    const stats = symbolStats.get(symbol)!;
    stats.totalTrades++;
    if (trade.pnl! > 0) { stats.winCount++; stats.grossProfit += trade.pnl!; }
    else if (trade.pnl! < 0) { stats.lossCount++; stats.grossLoss += Math.abs(trade.pnl!); }
    stats.netPnL += trade.pnl!;
  });
  return Array.from(symbolStats.values())
    .map(stats => ({
      ...stats,
      winRate: stats.totalTrades > 0 ? (stats.winCount / stats.totalTrades) * 100 : 0,
      profitFactor: stats.grossLoss > 0 ? stats.grossProfit / stats.grossLoss : stats.grossProfit > 0 ? 999 : 0,
      avgTrade: stats.totalTrades > 0 ? stats.netPnL / stats.totalTrades : 0
    }))
    .sort((a, b) => b.netPnL - a.netPnL);
}

// ======= R-MULTIPLES =======

export function calculateRMultiples(trades: Trade[]): number[] {
  return trades
    .filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
    .map(t => {
      if (t.rMultiple !== undefined) return t.rMultiple;
      if (t.initialRisk && t.initialRisk > 0) return (t.pnl || 0) / t.initialRisk;
      if (t.stopLoss && t.stopLoss > 0) {
        const risk = Math.abs(t.entryPrice - t.stopLoss) * t.quantity;
        return risk > 0 ? (t.pnl || 0) / risk : 0;
      }
      // Fallback: use 1% of entry as proxy risk
      const proxyRisk = t.entryPrice * t.quantity * 0.01;
      return proxyRisk > 0 ? (t.pnl || 0) / proxyRisk : 0;
    });
}

// ======= SQN =======

export function calculateSQN(rMultiples: number[]): number {
  if (rMultiples.length < 2) return 0;
  const mean = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length;
  const variance = rMultiples.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (rMultiples.length - 1);
  const stdDev = Math.sqrt(variance);
  return stdDev > 0 ? Math.sqrt(rMultiples.length) * mean / stdDev : 0;
}

// ======= KELLY =======

export function calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss <= 0) return 0;
  const b = avgWin / avgLoss;
  return Math.max(0, (winRate * b - (1 - winRate)) / b) * 100;
}

// ======= OMEGA =======

export function calculateOmegaRatio(returns: number[], threshold: number = 0): number {
  const gains = returns.filter(r => r > threshold).reduce((s, r) => s + (r - threshold), 0);
  const losses = returns.filter(r => r <= threshold).reduce((s, r) => s + (threshold - r), 0);
  return losses > 0 ? gains / losses : gains > 0 ? 999 : 0;
}

// ======= CALMAR =======

export function calculateCalmarRatio(cagr: number, maxDrawdown: number): number {
  return maxDrawdown > 0 ? cagr / maxDrawdown : 0;
}

// ======= ULCER INDEX =======

export function calculateUlcerIndex(equityCurve: EquityPoint[]): number {
  if (equityCurve.length === 0) return 0;
  let peak = 0;
  let sumSquared = 0;
  equityCurve.forEach(p => {
    const val = p.cumulativePnL;
    if (val > peak) peak = val;
    const dd = peak > 0 ? ((peak - val) / peak) * 100 : 0;
    sumSquared += dd * dd;
  });
  return Math.sqrt(sumSquared / equityCurve.length);
}

// ======= VAMI =======

export function calculateVAMI(trades: Trade[], startingValue: number = 1000): number {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnlPercentage !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let vami = startingValue;
  closed.forEach(t => { vami *= (1 + (t.pnlPercentage || 0) / 100); });
  return vami;
}

// ======= MONTE CARLO =======

export function runMonteCarloSimulation(
  rMultiples: number[],
  numSimulations: number = 1000,
  numTrades: number = 200
): MonteCarloResult {
  if (rMultiples.length === 0) {
    return {
      percentile5: [], percentile25: [], percentile50: [], percentile75: [], percentile95: [],
      probOfRuin: 0, expectedMaxDrawdown: 0, expectedReturn: 0
    };
  }

  const simulations: number[][] = [];
  const finalReturns: number[] = [];
  const maxDrawdowns: number[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    const curve: number[] = [0];
    let peak = 0;
    let maxDD = 0;
    for (let t = 0; t < numTrades; t++) {
      const randomR = rMultiples[Math.floor(Math.random() * rMultiples.length)];
      curve.push(curve[curve.length - 1] + randomR);
      if (curve[curve.length - 1] > peak) peak = curve[curve.length - 1];
      const dd = peak - curve[curve.length - 1];
      if (dd > maxDD) maxDD = dd;
    }
    simulations.push(curve);
    finalReturns.push(curve[curve.length - 1]);
    maxDrawdowns.push(maxDD);
  }

  // Calculate percentiles at each trade step
  const getPercentile = (tradeIdx: number, pct: number): number => {
    const values = simulations.map(s => s[tradeIdx]).sort((a, b) => a - b);
    const idx = Math.floor(pct / 100 * values.length);
    return values[Math.min(idx, values.length - 1)];
  };

  const steps = Math.min(numTrades + 1, 50);
  const stepSize = Math.max(1, Math.floor(numTrades / steps));
  const indices = Array.from({ length: steps }, (_, i) => Math.min(i * stepSize, numTrades));

  const ruinThreshold = -50; // -50R = ruin
  const probOfRuin = simulations.filter(s => Math.min(...s) <= ruinThreshold).length / numSimulations * 100;

  return {
    percentile5: indices.map(i => getPercentile(i, 5)),
    percentile25: indices.map(i => getPercentile(i, 25)),
    percentile50: indices.map(i => getPercentile(i, 50)),
    percentile75: indices.map(i => getPercentile(i, 75)),
    percentile95: indices.map(i => getPercentile(i, 95)),
    probOfRuin,
    expectedMaxDrawdown: maxDrawdowns.sort((a, b) => a - b)[Math.floor(maxDrawdowns.length * 0.95)] || 0,
    expectedReturn: finalReturns.reduce((a, b) => a + b, 0) / finalReturns.length,
  };
}

// ======= DIMENSION ANALYSIS =======

export function calculatePnLByDimension(trades: Trade[], dimension: keyof Trade): Record<string, DimensionStats> {
  const result: Record<string, DimensionStats> = {};
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
  
  closed.forEach(t => {
    const key = String(t[dimension] || 'Unknown');
    if (!result[key]) result[key] = { pnl: 0, count: 0, winRate: 0, avgR: 0, profitFactor: 0 };
    result[key].pnl += t.pnl || 0;
    result[key].count++;
  });

  Object.keys(result).forEach(key => {
    const keyTrades = closed.filter(t => String(t[dimension] || 'Unknown') === key);
    const wins = keyTrades.filter(t => t.pnl! > 0);
    const losses = keyTrades.filter(t => t.pnl! < 0);
    const gp = wins.reduce((s, t) => s + t.pnl!, 0);
    const gl = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0));
    result[key].winRate = keyTrades.length > 0 ? (wins.length / keyTrades.length) * 100 : 0;
    result[key].avgR = keyTrades.length > 0 
      ? keyTrades.reduce((s, t) => s + (t.rMultiple || 0), 0) / keyTrades.length : 0;
    result[key].profitFactor = gl > 0 ? gp / gl : gp > 0 ? 999 : 0;
  });

  return result;
}

// ======= PSYCHOLOGY PATTERNS =======

export function detectPsychologyPatterns(trades: Trade[]): PsychologyAlert[] {
  const alerts: PsychologyAlert[] = [];
  const closed = trades.filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (closed.length < 5) return alerts;

  // Revenge trading detection
  const revengeTrades = closed.filter(t => t.emotion === 'revenge');
  if (revengeTrades.length > 0) {
    const impact = revengeTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    alerts.push({
      type: 'revenge_trading', severity: revengeTrades.length >= 5 ? 'high' : revengeTrades.length >= 2 ? 'medium' : 'low',
      message: `${revengeTrades.length} revenge trades detected, costing ${impact.toFixed(2)} USD`,
      dollarImpact: impact, tradeIds: revengeTrades.map(t => t.id)
    });
  }

  // FOMO detection
  const fomoTrades = closed.filter(t => t.emotion === 'fomo');
  if (fomoTrades.length > 0) {
    const impact = fomoTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    alerts.push({
      type: 'fomo', severity: fomoTrades.length >= 5 ? 'high' : 'medium',
      message: `${fomoTrades.length} FOMO trades detected`,
      dollarImpact: impact, tradeIds: fomoTrades.map(t => t.id)
    });
  }

  // Overtrading: days with > 2x average trade count
  const tradesByDay = new Map<string, Trade[]>();
  closed.forEach(t => {
    const day = t.date;
    if (!tradesByDay.has(day)) tradesByDay.set(day, []);
    tradesByDay.get(day)!.push(t);
  });
  const avgDailyTrades = closed.length / Math.max(tradesByDay.size, 1);
  const overtradingDays = Array.from(tradesByDay.entries()).filter(([, ts]) => ts.length > avgDailyTrades * 2);
  if (overtradingDays.length > 0) {
    const allIds = overtradingDays.flatMap(([, ts]) => ts.map(t => t.id));
    const impact = overtradingDays.flatMap(([, ts]) => ts).reduce((s, t) => s + (t.pnl || 0), 0);
    alerts.push({
      type: 'overtrading', severity: overtradingDays.length >= 3 ? 'high' : 'medium',
      message: `Overtrading detected on ${overtradingDays.length} days (>${(avgDailyTrades * 2).toFixed(0)} trades/day)`,
      dollarImpact: impact, tradeIds: allIds
    });
  }

  // Tilt: 3+ consecutive losses with increasing size
  for (let i = 2; i < closed.length; i++) {
    if (closed[i].pnl! < 0 && closed[i - 1].pnl! < 0 && closed[i - 2].pnl! < 0) {
      if (closed[i].quantity > closed[i - 1].quantity && closed[i - 1].quantity > closed[i - 2].quantity) {
        const tiltTrades = [closed[i - 2], closed[i - 1], closed[i]];
        const impact = tiltTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        alerts.push({
          type: 'tilt', severity: 'high',
          message: `Tilt pattern detected: 3 consecutive losses with increasing position sizes`,
          dollarImpact: impact, tradeIds: tiltTrades.map(t => t.id)
        });
        break;
      }
    }
  }

  // Overconfidence after winning streak
  for (let i = 3; i < closed.length; i++) {
    const prev3 = [closed[i - 3], closed[i - 2], closed[i - 1]];
    if (prev3.every(t => t.pnl! > 0)) {
      const avgQty = prev3.reduce((s, t) => s + t.quantity, 0) / 3;
      if (closed[i].quantity > avgQty * 1.5) {
        alerts.push({
          type: 'overconfidence', severity: 'medium',
          message: `Position sized 50%+ above average after 3+ wins`,
          dollarImpact: closed[i].pnl || 0, tradeIds: [closed[i].id]
        });
        break;
      }
    }
  }

  return alerts;
}

// ======= COST OF EMOTIONS =======

export function calculateCostOfEmotions(trades: Trade[]): Record<string, number> {
  const cost: Record<string, number> = {};
  trades.filter(t => t.status === 'CLOSED' && t.emotion).forEach(t => {
    cost[t.emotion!] = (cost[t.emotion!] || 0) + (t.pnl || 0);
  });
  return cost;
}

// ======= FORMATTING =======

export function formatCurrency(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)} USD`;
}

export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
