import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
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

    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    
    // Calculate stats per symbol
    closedTrades.forEach(trade => {
      const symbol = trade.symbol;
      const existing = symbolStats.get(symbol) || { totalPnL: 0, totalTrades: 0, totalVolume: 0 };
      
      symbolStats.set(symbol, {
        totalPnL: existing.totalPnL + (trade.pnl || 0),
        totalTrades: existing.totalTrades + 1,
        totalVolume: existing.totalVolume + (trade.quantity * trade.entryPrice)
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sector Attribution Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">Symbol performance vs portfolio weight</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
              data={sectorData}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                dataKey="relativeReturn"
                name="Relative Return"
                unit="%"
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Relative Return (%)', 
                  position: 'insideBottom', 
                  offset: -10,
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <YAxis 
                type="number" 
                dataKey="relativeWeight"
                name="Portfolio Weight"
                unit="%"
                domain={[0, 'dataMax + 2']}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: 'Portfolio Weight (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference Lines for Quadrants */}
              <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              
              <Scatter 
                dataKey="totalPnL" 
                fill="hsl(var(--primary))"
              >
                {sectorData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    r={Math.max(4, Math.min(12, Math.abs(entry.totalPnL) / 100 + 4))}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Quadrant Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/30">
            <div className="font-medium text-emerald-600">Outperform/Overweight</div>
            <div className="text-muted-foreground">Top right: Strong performers with high allocation</div>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <div className="font-medium text-blue-600">Outperform/Underweight</div>
            <div className="text-muted-foreground">Top left: Opportunity to increase allocation</div>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <div className="font-medium text-orange-600">Underperform/Overweight</div>
            <div className="text-muted-foreground">Bottom right: Consider reducing allocation</div>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <div className="font-medium text-gray-600">Underperform/Underweight</div>
            <div className="text-muted-foreground">Bottom left: Low impact performers</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};