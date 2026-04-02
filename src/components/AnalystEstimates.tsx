import { useState, useCallback } from 'react';
import { useOpenBB } from '@/lib/openbb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, RefreshCw, TrendingUp, TrendingDown, Target } from 'lucide-react';

const AnalystEstimates = () => {
  const { isConnected, fetchEstimates, fetchPriceTarget } = useOpenBB();
  const [symbol, setSymbol] = useState('AAPL');
  const [consensus, setConsensus] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleSearch = useCallback(async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    try {
      const [est, tgt] = await Promise.allSettled([
        fetchEstimates(symbol.toUpperCase()),
        fetchPriceTarget(symbol.toUpperCase()),
      ]);
      setConsensus(est.status === 'fulfilled' ? (Array.isArray(est.value) ? est.value[0] : est.value) : null);
      setTargets(tgt.status === 'fulfilled' ? (Array.isArray(tgt.value) ? tgt.value[0] : tgt.value) : null);
      setLastUpdated(new Date());
    } catch {
      // Mock data
      setConsensus({
        strongBuy: 12, buy: 8, hold: 5, sell: 2, strongSell: 1,
        targetConsensus: 198.50, targetHigh: 230, targetLow: 160, targetMean: 198.50,
      });
      setTargets({ targetConsensus: 198.50, targetHigh: 230, targetLow: 160, targetMean: 198.50 });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [symbol, fetchEstimates, fetchPriceTarget]);

  const totalAnalysts = consensus ? (consensus.strongBuy || 0) + (consensus.buy || 0) + (consensus.hold || 0) + (consensus.sell || 0) + (consensus.strongSell || 0) : 0;
  const buyPct = totalAnalysts > 0 ? ((consensus?.strongBuy || 0) + (consensus?.buy || 0)) / totalAnalysts * 100 : 0;
  const holdPct = totalAnalysts > 0 ? (consensus?.hold || 0) / totalAnalysts * 100 : 0;
  const sellPct = totalAnalysts > 0 ? ((consensus?.sell || 0) + (consensus?.strongSell || 0)) / totalAnalysts * 100 : 0;

  const currentPrice = 175; // placeholder
  const targetMean = targets?.targetMean || targets?.targetConsensus || 0;
  const upside = targetMean > 0 ? ((targetMean - currentPrice) / currentPrice * 100) : 0;

  // Mock EPS data
  const epsData = [
    { quarter: 'Q4 2024', estimate: 2.10, actual: 2.18, surprise: 0.08, pct: 3.8, beat: true },
    { quarter: 'Q3 2024', estimate: 1.95, actual: 1.92, surprise: -0.03, pct: -1.5, beat: false },
    { quarter: 'Q2 2024', estimate: 1.85, actual: 1.89, surprise: 0.04, pct: 2.2, beat: true },
    { quarter: 'Q1 2024', estimate: 1.72, actual: 1.78, surprise: 0.06, pct: 3.5, beat: true },
    { quarter: 'Q4 2023', estimate: 2.05, actual: 2.12, surprise: 0.07, pct: 3.4, beat: true },
    { quarter: 'Q3 2023', estimate: 1.88, actual: 1.85, surprise: -0.03, pct: -1.6, beat: false },
  ];

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono font-bold text-terminal-green tracking-wider">🎯 ANALYST ESTIMATES</h2>
          {!isConnected && <Badge variant="outline" className="text-[9px] font-mono border-terminal-amber/40 text-terminal-amber">⚠️ OBB OFFLINE</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-[9px] font-mono text-muted-foreground">Updated: {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago</span>}
          <Button variant="ghost" size="sm" onClick={handleSearch} disabled={loading} className="h-6 w-6 p-0">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input placeholder="Enter symbol..." value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-7 pl-7 text-xs bg-card border-border font-mono" />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={loading} className="h-7 text-xs font-mono bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/30">ANALYZE</Button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {!consensus && !targets ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs font-mono text-muted-foreground">NO DATA — Enter symbol and click ANALYZE</p>
          </div>
        ) : (
          <>
            {/* Consensus + Price Target Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Consensus Panel */}
              <div className="bg-card border border-border rounded p-3">
                <h3 className="text-[10px] font-mono text-muted-foreground mb-2">CONSENSUS RATING</h3>
                {/* Horizontal bar */}
                <div className="flex h-4 rounded overflow-hidden mb-2">
                  <div className="bg-terminal-green" style={{ width: `${buyPct}%` }} />
                  <div className="bg-terminal-amber" style={{ width: `${holdPct}%` }} />
                  <div className="bg-terminal-red" style={{ width: `${sellPct}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-terminal-green">BUY {(consensus?.strongBuy || 0) + (consensus?.buy || 0)}</span>
                  <span className="text-terminal-amber">HOLD {consensus?.hold || 0}</span>
                  <span className="text-terminal-red">SELL {(consensus?.sell || 0) + (consensus?.strongSell || 0)}</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-[9px] font-mono text-muted-foreground">{totalAnalysts} analysts</span>
                </div>
              </div>

              {/* Price Target Panel */}
              <div className="bg-card border border-border rounded p-3">
                <h3 className="text-[10px] font-mono text-muted-foreground mb-2">PRICE TARGET</h3>
                <div className="relative h-6 bg-muted rounded mb-2">
                  <div className="absolute top-0 left-0 h-full w-full flex items-center">
                    <div className="relative w-full px-2">
                      <div className="h-0.5 bg-border w-full" />
                      {/* Low */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-1" style={{ left: '5%' }}>
                        <div className="w-1.5 h-3 bg-terminal-red rounded-sm" />
                      </div>
                      {/* Current */}
                      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '40%' }}>
                        <div className="w-2 h-4 bg-terminal-cyan rounded-sm" />
                      </div>
                      {/* Mean */}
                      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '65%' }}>
                        <div className="w-2 h-4 bg-terminal-green rounded-sm" />
                      </div>
                      {/* High */}
                      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '95%' }}>
                        <div className="w-1.5 h-3 bg-terminal-amber rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
                  <span>Low ${targets?.targetLow || '-'}</span>
                  <span className="text-terminal-cyan">Current ${currentPrice}</span>
                  <span className="text-terminal-green">Avg ${targetMean || '-'}</span>
                  <span>High ${targets?.targetHigh || '-'}</span>
                </div>
                <div className="text-center mt-2">
                  <span className={`text-lg font-mono font-bold ${upside > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground ml-1">to consensus</span>
                </div>
              </div>
            </div>

            {/* EPS Estimates */}
            <Tabs defaultValue="eps" className="flex-1">
              <TabsList className="bg-muted/30 h-6">
                <TabsTrigger value="eps" className="text-[10px] font-mono">📊 EPS</TabsTrigger>
                <TabsTrigger value="revenue" className="text-[10px] font-mono">💰 REVENUE</TabsTrigger>
              </TabsList>
              <TabsContent value="eps" className="mt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[9px] font-mono text-muted-foreground h-7">QUARTER</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">EST</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">ACTUAL</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-right">SURPRISE</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground h-7 text-center">STATUS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {epsData.map((row, i) => (
                      <TableRow key={i} className="border-border hover:bg-terminal-green/5">
                        <TableCell className="text-[10px] font-mono py-1">{row.quarter}</TableCell>
                        <TableCell className="text-[10px] font-mono py-1 text-right">${row.estimate.toFixed(2)}</TableCell>
                        <TableCell className="text-[10px] font-mono py-1 text-right font-bold">${row.actual.toFixed(2)}</TableCell>
                        <TableCell className={`text-[10px] font-mono py-1 text-right ${row.beat ? 'text-terminal-green' : 'text-terminal-red'}`}>
                          {row.beat ? '+' : ''}{row.pct.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center py-1">
                          <Badge variant="outline" className={`text-[7px] font-mono ${row.beat ? 'border-terminal-green/40 text-terminal-green' : 'border-terminal-red/40 text-terminal-red'}`}>
                            {row.beat ? 'BEAT' : 'MISS'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="revenue" className="mt-2">
                <div className="text-center py-8 text-xs font-mono text-muted-foreground">Revenue estimates — same structure as EPS</div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalystEstimates;
