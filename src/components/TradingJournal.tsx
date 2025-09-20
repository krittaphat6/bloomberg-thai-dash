import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Target, BarChart3, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import TradeAnalysisPanel from './TradeAnalysisPanel';
import { SectorBubbleChart } from './SectorBubbleChart';
import { AllocationSurfacePlot } from './AllocationSurfacePlot';
import ScatterChart from './ScatterChart';
import MarketPieChart from './MarketPieChart';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  position: 'Long' | 'Short';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  lotSize?: number;
  contractSize?: number;
  leverage?: number;
  pnl: number;
  pnlPercentage?: number;
  status: 'Open' | 'Closed';
  strategy: string;
  notes?: string;
  commission?: number;
  swap?: number;
  dividends?: number;
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
  maxDrawdown: number;
  sharpeRatio: number;
}

const chartConfig = {
  performance: {
    label: "Performance",
    color: "hsl(var(--trading-accent))",
  },
  pnl: {
    label: "P&L",
    color: "hsl(var(--trading-accent))",
  },
  cumulative: {
    label: "Cumulative P&L",
    color: "hsl(var(--trading-accent))",
  },
};

export default function TradingJournal() {
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    date: new Date().toISOString().split('T')[0],
    position: 'Long',
    type: 'STOCK',
    status: 'Open',
    strategy: '',
    size: 1,
    commission: 0,
    leverage: 1,
    lotSize: 1
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
    const closedTrades = trades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl < 0);
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    
    // Calculate max drawdown (simplified)
    let maxDrawdown = 0;
    let peak = 0;
    let runningPnL = 0;
    
    closedTrades.forEach(trade => {
      runningPnL += trade.pnl;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map(t => t.pnlPercentage || 0);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)) : 0;
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    
    return {
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      totalPnL,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
      maxDrawdown: -maxDrawdown,
      sharpeRatio
    };
  };

  const stats = calculateStats();

  const getTradesByMonth = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTrades = trades.filter(t => {
        const tradeDate = new Date(t.date);
        return tradeDate.getMonth() === date.getMonth() && 
               tradeDate.getFullYear() === date.getFullYear() &&
               t.status === 'Closed';
      });
      const monthPnL = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        trades: monthTrades.length,
        pnl: monthPnL
      });
    }
    return months.reverse();
  };

  const getDailyCumulativePnL = () => {
    const last30Days = [];
    const now = new Date();
    let cumulativePnL = 0;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTrades = trades.filter(t => t.date === dateStr && t.status === 'Closed');
      const dayPnL = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
      cumulativePnL += dayPnL;
      
      last30Days.push({
        date: date.getDate().toString(),
        cumulative: cumulativePnL,
        dailyPnL: dayPnL
      });
    }
    return last30Days;
  };

  const getZellaScore = () => {
    const profitFactor = Math.min(stats.profitFactor * 20, 100);
    const winRate = stats.winRate;
    const avgRisk = 85;
    const discipline = Math.min((stats.totalTrades / 30) * 100, 100);
    const resilience = Math.max(100 - (Math.abs(stats.largestLoss) / 1000 * 100), 0);
    
    return (profitFactor + winRate + avgRisk + discipline + resilience) / 5;
  };

  const getProfitFactorBySymbols = () => {
    const symbolStats = new Map();
    
    trades.filter(t => t.status === 'Closed').forEach(trade => {
      const symbol = trade.symbol;
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, { symbol, pnl: 0, trades: 0 });
      }
      const stats = symbolStats.get(symbol);
      stats.pnl += trade.pnl;
      stats.trades += 1;
    });
    
    return Array.from(symbolStats.values()).sort((a, b) => b.pnl - a.pnl);
  };

  const getLongShortBreakdown = () => {
    const closedTrades = trades.filter(t => t.status === 'Closed');
    const longTrades = closedTrades.filter(t => t.position === 'Long');
    const shortTrades = closedTrades.filter(t => t.position === 'Short');
    
    return [
      {
        type: 'Long',
        count: longTrades.length,
        avgPnL: longTrades.length > 0 ? longTrades.reduce((sum, t) => sum + t.pnl, 0) / longTrades.length : 0
      },
      {
        type: 'Short',
        count: shortTrades.length,
        avgPnL: shortTrades.length > 0 ? shortTrades.reduce((sum, t) => sum + t.pnl, 0) / shortTrades.length : 0
      }
    ];
  };

  // Generate calendar data
  const calendarData = trades.filter(t => t.status === 'Closed').map(trade => ({
    date: new Date(trade.date),
    pnl: trade.pnl
  }));

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
      position: newTrade.position || 'Long',
      type: newTrade.type || 'STOCK',
      entryPrice: newTrade.entryPrice!,
      size: newTrade.size || 1,
      lotSize: newTrade.lotSize,
      contractSize: newTrade.contractSize,
      leverage: newTrade.leverage || 1,
      status: newTrade.status || 'Open',
      strategy: newTrade.strategy!,
      notes: newTrade.notes,
      commission: newTrade.commission || 0,
      swap: newTrade.swap,
      dividends: newTrade.dividends,
      pnl: 0
    };

    setTrades([...trades, trade]);
    setNewTrade({
      date: new Date().toISOString().split('T')[0],
      position: 'Long',
      type: 'STOCK',
      status: 'Open',
      strategy: '',
      size: 1,
      commission: 0,
      leverage: 1,
      lotSize: 1
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Trade added successfully"
    });
  };

  const handleCloseTrade = (tradeId: string) => {
    const exitPrice = prompt("Enter exit price:");
    if (!exitPrice) return;
    
    setTrades(trades.map(trade => {
      if (trade.id === tradeId) {
        const exit = parseFloat(exitPrice);
        let pnl = 0;
        
        if (trade.position === 'Long') {
          pnl = (exit - trade.entryPrice) * trade.size;
        } else {
          pnl = (trade.entryPrice - exit) * trade.size;
        }
        
        pnl -= (trade.commission || 0);
        
        return {
          ...trade,
          exitPrice: exit,
          pnl,
          pnlPercentage: ((exit - trade.entryPrice) / trade.entryPrice) * 100,
          status: 'Closed' as const
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

  return (
    <div className="min-h-screen bg-[hsl(var(--trading-dark))] text-[hsl(var(--trading-text))]">
      {/* Header */}
      <div className="bg-[hsl(var(--trading-darker))] border-b border-[hsl(var(--trading-border))] px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[hsl(var(--trading-text))]">Trading Journal</h1>
            <p className="text-sm text-[hsl(var(--trading-muted))]">Professional trading analytics platform</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(var(--trading-accent))] hover:bg-[hsl(var(--trading-accent))]/90 text-white flex items-center gap-2 px-4 py-2 text-sm">
                <Plus className="w-4 h-4" />
                Add Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[hsl(var(--trading-surface))] border-[hsl(var(--trading-border))]">
              <DialogHeader>
                <DialogTitle className="text-[hsl(var(--trading-text))]">Add New Trade</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[hsl(var(--trading-text))]">Symbol</Label>
                  <Input 
                    value={newTrade.symbol || ''} 
                    onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})}
                    className="bg-[hsl(var(--trading-darker))] border-[hsl(var(--trading-border))] text-[hsl(var(--trading-text))]"
                  />
                </div>
                <div>
                  <Label className="text-[hsl(var(--trading-text))]">Entry Price</Label>
                  <Input 
                    type="number" 
                    value={newTrade.entryPrice || ''} 
                    onChange={(e) => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})}
                    className="bg-[hsl(var(--trading-darker))] border-[hsl(var(--trading-border))] text-[hsl(var(--trading-text))]"
                  />
                </div>
                <div>
                  <Label className="text-[hsl(var(--trading-text))]">Position</Label>
                  <Select value={newTrade.position} onValueChange={(value: 'Long' | 'Short') => setNewTrade({...newTrade, position: value})}>
                    <SelectTrigger className="bg-[hsl(var(--trading-darker))] border-[hsl(var(--trading-border))] text-[hsl(var(--trading-text))]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Long">Long</SelectItem>
                      <SelectItem value="Short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[hsl(var(--trading-text))]">Size</Label>
                  <Input 
                    type="number" 
                    value={newTrade.size || ''} 
                    onChange={(e) => setNewTrade({...newTrade, size: parseFloat(e.target.value)})}
                    className="bg-[hsl(var(--trading-darker))] border-[hsl(var(--trading-border))] text-[hsl(var(--trading-text))]"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[hsl(var(--trading-text))]">Strategy</Label>
                  <Input 
                    value={newTrade.strategy || ''} 
                    onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})}
                    className="bg-[hsl(var(--trading-darker))] border-[hsl(var(--trading-border))] text-[hsl(var(--trading-text))]"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[hsl(var(--trading-text))]">Notes</Label>
                  <Textarea 
                    value={newTrade.notes || ''} 
                    onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
                    className="bg-[hsl(var(--trading-darker))] border-[hsl(var(--trading-border))] text-[hsl(var(--trading-text))]"
                  />
                </div>
              </div>
              <Button onClick={handleAddTrade} className="bg-[hsl(var(--trading-accent))] hover:bg-[hsl(var(--trading-accent))]/90 text-white">
                Add Trade
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--trading-muted))] uppercase tracking-wide">Total P&L</p>
                <p className={`text-xl font-semibold mt-1 ${stats.totalPnL >= 0 ? 'text-[hsl(var(--trading-success))]' : 'text-[hsl(var(--trading-danger))]'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-[hsl(var(--trading-accent))]" />
            </div>
          </div>

          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--trading-muted))] uppercase tracking-wide">Win Rate</p>
                <p className="text-xl font-semibold mt-1 text-[hsl(var(--trading-success))]">{stats.winRate.toFixed(1)}%</p>
              </div>
              <Target className="w-6 h-6 text-[hsl(var(--trading-success))]" />
            </div>
          </div>

          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--trading-muted))] uppercase tracking-wide">Profit Factor</p>
                <p className="text-xl font-semibold mt-1 text-[hsl(var(--trading-accent))]">{stats.profitFactor.toFixed(2)}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-[hsl(var(--trading-accent))]" />
            </div>
          </div>

          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--trading-muted))] uppercase tracking-wide">Total Trades</p>
                <p className="text-xl font-semibold mt-1 text-[hsl(var(--trading-warning))]">{trades.length}</p>
              </div>
              <Activity className="w-6 h-6 text-[hsl(var(--trading-warning))]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard - 3 Column Layout */}
      <div className="px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Trading Calendar */}
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Trading Calendar</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full"
              modifiers={{
                profit: calendarData.filter(d => d.pnl > 0).map(d => d.date),
                loss: calendarData.filter(d => d.pnl < 0).map(d => d.date),
              }}
              modifiersStyles={{
                profit: { backgroundColor: 'hsl(var(--trading-success))', color: 'white' },
                loss: { backgroundColor: 'hsl(var(--trading-danger))', color: 'white' },
              }}
            />
          </div>

          {/* Daily Cumulative P&L Chart */}
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Daily P&L Performance</h3>
            <ChartContainer config={chartConfig} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getDailyCumulativePnL()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--trading-border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--trading-muted))" fontSize={10} />
                  <YAxis stroke="hsl(var(--trading-muted))" fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(var(--trading-accent))"
                    fill="url(#colorGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--trading-accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--trading-accent))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Zella Score + Quick Stats */}
          <div className="space-y-4">
            <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Zella Score</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(var(--trading-accent))]">
                  {getZellaScore().toFixed(0)}
                </div>
                <p className="text-xs text-[hsl(var(--trading-muted))]">Trading Performance Index</p>
              </div>
            </div>
            
            <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Quick Stats</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--trading-muted))]">Avg Win</span>
                  <span className="text-[hsl(var(--trading-success))]">${stats.avgWin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--trading-muted))]">Avg Loss</span>
                  <span className="text-[hsl(var(--trading-danger))]">${Math.abs(stats.avgLoss).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--trading-muted))]">Max Drawdown</span>
                  <span className="text-[hsl(var(--trading-danger))]">${Math.abs(stats.maxDrawdown).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--trading-muted))]">Sharpe Ratio</span>
                  <span className="text-[hsl(var(--trading-accent))]">{stats.sharpeRatio.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analysis Section */}
      <div className="px-6">
        <h2 className="text-lg font-semibold text-[hsl(var(--trading-text))] mb-4 uppercase tracking-wide">Performance Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SectorBubbleChart trades={trades} />
          <AllocationSurfacePlot trades={trades} />
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="px-6">
        <h2 className="text-lg font-semibold text-[hsl(var(--trading-text))] mb-4 uppercase tracking-wide">Advanced Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Radar Chart */}
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Performance Radar</h3>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { subject: 'Profitability', A: (stats.profitFactor - 1) * 50, fullMark: 100 },
                  { subject: 'Consistency', A: stats.winRate, fullMark: 100 },
                  { subject: 'Risk Mgmt', A: Math.max(0, 100 - Math.abs(stats.maxDrawdown)), fullMark: 100 },
                  { subject: 'Frequency', A: Math.min(100, trades.length * 2), fullMark: 100 },
                  { subject: 'Expectancy', A: Math.max(0, (stats.avgWin + stats.avgLoss) * 10), fullMark: 100 },
                  { subject: 'Sharpe', A: Math.max(0, stats.sharpeRatio * 25), fullMark: 100 }
                ]}>
                  <PolarGrid stroke="hsl(var(--trading-border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--trading-muted))', fontSize: 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--trading-muted))', fontSize: 8 }} />
                  <Radar name="Performance" dataKey="A" stroke="hsl(var(--trading-accent))" fill="hsl(var(--trading-accent))" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Monthly P&L Chart */}
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Monthly P&L</h3>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getTradesByMonth()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--trading-border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--trading-muted))" fontSize={10} />
                  <YAxis stroke="hsl(var(--trading-muted))" fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pnl" radius={2}>
                    {getTradesByMonth().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'hsl(var(--trading-success))' : 'hsl(var(--trading-danger))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Risk vs Return Scatter */}
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Risk vs Return</h3>
            <ScatterChart trades={trades} />
          </div>
        </div>
      </div>

      {/* Asset Breakdown Section */}
      <div className="px-6">
        <h2 className="text-lg font-semibold text-[hsl(var(--trading-text))] mb-4 uppercase tracking-wide">Asset Breakdown</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Asset Distribution</h3>
            <MarketPieChart trades={trades} />
          </div>

          <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--trading-text))] mb-3 uppercase tracking-wide">Top Performing Assets</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {getProfitFactorBySymbols().slice(0, 10).map((item, index) => (
                <div key={item.symbol} className="flex items-center justify-between p-2 bg-[hsl(var(--trading-darker))] rounded border border-[hsl(var(--trading-border))]/50">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-[hsl(var(--trading-accent))]/20 flex items-center justify-center text-xs font-medium text-[hsl(var(--trading-accent))]">
                      {index + 1}
                    </div>
                    <span className="font-medium text-[hsl(var(--trading-text))] text-sm">{item.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${item.pnl >= 0 ? 'text-[hsl(var(--trading-success))]' : 'text-[hsl(var(--trading-danger))]'}`}>
                      ${item.pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-[hsl(var(--trading-muted))]">
                      {item.trades} trades
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="px-6 pb-6">
        <div className="bg-[hsl(var(--trading-surface))] border border-[hsl(var(--trading-border))] rounded-lg">
          <div className="p-4 border-b border-[hsl(var(--trading-border))]">
            <h2 className="text-lg font-semibold text-[hsl(var(--trading-text))] uppercase tracking-wide">Trade History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--trading-border))]">
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Symbol</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Type</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Entry</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Exit</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Size</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">P&L</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Status</th>
                  <th className="text-left p-3 text-xs font-semibold text-[hsl(var(--trading-muted))] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[hsl(var(--trading-border))]/50 hover:bg-[hsl(var(--trading-darker))]/50">
                    <td className="p-3 text-sm font-medium text-[hsl(var(--trading-text))]">{trade.symbol}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        trade.position === 'Long' 
                          ? 'bg-[hsl(var(--trading-success))]/20 text-[hsl(var(--trading-success))]' 
                          : 'bg-[hsl(var(--trading-danger))]/20 text-[hsl(var(--trading-danger))]'
                      }`}>
                        {trade.position}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-[hsl(var(--trading-text))]">${trade.entryPrice.toFixed(4)}</td>
                    <td className="p-3 text-sm text-[hsl(var(--trading-text))]">
                      {trade.exitPrice ? `$${trade.exitPrice.toFixed(4)}` : '-'}
                    </td>
                    <td className="p-3 text-sm text-[hsl(var(--trading-text))]">{trade.size}</td>
                    <td className="p-3">
                      <span className={`text-sm font-medium ${
                        trade.pnl > 0 ? 'text-[hsl(var(--trading-success))]' : 
                        trade.pnl < 0 ? 'text-[hsl(var(--trading-danger))]' : 'text-[hsl(var(--trading-muted))]'
                      }`}>
                        ${trade.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        trade.status === 'Closed' 
                          ? 'bg-[hsl(var(--trading-muted))]/20 text-[hsl(var(--trading-text))]' 
                          : 'bg-[hsl(var(--trading-warning))]/20 text-[hsl(var(--trading-warning))]'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {trade.status === 'Open' && (
                          <Button
                            onClick={() => handleCloseTrade(trade.id)}
                            size="sm"
                            className="bg-[hsl(var(--trading-accent))] hover:bg-[hsl(var(--trading-accent))]/90 text-white text-xs px-2 py-1"
                          >
                            Close
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteTrade(trade.id)}
                          variant="destructive"
                          size="sm"
                          className="bg-[hsl(var(--trading-danger))] hover:bg-[hsl(var(--trading-danger))]/90 text-white text-xs px-2 py-1"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}