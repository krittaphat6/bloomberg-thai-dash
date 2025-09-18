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
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK'; // New field for trade type
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  lotSize?: number; // For CFD trades
  contractSize?: number; // For CFD trades
  leverage?: number; // For CFD trades
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  notes?: string;
  tags?: string[];
  riskReward?: number;
  commission?: number;
  swap?: number; // For CFD overnight fees
  dividends?: number; // For stock dividends
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
    type: 'STOCK',
    status: 'OPEN',
    strategy: '',
    quantity: 1,
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

  const getTradesByMonth = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTrades = trades.filter(t => {
        const tradeDate = new Date(t.date);
        return tradeDate.getMonth() === date.getMonth() && 
               tradeDate.getFullYear() === date.getFullYear() &&
               t.status === 'CLOSED';
      });
      const monthPnL = monthTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        trades: monthTrades.length,
        pnl: monthPnL
      });
    }
    return months.reverse();
  };

  const generateCalendarData = () => {
    const calendarData = [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = date.toISOString().split('T')[0];
      const dayTrades = trades.filter(t => t.date === dateStr && t.status === 'CLOSED');
      const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      calendarData.push({
        date: d,
        trades: dayTrades.length,
        pnl: dayPnL,
        dateStr
      });
    }
    return calendarData;
  };

  const getZellaScore = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    if (closedTrades.length === 0) return [];
    
    const profitFactor = Math.min(stats.profitFactor * 20, 100);
    const winRate = stats.winRate;
    const avgRisk = 85; // Simulated - would calculate from position sizing
    const discipline = Math.min((stats.totalTrades / 30) * 100, 100); // More trades = more discipline
    const resilience = Math.max(100 - (Math.abs(stats.largestLoss) / 1000 * 100), 0);
    
    return [
      { metric: 'Profit Factor', value: profitFactor },
      { metric: 'Risk', value: avgRisk },
      { metric: 'Discipline', value: discipline },
      { metric: 'Resilience', value: resilience },
      { metric: 'Win %', value: winRate }
    ];
  };

  const getDailyCumulativePnL = () => {
    const last30Days = [];
    const now = new Date();
    let cumulativePnL = 0;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTrades = trades.filter(t => t.date === dateStr && t.status === 'CLOSED');
      const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      cumulativePnL += dayPnL;
      
      last30Days.push({
        date: date.getDate(),
        pnl: cumulativePnL,
        dailyPnL: dayPnL
      });
    }
    return last30Days;
  };

  const stats = calculateStats();
  const zellaScore = getZellaScore();
  const overallScore = zellaScore.length > 0 ? Math.round(zellaScore.reduce((sum, item) => sum + item.value, 0) / zellaScore.length) : 0;

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
      type: newTrade.type || 'STOCK',
      entryPrice: newTrade.entryPrice!,
      quantity: newTrade.quantity || 1,
      lotSize: newTrade.lotSize,
      contractSize: newTrade.contractSize,
      leverage: newTrade.leverage || 1,
      status: newTrade.status || 'OPEN',
      strategy: newTrade.strategy!,
      notes: newTrade.notes,
      commission: newTrade.commission || 0,
      swap: newTrade.swap,
      dividends: newTrade.dividends
    };

    setTrades([...trades, trade]);
    setNewTrade({
      date: new Date().toISOString().split('T')[0],
      side: 'LONG',
      type: 'STOCK',
      status: 'OPEN',
      strategy: '',
      quantity: 1,
      commission: 0,
      leverage: 1,
      lotSize: 1
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
        let pnl = 0;
        let pnlPercentage = 0;
        
        if (trade.type === 'CFD') {
          // CFD P&L calculation with lot size and contract size
          const lotSize = trade.lotSize || 1;
          const contractSize = trade.contractSize || 100000; // Default for forex
          const pointValue = contractSize * lotSize;
          
          if (trade.side === 'LONG') {
            pnl = (exitPrice - trade.entryPrice) * pointValue;
          } else {
            pnl = (trade.entryPrice - exitPrice) * pointValue;
          }
          
          // Add swap and commission for CFD
          pnl -= (trade.commission || 0);
          pnl += (trade.swap || 0);
          
          // Calculate percentage based on margin used (with leverage)
          const marginUsed = (trade.entryPrice * pointValue) / (trade.leverage || 1);
          pnlPercentage = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0;
        } else {
          // Stock P&L calculation
          if (trade.side === 'LONG') {
            pnl = (exitPrice - trade.entryPrice) * trade.quantity;
          } else {
            pnl = (trade.entryPrice - exitPrice) * trade.quantity;
          }
          
          pnl -= (trade.commission || 0);
          pnl += (trade.dividends || 0);
          
          // Calculate percentage based on total investment
          const totalInvestment = trade.entryPrice * trade.quantity;
          pnlPercentage = totalInvestment > 0 ? (pnl / totalInvestment) * 100 : 0;
        }
        
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

  // Calculate profit factor by symbols
  const getProfitFactorBySymbols = () => {
    const symbolStats = new Map();
    
    trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(trade => {
      const symbol = trade.symbol;
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, {
          symbol,
          type: trade.type,
          totalWins: 0,
          totalLosses: 0,
          winCount: 0,
          lossCount: 0,
          totalTrades: 0
        });
      }
      
      const stats = symbolStats.get(symbol);
      stats.totalTrades++;
      
      if (trade.pnl! > 0) {
        stats.totalWins += trade.pnl!;
        stats.winCount++;
      } else {
        stats.totalLosses += Math.abs(trade.pnl!);
        stats.lossCount++;
      }
    });
    
    return Array.from(symbolStats.values()).map(stats => ({
      ...stats,
      profitFactor: stats.totalLosses > 0 ? stats.totalWins / stats.totalLosses : stats.totalWins > 0 ? 999 : 0,
      winRate: stats.totalTrades > 0 ? (stats.winCount / stats.totalTrades) * 100 : 0
    })).sort((a, b) => b.profitFactor - a.profitFactor);
  };

  // Get Long vs Short breakdown
  const getLongShortBreakdown = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const longTrades = closedTrades.filter(t => t.side === 'LONG');
    const shortTrades = closedTrades.filter(t => t.side === 'SHORT');
    
    return {
      long: {
        count: longTrades.length,
        percentage: closedTrades.length > 0 ? (longTrades.length / closedTrades.length) * 100 : 0,
        pnl: longTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      },
      short: {
        count: shortTrades.length,
        percentage: closedTrades.length > 0 ? (shortTrades.length / closedTrades.length) * 100 : 0,
        pnl: shortTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      }
    };
  };

  // Get asset grouping with CFD/Stock breakdown
  const getAssetGrouping = () => {
    const groups = new Map();
    
    trades.forEach(trade => {
      const baseSymbol = trade.symbol.replace(/[0-9]/g, ''); // Remove numbers for grouping
      if (!groups.has(baseSymbol)) {
        groups.set(baseSymbol, {
          symbol: baseSymbol,
          cfd: { count: 0, pnl: 0, trades: [] },
          stock: { count: 0, pnl: 0, trades: [] }
        });
      }
      
      const group = groups.get(baseSymbol);
      if (trade.type === 'CFD') {
        group.cfd.count++;
        group.cfd.pnl += trade.pnl || 0;
        group.cfd.trades.push(trade);
      } else {
        group.stock.count++;
        group.stock.pnl += trade.pnl || 0;
        group.stock.trades.push(trade);
      }
    });
    
    return Array.from(groups.values());
  };

  const handleDeleteTrade = (tradeId: string) => {
    setTrades(trades.filter(t => t.id !== tradeId));
    toast({
      title: "Trade Deleted",
      description: "Trade has been removed from journal"
    });
  };

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Net P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ${stats.totalPnL.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Trade Expectancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ${((stats.avgWin * stats.winRate/100) - (stats.avgLoss * (100-stats.winRate)/100)).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Per trade</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">{stats.profitFactor.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 relative">
                <div 
                  className="absolute top-0 left-0 w-full h-full rounded-full bg-emerald-500"
                  style={{ 
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + (stats.winRate * 0.5)}% 0%, ${50 + (stats.winRate * 0.5)}% 100%, 50% 100%)`
                  }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">{stats.winRate.toFixed(0)}% win rate</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Win/Loss Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-amber-400">${stats.avgWin.toFixed(0)} / ${stats.avgLoss.toFixed(0)}</div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-emerald-500">${stats.largestWin.toFixed(0)}</span>
              <span className="text-red-500">${stats.largestLoss.toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Zella Score */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Zella Score</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={zellaScore}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    className="text-xs"
                  />
                  <Radar
                    dataKey="value"
                    stroke="#A855F7"
                    fill="#A855F7"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-2">YOUR ZELLA SCORE</div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-purple-400">{overallScore}</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${overallScore}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Net Cumulative P&L */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Daily Net Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getDailyCumulativePnL()}>
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#4B5563' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#4B5563' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#pnlGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trading Calendar</CardTitle>
            <div className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="font-medium text-muted-foreground p-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarData().map((day, idx) => (
                <div 
                  key={idx} 
                  className={`
                    p-2 text-xs rounded transition-all cursor-pointer
                    ${day.trades > 0 
                      ? day.pnl >= 0 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }
                  `}
                >
                  <div className="font-medium">{day.date}</div>
                  {day.trades > 0 && (
                    <div className="mt-1">
                      <div className="text-[10px]">${day.pnl.toFixed(0)}</div>
                      <div className="text-[9px] opacity-70">{day.trades} trades</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Calendar - Tradezella Style */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-primary">Trading Calendar - {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
            <div className="text-sm text-muted-foreground">Daily P&L Overview</div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-muted-foreground p-3 bg-muted/20 rounded">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => {
              const now = new Date();
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const startDay = startOfMonth.getDay();
              const dayNum = i - startDay + 1;
              const isCurrentMonth = dayNum > 0 && dayNum <= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              
              if (!isCurrentMonth) {
                return <div key={i} className="h-24 border border-muted/30 rounded bg-muted/5"></div>;
              }
              
              const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayTrades = trades.filter(t => t.date === dateStr && t.status === 'CLOSED');
              const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
              const winTrades = dayTrades.filter(t => (t.pnl || 0) > 0).length;
              const lossTrades = dayTrades.filter(t => (t.pnl || 0) < 0).length;
              const isToday = dayNum === now.getDate();
              
              return (
                <div key={i} className={`h-24 border rounded p-2 flex flex-col justify-between text-xs transition-all hover:scale-105 ${
                  isToday ? 'border-primary bg-primary/10 ring-2 ring-primary/20' :
                  dayPnL > 0 ? 'bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30' :
                  dayPnL < 0 ? 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30' :
                  dayTrades.length > 0 ? 'bg-muted/20 border-muted hover:bg-muted/40' :
                  'border-muted/30 hover:bg-muted/10'
                }`}>
                  <div className={`text-center font-bold ${isToday ? 'text-primary' : ''}`}>
                    {dayNum}
                  </div>
                  {dayTrades.length > 0 && (
                    <div className="space-y-1">
                      <div className={`text-center font-bold text-xs ${
                        dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${dayPnL >= 0 ? '+' : ''}{dayPnL.toFixed(0)}
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-emerald-400">{winTrades}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-400">{lossTrades}</span>
                        </div>
                      </div>
                      <div className="text-center text-[10px] text-muted-foreground">
                        {dayTrades.length} trades
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Calendar Legend */}
          <div className="mt-4 flex justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/50 rounded"></div>
              <span>Profitable Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded"></div>
              <span>Loss Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-primary bg-primary/10 rounded"></div>
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Daily P&L Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Net Daily P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDailyCumulativePnL()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#4B5563' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#4B5563' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar 
                  dataKey="dailyPnL" 
                  radius={[2, 2, 0, 0]}
                  fill="#10B981"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Profit Factor by Symbols */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Profit Factor by Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getProfitFactorBySymbols().map((item, index) => (
              <div key={item.symbol} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant={item.type === 'CFD' ? 'default' : 'secondary'} className="text-xs">
                    {item.type}
                  </Badge>
                  <span className="font-medium">{item.symbol}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-32 h-2 rounded-full overflow-hidden ${
                    item.profitFactor >= 2 ? 'bg-emerald-500' :
                    item.profitFactor >= 1 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    <div 
                      className="h-full bg-current opacity-80"
                      style={{ width: `${Math.min(100, (item.profitFactor / 3) * 100)}%` }}
                    />
                  </div>
                  <span className={`font-bold text-sm min-w-[60px] text-right ${
                    item.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {item.profitFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Long vs Short Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Long vs Short</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const breakdown = getLongShortBreakdown();
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-400">Long</span>
                    </div>
                    <span className="font-bold">
                      {breakdown.long.count} ({breakdown.long.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-orange-400">Short</span>
                    </div>
                    <span className="font-bold">
                      {breakdown.short.count} ({breakdown.short.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${breakdown.long.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Grouping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {getAssetGrouping().slice(0, 5).map((group, index) => (
                <div key={group.symbol} className="space-y-2">
                  <div className="font-medium text-sm">{group.symbol}</div>
                  <div className="ml-4 space-y-1">
                    {group.cfd.count > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">CFD</Badge>
                          <span>{group.cfd.count} trades</span>
                        </div>
                        <span className={`font-bold ${
                          group.cfd.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          ${group.cfd.pnl >= 0 ? '+' : ''}{group.cfd.pnl.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {group.stock.count > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">STOCK</Badge>
                          <span>{group.stock.count} trades</span>
                        </div>
                        <span className={`font-bold ${
                          group.stock.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          ${group.stock.pnl >= 0 ? '+' : ''}{group.stock.pnl.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                <Label htmlFor="type">Trade Type</Label>
                <Select value={newTrade.type} onValueChange={(value: 'CFD' | 'STOCK') => setNewTrade({...newTrade, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK">Stock</SelectItem>
                    <SelectItem value="CFD">CFD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* CFD-specific fields */}
            {newTrade.type === 'CFD' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div>
                  <Label htmlFor="lotSize">Lot Size</Label>
                  <Input
                    id="lotSize"
                    type="number"
                    step="0.01"
                    placeholder="1.0"
                    value={newTrade.lotSize || ''}
                    onChange={(e) => setNewTrade({...newTrade, lotSize: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="leverage">Leverage</Label>
                  <Input
                    id="leverage"
                    type="number"
                    placeholder="1:100"
                    value={newTrade.leverage || ''}
                    onChange={(e) => setNewTrade({...newTrade, leverage: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="contractSize">Contract Size</Label>
                  <Input
                    id="contractSize"
                    type="number"
                    placeholder="100000"
                    value={newTrade.contractSize || ''}
                    onChange={(e) => setNewTrade({...newTrade, contractSize: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Input
                  id="strategy"
                  placeholder="Breakout, Support/Resistance, etc."
                  value={newTrade.strategy || ''}
                  onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="commission">Commission</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTrade.commission || ''}
                  onChange={(e) => setNewTrade({...newTrade, commission: parseFloat(e.target.value)})}
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
                <TableHead>Type</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Size</TableHead>
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
                    <Badge variant={trade.type === 'CFD' ? 'default' : 'secondary'} className="text-xs">
                      {trade.type || 'STOCK'}
                    </Badge>
                  </TableCell>
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
                  <TableCell>
                    {trade.type === 'CFD' ? (
                      <div className="text-xs">
                        <div>Lot: {trade.lotSize || 1}</div>
                        {trade.leverage && <div>Lev: 1:{trade.leverage}</div>}
                      </div>
                    ) : (
                      trade.quantity
                    )}
                  </TableCell>
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