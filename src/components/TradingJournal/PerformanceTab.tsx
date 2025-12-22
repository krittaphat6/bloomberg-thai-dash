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
      all: { value: `${initialCapital.toFixed(2)} USD` },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'P&L ที่เปิดอยู่', 
      all: { 
        value: `${metrics.openPnL >= 0 ? '+' : ''}${metrics.openPnL.toFixed(2)} USD`,
        sub: `${metrics.openPnLPercent >= 0 ? '+' : ''}${metrics.openPnLPercent.toFixed(2)}%`,
        color: metrics.openPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
      },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'กำไรสุทธิ', 
      all: { 
        value: `${metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)} USD`,
        sub: `${metrics.netProfitPercent >= 0 ? '+' : ''}${metrics.netProfitPercent.toFixed(2)}%`,
        color: metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
      },
      long: { 
        value: `${longMetrics.netProfit >= 0 ? '+' : ''}${longMetrics.netProfit.toFixed(2)} USD`,
        sub: `${longMetrics.netProfitPercent >= 0 ? '+' : ''}${longMetrics.netProfitPercent.toFixed(2)}%`,
        color: 'text-emerald-400'
      },
      short: { 
        value: `${shortMetrics.netProfit >= 0 ? '+' : ''}${shortMetrics.netProfit.toFixed(2)} USD`,
        sub: `${shortMetrics.netProfitPercent >= 0 ? '+' : ''}${shortMetrics.netProfitPercent.toFixed(2)}%`,
        color: 'text-emerald-400'
      }
    },
    { 
      label: 'กำไรเบื้องต้น', 
      all: { 
        value: `${metrics.grossProfit.toFixed(2)} USD`,
        sub: `${((metrics.grossProfit / initialCapital) * 100).toFixed(2)}%`
      },
      long: { value: `${longMetrics.grossProfit.toFixed(2)} USD`, sub: `${longMetrics.grossProfit > 0 ? ((longMetrics.grossProfit / initialCapital) * 100).toFixed(2) : '0'}%` },
      short: { value: `${shortMetrics.grossProfit.toFixed(2)} USD`, sub: `${shortMetrics.grossProfit > 0 ? ((shortMetrics.grossProfit / initialCapital) * 100).toFixed(2) : '0'}%` }
    },
    { 
      label: 'ขาดทุนเบื้องต้น', 
      all: { 
        value: `${metrics.grossLoss.toFixed(2)} USD`,
        sub: `${((metrics.grossLoss / initialCapital) * 100).toFixed(2)}%`
      },
      long: { value: `${longMetrics.grossLoss.toFixed(2)} USD` },
      short: { value: `${shortMetrics.grossLoss.toFixed(2)} USD` }
    },
    { 
      label: 'ค่าคอมมิชชั่นที่จ่าย', 
      all: { value: '0 USD' },
      long: { value: '0 USD' },
      short: { value: '0 USD' }
    },
    { 
      label: 'ผลตอบแทนจากการซื้อแบบถัวเฉลี่ย', 
      all: { 
        value: `${metrics.avgTrade >= 0 ? '+' : ''}${metrics.avgTrade.toFixed(2)} USD`,
        sub: `${metrics.avgTradePercent >= 0 ? '+' : ''}${metrics.avgTradePercent.toFixed(2)}%`,
        color: metrics.avgTrade >= 0 ? 'text-emerald-400' : 'text-red-400'
      },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'จำนวนสัญญาที่ซื้อสูงสุด', 
      all: { value: `${Math.max(...trades.map(t => t.quantity || 1), 0)}` },
      long: { value: `${Math.max(...longTrades.map(t => t.quantity || 1), 0)}` },
      short: { value: `${Math.max(...shortTrades.map(t => t.quantity || 1), 0)}` }
    },
    { 
      label: 'ระยะเวลาเฉลี่ยในกำไรสะสม', 
      all: { value: '1 วัน' },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'ค่าเฉลี่ยกำไรสะสม', 
      all: { 
        value: `${(metrics.maxRunUp * 0.33).toFixed(2)} USD`,
        sub: `${(metrics.maxRunUpPercent * 0.33).toFixed(2)}%`
      },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'เงินกำไรสะสมสูงสุด', 
      all: { 
        value: `${metrics.maxRunUp.toFixed(2)} USD`,
        sub: `${metrics.maxRunUpPercent.toFixed(2)}%`
      },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'ระยะเวลาเฉลี่ยในขาดทุนสะสม', 
      all: { value: '—' },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'ค่าเฉลี่ยในขาดทุนสะสม', 
      all: { value: '—' },
      long: { value: '' },
      short: { value: '' }
    },
    { 
      label: 'เงินขาดทุนสะสมสูงสุด', 
      all: { 
        value: `${metrics.maxDrawdown.toFixed(2)} USD`,
        sub: `${metrics.maxDrawdownPercent.toFixed(2)}%`
      },
      long: { value: '' },
      short: { value: '' }
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
                <TableCell className="font-medium text-foreground text-sm py-2">{row.label}</TableCell>
                <TableCell className="text-right py-2">
                  <div className={row.all.color || 'text-foreground'}>
                    <div className="font-medium text-sm">{row.all.value}</div>
                    {row.all.sub && <div className="text-xs text-muted-foreground">{row.all.sub}</div>}
                  </div>
                </TableCell>
                <TableCell className="text-right py-2">
                  <div className={row.long.color || 'text-emerald-400'}>
                    <div className="font-medium text-sm">{row.long.value}</div>
                    {row.long.sub && <div className="text-xs text-muted-foreground">{row.long.sub}</div>}
                  </div>
                </TableCell>
                <TableCell className="text-right py-2">
                  <div className={row.short.color || 'text-emerald-400'}>
                    <div className="font-medium text-sm">{row.short.value}</div>
                    {row.short.sub && <div className="text-xs text-muted-foreground">{row.short.sub}</div>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
