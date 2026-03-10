import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Bell, Construction } from 'lucide-react';

const ScreenerFilings = () => {
  const [symbol, setSymbol] = useState('');
  const [docType, setDocType] = useState('all');
  const [notified, setNotified] = useState(() => localStorage.getItem('filings-notify') === 'true');

  const handleNotify = () => {
    localStorage.setItem('filings-notify', 'true');
    setNotified(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-3 border-b border-border shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search symbol... e.g. SET:GULF, NASDAQ:AAPL"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="pl-8 h-7 text-[10px] font-mono border-border"
          />
        </div>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-28 h-7 text-[10px] font-mono border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-mono">All Types</SelectItem>
            <SelectItem value="annual" className="text-[10px] font-mono">Annual</SelectItem>
            <SelectItem value="quarterly" className="text-[10px] font-mono">Quarterly</SelectItem>
            <SelectItem value="interim" className="text-[10px] font-mono">Interim</SelectItem>
            <SelectItem value="slides" className="text-[10px] font-mono">Slides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coming Soon State */}
      <ScrollArea className="flex-1">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-xs">
            <div className="w-12 h-12 rounded-full bg-terminal-amber/10 border border-terminal-amber/30 flex items-center justify-center mx-auto">
              <Construction className="w-6 h-6 text-terminal-amber" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-foreground mb-1">
                🚧 Filing Data Coming Soon
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                We're building the TradingView filings connector to bring you annual reports, quarterly statements, and presentation slides.
              </p>
            </div>
            {notified ? (
              <Badge variant="outline" className="border-terminal-green/30 text-terminal-green text-[10px] font-mono">
                ✓ You'll be notified
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNotify}
                className="border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/10 text-[10px] font-mono h-7 gap-1"
              >
                <Bell className="w-3 h-3" />
                Notify Me
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScreenerFilings;
