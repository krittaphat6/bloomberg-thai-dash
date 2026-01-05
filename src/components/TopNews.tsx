import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, Sparkles, ExternalLink, 
  Brain, TrendingUp, ChevronRight, Clock, BarChart3,
  Settings, Eye, FileText, Users, Zap, Loader2, Target, Plus, X,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AbleNewsResult, AbleNewsAnalyzer, ASSET_DISPLAY_NAMES, AVAILABLE_ASSETS } from '@/services/ableNewsIntelligence';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ============ TYPES ============
interface MacroAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: string;
  change: string;
  changeValue: number;
}

interface ForYouItem {
  id: string;
  symbol: string;
  type: string;
  title: string;
  source: string;
  timestamp: number;
  url: string;
  isNew: boolean;
}

interface DailyReport {
  id: string;
  date: string;
  title: string;
  description: string;
  time: string;
  assetsAnalyzed: number;
  isHighlighted: boolean;
  url: string;
  source: string;
}

interface XNotification {
  id: string;
  source: string;
  time: string;
  content: string;
  url: string;
}

interface PinnedAsset {
  symbol: string;
  addedAt: number;
}

interface RawNewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
}

// ============ CONSTANTS ============
const ASSET_CATEGORIES = {
  forex: {
    label: '💱 Forex',
    assets: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'USDCAD', 'NZDUSD']
  },
  commodities: {
    label: '🥇 Commodities',
    assets: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL']
  },
  crypto: {
    label: '₿ Crypto',
    assets: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD']
  },
  indices: {
    label: '📊 Indices',
    assets: ['US500', 'US30', 'US100', 'DE40', 'JP225']
  }
};

const PINNED_ASSETS_STORAGE_KEY = 'able-pinned-assets';

// ============ COMPONENTS ============
const SentimentBadge = ({ sentiment }: { sentiment: string }) => (
  <Badge 
    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      sentiment === 'bullish' 
        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
        : sentiment === 'bearish'
        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
        : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
    }`}
  >
    • {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
  </Badge>
);

interface TopNewsProps {
  onMaximize?: () => void;
  onClose?: () => void;
}

// Default pinned assets
const DEFAULT_PINNED_ASSETS: PinnedAsset[] = [
  { symbol: 'XAUUSD', addedAt: Date.now() }
];

const TopNews: React.FC<TopNewsProps> = () => {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'macro' | 'reports'>('macro');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Data state
  const [macroData, setMacroData] = useState<MacroAnalysis[]>([]);
  const [forYouItems, setForYouItems] = useState<ForYouItem[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [xNotifications, setXNotifications] = useState<XNotification[]>([]);
  const [rawNews, setRawNews] = useState<RawNewsItem[]>([]);

  // ABLE-HF 3.0 State - Merged with AI Macro Desk
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>(DEFAULT_PINNED_ASSETS);
  const [ableAnalysis, setAbleAnalysis] = useState<Record<string, AbleNewsResult>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});

  // Load pinned assets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(PINNED_ASSETS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPinnedAssets(parsed);
        }
      } catch (e) {
        console.error('Error loading pinned assets:', e);
      }
    }
  }, []);

  // Save pinned assets to localStorage
  useEffect(() => {
    if (pinnedAssets.length > 0) {
      localStorage.setItem(PINNED_ASSETS_STORAGE_KEY, JSON.stringify(pinnedAssets));
    }
  }, [pinnedAssets]);

  // Time updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const getMarketSession = () => {
    const hour = currentTime.getUTCHours();
    if (hour >= 13 && hour < 21) return { name: 'US Session', status: 'live' };
    if (hour >= 0 && hour < 9) return { name: 'Asian Session', status: 'live' };
    if (hour >= 7 && hour < 16) return { name: 'London Session', status: 'live' };
    return { name: 'After Hours', status: 'closed' };
  };

  const session = getMarketSession();

  // Get relevant keywords for asset
  const getRelevantKeywords = (symbol: string): string[] => {
    const keywordMap: Record<string, string[]> = {
      XAUUSD: ['gold', 'xau', 'precious', 'bullion', 'safe haven', 'fed', 'inflation'],
      XAGUSD: ['silver', 'xag', 'precious', 'industrial metal'],
      EURUSD: ['euro', 'eur', 'ecb', 'europe', 'eurozone', 'lagarde'],
      GBPUSD: ['pound', 'gbp', 'sterling', 'boe', 'bank of england', 'uk', 'britain'],
      USDJPY: ['yen', 'jpy', 'japan', 'boj', 'bank of japan', 'japanese'],
      AUDUSD: ['aussie', 'aud', 'australia', 'rba', 'iron ore'],
      USDCHF: ['swiss', 'chf', 'snb', 'switzerland', 'franc'],
      USDCAD: ['loonie', 'cad', 'canada', 'boc', 'oil'],
      NZDUSD: ['kiwi', 'nzd', 'new zealand', 'rbnz'],
      BTCUSD: ['bitcoin', 'btc', 'crypto', 'satoshi', 'halving', 'etf'],
      ETHUSD: ['ethereum', 'eth', 'vitalik', 'defi', 'smart contract'],
      SOLUSD: ['solana', 'sol'],
      XRPUSD: ['xrp', 'ripple'],
      USOIL: ['oil', 'wti', 'crude', 'opec', 'petroleum', 'energy'],
      UKOIL: ['brent', 'oil', 'crude', 'opec'],
      US500: ['s&p', 'spx', 'sp500', 'stock', 'wall street'],
      US30: ['dow', 'djia', 'dow jones'],
      US100: ['nasdaq', 'tech', 'qqq'],
      DE40: ['dax', 'german', 'germany'],
      JP225: ['nikkei', 'japan', 'japanese stock']
    };
    return keywordMap[symbol] || [symbol.toLowerCase()];
  };

  // ABLE-HF 3.0 Analysis Function
  const analyzeAsset = useCallback(async (symbol: string, newsItems?: RawNewsItem[]) => {
    const newsToUse = newsItems || rawNews;
    if (newsToUse.length === 0) {
      return null;
    }

    setIsAnalyzing(prev => ({ ...prev, [symbol]: true }));

    try {
      // Filter relevant news for this asset
      const relevantKeywords = getRelevantKeywords(symbol);
      
      const relevantNews = newsToUse.filter(item => {
        const titleLower = item.title.toLowerCase();
        return relevantKeywords.some(keyword => titleLower.includes(keyword));
      });

      // Use all news if no specific relevant news found
      const headlinesToAnalyze = relevantNews.length > 5 
        ? relevantNews.slice(0, 30).map(n => n.title)
        : newsToUse.slice(0, 30).map(n => n.title);

      // Run ABLE-HF 3.0 Analysis
      const analyzer = new AbleNewsAnalyzer({
        symbol,
        headlines: headlinesToAnalyze
      });

      const result = analyzer.analyze();
      
      setAbleAnalysis(prev => ({
        ...prev,
        [symbol]: result
      }));

      return result;

    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [symbol]: false }));
    }
  }, [rawNews]);

  // Analyze all pinned assets when news is loaded
  const analyzeAllPinnedAssets = useCallback(async (newsItems: RawNewsItem[]) => {
    for (const asset of pinnedAssets) {
      await analyzeAsset(asset.symbol, newsItems);
    }
  }, [pinnedAssets, analyzeAsset]);

  // Fetch news from edge function
  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching news from edge function...');
      
      const { data, error } = await supabase.functions.invoke('news-aggregator', {
        body: { pinnedAssets: pinnedAssets.map(p => p.symbol) }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success) {
        setMacroData(data.macro || []);
        setForYouItems(data.forYou || []);
        setDailyReports(data.dailyReports || []);
        setXNotifications(data.xNotifications || []);
        setRawNews(data.rawNews || []);
        setLastUpdated(new Date());
        
        console.log(`Loaded ${data.macro?.length || 0} macro items, ${data.rawNews?.length || 0} raw news`);
        
        // Auto-analyze all pinned assets
        if (data.rawNews?.length > 0) {
          analyzeAllPinnedAssets(data.rawNews);
        }
        
        if (!initialLoading) {
          toast({ 
            title: '✅ News updated', 
            description: `AI analysis complete • ${data.processingTime}ms`
          });
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast({ 
        title: 'Error fetching news', 
        description: 'Using cached data',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [toast, initialLoading, analyzeAllPinnedAssets, pinnedAssets]);

  // Add asset handler
  const handleAddAsset = (symbol: string) => {
    if (pinnedAssets.find(p => p.symbol === symbol)) {
      toast({ title: 'Asset already added', variant: 'destructive' });
      return;
    }
    if (pinnedAssets.length >= 8) {
      toast({ title: 'Maximum 8 assets', description: 'Remove an asset first', variant: 'destructive' });
      return;
    }
    
    setPinnedAssets(prev => [...prev, { symbol, addedAt: Date.now() }]);
    toast({ title: `✅ ${ASSET_DISPLAY_NAMES[symbol] || symbol} added` });
    
    // Immediately analyze the new asset
    if (rawNews.length > 0) {
      analyzeAsset(symbol, rawNews);
    }
  };

  // Remove asset handler
  const handleRemoveAsset = (symbol: string) => {
    setPinnedAssets(prev => prev.filter(p => p.symbol !== symbol));
    setAbleAnalysis(prev => {
      const newAnalysis = { ...prev };
      delete newAnalysis[symbol];
      return newAnalysis;
    });
  };

  // Initial load
  useEffect(() => {
    fetchNews();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Calculate pre-market countdown
  const getPreMarketCountdown = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    let hoursUntil = 9 - utcHours;
    let minutesUntil = 60 - utcMinutes;
    
    if (hoursUntil < 0) hoursUntil += 24;
    if (minutesUntil === 60) {
      minutesUntil = 0;
    } else {
      hoursUntil -= 1;
    }
    
    return `${hoursUntil}h ${minutesUntil}m`;
  };

  // Get available assets (not already pinned)
  const getAvailableAssets = () => {
    const pinnedSymbols = pinnedAssets.map(p => p.symbol);
    return Object.entries(ASSET_CATEGORIES).map(([key, category]) => ({
      ...category,
      assets: category.assets.filter(a => !pinnedSymbols.includes(a))
    }));
  };

  if (initialLoading) {
    return (
      <div className="flex h-full bg-black text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-zinc-400">Loading ABLE-HF 3.0 Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-emerald-400">
                Good afternoon, Trader.
              </h1>
              <p className="text-zinc-500 flex items-center gap-2 mt-1">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                ABLE-HF 3.0 News Intelligence • 40 Modules Active
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-zinc-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchNews}
                disabled={loading}
                className="text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent">
                <Settings className="w-4 h-4 mr-2" />
                Personalize
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Tab Selector */}
            <div className="flex gap-6 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('macro')}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'macro' 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                AI Macro Desk
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'reports' 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Daily Reports
              </button>
            </div>

            {activeTab === 'macro' ? (
              <>
                {/* AI Macro Desk Section - Merged with ABLE-HF 3.0 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h2 className="text-lg font-medium text-white flex items-center gap-2">
                          AI Macro Desk
                          <span className="text-zinc-600 text-sm">⚙</span>
                        </h2>
                        <p className="text-xs text-zinc-500">Market bias analysis</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Add Asset Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Asset
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-zinc-900 border-zinc-700" align="end">
                          {getAvailableAssets().map((category) => (
                            category.assets.length > 0 && (
                              <div key={category.label}>
                                <DropdownMenuLabel className="text-zinc-400 text-xs">
                                  {category.label}
                                </DropdownMenuLabel>
                                {category.assets.map((asset) => (
                                  <DropdownMenuItem 
                                    key={asset}
                                    onClick={() => handleAddAsset(asset)}
                                    className="text-white hover:bg-zinc-800 cursor-pointer"
                                  >
                                    {ASSET_DISPLAY_NAMES[asset] || asset}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="bg-zinc-700" />
                              </div>
                            )
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <button className="text-zinc-500 hover:text-emerald-400 text-sm flex items-center gap-1">
                        View All <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Macro Cards Grid - Using ABLE-HF 3.0 Analysis */}
                  <div className="grid grid-cols-2 gap-4">
                    {pinnedAssets.map((pinned) => {
                      const analysis = ableAnalysis[pinned.symbol];
                      const analyzing = isAnalyzing[pinned.symbol];
                      
                      // Use server macro data or ABLE analysis
                      const macroItem = macroData.find(m => m.symbol === pinned.symbol);
                      
                      const sentiment = analysis 
                        ? (analysis.P_up_pct > 55 ? 'bullish' : analysis.P_up_pct < 45 ? 'bearish' : 'neutral')
                        : (macroItem?.sentiment || 'neutral');
                      
                      const confidence = analysis 
                        ? Math.round(analysis.regime_adjusted_confidence * 100) 
                        : (macroItem?.confidence || 50);
                      
                      const analysisText = macroItem?.analysis || analysis?.thai_summary || 'Analyzing...';
                      
                      const changeValue = macroItem?.changeValue ?? (analysis
                        ? (analysis.P_up_pct - 50) / 10
                        : 0);
                      
                      const change = changeValue >= 0 ? `+${changeValue.toFixed(2)}%` : `${changeValue.toFixed(2)}%`;

                      return (
                        <Card 
                          key={pinned.symbol} 
                          className="bg-zinc-900/50 border-zinc-800 p-4 hover:border-emerald-500/30 transition-colors cursor-pointer relative group"
                        >
                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAsset(pinned.symbol);
                            }}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-700 rounded"
                          >
                            <X className="w-3 h-3 text-zinc-400" />
                          </button>
                          
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">{pinned.symbol}</h3>
                            <div className="flex items-center gap-2">
                              <SentimentBadge sentiment={sentiment} />
                              <span className="text-xs text-zinc-500">{confidence}%</span>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-zinc-500">Confidence</span>
                            </div>
                            <Progress 
                              value={confidence} 
                              className="h-1.5 bg-zinc-800 [&>div]:bg-emerald-500"
                            />
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Brain className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs text-emerald-400">AI Analysis</span>
                              {analyzing && (
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-1" />
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                              {analysisText}
                            </p>
                          </div>

                          {/* ABLE-HF 3.0 Enhanced Info */}
                          {analysis && (
                            <div className="mb-3 flex flex-wrap gap-1">
                              <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                                P↑ {analysis.P_up_pct.toFixed(0)}%
                              </Badge>
                              {analysis.quantum_enhancement > 0 && (
                                <Badge className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                  Q+{(analysis.quantum_enhancement * 100).toFixed(0)}%
                                </Badge>
                              )}
                              {analysis.neural_enhancement > 0 && (
                                <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  N+{(analysis.neural_enhancement * 100).toFixed(0)}%
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className={`text-sm font-medium ${changeValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {changeValue >= 0 ? '↗' : '↘'} {change}
                          </div>
                        </Card>
                      );
                    })}
                    
                    {/* Add Asset Card */}
                    {pinnedAssets.length < 8 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Card className="bg-zinc-900/30 border-zinc-800 border-dashed p-4 hover:border-emerald-500/30 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]">
                            <Plus className="w-8 h-8 text-zinc-600 mb-2" />
                            <span className="text-zinc-500 text-sm">Add Asset</span>
                            <span className="text-zinc-600 text-xs mt-1">{pinnedAssets.length}/8 assets</span>
                          </Card>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-zinc-900 border-zinc-700">
                          {getAvailableAssets().map((category) => (
                            category.assets.length > 0 && (
                              <div key={category.label}>
                                <DropdownMenuLabel className="text-zinc-400 text-xs">
                                  {category.label}
                                </DropdownMenuLabel>
                                {category.assets.map((asset) => (
                                  <DropdownMenuItem 
                                    key={asset}
                                    onClick={() => handleAddAsset(asset)}
                                    className="text-white hover:bg-zinc-800 cursor-pointer"
                                  >
                                    {ASSET_DISPLAY_NAMES[asset] || asset}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="bg-zinc-700" />
                              </div>
                            )
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* For You Section - Real-time news for pinned assets */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-zinc-400" />
                      <div>
                        <h2 className="text-lg font-medium text-white flex items-center gap-2">
                          For You
                          <span className="text-zinc-600 text-sm">⚙</span>
                        </h2>
                        <p className="text-xs text-zinc-500">Your personalized market briefing</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-transparent">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {forYouItems.filter(i => i.isNew).length} updates
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    {forYouItems.slice(0, 10).map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => window.open(item.url, '_blank')}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-900/50 transition-colors cursor-pointer"
                      >
                        {item.isNew && (
                          <Badge className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0 mt-0.5">
                            Today
                          </Badge>
                        )}
                        <div className="flex-1 text-sm">
                          <span className="text-white font-medium">{item.symbol}</span>
                          <span className="text-zinc-500 mx-2">bias updated:</span>
                          <span className={`font-medium ${
                            item.type.includes('BULLISH') ? 'text-emerald-400' : 
                            item.type.includes('BEARISH') ? 'text-red-400' : 'text-zinc-400'
                          }`}>{item.type}</span>
                          <span className="text-zinc-500 mx-2">–</span>
                          <span className="text-zinc-400">{item.title}</span>
                        </div>
                      </div>
                    ))}
                    
                    {forYouItems.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        <p>Add assets above to see personalized news</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Daily Reports Section */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-light text-emerald-400">Daily Reports</h2>
                    <p className="text-zinc-500 text-sm">This is your daily pre-market report to build your bias</p>
                  </div>
                  <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 bg-transparent">
                    <Eye className="w-4 h-4 mr-2" />
                    Mark all as read
                  </Button>
                </div>

                <div className="space-y-4">
                  {dailyReports.map((report) => (
                    <Card 
                      key={report.id}
                      onClick={() => window.open(report.url, '_blank')}
                      className={`p-4 border transition-all cursor-pointer ${
                        report.isHighlighted 
                          ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 border-emerald-500/30 hover:border-emerald-400/50' 
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-zinc-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-emerald-400 font-medium">{report.date}</span>
                              <span className="text-zinc-600">–</span>
                              <span className="text-zinc-500 text-xs">{report.source}</span>
                            </div>
                            <h3 className="text-white font-medium mb-2 text-lg leading-tight line-clamp-2">{report.title}</h3>
                            <p className="text-zinc-500 text-sm line-clamp-2">{report.description}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm space-y-1 ml-4 flex-shrink-0">
                          <div className="flex items-center gap-2 text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {report.time}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500">
                            <BarChart3 className="w-3 h-3" />
                            {report.assetsAnalyzed} assets analyzed
                          </div>
                          <div className="flex items-center gap-2 text-emerald-400">
                            <TrendingUp className="w-3 h-3" />
                            Pre-market analysis
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-zinc-800 flex flex-col bg-black">
        {/* Market Session Timer */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${session.status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span className="text-white font-medium">{session.name}</span>
            </div>
            <span className="text-xs text-zinc-500">Pre-Market in</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-mono text-zinc-300">{formatTime(currentTime)}</span>
            <span className="text-emerald-400 font-mono text-lg">{getPreMarketCountdown()}</span>
          </div>
        </div>

        {/* X Notifications */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Latest notifications from</span>
              <span className="font-bold text-white text-lg">𝕏</span>
            </div>
            <Badge className="border-emerald-500/30 text-emerald-400 text-xs bg-emerald-500/10 border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Live
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {xNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className="group cursor-pointer"
                  onClick={() => window.open(notif.url, '_blank')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {notif.source.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">{notif.source}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-500 text-xs">{notif.time}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-zinc-400 text-sm line-clamp-3">{notif.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {xNotifications.length === 0 && (
                <div className="text-center text-zinc-500 py-8">
                  <p className="text-sm">No notifications yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default TopNews;
