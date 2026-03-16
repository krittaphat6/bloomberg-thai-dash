import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PriceHistoryPoint } from '@/services/PolymarketService';

interface Props {
  data: PriceHistoryPoint[];
}

export const PolymarketPriceChart = ({ data }: Props) => {
  if (!data || data.length === 0) {
    return <div className="h-[180px] flex items-center justify-center text-[10px] text-muted-foreground">No price history available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="polyProbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={t => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `${Math.round(v * 100)}%`}
          width={35}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10 }}
          labelFormatter={t => new Date(Number(t) * 1000).toLocaleDateString()}
          formatter={(v: number) => [`${Math.round(v * 100)}%`, 'Probability']}
        />
        <Area type="monotone" dataKey="p" stroke="#22c55e" fill="url(#polyProbGrad)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};
