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

// AI Analysis Result
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

  // ABLE-HF 3.0 State
  const [pinnedAssets, setPinnedAssets] = useState<PinnedAsset[]>(DEFAULT_PINNED_ASSETS);
  const [ableAnalysis, setAbleAnalysis] = useState<Record<string, AbleNewsResult>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});
  
  // Real-time price data
  const [assetPrices, setAssetPrices] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
  
  // Gemini Streaming State
  const [geminiStream, setGeminiStream] = useState<Record<string, string>>({});
  const [aiAnalysisResults, setAIAnalysisResults] = useState<Record<string, AIAnalysisResult>>({});
  const streamRef = useRef<Record<string, HTMLDivElement | null>>({});

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

  // ✅ Real-time Gemini AI Streaming Analysis
  const analyzeAssetWithGemini = useCallback(async (symbol: string, newsItems?: RawNewsItem[]) => {
    const newsToUse = newsItems || rawNews;
    if (newsToUse.length === 0) {
      console.log(`No news for ${symbol}`);
      return null;
    }

    setIsAnalyzing(prev => ({ ...prev, [symbol]: true }));
    setGeminiStream(prev => ({ ...prev, [symbol]: '' }));
    
    try {
      const relevantKeywords = getRelevantKeywords(symbol);
      const relevantNews = newsToUse.filter(item => {
        const titleLower = item.title.toLowerCase();
        return relevantKeywords.some(keyword => titleLower.includes(keyword));
      });

      const headlinesToAnalyze = relevantNews.length > 5 
        ? relevantNews.slice(0, 20).map(n => n.title)
        : newsToUse.slice(0, 20).map(n => n.title);

      const priceData = assetPrices[symbol];

      console.log(`🧠 Starting Gemini stream for ${symbol} with ${headlinesToAnalyze.length} headlines`);

      // Call streaming edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/macro-ai-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          symbol,
          headlines: headlinesToAnalyze,
          currentPrice: priceData?.price,
          priceChange: priceData?.changePercent
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini stream error:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setGeminiStream(prev => ({ ...prev, [symbol]: fullText }));
                
                // Auto-scroll
                if (streamRef.current[symbol]) {
                  streamRef.current[symbol]!.scrollTop = streamRef.current[symbol]!.scrollHeight;
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Parse final result from stream
      console.log(`✅ Gemini stream complete for ${symbol}`);
      
      // Extract JSON result from stream
      const resultMatch = fullText.match(/<result>\s*(\{[\s\S]*?\})\s*<\/result>/);
      if (resultMatch) {
        try {
          const result = JSON.parse(resultMatch[1]);
          const aiResult: AIAnalysisResult = {
            symbol,
            sentiment: result.sentiment || 'neutral',
            P_up_pct: result.P_up_pct || 50,
            P_down_pct: result.P_down_pct || 50,
            confidence: result.confidence || 60,
            decision: result.decision || 'HOLD',
            thai_summary: result.thai_summary || '',
            key_drivers: result.key_drivers || [],
            risk_warnings: result.risk_warnings || [],
            market_regime: result.market_regime || 'ranging',
            analyzed_at: new Date().toISOString(),
            model: 'gemini-2.5-flash',
            news_count: headlinesToAnalyze.length
          };
          
          setAIAnalysisResults(prev => ({ ...prev, [symbol]: aiResult }));
          return aiResult;
        } catch (e) {
          console.error('Error parsing result:', e);
        }
      }

      return null;

    } catch (error) {
      console.error('Gemini analysis error:', error);
      toast({ 
        title: `AI Error for ${symbol}`, 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [symbol]: false }));
    }
  }, [rawNews, assetPrices, toast]);

  // Analyze all pinned assets when news is loaded
  const analyzeAllPinnedAssets = useCallback(async (newsItems: RawNewsItem[]) => {
    for (const asset of pinnedAssets) {
      await analyzeAssetWithGemini(asset.symbol, newsItems);
    }
  }, [pinnedAssets, analyzeAssetWithGemini]);

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
        
        // Auto-analyze all pinned assets with Gemini
        if (data.rawNews?.length > 0) {
          analyzeAllPinnedAssets(data.rawNews);
        }
        
        if (!initialLoading) {
          toast({ 
            title: '✅ News updated', 
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
    
    // Immediately analyze the new asset with Gemini
    if (rawNews.length > 0) {
      analyzeAssetWithGemini(symbol, rawNews);
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
    setGeminiStream(prev => {
      const newStream = { ...prev };
      delete newStream[symbol];
      return newStream;
    });
    setAIAnalysisResults(prev => {
      const newResults = { ...prev };
      delete newResults[symbol];
      return newResults;
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
                Your personal financial newspaper
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
                      <p className="text-xs md:text-sm text-zinc-500">Market bias analysis</p>
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
                    const aiResult = aiAnalysisResults[pinned.symbol];
                    const analyzing = isAnalyzing[pinned.symbol];
                    const priceData = assetPrices[pinned.symbol];
                    const streamText = geminiStream[pinned.symbol] || '';
                    
                    const sentiment = aiResult?.sentiment || 'neutral';
                    const confidence = aiResult?.confidence || 50;
                    const analysisText = aiResult?.thai_summary || 'กำลังวิเคราะห์...';
                    const P_up = aiResult?.P_up_pct || 50;
                    const decision = aiResult?.decision || 'HOLD';

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
                          <div className="text-xs text-zinc-500 mb-1">Confidence</div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                sentiment === 'bullish' ? 'bg-emerald-500' :
                                sentiment === 'bearish' ? 'bg-red-500' : 'bg-zinc-500'
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-emerald-400">AI Analysis</span>
                            {analyzing && <Loader2 className="w-3 h-3 animate-spin text-emerald-400 ml-1" />}
                          </div>
                          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed line-clamp-3">
                            {analysisText}
                          </p>
                        </div>

                        {/* Gemini Thinking Stream - Mobile Optimized */}
                        {(analyzing || streamText) && (
                          <div className="mb-3 bg-zinc-950 rounded-lg p-2 border border-zinc-800">
                            <div className="flex items-center gap-1 mb-1.5">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span className="text-[10px] text-purple-400 font-medium">Gemini AI Thinking</span>
                              {analyzing && (
                                <div className="flex gap-0.5 ml-1">
                                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              )}
                            </div>
                            <div 
                              ref={(el) => { streamRef.current[pinned.symbol] = el; }}
                              className="font-mono text-[10px] md:text-xs text-purple-200/70 max-h-20 md:max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed"
                            >
                              {streamText.slice(-500)}
                              {analyzing && <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse" />}
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm md:text-base font-bold ${P_up > 55 ? 'text-emerald-400' : P_up < 45 ? 'text-red-400' : 'text-zinc-400'}`}>
                              {P_up > 50 ? '↗' : '↘'} +{(P_up > 50 ? (P_up - 50) * 0.05 : (50 - P_up) * -0.05).toFixed(2)}%
                            </span>
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
                        }`}>{item.type}</span>
                        <span className="text-zinc-600 mx-1">–</span>
                        <span className="text-zinc-300 truncate">{item.title}</span>
                      </div>
                    </div>
                  ))}
                  
                  {forYouItems.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                      <p className="text-sm">Add assets above to see personalized news</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Daily Reports Section */
            <div>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-medium text-white mb-1">Daily Reports</h2>
                  <p className="text-xs md:text-sm text-zinc-500">Your daily pre-market report to build your bias</p>
                </div>
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-xs md:text-sm">
                  <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Mark all as read
                </Button>
              </div>

              <div className="space-y-2 md:space-y-3">
                {dailyReports.map((report) => (
                  <Card 
                    key={report.id}
                    onClick={() => window.open(report.url, '_blank')}
                    className={`p-3 md:p-4 transition-all cursor-pointer bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 ${
                      report.isHighlighted ? 'border-emerald-500/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <FileText className="w-5 h-5 md:w-6 md:h-6 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="text-sm md:text-base font-medium text-white line-clamp-1">{report.title}</h3>
                            <p className="text-[10px] md:text-xs text-zinc-500">
                              {report.date} • {report.time} • {report.assetsAnalyzed} assets
                            </p>
                          </div>
                          {report.isHighlighted && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-zinc-400 line-clamp-2">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}

                {dailyReports.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No reports yet</p>
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
