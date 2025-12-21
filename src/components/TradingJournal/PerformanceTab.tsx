import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateMetrics, Trade, formatCurrency, formatPercent } from '@/utils/tradingMetrics';

interface PerformanceTabProps {
  trades: Trade[];
  initialCapital?: number;
}

export default function PerformanceTab({ trades, initialCapital = 100 }: PerformanceTabProps) {
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  
  const longTrades = trades.filter(t => t.status === 'CLOSED' && t.side === 'LONG');
  const shortTrades = trades.filter(t => t.status === 'CLOSED' && t.side === 'SHORT');
  
  const longMetrics = useMemo(() => calculateMetrics(longTrades, initialCapital), [longTrades, initialCapital]);
  const shortMetrics = useMemo(() => calculateMetrics(shortTrades, initialCapital), [shortTrades, initialCapital]);
  
  const rows = [
    { 
      label: 'เงินทุนเริ่มต้น', 
      all: `${initialCapital.toFixed(2)} USD`,
      long: '—',
      short: '—'
    },
    { 
      label: 'P&L ที่เปิดอยู่', 
      all: `${formatCurrency(metrics.openPnL)}\n${formatPercent(metrics.openPnLPercent)}`,
      long: '—',
      short: '—'
    },
    { 
      label: 'กำไรสุทธิ', 
      all: `${formatCurrency(metrics.netProfit)}\n${formatPercent(metrics.netProfitPercent)}`,
      long: `${formatCurrency(longMetrics.netProfit)}\n${formatPercent(longMetrics.netProfitPercent)}`,
      short: `${formatCurrency(shortMetrics.netProfit)}\n${formatPercent(shortMetrics.netProfitPercent)}`
    },
    { 
      label: 'กำไรเบื้องต้น', 
      all: `${formatCurrency(metrics.grossProfit)}\n${formatPercent((metrics.grossProfit / initialCapital) * 100)}`,
      long: `${formatCurrency(longMetrics.grossProfit)}`,
      short: `${formatCurrency(shortMetrics.grossProfit)}`
    },
    { 
      label: 'ขาดทุนเบื้องต้น', 
      all: `${formatCurrency(metrics.grossLoss)}\n${formatPercent((metrics.grossLoss / initialCapital) * 100)}`,
      long: `${formatCurrency(longMetrics.grossLoss)}`,
      short: `${formatCurrency(shortMetrics.grossLoss)}`
    },
    { 
      label: 'ค่าคอมมิชชั่นที่จ่าย', 
      all: '0 USD',
      long: '0 USD',
      short: '0 USD'
    },
    { 
      label: 'ผลตอบแทนจากการซื้อแบบถัวเฉลี่ย', 
      all: `${formatCurrency(metrics.avgTrade)}\n${formatPercent(metrics.avgTradePercent)}`,
      long: `${formatCurrency(longMetrics.avgTrade)}`,
      short: `${formatCurrency(shortMetrics.avgTrade)}`
    },
    { 
      label: 'จำนวนสัญญาที่ซื้อสูงสุด', 
      all: `${Math.max(...trades.map(t => t.quantity || 1))}`,
      long: `${Math.max(...longTrades.map(t => t.quantity || 1), 0)}`,
      short: `${Math.max(...shortTrades.map(t => t.quantity || 1), 0)}`
    },
    { 
      label: 'เงินกำไรสะสมสูงสุด (Run-Up)', 
      all: `${metrics.maxRunUp.toFixed(2)} USD\n${formatPercent(metrics.maxRunUpPercent)}`,
      long: `${longMetrics.maxRunUp.toFixed(2)} USD`,
      short: `${shortMetrics.maxRunUp.toFixed(2)} USD`
    },
    { 
      label: 'เงินขาดทุนสะสมสูงสุด (Drawdown)', 
      all: `${metrics.maxDrawdown.toFixed(2)} USD\n${formatPercent(metrics.maxDrawdownPercent)}`,
      long: `${longMetrics.maxDrawdown.toFixed(2)} USD`,
      short: `${shortMetrics.maxDrawdown.toFixed(2)} USD`
    },
  ];
  
  return (
    <Card className="border-terminal-green/20">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-terminal-green/20">
              <TableHead className="text-terminal-amber font-bold">เมตริก</TableHead>
              <TableHead className="text-terminal-amber font-bold text-right">ทั้งหมด</TableHead>
              <TableHead className="text-terminal-amber font-bold text-right">เพิ่มขึ้น (Long)</TableHead>
              <TableHead className="text-terminal-amber font-bold text-right">ลดลง (Short)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow 
                key={idx} 
                className="border-border/10 hover:bg-accent/30 transition-colors"
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
