// src/components/TopNews.tsx
// ✅ FIXED VERSION - Refresh ทุก 10 นาที + เฉพาะตอนเปิด component + แสดง metadata

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
import { GeminiThinkingModal } from './TopNews/GeminiThinkingModal';
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
  const { toast } = useToast();
  
  // States
  const [macroData, setMacroData] = useState<MacroAnalysis[]>([]);
  const [forYouItems, setForYouItems] = useState<ForYouItem[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [xNotifications, setXNotifications] = useState<XNotification[]>([]);
  const [rawNews, setRawNews] = useState<RawNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'macro' | 'for-you' | 'daily' | 'x'>('macro');
  const [selectedAssetForModal, setSelectedAssetForModal] = useState<string | null>(null);
  const [ableAnalysis, setAbleAnalysis] = useState<Record<string, AbleAnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  
  // Asset management
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>([
    { symbol: 'XAUUSD', addedAt: Date.now() }
  ]);
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
        setNewsMetadata(data.newsMetadata || null); // ✅ NEW
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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
                ABLE-HF 3.0 • Gemini AI Analysis • Auto-refresh: 10 min
              </p>
              
              {/* ✅ NEW: Debug badges */}
              {newsMetadata && (
                <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    <RefreshCw className="w-3 h-3 mr-1 inline" />
                    {newsMetadata.freshNewsCount} fresh news (24h)
                  </Badge>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {newsMetadata.newestNewsAge} - {newsMetadata.oldestNewsAge}
                  </Badge>
                  {isComponentActive && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 animate-pulse">
                      🟢 Live Analysis
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {/* ✅ NEW: แสดง next refresh time */}
              {lastUpdated && (
                <div className="flex flex-col items-end">
                  <span className="text-xs md:text-sm text-zinc-600 hidden sm:block">
                    Updated {formatTime(lastUpdated)}
                  </span>
                  <span className="text-[10px] text-zinc-700">
                    Next: {getNextRefreshTime()}
                  </span>
                </div>
              )}
              <Button 
                onClick={fetchNews}
                disabled={loading}
                size="icon"
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 px-4 md:px-6">
          <div className="flex gap-4 md:gap-8">
            {[
              { key: 'macro', label: 'AI Macro Desk', icon: Brain },
              { key: 'for-you', label: 'For You', icon: Target },
              { key: 'daily', label: 'Daily Reports', icon: FileText },
              { key: 'x', label: 'X Feed', icon: Users }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 px-1 text-xs md:text-sm font-medium transition-colors relative flex items-center gap-1 md:gap-2 ${
                  activeTab === tab.key
                    ? 'text-emerald-400'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <tab.icon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          {activeTab === 'macro' && (
            <div className="p-4 md:p-6">
              {/* Asset Management */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-zinc-400">Pinned Assets ({pinnedAssets.length}/8)</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddAsset(!showAddAsset)}
                    className="h-7 text-xs border-zinc-700 text-zinc-400 hover:text-white hover:border-emerald-500"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Asset
                  </Button>
                </div>

                {showAddAsset && (
                  <Card className="p-3 mb-3 bg-zinc-900 border-zinc-800">
                    <div className="space-y-2">
                      {getAvailableAssets().map(category => (
                        category.assets.length > 0 && (
                          <div key={category.label}>
                            <p className="text-xs text-zinc-600 mb-1">{category.label}</p>
                            <div className="flex flex-wrap gap-1">
                              {category.assets.map(asset => (
                                <Badge
                                  key={asset}
                                  variant="outline"
                                  className="cursor-pointer border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400 text-xs"
                                  onClick={() => {
                                    handleAddAsset(asset);
                                    setShowAddAsset(false);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {ASSET_DISPLAY_NAMES[asset] || asset}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </Card>
                )}

                <div className="flex flex-wrap gap-2">
                  {pinnedAssets.map(asset => {
                    const price = assetPrices[asset.symbol];
                    const analysis = ableAnalysis[asset.symbol];
                    
                    return (
                      <Badge
                        key={asset.symbol}
                        variant="outline"
                        className="px-3 py-1.5 border-zinc-700 text-zinc-300 hover:border-emerald-500 group relative"
                      >
                        <div className="flex items-center gap-2">
                          <Pin className="w-3 h-3 text-emerald-500" />
                          <span className="font-medium">{ASSET_DISPLAY_NAMES[asset.symbol] || asset.symbol}</span>
                          {price && (
                            <span className={`text-xs ${price.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {price.change >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                            </span>
                          )}
                          {analysis && (
                            <span className={`text-xs font-bold ${
                              analysis.P_up_pct > 55 ? 'text-emerald-400' : 
                              analysis.P_up_pct < 45 ? 'text-red-400' : 'text-zinc-400'
                            }`}>
                              {analysis.P_up_pct > 50 ? '↗' : '↘'}
                            </span>
                          )}
                          <X
                            className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-400 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAsset(asset.symbol);
                            }}
                          />
                        </div>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Macro Analysis Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {macroData.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-zinc-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No assets pinned</p>
                    <p className="text-sm mt-1">Add assets to see AI analysis</p>
                  </div>
                ) : (
                  macroData.map(macro => {
                    const analysis = macro.ableAnalysis;
                    const isFallback = !analysis || analysis.decision?.includes('Fallback');
                    const P_up = analysis?.P_up_pct || 50;
                    const decision = analysis?.decision || 'HOLD';
                    const analysisText = analysis?.thai_summary || macro.analysis;
                    
                    return (
                      <Card
                        key={macro.symbol}
                        className="p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                        onClick={() => setSelectedAssetForModal(macro.symbol)}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">
                              {ASSET_DISPLAY_NAMES[macro.symbol] || macro.symbol}
                            </h3>
                            {assetPrices[macro.symbol] && (
                              <div className="text-sm text-zinc-500">
                                ${assetPrices[macro.symbol].price.toFixed(2)}
                              </div>
                            )}
                          </div>
                          <Badge className={`${
                            P_up > 55 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            P_up < 45 ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            'bg-zinc-700/10 text-zinc-400 border-zinc-700/30'
                          }`}>
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
                            <div
                              className={`absolute left-0 top-0 h-full transition-all duration-500 ${
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
                            {/* ✅ NEW: แสดงอายุข่าว */}
                            {newsMetadata && (
                              <span className="text-[10px] text-emerald-600">
                                • {newsMetadata.newestNewsAge}
                              </span>
                            )}
                          </div>
                          <Badge className={`text-xs ${
                            decision.includes('BUY') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            decision.includes('SELL') ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            'bg-zinc-700/10 text-zinc-400 border-zinc-700/30'
                          }`}>
                            {decision}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'for-you' && (
            <div className="p-4 md:p-6 space-y-3">
              {forYouItems.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No personalized news yet</p>
                  <p className="text-sm mt-1">Pin assets to get tailored news</p>
                </div>
              ) : (
                forYouItems.map(item => (
                  <Card
                    key={item.id}
                    className="p-3 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            {ASSET_DISPLAY_NAMES[item.symbol] || item.symbol}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                            {item.type}
                          </Badge>
                          {item.isNew && (
                            <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 animate-pulse">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-sm text-white mb-1 line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-zinc-500">{item.source} • {formatTimeAgo(item.timestamp)}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-600 flex-shrink-0 ml-2" />
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'daily' && (
            <div className="p-4 md:p-6 space-y-3">
              {dailyReports.map(report => (
                <Card
                  key={report.id}
                  className={`p-4 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer ${
                    report.isHighlighted ? 'border-emerald-500/30' : ''
                  }`}
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
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                      {report.assetsAnalyzed} assets
                    </Badge>
                  </div>
                </Card>
              ))}
              
              {dailyReports.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No reports available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'x' && (
            <div className="p-4 md:p-6 space-y-3">
              {xNotifications.map(notif => (
                <Card
                  key={notif.id}
                  className="p-3 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() => window.open(notif.url, '_blank')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-emerald-400">@{notif.source}</span>
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-500">{notif.time}</span>
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2">{notif.content}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-600 flex-shrink-0 ml-2" />
                  </div>
                </Card>
              ))}
              
              {xNotifications.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No X notifications</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Gemini Thinking Modal */}
      <GeminiThinkingModal
        isOpen={!!selectedAssetForModal}
        onClose={() => setSelectedAssetForModal(null)}
        symbol={selectedAssetForModal || ''}
        analysis={selectedAssetForModal ? ableAnalysis[selectedAssetForModal] : null}
      />
    </div>
  );
};

export default TopNews;
