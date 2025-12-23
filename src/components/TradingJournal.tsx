import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, TrendingUp, TrendingDown, Upload, Webhook, RefreshCw, FolderPlus, Folder, Settings2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import CSVImportDialog from './CSVImportDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import OverviewTab from './TradingJournal/OverviewTab';
import PerformanceTab from './TradingJournal/PerformanceTab';
import TradeAnalysisTab from './TradingJournal/TradeAnalysisTab';
import RiskRewardTab from './TradingJournal/RiskRewardTab';
import TradeListTab from './TradingJournal/TradeListTab';

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
  folderId?: string;
}

export default function TradingJournal() {
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
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
  const filteredTrades = useMemo(() => {
    if (selectedFolderId === 'default') return trades;
    return trades.filter(t => t.folderId === selectedFolderId);
  }, [trades, selectedFolderId]);

  // Get folder trade count
  const getFolderTradeCount = (folderId: string) => {
    if (folderId === 'default') return trades.length;
    return trades.filter(t => t.folderId === folderId).length;
  };

  // Import trades with folder assignment
  const handleImportTrades = (importedTrades: Trade[], replaceMode: boolean = false) => {
    const tradesWithFolder = importedTrades.map(trade => ({
      ...trade,
      folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
    }));
    
    if (replaceMode) {
      if (selectedFolderId === 'default') {
        setTrades(tradesWithFolder);
      } else {
        setTrades(prev => [
          ...prev.filter(t => t.folderId !== selectedFolderId),
          ...tradesWithFolder
        ]);
      }
      toast({
        title: "Trades Replaced!",
        description: `Replaced trades with ${importedTrades.length} new trades`
      });
    } else {
      setTrades(prev => [...prev, ...tradesWithFolder]);
      toast({
        title: "Import Successful!",
        description: `Added ${importedTrades.length} trades`
      });
    }
  };

  // Clear trades in current room only
  const clearAllTrades = () => {
    const roomName = folders.find(f => f.id === selectedFolderId)?.name || 'All Trades';
    const countToClear = selectedFolderId === 'default' ? trades.length : filteredTrades.length;
    
    if (window.confirm(`Delete all ${countToClear} trades in "${roomName}"?`)) {
      if (selectedFolderId === 'default') {
        setTrades([]);
      } else {
        setTrades(prev => prev.filter(t => t.folderId !== selectedFolderId));
      }
      toast({
        title: "Trades Cleared",
        description: `Deleted ${countToClear} trades`
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
      dividends: newTrade.dividends,
      folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
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
          const lotSize = trade.lotSize || 1;
          const contractSize = trade.contractSize || 100000;
          const pointValue = contractSize * lotSize;
          
          if (trade.side === 'LONG') {
            pnl = (exitPrice - trade.entryPrice) * pointValue;
          } else {
            pnl = (trade.entryPrice - exitPrice) * pointValue;
          }
          
          pnl -= (trade.commission || 0);
          pnl += (trade.swap || 0);
          
          const marginUsed = (trade.entryPrice * pointValue) / (trade.leverage || 1);
          pnlPercentage = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0;
        } else {
          if (trade.side === 'LONG') {
            pnl = (exitPrice - trade.entryPrice) * trade.quantity;
          } else {
            pnl = (trade.entryPrice - exitPrice) * trade.quantity;
          }
          
          pnl -= (trade.commission || 0);
          pnl += (trade.dividends || 0);
          
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

  const handleDeleteTrade = (tradeId: string) => {
    setTrades(prev => prev.filter(t => t.id !== tradeId));
    toast({
      title: "Trade Deleted",
      description: "Trade has been removed"
    });
  };

  const handleEditTrade = (trade: Trade) => {
    // For now, just show a toast - full edit modal can be added later
    toast({
      title: "Edit Trade",
      description: `Editing ${trade.symbol} trade`
    });
  };

  // Fetch webhook rooms from Messenger
  const fetchWebhookRooms = async () => {
    setIsLoadingWebhook(true);
    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('type', 'webhook');
      
      if (error) throw error;
      
      setWebhookRooms(rooms || []);
      setShowWebhookImport(true);
    } catch (error) {
      console.error('Error fetching webhook rooms:', error);
      toast({
        title: "Error",
        description: "Failed to fetch webhook rooms",
        variant: "destructive"
      });
    } finally {
      setIsLoadingWebhook(false);
    }
  };

  // Import trades from webhook room
  const importWebhookTrades = async () => {
    if (!selectedWebhookRoom) {
      toast({
        title: "Error",
        description: "Please select a webhook room",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingWebhook(true);
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', selectedWebhookRoom)
        .eq('message_type', 'webhook')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!messages || messages.length === 0) {
        toast({
          title: "No Trades",
          description: "No webhook trades found in this room"
        });
        return;
      }

      // Parse webhook messages into trades
      const importedTrades: Trade[] = [];
      const openPositions: Map<string, Trade> = new Map();

      for (const msg of messages) {
        const webhookData = msg.webhook_data as any;
        if (!webhookData) continue;

        // Support both old and new formats
        let signal: any;
        if (webhookData.parsed_trade) {
          signal = webhookData.parsed_trade;
        } else {
          // Parse from raw webhook data (old format)
          const actionStr = (webhookData.action || '').toString().toLowerCase();
          let action: string = 'BUY';
          let side: 'LONG' | 'SHORT' = 'LONG';
          
          if (actionStr.includes('sell') || actionStr.includes('short')) {
            action = 'SELL';
            side = 'SHORT';
          } else if (actionStr.includes('buy') || actionStr.includes('long')) {
            action = 'BUY';
            side = 'LONG';
          } else if (actionStr.includes('close') || actionStr.includes('exit')) {
            action = 'CLOSE';
          }
          
          signal = {
            id: `wh-${msg.id}`,
            date: new Date(msg.created_at).toISOString().split('T')[0],
            symbol: webhookData.ticker || webhookData.symbol || 'UNKNOWN',
            side: side,
            type: 'CFD',
            action: action,
            price: parseFloat(webhookData.price || webhookData.close || 0),
            quantity: parseFloat(webhookData.quantity || webhookData.qty || 1),
            lotSize: parseFloat(webhookData.lot || webhookData.lotSize || 1),
            strategy: webhookData.strategy || 'TradingView',
            message: webhookData.message
          };
        }

        const positionKey = `${signal.symbol}-${signal.side}`;

        // Determine action type
        const actionUpper = (signal.action || '').toString().toUpperCase();
        const isOpenAction = ['OPEN', 'BUY', 'SELL'].includes(actionUpper);
        const isCloseAction = ['CLOSE', 'TAKE_PROFIT', 'STOP_LOSS', 'TP', 'SL', 'EXIT'].includes(actionUpper);

        if (isOpenAction) {
          // Create new open position
          const trade: Trade = {
            id: signal.id || `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: signal.date || new Date(msg.created_at).toISOString().split('T')[0],
            symbol: signal.symbol,
            side: signal.side || 'LONG',
            type: signal.type || 'CFD',
            entryPrice: signal.price,
            quantity: signal.quantity || 1,
            lotSize: signal.lotSize,
            status: 'OPEN',
            strategy: signal.strategy || 'TradingView Webhook',
            notes: signal.message,
            folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
          };
          
          openPositions.set(positionKey, trade);
          importedTrades.push(trade);
        } else if (isCloseAction) {
          // Find matching open position
          const matchingTrade = openPositions.get(positionKey);
          
          if (matchingTrade) {
            // Close the position
            matchingTrade.exitPrice = signal.price;
            matchingTrade.status = 'CLOSED';
            
            // Calculate PnL
            if (signal.pnl !== undefined) {
              matchingTrade.pnl = signal.pnl;
              matchingTrade.pnlPercentage = signal.pnlPercentage;
            } else {
              // Calculate PnL based on entry/exit
              const priceDiff = matchingTrade.side === 'LONG' 
                ? (signal.price - matchingTrade.entryPrice)
                : (matchingTrade.entryPrice - signal.price);
              
              matchingTrade.pnl = priceDiff * (matchingTrade.quantity || 1) * (matchingTrade.lotSize || 1);
              const investment = matchingTrade.entryPrice * (matchingTrade.quantity || 1);
              matchingTrade.pnlPercentage = investment > 0 ? (matchingTrade.pnl / investment) * 100 : 0;
            }
            
            // Add close note
            matchingTrade.notes = `${matchingTrade.notes || ''} | Closed: ${signal.action}`.trim();
            
            // Remove from open positions
            openPositions.delete(positionKey);
          } else {
            // No matching open position - create a closed trade directly
            const closedTrade: Trade = {
              id: signal.id || `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              date: signal.date || new Date(msg.created_at).toISOString().split('T')[0],
              symbol: signal.symbol,
              side: signal.side,
              type: signal.type || 'CFD',
              entryPrice: signal.price,
              exitPrice: signal.price,
              quantity: signal.quantity || 1,
              lotSize: signal.lotSize,
              status: 'CLOSED',
              strategy: signal.strategy || 'TradingView Webhook',
              pnl: signal.pnl,
              pnlPercentage: signal.pnlPercentage,
              notes: `Closed trade: ${signal.action}`,
              folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
            };
            importedTrades.push(closedTrade);
          }
        }
      }

      // Merge with existing trades (avoid duplicates by ID)
      const existingIds = new Set(trades.map(t => t.id));
      const newTrades = importedTrades.filter(t => !existingIds.has(t.id));
      
      // Update existing trades that might have been closed
      const updatedTrades = trades.map(existingTrade => {
        const matchingImport = importedTrades.find(t => t.id === existingTrade.id);
        return matchingImport || existingTrade;
      });

      // Simple mode: just add all trades without complex matching
      // Since the webhook data shows BUY/SELL signals, we'll treat each as a trade entry
      const allNewTrades = importedTrades.filter(t => !existingIds.has(t.id));
      
      setTrades(prev => [...prev, ...allNewTrades]);
      setShowWebhookImport(false);
      setSelectedWebhookRoom(null);
      
      toast({
        title: "Import Successful!",
        description: `Imported ${allNewTrades.length} trades from webhook`
      });
    } catch (error) {
      console.error('Error importing webhook trades:', error);
      toast({
        title: "Error",
        description: "Failed to import webhook trades",
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
            
            <Button 
              onClick={clearAllTrades} 
              variant="outline" 
              size="sm"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button 
              onClick={() => fetchWebhookRooms()} 
              variant="outline" 
              size="sm"
              className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
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

        {/* Tabbed Interface */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-transparent border-b border-border/30 pb-2 mb-4">
              {[
                { id: 'overview', label: 'ภาพรวม' },
                { id: 'performance', label: 'ประสิทธิภาพ' },
                { id: 'analysis', label: 'การวิเคราะห์การซื้อขาย' },
                { id: 'risk', label: 'อัตราส่วน ความเสี่ยง/ผลตอบแทน' },
                { id: 'trades', label: 'รายการของการซื้อขาย' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md transition-all border",
                    "data-[state=active]:bg-terminal-green/20 data-[state=active]:text-terminal-green data-[state=active]:border-terminal-green/50",
                    "data-[state=inactive]:bg-muted/30 data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-transparent",
                    "hover:bg-muted/50"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <OverviewTab trades={filteredTrades} initialCapital={100} />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PerformanceTab trades={filteredTrades} initialCapital={100} />
            </TabsContent>

            <TabsContent value="analysis" className="mt-0">
              <TradeAnalysisTab trades={filteredTrades} initialCapital={100} />
            </TabsContent>

            <TabsContent value="risk" className="mt-0">
              <RiskRewardTab trades={filteredTrades} initialCapital={100} />
            </TabsContent>

            <TabsContent value="trades" className="mt-0">
              <TradeListTab 
                trades={filteredTrades}
                onEditTrade={handleEditTrade}
                onDeleteTrade={handleDeleteTrade}
                onCloseTrade={handleCloseTrade}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Trade Dialog */}
      <Dialog open={isAddingTrade} onOpenChange={setIsAddingTrade}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">Add New Trade</DialogTitle>
            <DialogDescription>
              Add a new trade to "{folders.find(f => f.id === selectedFolderId)?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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
            
            <div className="grid grid-cols-3 gap-4">
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

            {newTrade.type === 'CFD' && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
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
                    placeholder="100"
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Input
                  id="strategy"
                  placeholder="Breakout, Scalping, etc."
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
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddingTrade(false)}>Cancel</Button>
              <Button onClick={handleAddTrade} className="bg-terminal-green hover:bg-terminal-green/90 text-black">
                Add Trade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
        onImport={handleImportTrades}
        existingTrades={trades}
        targetFolderId={selectedFolderId}
      />

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

      {/* Webhook Import Dialog */}
      <Dialog open={showWebhookImport} onOpenChange={setShowWebhookImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <Webhook className="h-5 w-5" />
              Import from Webhook Room
            </DialogTitle>
            <DialogDescription>
              Import trades from TradingView webhook signals
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingWebhook ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                <span className="ml-2 text-muted-foreground">Loading...</span>
              </div>
            ) : webhookRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No webhook rooms found</p>
                <p className="text-xs mt-2">Create a webhook room in MESSENGER first</p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Select Webhook Room</Label>
                  <Select value={selectedWebhookRoom || ''} onValueChange={setSelectedWebhookRoom}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a webhook room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {webhookRooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          🔗 {room.name || `Webhook Room ${room.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-sm">
                  <p className="font-medium text-blue-400 mb-2">📊 How it works:</p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Fetches all webhook signals from the selected room</li>
                    <li>• Matches OPEN/BUY/SELL with CLOSE/TP/SL actions</li>
                    <li>• Calculates P&L based on entry/exit prices</li>
                    <li>• Imports trades into current Trading Room</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowWebhookImport(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={importWebhookTrades}
                    disabled={!selectedWebhookRoom || isLoadingWebhook}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Webhook className="h-4 w-4 mr-2" />
                    Import Trades
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
