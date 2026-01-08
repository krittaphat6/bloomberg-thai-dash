import { useState, useEffect, useCallback } from 'react';
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
import { AbleNewsResult, AbleNewsAnalyzer, ASSET_DISPLAY_NAMES, AVAILABLE_ASSETS } from '@/services/ableNewsIntelligence';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { fetchRealTimePrice, fetchCryptoPrice } from '@/services/realTimePriceService';

// AI Analysis Result from Algorithm
interface AIAnalysisResult {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  P_up_pct: number;
  P_down_pct: number;
  confidence: number;
  decision: string;
  thai_summary: string;
  key_drivers: string[];
  risk_warnings: string[];
  market_regime: string;
  analyzed_at: string;
  model: string;
  news_count: number;
}

// AI Thinking Step
interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete';
  detail?: string;
  duration?: number;
}

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
  
  // Real-time price data
  const [assetPrices, setAssetPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
  
  // AI Thinking State for Macro Desk
  const [macroThinkingSteps, setMacroThinkingSteps] = useState<Record<string, ThinkingStep[]>>({});
  const [macroThinkingLogs, setMacroThinkingLogs] = useState<Record<string, string[]>>({});
  const [aiAnalysisResults, setAIAnalysisResults] = useState<Record<string, AIAnalysisResult>>({});
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null);

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

  // ABLE-HF 3.0 Algorithm Analysis (No AI API - Free!)
  const analyzeAssetWithAlgorithm = useCallback(async (symbol: string, newsItems?: RawNewsItem[]) => {
    const newsToUse = newsItems || rawNews;
    if (newsToUse.length === 0) {
      return null;
    }

    setIsAnalyzing(prev => ({ ...prev, [symbol]: true }));
    setExpandedThinking(symbol);
    
    // Initialize thinking steps
    const steps: ThinkingStep[] = [
      { id: 'fetch', label: 'ดึงข่าว', status: 'pending' },
      { id: 'analyze', label: 'Algorithm วิเคราะห์', status: 'pending' },
      { id: 'compute', label: 'คำนวณ ABLE-HF', status: 'pending' }
    ];
    setMacroThinkingSteps(prev => ({ ...prev, [symbol]: steps }));
    setMacroThinkingLogs(prev => ({ ...prev, [symbol]: [] }));

    const addLog = (log: string) => {
      setMacroThinkingLogs(prev => ({
        ...prev,
        [symbol]: [...(prev[symbol] || []), log]
      }));
    };

    const updateStep = (stepId: string, status: ThinkingStep['status'], detail?: string, duration?: number) => {
      setMacroThinkingSteps(prev => ({
        ...prev,
        [symbol]: (prev[symbol] || []).map(s => 
          s.id === stepId ? { ...s, status, detail, duration } : s
        )
      }));
    };

    try {
      const startTime = Date.now();

      // STEP 1: Fetch & Filter News
      updateStep('fetch', 'running', 'กำลังค้นหาข่าวที่เกี่ยวข้อง...');
      addLog(`🔍 เริ่มค้นหาข่าวสำหรับ ${symbol}...`);
      
      const relevantKeywords = getRelevantKeywords(symbol);
      addLog(`📋 Keywords: ${relevantKeywords.slice(0, 5).join(', ')}`);
      
      const relevantNews = newsToUse.filter(item => {
        const titleLower = item.title.toLowerCase();
        return relevantKeywords.some(keyword => titleLower.includes(keyword));
      });

      const headlinesToAnalyze = relevantNews.length > 5 
        ? relevantNews.slice(0, 20).map(n => n.title)
        : newsToUse.slice(0, 20).map(n => n.title);

      addLog(`✅ พบข่าวที่เกี่ยวข้อง ${relevantNews.length} ข่าว`);
      addLog(`📰 ใช้ ${headlinesToAnalyze.length} ข่าวในการวิเคราะห์`);
      
      const step1Duration = Date.now() - startTime;
      updateStep('fetch', 'complete', `${headlinesToAnalyze.length} ข่าว`, step1Duration);

      // STEP 2: Algorithm Analysis (No AI - Free!)
      updateStep('analyze', 'running', 'Algorithm กำลังวิเคราะห์...');
      addLog(`📊 เริ่มวิเคราะห์ด้วย Algorithm (ฟรี 100%)...`);
      
      const priceData = assetPrices[symbol];
      const aiStartTime = Date.now();

      // Sentiment analysis from keywords
      const bullishKeywords = ['surge', 'rally', 'gain', 'rise', 'up', 'bull', 'profit', 'soar', 'jump', 'breakthrough', 'record', 'high', 'buy', 'growth', 'strong', 'beat', 'hawkish', 'breakout'];
      const bearishKeywords = ['crash', 'fall', 'drop', 'down', 'bear', 'loss', 'plunge', 'decline', 'sell', 'weak', 'warning', 'fear', 'concern', 'risk', 'recession', 'collapse', 'miss', 'cut', 'dovish', 'dump'];
      
      let bullishScore = 0;
      let bearishScore = 0;
      
      headlinesToAnalyze.forEach(headline => {
        const lower = headline.toLowerCase();
        bullishKeywords.forEach(w => { if (lower.includes(w)) bullishScore++; });
        bearishKeywords.forEach(w => { if (lower.includes(w)) bearishScore++; });
      });

      const totalScore = bullishScore + bearishScore || 1;
      const P_up = Math.round((bullishScore / totalScore) * 100);
      const P_down = 100 - P_up;
      
      const sentiment = bullishScore > bearishScore + 2 ? 'bullish' : 
                       bearishScore > bullishScore + 2 ? 'bearish' : 'neutral';
      const confidence = Math.min(95, 55 + Math.abs(bullishScore - bearishScore) * 5);
      
      const sentimentEmoji = sentiment === 'bullish' ? '💹' : sentiment === 'bearish' ? '📉' : '⚖️';
      const decision = sentiment === 'bullish' ? 'BUY' : sentiment === 'bearish' ? 'SELL' : 'HOLD';

      const aiAnalysis: AIAnalysisResult = {
        symbol,
        sentiment,
        P_up_pct: P_up,
        P_down_pct: P_down,
        confidence,
        decision,
        thai_summary: `${sentimentEmoji} ${symbol}: วิเคราะห์จาก ${headlinesToAnalyze.length} ข่าว | Bullish: ${bullishScore}, Bearish: ${bearishScore} | ${sentiment.toUpperCase()} ${confidence}%`,
        key_drivers: [`Bullish signals: ${bullishScore}`, `Bearish signals: ${bearishScore}`],
        risk_warnings: [],
        market_regime: sentiment === 'neutral' ? 'ranging' : 'trending',
        analyzed_at: new Date().toISOString(),
        model: 'algorithm-v3',
        news_count: headlinesToAnalyze.length
      };

      addLog(`✅ Algorithm: ${aiAnalysis.sentiment.toUpperCase()} | P(Up): ${aiAnalysis.P_up_pct}%`);
      setAIAnalysisResults(prev => ({ ...prev, [symbol]: aiAnalysis }));

      const step2Duration = Date.now() - aiStartTime;
      updateStep('analyze', 'complete', `${aiAnalysis.decision}`, step2Duration);

      // STEP 3: ABLE-HF Local Enhancement
      updateStep('compute', 'running', 'รัน 40 Modules...');
      addLog(`⚡ เริ่มรัน ABLE-HF 3.0 (40 Modules)...`);
      
      const computeStartTime = Date.now();
      
      const analyzer = new AbleNewsAnalyzer({
        symbol,
        headlines: headlinesToAnalyze,
        currentPrice: priceData?.price,
        priceChange24h: priceData?.changePercent
      });

      const result = analyzer.analyze();
      
      addLog(`📈 Module Macro: ${(result.category_performance.macro_economic * 100).toFixed(0)}%`);
      addLog(`📊 Module Sentiment: ${(result.category_performance.sentiment_flow * 100).toFixed(0)}%`);
      addLog(`🎯 Boost: +${result.quantum_enhancement + result.neural_enhancement}%`);
      addLog(`✅ ABLE-HF: ${result.decision} (${result.regime_adjusted_confidence}%)`);

      const step3Duration = Date.now() - computeStartTime;
      updateStep('compute', 'complete', `${result.decision}`, step3Duration);
      
      setAbleAnalysis(prev => ({
        ...prev,
        [symbol]: result
      }));

      const totalDuration = Date.now() - startTime;
      addLog(`🏁 Total: ${totalDuration}ms`);

      return result;

    } catch (error) {
      console.error('Analysis error:', error);
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [symbol]: false }));
    }
  }, [rawNews, assetPrices]);

  // Analyze all pinned assets when news is loaded
  const analyzeAllPinnedAssets = useCallback(async (newsItems: RawNewsItem[]) => {
    for (const asset of pinnedAssets) {
      await analyzeAssetWithAlgorithm(asset.symbol, newsItems);
    }
  }, [pinnedAssets, analyzeAssetWithAlgorithm]);

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
            description: `Algorithm analysis complete • ${data.processingTime}ms`
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
      analyzeAssetWithAlgorithm(symbol, rawNews);
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
      <div className="flex h-full bg-slate-950 text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-emerald-300/70">Loading ABLE-HF 3.0 Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-950 text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden border-2 border-emerald-500/30 rounded-lg m-1">
        {/* Header - HybridTrader Style */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-emerald-500/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-emerald-400 mb-2">🔥 TOP NEWS</h1>
              <p className="text-lg text-slate-300 font-medium flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                ABLE-HF 3.0 News Intelligence • 63+ Sources Active
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-sm text-emerald-300/60">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button 
                onClick={fetchNews}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 text-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs - HybridTrader Style (Only 2 tabs) */}
        <div className="border-b-2 border-slate-700 flex bg-slate-900/50">
          <button 
            onClick={() => setActiveTab('macro')}
            className={`px-8 py-4 text-lg font-bold transition-all ${
              activeTab === 'macro' 
                ? 'text-emerald-400 border-b-4 border-emerald-400 bg-emerald-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            📊 AI Macro Desk
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-8 py-4 text-lg font-bold transition-all ${
              activeTab === 'reports' 
                ? 'text-emerald-400 border-b-4 border-emerald-400 bg-emerald-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            📄 Daily Reports
          </button>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-6 bg-slate-900">
          {activeTab === 'macro' ? (
            <>
              {/* AI Macro Desk Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        AI Macro Desk
                      </h2>
                      <p className="text-sm text-slate-400">Market bias analysis</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Add Asset Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-transparent font-bold"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Asset
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48 bg-slate-900 border-slate-700" align="end">
                        {getAvailableAssets().map((category) => (
                          category.assets.length > 0 && (
                            <div key={category.label}>
                              <DropdownMenuLabel className="text-slate-400 text-xs">
                                {category.label}
                              </DropdownMenuLabel>
                              {category.assets.map((asset) => (
                                <DropdownMenuItem 
                                  key={asset}
                                  onClick={() => handleAddAsset(asset)}
                                  className="text-white hover:bg-slate-800 cursor-pointer"
                                >
                                  {ASSET_DISPLAY_NAMES[asset] || asset}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator className="bg-slate-700" />
                            </div>
                          )
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <button className="text-slate-500 hover:text-emerald-400 text-sm font-bold flex items-center gap-1">
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Macro Cards Grid - HybridTrader Style */}
                <div className="grid grid-cols-2 gap-6">
                  {pinnedAssets.map((pinned) => {
                    const analysis = ableAnalysis[pinned.symbol];
                    const aiResult = aiAnalysisResults[pinned.symbol];
                    const analyzing = isAnalyzing[pinned.symbol];
                    const priceData = assetPrices[pinned.symbol];
                    const thinkingSteps = macroThinkingSteps[pinned.symbol] || [];
                    const thinkingLogs = macroThinkingLogs[pinned.symbol] || [];
                    const isExpanded = expandedThinking === pinned.symbol;
                    
                    const sentiment = aiResult?.sentiment || (analysis 
                      ? (analysis.P_up_pct > 55 ? 'bullish' : analysis.P_up_pct < 45 ? 'bearish' : 'neutral')
                      : 'neutral');
                    
                    const confidence = aiResult?.confidence || (analysis 
                      ? Math.min(100, Math.max(0, Math.round(analysis.regime_adjusted_confidence)))
                      : 50);
                    
                    const analysisText = aiResult?.thai_summary || analysis?.thai_summary || 'คลิก Refresh เพื่อเริ่มวิเคราะห์...';
                    
                    const P_up = aiResult?.P_up_pct || analysis?.P_up_pct || 50;
                    const decision = aiResult?.decision || analysis?.trading_signal?.signal || 'HOLD';

                    return (
                      <Card 
                        key={pinned.symbol} 
                        className={`p-6 transition-all cursor-pointer relative group hover:scale-[1.02] ${
                          sentiment === 'bullish' 
                            ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border-2 border-emerald-500 shadow-xl shadow-emerald-500/20' 
                            : sentiment === 'bearish'
                            ? 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent border-2 border-red-500 shadow-xl shadow-red-500/20'
                            : 'bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent border-2 border-blue-500 shadow-xl shadow-blue-500/20'
                        } ${analyzing ? 'ring-2 ring-purple-500 animate-pulse' : ''}`}
                        onClick={() => setExpandedThinking(isExpanded ? null : pinned.symbol)}
                      >
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAsset(pinned.symbol);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded z-10"
                        >
                          <X className="w-4 h-4 text-white/60" />
                        </button>
                        
                        {/* Symbol & Badge - Big Style */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-4xl font-black text-white">{pinned.symbol}</span>
                            {priceData && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-mono text-slate-300">
                                  {priceData.price.toLocaleString('en-US', { 
                                    minimumFractionDigits: priceData.price > 100 ? 2 : 4,
                                    maximumFractionDigits: priceData.price > 100 ? 2 : 4
                                  })}
                                </span>
                                <span className={`text-sm font-bold ${priceData.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {priceData.changePercent >= 0 ? '↑' : '↓'} {Math.abs(priceData.changePercent).toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                          <Badge className={`text-base px-4 py-2 font-black border-2 shadow-lg ${
                            sentiment === 'bullish' ? 'bg-emerald-500 border-emerald-300 text-white' :
                            sentiment === 'bearish' ? 'bg-red-500 border-red-300 text-white' :
                            'bg-blue-500 border-blue-300 text-white'
                          }`}>
                            • {sentiment.toUpperCase()} {confidence}%
                          </Badge>
                        </div>

                        {/* Confidence Bar */}
                        <div className="mb-4">
                          <div className="text-sm text-slate-400 font-bold mb-2">Confidence</div>
                          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                sentiment === 'bullish' ? 'bg-emerald-400' :
                                sentiment === 'bearish' ? 'bg-red-400' : 'bg-blue-400'
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                        </div>

                        {/* Analysis Text - Big & Clear */}
                        <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                          <div className="flex items-start gap-3">
                            <BarChart3 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                            <p className="text-white font-semibold text-lg leading-relaxed">
                              {analysisText}
                            </p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t-2 border-slate-700">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-sm px-3 py-1 ${
                              P_up > 60 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              P_up < 40 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}>
                              P↑ {P_up.toFixed(0)}%
                            </Badge>
                            <Badge className={`text-sm font-bold px-3 py-1 ${
                              decision.includes('BUY') ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' :
                              decision.includes('SELL') ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                              'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}>
                              {decision.includes('BUY') ? '📈' : decision.includes('SELL') ? '📉' : '⚖️'} {decision}
                            </Badge>
                          </div>
                          <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Algorithm Analysis
                          </span>
                        </div>

                        {/* Expandable Thinking Panel */}
                        {isExpanded && thinkingLogs.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {thinkingSteps.map((step, idx) => (
                                <div 
                                  key={step.id}
                                  className={`p-2 rounded text-center transition-all ${
                                    step.status === 'running' ? 'bg-purple-500/20 border border-purple-500/50 animate-pulse' :
                                    step.status === 'complete' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                                    'bg-slate-800/50 border border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    {step.status === 'running' ? (
                                      <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                                    ) : step.status === 'complete' ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <div className="w-3 h-3 rounded-full bg-slate-600" />
                                    )}
                                    <span className="text-xs text-slate-400">Step {idx + 1}</span>
                                  </div>
                                  <p className="text-xs text-white truncate">{step.label}</p>
                                  {step.duration && (
                                    <p className="text-[10px] text-emerald-500">{step.duration}ms</p>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="bg-black/50 rounded p-3">
                              <div className="space-y-1 font-mono text-xs max-h-24 overflow-y-auto">
                                {thinkingLogs.slice(-6).map((log, i) => (
                                  <div 
                                    key={i} 
                                    className={`flex items-start gap-1 ${
                                      log.includes('✅') ? 'text-emerald-400' :
                                      log.includes('📊') ? 'text-purple-400' :
                                      'text-slate-400'
                                    }`}
                                  >
                                    <span className="text-slate-600 flex-shrink-0">›</span>
                                    <span className="break-words">{log}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Click to expand hint */}
                        {thinkingLogs.length > 0 && !isExpanded && (
                          <div className="mt-3 text-center">
                            <span className="text-xs text-slate-600">คลิกเพื่อดูขั้นตอน AI</span>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  
                  {/* Add Asset Card */}
                  {pinnedAssets.length < 8 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Card className="bg-slate-900/30 border-slate-800 border-dashed border-2 p-6 hover:border-emerald-500/30 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[300px]">
                          <Plus className="w-12 h-12 text-slate-600 mb-3" />
                          <span className="text-slate-500 text-lg font-bold">Add Asset</span>
                          <span className="text-slate-600 text-sm mt-1">{pinnedAssets.length}/8 assets</span>
                        </Card>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48 bg-slate-900 border-slate-700">
                        {getAvailableAssets().map((category) => (
                          category.assets.length > 0 && (
                            <div key={category.label}>
                              <DropdownMenuLabel className="text-slate-400 text-xs">
                                {category.label}
                              </DropdownMenuLabel>
                              {category.assets.map((asset) => (
                                <DropdownMenuItem 
                                  key={asset}
                                  onClick={() => handleAddAsset(asset)}
                                  className="text-white hover:bg-slate-800 cursor-pointer"
                                >
                                  {ASSET_DISPLAY_NAMES[asset] || asset}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator className="bg-slate-700" />
                            </div>
                          )
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Top Community Posts Section (was X Notifications) */}
              <div className="bg-slate-800/50 rounded-2xl border-2 border-emerald-500/30 overflow-hidden">
                <div className="p-6 border-b-2 border-emerald-500/30 bg-gradient-to-r from-emerald-900/20 to-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-7 h-7 text-emerald-400" />
                      <div>
                        <h3 className="text-2xl font-black text-white">Top Community Posts</h3>
                        <p className="text-emerald-300 text-sm font-semibold">Reddit • Hacker News • Forums</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white font-black border-none px-4 py-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                      LIVE
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="max-h-[500px]">
                  <div className="p-6 space-y-4">
                    {xNotifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className="group cursor-pointer p-4 rounded-xl border-2 border-transparent hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
                        onClick={() => window.open(notif.url, '_blank')}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0">
                            {notif.source.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-bold text-lg">{notif.source}</span>
                              <span className="text-emerald-400 font-bold">·</span>
                              <span className="text-emerald-300 text-sm font-semibold">{notif.time}</span>
                              <ExternalLink className="w-5 h-5 text-emerald-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-white text-base font-medium leading-relaxed">
                              {notif.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {xNotifications.length === 0 && (
                      <div className="text-center text-slate-500 py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold">No community posts yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* For You Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-slate-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        For You
                      </h2>
                      <p className="text-sm text-slate-500">Your personalized market briefing</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 bg-transparent font-bold">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {forYouItems.filter(i => i.isNew).length} updates
                  </Badge>
                </div>

                <div className="space-y-2">
                  {forYouItems.slice(0, 10).map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => window.open(item.url, '_blank')}
                      className="flex items-start gap-3 p-4 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                    >
                      {item.isNew && (
                        <Badge className="text-xs px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0 mt-0.5">
                          Today
                        </Badge>
                      )}
                      <div className="flex-1 text-base">
                        <span className="text-white font-bold">{item.symbol}</span>
                        <span className="text-slate-500 mx-2">bias updated:</span>
                        <span className={`font-bold ${
                          item.type.includes('BULLISH') ? 'text-emerald-400' : 
                          item.type.includes('BEARISH') ? 'text-red-400' : 'text-slate-400'
                        }`}>{item.type}</span>
                        <span className="text-slate-500 mx-2">–</span>
                        <span className="text-slate-300">{item.title}</span>
                      </div>
                    </div>
                  ))}
                  
                  {forYouItems.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <p>Add assets above to see personalized news</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Daily Reports Section - HybridTrader Style */
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-black text-white mb-2">Daily Reports</h2>
                  <p className="text-slate-400 text-lg font-semibold">Your daily pre-market report to build your bias</p>
                </div>
                <Button className="border-2 border-slate-600 text-white hover:bg-slate-800 bg-transparent font-bold">
                  <Eye className="w-5 h-5 mr-2" />
                  Mark all as read
                </Button>
              </div>

              <div className="space-y-4">
                {dailyReports.map((report) => (
                  <Card 
                    key={report.id}
                    onClick={() => window.open(report.url, '_blank')}
                    className={`p-6 border-2 transition-all cursor-pointer ${
                      report.isHighlighted 
                        ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-emerald-500 hover:border-emerald-400' 
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-black text-white mb-1">{report.title}</h3>
                            <p className="text-slate-400 text-sm font-semibold">
                              {report.date} • {report.time} • {report.assetsAnalyzed} assets analyzed
                            </p>
                          </div>
                          {report.isHighlighted && (
                            <Badge className="bg-emerald-500 text-white font-bold">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-white text-base font-medium leading-relaxed">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}

                {dailyReports.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold">No reports yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default TopNews;
