import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trade, calculateMetrics, calculateRMultiples, runMonteCarloSimulation } from '@/utils/tradingMetrics';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';

interface RiskRewardTabProps {
  trades: Trade[];
  initialCapital?: number;
}

function getSQNRating(sqn: number): string {
  if (sqn >= 7) return 'Holy Grail';
  if (sqn >= 5) return 'Superb';
  if (sqn >= 3) return 'Excellent';
  if (sqn >= 2) return 'Good';
  if (sqn >= 1.5) return 'Average';
  return 'Poor';
}

export default function RiskRewardTab({ trades, initialCapital = 100 }: RiskRewardTabProps) {
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const [monteResult, setMonteResult] = useState<ReturnType<typeof runMonteCarloSimulation> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const longTrades = trades.filter(t => t.side === 'LONG');
  const shortTrades = trades.filter(t => t.side === 'SHORT');
  const longMetrics = useMemo(() => calculateMetrics(longTrades, initialCapital), [longTrades, initialCapital]);
  const shortMetrics = useMemo(() => calculateMetrics(shortTrades, initialCapital), [shortTrades, initialCapital]);
  
  const runMonteCarlo = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const rMultiples = calculateRMultiples(trades);
      const result = runMonteCarloSimulation(rMultiples, 1000, 200);
      setMonteResult(result);
      setIsRunning(false);
    }, 100);
  }, [trades]);

  const monteChartData = useMemo(() => {
    if (!monteResult) return [];
    return monteResult.percentile50.map((_, i) => ({
      trade: i * 4,
      p5: monteResult.percentile5[i],
      p25: monteResult.percentile25[i],
      p50: monteResult.percentile50[i],
      p75: monteResult.percentile75[i],
      p95: monteResult.percentile95[i],
    }));
  }, [monteResult]);

  const fmt = (v: number) => v === Infinity ? '∞' : v.toFixed(3);
  
  const rows = [
    { label: 'Sharpe Ratio', all: fmt(metrics.sharpeRatio), long: longMetrics.closedTrades > 0 ? fmt(longMetrics.sharpeRatio) : '—', short: shortMetrics.closedTrades > 0 ? fmt(shortMetrics.sharpeRatio) : '—' },
    { label: 'Sortino Ratio', all: metrics.sortinoRatio !== null ? fmt(metrics.sortinoRatio) : '—', long: '—', short: '—' },
    { label: 'Profit Factor', all: fmt(metrics.profitFactor), long: fmt(longMetrics.profitFactor), short: fmt(shortMetrics.profitFactor) },
    { label: 'Calmar Ratio', all: fmt(metrics.calmarRatio), long: '—', short: '—' },
    { label: 'Omega Ratio', all: fmt(metrics.omegaRatio), long: '—', short: '—' },
    { label: 'Gain-to-Pain Ratio', all: fmt(metrics.gainToPainRatio), long: '—', short: '—' },
    { label: 'Ulcer Index', all: metrics.ulcerIndex.toFixed(2), long: '—', short: '—' },
    { label: `SQN (${getSQNRating(metrics.sqn)})`, all: metrics.sqn.toFixed(2), long: '—', short: '—' },
    { label: 'Kelly Criterion (Full)', all: `${metrics.kellyCriterion.toFixed(1)}%`, long: '—', short: '—' },
    { label: 'Kelly Criterion (Half)', all: `${metrics.halfKelly.toFixed(1)}%`, long: '—', short: '—' },
    { label: 'VAMI', all: metrics.vami.toFixed(2), long: '—', short: '—' },
    { label: 'Recovery Factor', all: metrics.recoveryFactor === 999 ? '∞' : metrics.recoveryFactor.toFixed(2), long: '—', short: '—' },
    { label: 'Current DD from Peak', all: metrics.currentDrawdownFromPeak.toFixed(2), long: '—', short: '—' },
    { label: 'Avg R-Multiple', all: `${metrics.avgRMultiple.toFixed(2)}R`, long: '—', short: '—' },
    { label: 'Total R-Multiples', all: `${metrics.totalRMultiple.toFixed(2)}R`, long: '—', short: '—' },
    { label: 'Expectancy (R)', all: `${metrics.expectancyR.toFixed(2)}R`, long: '—', short: '—' },
  ];
  
  return (
    <div className="space-y-4">
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium text-xs">เมตริก</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs text-right">ทั้งหมด</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs text-right">Long</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs text-right">Short</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} className="border-border/10 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-foreground text-sm py-2">{row.label}</TableCell>
                  <TableCell className="text-right py-2 font-mono font-bold">{row.all}</TableCell>
                  <TableCell className="text-right py-2 text-emerald-400 font-mono">{row.long}</TableCell>
                  <TableCell className="text-right py-2 font-mono">{row.short}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monte Carlo */}
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
              🎲 Monte Carlo Simulation
            </CardTitle>
            <Button onClick={runMonteCarlo} size="sm" disabled={isRunning || trades.filter(t => t.status === 'CLOSED').length < 3}
              className="bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/30">
              {isRunning ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running...</> : '🎲 Run 1,000 Simulations'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {monteResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Prob of Ruin</div>
                  <div className={`text-lg font-mono font-bold ${monteResult.probOfRuin > 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {monteResult.probOfRuin.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Expected Max DD (95th)</div>
                  <div className="text-lg font-mono font-bold text-red-400">{monteResult.expectedMaxDrawdown.toFixed(2)}R</div>
                </div>
                <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Expected Return (Median)</div>
                  <div className={`text-lg font-mono font-bold ${monteResult.expectedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {monteResult.expectedReturn.toFixed(2)}R
                  </div>
                </div>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monteChartData}>
                    <defs>
                      <linearGradient id="monteBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ff88" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="trade" tick={{ fill: '#888', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="p95" stroke="none" fill="#00ff88" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="p75" stroke="none" fill="#00ff88" fillOpacity={0.12} />
                    <Area type="monotone" dataKey="p50" stroke="#00ff88" strokeWidth={2} fill="none" />
                    <Area type="monotone" dataKey="p25" stroke="none" fill="#ff4466" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="p5" stroke="none" fill="#ff4466" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              กดปุ่มเพื่อรัน Monte Carlo Simulation ด้วย R-Multiples ของคุณ
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
