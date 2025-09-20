import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface SectorData {
  symbol: string;
  relativeReturn: number;
  relativeWeight: number;
  totalPnL: number;
  tradeCount: number;
  color: string;
}

interface Props {
  trades: Trade[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-card-foreground">{`Symbol: ${data.symbol}`}</p>
        <p className="text-sm text-muted-foreground">{`Return: ${data.relativeReturn.toFixed(2)}%`}</p>
        <p className="text-sm text-muted-foreground">{`Weight: ${data.relativeWeight.toFixed(2)}%`}</p>
        <p className="text-sm text-muted-foreground">{`Total P&L: $${data.totalPnL.toFixed(2)}`}</p>
        <p className="text-sm text-muted-foreground">{`Trades: ${data.tradeCount}`}</p>
      </div>
    );
  }
  return null;
};

export const SectorBubbleChart = ({ trades }: Props) => {
  const calculateSectorData = (): SectorData[] => {
    const symbolStats = new Map<string, {
      totalPnL: number;
      totalTrades: number;
      totalVolume: number;
    }>();

    const closedTrades = trades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
    
    // Calculate stats per symbol
    closedTrades.forEach(trade => {
      const symbol = trade.symbol;
      const existing = symbolStats.get(symbol) || { totalPnL: 0, totalTrades: 0, totalVolume: 0 };
      
      symbolStats.set(symbol, {
        totalPnL: existing.totalPnL + (trade.pnl || 0),
        totalTrades: existing.totalTrades + 1,
        totalVolume: existing.totalVolume + (trade.size * trade.entryPrice)
      });
    });

    // Calculate total portfolio values for relative calculations
    const totalPortfolioPnL = Array.from(symbolStats.values()).reduce((sum, stat) => sum + stat.totalPnL, 0);
    const totalPortfolioVolume = Array.from(symbolStats.values()).reduce((sum, stat) => sum + stat.totalVolume, 0);
    const totalTrades = Array.from(symbolStats.values()).reduce((sum, stat) => sum + stat.totalTrades, 0);

    // Convert to sector data
    return Array.from(symbolStats.entries())
      .filter(([_, stats]) => stats.totalTrades >= 2) // Filter symbols with at least 2 trades
      .map(([symbol, stats]) => {
        const relativeReturn = totalPortfolioPnL !== 0 ? (stats.totalPnL / Math.abs(totalPortfolioPnL)) * 100 : 0;
        const relativeWeight = totalTrades > 0 ? (stats.totalTrades / totalTrades) * 100 : 0;
        
        let color = '#6B7280'; // Default gray
        if (stats.totalPnL > 0) {
          color = '#10B981'; // Green for profit
        } else if (stats.totalPnL < 0) {
          color = '#EF4444'; // Red for loss
        }

        return {
          symbol,
          relativeReturn,
          relativeWeight,
          totalPnL: stats.totalPnL,
          tradeCount: stats.totalTrades,
          color
        };
      })
      .sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL))
      .slice(0, 15); // Show top 15 symbols
  };

  const sectorData = calculateSectorData();

  return (
    <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Sector Attribution Analysis</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--trading-border))" />
            <XAxis 
              type="number" 
              dataKey="relativeReturn" 
              name="Relative Return %" 
              stroke="hsl(var(--trading-muted))" 
              fontSize={9}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <YAxis 
              type="number" 
              dataKey="relativeWeight" 
              name="Relative Weight %" 
              stroke="hsl(var(--trading-muted))" 
              fontSize={9}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="hsl(var(--trading-muted))" strokeDasharray="2 2" />
            <ReferenceLine y={0} stroke="hsl(var(--trading-muted))" strokeDasharray="2 2" />
            <Scatter name="Sectors" data={sectorData} fill="hsl(var(--trading-accent))">
              {sectorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Quadrant Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-[hsl(var(--trading-darker))]/50">
          <div className="font-medium text-[hsl(var(--trading-success))]">Outperform/Overweight</div>
          <div className="text-[hsl(var(--trading-muted))]">Top right: Strong performers</div>
        </div>
        <div className="p-2 rounded bg-[hsl(var(--trading-darker))]/50">
          <div className="font-medium text-[hsl(var(--trading-accent))]">Outperform/Underweight</div>
          <div className="text-[hsl(var(--trading-muted))]">Top left: Increase allocation</div>
        </div>
        <div className="p-2 rounded bg-[hsl(var(--trading-darker))]/50">
          <div className="font-medium text-[hsl(var(--trading-warning))]">Underperform/Overweight</div>
          <div className="text-[hsl(var(--trading-muted))]">Bottom right: Reduce allocation</div>
        </div>
        <div className="p-2 rounded bg-[hsl(var(--trading-darker))]/50">
          <div className="font-medium text-[hsl(var(--trading-muted))]">Underperform/Underweight</div>
          <div className="text-[hsl(var(--trading-muted))]">Bottom left: Low impact</div>
        </div>
      </div>
    </div>
  );
};