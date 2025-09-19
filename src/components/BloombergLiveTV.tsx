import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings, 
  Wifi,
  Radio,
  TrendingUp,
  Globe,
  Clock,
  Users
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  time: string;
  category: 'markets' | 'politics' | 'economy' | 'breaking';
  priority: 'high' | 'medium' | 'low';
  impact: 'positive' | 'negative' | 'neutral';
}

interface MarketTicker {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export const BloombergLiveTV: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [viewerCount, setViewerCount] = useState(12847);
  
  const videoRef = useRef<HTMLDivElement>(null);

  // Live news feed
  const [newsItems] = useState<NewsItem[]>([
    {
      id: '1',
      title: 'Federal Reserve Signals Potential Rate Cut in December Meeting',
      time: '14:32',
      category: 'economy',
      priority: 'high',
      impact: 'positive'
    },
    {
      id: '2', 
      title: 'Tech Stocks Rally as AI Sector Shows Strong Q3 Earnings',
      time: '14:28',
      category: 'markets',
      priority: 'high',
      impact: 'positive'
    },
    {
      id: '3',
      title: 'Oil Prices Surge on Middle East Tensions',
      time: '14:25',
      category: 'markets',
      priority: 'medium',
      impact: 'neutral'
    },
    {
      id: '4',
      title: 'European Central Bank Maintains Dovish Stance',
      time: '14:20',
      category: 'economy',
      priority: 'medium',
      impact: 'negative'
    }
  ]);

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'breaking':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'markets':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'economy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'politics':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-400" />;
      case 'negative':
        return <TrendingUp className="h-3 w-3 text-red-400 transform rotate-180" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-amber-400" />;
    }
  };

  return (
    <div className="w-full h-full bg-background">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100%-80px)]">
        {/* Main Video Player */}
        <div className="lg:col-span-2 bg-black relative">
          <div 
            ref={videoRef}
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black relative overflow-hidden"
          >
            {/* Simulated Live Feed */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-amber-900/20" />
            
            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-bold text-sm">LIVE</span>
            </div>
            
            {/* Current Program Info */}
            <div className="absolute bottom-20 left-4 right-4">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-bold">Market Watch</h3>
                <p className="text-gray-300 text-sm">Live coverage of today's market movements and economic news</p>
              </div>
            </div>
            
            {/* Player Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsMuted(!isMuted)}
                  className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Center Play Button */}
            {!isPlaying && (
              <Button
                size="lg"
                onClick={() => setIsPlaying(true)}
                className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Play className="h-8 w-8 ml-1" />
              </Button>
            )}
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

        {/* Sidebar - News Feed */}
        <div className="bg-background border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-primary flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Breaking News
            </h2>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="space-y-3 p-4">
              {newsItems.map((item) => (
                <Card key={item.id} className="bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`text-xs ${getCategoryColor(item.category)}`}>
                            {item.category.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.time}</span>
                          {getImpactIcon(item.impact)}
                        </div>
                        <h3 className="text-sm font-medium leading-tight">{item.title}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Quick Access */}
          <div className="p-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Quick Access</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Economic Calendar
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Earnings
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Fed Watch
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Crypto
              </Button>
            </div>
          </div>
        </div>
      </div>
      
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