import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateMetrics, Trade } from '@/utils/tradingMetrics';
import { Shield, TrendingUp, AlertTriangle, BarChart } from 'lucide-react';

interface RiskRewardTabProps {
  trades: Trade[];
  initialCapital?: number;
}

export default function RiskRewardTab({ trades, initialCapital = 100 }: RiskRewardTabProps) {
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  
  const longTrades = trades.filter(t => t.side === 'LONG');
  const shortTrades = trades.filter(t => t.side === 'SHORT');
  
  const longMetrics = useMemo(() => calculateMetrics(longTrades, initialCapital), [longTrades, initialCapital]);
  const shortMetrics = useMemo(() => calculateMetrics(shortTrades, initialCapital), [shortTrades, initialCapital]);
  
  const ratioRows = [
    { 
      label: 'Sharpe Ratio', 
      all: metrics.sharpeRatio.toFixed(3),
      long: longMetrics.sharpeRatio.toFixed(3),
      short: shortMetrics.sharpeRatio.toFixed(3),
      description: 'Risk-adjusted return (higher is better)',
      icon: <TrendingUp className="h-4 w-4 text-emerald-400" />
    },
    { 
      label: 'Sortino Ratio', 
      all: metrics.sortinoRatio !== null ? metrics.sortinoRatio.toFixed(3) : '—',
      long: longMetrics.sortinoRatio !== null ? longMetrics.sortinoRatio.toFixed(3) : '—',
      short: shortMetrics.sortinoRatio !== null ? shortMetrics.sortinoRatio.toFixed(3) : '—',
      description: 'Downside risk-adjusted return',
      icon: <Shield className="h-4 w-4 text-blue-400" />
    },
    { 
      label: 'อัตราส่วนกำไรต่อขาดทุน (Profit Factor)', 
      all: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(3),
      long: longMetrics.profitFactor === Infinity ? '∞' : longMetrics.profitFactor.toFixed(3),
      short: shortMetrics.profitFactor === Infinity ? '∞' : shortMetrics.profitFactor.toFixed(3),
      description: 'Gross Profit / Gross Loss',
      icon: <BarChart className="h-4 w-4 text-purple-400" />
    },
    { 
      label: 'การเรียกหลักประกันเพิ่ม (Margin Calls)', 
      all: '0',
      long: '0',
      short: '0',
      description: 'Number of margin calls',
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />
    },
  ];
  
  // Risk assessment based on metrics
  const riskLevel = useMemo(() => {
    if (metrics.maxDrawdownPercent > 30) return { level: 'HIGH', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (metrics.maxDrawdownPercent > 15) return { level: 'MEDIUM', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { level: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  }, [metrics]);
  
  return (
    <div className="space-y-4">
      {/* Risk Level Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={`${riskLevel.bg} border-${riskLevel.color.replace('text-', '')}/30`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">ระดับความเสี่ยง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskLevel.color}`}>
              {riskLevel.level}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Max Drawdown: {metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Risk/Reward Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {metrics.avgWinLossRatio > 0 ? `1:${metrics.avgWinLossRatio.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg Win vs Avg Loss
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Expectancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.avgTrade >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.avgTrade >= 0 ? '+' : ''}{metrics.avgTrade.toFixed(2)} USD
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Average profit per trade
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Ratios Table */}
      <Card className="border-terminal-green/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-terminal-green/20">
                <TableHead className="text-terminal-amber font-bold">อัตราส่วน</TableHead>
                <TableHead className="text-terminal-amber font-bold text-right">ทั้งหมด</TableHead>
                <TableHead className="text-terminal-amber font-bold text-right">เพิ่มขึ้น (Long)</TableHead>
                <TableHead className="text-terminal-amber font-bold text-right">ลดลง (Short)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratioRows.map((row, idx) => (
                <TableRow 
                  key={idx} 
                  className="border-border/10 hover:bg-accent/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <div>
                        <div className="font-medium text-foreground">{row.label}</div>
                        <div className="text-xs text-muted-foreground">{row.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">{row.all}</TableCell>
                  <TableCell className="text-right text-emerald-400">{row.long}</TableCell>
                  <TableCell className="text-right text-red-400">{row.short}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
