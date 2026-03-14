import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, BellRing, AlertTriangle, AlertCircle, Info, X, 
  ChevronDown, ChevronUp, Volume2, VolumeX, Trash2,
  TrendingUp, TrendingDown, Newspaper, Clock, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className={`p-3 rounded-lg border ${getBgColor()}`}>
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
          {alert.asset && (
            <Badge variant="outline" className="text-[9px] mt-1 border-zinc-700 text-zinc-400">{alert.asset}</Badge>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="ghost" onClick={() => onView(alert)} className="h-6 text-[10px] text-zinc-400 hover:text-white px-2">
              View Details
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(alert.id)} className="h-6 text-[10px] text-zinc-500 hover:text-red-400 px-2">
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AlertSystem: React.FC<AlertSystemProps> = ({
  rawNews,
  pinnedAssets,
  onAlertClick
}) => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Fetch alerts from database on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    const fetchAlerts = async () => {
      try {
        const { data: dbAlerts, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (error) throw error;
        
        if (dbAlerts && dbAlerts.length > 0) {
          const mapped: Alert[] = dbAlerts.map((a: any) => ({
            id: a.id,
            type: a.type as any || 'market_moving',
            severity: a.severity as any || 'info',
            title: a.title,
            message: a.message,
            asset: a.symbol || undefined,
            timestamp: new Date(a.created_at).getTime(),
            isRead: a.is_read || false,
            isDismissed: false,
            metadata: a.data as any || {},
          }));
          setAlerts(mapped);
          console.log(`🚨 Loaded ${mapped.length} alerts from DB`);
        }
      } catch (err) {
        console.warn('Alert fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, []);

  // Also detect local alerts from rawNews (supplement DB alerts)
  useEffect(() => {
    if (rawNews.length === 0) return;
    
    const localAlerts: Alert[] = [];
    
    // Detect market-moving news
    const marketMovingKeywords = ['fed', 'fomc', 'rate cut', 'rate hike', 'powell', 'trump', 'tariff', 'trade war', 'sanction', 'war', 'invasion', 'crash', 'collapse', 'surge', 'record high', 'all-time'];
    const recentNews = rawNews.filter(n => Date.now() - n.timestamp < 3600000);
    
    for (const item of recentNews.slice(0, 20)) {
      const lower = item.title.toLowerCase();
      const matched = marketMovingKeywords.filter(kw => lower.includes(kw));
      if (matched.length >= 2) {
        const existsInDB = alerts.some(a => a.message.includes(item.title.substring(0, 50)));
        if (!existsInDB) {
          localAlerts.push({
            id: `local-${item.id}`,
            type: 'market_moving',
            severity: matched.length >= 3 ? 'critical' : 'warning',
            title: '🚨 Market Moving News',
            message: item.title.substring(0, 200),
            timestamp: item.timestamp,
            isRead: false,
            isDismissed: false,
            metadata: { keywords: matched, source: item.source }
          });
        }
      }
    }
    
    if (localAlerts.length > 0) {
      setAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newOnes = localAlerts.filter(a => !existingIds.has(a.id));
        return [...newOnes, ...prev].slice(0, 50);
      });
    }
  }, [rawNews.length]);

  const handleDismiss = async (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isDismissed: true } : a));
    // Mark as read in DB if it's a DB alert
    if (!id.startsWith('local-')) {
      try {
        await supabase.from('alerts').update({ is_read: true }).eq('id', id);
      } catch {}
    }
  };

  const handleClearAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isDismissed: true })));
  };

  const handleView = (alert: Alert) => {
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a));
    onAlertClick?.(alert);
  };

  const activeAlerts = alerts.filter(a => !a.isDismissed);
  const unreadCount = activeAlerts.filter(a => !a.isRead).length;
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;

  if (loading) {
    return (
      <Card className="mb-4 bg-zinc-900/50 border-zinc-800 p-3">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Bell className="w-4 h-4" />
          <span>Loading alerts...</span>
        </div>
      </Card>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <Card className="mb-4 bg-zinc-900/50 border-zinc-800 p-3">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Bell className="w-4 h-4" />
          <span>No active alerts</span>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 ml-auto">
            ✅ All Clear
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`mb-4 bg-zinc-900/50 border-zinc-800 overflow-hidden ${criticalCount > 0 ? 'border-red-500/30' : ''}`}>
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? <BellRing className="w-4 h-4 text-red-400 animate-pulse" /> : <Bell className="w-4 h-4 text-orange-400" />}
          <span className="text-sm font-medium text-white">Active Alerts</span>
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">{unreadCount} new</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-zinc-500 hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); handleClearAll(); }}>
            <Trash2 className="w-3 h-3 mr-1" />Clear
          </Button>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </div>

      {isExpanded && (
        <ScrollArea className="max-h-[300px]">
          <div className="p-3 pt-0 space-y-2">
            {activeAlerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} onDismiss={handleDismiss} onView={handleView} />
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};

export default AlertSystem;
