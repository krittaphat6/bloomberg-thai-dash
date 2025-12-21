import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, BarChart3 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { calculateMetrics, calculatePnLDistribution, Trade, formatCurrency, formatPercent } from '@/utils/tradingMetrics';
import { useState } from 'react';

interface OverviewTabProps {
  trades: Trade[];
  initialCapital?: number;
}

export default function OverviewTab({ trades, initialCapital = 100 }: OverviewTabProps) {
  const [showRunUpDrawdown, setShowRunUpDrawdown] = useState(false);
  
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const pnlDistribution = useMemo(() => calculatePnLDistribution(trades, 0.2), [trades]);
  
  return (
    <div className="space-y-4">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* P&L ทั้งหมด */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              P&L ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(metrics.netProfit)}
            </div>
            <div className={`text-xs ${metrics.netProfitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(metrics.netProfitPercent)}
            </div>
          </CardContent>
        </Card>
        
        {/* เงินขาดทุนสะสมสูงสุด */}
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              เงินขาดทุนสะสมสูงสุด
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-red-400">
              {metrics.maxDrawdown.toFixed(2)} USD
            </div>
            <div className="text-xs text-red-400">
              {metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        
        {/* การซื้อขายทั้งหมด */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              การซื้อขายทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-blue-400">
              {metrics.closedTrades}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.openTrades} เปิดอยู่
            </div>
          </CardContent>
        </Card>
        
        {/* การซื้อขายที่มีกำไร */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              การซื้อขายที่มีกำไร
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-amber-400">
              {metrics.winRate.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">
              ({metrics.winningTrades}/{metrics.closedTrades})
            </div>
          </CardContent>
        </Card>
        
        {/* อัตราส่วนกำไรต่อขาดทุน */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              อัตราส่วนกำไร/ขาดทุน
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-xl font-bold text-purple-400">
              {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground">
              Profit Factor
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Equity Curve Chart */}
      <Card className="border-terminal-green/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-terminal-green flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              กราฟเส้นทุน (Equity Curve)
            </CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={showRunUpDrawdown}
                  onCheckedChange={(checked) => setShowRunUpDrawdown(!!checked)}
                />
                <span className="text-muted-foreground">Run-Up & Drawdown</span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.equityCurve}>
                <defs>
                  <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#888', fontSize: 10 }}
                  tickFormatter={(val) => new Date(val).getDate().toString()}
                />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(val) => `Date: ${val}`}
                  formatter={(value: number, name: string) => [
                    `${value >= 0 ? '+' : ''}${value.toFixed(2)} USD`,
                    name === 'cumulativePnL' ? 'Cumulative P&L' : 
                    name === 'drawdown' ? 'Drawdown' : name
                  ]}
                />
                <ReferenceLine y={0} stroke="#666" />
                <Area 
                  type="monotone" 
                  dataKey="cumulativePnL" 
                  stroke="#10b981" 
                  fill="url(#colorPnL)"
                  strokeWidth={2}
                />
                {showRunUpDrawdown && (
                  <Area 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="#ef4444" 
                    fill="url(#colorDrawdown)"
                    strokeWidth={1}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* โครงสร้างกำไร */}
        <Card className="border-terminal-green/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-terminal-green">โครงสร้างกำไร</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="relative h-6 bg-muted/30 rounded overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-emerald-500/50"
                  style={{ 
                    width: `${metrics.grossProfit > 0 ? (metrics.grossProfit / (metrics.grossProfit + metrics.grossLoss)) * 100 : 0}%` 
                  }}
                />
                <div 
                  className="absolute inset-y-0 right-0 bg-red-500/50"
                  style={{ 
                    width: `${metrics.grossLoss > 0 ? (metrics.grossLoss / (metrics.grossProfit + metrics.grossLoss)) * 100 : 0}%` 
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">กำไรเบื้องต้น</div>
                  <div className="text-emerald-400 font-medium">{formatCurrency(metrics.grossProfit)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">ขาดทุนเบื้องต้น</div>
                  <div className="text-red-400 font-medium">{formatCurrency(metrics.grossLoss)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">กำไรสุทธิ</div>
                  <div className={`font-medium ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(metrics.netProfit)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* การกระจาย P&L */}
        <Card className="border-terminal-green/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-terminal-green">การกระจาย P&L ของการซื้อขาย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fill: '#888', fontSize: 9 }}
                    interval={1}
                  />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#10b981"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
