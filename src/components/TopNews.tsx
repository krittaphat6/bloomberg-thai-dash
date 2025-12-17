import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, Search, Flame, Clock, ExternalLink, Twitter, 
  MessageCircle, Globe, ChevronUp, Zap, Brain,
  TrendingUp, TrendingDown, Minus, Sparkles, Radio, Newspaper,
  Settings, X, Key, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchGoldNews, GoldNewsItem } from '@/services/goldNewsService';
import { 
  hybridAnalyzeNews, 
  setGroqApiKey, 
  hasGroqApiKey, 
  clearGroqApiKey 
} from '@/services/llmAnalysisService';

// ============ TYPES ============
interface NewsItem {
  id: string;
  title: string;
  source: 'twitter' | 'reddit' | 'news' | 'hackernews' | 'coingecko' | 'finnhub' | 'gnews';
  url: string;
  timestamp: number;
  score: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  relevance: number;
  author?: string;
  upvotes?: number;
  comments?: number;
  category: string;
  summary?: string;
  imageUrl?: string;
  isBreaking?: boolean;
  relatedTickers?: string[];
  // Hybrid analysis fields
  algoSentiment?: 'bullish' | 'bearish' | 'neutral';
  algoRelevance?: number;
  llmSentiment?: 'bullish' | 'bearish' | 'neutral';
  llmConfidence?: number;
  llmImpact?: 'high' | 'medium' | 'low';
  llmSummary?: string;
  isLLMAnalyzed?: boolean;
  finalScore?: number;
}

// ============ CONFIG ============
const NEWS_SOURCES = {
  reddit: { name: 'Reddit', icon: MessageCircle, color: 'text-terminal-orange' },
  hackernews: { name: 'HN', icon: Zap, color: 'text-terminal-amber' },
  coingecko: { name: 'CoinGecko', icon: Globe, color: 'text-terminal-green' },
  finnhub: { name: 'Finnhub', icon: TrendingUp, color: 'text-terminal-blue' },
  gnews: { name: 'GNews', icon: Newspaper, color: 'text-terminal-cyan' },
  news: { name: 'News', icon: Globe, color: 'text-terminal-cyan' },
  twitter: { name: 'X', icon: Twitter, color: 'text-terminal-blue' }
};

// ============ SENTIMENT ANALYSIS ============
const SENTIMENT_WEIGHTS = {
  bullish: {
    strong: ['moon', 'rocket', 'parabolic', 'explosive', 'soaring', 'skyrocket', 'breakthrough', 'all-time high', 'ath', '🚀', '💎', '🔥'],
    medium: ['bull', 'bullish', 'surge', 'rally', 'gain', 'profit', 'green', 'pump', 'breakout', 'uptrend', 'buy', 'long', '📈'],
    weak: ['up', 'rise', 'positive', 'growth', 'increase', 'higher', 'support', 'recovery']
  },
  bearish: {
    strong: ['crash', 'collapse', 'plunge', 'dump', 'disaster', 'bankrupt', 'fraud', 'scam', 'rug', '💀', '🔴'],
    medium: ['bear', 'bearish', 'fall', 'drop', 'loss', 'red', 'sell', 'short', 'decline', 'correction', '📉'],
    weak: ['down', 'lower', 'decrease', 'weakness', 'resistance', 'concern', 'risk', 'warning']
  }
};

const analyzeSentimentAdvanced = (text: string): { sentiment: 'bullish' | 'bearish' | 'neutral', score: number } => {
  const lower = text.toLowerCase();
  let score = 0;
  
  SENTIMENT_WEIGHTS.bullish.strong.forEach(w => { if (lower.includes(w)) score += 15; });
  SENTIMENT_WEIGHTS.bearish.strong.forEach(w => { if (lower.includes(w)) score -= 15; });
  SENTIMENT_WEIGHTS.bullish.medium.forEach(w => { if (lower.includes(w)) score += 8; });
  SENTIMENT_WEIGHTS.bearish.medium.forEach(w => { if (lower.includes(w)) score -= 8; });
  SENTIMENT_WEIGHTS.bullish.weak.forEach(w => { if (lower.includes(w)) score += 3; });
  SENTIMENT_WEIGHTS.bearish.weak.forEach(w => { if (lower.includes(w)) score -= 3; });
  
  score = Math.max(-100, Math.min(100, score));
  const sentiment = score > 15 ? 'bullish' : score < -15 ? 'bearish' : 'neutral';
  return { sentiment, score };
};

const calculateRelevance = (title: string, query: string): number => {
  const lower = title.toLowerCase();
  const q = query.toLowerCase();
  const words = q.split(' ').filter(w => w.length > 2);
  
  let score = 0;
  if (lower.includes(q)) score += 50;
  words.forEach(w => { if (lower.includes(w)) score += 15; });
  if (lower.includes('breaking') || lower.includes('just in')) score += 20;
  if (lower.includes('update') || lower.includes('latest')) score += 10;
  
  return Math.min(100, Math.max(0, score));
};

const extractTickers = (text: string): string[] => {
  const tickers: string[] = [];
  const matches = text.match(/\$[A-Z]{2,5}/g) || [];
  matches.forEach(m => tickers.push(m.replace('$', '')));
  
  const cryptos = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'XAU', 'XAG'];
  cryptos.forEach(c => { if (text.toUpperCase().includes(c)) tickers.push(c); });
  
  return [...new Set(tickers)].slice(0, 5);
};

// ============ NEWS FETCHERS ============
const fetchReddit = async (query: string): Promise<NewsItem[]> => {
  try {
    const subs = ['cryptocurrency', 'bitcoin', 'wallstreetbets', 'stocks', 'investing', 'CryptoMarkets'];
    const subQuery = subs.map(s => `subreddit:${s}`).join(' OR ');
    
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' ' + subQuery)}&sort=hot&t=day&limit=25`
    );
    if (!res.ok) throw new Error('Reddit API error');
    
    const data = await res.json();
    return data.data.children.map((p: any) => {
      const { sentiment, score: sentScore } = analyzeSentimentAdvanced(p.data.title);
      return {
        id: `reddit-${p.data.id}`,
        title: p.data.title,
        source: 'reddit' as const,
        url: `https://reddit.com${p.data.permalink}`,
        timestamp: p.data.created_utc * 1000,
        score: p.data.score,
        sentiment,
        sentimentScore: sentScore,
        relevance: calculateRelevance(p.data.title, query),
        author: p.data.author,
        upvotes: p.data.ups,
        comments: p.data.num_comments,
        category: p.data.subreddit,
        relatedTickers: extractTickers(p.data.title)
      };
    });
  } catch (e) {
    console.error('Reddit error:', e);
    return [];
  }
};

const fetchHackerNews = async (query: string): Promise<NewsItem[]> => {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`
    );
    if (!res.ok) throw new Error('HN API error');
    
    const data = await res.json();
    return data.hits.map((h: any) => {
      const { sentiment, score: sentScore } = analyzeSentimentAdvanced(h.title || '');
      return {
        id: `hn-${h.objectID}`,
        title: h.title || 'No title',
        source: 'hackernews' as const,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        timestamp: new Date(h.created_at).getTime(),
        score: h.points || 0,
        sentiment,
        sentimentScore: sentScore,
        relevance: calculateRelevance(h.title || '', query),
        author: h.author,
        comments: h.num_comments,
        category: 'Tech',
        relatedTickers: extractTickers(h.title || '')
      };
    });
  } catch (e) {
    console.error('HN error:', e);
    return [];
  }
};

const fetchCryptoCompare = async (query: string): Promise<NewsItem[]> => {
  try {
    const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular');
    if (!res.ok) throw new Error('CryptoCompare error');
    
    const data = await res.json();
    return (data.Data || []).slice(0, 25).map((n: any) => {
      const { sentiment, score: sentScore } = analyzeSentimentAdvanced(n.title + ' ' + (n.body || ''));
      return {
        id: `cc-${n.id}`,
        title: n.title,
        source: 'news' as const,
        url: n.url,
        timestamp: n.published_on * 1000,
        score: 0,
        sentiment,
        sentimentScore: sentScore,
        relevance: calculateRelevance(n.title, query),
        author: n.source,
        category: n.categories || 'Crypto',
        imageUrl: n.imageurl,
        summary: n.body?.substring(0, 200),
        relatedTickers: extractTickers(n.title + ' ' + (n.body || ''))
      };
    });
  } catch (e) {
    console.error('CryptoCompare error:', e);
    return [];
  }
};

const generateMockTwitter = (query: string): NewsItem[] => {
  const accounts = [
    { name: 'CoinDesk', handle: 'coindesk' },
    { name: 'Cointelegraph', handle: 'cointelegraph' },
    { name: 'WatcherGuru', handle: 'WatcherGuru' },
    { name: 'whale_alert', handle: 'whale_alert' },
    { name: 'BitcoinMagazine', handle: 'BitcoinMagazine' },
    { name: 'glassnode', handle: 'glassnode' }
  ];
  
  const templates = [
    `BREAKING: ${query} sees major institutional inflow`,
    `${query} trading volume hits new highs amid market rally`,
    `Analysts predict ${query} could reach new levels`,
    `Major development in ${query} ecosystem announced`,
    `${query} whale moves $50M to exchange`,
    `${query} network upgrade successfully completed`
  ];
  
  return accounts.map((acc, i) => {
    const title = templates[i % templates.length];
    const { sentiment, score: sentScore } = analyzeSentimentAdvanced(title);
    return {
      id: `tw-${i}-${Date.now()}`,
      title: `@${acc.handle}: ${title}`,
      source: 'twitter' as const,
      url: `https://twitter.com/${acc.handle}`,
      timestamp: Date.now() - Math.random() * 3600000 * 12,
      score: Math.floor(Math.random() * 5000) + 100,
      sentiment,
      sentimentScore: sentScore,
      relevance: 60 + Math.random() * 30,
      author: acc.name,
      category: 'Twitter',
      relatedTickers: extractTickers(title)
    };
  });
};

// ============ COMPONENTS ============
const SentimentBadge = ({ sentiment, confidence }: { sentiment: string; confidence?: number }) => {
  const config = {
    bullish: { bg: 'bg-terminal-green/20', text: 'text-terminal-green', border: 'border-terminal-green/50' },
    bearish: { bg: 'bg-terminal-red/20', text: 'text-terminal-red', border: 'border-terminal-red/50' },
    neutral: { bg: 'bg-terminal-gray/20', text: 'text-terminal-gray', border: 'border-terminal-gray/50' }
  };
  
  const style = config[sentiment as keyof typeof config] || config.neutral;
  
  return (
    <span className={`${style.bg} ${style.text} ${style.border} border text-[10px] px-2 py-0.5 rounded font-mono`}>
      {sentiment.toUpperCase()}
      {confidence !== undefined && <span className="ml-1 opacity-70">({Math.round(confidence * 100)}%)</span>}
    </span>
  );
};

const SourceIcon = ({ source }: { source: string }) => {
  const cfg = NEWS_SOURCES[source as keyof typeof NEWS_SOURCES];
  if (!cfg) return <Globe className="w-3 h-3 text-terminal-gray" />;
  const Icon = cfg.icon;
  return <Icon className={`w-3 h-3 ${cfg.color}`} />;
};

const formatTimeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
};

// ============ MAIN COMPONENT ============
const TopNews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('bitcoin crypto');
  const [selectedView, setSelectedView] = useState<'all' | 'gold' | 'crypto' | 'forex'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'score' | 'sentiment'>('time');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasLLM, setHasLLM] = useState(hasGroqApiKey());

  // Stats
  const sentimentStats = useMemo(() => {
    const bullish = news.filter(n => n.sentiment === 'bullish' || n.llmSentiment === 'bullish').length;
    const bearish = news.filter(n => n.sentiment === 'bearish' || n.llmSentiment === 'bearish').length;
    const neutral = news.length - bullish - bearish;
    const aiAnalyzed = news.filter(n => n.isLLMAnalyzed).length;
    return { bullish, bearish, neutral, aiAnalyzed };
  }, [news]);

  const aggregateNews = useCallback(async (query: string, view: string) => {
    const results: NewsItem[] = [];

    if (view === 'gold') {
      // Fetch gold-specific news
      const goldNews = await fetchGoldNews();
      const converted: NewsItem[] = goldNews.map((g: GoldNewsItem) => ({
        id: g.id,
        title: g.title,
        source: g.source as NewsItem['source'],
        url: g.url,
        timestamp: g.timestamp,
        score: 0,
        sentiment: g.sentiment,
        sentimentScore: g.sentiment === 'bullish' ? 50 : g.sentiment === 'bearish' ? -50 : 0,
        relevance: g.relevance,
        author: g.author,
        category: g.category,
        relatedTickers: ['XAU']
      }));
      return converted;
    }

    // Regular news aggregation
    const fetchers = await Promise.allSettled([
      fetchReddit(query),
      fetchHackerNews(query),
      fetchCryptoCompare(query),
      Promise.resolve(generateMockTwitter(query))
    ]);

    fetchers.forEach(r => {
      if (r.status === 'fulfilled') results.push(...r.value);
    });

    // Remove duplicates
    const seen = new Set<string>();
    const unique = results.filter(n => {
      const key = n.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique;
  }, []);

  const fetchNews = useCallback(async () => {
    if (!searchQuery.trim() && selectedView !== 'gold') return;
    
    setLoading(true);
    
    try {
      const aggregated = await aggregateNews(searchQuery, selectedView);
      
      toast({
        title: '✅ อัพเดทข่าวแล้ว',
        description: `พบ ${aggregated.length} รายการ`
      });

      // Apply hybrid analysis if LLM is available
      if (hasLLM) {
        setLlmLoading(true);
        try {
          const analyzed = await hybridAnalyzeNews(aggregated, searchQuery, true);
          setNews(analyzed as NewsItem[]);
        } catch (e) {
          console.error('Hybrid analysis error:', e);
          setNews(aggregated);
        } finally {
          setLlmLoading(false);
        }
      } else {
        setNews(aggregated);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถดึงข่าวได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedView, aggregateNews, toast, hasLLM]);

  useEffect(() => {
    fetchNews();
  }, [selectedView]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchNews]);

  const filteredNews = useMemo(() => {
    let filtered = [...news];
    
    // Filter by view/category
    if (selectedView === 'crypto') {
      filtered = filtered.filter(n => 
        n.category?.toLowerCase().includes('crypto') || 
        n.relatedTickers?.some(t => ['BTC', 'ETH', 'SOL', 'XRP'].includes(t))
      );
    } else if (selectedView === 'forex') {
      filtered = filtered.filter(n => 
        n.category?.toLowerCase().includes('forex') ||
        n.title.toLowerCase().includes('usd') ||
        n.title.toLowerCase().includes('dollar')
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time': return b.timestamp - a.timestamp;
        case 'score': return (b.finalScore || b.score) - (a.finalScore || a.score);
        case 'sentiment': return b.sentimentScore - a.sentimentScore;
        default: return (b.finalScore || b.relevance) - (a.finalScore || a.relevance);
      }
    });
    
    return filtered;
  }, [news, selectedView, sortBy]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setGroqApiKey(apiKeyInput.trim());
      setHasLLM(true);
      setApiKeyInput('');
      setShowSettings(false);
      toast({ title: '✅ บันทึก API Key แล้ว', description: 'ระบบ AI Analysis พร้อมใช้งาน' });
    }
  };

  const handleClearApiKey = () => {
    clearGroqApiKey();
    setHasLLM(false);
    toast({ title: 'ลบ API Key แล้ว', description: 'ใช้ Algorithm Analysis เท่านั้น' });
  };

  return (
    <div className="terminal-panel h-full flex flex-col text-[0.5rem] xs:text-[0.6rem] sm:text-xs md:text-sm">
      {/* Header */}
      <div className="panel-header flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-terminal-amber" />
          <span className="text-terminal-amber font-bold text-xs sm:text-sm font-mono">TOP NEWS AGGREGATOR</span>
          {hasLLM && (
            <span className="text-[8px] bg-terminal-cyan/20 text-terminal-cyan px-1.5 py-0.5 rounded font-mono">
              AI
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="bg-background border border-border text-terminal-green text-[10px] sm:text-xs px-2 py-1 font-mono"
          >
            <option value="all">All News</option>
            <option value="gold">🥇 Gold & Commodities</option>
            <option value="crypto">₿ Crypto</option>
            <option value="forex">💱 Forex</option>
          </select>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-background/50 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-3 h-3 text-terminal-gray hover:text-terminal-amber" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-background/95 border-b border-terminal-cyan/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Key className="w-3 h-3 text-terminal-amber" />
              <span className="text-terminal-amber text-xs font-bold font-mono">Groq API (LLM Analysis)</span>
            </div>
            <button onClick={() => setShowSettings(false)}>
              <X className="w-3 h-3 text-terminal-gray hover:text-terminal-red" />
            </button>
          </div>
          
          {hasLLM ? (
            <div className="flex items-center gap-2">
              <span className="text-terminal-green text-[10px] font-mono">✓ API Key configured</span>
              <button
                onClick={handleClearApiKey}
                className="bg-terminal-red/20 border border-terminal-red/50 text-terminal-red text-[10px] px-2 py-0.5 rounded font-mono hover:bg-terminal-red/30"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-terminal-gray text-[10px] font-mono">
                Get free API key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-terminal-cyan underline">console.groq.com</a>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="gsk_xxxxxxxx..."
                  className="flex-1 bg-background border border-border text-terminal-white text-[10px] px-2 py-1 font-mono"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="bg-terminal-green/20 border border-terminal-green/50 text-terminal-green text-[10px] px-3 py-1 rounded font-mono hover:bg-terminal-green/30"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Summary Row */}
      <div className="grid grid-cols-4 gap-2 p-2 border-b border-border/50">
        <div className="bg-background/30 p-2 rounded">
          <div className="text-[10px] text-terminal-amber mb-0.5 font-mono">Total</div>
          <div className="text-sm sm:text-lg text-terminal-white font-bold font-mono">{news.length}</div>
        </div>
        <div className="bg-background/30 p-2 rounded">
          <div className="text-[10px] text-terminal-amber mb-0.5 font-mono">Bullish</div>
          <div className="text-sm sm:text-lg text-terminal-green font-bold font-mono">{sentimentStats.bullish}</div>
        </div>
        <div className="bg-background/30 p-2 rounded">
          <div className="text-[10px] text-terminal-amber mb-0.5 font-mono">Bearish</div>
          <div className="text-sm sm:text-lg text-terminal-red font-bold font-mono">{sentimentStats.bearish}</div>
        </div>
        <div className="bg-background/30 p-2 rounded">
          <div className="text-[10px] text-terminal-amber mb-0.5 font-mono">AI Analyzed</div>
          <div className="text-sm sm:text-lg text-terminal-cyan font-bold font-mono">
            {llmLoading ? <Sparkles className="w-4 h-4 animate-pulse" /> : sentimentStats.aiAnalyzed}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 p-2 border-b border-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-terminal-gray" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
            placeholder="Search news..."
            className="w-full bg-background border border-border text-terminal-white text-[10px] sm:text-xs pl-7 pr-2 py-1.5 font-mono"
          />
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`p-1.5 border rounded transition-colors ${
            autoRefresh 
              ? 'bg-terminal-green/20 border-terminal-green/50 text-terminal-green' 
              : 'bg-background border-border text-terminal-gray'
          }`}
          title="Auto Refresh"
        >
          <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
        </button>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="bg-terminal-amber/20 border border-terminal-amber/50 text-terminal-amber p-1.5 rounded hover:bg-terminal-amber/30 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sort Buttons */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <div className="flex gap-1">
          {(['time', 'relevance', 'score', 'sentiment'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                sortBy === s 
                  ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50' 
                  : 'text-terminal-gray hover:text-terminal-white'
              }`}
            >
              {s === 'time' ? '🕐 Time' : s === 'relevance' ? '🎯 Relevance' : s === 'score' ? '⬆️ Score' : '📊 Sentiment'}
            </button>
          ))}
        </div>
        {hasLLM && (
          <div className="flex items-center gap-1 text-[9px] text-terminal-cyan font-mono">
            <Brain className="w-3 h-3" />
            <span>Hybrid AI</span>
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 text-[9px] sm:text-[10px] text-terminal-amber border-b border-border p-2 font-mono">
        <div className="col-span-1">Src</div>
        <div className="col-span-5">Headline</div>
        <div className="col-span-2 text-center">Sentiment</div>
        <div className="col-span-2 text-center">{hasLLM ? 'AI Score' : 'Score'}</div>
        <div className="col-span-2 text-right">Time</div>
      </div>

      {/* News List */}
      <ScrollArea className="flex-1">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-terminal-amber mx-auto mb-2" />
              <p className="text-[10px] text-terminal-gray font-mono">กำลังดึงข่าว...</p>
            </div>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-terminal-gray text-xs font-mono">
            ไม่พบข่าว
          </div>
        ) : (
          <div>
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 text-[10px] sm:text-xs py-2 px-2 border-b border-border/20 hover:bg-background/50 cursor-pointer transition-colors group"
                onClick={() => window.open(item.url, '_blank')}
              >
                {/* Source */}
                <div className="col-span-1 flex items-center justify-center">
                  <SourceIcon source={item.source} />
                </div>

                {/* Headline */}
                <div className="col-span-5 min-w-0">
                  <p className="text-terminal-white font-mono truncate group-hover:text-terminal-cyan transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {item.author && (
                      <span className="text-[8px] text-terminal-gray font-mono">{item.author}</span>
                    )}
                    {item.isLLMAnalyzed && item.llmSummary && (
                      <span className="text-[8px] text-terminal-cyan font-mono ml-1" title={item.llmSummary}>
                        💡
                      </span>
                    )}
                    {item.relatedTickers?.slice(0, 2).map(t => (
                      <span key={t} className="text-[8px] text-terminal-amber font-mono">${t}</span>
                    ))}
                  </div>
                </div>

                {/* Sentiment */}
                <div className="col-span-2 flex items-center justify-center">
                  <SentimentBadge 
                    sentiment={item.llmSentiment || item.sentiment} 
                    confidence={item.llmConfidence}
                  />
                </div>

                {/* Score */}
                <div className="col-span-2 flex items-center justify-center">
                  {item.isLLMAnalyzed ? (
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-terminal-cyan" />
                      <span className="text-terminal-cyan font-mono font-bold">
                        {item.finalScore || item.llmConfidence ? Math.round((item.llmConfidence || 0) * 100) : '-'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-terminal-gray font-mono">
                      {item.score > 0 ? item.score : item.relevance || '-'}
                    </span>
                  )}
                </div>

                {/* Time */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <span className="text-terminal-gray font-mono">{formatTimeAgo(item.timestamp)}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-terminal-gray opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* LLM Loading Indicator */}
      {llmLoading && (
        <div className="flex items-center justify-center gap-2 p-2 bg-terminal-cyan/10 border-t border-terminal-cyan/30">
          <Brain className="w-3 h-3 text-terminal-cyan animate-pulse" />
          <span className="text-[10px] text-terminal-cyan font-mono">กำลังวิเคราะห์ด้วย AI...</span>
        </div>
      )}
    </div>
  );
};

export default TopNews;
