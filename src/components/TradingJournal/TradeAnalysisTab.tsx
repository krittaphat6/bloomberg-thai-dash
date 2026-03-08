import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateMetrics, Trade } from '@/utils/tradingMetrics';

interface TradeAnalysisTabProps {
  trades: Trade[];
  initialCapital?: number;
}

export default function TradeAnalysisTab({ trades, initialCapital = 100 }: TradeAnalysisTabProps) {
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const longTrades = trades.filter(t => t.side === 'LONG');
  const shortTrades = trades.filter(t => t.side === 'SHORT');
  const longMetrics = useMemo(() => calculateMetrics(longTrades, initialCapital), [longTrades, initialCapital]);
  const shortMetrics = useMemo(() => calculateMetrics(shortTrades, initialCapital), [shortTrades, initialCapital]);

  // Setup performance
  const setupData = useMemo(() => {
    return Object.entries(metrics.pnlBySetup).map(([setup, data]) => ({
      setup, ...data, profitFactor: 0 as number,
    })).map(s => {
      const setupTrades = trades.filter(t => t.setup === s.setup && t.status === 'CLOSED');
      const wins = setupTrades.filter(t => t.pnl! > 0);
      const losses = setupTrades.filter(t => t.pnl! < 0);
      const gp = wins.reduce((a, t) => a + t.pnl!, 0);
      const gl = Math.abs(losses.reduce((a, t) => a + t.pnl!, 0));
      const avgR = setupTrades.length > 0 
        ? setupTrades.reduce((a, t) => a + (t.rMultiple || 0), 0) / setupTrades.length : 0;
      return { ...s, profitFactor: gl > 0 ? gp / gl : gp > 0 ? 999 : 0, avgR };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [metrics, trades]);

  const rows = [
    { label: 'การซื้อขายทั้งหมด', all: metrics.closedTrades.toString(), long: longMetrics.closedTrades.toString(), short: shortMetrics.closedTrades.toString() },
    { label: 'สถานะที่เปิดอยู่', all: metrics.openTrades.toString(), long: longTrades.filter(t => t.status === 'OPEN').length.toString(), short: shortTrades.filter(t => t.status === 'OPEN').length.toString() },
    { label: 'การเทรดที่ชนะ', all: metrics.winningTrades.toString(), long: longMetrics.winningTrades.toString(), short: shortMetrics.winningTrades.toString() },
    { label: 'การเทรดที่แพ้', all: metrics.losingTrades.toString(), long: longMetrics.losingTrades.toString(), short: shortMetrics.losingTrades.toString() },
    { label: 'เปอร์เซ็นต์ที่ชนะ', all: `${metrics.winRate.toFixed(2)}%`, long: `${longMetrics.winRate.toFixed(2)}%`, short: `${shortMetrics.winRate.toFixed(2)}%` },
    { label: 'P&L เฉลี่ย', all: `${metrics.avgTrade.toFixed(2)} USD`, long: `${longMetrics.avgTrade.toFixed(2)}`, short: `${shortMetrics.avgTrade.toFixed(2)}` },
    { label: 'Avg Win', all: `${metrics.avgWinningTrade.toFixed(2)} USD`, long: `${longMetrics.avgWinningTrade.toFixed(2)}`, short: `${shortMetrics.avgWinningTrade.toFixed(2)}` },
    { label: 'Avg Loss', all: `${metrics.avgLosingTrade.toFixed(2)} USD`, long: `${longMetrics.avgLosingTrade.toFixed(2)}`, short: `${shortMetrics.avgLosingTrade.toFixed(2)}` },
    { label: 'Win/Loss Ratio', all: metrics.avgWinLossRatio > 0 ? metrics.avgWinLossRatio.toFixed(3) : '—', long: longMetrics.avgWinLossRatio > 0 ? longMetrics.avgWinLossRatio.toFixed(3) : '—', short: shortMetrics.avgWinLossRatio > 0 ? shortMetrics.avgWinLossRatio.toFixed(3) : '—' },
    { label: 'Largest Win', all: `${metrics.largestWin.toFixed(2)} USD`, long: `${longMetrics.largestWin.toFixed(2)}`, short: `${shortMetrics.largestWin.toFixed(2)}` },
    { label: 'Largest Loss', all: `${metrics.largestLoss.toFixed(2)} USD`, long: longMetrics.largestLoss > 0 ? `${longMetrics.largestLoss.toFixed(2)}` : '—', short: `${shortMetrics.largestLoss.toFixed(2)}` },
    { label: 'SQN Score', all: metrics.sqn.toFixed(2), long: '—', short: '—' },
    { label: 'Kelly Criterion', all: `${metrics.kellyCriterion.toFixed(1)}%`, long: '—', short: '—' },
    { label: 'Avg R-Multiple', all: `${metrics.avgRMultiple.toFixed(2)}R`, long: '—', short: '—' },
    { label: 'Expectancy (R)', all: `${metrics.expectancyR.toFixed(2)}R`, long: '—', short: '—' },
  ];

  return (
    <div className="space-y-4">
      {/* R-Multiple Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Avg R</div>
            <div className={`text-xl font-mono font-bold ${metrics.avgRMultiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.avgRMultiple.toFixed(2)}R</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Total R</div>
            <div className={`text-xl font-mono font-bold ${metrics.totalRMultiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.totalRMultiple.toFixed(2)}R</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Expectancy</div>
            <div className="text-xl font-mono font-bold text-foreground">{metrics.expectancyR.toFixed(2)}R</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">R Std Dev</div>
            <div className="text-xl font-mono font-bold text-foreground">{metrics.rMultipleStdDev.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
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
                  <TableCell className="text-right py-2 font-mono">{row.all}</TableCell>
                  <TableCell className="text-right py-2 text-emerald-400 font-mono">{row.long}</TableCell>
                  <TableCell className="text-right py-2 font-mono">{row.short}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Setup Performance */}
      {setupData.length > 0 && (
        <Card className="bg-[hsl(var(--card))] border-border/30">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green/60">Setup Performance</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead className="text-muted-foreground text-xs">Setup</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Trades</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Win%</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Avg R</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">P&L</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">PF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setupData.map(s => (
                  <TableRow key={s.setup} className="border-border/10">
                    <TableCell className="font-medium">{s.setup}</TableCell>
                    <TableCell className="text-right font-mono">{s.count}</TableCell>
                    <TableCell className="text-right font-mono">{s.winRate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{s.avgR.toFixed(2)}R</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.pnl.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
