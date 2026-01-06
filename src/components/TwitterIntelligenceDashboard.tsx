import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Activity, AlertCircle, TrendingUp, TrendingDown, Zap, Brain, 
  PlayCircle, StopCircle, RefreshCw, ExternalLink, Twitter,
  Loader2, CheckCircle, Clock, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TWITTER_ACCOUNTS, 
  CATEGORY_LABELS, 
  PRIORITY_LABELS,
  type TwitterAccount, 
  type TwitterPost 
} from '@/types/twitterIntelligence';

interface ProcessingState {
  scraping: boolean;
  analyzing: boolean;
  ableHF: boolean;
}

interface Stats {
  totalAccounts: number;
  activePosts: number;
  criticalAlerts: number;
  bullish: number;
  bearish: number;
  neutral: number;
  lastUpdate: number | null;
}

export const TwitterIntelligenceDashboard = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [accounts, setAccounts] = useState<TwitterAccount[]>(TWITTER_ACCOUNTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [processing, setProcessing] = useState<ProcessingState>({
    scraping: false,
    analyzing: false,
    ableHF: false
  });
  const [stats, setStats] = useState<Stats>({
    totalAccounts: TWITTER_ACCOUNTS.filter(a => a.enabled).length,
    activePosts: 0,
    criticalAlerts: 0,
    bullish: 0,
    bearish: 0,
    neutral: 0,
    lastUpdate: null
  });

  const toggleAccount = (accountId: string) => {
    setAccounts(prev => prev.map(a => 
      a.id === accountId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const startMonitoring = useCallback(async () => {
    const enabledAccounts = accounts.filter(a => a.enabled);
    if (enabledAccounts.length === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 account');
      return;
    }

    setIsMonitoring(true);
    toast.info(`🐦 เริ่ม scrape ${enabledAccounts.length} accounts...`);

    try {
      // STEP 1: Scrape Twitter
      setProcessing(prev => ({ ...prev, scraping: true }));
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('twitter-scraper', {
        body: { 
          accounts: enabledAccounts.map(a => a.username),
          maxPostsPerAccount: 5
        }
      });
      setProcessing(prev => ({ ...prev, scraping: false }));

      if (scrapeError || !scrapeData?.success) {
        throw new Error(scrapeError?.message || scrapeData?.error || 'Scraping failed');
      }

      toast.success(`✅ ดึงข้อมูล ${scrapeData.posts?.length || 0} tweets สำเร็จ`);

      if (!scrapeData.posts?.length) {
        setIsMonitoring(false);
        return;
      }

      // STEP 2: AI Analysis
      setProcessing(prev => ({ ...prev, analyzing: true }));
      toast.info('🤖 กำลังวิเคราะห์ด้วย AI...');
      
      const { data: aiData, error: aiError } = await supabase.functions.invoke('twitter-ai-analyzer', {
        body: { posts: scrapeData.posts }
      });
      setProcessing(prev => ({ ...prev, analyzing: false }));

      if (aiError || !aiData?.success) {
        throw new Error(aiError?.message || aiData?.error || 'AI analysis failed');
      }

      // STEP 3: ABLE-HF Enhancement (handled in analyzer)
      setProcessing(prev => ({ ...prev, ableHF: true }));
      await new Promise(resolve => setTimeout(resolve, 500));
      setProcessing(prev => ({ ...prev, ableHF: false }));

      setPosts(aiData.posts || []);
      setStats({
        totalAccounts: enabledAccounts.length,
        activePosts: aiData.posts?.length || 0,
        criticalAlerts: aiData.stats?.critical || 0,
        bullish: aiData.stats?.bullish || 0,
        bearish: aiData.stats?.bearish || 0,
        neutral: aiData.stats?.neutral || 0,
        lastUpdate: Date.now()
      });

      toast.success(`🎯 วิเคราะห์เสร็จ: ${aiData.stats?.critical || 0} critical, ${aiData.stats?.high || 0} high priority`);
      
    } catch (error: any) {
      console.error('Twitter Intelligence error:', error);
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsMonitoring(false);
    }
  }, [accounts]);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'bearish': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-600 text-white animate-pulse';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const filteredAccounts = selectedCategory === 'all' 
    ? accounts 
    : accounts.filter(a => a.category === selectedCategory);

  const criticalPosts = posts.filter(p => p.urgency === 'critical' || p.urgency === 'high');

  return (
    <div className="h-full flex flex-col bg-background text-foreground p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Twitter className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Twitter Intelligence Pipeline</h2>
            <p className="text-sm text-muted-foreground">
              Real-time monitoring of {accounts.filter(a => a.enabled).length} market-moving accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={startMonitoring}
            disabled={isMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="gap-2"
          >
            {isMonitoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Start Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Processing Pipeline */}
      <Card className="bg-card/50 border-border">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${processing.scraping ? 'border-blue-500 bg-blue-500/10' : 'border-border'}`}>
              {processing.scraping ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : stats.activePosts > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Clock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">STEP 1: Twitter Scraping</p>
                <p className="text-xs text-muted-foreground">
                  {processing.scraping ? 'Fetching tweets...' : stats.activePosts > 0 ? `${stats.activePosts} posts` : 'Ready'}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${processing.analyzing ? 'border-purple-500 bg-purple-500/10' : 'border-border'}`}>
              {processing.analyzing ? (
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              ) : stats.activePosts > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Brain className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">STEP 2: AI Analysis</p>
                <p className="text-xs text-muted-foreground">
                  {processing.analyzing ? 'Gemini 2.5 Flash...' : stats.activePosts > 0 ? 'Complete' : 'Ready'}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${processing.ableHF ? 'border-yellow-500 bg-yellow-500/10' : 'border-border'}`}>
              {processing.ableHF ? (
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              ) : stats.criticalAlerts > 0 ? (
                <Zap className="w-5 h-5 text-yellow-400" />
              ) : (
                <Activity className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">STEP 3: ABLE-HF 3.0</p>
                <p className="text-xs text-muted-foreground">
                  {processing.ableHF ? '40 Modules...' : stats.criticalAlerts > 0 ? `${stats.criticalAlerts} alerts` : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3">
        <Card className="bg-card/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.totalAccounts}</p>
            <p className="text-xs text-muted-foreground">Accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{stats.activePosts}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.criticalAlerts}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.bullish}</p>
            <p className="text-xs text-muted-foreground">Bullish</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.bearish}</p>
            <p className="text-xs text-muted-foreground">Bearish</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.neutral}</p>
            <p className="text-xs text-muted-foreground">Neutral</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="feed" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="feed">📰 Live Feed</TabsTrigger>
          <TabsTrigger value="critical">🚨 Critical ({criticalPosts.length})</TabsTrigger>
          <TabsTrigger value="accounts">👥 Accounts ({accounts.filter(a => a.enabled).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Twitter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>กด "Start Analysis" เพื่อเริ่มดึงข้อมูล Twitter</p>
                </div>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="bg-card/50 hover:bg-card/80 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                            {post.displayName?.[0] || '@'}
                          </div>
                          <div>
                            <p className="font-semibold">{post.displayName || post.username}</p>
                            <p className="text-sm text-muted-foreground">@{post.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSentimentColor(post.sentiment)}>
                            {post.sentiment === 'bullish' && <TrendingUp className="w-3 h-3 mr-1" />}
                            {post.sentiment === 'bearish' && <TrendingDown className="w-3 h-3 mr-1" />}
                            {post.sentiment}
                          </Badge>
                          {(post.urgency === 'critical' || post.urgency === 'high') && (
                            <Badge className={getUrgencyColor(post.urgency)}>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {post.urgency}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm mb-3">{post.content}</p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span>❤️ {post.likes?.toLocaleString()}</span>
                        <span>🔄 {post.retweets?.toLocaleString()}</span>
                        <span>💬 {post.replies?.toLocaleString()}</span>
                        <span>• {new Date(post.timestamp).toLocaleString('th-TH')}</span>
                      </div>

                      {/* AI Summary */}
                      {post.aiSummary && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-purple-400 text-xs font-medium mb-1">
                            <Brain className="w-3 h-3" />
                            AI Summary ({post.confidence}% confidence)
                          </div>
                          <p className="text-sm">{post.aiSummary}</p>
                        </div>
                      )}

                      {/* Affected Assets */}
                      {post.affectedAssets && post.affectedAssets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.affectedAssets.map(asset => (
                            <Badge key={asset} variant="outline" className="text-xs">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* ABLE-HF Analysis */}
                      {post.ableAnalysis && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-2">
                            <Zap className="w-3 h-3" />
                            ABLE-HF 3.0 Analysis
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Decision</p>
                              <p className="font-bold">{post.ableAnalysis.decision}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">P(Up)</p>
                              <p className="font-bold">{post.ableAnalysis.P_up_pct}%</p>
                            </div>
                          </div>
                          <p className="text-xs mt-2 text-muted-foreground">{post.ableAnalysis.thai_summary}</p>
                        </div>
                      )}

                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-2"
                      >
                        View Original <ExternalLink className="w-3 h-3" />
                      </a>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="critical" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {criticalPosts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>ไม่มี Critical/High priority posts</p>
                </div>
              ) : (
                criticalPosts.map((post) => (
                  <Card key={post.id} className="bg-red-500/5 border-red-500/30">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getUrgencyColor(post.urgency)}>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {post.urgency?.toUpperCase()}
                        </Badge>
                        <span className="font-bold">@{post.username}</span>
                      </div>
                      <p className="text-sm mb-2">{post.content}</p>
                      {post.aiSummary && (
                        <p className="text-sm text-muted-foreground italic">{post.aiSummary}</p>
                      )}
                      {post.ableAnalysis && (
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">{post.ableAnalysis.decision}</Badge>
                          <span className="text-sm">P↑ {post.ableAnalysis.P_up_pct}%</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="accounts" className="flex-1 overflow-hidden mt-4">
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
            >
              All ({accounts.length})
            </Button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedCategory === key ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(key)}
              >
                {label} ({accounts.filter(a => a.category === key).length})
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="grid grid-cols-2 gap-2 pr-4">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    account.enabled ? 'bg-card/50 border-primary/30' : 'bg-muted/20 border-border opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">@{account.username}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {PRIORITY_LABELS[account.priority]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{account.description}</p>
                  </div>
                  <Switch
                    checked={account.enabled}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Last Update */}
      {stats.lastUpdate && (
        <div className="text-center text-xs text-muted-foreground">
          Last update: {new Date(stats.lastUpdate).toLocaleString('th-TH')}
        </div>
      )}
    </div>
  );
};

export default TwitterIntelligenceDashboard;
