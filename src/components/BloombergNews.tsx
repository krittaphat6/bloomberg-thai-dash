import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { Loader2, ExternalLink, Settings, Newspaper, Table } from 'lucide-react';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewsItem {
  headline: string;
  time: string;
  summary?: string;
  url?: string;
}

const BloombergNews = () => {
  const { toast } = useToast();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mockNews: NewsItem[] = [
    { headline: "Fed Signals Rate Pause Amid Inflation Concerns", time: "15:45", summary: "Federal Reserve officials hint at maintaining current rates" },
    { headline: "Tech Stocks Rally on AI Investment Surge", time: "15:30", summary: "Major technology companies see significant gains" },
    { headline: "Oil Prices Jump 3% on OPEC+ Production Cuts", time: "15:15", summary: "Energy sector responds to supply constraints" },
    { headline: "Dollar Strengthens Against Major Currencies", time: "15:00", summary: "USD gains momentum in forex markets" },
    { headline: "European Markets Close Higher on GDP Data", time: "14:45", summary: "Strong economic indicators boost investor confidence" },
    { headline: "Crypto Market Shows Mixed Signals", time: "14:30", summary: "Bitcoin stabilizes while altcoins remain volatile" }
  ];

  useEffect(() => {
    const existingApiKey = FirecrawlService.getApiKey();
    setHasApiKey(!!existingApiKey);
    if (!existingApiKey) {
      setNews(mockNews);
    }
    setLastUpdate(new Date());
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const isValid = await FirecrawlService.testApiKey(apiKey);
    
    if (isValid) {
      FirecrawlService.saveApiKey(apiKey);
      setHasApiKey(true);
      setShowApiKeyInput(false);
      setApiKey('');
      toast({
        title: "Success",
        description: "API key saved successfully",
      });
      fetchNews();
    } else {
      toast({
        title: "Error", 
        description: "Invalid API key. Please check and try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const fetchNews = async () => {
    if (!hasApiKey) {
      setNews(mockNews);
      setLastUpdate(new Date());
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await FirecrawlService.scrapeBloombergNews();
      
      if (result.success && result.data) {
        const parsedNews = parseBloombergContent(result.data);
        setNews(parsedNews.length > 0 ? parsedNews : mockNews);
        toast({
          title: "Success",
          description: "Bloomberg news updated",
        });
      } else {
        setNews(mockNews);
        toast({
          title: "Info",
          description: "Using sample news data",
        });
      }
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(err.message || 'Failed to fetch news');
      setNews(mockNews);
      toast({
        title: "Error",
        description: "Failed to fetch news, showing sample data",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const parseBloombergContent = (content: string): NewsItem[] => {
    const lines = content.split('\n');
    const newsItems: NewsItem[] = [];
    
    for (let i = 0; i < lines.length && newsItems.length < 6; i++) {
      const line = lines[i].trim();
      if (line.length > 20 && !line.startsWith('#') && !line.startsWith('*')) {
        newsItems.push({
          headline: line.length > 80 ? line.substring(0, 80) + '...' : line,
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          summary: lines[i + 1]?.trim().substring(0, 100) + '...' || ''
        });
      }
    }
    
    return newsItems.length > 0 ? newsItems : mockNews;
  };

  const getNewsColor = (index: number) => {
    const colors = ['text-amber-400', 'text-cyan-400', 'text-yellow-400', 'text-green-400', 'text-red-400', 'text-foreground'];
    return colors[index % colors.length];
  };

  // News Feed Content
  const NewsFeedContent = () => (
    <ScrollArea className="h-48">
      <div className="space-y-2 pr-2">
        {news.map((item, index) => (
          <div key={index} className="border-l-2 border-cyan-500/30 pl-2 py-1">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground text-[10px] font-mono min-w-[3rem]">
                {item.time}
              </span>
              <div className="flex-1">
                <div className={`${getNewsColor(index)} text-xs font-medium leading-tight`}>
                  {item.headline}
                </div>
                {item.summary && (
                  <div className="text-muted-foreground text-[10px] mt-0.5 leading-tight">
                    {item.summary}
                  </div>
                )}
              </div>
              {item.url && (
                <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-cyan-400 cursor-pointer flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  // Settings Content
  const SettingsContent = () => (
    <div className="space-y-3 p-2">
      <div className="text-xs text-muted-foreground">
        Configure your Firecrawl API key to fetch live Bloomberg news.
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter Firecrawl API key"
          className="text-xs"
        />
        <Button
          onClick={handleSaveApiKey}
          disabled={isLoading}
          size="sm"
          className="text-xs"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground">
        Get your API key at <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">firecrawl.dev</a>
      </div>
      {!hasApiKey && (
        <div className="text-[10px] text-amber-400 mt-2">
          📈 Currently showing sample data. Configure API key for live news.
        </div>
      )}
    </div>
  );

  return (
    <COTStyleWrapper
      title="BLOOMBERG FINANCIAL NEWS"
      icon="📰"
      lastUpdate={lastUpdate}
      onRefresh={fetchNews}
      loading={isLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'news',
          label: 'News Feed',
          icon: <Newspaper className="w-3 h-3" />,
          content: <NewsFeedContent />
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="w-3 h-3" />,
          content: <SettingsContent />
        }
      ]}
      footerLeft={`Total: ${news.length} articles`}
      footerStats={[
        { label: '📡 Source', value: hasApiKey ? 'Live' : 'Sample' }
      ]}
    />
  );
};

export default BloombergNews;
