import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, BellRing, AlertTriangle, AlertCircle, Info, X, 
  ChevronDown, ChevronUp, Volume2, VolumeX, Trash2,
  TrendingUp, TrendingDown, Newspaper, Clock
} from 'lucide-react';

// Alert Types
export interface Alert {
  id: string;
  type: 'volume_spike' | 'sentiment_shift' | 'market_moving' | 'price_alert';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  asset?: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  isRead: boolean;
  isDismissed: boolean;
  metadata?: Record<string, any>;
}

interface AlertSystemProps {
  rawNews: Array<{
    id: string;
    title: string;
    sentiment?: string;
    timestamp: number;
    source?: string;
  }>;
  pinnedAssets: { symbol: string }[];
  onAlertClick?: (alert: Alert) => void;
}

// Alert Detection Functions
function detectVolumeSpike(
  news: AlertSystemProps['rawNews'],
  windowHours: number = 1
): Alert | null {
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  
  const recentNews = news.filter(n => now - n.timestamp < windowMs);
  const olderNews = news.filter(n => 
    now - n.timestamp >= windowMs && 
    now - n.timestamp < windowMs * 24
  );
  
  const recentCount = recentNews.length;
  const avgHourly = olderNews.length / 24;
  
  if (avgHourly === 0) return null;
  
  const zScore = (recentCount - avgHourly) / Math.max(avgHourly * 0.5, 1);
  
  if (zScore > 3) {
    return {
      id: `spike-${Date.now()}`,
      type: 'volume_spike',
      severity: zScore > 4 ? 'critical' : 'warning',
      title: 'News Volume Spike Detected',
      message: `${recentCount} articles in ${windowHours}hr (normal: ${avgHourly.toFixed(0)}/hr) +${zScore.toFixed(1)}σ`,
      value: recentCount,
      threshold: avgHourly,
      timestamp: Date.now(),
      isRead: false,
      isDismissed: false,
      metadata: { zScore, recentNews: recentNews.slice(0, 5) }
    };
  }
  
  return null;
}

function detectSentimentShift(
  news: AlertSystemProps['rawNews'],
  windowHours: number = 2
): Alert | null {
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  
  const recentNews = news.filter(n => now - n.timestamp < windowMs);
  const olderNews = news.filter(n => 
    now - n.timestamp >= windowMs && 
    now - n.timestamp < windowMs * 2
  );
  
  const calcSentiment = (items: typeof news) => {
    if (items.length === 0) return 0;
    let score = 0;
    items.forEach(n => {
      if (n.sentiment === 'bullish') score += 1;
      else if (n.sentiment === 'bearish') score -= 1;
    });
    return score / items.length;
  };
  
  const recentSentiment = calcSentiment(recentNews);
  const olderSentiment = calcSentiment(olderNews);
  const shift = recentSentiment - olderSentiment;
  
  if (Math.abs(shift) > 0.4) {
    const direction = shift > 0 ? 'Bullish' : 'Bearish';
    return {
      id: `shift-${Date.now()}`,
      type: 'sentiment_shift',
      severity: Math.abs(shift) > 0.6 ? 'critical' : 'warning',
      title: `Sentiment Shift to ${direction}`,
      message: `${olderSentiment > 0 ? 'Bullish' : olderSentiment < 0 ? 'Bearish' : 'Neutral'} → ${direction} (${shift > 0 ? '+' : ''}${shift.toFixed(2)}) in ${windowHours}hr`,
      value: shift,
      timestamp: Date.now(),
      isRead: false,
      isDismissed: false,
      metadata: { recentSentiment, olderSentiment }
    };
  }
  
  return null;
}

function detectMarketMovingNews(
  news: AlertSystemProps['rawNews']
): Alert | null {
  const marketMovingKeywords = [
    'fed', 'fomc', 'rate cut', 'rate hike', 'powell',
    'trump', 'tariff', 'trade war', 'sanction',
    'war', 'invasion', 'conflict', 'crisis',
    'crash', 'collapse', 'surge', 'record high', 'all-time'
  ];
  
  const now = Date.now();
  const recentNews = news.filter(n => now - n.timestamp < 30 * 60 * 1000);
  
  for (const item of recentNews) {
    const lower = item.title.toLowerCase();
    const matchedKeywords = marketMovingKeywords.filter(kw => lower.includes(kw));
    
    if (matchedKeywords.length >= 2) {
      return {
        id: `moving-${item.id}`,
        type: 'market_moving',
        severity: matchedKeywords.length >= 3 ? 'critical' : 'warning',
        title: 'Market Moving News',
        message: item.title.substring(0, 100),
        timestamp: Date.now(),
        isRead: false,
        isDismissed: false,
        metadata: { 
          keywords: matchedKeywords, 
          source: item.source,
          newsId: item.id 
        }
      };
    }
  }
  
  return null;
}

// Alert Item Component
const AlertItem: React.FC<{
  alert: Alert;
  onDismiss: (id: string) => void;
  onView: (alert: Alert) => void;
}> = ({ alert, onDismiss, onView }) => {
  const getIcon = () => {
    switch (alert.severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (alert.severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  return (
    <div className={`p-3 rounded-lg border ${getBgColor()} ${!alert.isRead ? 'ring-1 ring-offset-1 ring-offset-zinc-900' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-white truncate">{alert.title}</span>
            <span className="text-[10px] text-zinc-500 whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeAgo(alert.timestamp)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 line-clamp-2">{alert.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(alert)}
              className="h-6 text-[10px] text-zinc-400 hover:text-white px-2"
            >
              View Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(alert.id)}
              className="h-6 text-[10px] text-zinc-500 hover:text-red-400 px-2"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Alert System Component
export const AlertSystem: React.FC<AlertSystemProps> = ({
  rawNews,
  pinnedAssets,
  onAlertClick
}) => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());

  // Check for new alerts
  const checkAlerts = useCallback(() => {
    const newAlerts: Alert[] = [];
    
    // Check volume spike
    const volumeSpike = detectVolumeSpike(rawNews);
    if (volumeSpike && !alerts.find(a => a.type === 'volume_spike' && Date.now() - a.timestamp < 300000)) {
      newAlerts.push(volumeSpike);
    }
    
    // Check sentiment shift
    const sentimentShift = detectSentimentShift(rawNews);
    if (sentimentShift && !alerts.find(a => a.type === 'sentiment_shift' && Date.now() - a.timestamp < 300000)) {
      newAlerts.push(sentimentShift);
    }
    
    // Check market moving news
    const marketMoving = detectMarketMovingNews(rawNews);
    if (marketMoving && !alerts.find(a => a.type === 'market_moving' && a.metadata?.newsId === marketMoving.metadata?.newsId)) {
      newAlerts.push(marketMoving);
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
      
      // Show toast for critical alerts
      newAlerts.filter(a => a.severity === 'critical').forEach(alert => {
        toast({
          title: `🚨 ${alert.title}`,
          description: alert.message,
          variant: 'destructive',
        });
        
        // Play sound if enabled
        if (soundEnabled) {
          try {
            const audio = new Audio('/alert.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      });
    }
    
    setLastCheckTime(Date.now());
  }, [rawNews, alerts, soundEnabled, toast]);

  // Check alerts every 30 seconds
  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  // Handlers
  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isDismissed: true } : a));
  };

  const handleClearAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isDismissed: true })));
  };

  const handleView = (alert: Alert) => {
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a));
    onAlertClick?.(alert);
  };

  // Filter active alerts
  const activeAlerts = alerts.filter(a => !a.isDismissed);
  const unreadCount = activeAlerts.filter(a => !a.isRead).length;
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <Card className={`mb-4 bg-zinc-900/50 border-zinc-800 overflow-hidden ${criticalCount > 0 ? 'border-red-500/30' : ''}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <BellRing className="w-4 h-4 text-red-400 animate-pulse" />
          ) : (
            <Bell className="w-4 h-4 text-orange-400" />
          )}
          <span className="text-sm font-medium text-white">
            Active Alerts
          </span>
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
              {unreadCount} new
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
            }}
          >
            {soundEnabled ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <VolumeX className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] text-zinc-500 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </div>

      {/* Alert List */}
      {isExpanded && (
        <ScrollArea className="max-h-[300px]">
          <div className="p-3 pt-0 space-y-2">
            {activeAlerts.map(alert => (
              <AlertItem 
                key={alert.id} 
                alert={alert} 
                onDismiss={handleDismiss}
                onView={handleView}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};

export default AlertSystem;
