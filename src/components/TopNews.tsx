// src/components/TopNews.tsx
// ✅ FIXED VERSION - Refresh ทุก 10 นาที + เฉพาะตอนเปิด component + แสดง metadata + Historical Sentiment Chart + Alert System

import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Sparkles, ExternalLink, Brain, TrendingUp, TrendingDown, ChevronRight, Clock, BarChart3, Settings, Eye, EyeOff, FileText, Users, Zap, Loader2, Target, Plus, X, ChevronDown, AlertCircle, PlayCircle, CheckCircle2, Search, Pin, Newspaper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ASSET_DISPLAY_NAMES, AVAILABLE_ASSETS } from '@/services/ableNewsIntelligence';
import { GeminiThinkingModal } from './TopNews/GeminiThinkingModal';
import { RelationshipDiagram } from './TopNews/RelationshipDiagram';
import { FlowchartDiagram } from './TopNews/FlowchartDiagram';
import { SentimentHistoryChart, SpikeAlert } from './TopNews/SentimentHistoryChart';
import { AlertSystem, Alert } from './TopNews/AlertSystem';
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
  filtered_news_count?: number;
  filter_pass_rate?: string;
  market_moving_news?: number;
  top_news?: any[];
  thinking_process?: string;
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

  // ✅ NEW: Gemini Deep Analysis States
  const [geminiDeepLoading, setGeminiDeepLoading] = useState(false);
  const [geminiThinking, setGeminiThinking] = useState<string>('');
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [showGeminiPanel, setShowGeminiPanel] = useState(false);
  
  // ✅ NEW: Daily Report Gemini States
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [dailyReportData, setDailyReportData] = useState<any>(null);
  const [dailyReportThinking, setDailyReportThinking] = useState<string>('');

  // Asset management
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>([{
    symbol: 'XAUUSD',
    addedAt: Date.now()
  }]);
  const [assetPrices, setAssetPrices] = useState<Record<string, AssetPrice>>({});

  // ✅ NEW: Metadata และ component active state
  const [newsMetadata, setNewsMetadata] = useState<NewsMetadata | null>(null);
  const [isComponentActive, setIsComponentActive] = useState(false);
  
  // ✅ NEW: News Filter Stats from AI
  const [newsFilterStats, setNewsFilterStats] = useState<{
    totalNews: number;
    filteredNews: number;
    passRate: string;
    marketMovingCount: number;
    topNews: any[];
  } | null>(null);

  // ✅ NEW: Sentiment Chart & Alert System States
  const [showSentimentChart, setShowSentimentChart] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

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

        {/* ✅ NEW: News Filter Stats Bar */}
        {newsFilterStats && (
          <div className="px-4 md:px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                📰 Total: {newsFilterStats.totalNews}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                ✅ Filtered: {newsFilterStats.filteredNews}
              </Badge>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                📊 Pass: {newsFilterStats.passRate}
              </Badge>
              {newsFilterStats.marketMovingCount > 0 && (
                <Badge variant="outline" className="border-red-500/30 text-red-400 animate-pulse">
                  🚨 Market Moving: {newsFilterStats.marketMovingCount}
                </Badge>
              )}
            </div>
            {newsFilterStats.topNews.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-zinc-500 mb-1">Top Filtered News:</div>
                {newsFilterStats.topNews.slice(0, 3).map((news: any, i: number) => (
                  <div key={i} className="text-[10px] text-zinc-400 flex gap-2 py-0.5">
                    <span className="text-emerald-400 font-medium">#{i + 1}</span>
                    <span className="flex-1 truncate">{news.title}</span>
                    <span className="text-blue-400">R:{news.relevance}</span>
                    <span className="text-orange-400">I:{news.impact}</span>
                    {news.factors && news.factors.length > 0 && (
                      <span className="text-purple-400 hidden md:inline">• {news.factors[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <ScrollArea className="flex-1">
          {activeTab === 'macro' && <div className="p-4 md:p-6">
              {/* Top Controls - Add Asset + Run Gemini */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    ABLE-HF 3.0
                  </Badge>
                  {geminiResult && (
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                      ✨ AI Analyzed
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* ✅ Run Gemini Deep Analysis Button */}
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={async () => {
                      if (rawNews.length === 0) {
                        toast({ title: '⚠️ ไม่มีข่าว', description: 'กดปุ่ม Refresh เพื่อดึงข่าวก่อน', variant: 'destructive' });
                        return;
                      }
                      if (pinnedAssets.length === 0) {
                        toast({ title: '⚠️ ไม่มีสินทรัพย์', description: 'เพิ่มสินทรัพย์ก่อน', variant: 'destructive' });
                        return;
                      }
                      
                      setGeminiDeepLoading(true);
                      setShowGeminiPanel(true);
                      setGeminiThinking('🧠 กำลังวิเคราะห์ข่าว ' + rawNews.length + ' รายการ...\n');
                      
                      try {
                        // Analyze first pinned asset with all news
                        const targetSymbol = pinnedAssets[0].symbol;
                        setGeminiThinking(prev => prev + '📊 กำลังวิเคราะห์ ' + targetSymbol + ' ตามหลัก ABLE-HF 3.0\n');
                        
                        const { data, error } = await supabase.functions.invoke('gemini-deep-analysis', {
                          body: {
                            symbol: targetSymbol,
                            news: rawNews.slice(0, 50),
                            priceData: assetPrices[targetSymbol]
                          }
                        });
                        
                        if (error) throw error;
                        
                        if (data?.success && data?.analysis) {
                          setGeminiThinking(prev => prev + '\n✅ วิเคราะห์เสร็จสิ้น!\n');
                          setGeminiThinking(prev => prev + '📈 Decision: ' + data.analysis.decision + '\n');
                          setGeminiThinking(prev => prev + '🎯 P(Up): ' + data.analysis.P_up_pct?.toFixed(1) + '%\n');
                          setGeminiThinking(prev => prev + '💪 Confidence: ' + data.analysis.confidence + '%\n\n');
                          
                          // ✅ NEW: Show filter stats in thinking
                          if (data.analysis.filtered_news_count) {
                            setGeminiThinking(prev => prev + `📰 News Filter: ${data.analysis.filtered_news_count}/${data.analysis.news_count} (${data.analysis.filter_pass_rate})\n`);
                            if (data.analysis.market_moving_news > 0) {
                              setGeminiThinking(prev => prev + `🚨 Market Moving News: ${data.analysis.market_moving_news}\n`);
                            }
                          }
                          
                          setGeminiThinking(prev => prev + '\n💭 ' + (data.analysis.thinking_process || data.analysis.thai_summary || '') + '\n');
                          
                          setGeminiResult(data.analysis);
                          
                          // ✅ NEW: Update filter stats
                          setNewsFilterStats({
                            totalNews: data.analysis.news_count || 0,
                            filteredNews: data.analysis.filtered_news_count || 0,
                            passRate: data.analysis.filter_pass_rate || '0%',
                            marketMovingCount: data.analysis.market_moving_news || 0,
                            topNews: data.analysis.top_news || []
                          });
                          
                          // Update ableAnalysis with new deep analysis
                          setAbleAnalysis(prev => ({
                            ...prev,
                            [targetSymbol]: data.analysis
                          }));
                          
                          toast({
                            title: `✅ Gemini วิเคราะห์ ${targetSymbol} เสร็จสิ้น`,
                            description: `${data.analysis.decision} • ${data.analysis.filtered_news_count}/${data.analysis.news_count} news filtered`
                          });
                        } else {
                          throw new Error(data?.error || 'Analysis failed');
                        }
                      } catch (err) {
                        console.error('Gemini deep analysis error:', err);
                        setGeminiThinking(prev => prev + '\n❌ เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        toast({
                          title: '❌ การวิเคราะห์ล้มเหลว',
                          description: err instanceof Error ? err.message : 'Unknown error',
                          variant: 'destructive'
                        });
                      } finally {
                        setGeminiDeepLoading(false);
                      }
                    }}
                    disabled={geminiDeepLoading || rawNews.length === 0}
                    className="h-8 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                  >
                    {geminiDeepLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Run Gemini AI
                      </>
                    )}
                  </Button>
                  
                  {/* Toggle Chart Button */}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowSentimentChart(!showSentimentChart)}
                    className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-purple-400 hover:border-purple-500"
                  >
                    {showSentimentChart ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    Chart
                  </Button>
                  
                  <Button size="sm" variant="outline" onClick={() => setShowAddAsset(!showAddAsset)} className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-white hover:border-emerald-500">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Asset ({pinnedAssets.length}/8)
                  </Button>
                </div>
              </div>
              
              {/* ✅ NEW: Alert System */}
              <AlertSystem 
                rawNews={rawNews}
                pinnedAssets={pinnedAssets}
                onAlertClick={(alert) => {
                  setSelectedAlert(alert);
                  console.log('Alert clicked:', alert);
                }}
              />
              
              {/* ✅ NEW: Sentiment History Chart */}
              {showSentimentChart && rawNews.length > 0 && (
                <SentimentHistoryChart 
                  pinnedAssets={pinnedAssets}
                  rawNews={rawNews}
                  onSpikeDetected={(spike: SpikeAlert) => {
                    console.log('Spike detected from chart:', spike);
                  }}
                />
              )}
              
              {/* ✅ Gemini Thinking Panel */}
              {showGeminiPanel && (
                <Card className="mb-4 p-4 bg-gradient-to-br from-purple-950/30 to-pink-950/30 border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
                      <h3 className="text-sm font-medium text-purple-400">Gemini Deep Analysis</h3>
                      {geminiDeepLoading && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setShowGeminiPanel(false)}
                      className="h-6 w-6 text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Thinking Stream */}
                  <ScrollArea className="h-[200px] mb-3">
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {geminiThinking || '🧠 พร้อมวิเคราะห์...'}
                    </pre>
                  </ScrollArea>
                  
                  {/* Results Summary */}
                  {geminiResult && (
                    <div className="space-y-3 border-t border-purple-500/20 pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="p-2 bg-black/30 rounded-lg">
                          <p className="text-[10px] text-zinc-500">Decision</p>
                          <p className={`text-sm font-bold ${
                            geminiResult.decision?.includes('BUY') ? 'text-emerald-400' :
                            geminiResult.decision?.includes('SELL') ? 'text-red-400' : 'text-zinc-400'
                          }`}>
                            {geminiResult.decision || 'HOLD'}
                          </p>
                        </div>
                        <div className="p-2 bg-black/30 rounded-lg">
                          <p className="text-[10px] text-zinc-500">P(Up)</p>
                          <p className="text-sm font-bold text-purple-400">{geminiResult.P_up_pct?.toFixed(1) || 50}%</p>
                        </div>
                        <div className="p-2 bg-black/30 rounded-lg">
                          <p className="text-[10px] text-zinc-500">Confidence</p>
                          <p className="text-sm font-bold text-cyan-400">{geminiResult.confidence || 60}%</p>
                        </div>
                        <div className="p-2 bg-black/30 rounded-lg">
                          <p className="text-[10px] text-zinc-500">Regime</p>
                          <p className="text-sm font-bold text-yellow-400">{geminiResult.market_regime || 'ranging'}</p>
                        </div>
                      </div>
                      
                      {/* Category Performance */}
                      {geminiResult.category_performance && (
                        <div className="grid grid-cols-5 gap-1">
                          {Object.entries(geminiResult.category_performance).map(([key, val]) => (
                            <div key={key} className="text-center p-1 bg-black/20 rounded">
                              <p className="text-[8px] text-zinc-500 truncate">{key.replace('_', ' ')}</p>
                              <p className={`text-xs font-bold ${(val as number) > 60 ? 'text-emerald-400' : (val as number) < 40 ? 'text-red-400' : 'text-zinc-400'}`}>
                                {(val as number).toFixed(0)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* View Full Analysis Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const symbol = pinnedAssets[0]?.symbol;
                          if (symbol) setSelectedAssetForModal(symbol);
                        }}
                        className="w-full h-8 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        View 40 Module Analysis
                      </Button>
                    </div>
                  )}
                </Card>
              )}

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
                {pinnedAssets.length === 0 ? <div className="col-span-2 text-center py-12 text-zinc-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No assets pinned</p>
                    <p className="text-sm mt-1">Add assets to see AI analysis</p>
                  </div> : pinnedAssets.map(asset => {
              const analysis = ableAnalysis[asset.symbol];
              const hasAnalysis = analysis && analysis.P_up_pct !== undefined;
              const isFallback = !hasAnalysis || analysis?.decision?.includes('Fallback');
              const P_up = hasAnalysis ? analysis.P_up_pct : 50;
              const decision = hasAnalysis ? (analysis.decision || 'HOLD') : '—';
              const analysisText = hasAnalysis ? (analysis.thai_summary || 'กำลังรอการวิเคราะห์...') : 'กดปุ่ม "Run Gemini AI" เพื่อเริ่มการวิเคราะห์';
              const priceData = assetPrices[asset.symbol];
              
              return <Card 
                key={asset.symbol} 
                className={`p-4 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer bg-black relative group ${!hasAnalysis ? 'opacity-75' : ''}`} 
                onClick={() => hasAnalysis ? setSelectedAssetForModal(asset.symbol) : null}
              >
                        {/* DELETE BUTTON */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAsset(asset.symbol);
                            toast({ title: `❌ ${ASSET_DISPLAY_NAMES[asset.symbol] || asset.symbol} removed` });
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-800/80 hover:bg-red-500/30 text-zinc-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 z-10"
                          title={`Remove ${ASSET_DISPLAY_NAMES[asset.symbol] || asset.symbol}`}
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">
                              {ASSET_DISPLAY_NAMES[asset.symbol] || asset.symbol}
                            </h3>
                            {priceData && <div className="text-sm text-zinc-500">
                                ${priceData.price.toFixed(2)}
                              </div>}
                          </div>
                          <Badge className={`${!hasAnalysis ? 'bg-zinc-800/50 text-zinc-600 border-zinc-700' : P_up > 55 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : P_up < 45 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-zinc-700/10 text-zinc-400 border-zinc-700/30'}`}>
                            {hasAnalysis ? `${P_up.toFixed(1)}%` : '—'}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-zinc-500 mb-1">
                            <span>Bearish</span>
                            <span>Bullish</span>
                          </div>
                          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                            {hasAnalysis ? (
                              <div 
                                className={`absolute left-0 top-0 h-full transition-all duration-500 ${P_up > 55 ? 'bg-emerald-500' : P_up < 45 ? 'bg-red-500' : 'bg-zinc-500'}`} 
                                style={{ width: `${P_up}%` }} 
                              />
                            ) : (
                              <div className="absolute left-0 top-0 h-full w-1/2 bg-zinc-700/50" />
                            )}
                          </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className={`w-3 h-3 ${!hasAnalysis ? 'text-zinc-600' : isFallback ? 'text-yellow-400' : 'text-emerald-400'}`} />
                            <span className={`text-xs ${!hasAnalysis ? 'text-zinc-600' : isFallback ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {!hasAnalysis ? '⏳ Pending Analysis' : isFallback ? '⚠️ Fallback Mode' : 'ABLE-HF 3.0 Analysis'}
                            </span>
                            {analyzing && <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-1" />}
                          </div>
                          <p className={`text-xs md:text-sm leading-relaxed line-clamp-3 ${!hasAnalysis ? 'text-zinc-600 italic' : isFallback ? 'text-yellow-300/70' : 'text-zinc-300'}`}>
                            {analysisText}
                          </p>
                        </div>

                        {/* Key Drivers - only show if has analysis */}
                        {hasAnalysis && analysis?.key_drivers && analysis.key_drivers.length > 0 && <div className="mb-3">
                            <div className="flex flex-wrap gap-1">
                              {analysis.key_drivers.slice(0, 3).map((driver, i) => <Badge key={i} variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                  {driver}
                                </Badge>)}
                            </div>
                          </div>}
                          
                        {/* Placeholder for no analysis */}
                        {!hasAnalysis && (
                          <div className="mb-3 flex items-center gap-2 text-zinc-600">
                            <Sparkles className="w-3 h-3" />
                            <span className="text-[10px]">กดปุ่ม Run Gemini AI เพื่อวิเคราะห์</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <div className="flex items-center gap-2">
                            {hasAnalysis ? (
                              <>
                                <span className={`text-sm md:text-base font-bold ${P_up > 55 ? 'text-emerald-400' : P_up < 45 ? 'text-red-400' : 'text-zinc-400'}`}>
                                  {P_up > 50 ? '↗' : '↘'} {P_up > 50 ? '+' : ''}{((P_up - 50) * 0.05).toFixed(2)}%
                                </span>
                                {analysis?.news_count && <span className="text-[10px] text-zinc-600">
                                    ({analysis.filtered_news_count || 0}/{analysis.news_count} news)
                                  </span>}
                              </>
                            ) : (
                              <span className="text-sm text-zinc-600">รอวิเคราะห์...</span>
                            )}
                            {priceData && priceData.changePercent !== 0 && (
                              <span className={`text-[10px] ${priceData.changePercent > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {priceData.changePercent > 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}% today
                              </span>
                            )}
                          </div>
                          <Badge className={`text-xs ${!hasAnalysis ? 'bg-zinc-800/50 text-zinc-600 border-zinc-700' : decision.includes('BUY') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : decision.includes('SELL') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-zinc-700/10 text-zinc-400 border-zinc-700/30'}`}>
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
              {/* Header with Run Gemini Analysis Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">ABLE 3.0 Monthly Market Report</h2>
                    <p className="text-xs text-zinc-500">วิเคราะห์ข่าว 1 เดือน + Flowchart กระบวนการตัดสินใจ</p>
                  </div>
                </div>
                
                <Button
                  size="default"
                  onClick={async () => {
                    if (rawNews.length === 0) {
                      toast({ title: '⚠️ ไม่มีข่าว', description: 'กดปุ่ม Refresh เพื่อดึงข่าวก่อน', variant: 'destructive' });
                      return;
                    }
                    
                    setDailyReportLoading(true);
                    setDailyReportThinking('🧠 กำลังอ่านข่าว 1 เดือนที่ผ่านมา (' + rawNews.length + ' ข่าว)...\n');
                    
                    try {
                      setDailyReportThinking(prev => prev + '📊 วิเคราะห์ธีมตลาด, ปัจจัยเสี่ยง, โอกาสลงทุน...\n');
                      setDailyReportThinking(prev => prev + '📈 สร้าง Flowchart กระบวนการตัดสินใจ...\n\n');
                      
                      const { data, error } = await supabase.functions.invoke('gemini-daily-report', {
                        body: { news: rawNews }
                      });
                      
                      if (error) throw error;
                      
                      if (data) {
                        setDailyReportThinking(prev => prev + '✅ วิเคราะห์เสร็จสิ้น!\n\n');
                        setDailyReportThinking(prev => prev + '💭 ' + (data.thinking || 'Analysis complete') + '\n');
                        setDailyReportData(data);
                        
                        toast({
                          title: '✅ รายงานพร้อมแล้ว',
                          description: `วิเคราะห์ ${data.newsAnalyzed || rawNews.length} ข่าว สำเร็จ`
                        });
                      } else {
                        throw new Error('No data returned');
                      }
                    } catch (err) {
                      console.error('Daily report error:', err);
                      setDailyReportThinking(prev => prev + '\n❌ เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown error'));
                      toast({
                        title: '❌ การวิเคราะห์ล้มเหลว',
                        description: err instanceof Error ? err.message : 'Unknown error',
                        variant: 'destructive'
                      });
                    } finally {
                      setDailyReportLoading(false);
                    }
                  }}
                  disabled={dailyReportLoading || rawNews.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                >
                  {dailyReportLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run Gemini Analysis
                    </>
                  )}
                </Button>
              </div>
              
              {/* AI Thinking Panel */}
              {dailyReportThinking && (
                <Card className="p-4 bg-zinc-900/80 border-purple-500/30 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span className="text-sm font-medium text-purple-400">Gemini AI Thinking</span>
                  </div>
                  <ScrollArea className="h-[120px]">
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">
                      {dailyReportThinking}
                    </pre>
                  </ScrollArea>
                </Card>
              )}
              
              {/* Flowchart Diagram */}
              {dailyReportData?.flowchart && (
                <div className="mb-6">
                  <FlowchartDiagram 
                    nodes={dailyReportData.flowchart.nodes || []}
                    edges={dailyReportData.flowchart.edges || []}
                    title="AI Decision Flowchart"
                  />
                </div>
              )}
              
              {/* Report Content */}
              {dailyReportData?.report ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Main Report - Left Side */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Summary */}
                    <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-emerald-500/20">
                      <h3 className="text-lg font-bold text-white mb-2">{dailyReportData.report.title}</h3>
                      <p className="text-xs text-zinc-500 mb-3">{dailyReportData.report.dateRange} • {dailyReportData.newsAnalyzed} news analyzed</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{dailyReportData.report.summary}</p>
                    </Card>
                    
                    {/* Key Findings */}
                    <Card className="p-4 bg-zinc-900/50 border-zinc-800">
                      <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Key Findings
                      </h4>
                      <ul className="space-y-2">
                        {dailyReportData.report.keyFindings?.map((finding: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                            <span className="text-emerald-400">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </Card>
                    
                    {/* Market Themes */}
                    <Card className="p-4 bg-zinc-900/50 border-zinc-800">
                      <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Market Themes
                      </h4>
                      <div className="space-y-3">
                        {dailyReportData.report.marketThemes?.map((theme: any, i: number) => (
                          <div key={i} className="p-3 bg-zinc-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white">{theme.theme}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] ${
                                  theme.impact === 'high' ? 'border-red-500/30 text-red-400' :
                                  theme.impact === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
                                  'border-zinc-500/30 text-zinc-400'
                                }`}
                              >
                                {theme.impact} impact
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-400">{theme.description}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                    
                    {/* Outlook & Recommendation */}
                    <Card className="p-4 bg-gradient-to-br from-emerald-900/20 to-zinc-900 border-emerald-500/20">
                      <h4 className="text-sm font-medium text-emerald-400 mb-2">📊 Outlook</h4>
                      <p className="text-sm text-zinc-300 mb-4">{dailyReportData.report.outlook}</p>
                      <h4 className="text-sm font-medium text-emerald-400 mb-2">💡 Recommendation</h4>
                      <p className="text-sm text-zinc-300">{dailyReportData.report.recommendation}</p>
                    </Card>
                  </div>
                  
                  {/* Side Panel - Right Side */}
                  <div className="space-y-4">
                    {/* Risk Factors */}
                    <Card className="p-4 bg-red-900/10 border-red-500/20">
                      <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Risk Factors
                      </h4>
                      <ul className="space-y-2">
                        {dailyReportData.report.riskFactors?.map((risk: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-red-300">
                            <span>⚠️</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </Card>
                    
                    {/* Opportunities */}
                    <Card className="p-4 bg-emerald-900/10 border-emerald-500/20">
                      <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Opportunities
                      </h4>
                      <ul className="space-y-2">
                        {dailyReportData.report.opportunities?.map((opp: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-emerald-300">
                            <span>✨</span>
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </Card>
                    
                    {/* News Sources Panel */}
                    <Card className="p-4 bg-zinc-900/50 border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-white">News Sources</span>
                        <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400 ml-auto">
                          {newsMetadata?.sourcesCount || 30}+ Active
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2 bg-zinc-800/50 rounded text-center">
                          <p className="text-lg font-bold text-white">{newsMetadata?.totalFetched || rawNews.length}</p>
                          <p className="text-[10px] text-zinc-500">Total News</p>
                        </div>
                        <div className="p-2 bg-zinc-800/50 rounded text-center">
                          <p className="text-lg font-bold text-emerald-400">{newsMetadata?.freshNewsCount || 0}</p>
                          <p className="text-[10px] text-zinc-500">Fresh (24h)</p>
                        </div>
                      </div>
                      <ScrollArea className="h-20">
                        <div className="flex flex-wrap gap-1">
                          {(newsMetadata?.sources || ['CryptoCompare', 'CoinGecko', 'Reddit', 'HackerNews']).slice(0, 12).map((source, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] border-zinc-700 text-zinc-400 py-0.5">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>
                </div>
              ) : (
                /* Waiting State - Before Analysis */
                <Card className="p-8 bg-zinc-900/50 border-zinc-800 mb-6">
                  <div className="text-center">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                    <h3 className="text-lg font-medium text-zinc-400 mb-2">รอคำสั่งจาก Gemini AI</h3>
                    <p className="text-sm text-zinc-600 mb-4">
                      กดปุ่ม "Run Gemini Analysis" เพื่อให้ AI วิเคราะห์ข่าว 1 เดือน
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
                      <span>📰 {rawNews.length} ข่าวพร้อมวิเคราะห์</span>
                      <span>•</span>
                      <span>🔗 {newsMetadata?.sourcesCount || 30}+ แหล่งข่าว</span>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* AI Relationship Diagram (Legacy) */}
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
              <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">News Sources</h2>
                    <p className="text-sm text-zinc-500">แหล่งข่าวที่เชื่อมต่อ + ข่าวทั้งหมดที่ดึงมา</p>
                  </div>
                  <Badge className="ml-auto text-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse">
                    🟢 Live
                  </Badge>
                </div>

                {/* Stats + Sources Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Left: Stats */}
                  <div className="space-y-4">
                    <Card className="p-4 bg-zinc-900 border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Total Sources</p>
                      <p className="text-3xl font-bold text-white">{newsMetadata?.sourcesCount || 30}</p>
                    </Card>
                    <Card className="p-4 bg-zinc-900 border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Total News Fetched</p>
                      <p className="text-3xl font-bold text-emerald-400">{rawNews.length}</p>
                    </Card>
                    <Card className="p-4 bg-zinc-900 border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1">Fresh (24h)</p>
                      <p className="text-3xl font-bold text-blue-400">{newsMetadata?.freshNewsCount || 0}</p>
                    </Card>
                  </div>

                  {/* Right: Connected Sources List */}
                  <Card className="lg:col-span-2 p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Connected Sources ({newsMetadata?.sources?.length || 28})
                    </h3>
                    <ScrollArea className="h-[200px]">
                      <div className="flex flex-wrap gap-2 pr-4">
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
                    </ScrollArea>
                  </Card>
                </div>

                {/* All News Feed */}
                <Card className="p-4 bg-zinc-900/50 border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <Newspaper className="w-4 h-4" />
                      All Fetched News ({rawNews.length})
                    </h3>
                    <span className="text-xs text-zinc-500">
                      Last sync: {newsMetadata?.newestNewsAge || 'just now'}
                    </span>
                  </div>
                  
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3 pr-4">
                      {rawNews.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No news fetched yet</p>
                          <p className="text-xs mt-1">กดปุ่ม Refresh เพื่อดึงข่าวใหม่</p>
                        </div>
                      ) : (
                        rawNews.map((item, i) => (
                          <div 
                            key={item.id || i}
                            className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Source Badge */}
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] shrink-0 ${
                                  item.source?.includes('reddit') || item.source?.includes('r/') 
                                    ? 'border-orange-500/30 text-orange-400 bg-orange-500/5'
                                    : item.source?.includes('Crypto') || item.source?.includes('Bitcoin')
                                    ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5'
                                    : item.source?.includes('Hacker')
                                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                                    : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
                                }`}
                              >
                                {item.source || 'Unknown'}
                              </Badge>

                              {/* Sentiment */}
                              {item.sentiment && (
                                <Badge 
                                  variant="outline"
                                  className={`text-[10px] shrink-0 ${
                                    item.sentiment === 'bullish' 
                                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                                      : item.sentiment === 'bearish'
                                      ? 'border-red-500/30 text-red-400 bg-red-500/5'
                                      : 'border-zinc-500/30 text-zinc-400 bg-zinc-500/5'
                                  }`}
                                >
                                  {item.sentiment === 'bullish' ? '📈' : item.sentiment === 'bearish' ? '📉' : '➡️'} {item.sentiment}
                                </Badge>
                              )}

                              {/* Time */}
                              <span className="text-[10px] text-zinc-500 shrink-0 ml-auto">
                                {item.timestamp 
                                  ? new Date(item.timestamp).toLocaleString('th-TH', { 
                                      day: 'numeric', 
                                      month: 'short', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })
                                  : 'N/A'
                                }
                              </span>
                            </div>

                            {/* Title */}
                            <a 
                              href={item.url || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block mt-2 text-sm font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-2"
                            >
                              {item.title}
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </div>}
        </ScrollArea>
      </div>
      
      {/* Gemini Thinking Modal */}
      <GeminiThinkingModal isOpen={!!selectedAssetForModal} onClose={() => setSelectedAssetForModal(null)} symbol={selectedAssetForModal || ''} analysis={selectedAssetForModal ? ableAnalysis[selectedAssetForModal] : null} />
    </div>;
};
export default TopNews;