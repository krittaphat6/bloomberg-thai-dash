import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WebhookHealthMonitorProps {
  roomId: string;
}

interface WebhookHealth {
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  lastWebhookTime: string | null;
  successRate: number;
}

export function WebhookHealthMonitor({ roomId }: WebhookHealthMonitorProps) {
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkHealth = useCallback(async () => {
    if (!roomId) return;

    try {
      setIsLoading(true);

      // Get webhook stats from last 24 hours by counting messages
      const since = new Date();
      since.setHours(since.getHours() - 24);

      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, created_at, webhook_data')
        .eq('room_id', roomId)
        .eq('message_type', 'webhook')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!messages || messages.length === 0) {
        setHealth({
          totalWebhooks: 0,
          successfulWebhooks: 0,
          failedWebhooks: 0,
          lastWebhookTime: null,
          successRate: 100,
        });
        return;
      }

      // All messages that reach the database are successful
      const successful = messages.length;
      const failed = 0; // We can't detect failed webhooks from messages table
      const total = messages.length;
      const successRate = 100;

      setHealth({
        totalWebhooks: total,
        successfulWebhooks: successful,
        failedWebhooks: failed,
        lastWebhookTime: messages[0].created_at,
        successRate,
      });

    } catch (error: any) {
      console.error('Failed to check webhook health:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Check health on mount and every 5 minutes
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Subscribe to new webhook messages
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`webhook-health-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          if (payload.new?.message_type === 'webhook') {
            console.log('📊 New webhook received:', payload.new?.id);
            checkHealth();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, checkHealth]);

  if (!health || isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Checking...</span>
      </div>
    );
  }

  const isHealthy = health.successRate >= 95;
  const hasIssues = health.successRate < 80;

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {isHealthy ? (
          <CheckCircle className="w-3 h-3 text-emerald-400" />
        ) : hasIssues ? (
          <AlertCircle className="w-3 h-3 text-red-400" />
        ) : (
          <Activity className="w-3 h-3 text-yellow-400" />
        )}
        <span className={`text-xs font-medium ${
          isHealthy ? 'text-emerald-400' : 
          hasIssues ? 'text-red-400' : 'text-yellow-400'
        }`}>
          {health.totalWebhooks} webhooks (24h)
        </span>
      </div>

      {health.lastWebhookTime && (
        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
          Last: {formatTimeAgo(health.lastWebhookTime)}
        </Badge>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-zinc-500 hover:text-white"
        onClick={checkHealth}
      >
        <RefreshCw className="w-3 h-3" />
      </Button>
    </div>
  );
}
