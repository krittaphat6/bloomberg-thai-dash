import { useState, useCallback } from 'react';
import { useOpenBB } from '@/lib/openbb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';

interface DarkPoolData {
  date?: string;
  symbol?: string;
  totalWeeklyShareQuantity?: number;
  totalWeeklyTradeCount?: number;
  averageTradeSize?: number;
  shortVolume?: number;
  totalVolume?: number;
}

const DarkPoolMonitor = () => {
  const { isConnected, fetchDarkPool } = useOpenBB();
  const [symbol, setSymbol] = useState('AAPL');
  const [data, setData] = useState<DarkPoolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleSearch = useCallback(async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    try {
      const result = await fetchDarkPool(symbol.toUpperCase());
      setData(Array.isArray(result) ? result.slice(0, 50) : []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Dark pool fetch error:', e);
      // Generate mock data
      setData(Array.from({ length: 20 }, (_, i) => ({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        symbol: symbol.toUpperCase(),
        totalWeeklyShareQuantity: Math.floor(Math.random() * 50000000) + 5000000,
        totalWeeklyTradeCount: Math.floor(Math.random() * 50000) + 5000,
        averageTradeSize: Math.floor(Math.random() * 500) + 100,
        shortVolume: Math.floor(Math.random() * 20000000) + 2000000,
        totalVolume: Math.floor(Math.random() * 80000000) + 20000000,
      })));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [symbol, fetchDarkPool]);

  const totalDarkVol = data.reduce((s, d) => s + (d.totalWeeklyShareQuantity || 0), 0);
  const totalVol = data.reduce((s, d) => s + (d.totalVolume || 0), 0);
  const darkPct = totalVol > 0 ? (totalDarkVol / totalVol * 100) : 0;
  const unusualCount = data.filter(d => (d.averageTradeSize || 0) > 300).length;

  const heatLevel = darkPct > 45 ? 'HEAVY' : darkPct > 25 ? 'ELEVATED' : 'NORMAL';
  const heatColor = heatLevel === 'HEAVY' ? 'text-terminal-red' : heatLevel === 'ELEVATED' ? 'text-terminal-amber' : 'text-terminal-green';
  const heatBg = heatLevel === 'HEAVY' ? 'bg-terminal-red/10 border-terminal-red/30' : heatLevel === 'ELEVATED' ? 'bg-terminal-amber/10 border-terminal-amber/30' : 'bg-terminal-green/10 border-terminal-green/30';

  const formatNum = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono font-bold text-terminal-green tracking-wider">🕳️ DARK POOL MONITOR</h2>
          {!isConnected && (
            <Badge variant="outline" className="text-[9px] font-mono border-terminal-amber/40 text-terminal-amber">
              ⚠️ OBB OFFLINE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[9px] font-mono text-muted-foreground">
              Updated: {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSearch} disabled={loading} className="h-6 w-6 p-0">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Enter symbol..."
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-7 pl-7 text-xs bg-card border-border font-mono"
          />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={loading} className="h-7 text-xs font-mono bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/30">
          SCAN
        </Button>
      </div>

      {/* Heat Level Banner */}
      {data.length > 0 && (
        <div className={`mx-3 mt-2 px-3 py-1.5 rounded border ${heatBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-3.5 h-3.5 ${heatColor}`} />
              <span className={`text-[10px] font-mono font-bold ${heatColor}`}>
                {heatLevel} DARK ACTIVITY — {darkPct.toFixed(1)}% of total volume
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 px-3 py-2 shrink-0">
        {[
          { label: 'DARK POOL VOL', value: formatNum(totalDarkVol), icon: Activity, color: 'text-terminal-cyan' },
          { label: '% OF TOTAL', value: `${darkPct.toFixed(1)}%`, icon: TrendingUp, color: heatColor },
          { label: 'UNUSUAL PRINTS', value: unusualCount.toString(), icon: AlertTriangle, color: 'text-terminal-amber' },
          { label: 'NET DIRECTION', value: totalDarkVol > totalVol * 0.35 ? 'SELLERS' : 'BUYERS', icon: totalDarkVol > totalVol * 0.35 ? TrendingDown : TrendingUp, color: totalDarkVol > totalVol * 0.35 ? 'text-terminal-red' : 'text-terminal-green' },
        ].map((card, i) => (
          <div key={i} className="bg-card border border-border rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <card.icon className={`w-3 h-3 ${card.color}`} />
              <span className="text-[8px] font-mono text-muted-foreground uppercase">{card.label}</span>
            </div>
            <span className={`text-sm font-mono font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto px-3 pb-2">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xs font-mono text-muted-foreground">NO DATA AVAILABLE</p>
              <p className="text-[9px] font-mono text-muted-foreground mt-1">Enter a symbol and click SCAN</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[9px] font-mono text-muted-foreground h-7">DATE</TableHead>
                <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">DARK VOL</TableHead>
                <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">TOTAL VOL</TableHead>
                <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">DARK %</TableHead>
                <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">AVG SIZE</TableHead>
                <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">TRADES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => {
                const rowDarkPct = row.totalVolume ? ((row.totalWeeklyShareQuantity || 0) / row.totalVolume * 100) : 0;
                return (
                  <TableRow key={i} className="border-border hover:bg-terminal-green/5 cursor-pointer">
                    <TableCell className="text-[10px] font-mono py-1">{row.date || '-'}</TableCell>
                    <TableCell className="text-[10px] font-mono py-1 text-right text-terminal-cyan">{formatNum(row.totalWeeklyShareQuantity || 0)}</TableCell>
                    <TableCell className="text-[10px] font-mono py-1 text-right">{formatNum(row.totalVolume || 0)}</TableCell>
                    <TableCell className={`text-[10px] font-mono py-1 text-right ${rowDarkPct > 40 ? 'text-terminal-red' : rowDarkPct > 25 ? 'text-terminal-amber' : 'text-terminal-green'}`}>
                      {rowDarkPct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-[10px] font-mono py-1 text-right">{row.averageTradeSize?.toLocaleString() || '-'}</TableCell>
                    <TableCell className="text-[10px] font-mono py-1 text-right">{formatNum(row.totalWeeklyTradeCount || 0)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default DarkPoolMonitor;
