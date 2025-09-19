import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Radio,
  Clock,
  Users,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MarketTicker {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export const BloombergLiveTV: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [viewerCount, setViewerCount] = useState(12847);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const videoRef = useRef<HTMLDivElement>(null);

  // Market tickers
  const [marketTickers] = useState<MarketTicker[]>([
    { symbol: 'S&P 500', price: 4567.89, change: 23.45, changePercent: 0.52 },
    { symbol: 'DOW', price: 35234.12, change: -45.67, changePercent: -0.13 },
    { symbol: 'NASDAQ', price: 14523.67, change: 67.89, changePercent: 0.47 },
    { symbol: 'BTC', price: 43250.00, change: 1250.00, changePercent: 2.98 },
    { symbol: 'EUR/USD', price: 1.0845, change: 0.0023, changePercent: 0.21 },
    { symbol: 'GBP/USD', price: 1.2467, change: -0.0045, changePercent: -0.36 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      // Simulate viewer count fluctuation
      setViewerCount(prev => prev + Math.floor(Math.random() * 20 - 10));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-background">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-900/20 to-amber-800/10 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Radio className="h-4 w-4 text-black font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-400">Bloomberg Live US</h1>
              <p className="text-xs text-amber-300">Live Market Coverage • Financial News</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-muted-foreground">
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {viewerCount.toLocaleString()} viewers
            </div>
            
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Clock className="h-3 w-3" />
              {currentTime.toLocaleTimeString()}
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-amber-400 hover:bg-amber-500/10">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="w-full h-[calc(100vh-200px)]">
            {/* Main Video Player */}
            <div className="w-full h-full bg-black relative">
              <div 
                ref={videoRef}
                className="w-full h-full relative overflow-hidden"
              >
                {/* Bloomberg Live TV Embed */}
                <iframe
                  src="https://www.bloomberg.com/live/us"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Bloomberg Live TV"
                />
                
                {/* Live Indicator Overlay */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-500 font-bold text-sm">LIVE</span>
                </div>
                
                {/* Connection Status Overlay */}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                  <div className="flex items-center gap-2 text-xs text-white">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <span>
                      {connectionStatus === 'connected' ? 'Live Stream' : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Market Ticker */}
              <div className="bg-amber-900/20 border-t border-amber-500/20 p-2 overflow-hidden">
                <div className="flex animate-scroll">
                  {marketTickers.map((ticker, index) => (
                    <div key={index} className="flex items-center gap-2 min-w-fit px-4">
                      <span className="font-bold text-amber-400">{ticker.symbol}</span>
                      <span className="text-white">${ticker.price.toLocaleString()}</span>
                      <span className={`text-sm ${ticker.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(2)} ({ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll {
          animation: scroll 60s linear infinite;
        }
      `}</style>
    </div>
  );
};