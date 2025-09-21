import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  type: 'CFD' | 'STOCK';
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
  quantity: number;
  entryPrice: number;
}

interface WinRateData {
  symbol: string;
  winCount: number;
  lossCount: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  netPnL: number;
  totalTrades: number;
  type: string;
  riskRewardRatio: number;
}

interface Props {
  trades: Trade[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl min-w-[250px]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-card-foreground text-lg">{label}</p>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold px-2 py-1 rounded ${
              data.type === 'CFD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
              'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            }`}>
              {data.type}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-muted-foreground">Win Rate:</span>
            </div>
            <span className="font-semibold text-emerald-400">{data.winRate.toFixed(1)}%</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm text-muted-foreground">Loss Rate:</span>
            </div>
            <span className="font-semibold text-red-400">{data.lossRate.toFixed(1)}%</span>
          </div>
          
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Wins:</span>
              <span className="font-semibold text-emerald-400">{data.winCount} trades</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Losses:</span>
              <span className="font-semibold text-red-400">{data.lossCount} trades</span>
            </div>
          </div>
          
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Win:</span>
              <span className="font-semibold text-emerald-400">${data.avgWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Loss:</span>
              <span className="font-semibold text-red-400">-${data.avgLoss.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">R:R Ratio:</span>
              <span className={`font-semibold ${data.riskRewardRatio >= 2 ? 'text-emerald-400' : data.riskRewardRatio >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                {data.riskRewardRatio.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Net P&L:</span>
              <span className={`font-bold ${data.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${data.netPnL >= 0 ? '+' : ''}{data.netPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const EnhancedWinRateChart = ({ trades }: Props) => {
  const calculateWinRateData = (): WinRateData[] => {
    const symbolStats = new Map();
    
    trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(trade => {
      const symbol = trade.symbol;
      
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          symbol,
          type: trade.type,
          wins: [],
          losses: [],
          totalTrades: 0
        });
      }
      
      const stats = symbolStats.get(symbol);
      stats.totalTrades++;
      
      if (trade.pnl! > 0) {
        stats.wins.push(trade.pnl!);
      } else {
        stats.losses.push(Math.abs(trade.pnl!));
      }
    });
    
    return Array.from(symbolStats.values())
      .filter(stats => stats.totalTrades >= 2)
      .map(stats => {
        const winCount = stats.wins.length;
        const lossCount = stats.losses.length;
        const totalTrades = stats.totalTrades;
        
        const winRate = (winCount / totalTrades) * 100;
        const lossRate = (lossCount / totalTrades) * 100;
        
        const avgWin = winCount > 0 ? stats.wins.reduce((sum: number, win: number) => sum + win, 0) / winCount : 0;
        const avgLoss = lossCount > 0 ? stats.losses.reduce((sum: number, loss: number) => sum + loss, 0) / lossCount : 0;
        
        const totalWins = stats.wins.reduce((sum: number, win: number) => sum + win, 0);
        const totalLosses = stats.losses.reduce((sum: number, loss: number) => sum + loss, 0);
        const netPnL = totalWins - totalLosses;
        
        const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;
        
        return {
          symbol: stats.symbol,
          winCount,
          lossCount,
          winRate,
          lossRate,
          avgWin,
          avgLoss,
          netPnL,
          totalTrades,
          type: stats.type,
          riskRewardRatio
        };
      })
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10); // Top 10 symbols
  };

  const winRateData = calculateWinRateData();

  if (winRateData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Win Rate Analysis by Asset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No win rate data available</p>
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
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Win Rate Analysis by Asset
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Win/Loss distribution with average profit analysis
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={winRateData} 
              margin={{ top: 20, right: 30, bottom: 60, left: 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.3}
              />
              
              <XAxis 
                dataKey="symbol" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              
              <YAxis 
                yAxisId="rate"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Rate (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              
              <YAxis 
                yAxisId="pnl"
                orientation="right"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Avg P&L ($)', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { textAnchor: 'middle', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              
              {/* Win Rate Bars */}
              <Bar 
                yAxisId="rate"
                dataKey="winRate" 
                name="Win Rate (%)"
                fill="hsl(var(--primary))"
                fillOpacity={0.8}
                radius={[2, 2, 0, 0]}
              />
              
              {/* Loss Rate Bars (stacked) */}
              <Bar 
                yAxisId="rate"
                dataKey="lossRate" 
                name="Loss Rate (%)"
                fill="hsl(var(--destructive))"
                fillOpacity={0.6}
                radius={[2, 2, 0, 0]}
                stackId="rate"
              />
              
              {/* Average Win Line */}
              <Line 
                yAxisId="pnl"
                type="monotone" 
                dataKey="avgWin" 
                name="Avg Win ($)"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ 
                  fill: '#10B981', 
                  strokeWidth: 2, 
                  r: 4,
                  stroke: 'white'
                }}
                activeDot={{ 
                  r: 6, 
                  fill: '#10B981',
                  stroke: 'white',
                  strokeWidth: 2
                }}
              />
              
              {/* Average Loss Line */}
              <Line 
                yAxisId="pnl"
                type="monotone" 
                dataKey="avgLoss" 
                name="Avg Loss ($)"
                stroke="#EF4444"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={{ 
                  fill: '#EF4444', 
                  strokeWidth: 2, 
                  r: 4,
                  stroke: 'white'
                }}
                activeDot={{ 
                  r: 6, 
                  fill: '#EF4444',
                  stroke: 'white',
                  strokeWidth: 2
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Performance Summary */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                {winRateData.filter(d => d.winRate >= 70).length}
              </div>
              <div className="text-emerald-600 dark:text-emerald-500 text-xs">High Win Rate (≥70%)</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="font-semibold text-blue-700 dark:text-blue-400">
                {winRateData.filter(d => d.riskRewardRatio >= 2).length}
              </div>
              <div className="text-blue-600 dark:text-blue-500 text-xs">Good R:R (≥2.0)</div>
            </div>
            
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="font-semibold text-amber-700 dark:text-amber-400">
                {winRateData.filter(d => d.netPnL > 0).length}
              </div>
              <div className="text-amber-600 dark:text-amber-500 text-xs">Profitable Assets</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="font-semibold text-purple-700 dark:text-purple-400">
                {(winRateData.reduce((sum, d) => sum + d.winRate, 0) / winRateData.length).toFixed(1)}%
              </div>
              <div className="text-purple-600 dark:text-purple-500 text-xs">Avg Win Rate</div>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            Target: Win rate above 50% with R:R ratio above 1.5 for consistent profitability
          </div>
        </div>
      </CardContent>
    </Card>
  );
};