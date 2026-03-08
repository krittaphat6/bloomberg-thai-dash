import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trade } from '@/utils/tradingMetrics';

interface CalendarViewProps {
  trades: Trade[];
}

interface DayData {
  date: Date;
  totalPnL: number;
  tradeCount: number;
  trades: Trade[];
}

type ViewMode = 'calendar' | 'gallery';

export default function CalendarView({ trades }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[] | null>(null);
  
  const { monthData, monthTotal } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const tradesByDate = new Map<string, Trade[]>();
    let monthTotal = 0;
    
    trades.forEach(trade => {
      if (trade.pnl !== undefined) {
        const tradeDate = new Date(trade.date);
        if (tradeDate.getMonth() === month && tradeDate.getFullYear() === year) {
          monthTotal += trade.pnl;
          const dateKey = trade.date;
          if (!tradesByDate.has(dateKey)) tradesByDate.set(dateKey, []);
          tradesByDate.get(dateKey)!.push(trade);
        }
      }
    });
    
    const days: (DayData | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayTrades = tradesByDate.get(dateKey) || [];
      const totalPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      days.push({ date, totalPnL, tradeCount: dayTrades.length, trades: dayTrades });
    }
    return { monthData: days, monthTotal };
  }, [trades, currentDate]);

  // Gallery: all closed trades with screenshots, sorted by date desc
  const galleryTrades = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return trades
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year && t.status === 'CLOSED';
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades, currentDate]);
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const nd = new Date(prev);
      nd.setMonth(nd.getMonth() + direction);
      return nd;
    });
  };
  
  const formatMonth = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  return (
    <div className="bg-card/50 border border-border/20 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}
            className="h-7 text-xs border-terminal-green/30 text-terminal-green hover:bg-terminal-green/20">Today</Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="h-7 w-7 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="h-7 w-7 p-0"><ChevronRight className="h-4 w-4" /></Button>
          
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border/30 rounded-md overflow-hidden ml-2">
            <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="sm" className={`h-7 rounded-none text-xs ${viewMode === 'calendar' ? 'bg-terminal-green/20 text-terminal-green' : ''}`}
              onClick={() => setViewMode('calendar')}>
              <CalendarDays className="h-3 w-3 mr-1" /> Calendar
            </Button>
            <Button variant={viewMode === 'gallery' ? 'default' : 'ghost'} size="sm" className={`h-7 rounded-none text-xs ${viewMode === 'gallery' ? 'bg-terminal-green/20 text-terminal-green' : ''}`}
              onClick={() => setViewMode('gallery')}>
              <LayoutGrid className="h-3 w-3 mr-1" /> Gallery
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-terminal-green font-bold">{formatMonth(currentDate)}</span>
          <span className={`font-bold ${monthTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {monthTotal >= 0 ? '+' : ''}{monthTotal.toFixed(2)} USD
          </span>
        </div>
      </div>
      
      {viewMode === 'calendar' ? (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthData.map((day, index) => (
              <div key={index}
                className={`min-h-[80px] p-1 rounded border transition-colors
                  ${day ? 'border-border/30 hover:border-terminal-green/50 cursor-pointer' : 'border-transparent'}
                  ${day?.tradeCount ? (day.totalPnL >= 0 ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-red-500/10 hover:bg-red-500/20') : 'bg-muted/20'}
                `}
                onClick={() => day?.tradeCount && day.tradeCount > 0 && setSelectedDayTrades(day.trades)}
              >
                {day && (
                  <>
                    <div className="text-xs text-muted-foreground">{day.date.getDate()}</div>
                    {day.tradeCount > 0 && (
                      <div className="mt-1">
                        <div className={`text-sm font-bold ${day.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {day.totalPnL >= 0 ? '+' : ''}{day.totalPnL.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.tradeCount} Trade{day.tradeCount > 1 ? 's' : ''}
                        </div>
                        {/* Show screenshot indicator */}
                        {day.trades.some(t => t.screenshots && t.screenshots.length > 0) && (
                          <Image className="h-3 w-3 text-cyan-400 mt-1" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Gallery View - Trade Cards with Screenshots */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {galleryTrades.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-12 text-sm">
              No trades this month
            </div>
          ) : (
            galleryTrades.map((trade, i) => (
              <div key={trade.id || i} className="bg-background/50 border border-border/30 rounded-lg overflow-hidden hover:border-terminal-green/40 transition-colors">
                {/* Screenshot */}
                {trade.screenshots && trade.screenshots.length > 0 ? (
                  <div className="aspect-video bg-muted/20 cursor-pointer relative overflow-hidden" onClick={() => setPreviewImage(trade.screenshots![0])}>
                    <img src={trade.screenshots[0]} alt={`${trade.symbol} setup`} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/20 flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Trade Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{trade.symbol}</span>
                    <span className="text-xs text-muted-foreground font-mono">{trade.date}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {trade.setup && <Badge variant="outline" className="text-[10px] bg-muted/30">{trade.setup}</Badge>}
                    {trade.session && <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30">{trade.session.replace('_', ' ')}</Badge>}
                    <Badge variant="outline" className={`text-[10px] ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {trade.side}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-border/20">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${(trade.pnl || 0) >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-xs text-muted-foreground">{(trade.pnl || 0) >= 0 ? 'Profit' : 'Loss'}</span>
                    </div>
                    <span className={`font-bold font-mono ${(trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Day Trades Dialog */}
      <Dialog open={!!selectedDayTrades} onOpenChange={() => setSelectedDayTrades(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Trades for this day</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedDayTrades?.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/20 rounded border border-border/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${t.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{t.side}</Badge>
                  <span className="font-bold text-sm">{t.symbol}</span>
                  {t.screenshots && t.screenshots.length > 0 && (
                    <Image className="h-3 w-3 text-cyan-400 cursor-pointer" onClick={() => setPreviewImage(t.screenshots![0])} />
                  )}
                </div>
                <span className={`font-mono font-bold ${(t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(t.pnl || 0) >= 0 ? '+' : ''}{(t.pnl || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Image Preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Trade Screenshot</DialogTitle></DialogHeader>
          {previewImage && <img src={previewImage} alt="Trade screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
