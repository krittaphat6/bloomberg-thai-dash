import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { FirecrawlService } from '@/utils/FirecrawlService';
import { Loader2, ExternalLink, Settings } from 'lucide-react';

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

  // Mock news data as fallback
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
      setNews(mockNews); // Show mock data when no API key
    }
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
      fetchNews(); // Load real news after API key is set
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
      return;
    }

    setIsLoading(true);
    try {
      const result = await FirecrawlService.scrapeBloombergNews();
      
      if (result.success && result.data) {
        // Parse the markdown content to extract news items
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
    } catch (error) {
      console.error('Error fetching news:', error);
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
    // Simple parsing logic for Bloomberg content
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
    const colors = ['text-terminal-amber', 'text-terminal-cyan', 'text-terminal-yellow', 'text-terminal-green', 'text-terminal-red', 'text-terminal-white'];
    return colors[index % colors.length];
  };

  if (showApiKeyInput) {
    return (
      <div className="bg-background/90 border border-terminal-cyan p-4 rounded backdrop-blur-sm">
        <h3 className="text-terminal-amber text-sm font-bold mb-3">Configure Bloomberg News</h3>
        <p className="text-terminal-cyan text-xs mb-3">
          Enter your Firecrawl API key to fetch live Bloomberg news. You can get one at firecrawl.dev
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter Firecrawl API key"
            className="bg-black/50 border-terminal-cyan text-terminal-white text-xs"
          />
          <Button
            onClick={handleSaveApiKey}
            disabled={isLoading}
            className="bg-terminal-cyan text-black hover:bg-terminal-cyan/80 text-xs"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
          </Button>
          <Button
            onClick={() => setShowApiKeyInput(false)}
            variant="outline"
            className="border-terminal-cyan text-terminal-cyan text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/90 border border-terminal-cyan backdrop-blur-sm text-[0.6rem] sm:text-xs md:text-sm lg:text-base">
      {/* Header */}
      <div className="panel-header flex justify-between items-center border-b border-terminal-cyan text-[0.7rem] sm:text-sm md:text-base lg:text-lg">
        <span className="text-terminal-amber font-bold">BLOOMBERG FINANCIAL NEWS</span>
        <div className="flex gap-1">
          <Button
            onClick={fetchNews}
            disabled={isLoading}
            className="bg-transparent border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
          >
            {isLoading ? <Loader2 className="h-2 w-2 sm:h-3 sm:w-3 animate-spin" /> : 'REFRESH'}
          </Button>
          <Button
            onClick={() => setShowApiKeyInput(true)}
            className="bg-transparent border border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-black text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
          >
            <Settings className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
        </div>
      </div>

      {/* News Content */}
      <div className="p-3 max-h-40 overflow-y-auto">
        <div className="space-y-2">
          {news.map((item, index) => (
            <div key={index} className="border-l-2 border-terminal-cyan/30 pl-2">
              <div className="flex items-start gap-2">
                <span className="text-terminal-gray text-[0.6rem] sm:text-xs font-mono min-w-[3rem] sm:min-w-[4rem]">
                  {item.time}
                </span>
                <div className="flex-1">
                  <div className={`${getNewsColor(index)} text-[0.6rem] sm:text-xs font-medium leading-tight`}>
                    {item.headline}
                  </div>
                  {item.summary && (
                    <div className="text-terminal-gray text-[0.6rem] sm:text-xs mt-1 leading-tight">
                      {item.summary}
                    </div>
                  )}
                </div>
                {item.url && (
                  <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3 text-terminal-cyan/50 hover:text-terminal-cyan cursor-pointer" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {!hasApiKey && (
          <div className="mt-3 pt-2 border-t border-terminal-cyan/30">
            <p className="text-terminal-yellow text-[0.6rem] sm:text-xs">
              📈 Sample data shown. Configure API key for live Bloomberg news.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BloombergNews;