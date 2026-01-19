// Mobile-optimized TopNews component
// Simplified UI with full functionality preserved

import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  RefreshCw, Sparkles, ExternalLink, Brain, TrendingUp, 
  Clock, Loader2, Plus, X, ChevronDown, ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ASSET_DISPLAY_NAMES } from '@/services/ableNewsIntelligence';
import { fetchRealTimePrice, fetchCryptoPrice } from '@/services/realTimePriceService';

interface MobileTopNewsProps {
  onBack?: () => void;
}

interface MacroAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: string;
  ableAnalysis?: {
    P_up_pct: number;
    decision: string;
    confidence: number;
    thai_summary?: string;
    key_drivers?: string[];
  };
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  url?: string;
}

interface AssetPrice {
  price: number;
  change: number;
  changePercent: number;
}

const ASSET_CATEGORIES = {
  commodities: ['XAUUSD', 'XAGUSD'],
  crypto: ['BTCUSD', 'ETHUSD'],
  forex: ['EURUSD', 'USDJPY'],
};

export function MobileTopNews({ onBack }: MobileTopNewsProps) {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'analysis' | 'news'>('analysis');
  const [macroData, setMacroData] = useState<MacroAnalysis[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedAssets, setPinnedAssets] = useState([{ symbol: 'XAUUSD', addedAt: Date.now() }]);
  const [assetPrices, setAssetPrices] = useState<Record<string, AssetPrice>>({});
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [freshNewsCount, setFreshNewsCount] = useState(0);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    const prices: Record<string, AssetPrice> = {};
    for (const asset of pinnedAssets) {
      try {
        const isCrypto = ['BTCUSD', 'ETHUSD'].includes(asset.symbol);
        const priceData = isCrypto 
          ? await fetchCryptoPrice(asset.symbol) 
          : await fetchRealTimePrice(asset.symbol);
        
        if (priceData) {
          prices[asset.symbol] = {
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent,
          };
        }
      } catch (error) {
        console.warn(`Price error for ${asset.symbol}:`, error);
      }
    }
    setAssetPrices(prices);
  }, [pinnedAssets]);

  // Fetch news and analysis
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('news-aggregator', {
        body: { pinnedAssets: pinnedAssets.map(p => p.symbol) }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setMacroData(data.macro || []);
        setNewsItems(data.rawNews?.slice(0, 20) || []);
        setFreshNewsCount(data.newsMetadata?.freshNewsCount || 0);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: 'Error loading data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pinnedAssets, toast]);

  useEffect(() => {
    fetchData();
    fetchPrices();
    
    const priceInterval = setInterval(fetchPrices, 30000);
    const dataInterval = setInterval(() => fetchData(true), 600000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(dataInterval);
    };
  }, [fetchData, fetchPrices]);

  const handleAddAsset = (symbol: string) => {
    if (pinnedAssets.find(p => p.symbol === symbol)) return;
    if (pinnedAssets.length >= 4) {
      toast({ title: 'Maximum 4 assets on mobile', variant: 'destructive' });
      return;
    }
    
    setPinnedAssets(prev => [...prev, { symbol, addedAt: Date.now() }]);
    setShowAddAsset(false);
    setTimeout(() => fetchData(true), 300);
  };

  const handleRemoveAsset = (symbol: string) => {
    setPinnedAssets(prev => prev.filter(p => p.symbol !== symbol));
    setMacroData(prev => prev.filter(m => m.symbol !== symbol));
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-terminal-green" />
          <p className="text-xs text-muted-foreground">Loading ABLE-HF 3.0...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <span className="font-mono text-sm font-bold text-terminal-green">TOP NEWS</span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>ABLE-HF 3.0</span>
              {freshNewsCount > 0 && (
                <Badge variant="outline" className="h-4 text-[9px] px-1 border-terminal-green/30 text-terminal-green">
                  {freshNewsCount} fresh
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        {[
          { key: 'analysis', label: 'AI Analysis', icon: Brain },
          { key: 'news', label: 'News Feed', icon: ExternalLink },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === tab.key 
                ? 'text-terminal-green border-b-2 border-terminal-green' 
                : 'text-muted-foreground'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'analysis' ? (
          <div className="p-3 space-y-3">
            {/* Add Asset Button */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">
                ASSETS ({pinnedAssets.length}/4)
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 text-[10px] px-2"
                onClick={() => setShowAddAsset(!showAddAsset)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
                <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showAddAsset ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Add Asset Dropdown */}
            {showAddAsset && (
              <Card className="p-2 bg-card/50">
                <div className="space-y-2">
                  {Object.entries(ASSET_CATEGORIES).map(([cat, assets]) => (
                    <div key={cat}>
                      <p className="text-[9px] text-muted-foreground uppercase mb-1">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {assets.filter(a => !pinnedAssets.find(p => p.symbol === a)).map(asset => (
                          <Badge
                            key={asset}
                            variant="outline"
                            className="text-[10px] cursor-pointer hover:bg-terminal-green/10 hover:border-terminal-green"
                            onClick={() => handleAddAsset(asset)}
                          >
                            <Plus className="w-2 h-2 mr-0.5" />
                            {ASSET_DISPLAY_NAMES[asset] || asset}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Analysis Cards */}
            {macroData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assets pinned</p>
                <p className="text-xs">Add assets to see AI analysis</p>
              </div>
            ) : (
              macroData.map(macro => {
                const analysis = macro.ableAnalysis;
                const P_up = analysis?.P_up_pct || 50;
                const decision = analysis?.decision || 'HOLD';
                const price = assetPrices[macro.symbol];
                
                return (
                  <Card 
                    key={macro.symbol} 
                    className="p-3 bg-card/50 border-border/50 relative group"
                  >
                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveAsset(macro.symbol)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 pr-6">
                      <div>
                        <h3 className="font-medium text-sm">{ASSET_DISPLAY_NAMES[macro.symbol] || macro.symbol}</h3>
                        {price && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">${price.price.toFixed(2)}</span>
                            <span className={price.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge 
                        className={`text-xs ${
                          P_up > 55 ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                          P_up < 45 ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {P_up.toFixed(0)}%
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                        <span>Bearish</span>
                        <span>Bullish</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            P_up > 55 ? 'bg-green-500' : P_up < 45 ? 'bg-red-500' : 'bg-muted-foreground'
                          }`}
                          style={{ width: `${P_up}%` }}
                        />
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {analysis?.thai_summary || macro.analysis}
                    </p>

                    {/* Key Drivers */}
                    {analysis?.key_drivers && analysis.key_drivers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {analysis.key_drivers.slice(0, 2).map((driver, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] py-0">
                            {driver}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Decision */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Brain className="w-3 h-3 text-terminal-green" />
                        ABLE-HF 3.0
                      </span>
                      <Badge 
                        className={`text-[10px] ${
                          decision.includes('BUY') ? 'bg-green-500/10 text-green-500' :
                          decision.includes('SELL') ? 'bg-red-500/10 text-red-500' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {decision}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          /* News Feed Tab */
          <div className="p-3 space-y-2">
            {newsItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ExternalLink className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No news available</p>
              </div>
            ) : (
              newsItems.map((item, idx) => (
                <a
                  key={item.id || idx}
                  href={item.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="p-2.5 bg-card/30 border-border/30 hover:border-terminal-green/30 transition-colors">
                    <p className="text-xs leading-relaxed line-clamp-2 text-foreground/90 mb-1.5">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="text-terminal-green/70">{item.source}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                  </Card>
                </a>
              ))
            )}
          </div>
        )}
      </ScrollArea>

      {/* Last Updated Footer */}
      {lastUpdated && (
        <div className="px-3 py-1.5 border-t border-border text-center">
          <span className="text-[9px] text-muted-foreground font-mono">
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}

export default MobileTopNews;
