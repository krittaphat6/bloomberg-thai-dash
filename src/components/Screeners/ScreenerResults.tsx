import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { ScreenerType, ALL_FIELDS, FieldDef } from '@/services/screener';

interface ScreenerResultsProps {
  type: ScreenerType;
  data: any[];
  loading: boolean;
  columns?: string[];
}

// Default columns per screener type
const DEFAULT_COLUMNS: Record<ScreenerType, string[]> = {
  stock: ['description', 'close', 'change', 'volume', 'market_cap_basic', 'RSI', 'Recommend.All', 'sector'],
  crypto: ['description', 'close', 'change', '24h_vol|5', 'market_cap_calc', 'RSI', 'Recommend.All'],
  forex: ['description', 'close', 'change', 'bid', 'ask', 'RSI', 'Recommend.All'],
  bond: ['description', 'close', 'change', 'yield_recent', 'coupon', 'RSI'],
  futures: ['description', 'close', 'change', 'volume', 'open_interest', 'RSI', 'Recommend.All'],
  coin: ['description', 'close', 'change', '24h_vol|5', 'market_cap_calc', 'RSI'],
};

const TYPE_COLORS: Record<ScreenerType, string> = {
  stock: 'text-terminal-green',
  crypto: 'text-terminal-cyan',
  forex: 'text-terminal-amber',
  bond: 'text-terminal-green',
  futures: 'text-terminal-green',
  coin: 'text-terminal-cyan',
};

const SYMBOL_COLORS: Record<ScreenerType, string> = {
  stock: 'text-terminal-green',
  crypto: 'text-terminal-cyan',
  forex: 'text-terminal-amber',
  bond: 'text-foreground',
  futures: 'text-foreground',
  coin: 'text-terminal-cyan',
};

const ScreenerResults = ({ type, data, loading, columns }: ScreenerResultsProps) => {
  const activeColumns = useMemo(() => {
    const cols = columns && columns.length > 0 ? columns : DEFAULT_COLUMNS[type];
    return cols.map(colName => {
      const fieldDef = ALL_FIELDS.find(f => f.name === colName);
      return fieldDef || { name: colName, label: colName, format: 'number' as const, category: 'info' as const, screeners: [] };
    });
  }, [columns, type]);

  const formatValue = (value: any, field: FieldDef | { format: string; name: string }) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground/40">—</span>;

    const format = field.format;

    if (format === 'text') {
      return <span className="text-foreground/80 truncate max-w-[120px] block">{value}</span>;
    }

    if (format === 'percent' || field.name === 'change') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return <span className="text-muted-foreground/40">—</span>;
      const isPositive = num >= 0;
      return (
        <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${isPositive ? 'text-terminal-green' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {isPositive ? '+' : ''}{num.toFixed(2)}%
        </span>
      );
    }

    if (format === 'rating') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return <span className="text-muted-foreground/40">—</span>;
      let label: string;
      let color: string;
      if (num >= 0.5) { label = 'Strong Buy'; color = 'bg-terminal-green/20 text-terminal-green border-terminal-green/30'; }
      else if (num >= 0.1) { label = 'Buy'; color = 'bg-terminal-green/10 text-terminal-green/80 border-terminal-green/20'; }
      else if (num > -0.1) { label = 'Neutral'; color = 'bg-muted/30 text-muted-foreground border-border'; }
      else if (num > -0.5) { label = 'Sell'; color = 'bg-destructive/10 text-destructive/80 border-destructive/20'; }
      else { label = 'Strong Sell'; color = 'bg-destructive/20 text-destructive border-destructive/30'; }
      return <Badge variant="outline" className={`font-mono text-[9px] px-1 py-0 ${color}`}>{label}</Badge>;
    }

    if (format === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return <span className="text-muted-foreground/40">—</span>;
      if (num < 0.01 && num > 0) return <span className="font-mono">{num.toPrecision(4)}</span>;
      if (num >= 1e12) return <span className="font-mono">${(num / 1e12).toFixed(2)}T</span>;
      if (num >= 1e9) return <span className="font-mono">${(num / 1e9).toFixed(2)}B</span>;
      if (num >= 1e6) return <span className="font-mono">${(num / 1e6).toFixed(2)}M</span>;
      return <span className="font-mono">${num.toFixed(2)}</span>;
    }

    // Number format
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return <span className="text-muted-foreground/40">—</span>;

    // Special formatting for known fields
    if (field.name === 'RSI' || field.name === 'RSI7') {
      const variant = num > 70 ? 'destructive' : num < 30 ? 'default' : 'secondary';
      return <Badge variant={variant} className="font-mono text-[9px] px-1 py-0">{num.toFixed(1)}</Badge>;
    }

    if (field.name === 'volume' || field.name.includes('vol') || field.name.includes('market_cap') || field.name.includes('open_interest')) {
      if (num >= 1e12) return <span className="font-mono text-muted-foreground">{(num / 1e12).toFixed(2)}T</span>;
      if (num >= 1e9) return <span className="font-mono text-muted-foreground">{(num / 1e9).toFixed(2)}B</span>;
      if (num >= 1e6) return <span className="font-mono text-muted-foreground">{(num / 1e6).toFixed(2)}M</span>;
      if (num >= 1e3) return <span className="font-mono text-muted-foreground">{(num / 1e3).toFixed(1)}K</span>;
      return <span className="font-mono text-muted-foreground">{num.toFixed(0)}</span>;
    }

    if (field.name.includes('relative_volume')) {
      const color = num > 2 ? 'text-terminal-green' : num > 1 ? 'text-terminal-amber' : 'text-muted-foreground';
      return <span className={`font-mono ${color}`}>{num.toFixed(2)}x</span>;
    }

    return <span className="font-mono">{Math.abs(num) < 0.01 && num !== 0 ? num.toPrecision(4) : num.toFixed(2)}</span>;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-terminal-green mx-auto" />
          <p className="text-sm font-mono text-muted-foreground">Scanning markets...</p>
          <p className="text-[10px] font-mono text-muted-foreground/60">Querying TradingView API</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-muted-foreground">No results found</p>
          <p className="text-xs font-mono text-muted-foreground/60">Add filters and click RUN SCREENER</p>
        </div>
      </div>
    );
  }

  const hc = TYPE_COLORS[type];
  const sc = SYMBOL_COLORS[type];

  return (
    <ScrollArea className="flex-1">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className={`font-mono text-[10px] ${hc} sticky left-0 bg-background z-10 w-20`}>Symbol</TableHead>
            {activeColumns.map(col => (
              <TableHead
                key={col.name}
                className={`font-mono text-[10px] ${hc} ${col.format !== 'text' ? 'text-right' : ''}`}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => {
            const symbolDisplay = item.name || item.symbol?.split(':').pop() || item.symbol || `#${index + 1}`;
            return (
              <TableRow key={index} className="border-border/50 hover:bg-muted/30 cursor-pointer">
                <TableCell className={`font-mono text-[11px] font-bold ${sc} sticky left-0 bg-background z-10`}>
                  {symbolDisplay}
                </TableCell>
                {activeColumns.map(col => (
                  <TableCell key={col.name} className={`text-[11px] ${col.format !== 'text' ? 'text-right' : ''}`}>
                    {formatValue(item[col.name], col)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default ScreenerResults;
