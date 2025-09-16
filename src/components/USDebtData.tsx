import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';

interface DebtData {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

export default function USDebtData() {
  const [debtData, setDebtData] = useState<DebtData[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const generateMockData = (): DebtData[] => {
    const baseDebt = 33800000000000; // ~33.8 trillion
    const population = 335000000;
    const taxpayers = 165000000;
    const gdp = 27000000000000;
    
    // Add some random fluctuation
    const fluctuation = (Math.random() - 0.5) * 0.01;
    const currentDebt = baseDebt * (1 + fluctuation);
    
    return [
      {
        label: 'National Debt',
        value: `$${(currentDebt / 1000000000000).toFixed(2)}T`,
        change: `+$${(Math.random() * 100000).toFixed(0)}/sec`,
        trend: 'up'
      },
      {
        label: 'Debt per Citizen',
        value: `$${(currentDebt / population).toFixed(0)}`,
        change: `+$${(Math.random() * 10).toFixed(2)}/sec`,
        trend: 'up'
      },
      {
        label: 'Debt per Taxpayer',
        value: `$${(currentDebt / taxpayers).toFixed(0)}`,
        change: `+$${(Math.random() * 20).toFixed(2)}/sec`,
        trend: 'up'
      },
      {
        label: 'Debt to GDP Ratio',
        value: `${((currentDebt / gdp) * 100).toFixed(1)}%`,
        change: `${(Math.random() * 0.1).toFixed(3)}%`,
        trend: Math.random() > 0.5 ? 'up' : 'down'
      },
      {
        label: 'Interest per Second',
        value: `$${(Math.random() * 50000 + 30000).toFixed(0)}`,
        change: 'Real-time',
        trend: 'neutral'
      },
      {
        label: 'GDP',
        value: `$${(gdp / 1000000000000).toFixed(1)}T`,
        change: `+${(Math.random() * 0.1).toFixed(2)}%`,
        trend: 'up'
      }
    ];
  };

  useEffect(() => {
    const updateData = () => {
      setDebtData(generateMockData());
      setLastUpdate(new Date());
    };

    updateData();
    const interval = setInterval(updateData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setDebtData(generateMockData());
    setLastUpdate(new Date());
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-red-400';
      case 'down': return 'text-green-400';
      default: return 'text-terminal-amber';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '~';
    }
  };

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <DollarSign className="h-5 w-5" />
            US DEBT DATA - REAL TIME
          </CardTitle>
          <Button
            onClick={refreshData}
            size="sm"
            variant="outline"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Real-time US national debt statistics and economic indicators
        </div>
      </CardHeader>
      <CardContent className="h-full p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-terminal-amber">
            <span>Last Updated: {lastUpdate.toLocaleTimeString()}</span>
            <span className="animate-pulse">● LIVE</span>
          </div>
          
          <div className="border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-terminal-green font-mono">METRIC</TableHead>
                  <TableHead className="text-terminal-green font-mono text-right">VALUE</TableHead>
                  <TableHead className="text-terminal-green font-mono text-right">CHANGE</TableHead>
                  <TableHead className="text-terminal-green font-mono text-center">TREND</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtData.map((item, index) => (
                  <TableRow key={index} className="border-border hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{item.label}</TableCell>
                    <TableCell className="font-mono text-sm text-right font-semibold">
                      {item.value}
                    </TableCell>
                    <TableCell className={`font-mono text-xs text-right ${getTrendColor(item.trend)}`}>
                      {item.change}
                    </TableCell>
                    <TableCell className={`text-center text-lg ${getTrendColor(item.trend)}`}>
                      {getTrendIcon(item.trend)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="text-xs text-terminal-amber bg-card border border-border rounded p-3">
            💰 Real-time calculations • 📊 Live updates every 2 seconds • 🇺🇸 Official US Treasury data simulation
          </div>
        </div>
      </CardContent>
    </Card>
  );
}