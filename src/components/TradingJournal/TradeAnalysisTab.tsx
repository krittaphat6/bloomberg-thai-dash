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
      all: `${metrics.avgTrade.toFixed(2)} USD`,
      allSub: `${metrics.avgTradePercent.toFixed(2)}%`,
      long: `${longMetrics.avgTrade.toFixed(2)} USD`,
      longSub: `${longMetrics.avgTradePercent.toFixed(2)}%`,
      short: `${shortMetrics.avgTrade.toFixed(2)} USD`,
      shortSub: `${shortMetrics.avgTradePercent.toFixed(2)}%`
    },
    { 
      label: 'Avg การเทรดที่ชนะ', 
      all: `${metrics.avgWinningTrade.toFixed(2)} USD`,
      allSub: `${metrics.avgWinningTradePercent.toFixed(2)}%`,
      long: `${longMetrics.avgWinningTrade.toFixed(2)} USD`,
      longSub: `${longMetrics.avgWinningTradePercent.toFixed(2)}%`,
      short: `${shortMetrics.avgWinningTrade.toFixed(2)} USD`,
      shortSub: `${shortMetrics.avgWinningTradePercent.toFixed(2)}%`
    },
    { 
      label: 'Avg การเทรดที่แพ้', 
      all: `${metrics.avgLosingTrade.toFixed(2)} USD`,
      allSub: `${metrics.avgLosingTradePercent.toFixed(2)}%`,
      long: longMetrics.avgLosingTrade > 0 ? `${longMetrics.avgLosingTrade.toFixed(2)} USD` : '—',
      short: `${shortMetrics.avgLosingTrade.toFixed(2)} USD`,
      shortSub: `${shortMetrics.avgLosingTradePercent.toFixed(2)}%`
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
      all: `${metrics.largestWin.toFixed(2)} USD`,
      long: `${longMetrics.largestWin.toFixed(2)} USD`,
      short: `${shortMetrics.largestWin.toFixed(2)} USD`
    },
    { 
      label: 'เปอร์เซ็นต์การเทรดที่กำไรมากสุด', 
      all: `${metrics.largestWinPercent.toFixed(2)}%`,
      long: `${longMetrics.largestWinPercent.toFixed(2)}%`,
      short: `${shortMetrics.largestWinPercent.toFixed(2)}%`
    },
    { 
      label: 'การเทรดที่ขาดทุนมากสุด', 
      all: `${metrics.largestLoss.toFixed(2)} USD`,
      long: longMetrics.largestLoss > 0 ? `${longMetrics.largestLoss.toFixed(2)} USD` : '—',
      short: `${shortMetrics.largestLoss.toFixed(2)} USD`
    },
    { 
      label: 'เปอร์เซ็นต์การเทรดที่ขาดทุนมากสุด', 
      all: `${metrics.largestLossPercent.toFixed(2)}%`,
      long: longMetrics.largestLossPercent > 0 ? `${longMetrics.largestLossPercent.toFixed(2)}%` : '—',
      short: `${shortMetrics.largestLossPercent.toFixed(2)}%`
    },
    { 
      label: 'Avg # bar ในการเทรด', 
      all: '214',
      long: '281',
      short: '178'
    },
    { 
      label: 'Avg # bar ในการเทรดที่ชนะ', 
      all: '230',
      long: '281',
      short: '194'
    },
    { 
      label: 'Avg # bar ในการเทรดที่แพ้', 
      all: '120',
      long: '0',
      short: '120'
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
                className={`border-border/10 hover:bg-muted/20 transition-colors`}
              >
                <TableCell className="font-medium text-foreground text-sm py-2">{row.label}</TableCell>
                <TableCell className="text-right py-2">
                  <div className="font-medium text-sm">{row.all}</div>
                  {row.allSub && <div className="text-xs text-muted-foreground">{row.allSub}</div>}
                </TableCell>
                <TableCell className="text-right py-2 text-emerald-400">
                  <div className="font-medium text-sm">{row.long}</div>
                  {row.longSub && <div className="text-xs text-emerald-400/70">{row.longSub}</div>}
                </TableCell>
                <TableCell className="text-right py-2">
                  <div className="font-medium text-sm">{row.short}</div>
                  {row.shortSub && <div className="text-xs text-muted-foreground">{row.shortSub}</div>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
