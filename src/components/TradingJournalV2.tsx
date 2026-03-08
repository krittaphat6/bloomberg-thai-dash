import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload, Folder, Settings2, ChevronRight, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import CSVImportDialog from './CSVImportDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import JournalTabs from './TradingJournal/JournalTabs';
import { Trade } from '@/utils/tradingMetrics';
import { supabase } from '@/integrations/supabase/client';
import { useRef, useCallback } from 'react';

interface TradingFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: Date;
}

const EMOTIONS = [
  { value: 'calm', label: '🎯 Calm' },
  { value: 'confident', label: '💪 Confident' },
  { value: 'fearful', label: '😰 Fearful' },
  { value: 'greedy', label: '🤑 Greedy' },
  { value: 'revenge', label: '😤 Revenge' },
  { value: 'fomo', label: '😮 FOMO' },
  { value: 'anxious', label: '😥 Anxious' },
  { value: 'euphoric', label: '🎉 Euphoric' },
  { value: 'bored', label: '😑 Bored' },
  { value: 'frustrated', label: '😤 Frustrated' },
];

const MISTAKES = [
  'early_exit', 'late_entry', 'oversized', 'no_sl', 'revenge', 'fomo',
];

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D'];
const SESSIONS = ['asian', 'london', 'new_york', 'pre_market', 'regular', 'after_hours'];

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
    confidence: 5,
    followedPlan: true,
    entryQuality: 5,
    exitQuality: 5,
    managementQuality: 5,
  });

  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef(false);

  // Load from database (primary) or localStorage (fallback)
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('trading_journal_data')
            .select('trades, folders')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) {
            if (data.trades && Array.isArray(data.trades)) setTrades(data.trades as unknown as Trade[]);
            if (data.folders && Array.isArray(data.folders)) setFolders(data.folders as unknown as TradingFolder[]);
            isLoadedRef.current = true;
            return;
          }
        }
      } catch (e) {
        console.warn('DB load failed, falling back to localStorage');
      }
      // Fallback to localStorage
      const savedTrades = localStorage.getItem('tradingJournal');
      if (savedTrades) setTrades(JSON.parse(savedTrades));
      const savedFolders = localStorage.getItem('tradingJournalFolders');
      if (savedFolders) setFolders(JSON.parse(savedFolders));
      isLoadedRef.current = true;
    };
    loadData();
  }, []);

  // Auto-save to database with debounce
  const saveToDatabase = useCallback(async (tradesToSave: Trade[], foldersToSave: TradingFolder[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in, save to localStorage as fallback
        try { localStorage.setItem('tradingJournal', JSON.stringify(tradesToSave)); } catch {}
        try { localStorage.setItem('tradingJournalFolders', JSON.stringify(foldersToSave)); } catch {}
        return;
      }
      await supabase
        .from('trading_journal_data')
        .upsert({
          user_id: user.id,
          trades: tradesToSave as unknown as any,
          folders: foldersToSave as unknown as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('DB save failed, saving to localStorage');
      try { localStorage.setItem('tradingJournal', JSON.stringify(tradesToSave)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToDatabase(trades, folders);
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [trades, folders, saveToDatabase]);

  const filteredTrades = selectedFolderId === 'default' 
    ? trades : trades.filter(t => t.folderId === selectedFolderId);

  const getFolderTradeCount = (folderId: string) => {
    if (folderId === 'default') return trades.length;
    return trades.filter(t => t.folderId === folderId).length;
  };

  const handleImportTrades = (importedTrades: Trade[], replaceMode: boolean = false) => {
    const tradesWithFolder = importedTrades.map(trade => ({
      ...trade, folderId: selectedFolderId === 'default' ? undefined : selectedFolderId
    }));
    if (replaceMode) {
      if (selectedFolderId === 'default') setTrades(tradesWithFolder);
      else setTrades(prev => [...prev.filter(t => t.folderId !== selectedFolderId), ...tradesWithFolder]);
    } else {
      setTrades(prev => [...prev, ...tradesWithFolder]);
    }
    toast({ title: "Import Successful!", description: `Added ${importedTrades.length} trades` });
  };

  const clearAllTrades = () => {
    const count = selectedFolderId === 'default' ? trades.length : filteredTrades.length;
    if (window.confirm(`Delete all ${count} trades in this room?`)) {
      if (selectedFolderId === 'default') setTrades([]);
      else setTrades(prev => prev.filter(t => t.folderId !== selectedFolderId));
      toast({ title: "Trades Cleared" });
    }
  };

  const calculatePnL = (trade: Partial<Trade> & { entryPrice: number; quantity: number; side: string; type?: string }, exitPrice: number) => {
    const isCFD = trade.type === 'CFD';
    const contractSize = (trade as any).contractSize || 1;
    const priceDiff = trade.side === 'LONG' ? (exitPrice - trade.entryPrice) : (trade.entryPrice - exitPrice);
    
    let pnl: number;
    if (isCFD) {
      // CFD: P&L = (price diff) * lots * contract size
      pnl = priceDiff * trade.quantity * contractSize;
    } else {
      // Stock: P&L = (price diff) * shares
      pnl = priceDiff * trade.quantity;
    }
    
    const investment = trade.entryPrice * trade.quantity * (isCFD ? contractSize : 1);
    const pnlPercentage = investment !== 0 ? (pnl / investment) * 100 : 0;
    return { pnl, pnlPercentage };
  };

  const handleCloseTrade = (tradeId: string, exitPrice: number) => {
    setTrades(prev => prev.map(trade => {
      if (trade.id === tradeId) {
        const { pnl, pnlPercentage } = calculatePnL(trade, exitPrice);
        return { ...trade, exitPrice, pnl, pnlPercentage, status: 'CLOSED' as const, exitTime: new Date().toISOString() };
      }
      return trade;
    }));
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `trade-screenshots/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('trade-screenshots').upload(path, file);
      if (error) { console.error('Upload error:', error); return null; }
      const { data } = supabase.storage.from('trade-screenshots').getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  };

  const handleAddTrade = async () => {
    if (!newTrade.symbol || !newTrade.entryPrice) {
      toast({ title: "Error", description: "Fill required fields", variant: "destructive" });
      return;
    }

    let screenshotUrl: string | undefined;
    if (screenshotFile) {
      const url = await uploadScreenshot(screenshotFile);
      if (url) screenshotUrl = url;
    }

    // Calculate initial risk from SL
    let initialRisk: number | undefined;
    if (newTrade.stopLoss && newTrade.entryPrice) {
      initialRisk = Math.abs(newTrade.entryPrice - newTrade.stopLoss) * (newTrade.quantity || 1);
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
      folderId: selectedFolderId === 'default' ? undefined : selectedFolderId,
      entryTime: new Date().toISOString(),
      stopLoss: newTrade.stopLoss,
      takeProfit: newTrade.takeProfit,
      initialRisk,
      setup: newTrade.setup,
      timeframe: newTrade.timeframe,
      session: newTrade.session as Trade['session'],
      emotion: newTrade.emotion as Trade['emotion'],
      emotionScore: newTrade.emotionScore,
      confidence: newTrade.confidence,
      followedPlan: newTrade.followedPlan,
      entryQuality: newTrade.entryQuality,
      exitQuality: newTrade.exitQuality,
      managementQuality: newTrade.managementQuality,
      disciplineRating: newTrade.disciplineRating as Trade['disciplineRating'],
      mistakes: selectedMistakes.length > 0 ? selectedMistakes : undefined,
      screenshots: screenshotUrl ? [screenshotUrl] : undefined,
      notes: newTrade.notes,
    };
    setTrades(prev => [...prev, trade]);
    setIsAddingTrade(false);
    setScreenshotFile(null);
    setSelectedMistakes([]);
    setNewTrade({
      date: new Date().toISOString().split('T')[0], side: 'LONG', type: 'STOCK', status: 'OPEN',
      strategy: '', quantity: 1, confidence: 5, followedPlan: true,
      entryQuality: 5, exitQuality: 5, managementQuality: 5,
    });
    toast({ title: "Trade Added" });
  };

  const handleAddFolder = () => {
    if (!newFolder.name.trim()) return;
    setFolders(prev => [...prev, {
      id: `folder-${Date.now()}`, name: newFolder.name.trim(),
      description: newFolder.description.trim(), color: 'bg-blue-500',
      icon: newFolder.icon, createdAt: new Date()
    }]);
    setNewFolder({ name: '', description: '', icon: '📁' });
    toast({ title: 'Room Created' });
  };

  return (
    <div className="w-full min-h-screen flex bg-background text-xs">
      {/* Sidebar */}
      <div className="w-52 border-r border-border/30 flex flex-col bg-card/50 hidden lg:flex">
        <div className="p-3 border-b border-border/30 flex items-center justify-between">
          <span className="flex items-center gap-2 text-terminal-green font-bold text-sm">
            <Folder className="h-4 w-4" /> Trading Rooms
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowFolderManager(true)} className="h-7 w-7 p-0">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {folders.map(folder => (
              <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm",
                  selectedFolderId === folder.id
                    ? "bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}>
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
              📔 ABLE TRADING JOURNAL — {folders.find(f => f.id === selectedFolderId)?.name.toUpperCase()}
            </span>
            <div className="text-xs text-muted-foreground mt-1">
              {filteredTrades.length} trades • Last updated: {new Date().toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="lg:hidden">
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.icon} {f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {trades.length > 0 && (
              <Button onClick={clearAllTrades} variant="destructive" size="sm">
                <Trash2 className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            <Button onClick={() => setShowCSVImport(true)} variant="outline" size="sm" className="bg-terminal-amber/20 text-terminal-amber">
              <Upload className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button onClick={() => setIsAddingTrade(true)} size="sm" className="bg-terminal-green hover:bg-terminal-green/90 text-black">
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <JournalTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          trades={filteredTrades}
          initialCapital={100}
          onDeleteTrade={(id) => setTrades(prev => prev.filter(t => t.id !== id))}
          onCloseTrade={handleCloseTrade}
        />
      </div>

      {/* CSV Import */}
      <CSVImportDialog open={showCSVImport} onOpenChange={setShowCSVImport} onImport={handleImportTrades} existingTrades={trades} targetFolderId={selectedFolderId} />

      {/* Add Trade Dialog — Enhanced */}
      <Dialog open={isAddingTrade} onOpenChange={setIsAddingTrade}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-terminal-green">Add New Trade</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Symbol *</Label>
                <Input value={newTrade.symbol || ''} onChange={e => setNewTrade({...newTrade, symbol: e.target.value})} placeholder="BTCUSD" /></div>
              <div><Label className="text-xs">Date</Label>
                <Input type="date" value={newTrade.date || ''} onChange={e => setNewTrade({...newTrade, date: e.target.value})} /></div>
            </div>
            {/* Row 2: Type + Side */}
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs">Instrument</Label>
                <Select value={newTrade.type || 'CFD'} onValueChange={v => setNewTrade({...newTrade, type: v as 'CFD' | 'STOCK'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CFD">CFD</SelectItem><SelectItem value="STOCK">Stock</SelectItem></SelectContent>
                </Select></div>
              <div><Label className="text-xs">Side</Label>
                <Select value={newTrade.side} onValueChange={v => setNewTrade({...newTrade, side: v as 'LONG' | 'SHORT'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LONG">LONG</SelectItem><SelectItem value="SHORT">SHORT</SelectItem></SelectContent>
                </Select></div>
              <div><Label className="text-xs">Entry Price *</Label>
                <Input type="number" value={newTrade.entryPrice || ''} onChange={e => setNewTrade({...newTrade, entryPrice: parseFloat(e.target.value)})} /></div>
              <div><Label className="text-xs">{newTrade.type === 'CFD' ? 'Lots' : 'Shares'}</Label>
                <Input type="number" value={newTrade.quantity || 1} onChange={e => setNewTrade({...newTrade, quantity: parseFloat(e.target.value)})} step={newTrade.type === 'CFD' ? '0.01' : '1'} /></div>
            </div>
            {/* Row 3: SL/TP */}
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Stop Loss</Label>
                <Input type="number" value={newTrade.stopLoss ?? ''} onChange={e => {
                  const val = e.target.value;
                  setNewTrade({...newTrade, stopLoss: val === '' ? undefined : parseFloat(val)});
                }} placeholder="ราคา SL" /></div>
              <div><Label className="text-xs">Take Profit</Label>
                <Input type="number" value={newTrade.takeProfit ?? ''} onChange={e => {
                  const val = e.target.value;
                  setNewTrade({...newTrade, takeProfit: val === '' ? undefined : parseFloat(val)});
                }} placeholder="ราคา TP" /></div>
              <div><Label className="text-xs">Initial Risk $</Label>
                <Input type="number" disabled value={
                  newTrade.stopLoss && newTrade.entryPrice 
                    ? (Math.abs(newTrade.entryPrice - newTrade.stopLoss) * (newTrade.quantity || 1)).toFixed(2) : ''
                } placeholder="Auto" /></div>
            </div>
            {/* Row 4: Setup */}
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Setup</Label>
                <Input value={newTrade.setup || ''} onChange={e => setNewTrade({...newTrade, setup: e.target.value})} placeholder="Breakout" /></div>
              <div><Label className="text-xs">Timeframe</Label>
                <Select value={newTrade.timeframe || 'none'} onValueChange={v => setNewTrade({...newTrade, timeframe: v === 'none' ? undefined : v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{TIMEFRAMES.map(tf => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="text-xs">Session</Label>
                <Select value={newTrade.session || 'none'} onValueChange={v => setNewTrade({...newTrade, session: v === 'none' ? undefined : v as Trade['session']})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            {/* Strategy & Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Strategy</Label>
                <Input value={newTrade.strategy || ''} onChange={e => setNewTrade({...newTrade, strategy: e.target.value})} /></div>
              <div><Label className="text-xs">Emotion</Label>
                <Select value={newTrade.emotion || 'none'} onValueChange={v => setNewTrade({...newTrade, emotion: v === 'none' ? undefined : v as Trade['emotion']})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{EMOTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>

            {/* Confidence slider */}
            <div>
              <Label className="text-xs">Confidence: {newTrade.confidence || 5}/10</Label>
              <Slider value={[newTrade.confidence || 5]} min={1} max={10} step={1} onValueChange={v => setNewTrade({...newTrade, confidence: v[0]})} className="mt-1" />
            </div>

            {/* Quality sliders */}
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Entry: {newTrade.entryQuality || 5}</Label>
                <Slider value={[newTrade.entryQuality || 5]} min={1} max={10} step={1} onValueChange={v => setNewTrade({...newTrade, entryQuality: v[0]})} /></div>
              <div><Label className="text-xs">Exit: {newTrade.exitQuality || 5}</Label>
                <Slider value={[newTrade.exitQuality || 5]} min={1} max={10} step={1} onValueChange={v => setNewTrade({...newTrade, exitQuality: v[0]})} /></div>
              <div><Label className="text-xs">Mgmt: {newTrade.managementQuality || 5}</Label>
                <Slider value={[newTrade.managementQuality || 5]} min={1} max={10} step={1} onValueChange={v => setNewTrade({...newTrade, managementQuality: v[0]})} /></div>
            </div>

            {/* Followed Plan */}
            <div className="flex items-center gap-3">
              <Switch checked={newTrade.followedPlan ?? true} onCheckedChange={v => setNewTrade({...newTrade, followedPlan: v})} />
              <Label className="text-xs">Followed Plan?</Label>
            </div>

            {/* Mistakes */}
            <div>
              <Label className="text-xs mb-1 block">Mistakes</Label>
              <div className="flex flex-wrap gap-2">
                {MISTAKES.map(m => (
                  <label key={m} className="flex items-center gap-1 text-xs">
                    <Checkbox checked={selectedMistakes.includes(m)} onCheckedChange={c => {
                      if (c) setSelectedMistakes(prev => [...prev, m]);
                      else setSelectedMistakes(prev => prev.filter(x => x !== m));
                    }} className="h-3 w-3" />
                    {m.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            {/* Screenshot */}
            <div>
              <Label className="text-xs mb-1 block">📸 Screenshot</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={e => setScreenshotFile(e.target.files?.[0] || null)} className="text-xs" />
                {screenshotFile && <span className="text-xs text-emerald-400">✓ {screenshotFile.name}</span>}
              </div>
            </div>

            {/* Notes */}
            <div><Label className="text-xs">Notes</Label>
              <Textarea value={newTrade.notes || ''} onChange={e => setNewTrade({...newTrade, notes: e.target.value})} rows={2} /></div>
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
          <DialogHeader><DialogTitle>Manage Trading Rooms</DialogTitle></DialogHeader>
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
