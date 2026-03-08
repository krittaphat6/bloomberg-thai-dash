import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trade } from '@/utils/tradingMetrics';
import { Trash2, ArrowUpDown, Search, Download, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradeListTabProps {
  trades: Trade[];
  onDeleteTrade: (id: string) => void;
  onCloseTrade: (id: string, exitPrice: number) => void;
  onEditTrade?: (trade: Trade) => void;
}

type SortField = 'date' | 'symbol' | 'pnl' | 'pnlPercentage' | 'side' | 'status';
type SortDirection = 'asc' | 'desc';

export default function TradeListTab({ trades, onDeleteTrade, onCloseTrade }: TradeListTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'CLOSED'>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closePrice, setClosePrice] = useState('');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];
    if (searchQuery) {
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.setup || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (sideFilter !== 'all') result = result.filter(t => t.side === sideFilter);
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date': comparison = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
        case 'symbol': comparison = a.symbol.localeCompare(b.symbol); break;
        case 'pnl': comparison = (a.pnl || 0) - (b.pnl || 0); break;
        case 'pnlPercentage': comparison = (a.pnlPercentage || 0) - (b.pnlPercentage || 0); break;
        case 'side': comparison = a.side.localeCompare(b.side); break;
        case 'status': comparison = a.status.localeCompare(b.status); break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [trades, searchQuery, statusFilter, sideFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedTrades.length / pageSize);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedTrades.slice(start, start + pageSize);
  }, [filteredAndSortedTrades, currentPage]);

  // Reset page when filters change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sideFilter]);
  
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };
  
  const handleCloseTrade = (tradeId: string) => {
    const price = parseFloat(closePrice);
    if (!isNaN(price) && price > 0) {
      onCloseTrade(tradeId, price);
      setClosingTradeId(null);
      setClosePrice('');
    }
  };
  
  const exportToCSV = () => {
    const headers = ['Date', 'Symbol', 'Side', 'Type', 'Entry', 'Exit', 'SL', 'TP', 'Qty', 'P&L', 'P&L %', 'Status', 'Strategy', 'Setup', 'R-Multiple'];
    const rows = filteredAndSortedTrades.map(t => [
      t.date, t.symbol, t.side, t.type, t.entryPrice, t.exitPrice || '',
      t.stopLoss || '', t.takeProfit || '', t.quantity, t.pnl || '', t.pnlPercentage || '',
      t.status, t.strategy, t.setup || '', t.rMultiple || ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  return (
    <>
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <CardTitle className="text-sm text-terminal-green flex items-center gap-2">
              รายการซื้อขาย ({filteredAndSortedTrades.length} trades)
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search symbol..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 w-[150px] text-xs" />
              </div>
              <Select value={statusFilter} onValueChange={(v: 'all' | 'OPEN' | 'CLOSED') => setStatusFilter(v)}>
                <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sideFilter} onValueChange={(v: 'all' | 'LONG' | 'SHORT') => setSideFilter(v)}>
                <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sides</SelectItem>
                  <SelectItem value="LONG">Long</SelectItem>
                  <SelectItem value="SHORT">Short</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8">
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0">
                <TableRow className="border-border/20">
                  <TableHead className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50 w-8" />
                  <TableHead className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50" onClick={() => handleSort('symbol')}>
                    <div className="flex items-center gap-1">Symbol <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-terminal-amber font-bold">Side</TableHead>
                  <TableHead className="text-terminal-amber font-bold">Entry</TableHead>
                  <TableHead className="text-terminal-amber font-bold">Exit</TableHead>
                  <TableHead className="text-terminal-amber font-bold">SL</TableHead>
                  <TableHead className="text-terminal-amber font-bold">TP</TableHead>
                  <TableHead className="text-terminal-amber font-bold">Qty</TableHead>
                  <TableHead className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort('pnl')}>
                    <div className="flex items-center justify-end gap-1">P&L <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="text-terminal-amber font-bold text-right">P&L %</TableHead>
                  <TableHead className="text-terminal-amber font-bold">R</TableHead>
                  <TableHead className="text-terminal-amber font-bold">Setup</TableHead>
                  <TableHead className="text-terminal-amber font-bold">Status</TableHead>
                  <TableHead className="text-terminal-amber font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrades.length === 0 ? (
                  <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-8">No trades found</TableCell></TableRow>
                ) : (
                  paginatedTrades.map((trade) => (
                    <React.Fragment key={trade.id}>
                      <TableRow 
                        key={trade.id} 
                        className={`border-border/10 hover:bg-accent/30 transition-colors cursor-pointer ${
                          trade.followedPlan === false ? 'bg-red-500/5' : trade.followedPlan === true ? 'bg-emerald-500/5' : ''
                        }`}
                        onClick={() => setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id)}
                      >
                        <TableCell className="p-1">
                          {expandedTradeId === trade.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{trade.date}</TableCell>
                        <TableCell className="font-bold">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={trade.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{trade.entryPrice.toFixed(2)}</TableCell>
                        <TableCell className="font-mono">
                          {closingTradeId === trade.id ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Input type="number" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} className="h-6 w-20 text-xs" placeholder="Price" autoFocus />
                              <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleCloseTrade(trade.id)}>✓</Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setClosingTradeId(null); setClosePrice(''); }}>✕</Button>
                            </div>
                          ) : (trade.exitPrice?.toFixed(2) || '—')}
                        </TableCell>
                        <TableCell className="font-mono text-red-400/70 text-xs">{trade.stopLoss?.toFixed(2) || '—'}</TableCell>
                        <TableCell className="font-mono text-emerald-400/70 text-xs">{trade.takeProfit?.toFixed(2) || '—'}</TableCell>
                        <TableCell className="font-mono">{trade.quantity}</TableCell>
                        <TableCell className={`text-right font-bold ${trade.pnl === undefined ? '' : trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnl !== undefined ? (trade.pnl >= 0 ? '+' : '') + trade.pnl.toFixed(2) : '—'}
                        </TableCell>
                        <TableCell className={`text-right ${trade.pnlPercentage === undefined ? '' : trade.pnlPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade.pnlPercentage !== undefined ? (trade.pnlPercentage >= 0 ? '+' : '') + trade.pnlPercentage.toFixed(2) + '%' : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {trade.rMultiple !== undefined ? (
                            <span className={trade.rMultiple >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple.toFixed(2)}R
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{trade.setup || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={trade.status === 'OPEN' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}>
                            {trade.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {trade.screenshots && trade.screenshots.length > 0 && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-cyan-400" onClick={() => setPreviewImage(trade.screenshots![0])}>
                                <Image className="h-3 w-3" />
                              </Button>
                            )}
                            {trade.status === 'OPEN' && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300" onClick={() => setClosingTradeId(trade.id)}>Close</Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => onDeleteTrade(trade.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded Details */}
                      {expandedTradeId === trade.id && (
                        <TableRow key={`${trade.id}-detail`} className="bg-muted/10 border-border/10">
                          <TableCell colSpan={15} className="p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">Strategy:</span>
                                <span className="ml-2 font-mono">{trade.strategy || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Timeframe:</span>
                                <span className="ml-2 font-mono">{trade.timeframe || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Session:</span>
                                <span className="ml-2 font-mono">{trade.session || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Emotion:</span>
                                <span className="ml-2">{trade.emotion || '—'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Confidence:</span>
                                <span className="ml-2 font-mono">{trade.confidence ?? '—'}/10</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Followed Plan:</span>
                                <span className={`ml-2 ${trade.followedPlan ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {trade.followedPlan === undefined ? '—' : trade.followedPlan ? '✓ Yes' : '✕ No'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Discipline:</span>
                                <span className={`ml-2 font-bold ${
                                  trade.disciplineRating === 'A' ? 'text-emerald-400' :
                                  trade.disciplineRating === 'B' ? 'text-cyan-400' :
                                  trade.disciplineRating === 'C' ? 'text-amber-400' :
                                  trade.disciplineRating === 'D' ? 'text-orange-400' :
                                  trade.disciplineRating === 'F' ? 'text-red-400' : ''
                                }`}>
                                  {trade.disciplineRating || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Initial Risk:</span>
                                <span className="ml-2 font-mono">{trade.initialRisk ? `$${trade.initialRisk.toFixed(2)}` : '—'}</span>
                              </div>
                              {trade.notes && (
                                <div className="col-span-full">
                                  <span className="text-muted-foreground">Notes:</span>
                                  <p className="mt-1 text-foreground">{trade.notes}</p>
                                </div>
                              )}
                              {trade.mistakes && trade.mistakes.length > 0 && (
                                <div className="col-span-full">
                                  <span className="text-muted-foreground">Mistakes:</span>
                                  <div className="flex gap-1 mt-1">
                                    {trade.mistakes.map(m => (
                                      <Badge key={m} variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                                        {m.replace('_', ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {trade.screenshots && trade.screenshots.length > 0 && (
                                <div className="col-span-full">
                                  <span className="text-muted-foreground block mb-2">📸 Screenshots:</span>
                                  <div className="flex gap-2 flex-wrap">
                                    {trade.screenshots.map((url, i) => (
                                      <img 
                                        key={i} 
                                        src={url} 
                                        alt={`Trade ${trade.symbol} screenshot`}
                                        className="h-24 rounded border border-border/30 cursor-pointer hover:border-terminal-green/50 transition-colors object-cover"
                                        onClick={() => setPreviewImage(url)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* MFE/MAE */}
                              {(trade.mfe !== undefined || trade.mae !== undefined) && (
                                <>
                                  <div>
                                    <span className="text-muted-foreground">MFE:</span>
                                    <span className="ml-2 font-mono text-emerald-400">{trade.mfe?.toFixed(2) || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">MAE:</span>
                                    <span className="ml-2 font-mono text-red-400">{trade.mae?.toFixed(2) || '—'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Trade Screenshot</DialogTitle></DialogHeader>
          {previewImage && (
            <img src={previewImage} alt="Trade screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
