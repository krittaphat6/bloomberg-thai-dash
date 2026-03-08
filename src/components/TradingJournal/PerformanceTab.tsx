import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calculateMetrics, Trade } from '@/utils/tradingMetrics';
import { cn } from '@/lib/utils';

interface PerformanceTabProps {
  trades: Trade[];
  initialCapital?: number;
}

type Period = 'all' | '1W' | '1M' | '3M' | '6M' | '1Y';

function filterByPeriod(trades: Trade[], period: Period): Trade[] {
  if (period === 'all') return trades;
  const now = new Date();
  const msMap: Record<string, number> = {
    '1W': 7 * 86400000,
    '1M': 30 * 86400000,
    '3M': 90 * 86400000,
    '6M': 180 * 86400000,
    '1Y': 365 * 86400000,
  };
  const cutoff = now.getTime() - msMap[period];
  return trades.filter(t => new Date(t.date).getTime() >= cutoff);
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function MetricCard({ label, value, sub, color = 'text-foreground' }: MetricCardProps) {
  return (
    <Card className="bg-[hsl(var(--card))] border-border/30">
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function PerformanceTab({ trades, initialCapital = 100 }: PerformanceTabProps) {
  const [period, setPeriod] = useState<Period>('all');
  const filteredTrades = useMemo(() => filterByPeriod(trades, period), [trades, period]);
  const metrics = useMemo(() => calculateMetrics(filteredTrades, initialCapital), [filteredTrades, initialCapital]);

  const periods: Period[] = ['all', '1W', '1M', '3M', '6M', '1Y'];

  const cards: MetricCardProps[] = [
    { label: 'กำไรสุทธิ', value: `${metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)}`, sub: `${metrics.netProfitPercent.toFixed(2)}%`, color: metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'กำไรเบื้องต้น', value: `${metrics.grossProfit.toFixed(2)}`, sub: 'USD' },
    { label: 'ขาดทุนเบื้องต้น', value: `${metrics.grossLoss.toFixed(2)}`, sub: 'USD', color: 'text-red-400' },
    { label: 'VAMI', value: metrics.vami.toFixed(2) },
    { label: 'Calmar Ratio', value: metrics.calmarRatio.toFixed(3) },
    { label: 'Omega Ratio', value: metrics.omegaRatio === 999 ? '∞' : metrics.omegaRatio.toFixed(3) },
    { label: 'Gain-to-Pain', value: metrics.gainToPainRatio.toFixed(3) },
    { label: 'Ulcer Index', value: metrics.ulcerIndex.toFixed(2) },
    { label: 'Recovery Factor', value: metrics.recoveryFactor === 999 ? '∞' : metrics.recoveryFactor.toFixed(2) },
    { label: 'Current DD', value: metrics.currentDrawdownFromPeak.toFixed(2), sub: 'from peak', color: 'text-red-400' },
    { label: 'Max Drawdown', value: metrics.maxDrawdown.toFixed(2), sub: `${metrics.maxDrawdownPercent.toFixed(2)}%`, color: 'text-red-400' },
    { label: 'Max RunUp', value: metrics.maxRunUp.toFixed(2), sub: `${metrics.maxRunUpPercent.toFixed(2)}%`, color: 'text-emerald-400' },
    { label: 'Win Streak', value: `${metrics.longestWinStreak}W`, sub: `Current: ${metrics.currentStreak > 0 ? `+${metrics.currentStreak}` : metrics.currentStreak}`, color: 'text-emerald-400' },
    { label: 'Loss Streak', value: `${metrics.longestLossStreak}L`, color: 'text-red-400' },
    { label: 'Avg Hold Time', value: metrics.avgHoldingMinutes > 0 ? `${metrics.avgHoldingMinutes.toFixed(0)}min` : '—' },
    { label: 'Best Hour', value: `${metrics.bestHour}:00` },
    { label: 'Worst Hour', value: `${metrics.worstHour}:00` },
    { label: 'Best Day', value: metrics.bestDayOfWeek },
    { label: 'Worst Day', value: metrics.worstDayOfWeek },
    { label: 'Sharpe Ratio', value: metrics.sharpeRatio.toFixed(3) },
    { label: 'Sortino Ratio', value: metrics.sortinoRatio !== null ? metrics.sortinoRatio.toFixed(3) : '—' },
  ];

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-1 flex-wrap">
        {periods.map(p => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
            className={cn(
              "h-7 text-xs px-3",
              period === p && "bg-terminal-green/20 text-terminal-green border-terminal-green/50"
            )}
          >
            {p === 'all' ? 'All' : p}
          </Button>
        ))}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <MetricCard key={i} {...card} />
        ))}
      </div>
    </div>
  );
}
