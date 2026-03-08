import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trade, calculateMetrics, detectPsychologyPatterns, calculateCostOfEmotions } from '@/utils/tradingMetrics';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface PsychologyTabProps {
  trades: Trade[];
  initialCapital?: number;
}

const EMOTION_ICONS: Record<string, string> = {
  confident: '💪', fearful: '😰', greedy: '🤑', revenge: '😤', fomo: '😮',
  calm: '🎯', anxious: '😥', euphoric: '🎉', bored: '😑', frustrated: '😤'
};

export default function PsychologyTab({ trades, initialCapital = 100 }: PsychologyTabProps) {
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const alerts = useMemo(() => detectPsychologyPatterns(trades), [trades]);
  const costOfEmotions = useMemo(() => calculateCostOfEmotions(trades), [trades]);
  const closed = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades]);

  // Tiltmeter score
  const tiltScore = useMemo(() => {
    if (metrics.disciplineScore > 0) return metrics.disciplineScore;
    if (metrics.followedPlanRate > 0) return metrics.followedPlanRate;
    return 50;
  }, [metrics]);

  const tiltColor = tiltScore >= 70 ? '#00ff88' : tiltScore >= 40 ? '#ffaa00' : '#ff4466';

  // Quality trend data
  const qualityTrend = useMemo(() => {
    const withQuality = closed.filter(t => t.entryQuality || t.exitQuality || t.managementQuality);
    if (withQuality.length < 2) return [];
    return withQuality.map((t, i) => ({
      trade: i + 1,
      entry: t.entryQuality || 0,
      exit: t.exitQuality || 0,
      management: t.managementQuality || 0,
    }));
  }, [closed]);

  // Plan adherence
  const planData = useMemo(() => {
    const planned = closed.filter(t => t.followedPlan !== undefined);
    const followed = planned.filter(t => t.followedPlan);
    const broke = planned.filter(t => !t.followedPlan);
    return {
      followedCount: followed.length,
      brokeCount: broke.length,
      followedPnL: followed.reduce((s, t) => s + (t.pnl || 0), 0),
      brokePnL: broke.reduce((s, t) => s + (t.pnl || 0), 0),
      rate: planned.length > 0 ? (followed.length / planned.length) * 100 : 0,
      pieData: planned.length > 0 ? [
        { name: 'ทำตามแผน', value: followed.length },
        { name: 'ไม่ทำตามแผน', value: broke.length },
      ] : []
    };
  }, [closed]);

  // Emotion scatter
  const emotionScatter = useMemo(() => {
    return closed
      .filter(t => t.emotionScore !== undefined && t.pnl !== undefined)
      .map(t => ({ x: t.emotionScore!, y: t.pnl!, win: t.pnl! > 0 }));
  }, [closed]);

  // Emotion cost table
  const emotionTable = useMemo(() => {
    const emotionGroups: Record<string, { count: number; totalPnl: number; }> = {};
    closed.filter(t => t.emotion).forEach(t => {
      if (!emotionGroups[t.emotion!]) emotionGroups[t.emotion!] = { count: 0, totalPnl: 0 };
      emotionGroups[t.emotion!].count++;
      emotionGroups[t.emotion!].totalPnl += t.pnl || 0;
    });
    return Object.entries(emotionGroups).map(([emotion, data]) => ({
      emotion,
      icon: EMOTION_ICONS[emotion] || '❓',
      count: data.count,
      avgPnl: data.count > 0 ? data.totalPnl / data.count : 0,
      totalImpact: data.totalPnl,
      percentage: closed.length > 0 ? (data.count / closed.length) * 100 : 0,
    })).sort((a, b) => a.totalImpact - b.totalImpact);
  }, [closed]);

  const hasEnoughData = closed.length >= 5;

  if (!hasEnoughData) {
    return (
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">ต้องการข้อมูลเพิ่มเติม</h3>
          <p className="text-muted-foreground text-sm">
            เพิ่มเทรดอย่างน้อย 5 รายการพร้อมข้อมูลจิตวิทยาเพื่อปลดล็อคส่วนนี้
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1: TILTMETER */}
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
            TILTMETER — ระดับวินัยการเทรดโดยรวม
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <svg width="200" height="120" viewBox="0 0 200 120">
              <defs>
                <linearGradient id="tiltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff4466" />
                  <stop offset="50%" stopColor="#ffaa00" />
                  <stop offset="100%" stopColor="#00ff88" />
                </linearGradient>
              </defs>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--border))" strokeWidth="12" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#tiltGrad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(tiltScore / 100) * 251.3} 251.3`} />
              <text x="100" y="80" textAnchor="middle" fill={tiltColor} fontSize="32" fontWeight="bold" fontFamily="monospace">
                {tiltScore.toFixed(0)}
              </text>
              <text x="100" y="100" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
                / 100
              </text>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Cost of Emotions */}
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
            ต้นทุนของอารมณ์
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emotionTable.length > 0 ? (
            <>
              {/* Top 3 emotion impact cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {emotionTable.slice(0, 3).map(e => (
                  <div key={e.emotion} className="bg-background/50 border border-border/30 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">{e.icon}</div>
                    <div className="text-xs text-muted-foreground capitalize">{e.emotion}</div>
                    <div className={`text-lg font-mono font-bold ${e.totalImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {e.totalImpact >= 0 ? '+' : ''}{e.totalImpact.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">{e.count} trades</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 text-muted-foreground">อารมณ์</th>
                      <th className="text-right py-2 text-muted-foreground">Trades</th>
                      <th className="text-right py-2 text-muted-foreground">Avg P&L</th>
                      <th className="text-right py-2 text-muted-foreground">Total Impact</th>
                      <th className="text-right py-2 text-muted-foreground">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emotionTable.map(e => (
                      <tr key={e.emotion} className="border-b border-border/10">
                        <td className="py-2">{e.icon} {e.emotion}</td>
                        <td className="text-right font-mono">{e.count}</td>
                        <td className={`text-right font-mono ${e.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {e.avgPnl.toFixed(2)}
                        </td>
                        <td className={`text-right font-mono font-bold ${e.totalImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {e.totalImpact.toFixed(2)}
                        </td>
                        <td className="text-right font-mono">{e.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">เพิ่มข้อมูลอารมณ์ในเทรดเพื่อดูการวิเคราะห์</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Psychology Pattern Detection */}
      <Card className="bg-[hsl(var(--card))] border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
            การตรวจจับรูปแบบจิตวิทยา
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-background/50 border border-border/30 rounded-lg">
                  <Badge variant="outline" className={
                    alert.severity === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{alert.message}</div>
                    <div className={`text-xs font-mono mt-1 ${alert.dollarImpact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Impact: {alert.dollarImpact >= 0 ? '+' : ''}{alert.dollarImpact.toFixed(2)} USD
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.tradeIds.length} trade(s) affected
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-emerald-400 text-sm text-center py-4">✅ ไม่พบรูปแบบจิตวิทยาที่เป็นปัญหา</p>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Quality Score Trend */}
      {qualityTrend.length > 1 && (
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
              แนวโน้มคะแนนคุณภาพ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="trade" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="entry" stroke="#00aaff" strokeWidth={2} dot={false} name="Entry Quality" />
                  <Line type="monotone" dataKey="exit" stroke="#00ff88" strokeWidth={2} dot={false} name="Exit Quality" />
                  <Line type="monotone" dataKey="management" stroke="#ffaa00" strokeWidth={2} dot={false} name="Management" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Plan Adherence */}
      {planData.pieData.length > 0 && (
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
              การทำตามแผน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planData.pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4}>
                      <Cell fill="#00ff88" />
                      <Cell fill="#ff4466" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">ทำตามแผน ({planData.followedCount})</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">
                    {planData.followedPnL >= 0 ? '+' : ''}{planData.followedPnL.toFixed(2)} USD
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">ไม่ทำตามแผน ({planData.brokeCount})</div>
                  <div className="text-lg font-mono font-bold text-red-400">
                    {planData.brokePnL >= 0 ? '+' : ''}{planData.brokePnL.toFixed(2)} USD
                  </div>
                </div>
                {planData.brokePnL < 0 && (
                  <div className="text-xs text-red-400 font-medium">
                    ต้นทุนของการไม่ทำตามแผน: {Math.abs(planData.brokePnL).toFixed(2)} USD
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 6: Emotion Performance Matrix */}
      {emotionScatter.length > 2 && (
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">
              Emotion × P&L Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="x" name="Emotion Score" domain={[0, 10]} tick={{ fill: '#888', fontSize: 10 }} label={{ value: 'Emotion Score', fill: '#888', fontSize: 10, position: 'bottom' }} />
                  <YAxis dataKey="y" name="P&L" tick={{ fill: '#888', fontSize: 10 }} />
                  <ZAxis range={[30, 30]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  <Scatter data={emotionScatter.filter(d => d.win)} fill="#00ff88" />
                  <Scatter data={emotionScatter.filter(d => !d.win)} fill="#ff4466" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
