import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, Search, Flame, Clock, 
  ExternalLink, Twitter, MessageCircle, Globe, Filter,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NewsItem {
  id: string;
  title: string;
  source: 'twitter' | 'reddit' | 'news';
  url: string;
  timestamp: number;
  score: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relevance: number;
  author?: string;
  upvotes?: number;
  comments?: number;
  category: string;
}

const TopNews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('bitcoin');
  const [selectedSource, setSelectedSource] = useState<'all' | 'twitter' | 'reddit' | 'news'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'score'>('relevance');

  const analyzeSentiment = (text: string): 'bullish' | 'bearish' | 'neutral' => {
    const lowerText = text.toLowerCase();
    
    const bullishWords = [
      'bull', 'bullish', 'moon', 'pump', 'surge', 'rally', 'gain', 'up', 
      'green', 'profit', 'win', 'success', 'high', 'all-time', 'breakout',
      'rocket', '🚀', '📈', 'soar', 'explode', 'parabolic'
    ];
    
    const bearishWords = [
      'bear', 'bearish', 'dump', 'crash', 'fall', 'down', 'loss', 'red',
      'decline', 'drop', 'plunge', 'collapse', 'fail', 'scam', '📉'
    ];

    let bullishCount = 0;
    let bearishCount = 0;

    bullishWords.forEach(word => {
      if (lowerText.includes(word)) bullishCount++;
    });

    bearishWords.forEach(word => {
      if (lowerText.includes(word)) bearishCount++;
    });

    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  };

  const calculateRelevance = (title: string, query: string): number => {
    const lowerTitle = title.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(' ');
    
    let score = 0;

    if (lowerTitle.includes(lowerQuery)) {
      score += 50;
    }

    queryWords.forEach(word => {
      if (lowerTitle.includes(word)) {
        score += 10;
        const position = lowerTitle.indexOf(word);
        score += Math.max(0, 10 - (position / 10));
      }
    });

    score -= title.length / 20;

    return Math.max(0, Math.min(100, score));
  };

  const generateMockTwitterNews = (query: string): NewsItem[] => {
    const mockAccounts = [
      { name: 'CoinDesk' },
      { name: 'Cointelegraph' },
      { name: 'WatcherGuru' },
      { name: 'DocumentBitcoin' },
      { name: 'EricBalchunas' }
    ];

    return mockAccounts.map((account, i) => ({
      id: `twitter-mock-${i}`,
      title: `${account.name}: Latest update on ${query} - Breaking news in crypto markets`,
      source: 'twitter' as const,
      url: `https://twitter.com/${account.name}`,
      timestamp: Date.now() - Math.random() * 3600000 * 24,
      score: Math.floor(Math.random() * 10000),
      sentiment: ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)] as any,
      relevance: 50 + Math.random() * 50,
      author: account.name,
      category: 'Twitter'
    }));
  };

  const aggregateNews = async (query: string) => {
    const allNews: NewsItem[] = [];

    // Reddit
    try {
      const redditResponse = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query + ' finance trading')}&sort=relevance&t=day&limit=15`
      );
      
      if (redditResponse.ok) {
        const redditData = await redditResponse.json();
        const redditPosts = redditData.data.children.map((post: any) => ({
          id: `reddit-${post.data.id}`,
          title: post.data.title,
          source: 'reddit' as const,
          url: `https://reddit.com${post.data.permalink}`,
          timestamp: post.data.created_utc * 1000,
          score: post.data.score,
          sentiment: analyzeSentiment(post.data.title),
          relevance: calculateRelevance(post.data.title, query),
          author: post.data.author,
          upvotes: post.data.ups,
          comments: post.data.num_comments,
          category: post.data.subreddit
        }));
        allNews.push(...redditPosts);
      }
    } catch (error) {
      console.error('Reddit fetch error:', error);
    }

    // Mock Twitter
    allNews.push(...generateMockTwitterNews(query));

    // CryptoCompare News
    try {
      if (query.toLowerCase().includes('btc') || query.toLowerCase().includes('crypto') || query.toLowerCase().includes('bitcoin')) {
        const newsResponse = await fetch(
          `https://min-api.cryptocompare.com/data/v2/news/?lang=EN`
        );
        
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          const newsItems = newsData.Data.slice(0, 15).map((item: any) => ({
            id: `news-${item.id}`,
            title: item.title,
            source: 'news' as const,
            url: item.url,
            timestamp: item.published_on * 1000,
            score: 0,
            sentiment: analyzeSentiment(item.title),
            relevance: calculateRelevance(item.title, query),
            author: item.source,
            category: item.categories || 'General'
          }));
          allNews.push(...newsItems);
        }
      }
    } catch (error) {
      console.error('News API fetch error:', error);
    }

    return allNews;
  };

  const fetchNews = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const aggregatedNews = await aggregateNews(searchQuery);
      
      const uniqueNews = Array.from(
        new Map(aggregatedNews.map(item => [item.title, item])).values()
      );

      setNews(uniqueNews);
      
      toast({
        title: 'Success',
        description: `Found ${uniqueNews.length} news items`
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch news',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredNews = useMemo(() => {
    let filtered = news;

    if (selectedSource !== 'all') {
      filtered = filtered.filter(n => n.source === selectedSource);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevance - a.relevance;
        case 'time':
          return b.timestamp - a.timestamp;
        case 'score':
          return b.score - a.score;
        default:
          return 0;
      }
    });

    return filtered;
  }, [news, selectedSource, sortBy]);

  const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    const colors = {
      bullish: 'bg-green-500/20 text-green-500 border-green-500/50',
      bearish: 'bg-red-500/20 text-red-500 border-red-500/50',
      neutral: 'bg-gray-500/20 text-gray-500 border-gray-500/50'
    };

    return (
      <Badge variant="outline" className={`${colors[sentiment as keyof typeof colors]} text-[9px] px-1 py-0`}>
        {sentiment.toUpperCase()}
      </Badge>
    );
  };

  const SourceIcon = ({ source }: { source: string }) => {
    switch (source) {
      case 'twitter':
        return <Twitter className="w-3 h-3 text-blue-400" />;
      case 'reddit':
        return <MessageCircle className="w-3 h-3 text-orange-500" />;
      default:
        return <Globe className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="w-full h-full bg-card border-primary/30 flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-1.5 text-primary text-sm">
            <Flame className="w-4 h-4" />
            TOP NEWS
          </CardTitle>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
            placeholder="Search topics..."
            className="pl-7 h-7 text-xs bg-black/40 border-primary/30"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 mt-2">
          <Tabs value={selectedSource} onValueChange={(v: any) => setSelectedSource(v)} className="flex-1">
            <TabsList className="grid grid-cols-4 h-6 bg-black/40">
              <TabsTrigger value="all" className="text-[10px] px-1">All</TabsTrigger>
              <TabsTrigger value="twitter" className="text-[10px] px-1">X</TabsTrigger>
              <TabsTrigger value="reddit" className="text-[10px] px-1">Reddit</TabsTrigger>
              <TabsTrigger value="news" className="text-[10px] px-1">News</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortBy(sortBy === 'relevance' ? 'time' : sortBy === 'time' ? 'score' : 'relevance')}
            className="h-6 text-[10px] px-2"
          >
            <Filter className="w-3 h-3 mr-1" />
            {sortBy === 'relevance' ? 'Rel' : sortBy === 'time' ? 'New' : 'Top'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          <div className="text-center p-1 bg-blue-500/10 border border-blue-500/30 rounded">
            <div className="text-[10px] text-blue-400 font-bold">{news.filter(n => n.source === 'twitter').length}</div>
            <div className="text-[8px] text-muted-foreground">X</div>
          </div>
          <div className="text-center p-1 bg-orange-500/10 border border-orange-500/30 rounded">
            <div className="text-[10px] text-orange-400 font-bold">{news.filter(n => n.source === 'reddit').length}</div>
            <div className="text-[8px] text-muted-foreground">Reddit</div>
          </div>
          <div className="text-center p-1 bg-green-500/10 border border-green-500/30 rounded">
            <div className="text-[10px] text-green-400 font-bold">{news.filter(n => n.sentiment === 'bullish').length}</div>
            <div className="text-[8px] text-muted-foreground">Bull</div>
          </div>
          <div className="text-center p-1 bg-red-500/10 border border-red-500/30 rounded">
            <div className="text-[10px] text-red-400 font-bold">{news.filter(n => n.sentiment === 'bearish').length}</div>
            <div className="text-[8px] text-muted-foreground">Bear</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No news found</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredNews.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 border border-primary/20 rounded hover:border-primary/60 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <SourceIcon source={item.source} />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[11px] font-medium text-foreground group-hover:text-primary line-clamp-2 mb-1">
                        {item.title}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 flex-wrap text-[9px] text-muted-foreground">
                        <SentimentBadge sentiment={item.sentiment} />
                        
                        <div className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(item.timestamp).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        
                        {item.upvotes !== undefined && (
                          <div className="flex items-center gap-0.5">
                            <ChevronUp className="w-2.5 h-2.5" />
                            {item.upvotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TopNews;
