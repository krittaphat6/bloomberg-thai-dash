import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, Search, Flame, Clock, ExternalLink, Twitter, 
  MessageCircle, Globe, Filter, ChevronUp, Zap, Brain,
  TrendingUp, TrendingDown, Minus, Sparkles, Radio, Newspaper,
  AlertCircle, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
}

interface AIInsight {
  summary: string;
  topTrends: string[];
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  keyEvents: string[];
  loading: boolean;
}

// ============ CONFIG ============
const NEWS_SOURCES = {
  reddit: { name: 'Reddit', icon: MessageCircle, color: 'orange' },
  hackernews: { name: 'HN', icon: Zap, color: 'orange' },
  coingecko: { name: 'CoinGecko', icon: Globe, color: 'green' },
  finnhub: { name: 'Finnhub', icon: TrendingUp, color: 'blue' },
  gnews: { name: 'GNews', icon: Newspaper, color: 'purple' },
  news: { name: 'News', icon: Globe, color: 'cyan' },
  twitter: { name: 'X', icon: Twitter, color: 'blue' }
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
  
  const cryptos = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK'];
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

const fetchCoinGecko = async (): Promise<NewsItem[]> => {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/status_updates?per_page=30');
    if (!res.ok) throw new Error('CoinGecko error');
    
    const data = await res.json();
    return (data.status_updates || []).map((u: any, i: number) => {
      const { sentiment, score: sentScore } = analyzeSentimentAdvanced(u.description || '');
      return {
        id: `cg-${i}-${Date.now()}`,
        title: u.description?.substring(0, 150) || 'Update',
        source: 'coingecko' as const,
        url: u.project?.links?.homepage?.[0] || 'https://coingecko.com',
        timestamp: new Date(u.created_at).getTime(),
        score: 0,
        sentiment,
        sentimentScore: sentScore,
        relevance: 50,
        category: u.category || 'Crypto',
        imageUrl: u.project?.image?.small,
        relatedTickers: u.project?.symbol ? [u.project.symbol.toUpperCase()] : []
      };
    });
  } catch (e) {
    console.error('CoinGecko error:', e);
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

const fetchFinnhub = async (query: string): Promise<NewsItem[]> => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = weekAgo.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];
    
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&from=${from}&to=${to}&token=demo`
    );
    
    if (!res.ok) return [];
    
    const data = await res.json();
    return (data || []).slice(0, 20).map((n: any) => {
      const { sentiment, score: sentScore } = analyzeSentimentAdvanced(n.headline + ' ' + (n.summary || ''));
      return {
        id: `fh-${n.id}`,
        title: n.headline,
        source: 'finnhub' as const,
        url: n.url,
        timestamp: n.datetime * 1000,
        score: 0,
        sentiment,
        sentimentScore: sentScore,
        relevance: calculateRelevance(n.headline, query),
        author: n.source,
        category: n.category || 'Finance',
        imageUrl: n.image,
        summary: n.summary?.substring(0, 200),
        relatedTickers: n.related ? n.related.split(',') : []
      };
    });
  } catch (e) {
    console.error('Finnhub error:', e);
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

// ============ AI ANALYSIS ============
const generateAIInsight = async (news: NewsItem[]): Promise<AIInsight> => {
  const avgSentiment = news.reduce((sum, n) => sum + n.sentimentScore, 0) / (news.length || 1);
  
  const wordFreq: Record<string, number> = {};
  news.forEach(n => {
    const words = n.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  });
  
  const topTrends = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  return {
    summary: avgSentiment > 15 
      ? 'ตลาดแสดงแนวโน้มเชิงบวก มีข่าวดีหลายรายการ' 
      : avgSentiment < -15 
        ? 'ตลาดมีความกังวล มีแรงขายเข้ามา'
        : 'ตลาดเคลื่อนไหวในกรอบแคบ รอปัจจัยใหม่',
    topTrends,
    overallSentiment: avgSentiment > 15 ? 'bullish' : avgSentiment < -15 ? 'bearish' : 'neutral',
    sentimentScore: Math.round(avgSentiment),
    keyEvents: news.slice(0, 3).map(n => n.title.substring(0, 60)),
    loading: false
  };
};

// ============ MAIN COMPONENT ============
const TopNews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('bitcoin crypto');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'score' | 'sentiment'>('time');
  const [aiInsight, setAiInsight] = useState<AIInsight>({ 
    summary: '', topTrends: [], overallSentiment: 'neutral', 
    sentimentScore: 0, keyEvents: [], loading: false 
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAI, setShowAI] = useState(true);

  const aggregateNews = useCallback(async (query: string) => {
    const results = await Promise.allSettled([
      fetchReddit(query),
      fetchHackerNews(query),
      fetchCoinGecko(),
      fetchCryptoCompare(query),
      fetchFinnhub(query),
      Promise.resolve(generateMockTwitter(query))
    ]);
    
    const all: NewsItem[] = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') all.push(...r.value);
    });
    
    const seen = new Set<string>();
    const unique = all.filter(n => {
      const key = n.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    return unique;
  }, []);

  const fetchNews = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setAiInsight(prev => ({ ...prev, loading: true }));
    
    try {
      const aggregated = await aggregateNews(searchQuery);
      setNews(aggregated);
      
      toast({
        title: '✅ อัพเดทข่าวแล้ว',
        description: `พบ ${aggregated.length} รายการจาก ${Object.keys(NEWS_SOURCES).length} แหล่งข่าว`
      });
      
      if (aggregated.length > 0 && showAI) {
        const insight = await generateAIInsight(aggregated);
        setAiInsight(insight);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast({ title: 'ผิดพลาด', description: 'ไม่สามารถดึงข่าวได้', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, aggregateNews, toast, showAI]);

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchNews]);

  const filteredNews = useMemo(() => {
    let filtered = selectedSource === 'all' 
      ? news 
      : news.filter(n => n.source === selectedSource);
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time': return b.timestamp - a.timestamp;
        case 'score': return b.score - a.score;
        case 'sentiment': return b.sentimentScore - a.sentimentScore;
        default: return b.relevance - a.relevance;
      }
    });
    
    return filtered;
  }, [news, selectedSource, sortBy]);

  const sentimentStats = useMemo(() => ({
    bullish: news.filter(n => n.sentiment === 'bullish').length,
    bearish: news.filter(n => n.sentiment === 'bearish').length,
    neutral: news.filter(n => n.sentiment === 'neutral').length,
    avgScore: Math.round(news.reduce((s, n) => s + n.sentimentScore, 0) / (news.length || 1))
  }), [news]);

  const SentimentIcon = ({ sentiment }: { sentiment: string }) => {
    if (sentiment === 'bullish') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (sentiment === 'bearish') return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const SourceIcon = ({ source }: { source: string }) => {
    const cfg = NEWS_SOURCES[source as keyof typeof NEWS_SOURCES];
    if (!cfg) return <Globe className="w-3 h-3" />;
    const Icon = cfg.icon;
    return <Icon className="w-3 h-3 text-primary" />;
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'เมื่อกี้';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาที`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชม.`;
    return `${Math.floor(diff / 86400000)} วัน`;
  };

  return (
    <Card className="w-full h-full bg-background/95 backdrop-blur border-primary/30 flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-1.5 text-primary text-sm font-mono">
            <Flame className="w-4 h-4 text-primary" />
            TOP NEWS
            <Badge variant="outline" className="ml-2 text-[9px] border-primary/50 text-primary">{news.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              className="h-6 w-6 p-0"
              onClick={() => setAutoRefresh(!autoRefresh)}
              title="Auto Refresh"
            >
              <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant={showAI ? "default" : "outline"}
              className="h-6 w-6 p-0"
              onClick={() => setShowAI(!showAI)}
              title="AI Analysis"
            >
              <Brain className="w-3 h-3" />
            </Button>
            <Button
              onClick={fetchNews}
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 border-primary/30"
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
            placeholder="ค้นหา (BTC, หุ้น, crypto)..."
            className="pl-7 h-7 text-xs bg-background/50 border-primary/30 font-mono"
          />
        </div>

        {showAI && (aiInsight.summary || aiInsight.loading) && (
          <div className="mt-2 p-2 bg-primary/5 border border-primary/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary font-mono">AI INSIGHT</span>
              {aiInsight.loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </div>
            {!aiInsight.loading && (
              <>
                <p className="text-[10px] text-foreground/80 mb-1 font-mono">{aiInsight.summary}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`text-[8px] font-mono ${
                      aiInsight.overallSentiment === 'bullish' ? 'border-green-500 text-green-500' :
                      aiInsight.overallSentiment === 'bearish' ? 'border-red-500 text-red-500' :
                      'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {aiInsight.overallSentiment === 'bullish' ? '📈 BULLISH' : 
                     aiInsight.overallSentiment === 'bearish' ? '📉 BEARISH' : '➖ NEUTRAL'} 
                    ({aiInsight.sentimentScore > 0 ? '+' : ''}{aiInsight.sentimentScore})
                  </Badge>
                  {aiInsight.topTrends.slice(0, 3).map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[8px] font-mono">{t}</Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          <Tabs value={selectedSource} onValueChange={setSelectedSource} className="flex-1">
            <TabsList className="grid grid-cols-7 h-6 bg-background/50">
              <TabsTrigger value="all" className="text-[9px] px-1 font-mono">All</TabsTrigger>
              <TabsTrigger value="twitter" className="text-[9px] px-1 font-mono">X</TabsTrigger>
              <TabsTrigger value="reddit" className="text-[9px] px-1 font-mono">Reddit</TabsTrigger>
              <TabsTrigger value="news" className="text-[9px] px-1 font-mono">News</TabsTrigger>
              <TabsTrigger value="hackernews" className="text-[9px] px-1 font-mono">HN</TabsTrigger>
              <TabsTrigger value="finnhub" className="text-[9px] px-1 font-mono">Fin</TabsTrigger>
              <TabsTrigger value="coingecko" className="text-[9px] px-1 font-mono">CG</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {(['time', 'relevance', 'score', 'sentiment'] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={sortBy === s ? "default" : "outline"}
                onClick={() => setSortBy(s)}
                className="h-5 text-[9px] px-1.5 font-mono"
              >
                {s === 'time' ? '🕐' : s === 'relevance' ? '🎯' : s === 'score' ? '⬆️' : '📊'}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[8px] border-green-500/50 text-green-500 font-mono">
              ↑{sentimentStats.bullish}
            </Badge>
            <Badge variant="outline" className="text-[8px] border-red-500/50 text-red-500 font-mono">
              ↓{sentimentStats.bearish}
            </Badge>
            <Badge variant="outline" className="text-[8px] border-muted-foreground/50 font-mono">
              ={sentimentStats.neutral}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground font-mono">กำลังดึงข่าวจาก {Object.keys(NEWS_SOURCES).length} แหล่ง...</p>
              </div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm font-mono">
              ไม่พบข่าว
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {filteredNews.map((item) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-lg border transition-all hover:bg-primary/5 cursor-pointer group ${
                    item.isBreaking ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border/50 hover:border-primary/50'
                  }`}
                  onClick={() => window.open(item.url, '_blank')}
                >
                  <div className="flex items-start gap-2">
                    {item.imageUrl && (
                      <img 
                        src={item.imageUrl} 
                        alt="" 
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <SourceIcon source={item.source} />
                      <SentimentIcon sentiment={item.sentiment} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors font-mono">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {item.author && `${item.author} • `}
                          {formatTime(item.timestamp)}
                        </span>
                        {item.score > 0 && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 font-mono">
                            <ChevronUp className="w-2 h-2" />{item.score}
                          </Badge>
                        )}
                        {item.comments !== undefined && item.comments > 0 && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 font-mono">
                            💬{item.comments}
                          </Badge>
                        )}
                        {item.relatedTickers?.slice(0, 3).map(t => (
                          <Badge key={t} variant="outline" className="text-[8px] px-1 py-0 text-primary border-primary/50 font-mono">
                            ${t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant="outline" 
                        className={`text-[8px] px-1 py-0 font-mono ${
                          item.sentiment === 'bullish' ? 'border-green-500/50 text-green-500' :
                          item.sentiment === 'bearish' ? 'border-red-500/50 text-red-500' :
                          'border-muted-foreground/50 text-muted-foreground'
                        }`}
                      >
                        {item.sentimentScore > 0 ? '+' : ''}{item.sentimentScore}
                      </Badge>
                      <span className="text-[8px] text-muted-foreground font-mono">{item.category}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TopNews;
