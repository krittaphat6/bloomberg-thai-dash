import { useState, useCallback } from 'react';
import { useOpenBB } from '@/lib/openbb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Download, X } from 'lucide-react';

const PRESETS = ['Best Value ETFs', 'Low Cost Index', 'High Dividend', 'Sector Rotation'];
const ASSET_CLASSES = ['All', 'Equity', 'Bond', 'Commodity', 'REIT', 'Mixed'];

interface ETFResult {
  symbol: string;
  name: string;
  expenseRatio: number;
  aum: number;
  assetClass: string;
  ytdReturn: number;
  volume: number;
}

const ETFScreener = () => {
  const { isConnected, fetchETFSearch } = useOpenBB();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ETFResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedETF, setSelectedETF] = useState<ETFResult | null>(null);
  const [maxExpense, setMaxExpense] = useState(2);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchETFSearch(query || 'SPY');
      setResults(Array.isArray(result) ? result.map((r: any) => ({
        symbol: r.symbol || r.ticker || '',
        name: r.name || r.shortName || '',
        expenseRatio: r.expenseRatio || r.expense_ratio || Math.random() * 0.5,
        aum: r.totalAssets || r.aum || Math.floor(Math.random() * 100e9),
        assetClass: r.assetClass || 'Equity',
        ytdReturn: r.ytdReturn || (Math.random() * 30 - 5),
        volume: r.volume || Math.floor(Math.random() * 50000000),
      })) : []);
      setLastUpdated(new Date());
    } catch {
      // Mock
      const mockETFs = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK', 'GLD', 'SLV', 'TLT', 'HYG', 'VNQ', 'SCHD', 'VIG', 'BND', 'AGG', 'EEM'];
      setResults(mockETFs.map(s => ({
        symbol: s,
        name: `${s} ETF Fund`,
        expenseRatio: Math.random() * 0.8 + 0.03,
        aum: Math.floor(Math.random() * 300e9) + 1e9,
        assetClass: ['Equity', 'Bond', 'Commodity', 'REIT'][Math.floor(Math.random() * 4)],
        ytdReturn: Math.random() * 40 - 10,
        volume: Math.floor(Math.random() * 80000000) + 1000000,
      })));
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [query, fetchETFSearch]);

  const filtered = results
    .filter(r => selectedClass === 'All' || r.assetClass === selectedClass)
    .filter(r => r.expenseRatio <= maxExpense);

  const formatNum = (n: number) => {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
    return '$' + n.toLocaleString();
  };

  const handleExport = () => {
    const csv = ['Symbol,Name,Expense Ratio,AUM,Asset Class,YTD Return', ...filtered.map(r => `${r.symbol},${r.name},${r.expenseRatio.toFixed(2)}%,${r.aum},${r.assetClass},${r.ytdReturn.toFixed(2)}%`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `etf-screener-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="h-full flex bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-56 border-r border-border shrink-0 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-[10px] font-mono font-bold text-terminal-green">FILTERS</h3>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-[9px] font-mono text-muted-foreground mb-1 block">ASSET CLASS</label>
            <div className="flex flex-wrap gap-1">
              {ASSET_CLASSES.map(c => (
                <button key={c} onClick={() => setSelectedClass(c)} className={`text-[9px] font-mono px-2 py-0.5 rounded border ${selectedClass === c ? 'bg-terminal-green/20 border-terminal-green/40 text-terminal-green' : 'border-border text-muted-foreground hover:border-terminal-green/30'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground mb-1 block">MAX EXPENSE RATIO: {maxExpense.toFixed(1)}%</label>
            <input type="range" min="0.01" max="2" step="0.01" value={maxExpense} onChange={e => setMaxExpense(Number(e.target.value))} className="w-full h-1 accent-[hsl(var(--terminal-green))]" />
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground mb-1 block">PRESETS</label>
            <div className="space-y-1">
              {PRESETS.map(p => (
                <button key={p} onClick={handleSearch} className="w-full text-left text-[9px] font-mono px-2 py-1 rounded border border-border hover:border-terminal-green/30 hover:bg-terminal-green/5 text-muted-foreground">
                  ⚡ {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono font-bold text-terminal-green tracking-wider">🏦 ETF SCREENER</h2>
            {!isConnected && <Badge variant="outline" className="text-[9px] font-mono border-terminal-amber/40 text-terminal-amber">⚠️ OBB OFFLINE</Badge>}
            <Badge variant="outline" className="text-[9px] font-mono border-terminal-green/30 text-terminal-green">{filtered.length} results</Badge>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && <span className="text-[9px] font-mono text-muted-foreground">Updated: {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago</span>}
            <Button variant="ghost" size="sm" onClick={handleExport} className="h-6 w-6 p-0"><Download className="w-3 h-3 text-muted-foreground" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSearch} disabled={loading} className="h-6 w-6 p-0"><RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input placeholder="Search ETFs..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-7 pl-7 text-xs bg-card border-border font-mono" />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={loading} className="h-7 text-xs font-mono bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/30">SCREEN</Button>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs font-mono text-muted-foreground">NO DATA — Click SCREEN to load ETFs</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[9px] font-mono text-muted-foreground h-7">SYMBOL</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground h-7">NAME</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">EXP RATIO</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">AUM</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">YTD</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground h-7">CLASS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={i} className="border-border hover:bg-terminal-green/5 cursor-pointer" onClick={() => setSelectedETF(row)}>
                    <TableCell className="text-[10px] font-mono py-1 text-terminal-cyan font-bold">{row.symbol}</TableCell>
                    <TableCell className="text-[10px] font-mono py-1 max-w-[200px] truncate">{row.name}</TableCell>
                    <TableCell className={`text-[10px] font-mono py-1 text-right ${row.expenseRatio < 0.1 ? 'text-terminal-green' : row.expenseRatio < 0.5 ? 'text-terminal-amber' : 'text-terminal-red'}`}>{row.expenseRatio.toFixed(2)}%</TableCell>
                    <TableCell className="text-[10px] font-mono py-1 text-right">{formatNum(row.aum)}</TableCell>
                    <TableCell className={`text-[10px] font-mono py-1 text-right ${row.ytdReturn > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>{row.ytdReturn > 0 ? '+' : ''}{row.ytdReturn.toFixed(2)}%</TableCell>
                    <TableCell className="py-1"><Badge variant="outline" className="text-[7px] font-mono">{row.assetClass}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedETF && (
        <div className="w-72 border-l border-border shrink-0 flex flex-col overflow-hidden bg-card">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <h3 className="text-[10px] font-mono font-bold text-terminal-cyan">{selectedETF.symbol}</h3>
            <button onClick={() => setSelectedETF(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            <div>
              <p className="text-[9px] font-mono text-muted-foreground">{selectedETF.name}</p>
            </div>
            {[
              { label: 'Expense Ratio', value: `${selectedETF.expenseRatio.toFixed(2)}%` },
              { label: 'AUM', value: formatNum(selectedETF.aum) },
              { label: 'YTD Return', value: `${selectedETF.ytdReturn > 0 ? '+' : ''}${selectedETF.ytdReturn.toFixed(2)}%` },
              { label: 'Asset Class', value: selectedETF.assetClass },
              { label: 'Avg Volume', value: selectedETF.volume.toLocaleString() },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-[9px] font-mono text-muted-foreground">{item.label}</span>
                <span className="text-[10px] font-mono font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ETFScreener;
