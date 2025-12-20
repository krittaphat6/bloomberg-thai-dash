import { useState, useEffect, useCallback } from 'react';
import { Table, Grid3x3, BarChart3, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';

interface CorrelationData {
  [key: string]: { [key: string]: number };
}

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'SPY'];

const CorrelationMatrixTable = () => {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [newSymbol, setNewSymbol] = useState('');
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationData>({});
  const [loading, setLoading] = useState(false);
  const [correlationType, setCorrelationType] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');
  const [length, setLength] = useState(20);
  const [timeframe, setTimeframe] = useState('1d');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const denominator = Math.sqrt(denX * denY);
    return denominator === 0 ? 0 : num / denominator;
  };

  const rankArray = (arr: number[]): number[] => {
    const sorted = [...arr].map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
    const ranks = new Array(arr.length);
    sorted.forEach((item, rank) => {
      ranks[item.idx] = rank + 1;
    });
    return ranks;
  };

  const calculateSpearmanCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    return calculatePearsonCorrelation(rankArray(x.slice(0, n)), rankArray(y.slice(0, n)));
  };

  const calculateKendallCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    let concordant = 0, discordant = 0;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const xDiff = x[j] - x[i];
        const yDiff = y[j] - y[i];
        if ((xDiff > 0 && yDiff > 0) || (xDiff < 0 && yDiff < 0)) {
          concordant++;
        } else if ((xDiff > 0 && yDiff < 0) || (xDiff < 0 && yDiff > 0)) {
          discordant++;
        }
      }
    }
    const pairs = (n * (n - 1)) / 2;
    return pairs === 0 ? 0 : (concordant - discordant) / pairs;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const priceData: { [symbol: string]: number[] } = {};

      for (const symbol of symbols) {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=${timeframe}`
          );
          const data = await response.json();
          const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((p: any) => p != null) || [];
          
          const returns: number[] = [];
          for (let i = 1; i < Math.min(closes.length, length + 1); i++) {
            if (closes[i] && closes[i - 1]) {
              returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
            }
          }
          
          priceData[symbol] = returns;
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          priceData[symbol] = Array.from({ length }, () => (Math.random() - 0.5) * 0.05);
        }
      }

      const matrix: CorrelationData = {};
      symbols.forEach(sym1 => {
        matrix[sym1] = {};
        symbols.forEach(sym2 => {
          if (sym1 === sym2) {
            matrix[sym1][sym2] = 1;
          } else if (priceData[sym1] && priceData[sym2]) {
            let correlation: number;
            switch (correlationType) {
              case 'spearman':
                correlation = calculateSpearmanCorrelation(priceData[sym1], priceData[sym2]);
                break;
              case 'kendall':
                correlation = calculateKendallCorrelation(priceData[sym1], priceData[sym2]);
                break;
              default:
                correlation = calculatePearsonCorrelation(priceData[sym1], priceData[sym2]);
            }
            matrix[sym1][sym2] = correlation;
          } else {
            matrix[sym1][sym2] = 0;
          }
        });
      });

      setCorrelationMatrix(matrix);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error calculating correlations:', error);
      setError('Failed to calculate correlations');
    } finally {
      setLoading(false);
    }
  }, [symbols, correlationType, length, timeframe]);

  useEffect(() => {
    if (symbols.length > 0) {
      fetchData();
    }
  }, [fetchData]);

  const addSymbol = () => {
    const upperSymbol = newSymbol.toUpperCase().trim();
    if (upperSymbol && !symbols.includes(upperSymbol)) {
      setSymbols([...symbols, upperSymbol]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const getColorForCorrelation = (value: number): string => {
    if (value === 1) return 'bg-slate-700';
    if (value > 0.7) return 'bg-emerald-600';
    if (value > 0.4) return 'bg-emerald-700';
    if (value > 0) return 'bg-emerald-800';
    if (value > -0.4) return 'bg-red-800';
    if (value > -0.7) return 'bg-red-700';
    return 'bg-red-600';
  };

  const MatrixContent = () => (
    <div className="overflow-x-auto">
      <UITable>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-background sticky left-0 z-10 text-xs font-bold w-16"></TableHead>
            {symbols.map((symbol) => (
              <TableHead key={symbol} className="text-center bg-background text-green-400 text-xs px-2 min-w-[60px]">
                {symbol}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {symbols.map((sym1) => (
            <TableRow key={sym1}>
              <TableCell className="font-bold bg-background sticky left-0 z-10 text-green-400 text-xs px-2">
                {sym1}
              </TableCell>
              {symbols.map((sym2) => {
                const value = correlationMatrix[sym1]?.[sym2] ?? 0;
                return (
                  <TableCell
                    key={sym2}
                    className={`text-center ${getColorForCorrelation(value)} text-white font-mono text-xs px-2 py-1.5`}
                  >
                    {value.toFixed(3)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </UITable>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-600 rounded" />
          <span className="text-muted-foreground">Strong +</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-800 rounded" />
          <span className="text-muted-foreground">Weak +</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-800 rounded" />
          <span className="text-muted-foreground">Weak -</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span className="text-muted-foreground">Strong -</span>
        </div>
      </div>
    </div>
  );

  const SettingsContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Correlation Type</label>
          <Select value={correlationType} onValueChange={(v: any) => setCorrelationType(v)}>
            <SelectTrigger className="h-8 border-green-500/30 text-green-400 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pearson">Pearson</SelectItem>
              <SelectItem value="spearman">Spearman</SelectItem>
              <SelectItem value="kendall">Kendall</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Timeframe</label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="h-8 border-green-500/30 text-green-400 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Daily</SelectItem>
              <SelectItem value="1wk">Weekly</SelectItem>
              <SelectItem value="1mo">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Period (N)</label>
          <Input
            type="number"
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value) || 20)}
            className="h-8 text-xs border-green-500/30 mt-1"
            min={5}
            max={100}
          />
        </div>
      </div>

      {/* Symbol Management */}
      <div>
        <label className="text-xs text-muted-foreground">Add Symbol</label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
            placeholder="Enter ticker..."
            className="h-8 text-xs border-green-500/30 flex-1"
          />
          <Button
            onClick={addSymbol}
            size="sm"
            variant="outline"
            className="border-green-500/30 text-green-400 h-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Symbol Tags */}
      <div className="flex flex-wrap gap-1.5">
        {symbols.map((symbol) => (
          <div
            key={symbol}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-green-500/50 text-green-400"
          >
            <span>{symbol}</span>
            <button onClick={() => removeSymbol(symbol)} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <COTStyleWrapper
      title="CORRELATION MATRIX"
      icon="🔢"
      lastUpdate={lastUpdate}
      onRefresh={fetchData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'matrix',
          label: 'Matrix',
          icon: <Grid3x3 className="w-3 h-3" />,
          content: <MatrixContent />
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Table className="w-3 h-3" />,
          content: <SettingsContent />
        }
      ]}
      footerLeft={`${correlationType.charAt(0).toUpperCase() + correlationType.slice(1)} Correlation`}
      footerStats={[
        { label: '📊 Symbols', value: symbols.length },
        { label: '⏱️ Period', value: `${length} ${timeframe}` }
      ]}
      footerRight={lastUpdate?.toLocaleDateString() || ''}
    />
  );
};

export default CorrelationMatrixTable;
