import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, Sparkles, ExternalLink, 
  Brain, TrendingUp, ChevronRight, Clock, BarChart3,
  Settings, Eye, FileText, Users, Zap, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface NewsData {
  macro: MacroAnalysis[];
  forYou: ForYouItem[];
  dailyReports: DailyReport[];
  xNotifications: XNotification[];
  timestamp: number;
}

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

  // Fetch news from edge function
  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching news from edge function...');
      
      const { data, error } = await supabase.functions.invoke('news-aggregator', {
        body: {}
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
        setLastUpdated(new Date());
        
        console.log(`Loaded ${data.macro?.length || 0} macro items, ${data.forYou?.length || 0} for you items`);
        
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
  }, [toast, initialLoading]);

  // Initial load
  useEffect(() => {
    fetchNews();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Calculate pre-market countdown
  const getPreMarketCountdown = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    // Pre-market starts at 9:00 UTC (4:00 AM ET)
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

  if (initialLoading) {
    return (
      <div className="flex h-full bg-black text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-zinc-400">Loading market intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-black text-white overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-emerald-400">
                Good afternoon, Trader.
              </h1>
              <p className="text-zinc-500 flex items-center gap-2 mt-1">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Your personal financial newspaper
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-zinc-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchNews}
                disabled={loading}
                className="text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent">
                <Settings className="w-4 h-4 mr-2" />
                Personalize
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* Tab Selector */}
            <div className="flex gap-6 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('macro')}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'macro' 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                AI Macro Desk
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'reports' 
                    ? 'text-emerald-400 border-b-2 border-emerald-400' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Daily Reports
              </button>
            </div>

            {activeTab === 'macro' ? (
              <>
                {/* AI Macro Desk Section */}
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
                    <button className="text-zinc-500 hover:text-emerald-400 text-sm flex items-center gap-1">
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {macroData.map((item) => (
                      <Card 
                        key={item.symbol} 
                        className="bg-zinc-900/50 border-zinc-800 p-4 hover:border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-white">{item.symbol}</h3>
                          <div className="flex items-center gap-2">
                            <SentimentBadge sentiment={item.sentiment} />
                            <span className="text-xs text-zinc-500">{item.confidence}%</span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-500">Confidence</span>
                          </div>
                          <Progress 
                            value={item.confidence} 
                            className="h-1.5 bg-zinc-800 [&>div]:bg-emerald-500"
                          />
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-emerald-400">AI Analysis</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                            {item.analysis}
                          </p>
                        </div>

                        <div className={`text-sm font-medium ${item.changeValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.changeValue >= 0 ? '↗' : '↘'} {item.change}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* For You Section */}
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
                    {forYouItems.map((item) => (
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
                          <span className="text-emerald-400">{item.type}</span>
                          <span className="text-zinc-500 mx-2">–</span>
                          <span className="text-zinc-400">{item.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
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
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-zinc-800 flex flex-col bg-black">
        {/* Market Session Timer */}
        <div className="p-4 border-b border-zinc-800">
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

        {/* X Notifications */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Latest notifications from</span>
              <span className="font-bold text-white text-lg">𝕏</span>
            </div>
            <Badge className="border-emerald-500/30 text-emerald-400 text-xs bg-emerald-500/10 border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Live
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {xNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className="group cursor-pointer"
                  onClick={() => window.open(notif.url, '_blank')}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {notif.source.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">{notif.source}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-500 text-xs">{notif.time}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-zinc-400 text-sm line-clamp-3">{notif.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {xNotifications.length === 0 && (
                <div className="text-center text-zinc-500 py-8">
                  <p className="text-sm">No notifications yet</p>
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
