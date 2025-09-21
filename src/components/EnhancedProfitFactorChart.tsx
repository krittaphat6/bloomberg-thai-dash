import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  type: 'CFD' | 'STOCK';
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
  quantity: number;
  entryPrice: number;
}

interface ProfitFactorData {
  symbol: string;
  profitFactor: number;
  winRate: number;
  totalPnL: number;
  totalVolume: number;
  tradeCount: number;
  avgTradeSize: number;
  type: string;
  momentum: number;
}

interface Props {
  trades: Trade[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[220px]">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-card-foreground text-lg">{data.symbol}</p>
          <div className="flex items-center gap-1">
            {data.totalPnL >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${data.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.type}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Profit Factor:</span>
            <span className="font-semibold text-primary">{data.profitFactor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Win Rate:</span>
            <span className="font-semibold text-emerald-400">{data.winRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total P&L:</span>
            <span className={`font-semibold ${data.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${data.totalPnL.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Trade Volume:</span>
            <span className="font-semibold text-blue-400">${data.totalVolume.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Trades:</span>
            <span className="font-semibold">{data.tradeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Avg Size:</span>
            <span className="font-semibold text-amber-400">${data.avgTradeSize.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const EnhancedProfitFactorChart = ({ trades }: Props) => {
  const calculateProfitFactorData = (): ProfitFactorData[] => {
    const symbolStats = new Map();
    
    trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(trade => {
      const symbol = trade.symbol;
      const tradeVolume = trade.quantity * trade.entryPrice;
      
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          symbol,
          type: trade.type,
          totalWins: 0,
          totalLosses: 0,
          winCount: 0,
          lossCount: 0,
          totalTrades: 0,
          totalVolume: 0,
          recentPnL: [] // For momentum calculation
        });
      }
      
      const stats = symbolStats.get(symbol);
      stats.totalTrades++;
      stats.totalVolume += tradeVolume;
      stats.recentPnL.push(trade.pnl!);
      
      if (trade.pnl! > 0) {
        stats.totalWins += trade.pnl!;
        stats.winCount++;
      } else {
        stats.totalLosses += Math.abs(trade.pnl!);
        stats.lossCount++;
      }
    });
    
    return Array.from(symbolStats.values())
      .filter(stats => stats.totalTrades >= 2)
      .map(stats => {
        const profitFactor = stats.totalLosses > 0 ? stats.totalWins / stats.totalLosses : stats.totalWins > 0 ? 999 : 0;
        const winRate = (stats.winCount / stats.totalTrades) * 100;
        const totalPnL = stats.totalWins - stats.totalLosses;
        const avgTradeSize = stats.totalVolume / stats.totalTrades;
        
        // Calculate momentum (recent performance trend)
        const recentTrades = stats.recentPnL.slice(-5); // Last 5 trades
        const momentum = recentTrades.reduce((sum: number, pnl: number) => sum + pnl, 0) / recentTrades.length;
        
        return {
          symbol: stats.symbol,
          profitFactor: Math.min(profitFactor, 10), // Cap at 10 for better visualization
          winRate,
          totalPnL,
          totalVolume: stats.totalVolume,
          tradeCount: stats.totalTrades,
          avgTradeSize,
          type: stats.type,
          momentum
        };
      })
      .sort((a, b) => b.profitFactor - a.profitFactor)
      .slice(0, 15);
  };

  const getColor = (data: ProfitFactorData) => {
    // Color based on profit factor and momentum
    if (data.profitFactor >= 3) return data.momentum > 0 ? '#10B981' : '#059669'; // Emerald variants
    if (data.profitFactor >= 2) return data.momentum > 0 ? '#3B82F6' : '#2563EB'; // Blue variants  
    if (data.profitFactor >= 1.5) return data.momentum > 0 ? '#F59E0B' : '#D97706'; // Amber variants
    if (data.profitFactor >= 1) return data.momentum > 0 ? '#F97316' : '#EA580C'; // Orange variants
    return data.momentum > 0 ? '#EF4444' : '#DC2626'; // Red variants
  };

  const getBubbleSize = (data: ProfitFactorData) => {
    // Size based on total volume and trade count
    const volumeFactor = Math.log10(data.totalVolume + 1) / 6; // Normalize volume
    const tradeFactor = data.tradeCount / 20; // Normalize trade count
    return Math.max(8, Math.min(25, (volumeFactor + tradeFactor) * 20 + 10));
  };

  const profitFactorData = calculateProfitFactorData();

  if (profitFactorData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profit Factor by Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No profit factor data available</p>
              <p className="text-sm">Need at least 2 closed trades per symbol</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profit Factor Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Multi-dimensional view: Size = Volume × Trades, Color = Performance + Momentum
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              data={profitFactorData} 
              margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
            >
              <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.3)"/>
                </filter>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.2}
              />
              
              <XAxis 
                dataKey="winRate" 
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Win Rate (%)', 
                  position: 'insideBottom', 
                  offset: -10, 
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
                }}
              />
              
              <YAxis 
                dataKey="profitFactor" 
                type="number"
                domain={[0, 'dataMax + 0.5']}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Profit Factor', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Scatter dataKey="profitFactor">
                {profitFactorData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry)}
                    r={getBubbleSize(entry)}
                    stroke="white"
                    strokeWidth={2}
                    style={{ 
                      filter: 'url(#shadow)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Multi-Level Legend */}
        <div className="mt-4 space-y-3">
          {/* Performance Legend */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground">Performance Rating</h4>
            <div className="flex justify-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-sm"></div>
                <span>Excellent (PF ≥ 3)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                <span>Very Good (PF ≥ 2)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-amber-500 rounded-full shadow-sm"></div>
                <span>Good (PF ≥ 1.5)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-500 rounded-full shadow-sm"></div>
                <span>Fair (PF ≥ 1)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
                <span>Poor (PF &lt; 1)</span>
              </div>
            </div>
          </div>
          
          {/* Size Legend */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground">Bubble Size</h4>
            <div className="flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Small Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span>Medium Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded-full"></div>
                <span>Large Volume</span>
              </div>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            Brighter colors indicate positive momentum. Target: Upper right quadrant (high win rate + high profit factor).
          </div>
        </div>
      </CardContent>
    </Card>
  );
};