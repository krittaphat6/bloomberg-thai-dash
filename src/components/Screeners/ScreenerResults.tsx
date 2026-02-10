import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { ScreenerType } from '@/services/ScreenerService';

interface ScreenerResultsProps {
  type: ScreenerType;
  data: any[];
  loading: boolean;
}

const ScreenerResults = ({ type, data, loading }: ScreenerResultsProps) => {
  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(2);
  };

  const formatPercent = (num: number) => {
    const isPositive = num >= 0;
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-xs ${isPositive ? 'text-terminal-green' : 'text-destructive'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? '+' : ''}{num.toFixed(2)}%
      </span>
    );
  };

  const rsiVariant = (rsi: number) => {
    if (rsi > 70) return 'destructive';
    if (rsi < 30) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-terminal-green mx-auto" />
          <p className="text-sm font-mono text-muted-foreground">Scanning markets...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-muted-foreground">No results found</p>
          <p className="text-xs font-mono text-muted-foreground/60">Adjust your filters and run the screener</p>
        </div>
      </div>
    );
  }

  const headerClass = (t: ScreenerType) => {
    switch (t) {
      case 'stock': return 'text-terminal-green';
      case 'crypto': return 'text-terminal-cyan';
      case 'forex': return 'text-terminal-amber';
      default: return 'text-foreground';
    }
  };

  const hc = headerClass(type);

  return (
    <ScrollArea className="flex-1">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {type === 'stock' && (
              <>
                <TableHead className={`font-mono text-xs ${hc}`}>Symbol</TableHead>
                <TableHead className={`font-mono text-xs ${hc}`}>Name</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Price</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Change %</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Volume</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Mkt Cap</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>P/E</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>RSI</TableHead>
                <TableHead className={`font-mono text-xs ${hc}`}>Sector</TableHead>
              </>
            )}
            {type === 'crypto' && (
              <>
                <TableHead className={`font-mono text-xs ${hc}`}>Symbol</TableHead>
                <TableHead className={`font-mono text-xs ${hc}`}>Name</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Price</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>24h</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Vol 24h</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Mkt Cap</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>RSI</TableHead>
              </>
            )}
            {type === 'forex' && (
              <>
                <TableHead className={`font-mono text-xs ${hc}`}>Pair</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Price</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Change %</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>RSI</TableHead>
              </>
            )}
            {(type === 'bond' || type === 'futures') && (
              <>
                <TableHead className={`font-mono text-xs ${hc}`}>Symbol</TableHead>
                <TableHead className={`font-mono text-xs ${hc}`}>Name</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Price</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>Change %</TableHead>
                <TableHead className={`font-mono text-xs ${hc} text-right`}>RSI</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className="border-border/50 hover:bg-muted/30 cursor-pointer">
              {type === 'stock' && (
                <>
                  <TableCell className="font-mono text-xs font-bold text-terminal-green">{item.symbol}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground/80 max-w-[120px] truncate">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs text-right">${item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatPercent(item.change_percent)}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-muted-foreground">{formatNumber(item.volume)}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-muted-foreground">{formatNumber(item.market_cap)}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{item.pe_ratio}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={rsiVariant(item.rsi_14)} className="font-mono text-[10px]">
                      {item.rsi_14}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{item.sector}</TableCell>
                </>
              )}
              {type === 'crypto' && (
                <>
                  <TableCell className="font-mono text-xs font-bold text-terminal-cyan">{item.symbol}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground/80">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs text-right">${item.price < 1 ? item.price.toPrecision(4) : item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatPercent(item.change_24h)}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-muted-foreground">{formatNumber(item.volume_24h)}</TableCell>
                  <TableCell className="font-mono text-xs text-right text-muted-foreground">{formatNumber(item.market_cap)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={rsiVariant(item.rsi_14)} className="font-mono text-[10px]">
                      {item.rsi_14}
                    </Badge>
                  </TableCell>
                </>
              )}
              {type === 'forex' && (
                <>
                  <TableCell className="font-mono text-xs font-bold text-terminal-amber">{item.symbol}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{item.price}</TableCell>
                  <TableCell className="text-right">{formatPercent(item.change_percent)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={rsiVariant(item.rsi_14)} className="font-mono text-[10px]">
                      {item.rsi_14}
                    </Badge>
                  </TableCell>
                </>
              )}
              {(type === 'bond' || type === 'futures') && (
                <>
                  <TableCell className="font-mono text-xs font-bold text-terminal-green">{item.symbol}</TableCell>
                  <TableCell className="font-mono text-xs text-foreground/80">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs text-right">{item.price}</TableCell>
                  <TableCell className="text-right">{formatPercent(item.change_percent)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={rsiVariant(item.rsi_14)} className="font-mono text-[10px]">
                      {item.rsi_14}
                    </Badge>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default ScreenerResults;
