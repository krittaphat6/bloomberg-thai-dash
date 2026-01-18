// src/components/TopNews.tsx
// ✅ FIXED VERSION - Refresh ทุก 10 นาที + เฉพาะตอนเปิด component + แสดง metadata

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Sparkles, ExternalLink, Brain, TrendingUp, TrendingDown, ChevronRight, Clock, BarChart3, Settings, Eye, FileText, Users, Zap, Loader2, Target, Plus, X, ChevronDown, AlertCircle, PlayCircle, CheckCircle2, Search, Pin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ASSET_DISPLAY_NAMES, AVAILABLE_ASSETS } from '@/services/ableNewsIntelligence';
import { GeminiThinkingModal } from './TopNews/GeminiThinkingModal';
import { RelationshipDiagram } from './TopNews/RelationshipDiagram';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
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
interface RawNewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  sentiment?: string;
  url: string;
}
interface PinnedAsset {
  symbol: string;
  addedAt: number;
}
interface AssetPrice {
  price: number;
  change: number;
  changePercent: number;
}

// ✅ NEW: News Metadata interface
interface NewsMetadata {
  totalFetched: number;
  freshNewsCount: number;
  analyzedCount: number;
  freshNewsHours: number;
  oldestNewsAge: string;
  newestNewsAge: string;
  sources: string[];
  sourcesCount: number;
}
const ASSET_CATEGORIES = {
  forex: {
    label: 'Forex',
    assets: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD']
  },
  commodities: {
    label: 'Commodities',
    assets: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS']
  },
  crypto: {
    label: 'Crypto',
    assets: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'ADAUSD', 'SOLUSD']
  },
  indices: {
    label: 'Indices',
    assets: ['US500', 'US100', 'US30', 'DE40', 'UK100', 'JP225']
  }
};
export const TopNews = () => {
  const {
    toast
  } = useToast();

  // States
  const [macroData, setMacroData] = useState<MacroAnalysis[]>([]);
  const [forYouItems, setForYouItems] = useState<ForYouItem[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [xNotifications, setXNotifications] = useState<XNotification[]>([]);
  const [rawNews, setRawNews] = useState<RawNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'macro' | 'daily' | 'sources'>('macro');
  const [selectedAssetForModal, setSelectedAssetForModal] = useState<string | null>(null);
  const [ableAnalysis, setAbleAnalysis] = useState<Record<string, AbleAnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [dailyReportAI, setDailyReportAI] = useState<any>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);

  // Asset management
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>([{
    symbol: 'XAUUSD',
    addedAt: Date.now()
  }]);
  const [assetPrices, setAssetPrices] = useState<Record<string, AssetPrice>>({});

  // ✅ NEW: Metadata และ component active state
  const [newsMetadata, setNewsMetadata] = useState<NewsMetadata | null>(null);
  const [isComponentActive, setIsComponentActive] = useState(false);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    const prices: Record<string, AssetPrice> = {};
    for (const asset of pinnedAssets) {
      try {
        const isCrypto = ['BTCUSD', 'ETHUSD', 'BNBUSD', 'ADAUSD', 'SOLUSD'].includes(asset.symbol);
        const priceData = isCrypto ? await fetchCryptoPrice(asset.symbol) : await fetchRealTimePrice(asset.symbol);
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
      const {
        data,
        error
      } = await supabase.functions.invoke('news-aggregator', {
        body: {
          pinnedAssets: pinnedAssets.map(p => p.symbol)
        }
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
        setNewsMetadata(data.newsMetadata || null);
        setDailyReportAI(data.dailyReportAI || null);
        setLastUpdated(new Date());
        console.log(`✅ Loaded ${data.macro?.length || 0} macro items, ${data.rawNews?.length || 0} news`);

        // ✅ NEW: แสดง metadata ใน console
        if (data.newsMetadata) {
          console.log(`
📊 News Analysis Debug:
   Fresh news: ${data.newsMetadata.freshNewsCount}/${data.newsMetadata.totalFetched}
   Analyzed: ${data.newsMetadata.analyzedCount}
   Age range: ${data.newsMetadata.newestNewsAge} - ${data.newsMetadata.oldestNewsAge}
          `);
        }

        // Extract ABLE analysis from backend response
        const ableResults: Record<string, AbleAnalysisResult> = {};
        (data.macro || []).forEach((macro: MacroAnalysis) => {
          if (macro.ableAnalysis) {
            ableResults[macro.symbol] = macro.ableAnalysis;
            console.log(`✅ ABLE analysis loaded: ${macro.symbol} - ${macro.ableAnalysis.decision}`);
          }
        });
        setAbleAnalysis(ableResults);
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

  // Add asset handler - ✅ FIXED: แสดงผลทันที
  const handleAddAsset = (symbol: string) => {
    if (pinnedAssets.find(p => p.symbol === symbol)) {
      toast({
        title: 'Asset already added',
        variant: 'destructive'
      });
      return;
    }
    if (pinnedAssets.length >= 8) {
      toast({
        title: 'Maximum 8 assets',
        description: 'Remove an asset first',
        variant: 'destructive'
      });
      return;
    }
    
    // ✅ NEW: อัพเดท state ทันที
    const newAsset = { symbol, addedAt: Date.now() };
    setPinnedAssets(prev => {
      const updated = [...prev, newAsset];
      console.log('✅ Asset added:', symbol, 'Total:', updated.length);
      return updated;
    });
    
    // Close dropdown
    setShowAddAsset(false);
    
    toast({
      title: `✅ ${ASSET_DISPLAY_NAMES[symbol] || symbol} added`,
      description: 'Fetching AI analysis...'
    });
    
    // Fetch analysis for new asset
    setTimeout(() => fetchNews(), 300);
  };

  // Remove asset handler - ✅ FIXED: ลบได้จริงและ refetch
  const handleRemoveAsset = (symbol: string) => {
    console.log('🗑️ Removing asset:', symbol);
    
    // อัปเดต state ทันที
    setPinnedAssets(prev => {
      const updated = prev.filter(p => p.symbol !== symbol);
      console.log('✅ Asset removed, remaining:', updated.length);
      return updated;
    });
    
    // ลบ analysis ของ asset นั้น
    setAbleAnalysis(prev => {
      const newAnalysis = { ...prev };
      delete newAnalysis[symbol];
      return newAnalysis;
    });
    
    // ลบ macro data ของ asset นั้น
    setMacroData(prev => prev.filter(m => m.symbol !== symbol));
    
    // ลบราคา
    setAssetPrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[symbol];
      return newPrices;
    });
  };

  // ✅ NEW: Fetch เมื่อเปิด component + Auto-refresh ทุก 10 นาที + Cleanup
  useEffect(() => {
    console.log('🚀 TopNews component mounted - Starting AI analysis...');
    setIsComponentActive(true);

    // 1. Fetch ทันทีที่เปิด component
    fetchNews();

    // 2. ตั้ง interval refresh ทุก 10 นาที (600,000 ms)
    const refreshInterval = setInterval(() => {
      console.log('🔄 10-minute auto-refresh triggered');
      fetchNews();
    }, 600000); // 600000ms = 10 minutes

    // 3. Cleanup: หยุด interval เมื่อปิด component
    return () => {
      console.log('👋 TopNews component unmounted - Stopping auto-refresh');
      clearInterval(refreshInterval);
      setIsComponentActive(false);
    };
  }, []); // [] = run เฉพาะตอน mount/unmount เท่านั้น

  // Get available assets (not already pinned)
  const getAvailableAssets = () => {
    const pinnedSymbols = pinnedAssets.map(p => p.symbol);
    return Object.entries(ASSET_CATEGORIES).map(([key, category]) => ({
      ...category,
      assets: category.assets.filter(a => !pinnedSymbols.includes(a))
    }));
  };
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // ✅ NEW: คำนวณเวลา next refresh
  const getNextRefreshTime = () => {
    if (!lastUpdated) return null;
    const nextRefresh = new Date(lastUpdated.getTime() + 600000); // +10 min
    const remaining = Math.floor((nextRefresh.getTime() - Date.now()) / 60000);
    return remaining > 0 ? `${remaining} min` : 'now';
  };
  if (initialLoading) {
    return <div className="flex h-full bg-zinc-950 text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-emerald-300/70">Loading ABLE-HF 3.0 Intelligence...</p>
          <p className="text-zinc-500 text-xs">Powered by Gemini AI</p>
        </div>
      </div>;
  }
  return <div className="flex h-full bg-zinc-950 text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Clean Dark Style */}
        <div className="border-b border-zinc-800 px-4 py-3 md:px-6 md:py-4 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-semibold italic text-[#1da52b]">
            </h1>
              <p className="text-xs md:text-sm text-zinc-500 flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                ABLE-HF 3.0 •
              </p>
              
              {/* ✅ NEW: Debug badges */}
              {newsMetadata && <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    <RefreshCw className="w-3 h-3 mr-1 inline" />
                    {newsMetadata.freshNewsCount} fresh news (24h)
                  </Badge>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {newsMetadata.newestNewsAge} - {newsMetadata.oldestNewsAge}
                  </Badge>
                  {isComponentActive && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 animate-pulse">
                      🟢 Live Analysis
                    </Badge>}
                </div>}
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {/* ✅ NEW: แสดง next refresh time */}
              {lastUpdated && <div className="flex flex-col items-end">
                  <span className="text-xs md:text-sm text-zinc-600 hidden sm:block">
                    Updated {formatTime(lastUpdated)}
                  </span>
                  <span className="text-[10px] text-zinc-700">
                    Next: {getNextRefreshTime()}
                  </span>
                </div>}
              <Button onClick={fetchNews} disabled={loading} size="icon" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs - AI Macro Desk, Daily Reports, News Sources */}
        <div className="border-b border-zinc-800 px-4 md:px-6">
          <div className="flex gap-4 md:gap-8">
            {[{
            key: 'macro',
            label: 'AI Macro Desk',
            icon: Brain
          }, {
            key: 'daily',
            label: 'Daily Reports',
            icon: FileText
          }, {
            key: 'sources',
            label: 'News Sources',
            icon: Zap
          }].map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`py-3 px-1 text-xs md:text-sm font-medium transition-colors relative flex items-center gap-1 md:gap-2 ${activeTab === tab.key ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <tab.icon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
              </button>)}
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          {activeTab === 'macro' && <div className="p-4 md:p-6">
              {/* Add Asset Button - ย้ายมาด้านบน */}
              <div className="flex items-center justify-end mb-4">
                <Button size="sm" variant="outline" onClick={() => setShowAddAsset(!showAddAsset)} className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-white hover:border-emerald-500">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Asset ({pinnedAssets.length}/8)
                </Button>
              </div>

              {showAddAsset && <Card className="p-3 mb-4 bg-zinc-900 border-zinc-800">
                  <div className="space-y-3">
                    {getAvailableAssets().map(category => category.assets.length > 0 && <div key={category.label}>
                          <p className="text-xs text-zinc-500 mb-2 font-medium">{category.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {category.assets.map(asset => <Badge 
                              key={asset} 
                              variant="outline" 
                              className="cursor-pointer border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 text-xs px-3 py-1.5 transition-all hover:bg-emerald-500/10" 
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Adding asset:', asset);
                                handleAddAsset(asset);
                                setShowAddAsset(false);
                              }}>
                                <Plus className="w-3 h-3 mr-1" />
                                {ASSET_DISPLAY_NAMES[asset] || asset}
                              </Badge>)}
                          </div>
                        </div>)}
                  </div>
                </Card>}

              {/* Macro Analysis Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {macroData.length === 0 ? <div className="col-span-2 text-center py-12 text-zinc-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No assets pinned</p>
                    <p className="text-sm mt-1">Add assets to see AI analysis</p>
                  </div> : macroData.map(macro => {
              const analysis = macro.ableAnalysis;
              const isFallback = !analysis || analysis.decision?.includes('Fallback');
              const P_up = analysis?.P_up_pct || 50;
              const decision = analysis?.decision || 'HOLD';
              const analysisText = analysis?.thai_summary || macro.analysis;
              return <Card key={macro.symbol} className="p-4 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer bg-black relative group" onClick={() => setSelectedAssetForModal(macro.symbol)}>
                        {/* ✅ DELETE BUTTON - เหมือน Gold card */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAsset(macro.symbol);
                            toast({ title: `❌ ${ASSET_DISPLAY_NAMES[macro.symbol] || macro.symbol} removed` });
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-800/80 hover:bg-red-500/30 text-zinc-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title={`Remove ${ASSET_DISPLAY_NAMES[macro.symbol] || macro.symbol}`}
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">
                              {ASSET_DISPLAY_NAMES[macro.symbol] || macro.symbol}
                            </h3>
                            {assetPrices[macro.symbol] && <div className="text-sm text-zinc-500">
                                ${assetPrices[macro.symbol].price.toFixed(2)}
                              </div>}
                          </div>
                          <Badge className={`${P_up > 55 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : P_up < 45 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-zinc-700/10 text-zinc-400 border-zinc-700/30'}`}>
                            {P_up}%
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>Bearish</span>
                            <span>Bullish</span>
                          </div>
                          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`absolute left-0 top-0 h-full transition-all duration-500 ${P_up > 55 ? 'bg-emerald-500' : P_up < 45 ? 'bg-red-500' : 'bg-zinc-500'}`} style={{
                      width: `${P_up}%`
                    }} />
                          </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className={`w-3 h-3 ${isFallback ? 'text-yellow-400' : 'text-emerald-400'}`} />
                            <span className={`text-xs ${isFallback ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {isFallback ? '⚠️ Fallback Mode' : 'ABLE-HF 3.0 Analysis'}
                            </span>
                            {analyzing && <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-1" />}
                          </div>
                          <p className={`text-xs md:text-sm leading-relaxed line-clamp-3 ${isFallback ? 'text-yellow-300/70' : 'text-zinc-300'}`}>
                            {analysisText}
                          </p>
                        </div>

                        {/* Key Drivers */}
                        {analysis?.key_drivers && analysis.key_drivers.length > 0 && <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {analysis.key_drivers.slice(0, 3).map((driver, i) => <Badge key={i} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                  {driver}
                                </Badge>)}
                            </div>
                          </div>}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm md:text-base font-bold ${P_up > 55 ? 'text-emerald-400' : P_up < 45 ? 'text-red-400' : 'text-zinc-400'}`}>
                              {P_up > 50 ? '↗' : '↘'} {P_up > 50 ? '+' : ''}{((P_up - 50) * 0.05).toFixed(2)}%
                            </span>
                            {analysis?.news_count && <span className="text-[10px] text-zinc-600">
                                ({analysis.relevant_news_count || 0}/{analysis.news_count} news)
                              </span>}
                            {/* ✅ NEW: แสดงอายุข่าว */}
                            {newsMetadata && <span className="text-[10px] text-emerald-600">
                                • {newsMetadata.newestNewsAge}
                              </span>}
                          </div>
                          <Badge className={`text-xs ${decision.includes('BUY') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : decision.includes('SELL') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-zinc-700/10 text-zinc-400 border-zinc-700/30'}`}>
                            {decision}
                          </Badge>
                        </div>
                      </Card>;
            })}
              </div>
              
              {/* For You - Real-time News Section */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-medium text-zinc-400">For You - Related News</h2>
                  {forYouItems.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                      {forYouItems.length} items
                    </Badge>
                  )}
                </div>
                
                {forYouItems.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-sm">
                    <p>No personalized news yet - pin assets above</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {forYouItems.slice(0, 9).map(item => (
                      <Card 
                        key={item.id} 
                        className="p-3 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                {ASSET_DISPLAY_NAMES[item.symbol] || item.symbol}
                              </Badge>
                              {item.isNew && (
                                <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 animate-pulse">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-xs text-white line-clamp-2 leading-relaxed">{item.title}</h3>
                            <p className="text-[10px] text-zinc-600 mt-1">{item.source} • {formatTimeAgo(item.timestamp)}</p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-zinc-700 flex-shrink-0" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>}

          {activeTab === 'daily' && <div className="p-4 md:p-6">
              {/* Header Row: Daily Reports + News Sources Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* AI Market Summary - Left Side */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-medium text-white">ABLE 3.0 Market Summary</h2>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                      AI Generated
                    </Badge>
                  </div>
                  
                  <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-emerald-500/20">
                    {macroData.length > 0 ? (
                      <div className="space-y-4">
                        {/* Summary Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-medium text-emerald-400 mb-1">
                              📊 Market Focus Analysis
                            </h3>
                            <p className="text-xs text-zinc-500">
                              Based on {newsMetadata?.freshNewsCount || 0} fresh news from {newsMetadata?.sourcesCount || 0} sources
                            </p>
                          </div>
                          <Badge className={`text-xs ${
                            macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct > 55).length > macroData.length / 2 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct < 45).length > macroData.length / 2
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-zinc-700/10 text-zinc-400'
                          }`}>
                            {macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct > 55).length > macroData.length / 2 
                              ? '📈 Bullish Bias' 
                              : macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct < 45).length > macroData.length / 2
                              ? '📉 Bearish Bias'
                              : '➡️ Mixed Sentiment'}
                          </Badge>
                        </div>
                        
                        {/* Key Insights */}
                        <div className="p-3 bg-zinc-800/50 rounded-lg">
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {(() => {
                              const bullishAssets = macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct > 55);
                              const bearishAssets = macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct < 45);
                              const holdAssets = macroData.filter(m => m.ableAnalysis?.P_up_pct && m.ableAnalysis.P_up_pct >= 45 && m.ableAnalysis.P_up_pct <= 55);
                              
                              let summary = '🔍 สถานการณ์ตลาดปัจจุบัน: ';
                              
                              if (bullishAssets.length > 0) {
                                summary += `สินทรัพย์ที่มีแนวโน้มขาขึ้น: ${bullishAssets.map(a => ASSET_DISPLAY_NAMES[a.symbol] || a.symbol).join(', ')}. `;
                              }
                              if (bearishAssets.length > 0) {
                                summary += `สินทรัพย์ที่มีแนวโน้มขาลง: ${bearishAssets.map(a => ASSET_DISPLAY_NAMES[a.symbol] || a.symbol).join(', ')}. `;
                              }
                              if (holdAssets.length > 0) {
                                summary += `สินทรัพย์ที่ควรรอดู: ${holdAssets.map(a => ASSET_DISPLAY_NAMES[a.symbol] || a.symbol).join(', ')}.`;
                              }
                              
                              const firstWithDrivers = macroData.find(m => m.ableAnalysis?.key_drivers?.length);
                              if (firstWithDrivers?.ableAnalysis?.key_drivers) {
                                summary += ` ปัจจัยสำคัญ: ${firstWithDrivers.ableAnalysis.key_drivers.slice(0, 2).join(', ')}.`;
                              }
                              
                              return summary || 'กำลังรอการวิเคราะห์...';
                            })()}
                          </p>
                        </div>
                        
                        {/* Asset Cards Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {macroData.slice(0, 4).map(macro => (
                            <div key={macro.symbol} className="p-2 bg-zinc-800/30 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-white">
                                  {ASSET_DISPLAY_NAMES[macro.symbol] || macro.symbol}
                                </span>
                                <span className={`text-[10px] font-bold ${
                                  macro.ableAnalysis?.P_up_pct && macro.ableAnalysis.P_up_pct > 55 ? 'text-emerald-400' 
                                  : macro.ableAnalysis?.P_up_pct && macro.ableAnalysis.P_up_pct < 45 ? 'text-red-400' 
                                  : 'text-zinc-400'
                                }`}>
                                  {macro.ableAnalysis?.decision || 'HOLD'}
                                </span>
                              </div>
                              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    macro.ableAnalysis?.P_up_pct && macro.ableAnalysis.P_up_pct > 55 ? 'bg-emerald-500' 
                                    : macro.ableAnalysis?.P_up_pct && macro.ableAnalysis.P_up_pct < 45 ? 'bg-red-500' 
                                    : 'bg-zinc-500'
                                  }`}
                                  style={{ width: `${macro.ableAnalysis?.P_up_pct || 50}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500">
                        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>เพิ่มสินทรัพย์เพื่อดูการวิเคราะห์ AI</p>
                      </div>
                    )}
                  </Card>
                </div>

                {/* ✅ NEWS SOURCES PANEL - Right Side */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-medium text-white">News Sources</h2>
                    <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">
                      {newsMetadata?.sourcesCount || 30}+ Active
                    </Badge>
                  </div>
                  
                  <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-yellow-500/20 h-[calc(100%-2.5rem)]">
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Connection Status</span>
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 animate-pulse">
                          🟢 Live
                        </Badge>
                      </div>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-zinc-800/50 rounded">
                          <p className="text-[10px] text-zinc-500">Total News</p>
                          <p className="text-sm font-bold text-white">{newsMetadata?.totalFetched || 0}</p>
                        </div>
                        <div className="p-2 bg-zinc-800/50 rounded">
                          <p className="text-[10px] text-zinc-500">Fresh (24h)</p>
                          <p className="text-sm font-bold text-emerald-400">{newsMetadata?.freshNewsCount || 0}</p>
                        </div>
                      </div>
                      
                      {/* Sources List - ✅ ดึงจาก backend จริง */}
                      <div>
                        <p className="text-[10px] text-zinc-500 mb-2">Connected Sources ({newsMetadata?.sources?.length || 0}):</p>
                        <ScrollArea className="h-24">
                          <div className="flex flex-wrap gap-1">
                            {(newsMetadata?.sources || [
                              'Reddit (12)', 'HackerNews (4)', 'CryptoCompare', 
                              'MarketWatch', 'CoinGecko', 'Fear&Greed',
                              'FX Calendar', 'CoinPaprika', 'Finviz',
                              'NewsAPI', 'Investing', 'Fed Watch'
                            ]).map((source, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] border-zinc-700 text-zinc-400 py-0.5">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                      
                      {/* Categories */}
                      <div>
                        <p className="text-[10px] text-zinc-500 mb-2">Categories:</p>
                        <div className="space-y-1">
                          {[
                            { name: 'Forex', color: 'text-blue-400' },
                            { name: 'Crypto', color: 'text-orange-400' },
                            { name: 'Commodities', color: 'text-yellow-400' },
                            { name: 'Stocks', color: 'text-purple-400' },
                            { name: 'Economics', color: 'text-emerald-400' }
                          ].map((cat, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className={`text-xs ${cat.color}`}>• {cat.name}</span>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Last Update */}
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-600">Last Sync</span>
                          <span className="text-[10px] text-emerald-400">
                            {newsMetadata?.newestNewsAge || 'now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
              
              {/* AI Relationship Diagram */}
              {dailyReportAI?.relationships && dailyReportAI.relationships.length > 0 && (
                <div className="mb-6">
                  <RelationshipDiagram 
                    relationships={dailyReportAI.relationships}
                    title={dailyReportAI.marketTheme || 'AI Relationship Analysis'}
                  />
                </div>
              )}
              
              {/* Daily Reports List */}
              <div>
                <h2 className="text-sm font-medium text-zinc-400 mb-3">Latest Reports</h2>
                <div className="space-y-3">
                  {dailyReports.map(report => (
                    <Card 
                      key={report.id} 
                      className={`p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${report.isHighlighted ? 'border-emerald-500/30' : ''}`} 
                      onClick={() => window.open(report.url, '_blank')}
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
                      </div>
                    </Card>
                  ))}
                  
                  {dailyReports.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg">No reports available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>}

          {/* ✅ NEW: News Sources Tab */}
          {activeTab === 'sources' && <div className="p-4 md:p-6">
              <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">News Sources</h2>
                    <p className="text-sm text-zinc-500">แหล่งข่าวที่เชื่อมต่ออยู่ในระบบ</p>
                  </div>
                  <Badge className="ml-auto text-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">
                    🟢 Live
                  </Badge>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4 bg-zinc-900 border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Total Sources</p>
                    <p className="text-2xl font-bold text-white">{newsMetadata?.sourcesCount || 30}</p>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Total News</p>
                    <p className="text-2xl font-bold text-white">{newsMetadata?.totalFetched || 0}</p>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Fresh (24h)</p>
                    <p className="text-2xl font-bold text-emerald-400">{newsMetadata?.freshNewsCount || 0}</p>
                  </Card>
                  <Card className="p-4 bg-zinc-900 border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Analyzed</p>
                    <p className="text-2xl font-bold text-blue-400">{newsMetadata?.analyzedCount || 0}</p>
                  </Card>
                </div>

                {/* Connected Sources */}
                <Card className="p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-6">
                  <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Connected Sources ({newsMetadata?.sources?.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(newsMetadata?.sources || [
                      '📰 r/forex', '🥇 r/Gold', '₿ r/crypto', '🚀 r/WSB', '📊 r/stocks',
                      '📉 r/Economics', '💰 r/investing', '📈 r/options', '⚡ r/Futures',
                      '🥈 r/Silverbugs', '📊 r/Daytrading', '🤖 r/algotrading',
                      '🔶 HackerNews', '₿ CryptoCompare', '🦎 CoinGecko', '😱 Fear&Greed',
                      '📅 CoinPaprika', '🪨 CryptoSlate', '📦 TheBlock', '🗞️ NewsAPI',
                      '📰 MarketWatch', '📈 SeekingAlpha', '💱 DailyFX', '💹 FXStreet',
                      '📅 Investing.com', '🏦 Fed Watch', '🥇 Kitco', '📊 Finviz'
                    ]).map((source, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 py-1.5"
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Categories */}
                <Card className="p-6 bg-zinc-900 border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-4">Categories Covered</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { name: 'Forex', icon: '💱', color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-400' },
                      { name: 'Crypto', icon: '₿', color: 'from-orange-500/20 to-orange-600/20', border: 'border-orange-500/30', text: 'text-orange-400' },
                      { name: 'Commodities', icon: '🥇', color: 'from-yellow-500/20 to-yellow-600/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                      { name: 'Stocks', icon: '📈', color: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                      { name: 'Economics', icon: '🏦', color: 'from-emerald-500/20 to-emerald-600/20', border: 'border-emerald-500/30', text: 'text-emerald-400' }
                    ].map((cat, i) => (
                      <div 
                        key={i} 
                        className={`p-4 rounded-lg bg-gradient-to-br ${cat.color} border ${cat.border} text-center`}
                      >
                        <span className="text-2xl mb-2 block">{cat.icon}</span>
                        <span className={`text-sm font-medium ${cat.text}`}>{cat.name}</span>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-400">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Last Sync Info */}
                <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
                  <span>Last synced: {newsMetadata?.newestNewsAge || 'just now'}</span>
                  <span>Age range: {newsMetadata?.newestNewsAge || 'N/A'} - {newsMetadata?.oldestNewsAge || 'N/A'}</span>
                </div>
              </div>
            </div>}
        </ScrollArea>
      </div>
      
      {/* Gemini Thinking Modal */}
      <GeminiThinkingModal isOpen={!!selectedAssetForModal} onClose={() => setSelectedAssetForModal(null)} symbol={selectedAssetForModal || ''} analysis={selectedAssetForModal ? ableAnalysis[selectedAssetForModal] : null} />
    </div>;
};
export default TopNews;