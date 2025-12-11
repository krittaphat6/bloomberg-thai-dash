import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, Search, Flame, Clock, ExternalLink, 
  Twitter, Globe, ChevronUp, Languages,
  TrendingUp, TrendingDown, Zap, Brain, Target,
  MessageCircle, Newspaper, Link2, ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { advancedNewsService, ProcessedNews } from '@/services/AdvancedNewsService';

const TopNews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [news, setNews] = useState<ProcessedNews[]>([]);
  const [searchQuery, setSearchQuery] = useState('bitcoin');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'time' | 'quality'>('relevance');
  const [enableTranslation, setEnableTranslation] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [selectedSources] = useState(['reddit', 'crypto', 'finnhub']);

  // Fetch news using advanced service
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
      let articles = await advancedNewsService.aggregateNews(searchQuery, selectedSources);
      
      // Translate if enabled
      if (enableTranslation) {
        setTranslating(true);
        articles = await advancedNewsService.translateToThai(articles);
        setTranslating(false);
      }
      
      setNews(articles);
      
      toast({
        title: '✅ สำเร็จ',
        description: `พบข่าว ${articles.length} รายการ`,
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

  // Re-translate when toggle changes
  useEffect(() => {
    if (news.length > 0 && enableTranslation && !news[0]?.isTranslated) {
      const translateExisting = async () => {
        setTranslating(true);
        const translated = await advancedNewsService.translateToThai(news);
        setNews(translated);
        setTranslating(false);
      };
      translateExisting();
    }
  }, [enableTranslation]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchNews();
  }, []);

  // Filter and sort news
  const filteredNews = useMemo(() => {
    let filtered = [...news];

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(n => n.source === selectedSource);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'time':
          return b.timestamp - a.timestamp;
        case 'quality':
          return b.qualityScore - a.qualityScore;
        default:
          return 0;
      }
    });

    return filtered;
  }, [news, selectedSource, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    reddit: news.filter(n => n.source === 'reddit').length,
    crypto: news.filter(n => n.source === 'crypto').length,
    api: news.filter(n => n.source === 'api').length,
    bullish: news.filter(n => n.sentiment === 'bullish').length,
    bearish: news.filter(n => n.sentiment === 'bearish').length,
    avgQuality: news.length > 0 
      ? Math.round(news.reduce((sum, n) => sum + n.qualityScore, 0) / news.length)
      : 0
  }), [news]);

  const SentimentBadge = ({ sentiment, score }: { sentiment: string; score: number }) => {
    if (sentiment === 'bullish') {
      return (
        <Badge className="bg-terminal-green/20 text-terminal-green border-terminal-green/50 text-[8px] px-1.5 py-0 gap-0.5">
          <TrendingUp className="w-2.5 h-2.5" />
          ขาขึ้น
        </Badge>
      );
    }
    if (sentiment === 'bearish') {
      return (
        <Badge className="bg-terminal-red/20 text-terminal-red border-terminal-red/50 text-[8px] px-1.5 py-0 gap-0.5">
          <TrendingDown className="w-2.5 h-2.5" />
          ขาลง
        </Badge>
      );
    }
    return (
      <Badge className="bg-terminal-gray/20 text-terminal-gray border-terminal-gray/50 text-[8px] px-1.5 py-0">
        กลาง
      </Badge>
    );
  };

  const SourceIcon = ({ source }: { source: string }) => {
    switch (source) {
      case 'twitter':
        return <Twitter className="w-4 h-4 text-blue-400" />;
      case 'reddit':
        return <MessageCircle className="w-4 h-4 text-terminal-orange" />;
      case 'crypto':
        return <Zap className="w-4 h-4 text-terminal-yellow" />;
      case 'api':
        return <Newspaper className="w-4 h-4 text-terminal-cyan" />;
      default:
        return <Globe className="w-4 h-4 text-terminal-gray" />;
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'reddit': return 'Reddit';
      case 'crypto': return 'Crypto';
      case 'api': return 'News';
      case 'twitter': return 'Twitter';
      default: return source;
    }
  };

  return (
    <Card className="w-full h-full bg-black border-terminal-amber/40 flex flex-col overflow-hidden">
      {/* Header with terminal style */}
      <CardHeader className="pb-2 px-3 pt-2 border-b border-terminal-amber/30 bg-bloomberg-header">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-terminal-amber/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-terminal-amber" />
            </div>
            <div>
              <CardTitle className="text-terminal-amber text-xs font-bold tracking-wider">
                📰 TOP NEWS AGGREGATOR
              </CardTitle>
              <p className="text-[9px] text-terminal-gray">
                AI-Powered • Multi-Source • แปลไทยอัตโนมัติ
              </p>
            </div>
          </div>

          <Button
            onClick={fetchNews}
            size="sm"
            variant="outline"
            className="h-7 px-2 border-terminal-amber/50 text-terminal-amber hover:bg-terminal-amber/20"
            disabled={loading || translating}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading || translating ? 'animate-spin' : ''}`} />
            {loading ? 'กำลังโหลด...' : translating ? 'กำลังแปล...' : 'รีเฟรช'}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-terminal-amber" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
            placeholder="ค้นหา: bitcoin, ethereum, stocks..."
            className="pl-7 bg-black border-terminal-amber/30 text-terminal-white h-8 text-xs placeholder:text-terminal-gray focus:border-terminal-amber"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <Tabs value={selectedSource} onValueChange={setSelectedSource} className="flex-1">
            <TabsList className="grid grid-cols-4 h-7 bg-black border border-terminal-amber/30 p-0.5">
              <TabsTrigger value="all" className="text-[9px] data-[state=active]:bg-terminal-amber/20 data-[state=active]:text-terminal-amber">
                ทั้งหมด
              </TabsTrigger>
              <TabsTrigger value="reddit" className="text-[9px] data-[state=active]:bg-terminal-orange/20 data-[state=active]:text-terminal-orange">
                Reddit
              </TabsTrigger>
              <TabsTrigger value="crypto" className="text-[9px] data-[state=active]:bg-terminal-yellow/20 data-[state=active]:text-terminal-yellow">
                Crypto
              </TabsTrigger>
              <TabsTrigger value="api" className="text-[9px] data-[state=active]:bg-terminal-cyan/20 data-[state=active]:text-terminal-cyan">
                News
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortBy(sortBy === 'relevance' ? 'time' : sortBy === 'time' ? 'quality' : 'relevance')}
            className="h-7 text-[9px] px-2 border-terminal-amber/30 text-terminal-amber"
          >
            {sortBy === 'relevance' ? <Target className="w-3 h-3 mr-1" /> :
             sortBy === 'time' ? <Clock className="w-3 h-3 mr-1" /> :
             <Flame className="w-3 h-3 mr-1" />}
            {sortBy === 'relevance' ? 'เกี่ยวข้อง' : sortBy === 'time' ? 'ล่าสุด' : 'คุณภาพ'}
          </Button>
        </div>

        {/* Translation Toggle - Terminal Style */}
        <div className="flex items-center justify-between mt-2 p-2 bg-terminal-amber/5 rounded border border-terminal-amber/20">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-terminal-amber" />
            <Label htmlFor="translate" className="text-[10px] text-terminal-white cursor-pointer">
              🇹🇭 แปลภาษาไทยอัตโนมัติ
            </Label>
          </div>
          <Switch
            id="translate"
            checked={enableTranslation}
            onCheckedChange={setEnableTranslation}
            className="data-[state=checked]:bg-terminal-amber"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-1 mt-2">
          <div className="text-center p-1.5 bg-terminal-orange/10 border border-terminal-orange/30 rounded">
            <div className="text-xs text-terminal-orange font-bold">{stats.reddit}</div>
            <div className="text-[7px] text-terminal-gray">Reddit</div>
          </div>
          <div className="text-center p-1.5 bg-terminal-yellow/10 border border-terminal-yellow/30 rounded">
            <div className="text-xs text-terminal-yellow font-bold">{stats.crypto}</div>
            <div className="text-[7px] text-terminal-gray">Crypto</div>
          </div>
          <div className="text-center p-1.5 bg-terminal-cyan/10 border border-terminal-cyan/30 rounded">
            <div className="text-xs text-terminal-cyan font-bold">{stats.api}</div>
            <div className="text-[7px] text-terminal-gray">News</div>
          </div>
          <div className="text-center p-1.5 bg-terminal-green/10 border border-terminal-green/30 rounded">
            <div className="text-xs text-terminal-green font-bold">{stats.bullish}</div>
            <div className="text-[7px] text-terminal-gray">ขาขึ้น</div>
          </div>
          <div className="text-center p-1.5 bg-terminal-red/10 border border-terminal-red/30 rounded">
            <div className="text-xs text-terminal-red font-bold">{stats.bearish}</div>
            <div className="text-[7px] text-terminal-gray">ขาลง</div>
          </div>
          <div className="text-center p-1.5 bg-terminal-amber/10 border border-terminal-amber/30 rounded">
            <div className="text-xs text-terminal-amber font-bold">{stats.avgQuality}</div>
            <div className="text-[7px] text-terminal-gray">คุณภาพ</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          {loading || translating ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="relative">
                <RefreshCw className="w-8 h-8 animate-spin text-terminal-amber" />
                <div className="absolute inset-0 w-8 h-8 border-2 border-terminal-amber/20 rounded-full animate-ping" />
              </div>
              <p className="text-xs text-terminal-amber animate-pulse">
                {translating ? '🇹🇭 กำลังแปลเป็นภาษาไทย...' : '📡 กำลังรวบรวมข่าวจากหลายแหล่ง...'}
              </p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12 text-terminal-gray">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">ไม่พบข่าว</p>
              <p className="text-[10px] mt-1">ลองค้นหาคำอื่น</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredNews.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-terminal-amber/20 rounded overflow-hidden hover:border-terminal-amber/60 hover:bg-terminal-amber/5 transition-all group"
                >
                  <div className="flex">
                    {/* News Image */}
                    <div className="w-24 h-20 flex-shrink-0 bg-bloomberg-header overflow-hidden">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}>
                        <div className="text-center">
                          <SourceIcon source={item.source} />
                          <span className="text-[8px] text-terminal-gray block mt-1">
                            {getSourceName(item.source)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 p-2 min-w-0">
                      {/* Title */}
                      <h3 className="text-[11px] font-medium text-terminal-white group-hover:text-terminal-amber line-clamp-2 mb-1.5 leading-tight">
                        {enableTranslation && item.translatedTitle ? item.translatedTitle : item.title}
                      </h3>
                      
                      {/* Entity Tags */}
                      {(item.entities.tickers.length > 0 || item.entities.companies.length > 0) && (
                        <div className="flex flex-wrap gap-0.5 mb-1.5">
                          {item.entities.tickers.slice(0, 3).map((ticker: string) => (
                            <Badge key={ticker} className="text-[7px] px-1 py-0 bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30">
                              ${ticker}
                            </Badge>
                          ))}
                          {item.entities.companies.slice(0, 2).map((company: string) => (
                            <Badge key={company} className="text-[7px] px-1 py-0 bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30">
                              {company}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Meta Row */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[8px] text-terminal-gray">
                        <SentimentBadge sentiment={item.sentiment} score={item.sentimentScore} />
                        
                        <span className="text-terminal-amber">Q:{item.qualityScore}</span>
                        <span className="text-terminal-cyan">R:{item.relevanceScore}</span>
                        
                        <div className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-terminal-gray" />
                          {new Date(item.timestamp).toLocaleString('th-TH', { 
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        
                        {item.upvotes && item.upvotes > 0 && (
                          <div className="flex items-center gap-0.5 text-terminal-orange">
                            <ChevronUp className="w-2.5 h-2.5" />
                            {item.upvotes.toLocaleString()}
                          </div>
                        )}
                        
                        {item.similarArticles && item.similarArticles.length > 0 && (
                          <div className="flex items-center gap-0.5 text-terminal-cyan">
                            <Link2 className="w-2.5 h-2.5" />
                            +{item.similarArticles.length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center pr-2">
                      <ExternalLink className="w-3 h-3 text-terminal-gray group-hover:text-terminal-amber transition-colors" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-terminal-amber/20 bg-bloomberg-header">
        <div className="flex items-center justify-between text-[9px] text-terminal-gray">
          <span>📊 แสดง {filteredNews.length} จาก {news.length} ข่าว</span>
          <span className="text-terminal-amber">
            {enableTranslation ? '🇹🇭 โหมดภาษาไทย' : '🇺🇸 English'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default TopNews;
