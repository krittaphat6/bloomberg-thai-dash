import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  quantity: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
}

interface SectorData {
  symbol: string;
  sector: string;
  activeReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  totalContribution: number;
  benchmarkWeight: number;
  portfolioWeight: number;
  tradeCount: number;
  totalPnL: number;
}

interface Props {
  trades: Trade[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[250px]">
        <div className="mb-3">
          <p className="font-bold text-card-foreground text-lg">{data.symbol}</p>
          <p className="text-sm text-muted-foreground font-medium">{data.sector} Sector</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Active Return:</span>
            <span className={`font-semibold ${data.activeReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.activeReturn.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Allocation Effect:</span>
            <span className={`font-semibold ${data.allocationEffect >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.allocationEffect.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Selection Effect:</span>
            <span className={`font-semibold ${data.selectionEffect >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.selectionEffect.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-sm text-muted-foreground">Total Contribution:</span>
            <span className={`font-bold ${data.totalContribution >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.totalContribution.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Portfolio Weight:</span>
            <span className="font-semibold text-blue-400">{data.portfolioWeight.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total P&L:</span>
            <span className={`font-semibold ${data.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${data.totalPnL.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Trades:</span>
            <span className="font-semibold">{data.tradeCount}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const EnhancedSectorAnalysis = ({ trades }: Props) => {
  // Enhanced sector mapping with more comprehensive coverage
  const getSector = (symbol: string): string => {
    const sectorMap: { [key: string]: string } = {
      // Technology
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
      'NVDA': 'Technology', 'TSLA': 'Technology', 'META': 'Technology', 'NFLX': 'Technology',
      'AMD': 'Technology', 'INTC': 'Technology', 'CRM': 'Technology', 'ORCL': 'Technology',
      
      // Financial Services
      'JPM': 'Financials', 'BAC': 'Financials', 'WFC': 'Financials', 'GS': 'Financials',
      'MS': 'Financials', 'C': 'Financials', 'AXP': 'Financials', 'BRK': 'Financials',
      
      // Healthcare
      'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare', 'ABBV': 'Healthcare',
      'TMO': 'Healthcare', 'ABT': 'Healthcare', 'LLY': 'Healthcare', 'BMY': 'Healthcare',
      
      // Consumer Discretionary  
      'AMZN': 'Consumer Disc.', 'HD': 'Consumer Disc.', 'MCD': 'Consumer Disc.', 'NKE': 'Consumer Disc.',
      'SBUX': 'Consumer Disc.', 'TGT': 'Consumer Disc.', 'LOW': 'Consumer Disc.',
      
      // Consumer Staples
      'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples', 'WMT': 'Consumer Staples',
      
      // Energy
      'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy',
      
      // Industrials
      'BA': 'Industrials', 'CAT': 'Industrials', 'GE': 'Industrials', 'MMM': 'Industrials',
      
      // ETFs and Indices
      'SPY': 'Index/ETF', 'QQQ': 'Index/ETF', 'IWM': 'Index/ETF', 'VTI': 'Index/ETF',
      
      // Forex (CFD)
      'EURUSD': 'Forex Major', 'GBPUSD': 'Forex Major', 'USDJPY': 'Forex Major', 'USDCHF': 'Forex Major',
      'AUDUSD': 'Forex Major', 'USDCAD': 'Forex Major', 'NZDUSD': 'Forex Major',
      'EURJPY': 'Forex Cross', 'GBPJPY': 'Forex Cross', 'EURGBP': 'Forex Cross',
      
      // Commodities (CFD)
      'XAUUSD': 'Commodities', 'XAGUSD': 'Commodities', 'WTICRUD': 'Commodities', 'BRENTOIL': 'Commodities'
    };
    
    return sectorMap[symbol] || 'Other';
  };

  const calculateSectorData = (): SectorData[] => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    if (closedTrades.length < 3) return [];
    
    const symbolStats = new Map<string, {
      sector: string;
      totalPnL: number;
      totalVolume: number;
      tradeCount: number;
    }>();
    
    let totalPortfolioPnL = 0;
    let totalPortfolioVolume = 0;
    
    // Calculate symbol-level statistics
    closedTrades.forEach(trade => {
      const symbol = trade.symbol;
      const sector = getSector(symbol);
      const volume = trade.quantity * trade.entryPrice;
      
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          sector,
          totalPnL: 0,
          totalVolume: 0,
          tradeCount: 0
        });
      }
      
      const stats = symbolStats.get(symbol)!;
      stats.totalPnL += trade.pnl!;
      stats.totalVolume += volume;
      stats.tradeCount++;
      
      totalPortfolioPnL += trade.pnl!;
      totalPortfolioVolume += volume;
    });
    
    // Calculate sector attribution for each symbol
    return Array.from(symbolStats.entries())
      .filter(([_, stats]) => stats.tradeCount >= 2) // At least 2 trades for meaningful analysis
      .map(([symbol, stats]) => {
        // Portfolio weights
        const portfolioWeight = totalPortfolioVolume > 0 ? (stats.totalVolume / totalPortfolioVolume) * 100 : 0;
        
        // Simulated benchmark weight (for demonstration)
        // In real scenario, this would come from actual benchmark data
        const benchmarkWeight = Math.min(portfolioWeight * 0.8 + Math.random() * 2, 15); // Simulate benchmark weight
        
        // Active return calculation
        const symbolReturn = stats.totalVolume > 0 ? (stats.totalPnL / stats.totalVolume) * 100 : 0;
        const benchmarkReturn = Math.random() * 10 - 5; // Simulated benchmark return
        const activeReturn = symbolReturn - benchmarkReturn;
        
        // Attribution effects
        const allocationEffect = (portfolioWeight - benchmarkWeight) * benchmarkReturn / 100;
        const selectionEffect = portfolioWeight * (symbolReturn - benchmarkReturn) / 100;
        const totalContribution = allocationEffect + selectionEffect;
        
        return {
          symbol,
          sector: stats.sector,
          activeReturn,
          allocationEffect,
          selectionEffect,
          totalContribution,
          benchmarkWeight,
          portfolioWeight,
          tradeCount: stats.tradeCount,
          totalPnL: stats.totalPnL
        };
      })
      .sort((a, b) => Math.abs(b.totalContribution) - Math.abs(a.totalContribution))
      .slice(0, 12); // Top 12 contributors
  };

  const getColor = (data: SectorData) => {
    // Color based on sector and performance
    const sectorColors: { [key: string]: string } = {
      'Technology': data.totalContribution >= 0 ? '#3B82F6' : '#1E40AF',
      'Financials': data.totalContribution >= 0 ? '#10B981' : '#047857',
      'Healthcare': data.totalContribution >= 0 ? '#F59E0B' : '#D97706',
      'Consumer Disc.': data.totalContribution >= 0 ? '#EF4444' : '#DC2626',
      'Consumer Staples': data.totalContribution >= 0 ? '#8B5CF6' : '#7C3AED',
      'Energy': data.totalContribution >= 0 ? '#F97316' : '#EA580C',
      'Industrials': data.totalContribution >= 0 ? '#06B6D4' : '#0891B2',
      'Index/ETF': data.totalContribution >= 0 ? '#84CC16' : '#65A30D',
      'Forex Major': data.totalContribution >= 0 ? '#EC4899' : '#DB2777',
      'Forex Cross': data.totalContribution >= 0 ? '#A855F7' : '#9333EA',
      'Commodities': data.totalContribution >= 0 ? '#FBBF24' : '#F59E0B',
      'Other': data.totalContribution >= 0 ? '#6B7280' : '#4B5563'
    };
    
    return sectorColors[data.sector] || '#6B7280';
  };

  const getBubbleSize = (data: SectorData) => {
    return Math.max(6, Math.min(20, Math.abs(data.totalContribution) * 8 + data.tradeCount * 2));
  };

  const sectorData = calculateSectorData();

  if (sectorData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sector Attribution Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>Insufficient data for sector analysis</p>
              <p className="text-sm">Need at least 3 closed trades with 2+ trades per symbol</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sector Attribution Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Active return decomposition: Allocation effect vs Stock selection effect
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              data={sectorData} 
              margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.3}
              />
              
              <XAxis 
                dataKey="allocationEffect" 
                type="number"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Allocation Effect (%)', 
                  position: 'insideBottom', 
                  offset: -10, 
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
                }}
              />
              
              <YAxis 
                dataKey="selectionEffect" 
                type="number"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Selection Effect (%)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for quadrants */}
              <ReferenceLine 
                x={0} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2" 
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                y={0} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2" 
                strokeOpacity={0.5}
              />
              
              <Scatter dataKey="selectionEffect">
                {sectorData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry)}
                    r={getBubbleSize(entry)}
                    stroke="white"
                    strokeWidth={1.5}
                    style={{ 
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Quadrant Legend */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                Excellent: Good Allocation + Good Selection
              </div>
              <div className="text-emerald-600 dark:text-emerald-500 text-xs">
                Top right: Optimal weight + outperforming picks
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
                Good Selection: Poor Allocation + Good Selection
              </div>
              <div className="text-blue-600 dark:text-blue-500 text-xs">
                Top left: Good picks, consider increasing weight
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Good Allocation: Good Allocation + Poor Selection
              </div>
              <div className="text-amber-600 dark:text-amber-500 text-xs">
                Bottom right: Right weight, improve stock picking
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <div className="font-semibold text-red-700 dark:text-red-400 mb-1">
                Review Needed: Poor Allocation + Poor Selection
              </div>
              <div className="text-red-600 dark:text-red-500 text-xs">
                Bottom left: Wrong weight + underperforming picks
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            Bubble size represents total contribution magnitude. Colors vary by sector and performance.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};