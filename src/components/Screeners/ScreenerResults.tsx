import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Download, Search } from 'lucide-react';
import { ScreenerType, ALL_FIELDS, FieldDef } from '@/services/screener';
import ColumnPicker from './ColumnPicker';

interface ScreenerResultsProps {
  type: ScreenerType;
  data: any[];
  loading: boolean;
  columns?: string[];
  onColumnsChange?: (columns: string[]) => void;
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  sortConfig?: { field: string; direction: 'asc' | 'desc' } | null;
  onRowSelect?: (item: any) => void;
  selectedItem?: any | null;
  onExportCSV?: () => void;
  onRunScreener?: () => void;
}

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

// Mini sparkline SVG component
const MiniSparkline = ({ positive }: { positive: boolean }) => {
  const points = useMemo(() => {
    const pts: number[] = [];
    let v = 50;
    for (let i = 0; i < 7; i++) {
      v += (Math.random() - 0.5) * 8;
      v = Math.max(10, Math.min(90, v));
      pts.push(v);
    }
    return pts;
  }, []);

  const pathD = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * 6},${20 - (y / 100) * 18}`).join(' ');
  const color = positive ? 'hsl(var(--terminal-green))' : 'hsl(var(--destructive))';

  return (
    <svg width="36" height="20" className="inline-block ml-1 opacity-60">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.2" />
    </svg>
  );
};

const ScreenerResults = ({
  type, data, loading, columns,
  onColumnsChange, onSortChange, sortConfig,
  onRowSelect, selectedItem, onExportCSV, onRunScreener
}: ScreenerResultsProps) => {
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

    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return <span className="text-muted-foreground/40">—</span>;

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

  const handleHeaderClick = (colName: string) => {
    if (!onSortChange) return;
    const newDir = sortConfig?.field === colName && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(colName, newDir);
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

  const hc = TYPE_COLORS[type];
  const sc = SYMBOL_COLORS[type];
  const colNames = (columns && columns.length > 0 ? columns : DEFAULT_COLUMNS[type]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Column Management Bar */}
      <div className="px-3 py-1 border-b border-border/50 flex items-center gap-2 shrink-0">
        <ColumnPicker
          type={type}
          activeColumns={colNames}
          onColumnsChange={onColumnsChange || (() => {})}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCSV}
          disabled={data.length === 0}
          className="h-7 text-[10px] font-mono border-border gap-1"
        >
          <Download className="w-3 h-3" />
          CSV
        </Button>
        <div className="flex-1" />
        <span className="text-[9px] font-mono text-muted-foreground">{data.length} rows</span>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-3xl">🔍</div>
            <p className="text-sm font-mono text-muted-foreground">No results found</p>
            <p className="text-[10px] font-mono text-muted-foreground/60">Try adjusting your filters or selecting a different market</p>
            {onRunScreener && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRunScreener}
                className="border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 font-mono text-[10px] h-7"
              >
                <Search className="w-3 h-3 mr-1" /> Run Screener
              </Button>
            )}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className={`font-mono text-[10px] ${hc} sticky left-0 bg-background z-10 w-20`}>Symbol</TableHead>
                {activeColumns.map(col => (
                  <TableHead
                    key={col.name}
                    className={`font-mono text-[10px] ${hc} ${col.format !== 'text' ? 'text-right' : ''} cursor-pointer hover:bg-muted/20 select-none`}
                    onClick={() => handleHeaderClick(col.name)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {sortConfig?.field === col.name && (
                        sortConfig.direction === 'asc'
                          ? <ArrowUp className="w-2.5 h-2.5" />
                          : <ArrowDown className="w-2.5 h-2.5" />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const symbolDisplay = item.name || item.symbol?.split(':').pop() || item.symbol || `#${index + 1}`;
                const isSelected = selectedItem === item;
                return (
                  <TableRow
                    key={index}
                    className={`border-border/50 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-muted/50 ring-1 ring-terminal-green/30'
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => onRowSelect?.(item)}
                  >
                    <TableCell className={`font-mono text-[11px] font-bold ${sc} sticky left-0 bg-background z-10`}>
                      {symbolDisplay}
                    </TableCell>
                    {activeColumns.map(col => (
                      <TableCell key={col.name} className={`text-[11px] ${col.format !== 'text' ? 'text-right' : ''}`}>
                        <span className="inline-flex items-center">
                          {formatValue(item[col.name], col)}
                          {col.name === 'close' && item.change != null && (
                            <MiniSparkline positive={(item.change ?? 0) >= 0} />
                          )}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  );
};

export default ScreenerResults;
