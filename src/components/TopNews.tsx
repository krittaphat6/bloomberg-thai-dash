import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, Sparkles, ExternalLink, 
  Brain, TrendingUp, TrendingDown, ChevronRight, Clock, BarChart3,
  Settings, Eye, FileText, Users, Zap, Loader2, Target, Plus, X,
  ChevronDown, AlertCircle, PlayCircle, CheckCircle2, Search, Pin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ASSET_DISPLAY_NAMES, AVAILABLE_ASSETS } from '@/services/ableNewsIntelligence';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { fetchRealTimePrice, fetchCryptoPrice } from '@/services/realTimePriceService';

// ABLE-HF 3.0 Analysis Result from Backend
interface AbleAnalysisResult {
  P_up_pct: number;
  P_down_pct: number;
  decision: string;
  confidence: number;
  market_regime?: string;
  scores?: Record<string, number>;
  category_performance?: Record<string, number>;
  trading_signal?: {
    signal: string;
    icon: string;
    color?: string;
    strength: number;
  };
  thai_summary?: string;
  key_drivers?: string[];
  risk_warnings?: string[];
  analyzed_at?: string;
  news_count?: number;
  relevant_news_count?: number;
}

// ============ TYPES ============
interface MacroAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: string;
  change?: string;
  changeValue?: number;
  ableAnalysis?: AbleAnalysisResult;
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

  // ABLE-HF 3.0 State - Analysis comes from backend now
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>(DEFAULT_PINNED_ASSETS);
  const [ableAnalysis, setAbleAnalysis] = useState<Record<string, AbleAnalysisResult>>({});
  
  // Real-time price data
  const [assetPrices, setAssetPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});

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
      hour12: false 
    });
  };

  // Fetch real-time prices for pinned assets
  const fetchPrices = useCallback(async () => {
    const prices: Record<string, { price: number; change: number; changePercent: number }> = {};
    
    for (const asset of pinnedAssets) {
      try {
        const isCrypto = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'].includes(asset.symbol);
        const priceData = isCrypto 
          ? await fetchCryptoPrice(asset.symbol)
          : await fetchRealTimePrice(asset.symbol);
        
        if (priceData) {
          prices[asset.symbol] = {
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent
          };
        }
      } catch (error) {
        console.warn(`Price fetch error for ${asset.symbol}:`, error);
      }
    }
    
    setAssetPrices(prices);
  }, [pinnedAssets]);

  // Fetch prices periodically
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Fetch news from edge function - ABLE analysis comes from backend
  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🚀 Fetching ABLE-HF 3.0 analysis from backend...');
      
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
        
        console.log(`✅ Loaded ${data.macro?.length || 0} macro items, ${data.rawNews?.length || 0} news`);
        
        // Extract ABLE analysis from backend response
        const ableResults: Record<string, AbleAnalysisResult> = {};
        (data.macro || []).forEach((macro: MacroAnalysis) => {
          if (macro.ableAnalysis) {
            ableResults[macro.symbol] = macro.ableAnalysis;
            console.log(`✅ ABLE analysis loaded: ${macro.symbol} - ${macro.ableAnalysis.decision}`);
          }
        });
        
        setAbleAnalysis(ableResults);
        
        // Check if analysis available
        if (Object.keys(ableResults).length === 0 && pinnedAssets.length > 0) {
          console.warn('⚠️ No ABLE analysis from backend');
        }
        
        if (!initialLoading) {
          toast({ 
            title: '✅ ABLE-HF 3.0 Updated', 
            description: `${data.sourcesCount || 0} sources • ${data.processingTime}ms`
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
  }, [toast, initialLoading, pinnedAssets]);

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
    
    // Trigger re-fetch to get analysis for new asset
    setTimeout(() => fetchNews(), 500);
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
      <div className="flex h-full bg-zinc-950 text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-emerald-300/70">Loading ABLE-HF 3.0 Intelligence...</p>
          <p className="text-zinc-500 text-xs">Powered by Gemini AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-zinc-950 text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Clean Dark Style */}
        <div className="border-b border-zinc-800 px-4 py-3 md:px-6 md:py-4 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-semibold text-emerald-400 italic">
                Good afternoon, Trader.
              </h1>
              <p className="text-xs md:text-sm text-zinc-500 flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                ABLE-HF 3.0 • Gemini AI Analysis
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {lastUpdated && (
                <span className="text-xs md:text-sm text-zinc-600 hidden sm:block">
                  Updated {formatTime(lastUpdated)}
                </span>
              )}
              <Button 
                onClick={fetchNews}
                disabled={loading}
                size="icon"
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                {loading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 text-xs md:text-sm"
              >
                <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Personalize</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs - Clean Style */}
        <div className="border-b border-zinc-800 flex px-4 md:px-6 bg-zinc-950">
          <button 
            onClick={() => setActiveTab('macro')}
            className={`px-3 py-2 md:px-4 md:py-3 text-sm md:text-base transition-all ${
              activeTab === 'macro' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1 md:gap-2">
              <Zap className="w-3 h-3 md:w-4 md:h-4" />
              AI Macro Desk
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 md:px-4 md:py-3 text-sm md:text-base transition-all ${
              activeTab === 'reports' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1 md:gap-2">
              <FileText className="w-3 h-3 md:w-4 md:h-4" />
              Daily Reports
            </span>
          </button>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-3 md:p-6 bg-zinc-950">
          {activeTab === 'macro' ? (
            <>
              {/* AI Macro Desk Section */}
              <div className="mb-6 md:mb-8">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div className="flex items-center gap-2 md:gap-3">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                    <div>
                      <h2 className="text-base md:text-lg font-medium text-white flex items-center gap-2">
                        AI Macro Desk
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </h2>
                      <p className="text-xs md:text-sm text-zinc-500">40-Module ABLE-HF 3.0 Analysis</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs md:text-sm"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          <span className="hidden sm:inline">Add</span>
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
                    
                    <button className="text-zinc-500 hover:text-emerald-400 text-xs md:text-sm flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>

                {/* Macro Cards Grid - Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {pinnedAssets.map((pinned) => {
                    const analysis = ableAnalysis[pinned.symbol];
                    const analyzing = !analysis && loading;
                    const priceData = assetPrices[pinned.symbol];
                    
                    const sentiment = analysis 
                      ? (analysis.P_up_pct > 55 ? 'bullish' : analysis.P_up_pct < 45 ? 'bearish' : 'neutral')
                      : 'neutral';
                    const confidence = analysis?.confidence || 50;
                    const analysisText = analysis?.thai_summary || 'กำลังวิเคราะห์...';
                    const P_up = analysis?.P_up_pct || 50;
                    const decision = analysis?.decision || 'HOLD';

                    return (
                      <Card 
                        key={pinned.symbol} 
                        className={`p-3 md:p-4 transition-all relative group bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 ${
                          analyzing ? 'border-emerald-500/50 animate-pulse' : ''
                        }`}
                      >
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAsset(pinned.symbol);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-700 rounded z-10"
                        >
                          <X className="w-3 h-3 md:w-4 md:h-4 text-zinc-400" />
                        </button>
                        
                        {/* Symbol & Badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-lg md:text-xl font-bold text-white">{pinned.symbol}</span>
                            {priceData && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs md:text-sm font-medium ${priceData.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {priceData.changePercent >= 0 ? '↗' : '↘'} {Math.abs(priceData.changePercent).toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                          <Badge className={`text-xs px-2 py-0.5 ${
                            sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            sentiment === 'bearish' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                          }`}>
                            • {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} {confidence}%
                          </Badge>
                        </div>

                        {/* Confidence Bar */}
                        <div className="mb-3">
                          <div className="text-xs text-zinc-500 mb-1 flex justify-between">
                            <span>P↓ {(100 - P_up).toFixed(1)}%</span>
                            <span>P↑ {P_up.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                P_up > 55 ? 'bg-emerald-500' :
                                P_up < 45 ? 'bg-red-500' : 'bg-zinc-500'
                              }`}
                              style={{ width: `${P_up}%` }}
                            />
                          </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-emerald-400">ABLE-HF 3.0 Analysis</span>
                            {analyzing && <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-1" />}
                          </div>
                          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed line-clamp-3">
                            {analysisText}
                          </p>
                        </div>

                        {/* Key Drivers */}
                        {analysis?.key_drivers && analysis.key_drivers.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {analysis.key_drivers.slice(0, 3).map((driver, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                  {driver}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm md:text-base font-bold ${P_up > 55 ? 'text-emerald-400' : P_up < 45 ? 'text-red-400' : 'text-zinc-400'}`}>
                              {P_up > 50 ? '↗' : '↘'} {P_up > 50 ? '+' : ''}{((P_up - 50) * 0.05).toFixed(2)}%
                            </span>
                            {analysis?.news_count && (
                              <span className="text-[10px] text-zinc-600">
                                ({analysis.relevant_news_count || 0}/{analysis.news_count} news)
                              </span>
                            )}
                          </div>
                          <Badge className={`text-xs ${
                            decision.includes('BUY') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            decision.includes('SELL') ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                          }`}>
                            {decision}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {/* Add Asset Card */}
                  {pinnedAssets.length < 8 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Card className="bg-zinc-900/30 border-zinc-800 border-dashed p-4 md:p-6 hover:border-emerald-500/30 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[150px] md:min-h-[200px]">
                          <Plus className="w-6 h-6 md:w-8 md:h-8 text-zinc-600 mb-2" />
                          <span className="text-zinc-500 text-sm font-medium">Add Asset</span>
                          <span className="text-zinc-600 text-xs mt-1">{pinnedAssets.length}/8</span>
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

              {/* For You Section */}
              <div className="mt-6 md:mt-8">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-zinc-400" />
                    <div>
                      <h2 className="text-sm md:text-base font-medium text-white flex items-center gap-2">
                        For You
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      </h2>
                      <p className="text-xs text-zinc-500">Your personalized market briefing</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-transparent text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {forYouItems.filter(i => i.isNew).length} updates
                  </Badge>
                </div>

                <div className="space-y-1">
                  {forYouItems.slice(0, 8).map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => window.open(item.url, '_blank')}
                      className="flex items-start gap-2 p-2 md:p-3 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                    >
                      {item.isNew && (
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border-red-500/30 flex-shrink-0">
                          Today
                        </Badge>
                      )}
                      <div className="flex-1 text-xs md:text-sm min-w-0">
                        <span className="text-white font-medium">{item.symbol}</span>
                        <span className="text-zinc-600 mx-1">bias updated:</span>
                        <span className={`font-medium ${
                          item.type.includes('BULLISH') ? 'text-emerald-400' :
                          item.type.includes('BEARISH') ? 'text-red-400' : 'text-zinc-400'
                        }`}>
                          {item.type}
                        </span>
                        <p className="text-zinc-500 truncate mt-0.5">{item.title}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* X Notifications */}
              {xNotifications.length > 0 && (
                <div className="mt-6 md:mt-8">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm md:text-base font-medium text-white">Social Signals</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {xNotifications.slice(0, 4).map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => window.open(notif.url, '_blank')}
                        className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-400">{notif.source}</span>
                          <span className="text-[10px] text-zinc-600">{notif.time}</span>
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-2">{notif.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Daily Reports Tab */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-base font-medium text-white">Daily Reports</h2>
              </div>
              
              {dailyReports.map((report) => (
                <Card 
                  key={report.id}
                  onClick={() => window.open(report.url, '_blank')}
                  className={`p-4 cursor-pointer transition-colors bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 ${
                    report.isHighlighted ? 'border-emerald-500/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-zinc-500">{report.date}</span>
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-500">{report.time}</span>
                        {report.isHighlighted && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            Latest
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">{report.title}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2">{report.description}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-600 flex-shrink-0 ml-2" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                      {report.source}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                      {report.assetsAnalyzed} assets
                    </Badge>
                  </div>
                </Card>
              ))}
              
              {dailyReports.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No reports available</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default TopNews;
