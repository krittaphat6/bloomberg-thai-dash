import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Trade {
  id: string;
  symbol: string;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
}

interface RiskRewardData {
  symbol: string;
  avgRisk: number;
  avgReward: number;
  riskRewardRatio: number;
  winRate: number;
  totalTrades: number;
  efficiency: number;
}

interface Props {
  trades: Trade[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="font-semibold text-card-foreground text-base mb-2">{data.symbol}</p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Risk/Reward: <span className="font-medium text-primary">{data.riskRewardRatio.toFixed(2)}</span></p>
          <p className="text-sm text-muted-foreground">Win Rate: <span className="font-medium text-emerald-400">{data.winRate.toFixed(1)}%</span></p>
          <p className="text-sm text-muted-foreground">Avg Risk: <span className="font-medium text-red-400">${data.avgRisk.toFixed(2)}</span></p>
          <p className="text-sm text-muted-foreground">Avg Reward: <span className="font-medium text-emerald-400">${data.avgReward.toFixed(2)}</span></p>
          <p className="text-sm text-muted-foreground">Total Trades: <span className="font-medium">{data.totalTrades}</span></p>
          <p className="text-sm text-muted-foreground">Efficiency: <span className="font-medium text-blue-400">{data.efficiency.toFixed(1)}%</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export const EnhancedRiskRewardChart = ({ trades }: Props) => {
  const calculateRiskRewardData = (): RiskRewardData[] => {
    const symbolStats = new Map();
    
    trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(trade => {
      const symbol = trade.symbol;
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          symbol,
          totalWins: 0,
          totalLosses: 0,
          winCount: 0,
          lossCount: 0,
          totalTrades: 0
        });
      }
      
      const stats = symbolStats.get(symbol);
      stats.totalTrades++;
      
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
        const avgRisk = stats.totalLosses / Math.max(stats.lossCount, 1);
        const avgReward = stats.totalWins / Math.max(stats.winCount, 1);
        const riskRewardRatio = avgRisk > 0 ? avgReward / avgRisk : avgReward > 0 ? 999 : 0;
        const winRate = (stats.winCount / stats.totalTrades) * 100;
        const efficiency = (riskRewardRatio * winRate) / 100;
        
        return {
          symbol: stats.symbol,
          avgRisk,
          avgReward,
          riskRewardRatio,
          winRate,
          totalTrades: stats.totalTrades,
          efficiency
        };
      })
      .filter(item => item.avgRisk > 0 || item.avgReward > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 12);
  };

  const getColor = (data: RiskRewardData) => {
    if (data.riskRewardRatio >= 3 && data.winRate >= 60) return '#10B981'; // Emerald - Excellent
    if (data.riskRewardRatio >= 2 && data.winRate >= 50) return '#3B82F6'; // Blue - Very Good  
    if (data.riskRewardRatio >= 1.5 && data.winRate >= 40) return '#F59E0B'; // Amber - Good
    if (data.riskRewardRatio >= 1) return '#F97316'; // Orange - Fair
    return '#EF4444'; // Red - Poor
  };

  const getBubbleSize = (data: RiskRewardData) => {
    return Math.max(6, Math.min(20, data.totalTrades * 1.5 + data.efficiency * 0.3));
  };

  const riskRewardData = calculateRiskRewardData();

  if (riskRewardData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk vs Reward Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No risk-reward data available</p>
              <p className="text-sm">Need at least 2 closed trades per symbol</p>
              <p className="text-xs text-muted-foreground mt-1">Currently have trades but insufficient per symbol for analysis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxRisk = Math.max(...riskRewardData.map(d => d.avgRisk));
  const maxReward = Math.max(...riskRewardData.map(d => d.avgReward));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Risk vs Reward Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Interactive bubble chart showing risk-reward efficiency by symbol
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              data={riskRewardData} 
              margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
            >
              <defs>
                <radialGradient id="bubbleGradient">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0.4}/>
                </radialGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.3}
              />
              
              <XAxis 
                dataKey="avgRisk" 
                type="number"
                domain={[0, maxRisk * 1.1]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Average Risk ($)', 
                  position: 'insideBottom', 
                  offset: -10, 
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
                }}
              />
              
              <YAxis 
                dataKey="avgReward" 
                type="number"
                domain={[0, maxReward * 1.1]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Average Reward ($)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for ideal ratios */}
              <ReferenceLine 
                segment={[
                  { x: 0, y: 0 },
                  { x: maxRisk, y: maxRisk * 2 }
                ]}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeOpacity={0.4}
                label={{ value: "2:1 R:R", position: "top", style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
              />
              
              <ReferenceLine 
                segment={[
                  { x: 0, y: 0 },
                  { x: maxRisk, y: maxRisk }
                ]}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 2"
                strokeOpacity={0.3}
                label={{ value: "1:1 R:R", position: "top", style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
              />
              
              <Scatter dataKey="avgReward">
                {riskRewardData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColor(entry)}
                    r={getBubbleSize(entry)}
                    stroke="white"
                    strokeWidth={1}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Enhanced Legend */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-sm"></div>
              <span>Excellent (R:R ≥ 3, Win ≥ 60%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
              <span>Very Good (R:R ≥ 2, Win ≥ 50%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-amber-500 rounded-full shadow-sm"></div>
              <span>Good (R:R ≥ 1.5, Win ≥ 40%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-500 rounded-full shadow-sm"></div>
              <span>Fair (R:R ≥ 1)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
              <span>Poor (R:R &lt; 1)</span>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            Bubble size represents trading volume and efficiency. Ideal zone: above 2:1 reference line.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};