import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit3, TrendingUp, TrendingDown, Calendar, Upload, Webhook, RefreshCw, FolderPlus, Folder, FolderOpen, Settings2, ChevronRight, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, ScatterChart, Scatter, ComposedChart, Line, ReferenceLine } from 'recharts';
import TradeAnalysisPanel from './TradeAnalysisPanel';
import { SectorBubbleChart } from './SectorBubbleChart';
import { D3Surface } from './D3Surface';
import { EnhancedRiskRewardChart } from './EnhancedRiskRewardChart';
import { EnhancedProfitFactorChart } from './EnhancedProfitFactorChart';
import { EnhancedSectorAnalysis } from './EnhancedSectorAnalysis';
import { EnhancedWinRateChart } from './EnhancedWinRateChart';
import CSVImportDialog from './CSVImportDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Folder/Room interface
interface TradingFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: Date;
}

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  lotSize?: number;
  contractSize?: number;
  leverage?: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  notes?: string;
  tags?: string[];
  riskReward?: number;
  commission?: number;
  swap?: number;
  dividends?: number;
  entryTime?: string;
  folderId?: string; // Added for folder organization
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
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    date: new Date().toISOString().split('T')[0],
    side: 'LONG',
    type: 'STOCK',
    status: 'OPEN',
    strategy: '',
    quantity: 1,
    commission: 0,
    leverage: 1,
    lotSize: 1,
    folderId: 'default'
  });

  // Folder/Room states
  const [folders, setFolders] = useState<TradingFolder[]>([
    { id: 'default', name: 'All Trades', description: 'All trading records', color: 'bg-slate-500', icon: '📊', createdAt: new Date() },
    { id: 'system-1', name: 'Trend Following', description: 'Long-term trend strategy', color: 'bg-emerald-500', icon: '📈', createdAt: new Date() },
    { id: 'scalping', name: 'Scalping', description: 'Quick intraday trades', color: 'bg-amber-500', icon: '⚡', createdAt: new Date() },
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState('default');
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: '', description: '', color: 'bg-blue-500', icon: '📁' });
  
  // Webhook import states
  const [showWebhookImport, setShowWebhookImport] = useState(false);
  const [webhookRooms, setWebhookRooms] = useState<any[]>([]);
  const [selectedWebhookRoom, setSelectedWebhookRoom] = useState<string | null>(null);
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(false);

  // Load trades and folders from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradingJournal');
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
    const savedFolders = localStorage.getItem('tradingJournalFolders');
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
    }
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem('tradingJournal', JSON.stringify(trades));
  }, [trades]);

  // Save folders to localStorage
  useEffect(() => {
    localStorage.setItem('tradingJournalFolders', JSON.stringify(folders));
  }, [folders]);

  // Folder management functions
  const handleAddFolder = () => {
    if (!newFolder.name.trim()) return;
    
    const folder: TradingFolder = {
      id: `folder-${Date.now()}`,
      name: newFolder.name.trim(),
      description: newFolder.description.trim(),
      color: newFolder.color,
      icon: newFolder.icon,
      createdAt: new Date()
    };
    
    setFolders(prev => [...prev, folder]);
    setNewFolder({ name: '', description: '', color: 'bg-blue-500', icon: '📁' });
    
    toast({
      title: 'Folder Created',
      description: `"${folder.name}" has been created`
    });
  };

  const handleDeleteFolder = (folderId: string) => {
    if (folderId === 'default') return;
    
    // Move trades to default folder
    setTrades(prev => prev.map(t => 
      t.folderId === folderId ? { ...t, folderId: 'default' } : t
    ));
    
    setFolders(prev => prev.filter(f => f.id !== folderId));
    
    if (selectedFolderId === folderId) {
      setSelectedFolderId('default');
    }
    
    toast({
      title: 'Folder Deleted',
      description: 'Trades moved to All Trades'
    });
  };

  // Filter trades by folder
  const filteredTrades = selectedFolderId === 'default' 
    ? trades 
    : trades.filter(t => t.folderId === selectedFolderId);

  // Get folder trade count
  const getFolderTradeCount = (folderId: string) => {
    if (folderId === 'default') return trades.length;
    return trades.filter(t => t.folderId === folderId).length;
  };

  // Calculate stats from filtered trades (not all trades)
  const calculateStats = (): TradingStats => {
    const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
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

  // Use filteredTrades for monthly stats
  const getTradesByMonth = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTrades = filteredTrades.filter(t => {
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

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const generateCalendarData = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    // Get first day of month and adjust to start from Sunday
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get last day of month and adjust to end on Saturday  
    const lastDay = new Date(year, month + 1, 0);
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const calendarData = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayTrades = filteredTrades.filter(t => t.date === dateStr && t.status === 'CLOSED');
      const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const isCurrentMonth = current.getMonth() === month;
      
      calendarData.push({
        date: current.getDate(),
        trades: dayTrades.length,
        pnl: dayPnL,
        dateStr,
        isCurrentMonth
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return calendarData;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getZellaScore = () => {
    const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');
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
      
      const dayTrades = filteredTrades.filter(t => t.date === dateStr && t.status === 'CLOSED');
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

  const handleImportTrades = (importedTrades: Trade[], replaceMode: boolean = false) => {
    if (replaceMode) {
      // Replace all trades
      setTrades(importedTrades);
      toast({
        title: "Trades Replaced!",
        description: `Replaced all trades with ${importedTrades.length} new trades from CSV`
      });
    } else {
      // Add to existing trades
      setTrades(prev => [...prev, ...importedTrades]);
      toast({
        title: "Import Successful!",
        description: `Added ${importedTrades.length} trades to existing ${trades.length} trades`
      });
    }
  };

  const clearAllTrades = () => {
    // Show confirmation dialog
    if (window.confirm(`Are you sure you want to delete all ${trades.length} trades? This action cannot be undone.`)) {
      setTrades([]);
      toast({
        title: "All Trades Cleared",
        description: `Successfully deleted ${trades.length} trades`
      });
    }
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

  // Calculate profit factor by symbols (use filteredTrades)
  const getProfitFactorBySymbols = () => {
    const symbolStats = new Map();
    
    filteredTrades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(trade => {
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

  // Get Long vs Short breakdown (use filteredTrades)
  const getLongShortBreakdown = () => {
    const closedTrades = filteredTrades.filter(t => t.status === 'CLOSED');
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

  const loadSampleData = () => {
    const sampleTrades: Trade[] = [
      // Forex CFD Trades
      { id: '1', date: '2024-08-15', symbol: 'EURUSD', side: 'LONG', type: 'CFD', entryPrice: 1.0950, exitPrice: 1.1020, quantity: 1, lotSize: 1, contractSize: 100000, leverage: 100, pnl: 700, pnlPercentage: 6.39, status: 'CLOSED', strategy: 'Scalping', commission: 5 },
      { id: '2', date: '2024-08-16', symbol: 'GBPJPY', side: 'SHORT', type: 'CFD', entryPrice: 186.50, exitPrice: 185.20, quantity: 1, lotSize: 0.5, contractSize: 100000, leverage: 50, pnl: 650, pnlPercentage: 3.49, status: 'CLOSED', strategy: 'Swing', commission: 8 },
      { id: '3', date: '2024-08-20', symbol: 'XAUUSD', side: 'LONG', type: 'CFD', entryPrice: 2380, exitPrice: 2360, quantity: 1, lotSize: 0.1, contractSize: 100, leverage: 200, pnl: -200, pnlPercentage: -1.68, status: 'CLOSED', strategy: 'Day Trading', commission: 3 },
      
      // Stock Trades
      { id: '4', date: '2024-09-02', symbol: 'AAPL', side: 'LONG', type: 'STOCK', entryPrice: 175.50, exitPrice: 182.30, quantity: 50, pnl: 340, pnlPercentage: 3.87, status: 'CLOSED', strategy: 'Position', commission: 15 },
      { id: '5', date: '2024-09-05', symbol: 'TSLA', side: 'SHORT', type: 'STOCK', entryPrice: 245.80, exitPrice: 238.90, quantity: 20, pnl: 138, pnlPercentage: 2.81, status: 'CLOSED', strategy: 'Swing', commission: 10 },
      { id: '6', date: '2024-09-10', symbol: 'NVDA', side: 'LONG', type: 'STOCK', entryPrice: 420.00, exitPrice: 395.50, quantity: 15, pnl: -367.50, pnlPercentage: -5.83, status: 'CLOSED', strategy: 'Day Trading', commission: 12 },
      
      // More Recent Trades  
      { id: '7', date: '2024-09-12', symbol: 'EURUSD', side: 'SHORT', type: 'CFD', entryPrice: 1.1080, exitPrice: 1.1020, quantity: 1, lotSize: 1.5, contractSize: 100000, leverage: 100, pnl: 900, pnlPercentage: 5.42, status: 'CLOSED', strategy: 'Scalping', commission: 6 },
      { id: '8', date: '2024-09-14', symbol: 'MSFT', side: 'LONG', type: 'STOCK', entryPrice: 340.20, exitPrice: 348.75, quantity: 25, pnl: 213.75, pnlPercentage: 2.51, status: 'CLOSED', strategy: 'Position', commission: 8 },
      { id: '9', date: '2024-09-15', symbol: 'USDJPY', side: 'LONG', type: 'CFD', entryPrice: 142.80, exitPrice: 144.20, quantity: 1, lotSize: 0.8, contractSize: 100000, leverage: 100, pnl: 1120, pnlPercentage: 9.80, status: 'CLOSED', strategy: 'Day Trading', commission: 4 },
      { id: '10', date: '2024-09-16', symbol: 'GOOGL', side: 'SHORT', type: 'STOCK', entryPrice: 155.30, exitPrice: 148.90, quantity: 30, pnl: 192, pnlPercentage: 4.12, status: 'CLOSED', strategy: 'Swing', commission: 12 },
      
      // More diverse trades for better visualization
      { id: '11', date: '2024-09-17', symbol: 'USDCAD', side: 'SHORT', type: 'CFD', entryPrice: 1.3520, exitPrice: 1.3480, quantity: 1, lotSize: 1, contractSize: 100000, leverage: 50, pnl: 400, pnlPercentage: 1.48, status: 'CLOSED', strategy: 'Scalping', commission: 5 },
      { id: '12', date: '2024-09-18', symbol: 'AMD', side: 'LONG', type: 'STOCK', entryPrice: 95.20, exitPrice: 102.15, quantity: 40, pnl: 278, pnlPercentage: 7.30, status: 'CLOSED', strategy: 'Day Trading', commission: 14 },
      { id: '13', date: '2024-09-19', symbol: 'AUDUSD', side: 'LONG', type: 'CFD', entryPrice: 0.6850, exitPrice: 0.6780, quantity: 1, lotSize: 2, contractSize: 100000, leverage: 100, pnl: -1400, pnlPercentage: -10.22, status: 'CLOSED', strategy: 'Position', commission: 8 },
      { id: '14', date: '2024-09-20', symbol: 'SPY', side: 'LONG', type: 'STOCK', entryPrice: 445.20, exitPrice: 452.80, quantity: 20, pnl: 152, pnlPercentage: 1.71, status: 'CLOSED', strategy: 'Swing', commission: 6 },
      
      // August trades for more monthly data
      { id: '15', date: '2024-08-05', symbol: 'NZDUSD', side: 'SHORT', type: 'CFD', entryPrice: 0.6120, exitPrice: 0.6080, quantity: 1, lotSize: 1, contractSize: 100000, leverage: 100, pnl: 400, pnlPercentage: 6.54, status: 'CLOSED', strategy: 'Day Trading', commission: 4 },
      { id: '16', date: '2024-08-10', symbol: 'META', side: 'LONG', type: 'STOCK', entryPrice: 385.50, exitPrice: 398.20, quantity: 15, pnl: 190.50, pnlPercentage: 3.29, status: 'CLOSED', strategy: 'Position', commission: 9 },
      { id: '17', date: '2024-08-25', symbol: 'EURCHF', side: 'LONG', type: 'CFD', entryPrice: 0.9650, exitPrice: 0.9720, quantity: 1, lotSize: 0.5, contractSize: 100000, leverage: 100, pnl: 350, pnlPercentage: 7.25, status: 'CLOSED', strategy: 'Swing', commission: 3 },
      
      // July trades
      { id: '18', date: '2024-07-12', symbol: 'QQQ', side: 'SHORT', type: 'STOCK', entryPrice: 465.80, exitPrice: 458.30, quantity: 25, pnl: 187.50, pnlPercentage: 1.61, status: 'CLOSED', strategy: 'Day Trading', commission: 8 },
      { id: '19', date: '2024-07-18', symbol: 'GBPUSD', side: 'LONG', type: 'CFD', entryPrice: 1.2980, exitPrice: 1.3040, quantity: 1, lotSize: 1.2, contractSize: 100000, leverage: 100, pnl: 720, pnlPercentage: 4.62, status: 'CLOSED', strategy: 'Scalping', commission: 6 },
      { id: '20', date: '2024-07-22', symbol: 'CRM', side: 'LONG', type: 'STOCK', entryPrice: 245.60, exitPrice: 238.90, quantity: 18, pnl: -120.60, pnlPercentage: -2.73, status: 'CLOSED', strategy: 'Position', commission: 11 }
    ];
    
    setTrades(sampleTrades);
    toast({
      title: "Sample Data Loaded",
      description: "20 sample trades have been added to demonstrate the features"
    });
  };

  const handleDeleteTrade = (tradeId: string) => {
    setTrades(trades.filter(t => t.id !== tradeId));
    toast({
      title: "Trade Deleted",
      description: "Trade has been removed from journal"
    });
  };

  // Load webhook rooms for import
  const loadWebhookRooms = async () => {
    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'webhook')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhookRooms(rooms || []);
    } catch (error) {
      console.error('Error loading webhook rooms:', error);
    }
  };

  // Import trades from webhook room
  const importFromWebhook = async (roomId: string) => {
    setIsLoadingWebhook(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('message_type', 'webhook')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const importedTrades: Trade[] = messages?.map((msg, index) => {
        const webhookData = (msg.webhook_data as Record<string, any>) || {};
        
        return {
          id: `webhook-${Date.now()}-${index}`,
          date: new Date(msg.created_at).toISOString().split('T')[0],
          symbol: (webhookData.ticker || webhookData.symbol || 'UNKNOWN') as string,
          side: ((webhookData.action as string)?.toUpperCase() === 'BUY' || 
                 (webhookData.action as string)?.toUpperCase() === 'LONG') ? 'LONG' as const : 'SHORT' as const,
          type: 'CFD' as const,
          entryPrice: parseFloat(String(webhookData.price || webhookData.close || '0')),
          quantity: 1,
          lotSize: parseFloat(String(webhookData.lots || '1')),
          contractSize: 100000,
          leverage: 100,
          status: 'OPEN' as const,
          strategy: (webhookData.strategy || 'TradingView Signal') as string,
          notes: (webhookData.message || '') as string,
          commission: 0
        };
      }) || [];

      setTrades(prev => [...prev, ...importedTrades]);
      
      toast({
        title: "Import Successful!",
        description: `Imported ${importedTrades.length} trades from webhook signals`
      });
      
      setShowWebhookImport(false);
      setSelectedWebhookRoom(null);
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex bg-background text-xs">
      {/* Folder Sidebar */}
      <div className="w-56 border-r border-terminal-green/30 flex flex-col bg-card/50 hidden lg:flex">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-terminal-green/30 flex items-center justify-between">
          <span className="flex items-center gap-2 text-terminal-green font-bold">
            <Folder className="h-4 w-4" />
            Trading Rooms
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFolderManager(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-terminal-amber"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Folder List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm",
                  selectedFolderId === folder.id
                    ? "bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base">{folder.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getFolderTradeCount(folder.id)} trades
                  </p>
                </div>
                {selectedFolderId === folder.id && (
                  <ChevronRight className="h-4 w-4 text-terminal-amber" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        
        {/* Sidebar Footer Stats */}
        <div className="p-3 border-t border-terminal-green/30 bg-muted/30">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-terminal-green">{folders.length}</p>
              <p className="text-xs text-muted-foreground">Rooms</p>
            </div>
            <div>
              <p className="text-lg font-bold text-terminal-amber">{trades.length}</p>
              <p className="text-xs text-muted-foreground">Trades</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2 sm:p-4 space-y-3 sm:space-y-4 overflow-auto">
        {/* COT Style Header */}
        <div className="flex justify-between items-center pb-2 border-b border-terminal-green/30">
          <div className="flex flex-col">
            <span className="font-bold text-terminal-green text-sm sm:text-base">
              📔 TRADING JOURNAL - {folders.find(f => f.id === selectedFolderId)?.name.toUpperCase() || 'ALL TRADES'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date().toLocaleString()} • {filteredTrades.length} trades
            </span>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {/* Mobile folder selector */}
            <div className="lg:hidden">
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.icon} {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {trades.length === 0 && (
              <Button onClick={loadSampleData} variant="outline" size="sm">
                Load Sample
              </Button>
            )}
            {trades.length > 0 && (
              <Button onClick={clearAllTrades} variant="destructive" size="sm">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear ({trades.length})
              </Button>
            )}
            <Button 
              onClick={() => { loadWebhookRooms(); setShowWebhookImport(true); }} 
              variant="outline" 
              size="sm"
              className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
            >
              <Webhook className="h-3 w-3 mr-1" />
              Webhook
            </Button>
            <Button 
              onClick={() => setShowCSVImport(true)} 
              variant="outline" 
              size="sm"
              className="bg-terminal-amber/20 text-terminal-amber hover:bg-terminal-amber/30"
            >
              <Upload className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button onClick={() => setIsAddingTrade(true)} size="sm" className="bg-terminal-green hover:bg-terminal-green/90 text-black">
              <Plus className="h-3 w-3 mr-1" />
              Add Trade
            </Button>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Net P&L</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-2">
            <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              ${Math.abs(stats.totalPnL) >= 1000 ? 
                `${stats.totalPnL >= 0 ? '+' : '-'}${(Math.abs(stats.totalPnL)/1000).toFixed(1)}k` : 
                stats.totalPnL.toFixed(2)
              }
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Trade Expectancy</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-2">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400">
              ${((stats.avgWin * stats.winRate/100) - (stats.avgLoss * (100-stats.winRate)/100)).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Per trade</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-2">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-400">{stats.profitFactor.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-emerald-500 relative">
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
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Avg Win/Loss Trade</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-2">
            <div className="text-sm sm:text-base lg:text-lg font-bold text-amber-400">
              ${stats.avgWin.toFixed(0)} / ${stats.avgLoss.toFixed(0)}
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-emerald-500">${stats.largestWin.toFixed(0)}</span>
              <span className="text-red-500">${stats.largestLoss.toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
        {/* Zella Score */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Zella Score</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-32 sm:h-48">
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
            <div className="mt-2 sm:mt-4">
              <div className="text-xs text-muted-foreground mb-2">YOUR ZELLA SCORE</div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-lg sm:text-2xl font-bold text-purple-400">{overallScore}</div>
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
        <Card className="lg:col-span-2 min-h-0">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Daily Net Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64">
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

        {/* Enhanced Trading Calendar */}
        <Card className="min-h-0">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Trading Calendar</span>
                </CardTitle>
                <div className="text-xs sm:text-sm text-muted-foreground">Daily P&L Overview</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 justify-center sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')} className="px-2 sm:px-3">
                  ←
                </Button>
                <div className="font-semibold text-sm sm:text-base lg:text-lg min-w-[120px] sm:min-w-[140px] text-center">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')} className="px-2 sm:px-3">
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {generateCalendarData().map((day, idx) => (
                <div 
                  key={idx} 
                  className={`
                    relative aspect-square p-1 sm:p-2 text-center rounded-md sm:rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md min-h-[40px] sm:min-h-[60px]
                    ${!day.isCurrentMonth 
                      ? 'bg-muted/30 text-muted-foreground/50 border-border/30' 
                      : day.trades > 0 
                        ? day.pnl >= 0 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100' 
                          : 'bg-red-50 border-red-200 text-red-900 hover:bg-red-100'
                        : 'bg-background border-border hover:bg-muted/50'
                    }
                  `}
                  title={day.isCurrentMonth ? `${day.trades} trades, $${day.pnl.toFixed(2)} P&L` : ''}
                >
                  <div className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1">{day.date}</div>
                  {day.isCurrentMonth && day.trades > 0 && (
                    <div className="space-y-0.5">
                      <div className={`text-[9px] sm:text-xs font-bold leading-tight ${
                        day.pnl >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        ${day.pnl >= 0 ? '+' : ''}${Math.abs(day.pnl) >= 1000 ? (day.pnl/1000).toFixed(1) + 'k' : day.pnl.toFixed(0)}
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight">
                        {day.trades} trade{day.trades !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-emerald-100 border border-emerald-200"></div>
                <span className="text-xs sm:text-sm text-muted-foreground">Profit</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-100 border border-red-200"></div>
                <span className="text-xs sm:text-sm text-muted-foreground">Loss</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-background border border-border"></div>
                <span className="text-xs sm:text-sm text-muted-foreground">No trades</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Trading Analysis */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Advanced Trading Analysis
        </h3>
        <TradeAnalysisPanel trades={trades} />
      </div>

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

      {/* New Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Win Rate vs Profit Factor Scatter Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Win Rate vs Profit Factor Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  data={getProfitFactorBySymbols().map(item => ({
                    symbol: item.symbol,
                    winRate: item.winRate,
                    profitFactor: item.profitFactor,
                    totalTrades: item.totalTrades
                  }))}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="winRate" 
                    type="number" 
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    label={{ value: 'Win Rate (%)', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fontSize: 10, fill: '#9CA3AF' } }}
                  />
                  <YAxis 
                    dataKey="profitFactor" 
                    type="number"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    label={{ value: 'Profit Factor', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fill: '#9CA3AF' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: any, name: string) => [
                      name === 'profitFactor' ? value.toFixed(2) : `${value.toFixed(1)}%`,
                      name === 'profitFactor' ? 'Profit Factor' : 'Win Rate'
                    ]}
                    labelFormatter={(label, payload) => 
                      payload?.[0]?.payload ? `${payload[0].payload.symbol} (${payload[0].payload.totalTrades} trades)` : ''
                    }
                  />
                  <Scatter dataKey="profitFactor" fill="#10B981" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Time-based Performance Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trading Performance by Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {(() => {
                const timePerformance = Array.from({ length: 24 }, (_, hour) => {
                  const hourTrades = trades.filter(t => {
                    const tradeHour = new Date(t.date + 'T' + (t.entryTime || '09:00')).getHours();
                    return tradeHour === hour;
                  });
                  
                  const totalPnL = hourTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                  const tradeCount = hourTrades.length;
                  
                  return {
                    hour: hour.toString().padStart(2, '0') + ':00',
                    pnl: totalPnL,
                    trades: tradeCount,
                    avgPnL: tradeCount > 0 ? totalPnL / tradeCount : 0
                  };
                }).filter(item => item.trades > 0);

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timePerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 9, fill: '#9CA3AF' }}
                        interval={1}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fill: '#9CA3AF' } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                        formatter={(value: any, name) => [
                          name === 'pnl' ? `$${value.toFixed(2)}` : value,
                          name === 'pnl' ? 'Total P&L' : 'Trades'
                        ]}
                      />
                      <Bar 
                        dataKey="pnl" 
                        fill="#10B981"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Profit Factor by Symbols Chart - Circular */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profit Factor by Symbols</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {(() => {
                const symbolData = getProfitFactorBySymbols().slice(0, 8);
                const maxProfitFactor = Math.max(...symbolData.map(d => d.profitFactor), 1);
                const centerX = 120;
                const centerY = 120;
                const maxRadius = 80;
                
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <svg width="240" height="240" viewBox="0 0 240 240">
                      {/* Background circles */}
                      {[20, 40, 60, 80].map((radius, i) => (
                        <circle
                          key={i}
                          cx={centerX}
                          cy={centerY}
                          r={radius}
                          fill="none"
                          stroke="hsl(var(--border))"
                          strokeWidth="1"
                          opacity="0.3"
                        />
                      ))}
                      
                      {/* Data points */}
                      {symbolData.map((item, index) => {
                        const angle = (index / symbolData.length) * 2 * Math.PI - Math.PI / 2;
                        const radius = (item.profitFactor / maxProfitFactor) * maxRadius;
                        const x = centerX + Math.cos(angle) * radius;
                        const y = centerY + Math.sin(angle) * radius;
                        const color = item.profitFactor > 1 ? '#10B981' : '#EF4444';
                        
                        return (
                          <g key={index}>
                            {/* Line from center */}
                            <line
                              x1={centerX}
                              y1={centerY}
                              x2={x}
                              y2={y}
                              stroke={color}
                              strokeWidth="2"
                              opacity="0.6"
                            />
                            {/* Data point */}
                            <circle
                              cx={x}
                              cy={y}
                              r="6"
                              fill={color}
                              stroke="white"
                              strokeWidth="2"
                            />
                            {/* Symbol label */}
                            <text
                              x={centerX + Math.cos(angle) * (maxRadius + 15)}
                              y={centerY + Math.sin(angle) * (maxRadius + 15)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="10"
                              fill="hsl(var(--muted-foreground))"
                              fontWeight="medium"
                            >
                              {item.symbol}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Center point */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r="4"
                        fill="hsl(var(--primary))"
                      />
                      
                      {/* Radial labels */}
                      {[0.5, 1.0, 1.5, 2.0].map((value, i) => (
                        <text
                          key={i}
                          x={centerX + 5}
                          y={centerY - (value / maxProfitFactor) * maxRadius}
                          fontSize="8"
                          fill="hsl(var(--muted-foreground))"
                        >
                          {value}
                        </text>
                      ))}
                    </svg>
                    
                    {/* Legend */}
                    <div className="absolute bottom-0 left-0 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Profitable</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Loss</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Monthly P&L Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getTradesByMonth()}>
                  <defs>
                    <linearGradient id="monthlyPnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    axisLine={{ stroke: '#4B5563' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
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
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#monthlyPnlGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Win Rate Analysis */}
        <EnhancedWinRateChart trades={trades} />

        {/* Enhanced Sector Attribution Analysis */}
        <EnhancedSectorAnalysis trades={trades} />

        {/* D3 Portfolio Analytics */}
        <D3Surface trades={trades} />
      </div>

      {/* Performance Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Enhanced Profit Factor by Symbols */}
        <EnhancedProfitFactorChart trades={trades} />

        {/* CFD vs Stock Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CFD vs Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const cfdTrades = trades.filter(t => t.type === 'CFD');
              const stockTrades = trades.filter(t => t.type === 'STOCK');
              const total = trades.length;
              const cfdPercentage = total > 0 ? (cfdTrades.length / total) * 100 : 0;
              
              return (
                <div className="space-y-4">
                  {/* Simple Donut Chart */}
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="12"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="12"
                          strokeDasharray={`${(cfdPercentage * 352) / 100} 352`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{total}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                        <span className="text-sm">CFD</span>
                      </div>
                      <div className="text-sm font-medium">
                        {cfdTrades.length} ({cfdPercentage.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded"></div>
                        <span className="text-sm">Stock</span>
                      </div>
                      <div className="text-sm font-medium">
                        {stockTrades.length} ({(100 - cfdPercentage).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Top 5 Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getAssetGrouping()
                .map(group => ({
                  ...group,
                  totalPnL: group.cfd.pnl + group.stock.pnl,
                  totalTrades: group.cfd.count + group.stock.count
                }))
                .sort((a, b) => b.totalPnL - a.totalPnL)
                .slice(0, 5)
                .map((group, index) => (
                  <div key={group.symbol} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{group.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${
                        group.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        ${group.totalPnL >= 0 ? '+' : ''}{group.totalPnL.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.totalTrades} trades
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={getTradesByMonth()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 10, fill: '#9CA3AF' } }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    label={{ value: 'Trade Count', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 10, fill: '#9CA3AF' } }}
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
                    yAxisId="left"
                    dataKey="pnl" 
                    fill="#10B981" 
                    name="Monthly P&L"
                    opacity={0.7}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="trades" 
                    stroke="#F59E0B" 
                    strokeWidth={3}
                    name="Trade Count"
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Risk vs Reward Analysis */}
        <EnhancedRiskRewardChart trades={trades} />
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

      {/* Bulk Actions Toolbar */}
      {trades.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Total: {trades.length} trades | 
                Showing: {Math.min(trades.length, 50)} trades per page
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Export CSV
                </Button>
                <Button size="sm" variant="outline">
                  Select All
                </Button>
                <Button size="sm" variant="destructive" onClick={clearAllTrades}>
                  Clear All
                </Button>
              </div>
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

      {/* Bulk Actions Toolbar */}
      {trades.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Total: {trades.length} trades | 
                Showing: {Math.min(trades.length, 50)} trades per page
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Export CSV
                </Button>
                <Button size="sm" variant="outline">
                  Select All
                </Button>
                <Button size="sm" variant="destructive" onClick={clearAllTrades}>
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <CSVImportDialog
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
        onImport={handleImportTrades}
        existingTrades={trades}
      />
      
      {/* Webhook Import Dialog */}
      <Dialog open={showWebhookImport} onOpenChange={setShowWebhookImport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Import from Webhook Room
            </DialogTitle>
            <DialogDescription>
              Select a webhook room to import TradingView signals as trades
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {webhookRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No webhook rooms found</p>
                <p className="text-xs mt-1">Create a webhook room in MESSENGER first</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {webhookRooms.map(room => (
                  <Button
                    key={room.id}
                    variant={selectedWebhookRoom === room.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedWebhookRoom(room.id)}
                  >
                    <Webhook className="h-4 w-4 mr-2" />
                    {room.name || 'Webhook Room'}
                    <Badge variant="secondary" className="ml-auto">
                      {new Date(room.created_at).toLocaleDateString()}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowWebhookImport(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedWebhookRoom && importFromWebhook(selectedWebhookRoom)}
                disabled={!selectedWebhookRoom || isLoadingWebhook}
              >
                {isLoadingWebhook ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Trades
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Manager Dialog */}
      <Dialog open={showFolderManager} onOpenChange={setShowFolderManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-terminal-green">
              <Folder className="h-5 w-5" />
              Manage Trading Rooms
            </DialogTitle>
            <DialogDescription>
              Create and organize folders for different trading strategies
            </DialogDescription>
          </DialogHeader>
          
          {/* Add New Folder */}
          <div className="space-y-4 border-b border-border pb-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Create New Room
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Room Name</Label>
                <Input
                  placeholder="e.g., Scalping System"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="Strategy description"
                  value={newFolder.description}
                  onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              
              <div>
                <Label className="text-xs">Icon</Label>
                <Select value={newFolder.icon} onValueChange={(v) => setNewFolder({ ...newFolder, icon: v })}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="📁">📁 Folder</SelectItem>
                    <SelectItem value="📈">📈 Chart Up</SelectItem>
                    <SelectItem value="📉">📉 Chart Down</SelectItem>
                    <SelectItem value="💹">💹 Stock</SelectItem>
                    <SelectItem value="₿">₿ Bitcoin</SelectItem>
                    <SelectItem value="💱">💱 Forex</SelectItem>
                    <SelectItem value="🥇">🥇 Gold</SelectItem>
                    <SelectItem value="⚡">⚡ Scalping</SelectItem>
                    <SelectItem value="🎯">🎯 Strategy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Color</Label>
                <Select value={newFolder.color} onValueChange={(v) => setNewFolder({ ...newFolder, color: v })}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-blue-500">🔵 Blue</SelectItem>
                    <SelectItem value="bg-emerald-500">🟢 Green</SelectItem>
                    <SelectItem value="bg-amber-500">🟡 Amber</SelectItem>
                    <SelectItem value="bg-red-500">🔴 Red</SelectItem>
                    <SelectItem value="bg-purple-500">🟣 Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={handleAddFolder} disabled={!newFolder.name.trim()} size="sm" className="w-full">
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Room
            </Button>
          </div>
          
          {/* Existing Folders */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Existing Rooms</h4>
            {folders.filter(f => f.id !== 'default').map(folder => (
              <div key={folder.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{folder.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {folder.description || 'No description'} • {getFolderTradeCount(folder.id)} trades
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}