import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trade } from '@/utils/tradingMetrics';
import { Trash2, Edit3, ArrowUpDown, Search, Download, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradeListTabProps {
  trades: Trade[];
  onDeleteTrade: (id: string) => void;
  onCloseTrade: (id: string, exitPrice: number) => void;
  onEditTrade?: (trade: Trade) => void;
}

type SortField = 'date' | 'symbol' | 'pnl' | 'pnlPercentage' | 'side' | 'status';
type SortDirection = 'asc' | 'desc';

export default function TradeListTab({ trades, onDeleteTrade, onCloseTrade, onEditTrade }: TradeListTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'OPEN' | 'CLOSED'>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closePrice, setClosePrice] = useState('');
  
  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];
    
    // Filter by search query
    if (searchQuery) {
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.strategy.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    
    // Filter by side
    if (sideFilter !== 'all') {
      result = result.filter(t => t.side === sideFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'pnl':
          comparison = (a.pnl || 0) - (b.pnl || 0);
          break;
        case 'pnlPercentage':
          comparison = (a.pnlPercentage || 0) - (b.pnlPercentage || 0);
          break;
        case 'side':
          comparison = a.side.localeCompare(b.side);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [trades, searchQuery, statusFilter, sideFilter, sortField, sortDirection]);
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
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
    const headers = ['Date', 'Symbol', 'Side', 'Type', 'Entry', 'Exit', 'Qty', 'P&L', 'P&L %', 'Status', 'Strategy'];
    const rows = filteredAndSortedTrades.map(t => [
      t.date,
      t.symbol,
      t.side,
      t.type,
      t.entryPrice,
      t.exitPrice || '',
      t.quantity,
      t.pnl || '',
      t.pnlPercentage || '',
      t.status,
      t.strategy
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
    <Card className="border-terminal-green/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <CardTitle className="text-sm text-terminal-green flex items-center gap-2">
            รายการซื้อขาย ({filteredAndSortedTrades.length} trades)
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-[150px] text-xs"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sideFilter} onValueChange={(v: any) => setSideFilter(v)}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sides</SelectItem>
                <SelectItem value="LONG">Long</SelectItem>
                <SelectItem value="SHORT">Short</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0">
              <TableRow className="border-terminal-green/20">
                <TableHead 
                  className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('symbol')}
                >
                  <div className="flex items-center gap-1">
                    Symbol
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('side')}
                >
                  Side
                </TableHead>
                <TableHead className="text-terminal-amber font-bold">Entry</TableHead>
                <TableHead className="text-terminal-amber font-bold">Exit</TableHead>
                <TableHead className="text-terminal-amber font-bold">Qty</TableHead>
                <TableHead 
                  className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('pnl')}
                >
                  <div className="flex items-center justify-end gap-1">
                    P&L
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-terminal-amber font-bold text-right">P&L %</TableHead>
                <TableHead 
                  className="text-terminal-amber font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableHead>
                <TableHead className="text-terminal-amber font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No trades found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedTrades.map((trade) => (
                  <TableRow 
                    key={trade.id} 
                    className="border-border/10 hover:bg-accent/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs">{trade.date}</TableCell>
                    <TableCell className="font-bold">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={trade.side === 'LONG' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{trade.entryPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">
                      {closingTradeId === trade.id ? (
                        <div className="flex items-center gap-1">
                          <Input 
                            type="number"
                            value={closePrice}
                            onChange={(e) => setClosePrice(e.target.value)}
                            className="h-6 w-20 text-xs"
                            placeholder="Price"
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => handleCloseTrade(trade.id)}
                          >
                            ✓
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => { setClosingTradeId(null); setClosePrice(''); }}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        trade.exitPrice?.toFixed(2) || '—'
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{trade.quantity}</TableCell>
                    <TableCell className={`text-right font-bold ${
                      trade.pnl === undefined ? '' :
                      trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {trade.pnl !== undefined ? (trade.pnl >= 0 ? '+' : '') + trade.pnl.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell className={`text-right ${
                      trade.pnlPercentage === undefined ? '' :
                      trade.pnlPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {trade.pnlPercentage !== undefined ? (trade.pnlPercentage >= 0 ? '+' : '') + trade.pnlPercentage.toFixed(2) + '%' : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={trade.status === 'OPEN' 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }
                      >
                        {trade.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {trade.status === 'OPEN' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300"
                            onClick={() => setClosingTradeId(trade.id)}
                          >
                            Close
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          onClick={() => onDeleteTrade(trade.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
