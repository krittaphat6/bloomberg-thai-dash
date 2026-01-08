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
  ChevronDown, Twitter, AlertCircle, PlayCircle, CheckCircle2, Search, Pin
} from 'lucide-react';
import { TwitterChannelPinPanel } from '@/components/TopNews/TwitterChannelPinPanel';
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
import { TWITTER_ACCOUNTS, type TwitterPost } from '@/types/twitterIntelligence';
import { fetchRealTimePrice, fetchCryptoPrice } from '@/services/realTimePriceService';

// AI Analysis Result from Lovable AI
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
  const [activeTab, setActiveTab] = useState<'macro' | 'reports' | 'twitter'>('macro');
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
  const [geminiStreams, setGeminiStreams] = useState<Record<string, string>>({}); // Live Gemini streaming
  const [aiAnalysisResults, setAIAnalysisResults] = useState<Record<string, AIAnalysisResult>>({});
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null);

  // Twitter Intelligence State
  const [twitterPosts, setTwitterPosts] = useState<TwitterPost[]>([]);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [twitterLastUpdate, setTwitterLastUpdate] = useState<Date | null>(null);
  const [twitterProcessingStep, setTwitterProcessingStep] = useState<'idle' | 'scraping' | 'analyzing' | 'ableHF'>('idle');
  const [twitterThinking, setTwitterThinking] = useState<string[]>([]); // Real-time AI thinking log

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
        // Try crypto API first for crypto assets
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
    const interval = setInterval(fetchPrices, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // ABLE-HF 3.0 + Lovable AI Analysis Function with STREAMING thinking steps
  const analyzeAssetWithAI = useCallback(async (symbol: string, newsItems?: RawNewsItem[]) => {
    const newsToUse = newsItems || rawNews;
    if (newsToUse.length === 0) {
      return null;
    }

    setIsAnalyzing(prev => ({ ...prev, [symbol]: true }));
    setExpandedThinking(symbol);
    setGeminiStreams(prev => ({ ...prev, [symbol]: '' })); // Reset stream
    
    // Initialize thinking steps
    const steps: ThinkingStep[] = [
      { id: 'fetch', label: 'ดึงข่าว', status: 'pending' },
      { id: 'analyze', label: 'Gemini AI คิดสด', status: 'pending' },
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

      // STEP 2: Call Lovable AI with STREAMING
      updateStep('analyze', 'running', 'Gemini กำลังคิด...');
      addLog(`🧠 ส่งข้อมูลให้ Gemini 2.5 Flash (Streaming)...`);
      
      const priceData = assetPrices[symbol];
      const aiStartTime = Date.now();

      // Use streaming endpoint
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/macro-ai-stream`;
      
      try {
        const response = await fetch(streamUrl, {
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

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let textBuffer = '';

        // Read stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          // Process SSE lines
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullText += content;
                // Update streaming text
                setGeminiStreams(prev => ({ ...prev, [symbol]: fullText }));
              }
            } catch {
              // Incomplete JSON, wait for more
            }
          }
        }

        // Parse result from fullText
        let aiAnalysis: AIAnalysisResult | null = null;
        
        // Extract JSON from <result> tag
        const resultMatch = fullText.match(/<result>\s*([\s\S]*?)\s*<\/result>/);
        if (resultMatch) {
          try {
            const jsonStr = resultMatch[1].trim();
            const parsed = JSON.parse(jsonStr);
            aiAnalysis = {
              symbol,
              sentiment: parsed.sentiment || 'neutral',
              P_up_pct: parsed.P_up_pct || 50,
              P_down_pct: parsed.P_down_pct || 50,
              confidence: parsed.confidence || 50,
              decision: parsed.decision || 'HOLD',
              thai_summary: parsed.thai_summary || '',
              key_drivers: parsed.key_drivers || [],
              risk_warnings: parsed.risk_warnings || [],
              market_regime: parsed.market_regime || 'ranging',
              analyzed_at: new Date().toISOString(),
              model: 'gemini-2.5-flash',
              news_count: headlinesToAnalyze.length
            };
            addLog(`✅ AI: ${aiAnalysis.sentiment.toUpperCase()} | P(Up): ${aiAnalysis.P_up_pct}%`);
            setAIAnalysisResults(prev => ({ ...prev, [symbol]: aiAnalysis! }));
          } catch (e) {
            console.warn('JSON parse failed:', e);
          }
        }

        const step2Duration = Date.now() - aiStartTime;
        updateStep('analyze', 'complete', aiAnalysis ? `${aiAnalysis.decision}` : 'Done', step2Duration);

      } catch (streamError) {
        console.warn('Stream error, using fallback:', streamError);
        addLog(`⚠️ Stream error, using fallback...`);
        updateStep('analyze', 'complete', 'Fallback mode', Date.now() - aiStartTime);
      }

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
      await analyzeAssetWithAI(asset.symbol, newsItems);
    }
  }, [pinnedAssets, analyzeAssetWithAI]);

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
      analyzeAssetWithAI(symbol, rawNews);
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

  // Fetch Twitter Intelligence with real-time thinking display
  const fetchTwitterIntelligence = useCallback(async () => {
    setTwitterLoading(true);
    setTwitterThinking([]);
    setTwitterProcessingStep('scraping');
    
    const addThought = (thought: string) => {
      setTwitterThinking(prev => [...prev, `[${new Date().toLocaleTimeString('th-TH')}] ${thought}`]);
    };
    
    try {
      // Get high-priority accounts - Include FOREXMONDAY as priority
      const priorityAccounts = TWITTER_ACCOUNTS
        .filter(a => a.enabled && a.priority <= 2)
        .slice(0, 25)
        .map(a => a.username);

      addThought(`🐦 เริ่มดึงข้อมูลจาก ${priorityAccounts.length} accounts...`);
      addThought(`📍 รวม @purich_fx (FOREXMONDAY) - วิเคราะห์พิเศษ`);
      
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('twitter-scraper', {
        body: { accounts: priorityAccounts, maxPostsPerAccount: 3 }
      });

      if (scrapeError || !scrapeData?.success) {
        addThought(`❌ Error: ${scrapeError?.message || scrapeData?.error || 'Scraping failed'}`);
        return;
      }

      addThought(`✅ ดึงข้อมูลสำเร็จ: ${scrapeData.posts?.length || 0} tweets`);
      
      if (scrapeData.posts?.length > 0) {
        // STEP 2: AI Analysis
        setTwitterProcessingStep('analyzing');
        addThought(`🧠 เริ่มวิเคราะห์ด้วย Gemini 2.5 Flash...`);
        addThought(`📊 กำลังประมวลผล sentiment, urgency, affected assets...`);
        
        const { data: aiData } = await supabase.functions.invoke('twitter-ai-analyzer', {
          body: { posts: scrapeData.posts }
        });

        if (aiData?.success) {
          addThought(`✅ AI Analysis สำเร็จ: ${aiData.posts?.length || 0} posts`);
          addThought(`📈 Bullish: ${aiData.stats?.bullish || 0} | Bearish: ${aiData.stats?.bearish || 0}`);
          
          // STEP 3: ABLE-HF Enhancement
          setTwitterProcessingStep('ableHF');
          addThought(`⚡ เริ่มรัน ABLE-HF 3.0 (40 Modules)...`);
          
          const criticalCount = aiData.posts?.filter((p: TwitterPost) => p.urgency === 'critical' || p.urgency === 'high').length || 0;
          addThought(`🚨 Critical/High priority: ${criticalCount} posts`);
          
          // Check FOREXMONDAY posts for special analysis
          const forexMondayPosts = aiData.posts?.filter((p: TwitterPost) => 
            p.username?.toLowerCase().includes('purich') || p.username?.toLowerCase().includes('forexmonday')
          );
          if (forexMondayPosts?.length > 0) {
            addThought(`⭐ พบโพสต์จาก FOREXMONDAY: ${forexMondayPosts.length} posts - วิเคราะห์พิเศษ!`);
          }
          
          addThought(`🎯 คำนวณ P(up), P(down), quantum/neural enhancement...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          addThought(`✅ ABLE-HF 3.0 Analysis Complete!`);
          
          setTwitterPosts(aiData.posts || []);
          setTwitterLastUpdate(new Date());
        } else {
          addThought(`⚠️ AI Analysis มีปัญหา - ใช้ fallback analysis`);
        }
      }
    } catch (error: any) {
      addThought(`❌ Error: ${error.message}`);
    } finally {
      setTwitterProcessingStep('idle');
      setTwitterLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNews();
    fetchTwitterIntelligence();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Auto-refresh Twitter every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchTwitterIntelligence, 300000);
    return () => clearInterval(interval);
  }, [fetchTwitterIntelligence]);

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
        {/* Header - Bright Gradient */}
        <div className="p-6 bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-b-2 border-emerald-500/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-emerald-400">
                🔥 TOP NEWS
              </h1>
              <p className="text-emerald-300/80 flex items-center gap-2 mt-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                ABLE-HF 3.0 News Intelligence • 63+ Sources Active
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-emerald-300/60">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchNews}
                disabled={loading}
                className="text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20 bg-transparent">
                <Settings className="w-4 h-4 mr-2" />
                Personalize
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Tab Selector - Bright Colors */}
            <div className="flex gap-6 border-b-2 border-emerald-500/30">
              <button
                onClick={() => setActiveTab('macro')}
                className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors ${
                  activeTab === 'macro' 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-emerald-300/60 hover:text-emerald-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                AI Macro Desk
              </button>
              <button
                onClick={() => setActiveTab('twitter')}
                className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors ${
                  activeTab === 'twitter' 
                    ? 'text-blue-400 border-b-2 border-blue-400' 
                    : 'text-blue-300/60 hover:text-blue-300'
                }`}
              >
                <Twitter className="w-4 h-4" />
                Twitter Intelligence
                {twitterPosts.filter(p => p.urgency === 'critical' || p.urgency === 'high').length > 0 && (
                  <Badge className="text-[10px] bg-red-500 text-white animate-pulse ml-1">
                    {twitterPosts.filter(p => p.urgency === 'critical' || p.urgency === 'high').length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 pb-3 text-sm font-bold transition-colors ${
                  activeTab === 'reports' 
                    ? 'text-purple-400 border-b-2 border-purple-400' 
                    : 'text-purple-300/60 hover:text-purple-300'
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
                      const aiResult = aiAnalysisResults[pinned.symbol];
                      const analyzing = isAnalyzing[pinned.symbol];
                      const priceData = assetPrices[pinned.symbol];
                      const thinkingSteps = macroThinkingSteps[pinned.symbol] || [];
                      const thinkingLogs = macroThinkingLogs[pinned.symbol] || [];
                      const geminiStreamText = geminiStreams[pinned.symbol] || '';
                      const isExpanded = expandedThinking === pinned.symbol;
                      
                      // Use AI result first, then ABLE analysis
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
                          className={`p-4 transition-all cursor-pointer relative group ${
                            sentiment === 'bullish' 
                              ? 'bg-emerald-500/10 border-2 border-emerald-500 hover:bg-emerald-500/20' 
                              : sentiment === 'bearish'
                              ? 'bg-red-500/10 border-2 border-red-500 hover:bg-red-500/20'
                              : 'bg-blue-500/10 border-2 border-blue-500 hover:bg-blue-500/20'
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
                            <X className="w-3 h-3 text-white/60" />
                          </button>
                          
                          {/* Header with Price */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-2xl font-bold text-white">{pinned.symbol}</h3>
                              {priceData ? (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm font-mono text-zinc-300">
                                    {priceData.price.toLocaleString('en-US', { 
                                      minimumFractionDigits: priceData.price > 100 ? 2 : 4,
                                      maximumFractionDigits: priceData.price > 100 ? 2 : 4
                                    })}
                                  </span>
                                  <span className={`text-xs font-medium ${priceData.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {priceData.changePercent >= 0 ? '↑' : '↓'} {Math.abs(priceData.changePercent).toFixed(2)}%
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                                  <span className="text-xs text-zinc-500">Loading...</span>
                                </div>
                              )}
                            </div>
                            <Badge 
                              className={`text-sm px-3 py-1 font-bold ${
                                sentiment === 'bullish' 
                                  ? 'bg-emerald-500 text-white' 
                                  : sentiment === 'bearish'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-blue-500 text-white'
                              }`}
                            >
                              {sentiment.toUpperCase()} {confidence}%
                            </Badge>
                          </div>

                          {/* Confidence Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-zinc-500">Confidence</span>
                              <span className="text-xs text-zinc-500">{confidence}%</span>
                            </div>
                            <Progress 
                              value={confidence} 
                              className={`h-1.5 bg-zinc-800 ${
                                sentiment === 'bullish' ? '[&>div]:bg-emerald-500' : 
                                sentiment === 'bearish' ? '[&>div]:bg-red-500' : 
                                '[&>div]:bg-zinc-500'
                              }`}
                            />
                          </div>

                          {/* AI Analysis */}
                          <div className="mb-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Brain className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-purple-400">AI Analysis</span>
                              {analyzing && (
                                <Loader2 className="w-3 h-3 animate-spin text-purple-400 ml-1" />
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                              {analysisText}
                            </p>
                          </div>

                          {/* P(up) and Decision - All show % consistently */}
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              <Badge className={`text-[10px] ${
                                P_up > 60 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                P_up < 40 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              }`}>
                                P↑ {P_up.toFixed(0)}%
                              </Badge>
                              {analysis && analysis.quantum_enhancement > 0 && (
                                <Badge className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                  Q+{analysis.quantum_enhancement}%
                                </Badge>
                              )}
                            </div>
                            {/* ABLE-HF Decision with % */}
                            <Badge className={`text-xs font-bold px-2 py-1 ${
                              decision.includes('BUY') ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' :
                              decision.includes('SELL') ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                              'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                            }`}>
                              {decision.includes('BUY') ? '📈' : decision.includes('SELL') ? '📉' : '⚖️'} {decision} ({confidence}%)
                            </Badge>
                          </div>

                          {/* Expandable AI Thinking Panel with Gemini Streaming */}
                          {isExpanded && (thinkingLogs.length > 0 || analyzing || geminiStreamText) && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              {/* 3-Step Progress */}
                              <div className="grid grid-cols-3 gap-1 mb-3">
                                {thinkingSteps.map((step, idx) => (
                                  <div 
                                    key={step.id}
                                    className={`p-1.5 rounded text-center transition-all ${
                                      step.status === 'running' ? 'bg-purple-500/20 border border-purple-500/50 animate-pulse' :
                                      step.status === 'complete' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                                      'bg-zinc-800/50 border border-zinc-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      {step.status === 'running' ? (
                                        <Loader2 className="w-2.5 h-2.5 text-purple-400 animate-spin" />
                                      ) : step.status === 'complete' ? (
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                      ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                                      )}
                                      <span className="text-[9px] text-zinc-400">Step {idx + 1}</span>
                                    </div>
                                    <p className="text-[9px] text-white truncate">{step.label}</p>
                                    {step.duration && (
                                      <p className="text-[8px] text-emerald-500">{step.duration}ms</p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Step 1: News Search Logs */}
                              <div className="bg-black/50 rounded p-2 mb-2">
                                <div className="flex items-center gap-1 mb-1">
                                  <Search className="w-2.5 h-2.5 text-blue-400" />
                                  <span className="text-[9px] font-medium text-blue-400">Step 1: ค้นหาข่าว</span>
                                </div>
                                <div className="space-y-0.5 font-mono text-[9px] max-h-16 overflow-y-auto">
                                  {thinkingLogs.filter(l => !l.includes('ABLE-HF') && !l.includes('Module')).slice(-4).map((log, i) => (
                                    <div 
                                      key={i} 
                                      className={`flex items-start gap-1 ${
                                        log.includes('✅') ? 'text-emerald-400' :
                                        log.includes('🧠') ? 'text-purple-400' :
                                        'text-zinc-400'
                                      }`}
                                    >
                                      <span className="text-zinc-600 flex-shrink-0">›</span>
                                      <span className="break-words">{log}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Step 2: Gemini AI Streaming Response */}
                              {geminiStreamText && (
                                <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/30 rounded p-2 mb-2 border border-purple-500/30">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Brain className="w-2.5 h-2.5 text-purple-400" />
                                    <span className="text-[9px] font-bold text-purple-400">Step 2: Gemini AI กำลังคิด</span>
                                    {thinkingSteps.find(s => s.id === 'analyze')?.status === 'running' && (
                                      <div className="flex gap-0.5 ml-1">
                                        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                      </div>
                                    )}
                                  </div>
                                  <ScrollArea className="h-32 w-full">
                                    <div className="font-mono text-[9px] text-purple-200 whitespace-pre-wrap leading-relaxed">
                                      {geminiStreamText}
                                      {thinkingSteps.find(s => s.id === 'analyze')?.status === 'running' && (
                                        <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-pulse" />
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}

                              {/* Step 3: ABLE-HF Logs */}
                              {thinkingLogs.some(l => l.includes('ABLE-HF') || l.includes('Module')) && (
                                <div className="bg-emerald-950/30 rounded p-2 border border-emerald-500/20">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                                    <span className="text-[9px] font-medium text-emerald-400">Step 3: ABLE-HF 3.0</span>
                                  </div>
                                  <div className="space-y-0.5 font-mono text-[9px]">
                                    {thinkingLogs.filter(l => l.includes('ABLE-HF') || l.includes('Module') || l.includes('Boost') || l.includes('🏁')).slice(-4).map((log, i) => (
                                      <div key={i} className="flex items-start gap-1 text-emerald-400">
                                        <span className="text-zinc-600 flex-shrink-0">›</span>
                                        <span className="break-words">{log}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Click to expand hint */}
                          {thinkingLogs.length > 0 && !isExpanded && (
                            <div className="mt-2 text-center">
                              <span className="text-[9px] text-zinc-600">คลิกเพื่อดูขั้นตอน AI</span>
                            </div>
                          )}
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
            ) : activeTab === 'reports' ? (
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
            ) : activeTab === 'twitter' ? (
              /* Twitter Intelligence Full View */
              <div className="space-y-6">
                {/* Pinned Twitter Channels Section */}
                <TwitterChannelPinPanel 
                  onNewPosts={(posts, username) => {
                    // Add new posts to main feed
                    setTwitterPosts(prev => {
                      const existingIds = prev.map(p => p.id);
                      const newPosts = posts.filter(p => !existingIds.includes(p.id));
                      return [...newPosts, ...prev].slice(0, 100);
                    });
                    toast({
                      title: `🐦 New posts from @${username}`,
                      description: `${posts.length} new posts detected`,
                    });
                  }}
                />

                {/* Separator */}
                <div className="border-t border-zinc-800 pt-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Twitter className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-white flex items-center gap-2">
                          All Twitter Feed
                          <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                            100 Accounts
                          </Badge>
                        </h2>
                        <p className="text-xs text-zinc-500">Real-time market-moving tweets with AI analysis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {twitterLastUpdate && (
                        <span className="text-xs text-zinc-500">
                          Updated {twitterLastUpdate.toLocaleTimeString('th-TH')}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchTwitterIntelligence}
                        disabled={twitterLoading}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
                      >
                        {twitterLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        {twitterLoading ? 'Analyzing...' : 'Refresh All'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Processing Pipeline with Step Indicators */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className={`p-3 transition-all ${
                    twitterProcessingStep === 'scraping' ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50' : 
                    twitterProcessingStep !== 'idle' ? 'border-green-500/50 bg-green-500/5' :
                    'bg-zinc-900/50 border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {twitterProcessingStep === 'scraping' ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : twitterProcessingStep !== 'idle' ? (
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-white text-[8px]">✓</span>
                        </div>
                      ) : (
                        <Twitter className="w-4 h-4 text-zinc-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">Step 1: Scraping</p>
                        <p className="text-xs text-zinc-500">
                          {twitterProcessingStep === 'scraping' ? 'Fetching tweets...' : 
                           twitterProcessingStep !== 'idle' ? 'Complete ✓' : 'Ready'}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-3 transition-all ${
                    twitterProcessingStep === 'analyzing' ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/50' : 
                    twitterProcessingStep === 'ableHF' ? 'border-green-500/50 bg-green-500/5' :
                    'bg-zinc-900/50 border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {twitterProcessingStep === 'analyzing' ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      ) : twitterProcessingStep === 'ableHF' ? (
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-white text-[8px]">✓</span>
                        </div>
                      ) : (
                        <Brain className="w-4 h-4 text-zinc-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">Step 2: Gemini AI</p>
                        <p className="text-xs text-zinc-500">
                          {twitterProcessingStep === 'analyzing' ? 'Analyzing sentiment...' : 
                           twitterProcessingStep === 'ableHF' ? 'Complete ✓' : 'Ready'}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-3 transition-all ${
                    twitterProcessingStep === 'ableHF' ? 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500/50' : 
                    'bg-zinc-900/50 border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {twitterProcessingStep === 'ableHF' ? (
                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 text-zinc-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">Step 3: ABLE-HF</p>
                        <p className="text-xs text-zinc-500">
                          {twitterProcessingStep === 'ableHF' ? '40 Modules Computing...' : 'Ready'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Real-time AI Thinking Log */}
                {twitterThinking.length > 0 && (
                  <Card className="bg-zinc-950 border-zinc-800 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-medium text-purple-400">AI Thinking Log (Real-time)</span>
                      {twitterLoading && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-xs">
                      {twitterThinking.map((thought, i) => (
                        <div key={i} className="text-zinc-400 flex items-start gap-2">
                          <span className="text-zinc-600">{'>'}</span>
                          <span className={thought.includes('✅') ? 'text-green-400' : 
                                           thought.includes('❌') ? 'text-red-400' :
                                           thought.includes('⭐') ? 'text-yellow-400' :
                                           'text-zinc-400'}>{thought}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-5 gap-3">
                  <Card className="bg-zinc-900/50 border-zinc-800 p-3 text-center">
                    <p className="text-xl font-bold text-blue-400">{twitterPosts.length}</p>
                    <p className="text-xs text-zinc-500">Posts</p>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800 p-3 text-center">
                    <p className="text-xl font-bold text-red-400">{twitterPosts.filter(p => p.urgency === 'critical').length}</p>
                    <p className="text-xs text-zinc-500">Critical</p>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{twitterPosts.filter(p => p.sentiment === 'bullish').length}</p>
                    <p className="text-xs text-zinc-500">Bullish</p>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800 p-3 text-center">
                    <p className="text-xl font-bold text-red-400">{twitterPosts.filter(p => p.sentiment === 'bearish').length}</p>
                    <p className="text-xs text-zinc-500">Bearish</p>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800 p-3 text-center">
                    <p className="text-xl font-bold text-yellow-400">{twitterPosts.filter(p => p.ableAnalysis).length}</p>
                    <p className="text-xs text-zinc-500">ABLE-HF</p>
                  </Card>
                </div>

                {/* Posts Grid */}
                {twitterPosts.length === 0 && !twitterLoading ? (
                  <div className="text-center py-12">
                    <Twitter className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-4">กด Refresh เพื่อเริ่มดึงข่าว Twitter</p>
                    <Button onClick={fetchTwitterIntelligence} className="bg-blue-500 hover:bg-blue-600">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Twitter Intelligence
                    </Button>
                  </div>
                ) : twitterLoading && twitterPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                    <p className="text-zinc-400">กำลังดึงและวิเคราะห์ข่าว Twitter...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {twitterPosts.map((post) => (
                      <Card 
                        key={post.id}
                        className={`p-4 cursor-pointer hover:border-zinc-600 transition-colors ${
                          post.urgency === 'critical' ? 'bg-red-500/5 border-red-500/30' :
                          post.urgency === 'high' ? 'bg-orange-500/5 border-orange-500/30' :
                          'bg-zinc-900/50 border-zinc-800'
                        }`}
                        onClick={() => window.open(post.url, '_blank')}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                              {post.username?.[0]?.toUpperCase() || '@'}
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">@{post.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {post.sentiment && (
                              <Badge className={`text-[10px] ${
                                post.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                                post.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                                'bg-zinc-500/20 text-zinc-400'
                              }`}>
                                {post.sentiment === 'bullish' && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                                {post.sentiment === 'bearish' && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                                {post.sentiment}
                              </Badge>
                            )}
                            {(post.urgency === 'critical' || post.urgency === 'high') && (
                              <Badge className={`text-[10px] ${post.urgency === 'critical' ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500/20 text-orange-400'}`}>
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                {post.urgency}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-zinc-300 text-sm mb-2 line-clamp-2">{post.content}</p>

                        {/* AI Summary */}
                        {post.aiSummary && (
                          <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2 mb-2">
                            <div className="flex items-center gap-1 text-purple-400 text-xs mb-1">
                              <Brain className="w-3 h-3" />
                              AI Summary ({post.confidence}%)
                            </div>
                            <p className="text-xs text-zinc-300">{post.aiSummary}</p>
                          </div>
                        )}

                        {/* Affected Assets */}
                        {post.affectedAssets && post.affectedAssets.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.affectedAssets.map(asset => (
                              <Badge key={asset} variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                                <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                                {asset}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* ABLE-HF Analysis */}
                        {post.ableAnalysis && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                <Zap className="w-3 h-3" />
                                ABLE-HF 3.0
                              </div>
                              <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">
                                {post.ableAnalysis.decision}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                              <span>P↑ {post.ableAnalysis.P_up_pct}%</span>
                              <span>•</span>
                              <span>Confidence: {post.ableAnalysis.confidence}%</span>
                            </div>
                          </div>
                        )}

                        {/* Engagement */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span>❤️ {post.likes?.toLocaleString()}</span>
                          <span>🔄 {post.retweets?.toLocaleString()}</span>
                          <span className="ml-auto">{new Date(post.timestamp).toLocaleTimeString('th-TH')}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-border flex flex-col bg-card">
        {/* Market Session Timer */}
        <div className="p-4 border-b border-border">
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

        {/* Twitter Intelligence */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Twitter className="w-4 h-4 text-blue-400" />
              <span className="text-white font-medium">Twitter Intelligence</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTwitterIntelligence}
                disabled={twitterLoading}
                className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
              >
                {twitterLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
              <Badge className="border-emerald-500/30 text-emerald-400 text-xs bg-emerald-500/10 border">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Live
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {twitterPosts.length === 0 && !twitterLoading ? (
                <div className="text-center py-8">
                  <Twitter className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm mb-3">กด Refresh เพื่อดึงข่าว Twitter</p>
                  <Button
                    size="sm"
                    onClick={fetchTwitterIntelligence}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Start Intelligence
                  </Button>
                </div>
              ) : twitterLoading && twitterPosts.length === 0 ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">กำลังวิเคราะห์ Twitter...</p>
                </div>
              ) : (
                twitterPosts.slice(0, 15).map((post) => (
                  <div 
                    key={post.id} 
                    className="group cursor-pointer p-2 rounded-lg hover:bg-zinc-900/50 transition-colors"
                    onClick={() => window.open(post.url, '_blank')}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0">
                        {post.username?.[0]?.toUpperCase() || '@'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-white font-medium text-xs truncate">@{post.username}</span>
                          {post.sentiment && (
                            <Badge className={`text-[9px] px-1 py-0 ${
                              post.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                              post.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                              'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {post.sentiment === 'bullish' && <TrendingUp className="w-2 h-2 mr-0.5" />}
                              {post.sentiment === 'bearish' && <TrendingDown className="w-2 h-2 mr-0.5" />}
                              {post.sentiment}
                            </Badge>
                          )}
                          {(post.urgency === 'critical' || post.urgency === 'high') && (
                            <Badge className="text-[9px] px-1 py-0 bg-red-500/20 text-red-400 animate-pulse">
                              <AlertCircle className="w-2 h-2 mr-0.5" />
                              {post.urgency}
                            </Badge>
                          )}
                        </div>
                        <p className="text-zinc-400 text-xs line-clamp-2">{post.aiSummary || post.content}</p>
                        
                        {/* Affected Assets */}
                        {post.affectedAssets && post.affectedAssets.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.affectedAssets.slice(0, 3).map(asset => (
                              <Badge key={asset} variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-400">
                                {asset}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* ABLE-HF Analysis */}
                        {post.ableAnalysis && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="text-[9px] px-1 py-0 bg-yellow-500/20 text-yellow-400">
                              <Zap className="w-2 h-2 mr-0.5" />
                              {post.ableAnalysis.decision}
                            </Badge>
                            <span className="text-[9px] text-zinc-500">P↑ {post.ableAnalysis.P_up_pct}%</span>
                          </div>
                        )}
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </div>
                ))
              )}
              
              {twitterLastUpdate && twitterPosts.length > 0 && (
                <div className="text-center text-[10px] text-zinc-600 pt-2">
                  Updated: {twitterLastUpdate.toLocaleTimeString('th-TH')}
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
