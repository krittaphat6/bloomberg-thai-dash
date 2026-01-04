import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  RefreshCw, Search, Flame, ExternalLink, 
  MessageCircle, Globe, Zap, Brain,
  TrendingUp, TrendingDown, Minus, Sparkles, Radio, Newspaper,
  Settings, X, Key, AlertTriangle, Bookmark, Calendar,
  DollarSign, BarChart3, Lock, Box, BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedNewsItem, SentimentStats, TradingSignal } from '@/types/news';
import { 
  aggregateAllNews, 
  analyzeNewsWithAI, 
  applyAIAnalysis,
  analyzeSentiment,
  extractTickers,
  calculateImpactScore,
  getImpactCategory
} from '@/services/newsAggregatorService';
import { AI_MODELS, SOURCE_CREDIBILITY } from '@/config/newsSources';
import { 
  setGroqApiKey, 
  hasGroqApiKey, 
  clearGroqApiKey 
} from '@/services/llmAnalysisService';

// ============ COMPONENTS ============
const SentimentBadge = ({ sentiment, confidence }: { sentiment: string; confidence?: number }) => {
  const config = {
    bullish: { bg: 'bg-primary/20', text: 'text-primary', border: 'border-primary/50' },
    bearish: { bg: 'bg-destructive/20', text: 'text-destructive', border: 'border-destructive/50' },
    neutral: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' }
  };
  const style = config[sentiment as keyof typeof config] || config.neutral;
  
  return (
    <span className={`${style.bg} ${style.text} ${style.border} border text-[10px] px-2 py-0.5 rounded font-mono`}>
      {sentiment.toUpperCase()}
      {confidence !== undefined && <span className="ml-1 opacity-70">({Math.round(confidence * 100)}%)</span>}
    </span>
  );
};

const SourceIcon = ({ sourceId }: { sourceId: string }) => {
  const icons: Record<string, any> = {
    'reddit': MessageCircle,
    'hackernews': Zap,
    'cryptocompare': Globe,
    'coindesk': DollarSign,
    'theblock': Box,
    'decrypt': Lock,
    'forexfactory': Calendar,
    'kitco': Sparkles,
    'fxstreet': DollarSign,
    'dailyfx': BarChart3,
    'seekingalpha': BookOpen,
    'finnhub': BarChart3,
  };
  const Icon = Object.entries(icons).find(([key]) => sourceId.includes(key))?.[1] || Globe;
  return <Icon className="w-3 h-3 text-muted-foreground" />;
};

const formatTimeAgo = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
};

const ImpactBadge = ({ category }: { category: string }) => {
  const colors = {
    critical: 'bg-destructive text-destructive-foreground',
    high: 'bg-terminal-amber text-black',
    medium: 'bg-yellow-500/20 text-yellow-500',
    low: 'bg-muted text-muted-foreground'
  };
  return (
    <Badge className={`text-[9px] px-1 ${colors[category as keyof typeof colors] || colors.low}`}>
      {category.toUpperCase()}
    </Badge>
  );
};

// ============ MAIN COMPONENT ============
const TopNews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [news, setNews] = useState<EnhancedNewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('bitcoin crypto gold');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gold' | 'crypto' | 'forex' | 'stocks'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'impact' | 'sentiment'>('impact');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasLLM, setHasLLM] = useState(hasGroqApiKey());
  const [selectedModel, setSelectedModel] = useState('groq-llama');
  const [aiEnabled, setAiEnabled] = useState(true);

  // Stats
  const stats: SentimentStats = useMemo(() => {
    const bullish = news.filter(n => (n.aiSentiment || n.algoSentiment) === 'bullish').length;
    const bearish = news.filter(n => (n.aiSentiment || n.algoSentiment) === 'bearish').length;
    const neutral = news.length - bullish - bearish;
    const aiAnalyzed = news.filter(n => n.isAIAnalyzed).length;
    const avgImpact = news.length > 0 ? news.reduce((sum, n) => sum + n.impactScore, 0) / news.length : 0;
    const critical = news.filter(n => n.impactCategory === 'critical').length;
    const high = news.filter(n => n.impactCategory === 'high').length;
    
    return {
      bullish, bearish, neutral,
      total: news.length,
      bullishPercent: news.length > 0 ? (bullish / news.length) * 100 : 0,
      bearishPercent: news.length > 0 ? (bearish / news.length) * 100 : 0,
      aiAnalyzedCount: aiAnalyzed,
      avgImpactScore: avgImpact,
      criticalCount: critical,
      highCount: high
    };
  }, [news]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const aggregated = await aggregateAllNews(searchQuery, selectedCategory);
      setNews(aggregated);
      toast({ title: '✅ News updated', description: `Found ${aggregated.length} items` });

      // AI Analysis if enabled
      if (hasLLM && aiEnabled && aggregated.length > 0) {
        setAiLoading(true);
        try {
          const apiKey = localStorage.getItem('groq_api_key') || '';
          const analyses = await analyzeNewsWithAI(aggregated, apiKey, selectedModel);
          if (analyses.length > 0) {
            const enhanced = applyAIAnalysis(aggregated, analyses);
            setNews(enhanced);
          }
        } catch (e) {
          console.error('AI analysis error:', e);
        } finally {
          setAiLoading(false);
        }
      }
    } catch (e) {
      console.error('Fetch error:', e);
      toast({ title: 'Error', description: 'Failed to fetch news', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, hasLLM, aiEnabled, selectedModel, toast]);

  useEffect(() => { fetchNews(); }, [selectedCategory]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchNews]);

  // Group by impact
  const groupedNews = useMemo(() => {
    const sorted = [...news].sort((a, b) => {
      if (sortBy === 'time') return b.timestamp - a.timestamp;
      if (sortBy === 'sentiment') return (b.algoScore || 0) - (a.algoScore || 0);
      return b.impactScore - a.impactScore;
    });

    return {
      critical: sorted.filter(n => n.impactCategory === 'critical'),
      high: sorted.filter(n => n.impactCategory === 'high'),
      medium: sorted.filter(n => n.impactCategory === 'medium'),
      low: sorted.filter(n => n.impactCategory === 'low')
    };
  }, [news, sortBy]);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setGroqApiKey(apiKeyInput.trim());
      setHasLLM(true);
      setApiKeyInput('');
      setShowSettings(false);
      toast({ title: '✅ API Key saved', description: 'AI Analysis ready' });
    }
  };

  const NewsCard = ({ item }: { item: EnhancedNewsItem }) => (
    <div 
      className={`p-3 border-l-2 hover:bg-muted/30 cursor-pointer transition-colors ${
        item.impactCategory === 'critical' ? 'border-l-destructive bg-destructive/5' :
        item.impactCategory === 'high' ? 'border-l-terminal-amber bg-terminal-amber/5' :
        item.impactCategory === 'medium' ? 'border-l-yellow-500 bg-yellow-500/5' :
        'border-l-muted'
      }`}
      onClick={() => window.open(item.url, '_blank')}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <SourceIcon sourceId={item.sourceId} />
          <span className="text-xs text-muted-foreground">{item.source}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.isBreaking && <Badge variant="destructive" className="text-[9px]">BREAKING</Badge>}
          <Badge variant="outline" className="text-[9px]">Impact: {item.impactScore}</Badge>
        </div>
      </div>

      <h3 className="text-sm font-medium text-foreground mb-1 line-clamp-2">{item.title}</h3>

      {item.isAIAnalyzed && (
        <div className="mt-2 p-2 bg-card rounded border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary font-medium">AI ANALYSIS</span>
            <span className="text-[10px] text-muted-foreground">{Math.round((item.aiConfidence || 0) * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <SentimentBadge sentiment={item.aiSentiment!} confidence={item.aiConfidence} />
            {item.aiTradingSignal && (
              <Badge variant={item.aiTradingSignal.action.includes('buy') ? 'default' : 'destructive'} className="text-[10px]">
                {item.aiTradingSignal.action.toUpperCase()} ({item.aiTradingSignal.strength}%)
              </Badge>
            )}
          </div>
          {item.aiSummary && <p className="text-xs text-muted-foreground">💡 {item.aiSummary}</p>}
        </div>
      )}

      {item.relatedTickers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.relatedTickers.slice(0, 4).map(ticker => (
            <Badge key={ticker} variant="outline" className="text-[10px]">{ticker}</Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-terminal-amber" />
          <span className="text-primary font-bold">TOP NEWS</span>
          <Badge variant="outline" className="text-xs">{news.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasLLM && (
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Brain className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.slice(0, 4).map(model => (
                  <SelectItem key={model.id} value={model.id} className="text-xs">{model.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchNews} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b border-primary/30 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold flex items-center gap-2"><Key className="w-3 h-3" /> Groq API Key</span>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X className="w-3 h-3" /></Button>
          </div>
          {hasLLM ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary">✓ Configured</span>
              <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={() => { clearGroqApiKey(); setHasLLM(false); }}>Remove</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="gsk_xxx..." className="flex-1 bg-background border rounded px-2 py-1 text-xs" />
              <Button size="sm" className="h-7" onClick={handleSaveApiKey}>Save</Button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 p-2 border-b border-border">
        {['all', 'gold', 'crypto', 'forex', 'stocks'].map(cat => (
          <Button key={cat} variant={selectedCategory === cat ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setSelectedCategory(cat as any)}>
            {cat === 'all' ? 'All' : cat === 'gold' ? '🥇 Gold' : cat === 'crypto' ? '₿ Crypto' : cat === 'forex' ? '💱 Forex' : '📈 Stocks'}
          </Button>
        ))}
        <div className="flex-1" />
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="impact">💥 Impact</SelectItem>
            <SelectItem value="time">⏰ Time</SelectItem>
            <SelectItem value="sentiment">📊 Sentiment</SelectItem>
          </SelectContent>
        </Select>
        {hasLLM && <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />}
      </div>

      {/* Sentiment Bar */}
      <div className="p-2 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-1 text-xs">
          <span className="text-muted-foreground">MARKET SENTIMENT</span>
          <div className="flex gap-3">
            <span className="text-primary">🟢 {stats.bullish}</span>
            <span className="text-destructive">🔴 {stats.bearish}</span>
            <span className="text-muted-foreground">⚪ {stats.neutral}</span>
            {hasLLM && <span className="text-primary">🤖 {stats.aiAnalyzedCount}</span>}
          </div>
        </div>
        <div className="h-2 bg-muted rounded overflow-hidden flex">
          <div className="bg-primary h-full" style={{ width: `${stats.bullishPercent}%` }} />
          <div className="bg-destructive h-full" style={{ width: `${stats.bearishPercent}%` }} />
        </div>
      </div>

      {/* News List */}
      <ScrollArea className="flex-1">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {groupedNews.critical.length > 0 && (
              <div className="border-b border-destructive/30">
                <div className="px-3 py-1 bg-destructive/10 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-bold text-destructive">CRITICAL ({groupedNews.critical.length})</span>
                </div>
                {groupedNews.critical.map(item => <NewsCard key={item.id} item={item} />)}
              </div>
            )}
            {groupedNews.high.length > 0 && (
              <div className="border-b border-terminal-amber/30">
                <div className="px-3 py-1 bg-terminal-amber/10 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-terminal-amber" />
                  <span className="text-xs font-bold text-terminal-amber">HIGH IMPACT ({groupedNews.high.length})</span>
                </div>
                {groupedNews.high.map(item => <NewsCard key={item.id} item={item} />)}
              </div>
            )}
            {groupedNews.medium.length > 0 && (
              <div className="border-b border-border">
                <div className="px-3 py-1 bg-yellow-500/10 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-500">MEDIUM ({groupedNews.medium.length})</span>
                </div>
                {groupedNews.medium.map(item => <NewsCard key={item.id} item={item} />)}
              </div>
            )}
            {groupedNews.low.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-muted/50 flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">OTHER ({groupedNews.low.length})</span>
                </div>
                {groupedNews.low.map(item => <NewsCard key={item.id} item={item} />)}
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {aiLoading && (
        <div className="flex items-center justify-center gap-2 p-2 bg-primary/10 border-t border-primary/30">
          <Brain className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-xs text-primary">Analyzing with AI...</span>
        </div>
      )}
    </div>
  );
};

export default TopNews;
