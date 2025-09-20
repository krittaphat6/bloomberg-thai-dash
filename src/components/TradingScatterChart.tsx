import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

interface ScatterData {
  symbol: string;
  risk: number;
  return: number;
  pnl: number;
  color: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded p-3 text-xs">
        <p className="font-medium text-[hsl(var(--trading-text))]">{data.symbol}</p>
        <p className="text-[hsl(var(--trading-muted))]">Risk Score: {data.risk.toFixed(1)}</p>
        <p className="text-[hsl(var(--trading-muted))]">Return: {data.return.toFixed(1)}%</p>
        <p className={`font-medium ${data.pnl >= 0 ? 'text-[hsl(var(--trading-success))]' : 'text-[hsl(var(--trading-danger))]'}`}>
          P&L: ${data.pnl.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function TradingScatterChart({ trades }: Props) {
  const calculateScatterData = (): ScatterData[] => {
    const symbolStats = new Map();
    
    const closedTrades = trades.filter(t => t.status === 'Closed');
    
    closedTrades.forEach(trade => {
      const symbol = trade.symbol;
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          symbol,
          totalPnL: 0,
          returns: [],
          tradeCount: 0
        });
      }
      
      const stats = symbolStats.get(symbol);
      stats.totalPnL += trade.pnl;
      stats.tradeCount += 1;
      
      if (trade.pnlPercentage !== undefined) {
        stats.returns.push(trade.pnlPercentage);
      }
    });
    
    return Array.from(symbolStats.values())
      .filter(stats => stats.tradeCount >= 2)
      .map(stats => {
        // Calculate average return
        const avgReturn = stats.returns.length > 0 
          ? stats.returns.reduce((sum: number, r: number) => sum + r, 0) / stats.returns.length 
          : 0;
        
        // Calculate risk as standard deviation of returns
        const risk = stats.returns.length > 1 
          ? Math.sqrt(stats.returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / (stats.returns.length - 1))
          : Math.abs(avgReturn) * 0.5; // Fallback risk estimate
        
        const color = stats.totalPnL >= 0 ? 'hsl(var(--trading-success))' : 'hsl(var(--trading-danger))';
        
        return {
          symbol: stats.symbol,
          risk: Math.max(0, risk),
          return: avgReturn,
          pnl: stats.totalPnL,
          color
        };
      })
      .slice(0, 20); // Show top 20 symbols
  };

  const scatterData = calculateScatterData();

  if (scatterData.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-[hsl(var(--trading-muted))] text-sm">
        <p>Need at least 2 closed trades per symbol to show risk/return analysis</p>
      </div>
    );
  }

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--trading-border))" />
          <XAxis 
            type="number" 
            dataKey="risk" 
            name="Risk" 
            stroke="hsl(var(--trading-muted))" 
            fontSize={9}
            label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: 9, fill: 'hsl(var(--trading-muted))' } }}
          />
          <YAxis 
            type="number" 
            dataKey="return" 
            name="Return %" 
            stroke="hsl(var(--trading-muted))" 
            fontSize={9}
            label={{ value: 'Avg Return %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 9, fill: 'hsl(var(--trading-muted))' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter name="Assets" data={scatterData}>
            {scatterData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}