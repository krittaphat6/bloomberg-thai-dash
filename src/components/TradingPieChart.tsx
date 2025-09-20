import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  position: 'Long' | 'Short';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  pnl: number;
  pnlPercentage?: number;
  status: 'Open' | 'Closed';
  strategy: string;
}

interface Props {
  trades: Trade[];
}

interface PieData {
  name: string;
  value: number;
  pnl: number;
  trades: number;
  color: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded p-3 text-xs">
        <p className="font-medium text-[hsl(var(--trading-text))]">{data.name}</p>
        <p className="text-[hsl(var(--trading-muted))]">Volume: {data.value.toFixed(1)}%</p>
        <p className="text-[hsl(var(--trading-muted))]">Trades: {data.trades}</p>
        <p className={`font-medium ${data.pnl >= 0 ? 'text-[hsl(var(--trading-success))]' : 'text-[hsl(var(--trading-danger))]'}`}>
          P&L: ${data.pnl.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function TradingPieChart({ trades }: Props) {
  const calculatePieData = (): PieData[] => {
    const symbolStats = new Map();
    
    let totalVolume = 0;
    
    // Calculate stats per symbol
    trades.forEach(trade => {
      const volume = trade.size * trade.entryPrice;
      totalVolume += volume;
      
      const symbol = trade.symbol;
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          name: symbol,
          volume: 0,
          pnl: 0,
          trades: 0
        });
      }
      
      const stats = symbolStats.get(symbol);
      stats.volume += volume;
      stats.pnl += trade.pnl;
      stats.trades += 1;
    });
    
    // Convert to percentage and sort by volume
    const pieData = Array.from(symbolStats.values())
      .map(stats => ({
        name: stats.name,
        value: totalVolume > 0 ? (stats.volume / totalVolume) * 100 : 0,
        pnl: stats.pnl,
        trades: stats.trades,
        color: stats.pnl >= 0 ? 'hsl(var(--trading-success))' : 'hsl(var(--trading-danger))'
      }))
      .sort((a, b) => b.value - a.value);
    
    // Show top 8 symbols, group the rest as "Others"
    if (pieData.length > 8) {
      const topSymbols = pieData.slice(0, 7);
      const others = pieData.slice(7);
      const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
      const othersPnL = others.reduce((sum, item) => sum + item.pnl, 0);
      const othersTrades = others.reduce((sum, item) => sum + item.trades, 0);
      
      topSymbols.push({
        name: 'Others',
        value: othersTotal,
        pnl: othersPnL,
        trades: othersTrades,
        color: 'hsl(var(--trading-muted))'
      });
      
      return topSymbols;
    }
    
    return pieData;
  };

  const pieData = calculatePieData();

  if (pieData.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-[hsl(var(--trading-muted))] text-sm">
        <p>No trading data available for asset distribution</p>
      </div>
    );
  }

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            dataKey="value"
            stroke="hsl(var(--trading-border))"
            strokeWidth={1}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-xs" style={{ color: entry.color }}>
                {value} ({entry.payload.value.toFixed(1)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}