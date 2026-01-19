import { TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileHomeScreenProps {
  currentTime: Date;
}

export function MobileHomeScreen({ currentTime }: MobileHomeScreenProps) {
  // Sample market data - in real app would come from API
  const marketOverview = [
    { symbol: 'SPY', name: 'S&P 500', price: '594.23', change: '+1.24%', isUp: true },
    { symbol: 'QQQ', name: 'NASDAQ', price: '518.67', change: '+1.89%', isUp: true },
    { symbol: 'DIA', name: 'DOW', price: '445.12', change: '-0.32%', isUp: false },
    { symbol: 'BTC', name: 'Bitcoin', price: '97,234', change: '+2.45%', isUp: true },
  ];

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-terminal-green/20 to-terminal-cyan/10 rounded-xl p-4 border border-terminal-green/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-terminal-green" />
            <span className="text-terminal-green font-bold">Market Overview</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {marketOverview.map((item) => (
            <div 
              key={item.symbol}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-terminal-green">{item.symbol}</span>
                {item.isUp ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className="text-lg font-mono">${item.price}</div>
              <div className={item.isUp ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>
                {item.change}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{item.name}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-bold text-terminal-green mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {['Charts', 'News', 'Calendar', 'Journal', 'Notes', 'AI'].map((action) => (
              <div
                key={action}
                className="bg-card border border-border rounded-lg p-3 text-center text-sm font-medium text-terminal-green active:bg-accent/50"
              >
                {action}
              </div>
            ))}
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>System Status</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
