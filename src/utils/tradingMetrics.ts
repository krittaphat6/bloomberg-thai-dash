// Trading Metrics Calculation Utility
// Comprehensive analytics for Trading Journal

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
}

export interface TradingMetrics {
  // Basic counts
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  
  // Win rates
  winRate: number;
  longWinRate: number;
  shortWinRate: number;
  
  // P&L
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  netProfitPercent: number;
  openPnL: number;
  openPnLPercent: number;
  
  // Averages
  avgTrade: number;
  avgTradePercent: number;
  avgWinningTrade: number;
  avgWinningTradePercent: number;
  avgLosingTrade: number;
  avgLosingTradePercent: number;
  avgWinLossRatio: number;
  
  // Extremes
  largestWin: number;
  largestWinPercent: number;
  largestLoss: number;
  largestLossPercent: number;
  
  // Risk Metrics
  sharpeRatio: number;
  sortinoRatio: number | null;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxRunUp: number;
  maxRunUpPercent: number;
  
  // Time-based
  avgBarsInTrade: number;
  avgBarsInWinningTrade: number;
  avgBarsInLosingTrade: number;
  avgTimeInProfit: string;
  avgTimeInDrawdown: string;
  
  // Breakdown by side
  longTrades: number;
  shortTrades: number;
  longPnL: number;
  shortPnL: number;
  longNetProfit: number;
  shortNetProfit: number;
  
  // Equity curve data
  equityCurve: EquityPoint[];
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

export function calculateMetrics(trades: Trade[], initialCapital: number = 100): TradingMetrics {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
  const openTrades = trades.filter(t => t.status === 'OPEN');
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
  const openPnL = openTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  // Sharpe Ratio: (Avg Return - Risk Free Rate) / Std Dev of Returns
  const returns = closedTrades.map(t => t.pnlPercentage || 0);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
  
  // Sortino Ratio: Only uses downside deviation
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVariance = negativeReturns.length > 0 
    ? negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
    : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDev > 0 ? avgReturn / downsideDev : null;
  
  // Equity Curve & Drawdown calculation
  const equityCurve = calculateEquityCurve(closedTrades, initialCapital);
  const maxDrawdown = equityCurve.reduce((max, p) => Math.max(max, p.drawdown), 0);
  const maxRunUp = equityCurve.reduce((max, p) => Math.max(max, p.runUp), 0);
  
  const longPnL = longTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const shortPnL = shortTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  return {
    totalTrades: closedTrades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakEvenTrades: breakEven.length,
    
    winRate: closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0,
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
      ? winners.reduce((sum, t) => sum + (t.pnlPercentage || 0), 0) / winners.length 
      : 0,
    avgLosingTrade: losers.length > 0 ? grossLoss / losers.length : 0,
    avgLosingTradePercent: losers.length > 0 
      ? Math.abs(losers.reduce((sum, t) => sum + (t.pnlPercentage || 0), 0) / losers.length)
      : 0,
    avgWinLossRatio: grossLoss > 0 && winners.length > 0 && losers.length > 0
      ? (grossProfit / winners.length) / (grossLoss / losers.length)
      : 0,
    
    largestWin: winners.length > 0 ? Math.max(...winners.map(t => t.pnl!)) : 0,
    largestWinPercent: winners.length > 0 ? Math.max(...winners.map(t => t.pnlPercentage || 0)) : 0,
    largestLoss: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnl!))) : 0,
    largestLossPercent: losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnlPercentage || 0))) : 0,
    
    sharpeRatio,
    sortinoRatio,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
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
    
    equityCurve
  };
}

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
      
      if (cumulative > peak) {
        peak = cumulative;
        trough = cumulative;
      }
      if (cumulative < trough) {
        trough = cumulative;
      }
      
      const drawdown = peak - cumulative;
      const runUp = cumulative - trough;
      
      equityCurve.push({
        date,
        cumulativePnL: cumulative,
        dailyPnL: data.pnl,
        drawdown,
        runUp,
        tradeCount: data.count
      });
    });
  
  return equityCurve;
}

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
    const count = closedTrades.filter(t => 
      t.pnlPercentage! >= bucketMin && t.pnlPercentage! < bucketMax
    ).length;
    
    buckets.push({
      range: `${bucketMin.toFixed(1)}%`,
      min: bucketMin,
      max: bucketMax,
      count,
      type: bucketMin < 0 ? 'loss' : bucketMin === 0 ? 'neutral' : 'profit'
    });
  }
  
  return buckets;
}

export function calculateSymbolPerformance(trades: Trade[]): SymbolPerformance[] {
  const symbolStats = new Map<string, SymbolPerformance>();
  
  trades
    .filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
    .forEach(trade => {
      const symbol = trade.symbol;
      
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          symbol,
          type: trade.type,
          totalTrades: 0,
          winCount: 0,
          lossCount: 0,
          winRate: 0,
          grossProfit: 0,
          grossLoss: 0,
          netPnL: 0,
          profitFactor: 0,
          avgTrade: 0
        });
      }
      
      const stats = symbolStats.get(symbol)!;
      stats.totalTrades++;
      
      if (trade.pnl! > 0) {
        stats.winCount++;
        stats.grossProfit += trade.pnl!;
      } else if (trade.pnl! < 0) {
        stats.lossCount++;
        stats.grossLoss += Math.abs(trade.pnl!);
      }
      
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

export function formatCurrency(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)} USD`;
}

export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
