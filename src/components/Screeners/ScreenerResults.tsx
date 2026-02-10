import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Download, Copy } from 'lucide-react';
import { ScreenerType, Field, getPresetsForType, ColumnPreset } from '@/services/ScreenerService';
import { toast } from 'sonner';

interface ScreenerResultsProps {
  type: ScreenerType;
  data: any[];
  loading: boolean;
  columns?: Field[];
}

const ScreenerResults = ({ type, data, loading, columns }: ScreenerResultsProps) => {
  const [localSort, setLocalSort] = useState<{ field: string; dir: 'asc' | 'desc' } | null>(null);

  const defaultPreset = getPresetsForType(type)[0];
  const displayColumns: Field[] = columns && columns.length > 0 ? columns : (defaultPreset?.fields || []);

  const sortedData = useMemo(() => {
    if (!localSort) return data;
    return [...data].sort((a, b) => {
      const av = a[localSort.field] ?? 0;
      const bv = b[localSort.field] ?? 0;
      if (typeof av === 'string') return localSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return localSort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [data, localSort]);

  const toggleSort = (fieldName: string) => {
    setLocalSort(prev => {
      if (prev?.field === fieldName) {
        return prev.dir === 'desc' ? { field: fieldName, dir: 'asc' } : null;
      }
      return { field: fieldName, dir: 'desc' };
    });
  };

  const formatNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(2);
  };

  const formatCell = (field: Field, value: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground/40">-</span>;

    // Symbol column
    if (field.name === 'symbol') {
      const colorMap: Record<string, string> = {
        stock: 'text-terminal-green', crypto: 'text-terminal-cyan', coin: 'text-terminal-cyan',
        forex: 'text-terminal-amber', bond: 'text-terminal-green', futures: 'text-terminal-green',
      };
      return <span className={`font-bold ${colorMap[type] || 'text-foreground'}`}>{value}</span>;
    }

    // Name column
    if (field.name === 'name' || field.name === 'description') {
      return <span className="text-foreground/80 truncate max-w-[140px] block">{value}</span>;
    }

    // String fields
    if (field.type === 'string') return <span className="text-muted-foreground">{value}</span>;

    // Boolean
    if (field.type === 'boolean') return value ? <Badge className="text-[9px] bg-terminal-green/20 text-terminal-green">Yes</Badge> : null;

    // Numeric
    const num = Number(value);

    // Percentage fields
    if (field.label.includes('%') || field.name.includes('change') || field.name.includes('perf_')) {
      const isPos = num >= 0;
      return (
        <span className={`inline-flex items-center gap-0.5 ${isPos ? 'text-terminal-green' : 'text-destructive'}`}>
          {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {isPos ? '+' : ''}{num.toFixed(2)}%
        </span>
      );
    }

    // RSI
    if (field.name.includes('rsi')) {
      const variant = num > 70 ? 'destructive' : num < 30 ? 'default' : 'secondary';
      return <Badge variant={variant} className="font-mono text-[9px]">{num.toFixed(1)}</Badge>;
    }

    // Rating/Recommend
    if (field.name.includes('recommend')) {
      const label = num > 0.5 ? 'Strong Buy' : num > 0.1 ? 'Buy' : num > -0.1 ? 'Neutral' : num > -0.5 ? 'Sell' : 'Strong Sell';
      const color = num > 0.1 ? 'text-terminal-green' : num < -0.1 ? 'text-destructive' : 'text-muted-foreground';
      return <span className={`${color} text-[10px]`}>{label}</span>;
    }

    // Large numbers (volume, market cap, etc)
    if (Math.abs(num) > 10000) return <span className="text-muted-foreground">{formatNumber(num)}</span>;

    // Price-like
    if (field.name.includes('close') || field.name.includes('price') || field.name === 'open' || field.name === 'high' || field.name === 'low' || field.name.includes('sma') || field.name.includes('ema') || field.name.includes('vwap') || field.name.includes('pivot') || field.name.includes('bb_')) {
      return <span>${Math.abs(num) < 1 ? num.toPrecision(4) : num.toFixed(2)}</span>;
    }

    return <span>{num.toFixed(2)}</span>;
  };

  const handleExportCSV = () => {
    const headers = displayColumns.map(f => f.label).join(',');
    const rows = sortedData.map(item => displayColumns.map(f => item[f.name] ?? '').join(',')).join('\n');
    const csv = headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `screener_${type}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleCopy = () => {
    const headers = displayColumns.map(f => f.label).join('\t');
    const rows = sortedData.map(item => displayColumns.map(f => item[f.name] ?? '').join('\t')).join('\n');
    navigator.clipboard.writeText(headers + '\n' + rows);
    toast.success('Copied to clipboard');
  };

  const headerColor: Record<string, string> = {
    stock: 'text-terminal-green', crypto: 'text-terminal-cyan', coin: 'text-terminal-cyan',
    forex: 'text-terminal-amber', bond: 'text-terminal-green', futures: 'text-terminal-green',
  };
  const hc = headerColor[type] || 'text-foreground';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-terminal-green mx-auto" />
          <p className="text-sm font-mono text-muted-foreground">Scanning markets...</p>
          <p className="text-[10px] font-mono text-muted-foreground/50">Querying {type} screener</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-muted-foreground">No results found</p>
          <p className="text-xs font-mono text-muted-foreground/60">Set filters → RUN SCREENER</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground">
          {sortedData.length} results · {displayColumns.length} columns
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-[10px] font-mono text-muted-foreground hover:text-foreground">
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportCSV} className="h-6 text-[10px] font-mono text-muted-foreground hover:text-foreground">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {displayColumns.map(field => (
                <TableHead key={field.name}
                  className={`font-mono text-[10px] ${hc} cursor-pointer hover:bg-muted/30 select-none whitespace-nowrap ${field.type === 'number' ? 'text-right' : ''}`}
                  onClick={() => field.type === 'number' && toggleSort(field.name)}>
                  <span className="inline-flex items-center gap-0.5">
                    {field.label}
                    {localSort?.field === field.name ? (
                      localSort.dir === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />
                    ) : field.type === 'number' ? (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
                    ) : null}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => (
              <TableRow key={index} className="border-border/30 hover:bg-muted/20 cursor-pointer">
                {displayColumns.map(field => (
                  <TableCell key={field.name} className={`font-mono text-[10px] py-1.5 ${field.type === 'number' ? 'text-right' : ''}`}>
                    {formatCell(field, item[field.name])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default ScreenerResults;
