import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  notes?: string;
  tags?: string[];
  riskReward?: number;
  commission?: number;
}

interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}

export default function TradingJournal() {
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    date: new Date().toISOString().split('T')[0],
    side: 'LONG',
    status: 'OPEN',
    strategy: '',
    quantity: 1,
    commission: 0
  });

  // Load trades from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradingJournal');
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem('tradingJournal', JSON.stringify(trades));
  }, [trades]);

  const calculateStats = (): TradingStats => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    const wins = closedTrades.filter(t => t.pnl! > 0);
    const losses = closedTrades.filter(t => t.pnl! < 0);
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWins = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    return {
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      totalPnL,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl || 0)) : 0
    };
  };

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.entryPrice || !newTrade.strategy) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const trade: Trade = {
      id: Date.now().toString(),
      date: newTrade.date || new Date().toISOString().split('T')[0],
      symbol: newTrade.symbol!,
      side: newTrade.side || 'LONG',
      entryPrice: newTrade.entryPrice!,
      quantity: newTrade.quantity || 1,
      status: newTrade.status || 'OPEN',
      strategy: newTrade.strategy!,
      notes: newTrade.notes,
      commission: newTrade.commission || 0
    };

    setTrades([...trades, trade]);
    setNewTrade({
      date: new Date().toISOString().split('T')[0],
      side: 'LONG',
      status: 'OPEN',
      strategy: '',
      quantity: 1,
      commission: 0
    });
    setIsAddingTrade(false);
    
    toast({
      title: "Success",
      description: "Trade added successfully"
    });
  };

  const handleCloseTrade = (tradeId: string, exitPrice: number) => {
    setTrades(trades.map(trade => {
      if (trade.id === tradeId) {
        const pnl = trade.side === 'LONG' 
          ? (exitPrice - trade.entryPrice) * trade.quantity - (trade.commission || 0)
          : (trade.entryPrice - exitPrice) * trade.quantity - (trade.commission || 0);
        const pnlPercentage = (pnl / (trade.entryPrice * trade.quantity)) * 100;
        
        return {
          ...trade,
          exitPrice,
          pnl,
          pnlPercentage,
          status: 'CLOSED' as const
        };
      }
      return trade;
    }));
  };

  const handleDeleteTrade = (tradeId: string) => {
    setTrades(trades.filter(t => t.id !== tradeId));
    toast({
      title: "Trade Deleted",
      description: "Trade has been removed from journal"
    });
  };

  const stats = calculateStats();

  return (
    <div className="w-full h-full flex flex-col bg-background p-4 space-y-4 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Trading Journal</h2>
        <Button onClick={() => setIsAddingTrade(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Trade
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.totalPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profitFactor.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Trade Form */}
      {isAddingTrade && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Trade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newTrade.date}
                  onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="AAPL, TSLA, etc."
                  value={newTrade.symbol || ''}
                  onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="side">Side</Label>
                <Select value={newTrade.side} onValueChange={(value: 'LONG' | 'SHORT') => setNewTrade({...newTrade, side: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">LONG</SelectItem>
                    <SelectItem value="SHORT">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="entryPrice">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.01"
                  value={newTrade.entryPrice || ''}
                  onChange={(e) => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newTrade.quantity || ''}
                  onChange={(e) => setNewTrade({...newTrade, quantity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Input
                  id="strategy"
                  placeholder="Breakout, Support/Resistance, etc."
                  value={newTrade.strategy || ''}
                  onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Trade rationale, market conditions, etc."
                value={newTrade.notes || ''}
                onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddTrade}>Add Trade</Button>
              <Button variant="outline" onClick={() => setIsAddingTrade(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trades Table */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>{trade.date}</TableCell>
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={trade.side === 'LONG' ? 'default' : 'secondary'}>
                      {trade.side === 'LONG' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {trade.side}
                    </Badge>
                  </TableCell>
                  <TableCell>${trade.entryPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    {trade.status === 'CLOSED' ? (
                      `$${trade.exitPrice?.toFixed(2)}`
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Exit price"
                        className="w-24"
                        onBlur={(e) => {
                          const exitPrice = parseFloat(e.target.value);
                          if (exitPrice > 0) {
                            handleCloseTrade(trade.id, exitPrice);
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{trade.quantity}</TableCell>
                  <TableCell>
                    {trade.pnl !== undefined ? (
                      <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${trade.pnl.toFixed(2)} ({trade.pnlPercentage?.toFixed(1)}%)
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={trade.status === 'OPEN' ? 'destructive' : 'default'}>
                      {trade.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{trade.strategy}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTrade(trade.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {trades.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No trades recorded yet. Add your first trade to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}