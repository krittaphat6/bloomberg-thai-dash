import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, Search, Flame, Clock, ExternalLink, Twitter, 
  MessageCircle, Globe, ChevronUp, Zap, Brain,
  TrendingUp, TrendingDown, Minus, Sparkles, Radio, Newspaper,
  Settings, X, Key, AlertTriangle, Table, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchGoldNews, GoldNewsItem } from '@/services/goldNewsService';
import { 
  hybridAnalyzeNews, 
  setGroqApiKey, 
  hasGroqApiKey, 
  clearGroqApiKey 
} from '@/services/llmAnalysisService';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  reddit: { name: 'Reddit', icon: MessageCircle, color: 'text-orange-500' },
  hackernews: { name: 'HN', icon: Zap, color: 'text-amber-400' },
  coingecko: { name: 'CoinGecko', icon: Globe, color: 'text-green-400' },
  finnhub: { name: 'Finnhub', icon: TrendingUp, color: 'text-blue-400' },
  gnews: { name: 'GNews', icon: Newspaper, color: 'text-cyan-400' },
  news: { name: 'News', icon: Globe, color: 'text-cyan-400' },
  twitter: { name: 'X', icon: Twitter, color: 'text-blue-400' }
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
const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  const config = {
    bullish: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
    bearish: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
    neutral: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' }
  };
  
  const style = config[sentiment as keyof typeof config] || config.neutral;
  
  return (
    <span className={`${style.bg} ${style.text} ${style.border} border text-[10px] px-2 py-0.5 rounded font-mono`}>
      {sentiment.toUpperCase()}
    </span>
  );
};

const SourceIcon = ({ source }: { source: string }) => {
  const cfg = NEWS_SOURCES[source as keyof typeof NEWS_SOURCES];
  if (!cfg) return <Globe className="w-3 h-3 text-gray-400" />;
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
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

    const fetchers = await Promise.allSettled([
      fetchReddit(query),
      fetchHackerNews(query),
      fetchCryptoCompare(query),
      Promise.resolve(generateMockTwitter(query))
    ]);

    fetchers.forEach(r => {
      if (r.status === 'fulfilled') results.push(...r.value);
    });

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
    setError(null);
    
    try {
      const aggregated = await aggregateNews(searchQuery, selectedView);
      setLastUpdate(new Date());
      
      toast({
        title: '✅ อัพเดทข่าวแล้ว',
        description: `พบ ${aggregated.length} รายการ`
      });

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
    } catch (e: any) {
      console.error('Fetch error:', e);
      setError(e.message || 'Failed to fetch news');
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

  // News List Content
  const NewsListContent = () => (
    <ScrollArea className="h-full">
      <div className="space-y-2 pr-2">
        {filteredNews.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 rounded border border-border/30 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-2">
              <SourceIcon source={item.source} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground leading-tight line-clamp-2">
                  {item.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
                  <SentimentBadge sentiment={item.sentiment} />
                  {item.relatedTickers && item.relatedTickers.length > 0 && (
                    <span className="text-[10px] text-amber-400">${item.relatedTickers[0]}</span>
                  )}
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </ScrollArea>
  );

  // Stats Content
  const StatsContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded border border-green-500/30 bg-green-500/10">
          <div className="text-[10px] text-muted-foreground">Bullish</div>
          <div className="text-lg font-bold text-green-400">{sentimentStats.bullish}</div>
        </div>
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10">
          <div className="text-[10px] text-muted-foreground">Bearish</div>
          <div className="text-lg font-bold text-red-400">{sentimentStats.bearish}</div>
        </div>
        <div className="p-3 rounded border border-gray-500/30 bg-gray-500/10">
          <div className="text-[10px] text-muted-foreground">Neutral</div>
          <div className="text-lg font-bold text-gray-400">{sentimentStats.neutral}</div>
        </div>
        <div className="p-3 rounded border border-cyan-500/30 bg-cyan-500/10">
          <div className="text-[10px] text-muted-foreground">AI Analyzed</div>
          <div className="text-lg font-bold text-cyan-400">{sentimentStats.aiAnalyzed}</div>
        </div>
      </div>
    </div>
  );

  return (
    <COTStyleWrapper
      title="TOP NEWS AGGREGATOR"
      icon="🔥"
      lastUpdate={lastUpdate}
      selectOptions={[
        { value: 'all', label: '🌐 All News' },
        { value: 'gold', label: '🥇 Gold & Commodities' },
        { value: 'crypto', label: '₿ Crypto' },
        { value: 'forex', label: '💱 Forex' }
      ]}
      selectedValue={selectedView}
      onSelectChange={(v) => setSelectedView(v as any)}
      onRefresh={fetchNews}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'news',
          label: 'News Feed',
          icon: <Newspaper className="w-3 h-3" />,
          content: <NewsListContent />
        },
        {
          id: 'stats',
          label: 'Stats',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <StatsContent />
        }
      ]}
      footerLeft={`Total: ${filteredNews.length} items`}
      footerStats={[
        { label: '📈 Bullish', value: sentimentStats.bullish },
        { label: '📉 Bearish', value: sentimentStats.bearish }
      ]}
      footerRight={hasLLM ? '🤖 AI Active' : ''}
    />
  );
};

export default TopNews;
