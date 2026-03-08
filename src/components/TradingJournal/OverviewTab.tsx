import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, ReferenceLine
} from 'recharts';
import { calculateMetrics, calculatePnLDistribution, Trade } from '@/utils/tradingMetrics';
import CalendarView from './CalendarView';
import AbleScoreRadar from './AbleScoreRadar';
import Portfolio3DVisualization from './Portfolio3DVisualization';

interface OverviewTabProps {
  trades: Trade[];
  initialCapital?: number;
}

function getSQNLabel(sqn: number): { label: string; color: string } {
  if (sqn >= 5) return { label: 'Holy Grail', color: 'text-cyan-400' };
  if (sqn >= 3) return { label: 'Excellent', color: 'text-emerald-400' };
  if (sqn >= 1.5) return { label: 'Good', color: 'text-amber-400' };
  return { label: 'Poor', color: 'text-red-400' };
}

export default function OverviewTab({ trades, initialCapital = 100 }: OverviewTabProps) {
  const [showRunUpDrawdown, setShowRunUpDrawdown] = useState(true);
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const pnlDistribution = useMemo(() => calculatePnLDistribution(trades, 0.1), [trades]);
  
  const sqnInfo = getSQNLabel(metrics.sqn);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid: { hour: number; day: string; pnl: number; count: number }[] = [];
    const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        grid.push({ hour: h, day: dayNames[d], pnl: 0, count: 0 });
      }
    }

    closed.forEach(t => {
      const date = new Date(t.entryTime || t.date);
      const dayIdx = (date.getDay() + 6) % 7; // Mon=0
      const hour = date.getHours();
      const cell = grid.find(c => c.hour === hour && c.day === dayNames[dayIdx]);
      if (cell) { cell.pnl += t.pnl || 0; cell.count++; }
    });

    return grid;
  }, [trades]);

  const maxAbsPnl = useMemo(() => Math.max(1, ...heatmapData.map(d => Math.abs(d.pnl))), [heatmapData]);

  const kpiCards = [
    { label: 'Net P&L', value: `${metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)}`, sub: `${metrics.netProfitPercent.toFixed(2)}%`, color: metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, sub: `${metrics.winningTrades}/${metrics.closedTrades}`, color: 'text-foreground' },
    { label: 'Profit Factor', value: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2), sub: '', color: 'text-foreground' },
    { label: 'SQN', value: metrics.sqn.toFixed(2), sub: sqnInfo.label, color: sqnInfo.color },
    { label: 'Expectancy (R)', value: `${metrics.expectancyR.toFixed(2)}R`, sub: '', color: metrics.expectancyR >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Kelly %', value: `${metrics.kellyCriterion.toFixed(1)}%`, sub: `Half: ${metrics.halfKelly.toFixed(1)}%`, color: 'text-foreground' },
    { label: 'Max Drawdown', value: `${metrics.maxDrawdown.toFixed(2)}`, sub: `${metrics.maxDrawdownPercent.toFixed(2)}%`, color: 'text-red-400' },
    { label: 'ABLE Score', value: '—', sub: 'See below', color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {kpiCards.map((card, i) => (
          <Card key={i} className="bg-[hsl(var(--card))] border-border/30 min-w-[140px] flex-shrink-0">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
              <div className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</div>
              {card.sub && <div className="text-xs text-muted-foreground">{card.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Equity Curve */}
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ชาร์ตเส้นทุน</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.equityCurve} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4466" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#ff4466" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={(val) => new Date(val).getDate().toString()} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} orientation="right" />
                <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '8px', fontSize: '12px' }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="cumulativePnL" stroke="#00ff88" fill="url(#colorEquity)" strokeWidth={2} />
                {showRunUpDrawdown && (
                  <Area type="monotone" dataKey="drawdown" stroke="#ff4466" fill="url(#colorDrawdown)" strokeWidth={1} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 px-2 pt-2 text-xs border-t border-border/20 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={showRunUpDrawdown} onCheckedChange={(c) => setShowRunUpDrawdown(!!c)} className="h-3 w-3" />
              <span className="text-muted-foreground">Run-Up & Drawdown</span>
            </label>
          </div>
        </CardContent>
      </Card>
      
      {/* P&L Distribution + Profit Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">โครงสร้างกำไร</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-6">
              <div className="w-16 h-32 bg-muted/30 rounded relative overflow-hidden flex flex-col justify-end">
                <div className="bg-cyan-400 w-full transition-all" style={{ height: `${Math.min(100, (metrics.grossProfit / Math.max(metrics.grossProfit, 1)) * 100)}%` }} />
                <div className="bg-red-400 w-full transition-all" style={{ height: `${Math.min(10, (metrics.grossLoss / Math.max(metrics.grossProfit, 1)) * 100)}%` }} />
              </div>
              <div className="flex-1 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cyan-400 rounded" /><span className="text-muted-foreground">กำไรเบื้องต้น</span></div>
                  <span className="font-mono">{metrics.grossProfit.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded" /><span className="text-muted-foreground">ขาดทุนเบื้องต้น</span></div>
                  <span className="font-mono">{metrics.grossLoss.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/30 pt-2">
                  <span className="text-muted-foreground">กำไรสุทธิ</span>
                  <span className={`font-mono font-bold ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.netProfit.toFixed(2)} USD</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">การกระจาย P&L</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fill: '#888', fontSize: 9 }} interval={1} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#00ff88" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hour × Day Heatmap */}
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Heatmap: ชั่วโมง × วัน</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-px text-[9px]">
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-center text-muted-foreground">{h}</div>
              ))}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <>
                  <div key={`label-${day}`} className="text-muted-foreground flex items-center">{day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = heatmapData.find(c => c.day === day && c.hour === h);
                    const pnl = cell?.pnl || 0;
                    const intensity = Math.min(1, Math.abs(pnl) / maxAbsPnl);
                    const bg = pnl > 0 
                      ? `rgba(0, 255, 136, ${intensity * 0.8})`
                      : pnl < 0 
                        ? `rgba(255, 68, 102, ${intensity * 0.8})`
                        : 'rgba(255,255,255,0.02)';
                    return (
                      <div
                        key={`${day}-${h}`}
                        className="h-5 rounded-sm cursor-pointer hover:ring-1 hover:ring-terminal-green/50"
                        style={{ backgroundColor: bg }}
                        title={`${day} ${h}:00 — P&L: ${pnl.toFixed(2)} (${cell?.count || 0} trades)`}
                      />
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <CalendarView trades={trades} />
      
      {/* ABLE Score */}
      <AbleScoreRadar trades={trades} initialCapital={initialCapital} />
      
      {/* 3D */}
      <Portfolio3DVisualization trades={trades} initialCapital={initialCapital} />
    </div>
  );
}
