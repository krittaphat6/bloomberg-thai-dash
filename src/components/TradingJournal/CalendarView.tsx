import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function CalendarView({ trades }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { monthData, monthTotal } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // Group trades by date
    const tradesByDate = new Map<string, Trade[]>();
    let monthTotal = 0;
    
    trades.forEach(trade => {
      if (trade.pnl !== undefined) {
        const tradeDate = new Date(trade.date);
        if (tradeDate.getMonth() === month && tradeDate.getFullYear() === year) {
          monthTotal += trade.pnl;
          const dateKey = trade.date;
          if (!tradesByDate.has(dateKey)) {
            tradesByDate.set(dateKey, []);
          }
          tradesByDate.get(dateKey)!.push(trade);
        }
      }
    });
    
    // Build calendar grid
    const days: (DayData | null)[] = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayTrades = tradesByDate.get(dateKey) || [];
      const totalPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      days.push({
        date,
        totalPnL,
        tradeCount: dayTrades.length,
        trades: dayTrades
      });
    }
    
    return { monthData: days, monthTotal };
  }, [trades, currentDate]);
  
  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  return (
    <div className="bg-card/50 border border-terminal-green/20 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="h-7 text-xs border-terminal-green/30 text-terminal-green hover:bg-terminal-green/20"
          >
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="h-7 w-7 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="h-7 w-7 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-terminal-green font-bold">
            {formatMonth(currentDate)}
          </span>
          <span className={`font-bold ${monthTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {monthTotal >= 0 ? '+' : ''}{monthTotal.toFixed(2)} USD
          </span>
        </div>
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthData.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[80px] p-1 rounded border transition-colors
              ${day ? 'border-border/30 hover:border-terminal-green/50 cursor-pointer' : 'border-transparent'}
              ${day?.tradeCount ? (
                day.totalPnL >= 0 
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 hover:bg-red-500/20'
              ) : 'bg-muted/20'}
            `}
          >
            {day && (
              <>
                <div className="text-xs text-muted-foreground">
                  {day.date.getDate()}
                </div>
                {day.tradeCount > 0 && (
                  <div className="mt-1">
                    <div className={`text-sm font-bold ${
                      day.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {day.totalPnL >= 0 ? '+' : ''}{day.totalPnL.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {day.tradeCount} Trade{day.tradeCount > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
