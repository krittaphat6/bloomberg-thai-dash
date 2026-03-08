import { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trade, calculateMetrics } from '@/utils/tradingMetrics';

interface AbleScoreRadarProps {
  trades: Trade[];
  initialCapital: number;
}

export default function AbleScoreRadar({ trades, initialCapital }: AbleScoreRadarProps) {
  const { radarData, ableScore } = useMemo(() => {
    const metrics = calculateMetrics(trades, initialCapital);
    const closedTrades = trades.filter(t => t.pnlPercentage !== undefined);
    
    const winRateScore = Math.min(100, metrics.winRate);
    
    // Risk Management (SQN, Sharpe, Max Drawdown)
    const sqnScore = Math.min(100, Math.max(0, metrics.sqn * 20));
    const sharpeScore = Math.min(100, Math.max(0, (metrics.sharpeRatio + 1) * 30));
    const ddScore = Math.max(0, 100 - metrics.maxDrawdownPercent * 2);
    const riskManagementScore = (sqnScore * 0.4 + sharpeScore * 0.3 + ddScore * 0.3);

    // Consistency
    let consistencyScore = 50;
    if (closedTrades.length > 3) {
      const returns = closedTrades.map(t => t.pnlPercentage || 0);
      const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
      const stdDev = Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / returns.length);
      consistencyScore = Math.max(0, Math.min(100, 100 - stdDev * 10));
    }

    // Discipline
    const disciplineScore = Math.max(0, Math.min(100, 
      (metrics.disciplineScore * 0.5 + metrics.followedPlanRate * 0.5) || 50
    ));

    // Expectancy
    const expectancyScore = Math.min(100, Math.max(0, (metrics.avgRMultiple + 1) * 30));

    // Psychology
    const psychScore = Math.max(0, Math.min(100,
      (metrics.avgEmotionScore || 5) * 10 - metrics.revengeTradeCount * 5 - metrics.fomoTradeCount * 3
    ));

    // Execution Quality
    const execScore = Math.min(100, Math.max(0,
      ((metrics.avgEntryQuality || 5) + (metrics.avgExitQuality || 5) + (metrics.avgManagementQuality || 5)) / 3 * 10
    ));

    // Recovery
    const recoveryScore = Math.min(100, Math.max(0, metrics.recoveryFactor * 10));

    const radarData = [
      { metric: 'Win Rate', value: winRateScore, fullMark: 100 },
      { metric: 'Risk Mgmt', value: riskManagementScore, fullMark: 100 },
      { metric: 'Consistency', value: consistencyScore, fullMark: 100 },
      { metric: 'Discipline', value: disciplineScore, fullMark: 100 },
      { metric: 'Expectancy', value: expectancyScore, fullMark: 100 },
      { metric: 'Psychology', value: psychScore, fullMark: 100 },
      { metric: 'Execution', value: execScore, fullMark: 100 },
      { metric: 'Recovery', value: recoveryScore, fullMark: 100 },
    ];

    const ableScore = (
      winRateScore * 0.10 +
      riskManagementScore * 0.20 +
      consistencyScore * 0.15 +
      disciplineScore * 0.20 +
      expectancyScore * 0.15 +
      psychScore * 0.10 +
      execScore * 0.05 +
      recoveryScore * 0.05
    );

    return { radarData, ableScore };
  }, [trades, initialCapital]);

  const getScoreColor = (score: number) => {
    if (score >= 81) return 'text-cyan-400';
    if (score >= 61) return 'text-emerald-400';
    if (score >= 41) return 'text-amber-400';
    return 'text-red-400';
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'F';
  };

  return (
    <Card className="bg-[hsl(var(--card))] border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
          ABLE SCORE
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} tickCount={5} />
                <Radar name="Score" dataKey="value" stroke="#00ff88" fill="#00ff88" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--terminal-green) / 0.3)', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col justify-center items-center">
            <div className="text-center mb-4">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">ABLE SCORE</div>
              <div className={`text-6xl font-bold font-mono ${getScoreColor(ableScore)}`}>
                {ableScore.toFixed(0)}
              </div>
              <div className={`text-2xl font-bold mt-1 ${getScoreColor(ableScore)}`}>
                {getGrade(ableScore)}
              </div>
            </div>
            
            <div className="w-full max-w-[200px]">
              <div className="h-3 bg-muted/30 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-red-500/30" />
                  <div className="flex-1 bg-amber-500/30" />
                  <div className="flex-1 bg-emerald-500/30" />
                  <div className="flex-1 bg-cyan-500/30" />
                </div>
                <div className="h-full bg-terminal-green rounded-full transition-all duration-700" style={{ width: `${ableScore}%` }} />
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs w-full max-w-[280px]">
              {radarData.map(item => (
                <div key={item.metric} className="flex justify-between">
                  <span className="text-muted-foreground">{item.metric}:</span>
                  <span className={`font-mono ${getScoreColor(item.value)}`}>{item.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
