import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Twitter, Pin, Plus, X, Loader2, RefreshCw, Star, AlertCircle,
  TrendingUp, TrendingDown, Brain, Zap, ExternalLink, Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TwitterPost } from '@/types/twitterIntelligence';

interface PinnedTwitterChannel {
  username: string;
  displayName: string;
  addedAt: number;
  isPriority: boolean;
  lastPostCount?: number;
  lastChecked?: number;
}

interface TwitterChannelPinPanelProps {
  onNewPosts?: (posts: TwitterPost[], username: string) => void;
}

const PINNED_CHANNELS_KEY = 'able-pinned-twitter-channels';

// Default pinned channels
const DEFAULT_CHANNELS: PinnedTwitterChannel[] = [
  { username: 'purich_fx', displayName: 'Purich | FOREXMONDAY', addedAt: Date.now(), isPriority: true },
];

export const TwitterChannelPinPanel = ({ onNewPosts }: TwitterChannelPinPanelProps) => {
  const { toast } = useToast();
  const [pinnedChannels, setPinnedChannels] = useState<PinnedTwitterChannel[]>(DEFAULT_CHANNELS);
  const [newUsername, setNewUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [channelPosts, setChannelPosts] = useState<Record<string, TwitterPost[]>>({});
  const [channelLoading, setChannelLoading] = useState<Record<string, boolean>>({});
  const [lastCheckedIds, setLastCheckedIds] = useState<Record<string, string[]>>({});
  const [showAddInput, setShowAddInput] = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(PINNED_CHANNELS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPinnedChannels(parsed);
        }
      } catch (e) {
        console.error('Error loading pinned channels:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (pinnedChannels.length > 0) {
      localStorage.setItem(PINNED_CHANNELS_KEY, JSON.stringify(pinnedChannels));
    }
  }, [pinnedChannels]);

  // Add thinking log
  const addLog = (log: string) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setThinkingLogs(prev => [...prev.slice(-50), `[${timestamp}] ${log}`]);
  };

  // Fetch posts from a single channel with AI analysis
  const fetchChannelPosts = async (channel: PinnedTwitterChannel, checkForNew = false) => {
    setChannelLoading(prev => ({ ...prev, [channel.username]: true }));
    addLog(`🔍 กำลังดึงข้อมูลจาก @${channel.username}...`);

    try {
      // Step 1: Scrape Twitter
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('twitter-scraper', {
        body: { 
          accounts: [channel.username],
          maxPostsPerAccount: 10
        }
      });

      if (scrapeError || !scrapeData?.success) {
        addLog(`❌ Scrape error: ${scrapeError?.message || scrapeData?.error}`);
        return;
      }

      const posts = scrapeData.posts || [];
      addLog(`✅ พบ ${posts.length} โพสต์จาก @${channel.username}`);

      if (posts.length === 0) return;

      // Check for new posts
      const existingIds = lastCheckedIds[channel.username] || [];
      const newPosts = checkForNew 
        ? posts.filter((p: TwitterPost) => !existingIds.includes(p.id))
        : posts;

      if (checkForNew && newPosts.length > 0) {
        addLog(`🆕 พบโพสต์ใหม่ ${newPosts.length} โพสต์! กำลังวิเคราะห์...`);
        toast({
          title: `📢 โพสต์ใหม่จาก @${channel.username}`,
          description: `พบ ${newPosts.length} โพสต์ใหม่!`,
        });
      }

      // Step 2: AI Analysis for priority channels or new posts
      if (channel.isPriority || newPosts.length > 0) {
        addLog(`🧠 ส่งให้ Gemini AI วิเคราะห์...`);
        
        const { data: aiData, error: aiError } = await supabase.functions.invoke('twitter-ai-analyzer', {
          body: { posts: newPosts.length > 0 ? newPosts : posts }
        });

        if (aiData?.success && aiData.posts) {
          const analyzedPosts = aiData.posts;
          addLog(`✅ AI วิเคราะห์เสร็จ: Bullish ${aiData.stats?.bullish || 0}, Bearish ${aiData.stats?.bearish || 0}`);
          
          // Check for critical posts
          const criticalPosts = analyzedPosts.filter((p: TwitterPost) => p.urgency === 'critical' || p.urgency === 'high');
          if (criticalPosts.length > 0) {
            addLog(`🚨 Critical Alert! พบ ${criticalPosts.length} โพสต์สำคัญ!`);
          }

          setChannelPosts(prev => ({ ...prev, [channel.username]: analyzedPosts }));
          
          // Notify parent of new posts
          if (newPosts.length > 0 && onNewPosts) {
            onNewPosts(analyzedPosts.filter((p: TwitterPost) => 
              newPosts.some((np: TwitterPost) => np.id === p.id)
            ), channel.username);
          }
        } else {
          // Use unanalyzed posts if AI fails
          setChannelPosts(prev => ({ ...prev, [channel.username]: posts }));
        }
      } else {
        setChannelPosts(prev => ({ ...prev, [channel.username]: posts }));
      }

      // Update last checked IDs
      setLastCheckedIds(prev => ({
        ...prev,
        [channel.username]: posts.map((p: TwitterPost) => p.id)
      }));

      // Update channel last checked time
      setPinnedChannels(prev => prev.map(c => 
        c.username === channel.username 
          ? { ...c, lastChecked: Date.now(), lastPostCount: posts.length }
          : c
      ));

    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setChannelLoading(prev => ({ ...prev, [channel.username]: false }));
    }
  };

  // Fetch all pinned channels (priority first)
  const fetchAllChannels = async () => {
    addLog(`📡 เริ่มดึงข้อมูลจากช่อง Pinned ทั้งหมด...`);
    
    // Sort by priority first
    const sortedChannels = [...pinnedChannels].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return 0;
    });

    for (const channel of sortedChannels) {
      await fetchChannelPosts(channel, true);
      // Small delay between channels
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    addLog(`✅ ดึงข้อมูลครบทุกช่องแล้ว!`);
  };

  // Start real-time monitoring
  const startMonitoring = async () => {
    setIsMonitoring(true);
    addLog(`🔴 เริ่ม Real-time Monitoring...`);
    
    // Initial fetch
    await fetchAllChannels();
  };

  // Auto-refresh interval
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      addLog(`🔄 Auto-refresh checking for new posts...`);
      fetchAllChannels();
    }, 60000); // Check every 1 minute

    return () => clearInterval(interval);
  }, [isMonitoring, pinnedChannels]);

  // Add new channel
  const handleAddChannel = async () => {
    if (!newUsername.trim()) return;
    
    const username = newUsername.trim().replace('@', '');
    
    if (pinnedChannels.find(c => c.username.toLowerCase() === username.toLowerCase())) {
      toast({ title: 'ช่องนี้ถูก Pin ไว้แล้ว', variant: 'destructive' });
      return;
    }

    if (pinnedChannels.length >= 10) {
      toast({ title: 'Pin ได้สูงสุด 10 ช่อง', variant: 'destructive' });
      return;
    }

    setIsAdding(true);
    addLog(`➕ กำลังเพิ่มช่อง @${username}...`);

    const newChannel: PinnedTwitterChannel = {
      username,
      displayName: username,
      addedAt: Date.now(),
      isPriority: false
    };

    setPinnedChannels(prev => [...prev, newChannel]);
    setNewUsername('');
    setShowAddInput(false);
    setIsAdding(false);

    toast({ title: `✅ เพิ่ม @${username} สำเร็จ` });
    
    // Fetch posts for new channel
    fetchChannelPosts(newChannel);
  };

  // Remove channel
  const handleRemoveChannel = (username: string) => {
    setPinnedChannels(prev => prev.filter(c => c.username !== username));
    setChannelPosts(prev => {
      const newPosts = { ...prev };
      delete newPosts[username];
      return newPosts;
    });
    addLog(`🗑️ ลบช่อง @${username}`);
  };

  // Toggle priority
  const togglePriority = (username: string) => {
    setPinnedChannels(prev => prev.map(c => 
      c.username === username ? { ...c, isPriority: !c.isPriority } : c
    ));
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'bearish': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-zinc-400 bg-zinc-500/20 border-zinc-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Pinned Twitter Channels</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {pinnedChannels.length} channels
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddInput(!showAddInput)}
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Channel
          </Button>
          <Button
            size="sm"
            onClick={startMonitoring}
            disabled={isMonitoring && Object.values(channelLoading).some(l => l)}
            className={isMonitoring ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
          >
            {Object.values(channelLoading).some(l => l) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            {isMonitoring ? 'Monitoring...' : 'Start Monitor'}
          </Button>
        </div>
      </div>

      {/* Add Channel Input */}
      {showAddInput && (
        <Card className="p-3 bg-zinc-900/50 border-zinc-800">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="username (ไม่ต้องใส่ @)"
                className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
              />
            </div>
            <Button onClick={handleAddChannel} disabled={isAdding}>
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
          </div>
        </Card>
      )}

      {/* Pinned Channels Grid */}
      <div className="grid grid-cols-2 gap-4">
        {pinnedChannels.map((channel) => {
          const posts = channelPosts[channel.username] || [];
          const loading = channelLoading[channel.username];
          const criticalCount = posts.filter(p => p.urgency === 'critical' || p.urgency === 'high').length;

          return (
            <Card 
              key={channel.username} 
              className={`p-4 bg-zinc-900/50 border-zinc-800 relative group ${
                channel.isPriority ? 'ring-1 ring-yellow-500/30 border-yellow-500/20' : ''
              }`}
            >
              {/* Priority Star */}
              <button
                onClick={() => togglePriority(channel.username)}
                className={`absolute top-2 left-2 p-1 rounded transition-all ${
                  channel.isPriority 
                    ? 'text-yellow-400' 
                    : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                }`}
                title="Toggle priority"
              >
                <Star className={`w-4 h-4 ${channel.isPriority ? 'fill-yellow-400' : ''}`} />
              </button>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveChannel(channel.username)}
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
              >
                <X className="w-3 h-3 text-zinc-400" />
              </button>

              {/* Channel Info */}
              <div className="mt-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                    {channel.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{channel.displayName}</p>
                    <p className="text-xs text-zinc-500">@{channel.username}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                  {posts.length} posts
                </Badge>
                {criticalCount > 0 && (
                  <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {criticalCount} critical
                  </Badge>
                )}
                {loading && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                )}
              </div>

              {/* Recent Post Preview */}
              {posts.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {posts.slice(0, 3).map((post) => (
                    <div 
                      key={post.id}
                      className="p-2 bg-black/30 rounded text-xs cursor-pointer hover:bg-zinc-800/50"
                      onClick={() => window.open(post.url, '_blank')}
                    >
                      <p className="text-zinc-300 line-clamp-2 mb-1">{post.content}</p>
                      <div className="flex items-center gap-2">
                        {post.sentiment && (
                          <Badge className={`text-[10px] ${getSentimentColor(post.sentiment)}`}>
                            {post.sentiment === 'bullish' && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                            {post.sentiment === 'bearish' && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                            {post.sentiment}
                          </Badge>
                        )}
                        {post.ableAnalysis && (
                          <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400">
                            <Zap className="w-2.5 h-2.5 mr-0.5" />
                            {post.ableAnalysis.decision}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="ghost"
                className="w-full mt-2 text-zinc-400 hover:text-white"
                onClick={() => fetchChannelPosts(channel, true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* AI Thinking Log */}
      {thinkingLogs.length > 0 && (
        <Card className="p-3 bg-zinc-950 border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Real-time Processing Log</span>
            {Object.values(channelLoading).some(l => l) && (
              <Loader2 className="w-3 h-3 text-purple-400 animate-spin ml-auto" />
            )}
          </div>
          <ScrollArea className="h-32">
            <div className="space-y-1 font-mono text-xs">
              {thinkingLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-2 ${
                    log.includes('✅') ? 'text-emerald-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('🆕') || log.includes('🚨') ? 'text-yellow-400' :
                    log.includes('🧠') ? 'text-purple-400' :
                    'text-zinc-400'
                  }`}
                >
                  <span className="text-zinc-600">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default TwitterChannelPinPanel;
