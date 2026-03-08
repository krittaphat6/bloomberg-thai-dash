import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trade, calculateMetrics, calculateSymbolPerformance, calculateRMultiples, runMonteCarloSimulation, calculatePnLByDimension } from '@/utils/tradingMetrics';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts';

interface ReportsTabProps {
  trades: Trade[];
  initialCapital?: number;
}

interface ReportCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function ReportCard({ icon, title, subtitle, onClick }: ReportCardProps) {
  return (
    <Card className="bg-[hsl(var(--card))] border-border/30 hover:border-terminal-green/40 transition-all cursor-pointer group" onClick={onClick}>
      <CardContent className="p-4">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
        <div className="text-xs text-terminal-green/60 mt-2 group-hover:text-terminal-green transition-colors">
          Expand →
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsTab({ trades, initialCapital = 100 }: ReportsTabProps) {
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const symbolPerf = useMemo(() => calculateSymbolPerformance(trades), [trades]);
  const closed = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades]);

  // Hour data
  const hourData = useMemo(() => {
    return Object.entries(metrics.pnlByHour)
      .map(([hour, pnl]) => ({ hour: `${hour}:00`, pnl }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [metrics]);

  // Day data
  const dayData = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => ({ day: day.slice(0, 3), pnl: metrics.pnlByDayOfWeek[day] || 0 }));
  }, [metrics]);

  // Setup data
  const setupData = useMemo(() => {
    return Object.entries(metrics.pnlBySetup)
      .map(([setup, data]) => ({ setup, ...data }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [metrics]);

  // Rolling win rate
  const rollingWinRate = useMemo(() => {
    const window = 10;
    return closed.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = closed.slice(start, i + 1);
      const wins = slice.filter(t => t.pnl! > 0).length;
      return { trade: i + 1, winRate: (wins / slice.length) * 100 };
    });
  }, [closed]);

  // R-Multiple distribution
  const rMultiples = useMemo(() => calculateRMultiples(closed), [closed]);
  const rDistribution = useMemo(() => {
    if (rMultiples.length === 0) return [];
    const bucketSize = 0.5;
    const min = Math.floor(Math.min(...rMultiples) / bucketSize) * bucketSize;
    const max = Math.ceil(Math.max(...rMultiples) / bucketSize) * bucketSize;
    const buckets: { range: string; count: number; type: string }[] = [];
    for (let i = min; i < max; i += bucketSize) {
      const count = rMultiples.filter(r => r >= i && r < i + bucketSize).length;
      buckets.push({ range: `${i.toFixed(1)}R`, count, type: i < 0 ? 'loss' : 'profit' });
    }
    return buckets;
  }, [rMultiples]);

  // Streak data
  const streakData = useMemo(() => {
    const streaks: { index: number; length: number; type: string }[] = [];
    let current = 0;
    let type = '';
    closed.forEach((t, i) => {
      const isWin = t.pnl! > 0;
      const newType = isWin ? 'win' : 'loss';
      if (newType === type) {
        current++;
      } else {
        if (current > 0) streaks.push({ index: i - current, length: current, type });
        current = 1;
        type = newType;
      }
    });
    if (current > 0) streaks.push({ index: closed.length - current, length: current, type });
    return streaks;
  }, [closed]);

  const chartStyle = { backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' };

  const renderReportContent = (reportId: string) => {
    switch (reportId) {
      case 'time':
        return (
          <div className="space-y-4">
            <div className="h-[300px]">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">P&L ตามชั่วโมง</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={chartStyle} />
                  <Bar dataKey="pnl" fill="#00ff88" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[200px]">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">P&L ตามวัน</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={chartStyle} />
                  <Bar dataKey="pnl" fill="#00aaff" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'symbol':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2 text-muted-foreground">Symbol</th>
                  <th className="text-right py-2 text-muted-foreground">Trades</th>
                  <th className="text-right py-2 text-muted-foreground">Win%</th>
                  <th className="text-right py-2 text-muted-foreground">Net P&L</th>
                  <th className="text-right py-2 text-muted-foreground">PF</th>
                </tr>
              </thead>
              <tbody>
                {symbolPerf.map(s => (
                  <tr key={s.symbol} className="border-b border-border/10">
                    <td className="py-2 font-bold">{s.symbol}</td>
                    <td className="text-right font-mono">{s.totalTrades}</td>
                    <td className="text-right font-mono">{s.winRate.toFixed(1)}%</td>
                    <td className={`text-right font-mono font-bold ${s.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.netPnL.toFixed(2)}
                    </td>
                    <td className="text-right font-mono">{s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'setup':
        return (
          <div className="space-y-4">
            {setupData.length > 0 ? (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={setupData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="setup" tick={{ fill: '#888', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="pnl" fill="#00ff88" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2">Setup</th>
                      <th className="text-right py-2">Trades</th>
                      <th className="text-right py-2">Win%</th>
                      <th className="text-right py-2">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setupData.map(s => (
                      <tr key={s.setup} className="border-b border-border/10">
                        <td className="py-2 font-medium">{s.setup}</td>
                        <td className="text-right font-mono">{s.count}</td>
                        <td className="text-right font-mono">{s.winRate.toFixed(1)}%</td>
                        <td className={`text-right font-mono font-bold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {s.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">เพิ่ม Setup ในเทรดเพื่อดูการวิเคราะห์</p>
            )}
          </div>
        );
      case 'winrate':
        return (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingWinRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="trade" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip contentStyle={chartStyle} />
                <Line type="monotone" dataKey="winRate" stroke="#00ff88" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      case 'rmultiple':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Avg R</div>
                <div className="text-lg font-mono font-bold text-foreground">{metrics.avgRMultiple.toFixed(2)}R</div>
              </div>
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Total R</div>
                <div className="text-lg font-mono font-bold text-foreground">{metrics.totalRMultiple.toFixed(2)}R</div>
              </div>
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">SQN</div>
                <div className="text-lg font-mono font-bold text-foreground">{metrics.sqn.toFixed(2)}</div>
              </div>
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Std Dev</div>
                <div className="text-lg font-mono font-bold text-foreground">{metrics.rMultipleStdDev.toFixed(2)}</div>
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="range" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={chartStyle} />
                  <Bar dataKey="count" fill="#00ff88" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'streak':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Current</div>
                <div className={`text-lg font-mono font-bold ${metrics.currentStreak >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {metrics.currentStreak > 0 ? `+${metrics.currentStreak}W` : `${metrics.currentStreak}L`}
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Best Win</div>
                <div className="text-lg font-mono font-bold text-emerald-400">{metrics.longestWinStreak}W</div>
              </div>
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Worst Loss</div>
                <div className="text-lg font-mono font-bold text-red-400">{metrics.longestLossStreak}L</div>
              </div>
              <div className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Avg Win Streak</div>
                <div className="text-lg font-mono font-bold text-foreground">{metrics.avgWinStreakLength.toFixed(1)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {streakData.map((s, i) => (
                <div key={i} className={`h-6 rounded flex items-center justify-center text-xs font-mono ${
                  s.type === 'win' ? 'bg-emerald-500/30 text-emerald-400' : 'bg-red-500/30 text-red-400'
                }`} style={{ width: `${Math.max(24, s.length * 16)}px` }}>
                  {s.length}
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <p className="text-muted-foreground">Coming soon...</p>;
    }
  };

  const reports = [
    { id: 'time', icon: '📅', title: 'Day & Time Report', subtitle: `Best hour: ${metrics.bestHour}:00` },
    { id: 'symbol', icon: '💰', title: 'Symbol Report', subtitle: `${symbolPerf.length} symbols tracked` },
    { id: 'setup', icon: '📋', title: 'Setup Report', subtitle: `${Object.keys(metrics.pnlBySetup).length} setups` },
    { id: 'winrate', icon: '🎯', title: 'Win Rate Trend', subtitle: `Current: ${metrics.winRate.toFixed(1)}%` },
    { id: 'rmultiple', icon: '📊', title: 'R-Multiple Distribution', subtitle: `Avg: ${metrics.avgRMultiple.toFixed(2)}R` },
    { id: 'streak', icon: '📈', title: 'Streak Analysis', subtitle: `Best: ${metrics.longestWinStreak}W streak` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {reports.map(r => (
          <ReportCard key={r.id} icon={r.icon} title={r.title} subtitle={r.subtitle} onClick={() => setExpandedReport(r.id)} />
        ))}
      </div>

      <Dialog open={!!expandedReport} onOpenChange={() => setExpandedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">
              {reports.find(r => r.id === expandedReport)?.icon} {reports.find(r => r.id === expandedReport)?.title}
            </DialogTitle>
          </DialogHeader>
          {expandedReport && renderReportContent(expandedReport)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
