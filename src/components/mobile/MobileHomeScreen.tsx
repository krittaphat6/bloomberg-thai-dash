import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Loader2, Clock, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchRealTimePrice, fetchCryptoPrice, getSimulatedPrice } from '@/services/realTimePriceService';
import { supabase } from '@/integrations/supabase/client';

interface MobileHomeScreenProps {
  currentTime: Date;
  onOpenTopNews?: () => void;
}

interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isLoading?: boolean;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  url?: string;
}

// Market watchlist - smaller, focused list
const WATCHLIST = [
  { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
  { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'US500', name: 'S&P 500', type: 'index' },
  { symbol: 'EURUSD', name: 'EUR/USD', type: 'forex' },
];

export function MobileHomeScreen({ currentTime, onOpenTopNews }: MobileHomeScreenProps) {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Fetch real-time prices
  const fetchPrices = useCallback(async () => {
    const results: PriceData[] = [];
    
    for (const item of WATCHLIST) {
      try {
        let priceData;
        if (item.type === 'crypto') {
          priceData = await fetchCryptoPrice(item.symbol);
        } else {
          priceData = await fetchRealTimePrice(item.symbol);
        }
        
        if (priceData) {
          results.push({
            symbol: item.symbol,
            name: item.name,
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent,
          });
        } else {
          // Fallback to simulated
          const simulated = getSimulatedPrice(item.symbol);
          results.push({
            symbol: item.symbol,
            name: item.name,
            price: simulated.price,
            change: simulated.change,
            changePercent: simulated.changePercent,
          });
        }
      } catch (error) {
        console.warn(`Price error for ${item.symbol}:`, error);
        const simulated = getSimulatedPrice(item.symbol);
        results.push({
          symbol: item.symbol,
          name: item.name,
          price: simulated.price,
          change: simulated.change,
          changePercent: simulated.changePercent,
        });
      }
    }
    
    setPrices(results);
    setLoading(false);
  }, []);

  // Fetch news from edge function
  const fetchNews = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('news-aggregator', {
        body: { pinnedAssets: ['XAUUSD'] }
      });
      
      if (error) throw error;
      
      if (data?.rawNews) {
        // Get top 5 news items
        const topNews = data.rawNews.slice(0, 5).map((news: any, idx: number) => ({
          id: `news-${idx}`,
          title: news.title,
          source: news.source,
          timestamp: news.timestamp,
          url: news.url
        }));
        setNewsItems(topNews);
      }
    } catch (error) {
      console.warn('News fetch error:', error);
      // Fallback news
      setNewsItems([
        { id: '1', title: 'Markets await Fed decision...', source: 'Reuters', timestamp: Date.now() - 1800000 },
        { id: '2', title: 'Gold prices steady amid uncertainty', source: 'Bloomberg', timestamp: Date.now() - 3600000 },
        { id: '3', title: 'Bitcoin surges past key resistance', source: 'CoinDesk', timestamp: Date.now() - 7200000 },
      ]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchNews();
    
    // Refresh prices every 30 seconds
    const priceInterval = setInterval(fetchPrices, 30000);
    // Refresh news every 5 minutes
    const newsInterval = setInterval(fetchNews, 300000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(newsInterval);
    };
  }, [fetchPrices, fetchNews]);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol === 'EURUSD' || symbol.includes('USD') && !symbol.includes('BTC') && !symbol.includes('XAU')) {
      return price.toFixed(4);
    }
    if (price > 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price > 100) return price.toFixed(2);
    return price.toFixed(2);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <ScrollArea className="flex-1 bg-background">
      <div className="p-3 space-y-4">
        {/* Date Header - Minimal */}
        <div className="text-xs text-muted-foreground font-mono">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>

        {/* Compact Price Grid */}
        <div className="space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-terminal-green" />
            </div>
          ) : (
            prices.map((item) => {
              const isUp = item.changePercent >= 0;
              return (
                <div 
                  key={item.symbol}
                  className="flex items-center justify-between py-2.5 px-3 bg-card/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1 h-6 rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-mono text-sm font-medium text-terminal-green">{item.symbol}</div>
                      <div className="text-[10px] text-muted-foreground">{item.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">${formatPrice(item.price, item.symbol)}</div>
                    <div className={`flex items-center justify-end gap-0.5 text-xs ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* News Headlines - Compact with tap to open full TopNews */}
        <div className="space-y-2">
          <button 
            onClick={onOpenTopNews}
            className="w-full flex items-center justify-between"
          >
            <span className="text-xs font-medium text-terminal-green font-mono">TOP NEWS</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {newsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
            </div>
          </button>
          
          <div 
            className="space-y-1.5"
            onClick={onOpenTopNews}
          >
            {newsItems.slice(0, 3).map((news) => (
              <div 
                key={news.id}
                className="bg-card/30 rounded-lg p-2.5 border border-border/30 active:bg-card/50 transition-colors"
              >
                <p className="text-xs leading-relaxed line-clamp-2 text-foreground/90">
                  {news.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="text-terminal-green/70">{news.source}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimeAgo(news.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Footer - Minimal */}
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono">Live</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
