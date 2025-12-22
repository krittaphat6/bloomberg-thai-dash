import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload, Folder, Settings2, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CSVImportDialog from './CSVImportDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Import tab components
import OverviewTab from './TradingJournal/OverviewTab';
import PerformanceTab from './TradingJournal/PerformanceTab';
import TradeAnalysisTab from './TradingJournal/TradeAnalysisTab';
import RiskRewardTab from './TradingJournal/RiskRewardTab';
import TradeListTab from './TradingJournal/TradeListTab';
import { Trade } from '@/utils/tradingMetrics';

interface TradingFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: Date;
}

export default function TradingJournalV2() {
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [folders, setFolders] = useState<TradingFolder[]>([
    { id: 'default', name: 'All Trades', description: 'All trading records', color: 'bg-slate-500', icon: '📊', createdAt: new Date() },
    { id: 'system-1', name: 'Trend Following', description: 'Long-term trend strategy', color: 'bg-emerald-500', icon: '📈', createdAt: new Date() },
  ]);
  const [selectedFolderId, setSelectedFolderId] = useState('default');
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolder, setNewFolder] = useState({ name: '', description: '', icon: '📁' });
  
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    date: new Date().toISOString().split('T')[0],
    side: 'LONG',
    type: 'STOCK',
    status: 'OPEN',
    strategy: '',
    quantity: 1,
  });

  // Load/Save from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradingJournal');
    if (savedTrades) setTrades(JSON.parse(savedTrades));
    const savedFolders = localStorage.getItem('tradingJournalFolders');
    if (savedFolders) setFolders(JSON.parse(savedFolders));
  }, []);

  useEffect(() => {
    localStorage.setItem('tradingJournal', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('tradingJournalFolders', JSON.stringify(folders));
  }, [folders]);

  const filteredTrades = selectedFolderId === 'default' 
    ? trades 
    : trades.filter(t => t.folderId === selectedFolderId);

  const getFolderTradeCount = (folderId: string) => {
    if (folderId === 'default') return trades.length;
    return trades.filter(t => t.folderId === folderId).length;
  };

  const handleImportTrades = (importedTrades: Trade[], replaceMode: boolean = false) => {
    const tradesWithFolder = importedTrades.map(trade => ({
      ...trade,
      folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
    }));
    
    if (replaceMode) {
      if (selectedFolderId === 'default') {
        setTrades(tradesWithFolder);
      } else {
        setTrades(prev => [...prev.filter(t => t.folderId !== selectedFolderId), ...tradesWithFolder]);
      }
    } else {
      setTrades(prev => [...prev, ...tradesWithFolder]);
    }
    toast({ title: "Import Successful!", description: `Added ${importedTrades.length} trades` });
  };

  const clearAllTrades = () => {
    const count = selectedFolderId === 'default' ? trades.length : filteredTrades.length;
    if (window.confirm(`Delete all ${count} trades in this room?`)) {
      if (selectedFolderId === 'default') {
        setTrades([]);
      } else {
        setTrades(prev => prev.filter(t => t.folderId !== selectedFolderId));
      }
      toast({ title: "Trades Cleared" });
    }
  };

  const handleCloseTrade = (tradeId: string, exitPrice: number) => {
    setTrades(prev => prev.map(trade => {
      if (trade.id === tradeId) {
        let pnl = trade.side === 'LONG' 
          ? (exitPrice - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - exitPrice) * trade.quantity;
        let pnlPercentage = (pnl / (trade.entryPrice * trade.quantity)) * 100;
        return { ...trade, exitPrice, pnl, pnlPercentage, status: 'CLOSED' as const };
      }
      return trade;
    }));
  };

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.entryPrice) {
      toast({ title: "Error", description: "Fill required fields", variant: "destructive" });
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
      status: newTrade.status || 'OPEN',
      strategy: newTrade.strategy || '',
      folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
    };
    setTrades(prev => [...prev, trade]);
    setIsAddingTrade(false);
    setNewTrade({ date: new Date().toISOString().split('T')[0], side: 'LONG', type: 'STOCK', status: 'OPEN', strategy: '', quantity: 1 });
    toast({ title: "Trade Added" });
  };

  const handleAddFolder = () => {
    if (!newFolder.name.trim()) return;
    const folder: TradingFolder = {
      id: `folder-${Date.now()}`,
      name: newFolder.name.trim(),
      description: newFolder.description.trim(),
      color: 'bg-blue-500',
      icon: newFolder.icon,
      createdAt: new Date()
    };
    setFolders(prev => [...prev, folder]);
    setNewFolder({ name: '', description: '', icon: '📁' });
    toast({ title: 'Room Created' });
  };

  return (
    <div className="w-full min-h-screen flex bg-background text-xs">
      {/* Sidebar */}
      <div className="w-52 border-r border-border/30 flex flex-col bg-card/50 hidden lg:flex">
        <div className="p-3 border-b border-border/30 flex items-center justify-between">
          <span className="flex items-center gap-2 text-terminal-green font-bold text-sm">
            <Folder className="h-4 w-4" />
            Trading Rooms
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowFolderManager(true)} className="h-7 w-7 p-0">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        
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
                <span>{folder.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">{getFolderTradeCount(folder.id)} trades</p>
                </div>
                {selectedFolderId === folder.id && <ChevronRight className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-border/30">
          <div>
            <span className="font-bold text-terminal-green text-sm">
              📔 TRADING JOURNAL - {folders.find(f => f.id === selectedFolderId)?.name.toUpperCase()}
            </span>
            <div className="text-xs text-muted-foreground mt-1">
              {filteredTrades.length} trades • Last updated: {new Date().toLocaleString()}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="lg:hidden">
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.icon} {f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {trades.length > 0 && (
              <Button onClick={clearAllTrades} variant="destructive" size="sm">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button onClick={() => setShowCSVImport(true)} variant="outline" size="sm" className="bg-terminal-amber/20 text-terminal-amber">
              <Upload className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button onClick={() => setIsAddingTrade(true)} size="sm" className="bg-terminal-green hover:bg-terminal-green/90 text-black">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1">
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
                  "data-[state=inactive]:bg-muted/30 data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-transparent"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"><OverviewTab trades={filteredTrades} initialCapital={100} /></TabsContent>
          <TabsContent value="performance"><PerformanceTab trades={filteredTrades} initialCapital={100} /></TabsContent>
          <TabsContent value="analysis"><TradeAnalysisTab trades={filteredTrades} initialCapital={100} /></TabsContent>
          <TabsContent value="risk"><RiskRewardTab trades={filteredTrades} initialCapital={100} /></TabsContent>
          <TabsContent value="trades">
            <TradeListTab 
              trades={filteredTrades}
              onDeleteTrade={(id) => setTrades(prev => prev.filter(t => t.id !== id))}
              onCloseTrade={handleCloseTrade}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
        onImport={handleImportTrades}
        existingTrades={trades}
        targetFolderId={selectedFolderId}
      />

      {/* Add Trade Dialog */}
      <Dialog open={isAddingTrade} onOpenChange={setIsAddingTrade}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Trade</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Symbol</Label>
                <Input value={newTrade.symbol || ''} onChange={e => setNewTrade({...newTrade, symbol: e.target.value})} placeholder="BTCUSD" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={newTrade.date || ''} onChange={e => setNewTrade({...newTrade, date: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Side</Label>
                <Select value={newTrade.side} onValueChange={v => setNewTrade({...newTrade, side: v as 'LONG' | 'SHORT'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">LONG</SelectItem>
                    <SelectItem value="SHORT">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entry Price</Label>
                <Input type="number" value={newTrade.entryPrice || ''} onChange={e => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={newTrade.quantity || 1} onChange={e => setNewTrade({...newTrade, quantity: parseInt(e.target.value)})} />
              </div>
              <div>
                <Label>Strategy</Label>
                <Input value={newTrade.strategy || ''} onChange={e => setNewTrade({...newTrade, strategy: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddingTrade(false)}>Cancel</Button>
            <Button onClick={handleAddTrade} className="bg-terminal-green text-black">Add Trade</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Manager */}
      <Dialog open={showFolderManager} onOpenChange={setShowFolderManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Trading Rooms</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Room name" value={newFolder.name} onChange={e => setNewFolder({...newFolder, name: e.target.value})} />
              <Button onClick={handleAddFolder}>Add</Button>
            </div>
            <div className="space-y-2">
              {folders.filter(f => f.id !== 'default').map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>{f.icon} {f.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setFolders(prev => prev.filter(x => x.id !== f.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
