import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateMetrics, Trade } from '@/utils/tradingMetrics';

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
  
  const rows = [
    { 
      label: 'Sharpe Ratio', 
      all: metrics.sharpeRatio.toFixed(3),
      long: longMetrics.closedTrades > 0 ? longMetrics.sharpeRatio.toFixed(3) : '—',
      short: shortMetrics.closedTrades > 0 ? shortMetrics.sharpeRatio.toFixed(3) : '—'
    },
    { 
      label: 'Sortino Ratio', 
      all: metrics.sortinoRatio !== null ? metrics.sortinoRatio.toFixed(3) : '—',
      long: '—',
      short: '—'
    },
    { 
      label: 'อัตราส่วนกำไรต่อขาดทุน', 
      all: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(3),
      long: longMetrics.profitFactor === Infinity ? '∞' : (longMetrics.profitFactor > 0 ? longMetrics.profitFactor.toFixed(3) : '—'),
      short: shortMetrics.profitFactor === Infinity ? '∞' : (shortMetrics.profitFactor > 0 ? shortMetrics.profitFactor.toFixed(3) : '—')
    },
    { 
      label: 'การเรียกหลักประกันเพิ่ม', 
      all: '0',
      long: '0',
      short: '0'
    },
  ];
  
  return (
    <Card className="bg-background border-border/30">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium text-xs">เมตริก</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs text-right">ทั้งหมด</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs text-right">เพิ่มขึ้น</TableHead>
              <TableHead className="text-muted-foreground font-medium text-xs text-right">ลดลง</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow 
                key={idx} 
                className="border-border/10 hover:bg-muted/20 transition-colors"
              >
                <TableCell className="font-medium text-foreground text-sm py-3">{row.label}</TableCell>
                <TableCell className="text-right py-3 font-medium text-lg">{row.all}</TableCell>
                <TableCell className="text-right py-3 text-emerald-400">{row.long}</TableCell>
                <TableCell className="text-right py-3">{row.short}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
