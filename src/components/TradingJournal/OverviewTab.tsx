import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp, TrendingDown, Activity, Target, BarChart3 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, ReferenceLine, Legend
} from 'recharts';
import { calculateMetrics, calculatePnLDistribution, Trade, formatCurrency, formatPercent } from '@/utils/tradingMetrics';

interface OverviewTabProps {
  trades: Trade[];
  initialCapital?: number;
}

export default function OverviewTab({ trades, initialCapital = 100 }: OverviewTabProps) {
  const [showRunUpDrawdown, setShowRunUpDrawdown] = useState(true);
  
  const metrics = useMemo(() => calculateMetrics(trades, initialCapital), [trades, initialCapital]);
  const pnlDistribution = useMemo(() => calculatePnLDistribution(trades, 0.1), [trades]);
  
  return (
    <div className="space-y-4">
      {/* Top Stats Cards - Dark theme matching reference */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {/* P&L ทั้งหมด */}
        <Card className="bg-background border-border/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              P&L ทั้งหมด <span className="text-muted-foreground/50">ⓘ</span>
            </div>
            <div className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.netProfit >= 0 ? '+' : ''}{metrics.netProfit.toFixed(2)} <span className="text-sm font-normal">USD</span>
            </div>
            <div className={`text-sm ${metrics.netProfitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.netProfitPercent >= 0 ? '+' : ''}{metrics.netProfitPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        
        {/* เงินขาดทุนสะสมสูงสุด */}
        <Card className="bg-background border-border/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              เงินขาดทุนสะสมสูงสุด <span className="text-muted-foreground/50">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {metrics.maxDrawdown.toFixed(2)} <span className="text-sm font-normal">USD</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        
        {/* การซื้อขายทั้งหมด */}
        <Card className="bg-background border-border/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              การซื้อขายทั้งหมด <span className="text-muted-foreground/50">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {metrics.closedTrades}
            </div>
          </CardContent>
        </Card>
        
        {/* การซื้อขายที่มีกำไร */}
        <Card className="bg-background border-border/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              การซื้อขายที่มีกำไร <span className="text-muted-foreground/50">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {metrics.winRate.toFixed(2)}% <span className="text-sm font-normal text-muted-foreground">{metrics.winningTrades}/{metrics.closedTrades}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* อัตราส่วนกำไรต่อขาดทุน */}
        <Card className="bg-background border-border/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              อัตราส่วนกำไรต่อขาดทุน <span className="text-muted-foreground/50">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(3)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Equity Curve Chart - ชาร์ตเส้นทุน */}
      <Card className="bg-background border-border/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-muted-foreground">ชาร์ตเส้นทุน</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.equityCurve} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#888', fontSize: 10 }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}`;
                  }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  tick={{ fill: '#888', fontSize: 10 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  orientation="right"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(val) => `Date: ${val}`}
                  formatter={(value: number, name: string) => [
                    `${value >= 0 ? '+' : ''}${value.toFixed(2)}`,
                    name === 'cumulativePnL' ? 'P&L สะสม' : 
                    name === 'drawdown' ? 'Drawdown' : name
                  ]}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                
                {/* Main equity line */}
                <Area 
                  type="monotone" 
                  dataKey="cumulativePnL" 
                  stroke="#10b981" 
                  fill="url(#colorEquity)"
                  strokeWidth={2}
                  name="cumulativePnL"
                />
                
                {/* Drawdown area (shown below zero line) */}
                {showRunUpDrawdown && (
                  <Area 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="#ef4444" 
                    fill="url(#colorDrawdown)"
                    strokeWidth={1}
                    name="drawdown"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Controls */}
          <div className="flex items-center gap-6 px-2 pt-2 text-xs border-t border-border/20 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={true}
                className="h-3 w-3"
              />
              <span className="text-muted-foreground">ซื้อ & ขาย</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox 
                checked={showRunUpDrawdown}
                onCheckedChange={(checked) => setShowRunUpDrawdown(!!checked)}
                className="h-3 w-3"
              />
              <span className="text-muted-foreground">Run-Up & Drawdown ในการเทรด</span>
            </label>
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom Row - โครงสร้างกำไร and การกระจาย P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* โครงสร้างกำไร */}
        <Card className="bg-background border-border/30">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-muted-foreground">โครงสร้างกำไร</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-6">
              {/* Profit Bar */}
              <div className="w-16 h-32 bg-muted/30 rounded relative overflow-hidden flex flex-col justify-end">
                <div 
                  className="bg-cyan-400 w-full transition-all"
                  style={{ 
                    height: `${Math.min(100, (metrics.grossProfit / Math.max(metrics.grossProfit, 1)) * 100)}%` 
                  }}
                />
                <div 
                  className="bg-red-400 w-full transition-all"
                  style={{ 
                    height: `${Math.min(10, (metrics.grossLoss / Math.max(metrics.grossProfit, 1)) * 100)}%` 
                  }}
                />
              </div>
              
              {/* Legend */}
              <div className="flex-1 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-400 rounded" />
                    <span className="text-muted-foreground">กำไรเบื้องต้น</span>
                  </div>
                  <span className="font-medium">{metrics.grossProfit.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded" />
                    <span className="text-muted-foreground">ขาดทุนเบื้องต้น</span>
                  </div>
                  <span className="font-medium">{metrics.grossLoss.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/30 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    <span className="text-muted-foreground">กำไรสุทธิ</span>
                  </div>
                  <span className={`font-medium ${metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {metrics.netProfit.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* การกระจาย P&L ของการซื้อขาย */}
        <Card className="bg-background border-border/30">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-muted-foreground">การกระจาย P&L ของการซื้อขาย</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlDistribution} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fill: '#888', fontSize: 9 }}
                    interval={1}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis 
                    tick={{ fill: '#888', fontSize: 10 }} 
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px'
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
            
            {/* Distribution Legend */}
            <div className="flex items-center justify-center gap-6 text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-muted-foreground">ขาดทุน</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-muted-foreground">กำไร</span>
              </div>
              <span className="text-muted-foreground">--- ขาดทุนเฉลี่ย <span className="text-red-400">-0.02%</span></span>
              <span className="text-muted-foreground">--- กำไรเฉลี่ย <span className="text-emerald-400">0.44%</span></span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
