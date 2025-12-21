import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateMetrics, Trade, formatCurrency, formatPercent } from '@/utils/tradingMetrics';

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
  
  const rows = [
    { 
      label: 'การซื้อขายทั้งหมด', 
      all: metrics.closedTrades.toString(),
      long: longMetrics.closedTrades.toString(),
      short: shortMetrics.closedTrades.toString()
    },
    { 
      label: 'สถานะที่เปิดอยู่ทั้งหมด', 
      all: metrics.openTrades.toString(),
      long: longTrades.filter(t => t.status === 'OPEN').length.toString(),
      short: shortTrades.filter(t => t.status === 'OPEN').length.toString()
    },
    { 
      label: 'การเทรดที่ชนะ', 
      all: metrics.winningTrades.toString(),
      long: longMetrics.winningTrades.toString(),
      short: shortMetrics.winningTrades.toString()
    },
    { 
      label: 'การเทรดที่แพ้', 
      all: metrics.losingTrades.toString(),
      long: longMetrics.losingTrades.toString(),
      short: shortMetrics.losingTrades.toString()
    },
    { 
      label: 'เปอร์เซ็นต์ที่ชนะ', 
      all: `${metrics.winRate.toFixed(2)}%`,
      long: `${longMetrics.winRate.toFixed(2)}%`,
      short: `${shortMetrics.winRate.toFixed(2)}%`,
      highlight: true
    },
    { 
      label: 'P&L เฉลี่ย', 
      all: `${formatCurrency(metrics.avgTrade)}\n${formatPercent(metrics.avgTradePercent)}`,
      long: `${formatCurrency(longMetrics.avgTrade)}`,
      short: `${formatCurrency(shortMetrics.avgTrade)}`
    },
    { 
      label: 'Avg การเทรดที่ชนะ', 
      all: `${formatCurrency(metrics.avgWinningTrade)}\n${formatPercent(metrics.avgWinningTradePercent)}`,
      long: `${formatCurrency(longMetrics.avgWinningTrade)}`,
      short: `${formatCurrency(shortMetrics.avgWinningTrade)}`
    },
    { 
      label: 'Avg การเทรดที่แพ้', 
      all: `${formatCurrency(metrics.avgLosingTrade)}\n${formatPercent(metrics.avgLosingTradePercent)}`,
      long: `${formatCurrency(longMetrics.avgLosingTrade)}`,
      short: `${formatCurrency(shortMetrics.avgLosingTrade)}`
    },
    { 
      label: 'อัตราส่วน Avg ที่ชนะ / Avg ที่แพ้', 
      all: metrics.avgWinLossRatio > 0 ? metrics.avgWinLossRatio.toFixed(3) : '—',
      long: longMetrics.avgWinLossRatio > 0 ? longMetrics.avgWinLossRatio.toFixed(3) : '—',
      short: shortMetrics.avgWinLossRatio > 0 ? shortMetrics.avgWinLossRatio.toFixed(3) : '—',
      highlight: true
    },
    { 
      label: 'การเทรดที่กำไรมากสุด', 
      all: `${formatCurrency(metrics.largestWin)}\n${formatPercent(metrics.largestWinPercent)}`,
      long: `${formatCurrency(longMetrics.largestWin)}`,
      short: `${formatCurrency(shortMetrics.largestWin)}`
    },
    { 
      label: 'การเทรดที่ขาดทุนมากสุด', 
      all: `${formatCurrency(metrics.largestLoss)}\n${formatPercent(metrics.largestLossPercent)}`,
      long: `${formatCurrency(longMetrics.largestLoss)}`,
      short: `${formatCurrency(shortMetrics.largestLoss)}`
    },
    { 
      label: 'Avg Bars ในการเทรด', 
      all: metrics.avgBarsInTrade.toString() || '—',
      long: longMetrics.avgBarsInTrade.toString() || '—',
      short: shortMetrics.avgBarsInTrade.toString() || '—'
    },
  ];
  
  return (
    <Card className="border-terminal-green/20">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-terminal-green/20">
              <TableHead className="text-terminal-amber font-bold">การวิเคราะห์</TableHead>
              <TableHead className="text-terminal-amber font-bold text-right">ทั้งหมด</TableHead>
              <TableHead className="text-terminal-amber font-bold text-right">เพิ่มขึ้น (Long)</TableHead>
              <TableHead className="text-terminal-amber font-bold text-right">ลดลง (Short)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow 
                key={idx} 
                className={`border-border/10 hover:bg-accent/30 transition-colors ${row.highlight ? 'bg-terminal-amber/5' : ''}`}
              >
                <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                <TableCell className="text-right whitespace-pre-line">
                  {row.all.split('\n').map((line, i) => (
                    <div key={i} className={i === 0 ? 'font-medium' : 'text-muted-foreground text-xs'}>
                      {line}
                    </div>
                  ))}
                </TableCell>
                <TableCell className="text-right whitespace-pre-line text-emerald-400">
                  {row.long}
                </TableCell>
                <TableCell className="text-right whitespace-pre-line text-red-400">
                  {row.short}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
