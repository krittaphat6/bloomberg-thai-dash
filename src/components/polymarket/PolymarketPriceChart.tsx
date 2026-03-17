import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PriceHistoryPoint } from '@/services/PolymarketService';

interface Props {
  data: PriceHistoryPoint[];
}

export const PolymarketPriceChart = ({ data }: Props) => {
  if (!data || data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-[10px] text-muted-foreground">No price history available</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-muted-foreground">30d ago</span>
        <span className="text-[9px] text-muted-foreground">Now</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="polyProbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--terminal-green))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--terminal-green))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 9, fill: '#6b7280' }}
            tickFormatter={t => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            interval="preserveStartEnd"
            axisLine={{ stroke: '#1e293b' }}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 9, fill: '#6b7280' }}
            tickFormatter={v => `${Math.round(v * 100)}%`}
            width={35}
            axisLine={{ stroke: '#1e293b' }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1e293b', fontSize: 10, borderRadius: 4 }}
            labelFormatter={t => new Date(Number(t) * 1000).toLocaleDateString()}
            formatter={(v: number) => [`${Math.round(v * 100)}%`, 'Probability']}
          />
          <Area type="monotone" dataKey="p" stroke="#22c55e" fill="url(#polyProbGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
