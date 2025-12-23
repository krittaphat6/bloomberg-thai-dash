import { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade, calculateMetrics } from '@/utils/tradingMetrics';

interface ZellaScoreRadarProps {
  trades: Trade[];
  initialCapital: number;
}

export default function ZellaScoreRadar({ trades, initialCapital }: ZellaScoreRadarProps) {
  const { radarData, zellaScore } = useMemo(() => {
    const metrics = calculateMetrics(trades, initialCapital);
    
    // Normalize metrics to 0-100 scale for radar chart
    const winRateScore = Math.min(100, metrics.winRate);
    
    // Profit Factor: 1 = 25, 2 = 50, 3+ = 75+, cap at 100
    const profitFactorScore = Math.min(100, Math.max(0, (metrics.profitFactor - 1) * 25 + 25));
    
    // Consistency: Based on standard deviation of returns (lower is better)
    // This is a simplified version - you'd want more trades for accurate measurement
    const closedTrades = trades.filter(t => t.pnlPercentage !== undefined);
    let consistencyScore = 50;
    if (closedTrades.length > 3) {
      const returns = closedTrades.map(t => t.pnlPercentage || 0);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      // Lower stdDev = higher consistency score (invert and scale)
      consistencyScore = Math.max(0, Math.min(100, 100 - stdDev * 10));
    }
    
    // Max Drawdown: Lower is better (invert)
    const maxDrawdownScore = Math.max(0, 100 - metrics.maxDrawdownPercent * 2);
    
    // Avg Win/Loss Ratio
    const avgWinLossScore = Math.min(100, metrics.avgWinLossRatio * 25);
    
    // Recovery Factor: Net Profit / Max Drawdown
    const recoveryFactor = metrics.maxDrawdown > 0 
      ? metrics.netProfit / metrics.maxDrawdown 
      : metrics.netProfit > 0 ? 100 : 0;
    const recoveryScore = Math.min(100, Math.max(0, recoveryFactor * 20));
    
    const radarData = [
      { metric: 'Win %', value: winRateScore, fullMark: 100 },
      { metric: 'Profit Factor', value: profitFactorScore, fullMark: 100 },
      { metric: 'Consistency', value: consistencyScore, fullMark: 100 },
      { metric: 'Max Drawdown', value: maxDrawdownScore, fullMark: 100 },
      { metric: 'Avg Win/Loss', value: avgWinLossScore, fullMark: 100 },
      { metric: 'Recovery Factor', value: recoveryScore, fullMark: 100 },
    ];
    
    // Calculate overall Zella Score (weighted average)
    const zellaScore = (
      winRateScore * 0.20 +
      profitFactorScore * 0.20 +
      consistencyScore * 0.15 +
      maxDrawdownScore * 0.20 +
      avgWinLossScore * 0.15 +
      recoveryScore * 0.10
    );
    
    return { radarData, zellaScore };
  }, [trades, initialCapital]);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-terminal-green';
    if (score >= 40) return 'text-terminal-amber';
    return 'text-red-400';
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Below Average';
    return 'Needs Improvement';
  };
  
  return (
    <Card className="border-terminal-green/20 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-terminal-green flex items-center gap-2">
          Zella Score ⓘ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Radar Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }}
                  tickCount={5}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="hsl(var(--terminal-green))"
                  fill="hsl(var(--terminal-green))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--terminal-green) / 0.3)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--terminal-green))' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Score Display */}
          <div className="flex flex-col justify-center items-center">
            <div className="text-center mb-4">
              <div className="text-sm text-muted-foreground mb-1">Your Zella Score</div>
              <div className={`text-5xl font-bold ${getScoreColor(zellaScore)}`}>
                {zellaScore.toFixed(2)}
              </div>
              <div className={`text-sm font-medium mt-1 ${getScoreColor(zellaScore)}`}>
                {getScoreLabel(zellaScore)}
              </div>
            </div>
            
            {/* Score breakdown bar */}
            <div className="w-full max-w-[200px]">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>0</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>100</span>
              </div>
              <div className="h-3 bg-muted/30 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-red-500/30" />
                  <div className="flex-1 bg-orange-500/30" />
                  <div className="flex-1 bg-yellow-500/30" />
                  <div className="flex-1 bg-lime-500/30" />
                  <div className="flex-1 bg-emerald-500/30" />
                </div>
                <div 
                  className="h-full bg-terminal-green rounded-full transition-all duration-500"
                  style={{ width: `${zellaScore}%` }}
                />
                <div 
                  className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-500"
                  style={{ left: `calc(${zellaScore}% - 2px)` }}
                />
              </div>
            </div>
            
            {/* Individual scores */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs w-full">
              {radarData.map((item) => (
                <div key={item.metric} className="flex justify-between">
                  <span className="text-muted-foreground">{item.metric}:</span>
                  <span className={getScoreColor(item.value)}>{item.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
