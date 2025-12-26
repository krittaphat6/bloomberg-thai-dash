import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Loader2
} from 'lucide-react';
import { MT5Credentials, BrokerConnection } from '@/services/brokers/BrokerAPIClient';

interface MT5CockpitDashboardProps {
  connection: BrokerConnection | null;
  mt5Credentials: MT5Credentials;
  onCredentialsChange: (credentials: MT5Credentials) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onRefreshStatus: () => Promise<void>;
  status: {
    connected: boolean;
    latency?: number;
    account?: any;
  } | null;
  isConnecting: boolean;
  isLoadingStatus: boolean;
}

export const MT5CockpitDashboard: React.FC<MT5CockpitDashboardProps> = ({
  connection,
  mt5Credentials,
  onConnect,
  onDisconnect,
  onRefreshStatus,
  status,
  isConnecting,
  isLoadingStatus
}) => {
  const [showKey, setShowKey] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  const isConnected = status?.connected || connection?.is_connected;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const apiUrl = `${supabaseUrl}/functions/v1/mt5-poll`;
  
  // Stats
  const totalOrders = connection?.total_orders_sent || 0;
  const successOrders = connection?.successful_orders || 0;
  const failedOrders = connection?.failed_orders || 0;
  const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) : 0;
  
  // Real-time clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().slice(11, 19));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto-refresh status
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        onRefreshStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, onRefreshStatus]);
  
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={`text-sm font-medium ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {status?.latency && (
            <span className="text-xs text-muted-foreground">({status.latency}ms)</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono">{currentTime} UTC</span>
      </div>

      {/* Credentials Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Connection Credentials</h3>
        
        {/* Connection ID */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Connection ID</label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={connection?.id || '--'}
              className="flex-1 font-mono text-xs bg-muted/50"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(connection?.id || '', 'Connection ID')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* API Endpoint */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">API Endpoint</label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={apiUrl}
              className="flex-1 font-mono text-xs bg-muted/50"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(apiUrl, 'API Endpoint')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Authorization Key</label>
          <div className="flex gap-2">
            <Input
              readOnly
              type={showKey ? 'text' : 'password'}
              value={anonKey}
              className="flex-1 font-mono text-xs bg-muted/50"
            />
            <Button size="icon" variant="outline" onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(anonKey, 'API Key')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
          <div className="text-lg font-bold text-foreground">{totalOrders}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
          <div className="text-lg font-bold text-green-500">{successOrders}</div>
          <div className="text-xs text-muted-foreground">Success</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
          <div className="text-lg font-bold text-red-500">{failedOrders}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
      </div>

      {/* Success Rate */}
      {totalOrders > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="text-green-500 font-medium">{successRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
        <h3 className="text-sm font-medium text-foreground">Account Info</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Account:</span>
          <span className="text-foreground font-mono text-right">{mt5Credentials.account || '--'}</span>
          <span className="text-muted-foreground">Server:</span>
          <span className="text-foreground font-mono text-right truncate">{mt5Credentials.server || '--'}</span>
          <span className="text-muted-foreground">Magic #:</span>
          <span className="text-foreground font-mono text-right">{mt5Credentials.magic_number}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={onRefreshStatus}
          disabled={isLoadingStatus}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {isConnected ? (
          <Button 
            variant="destructive" 
            className="flex-1" 
            onClick={onDisconnect}
            disabled={isConnecting}
          >
            <WifiOff className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        ) : (
          <Button 
            className="flex-1" 
            onClick={onConnect} 
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4 mr-2" />
            )}
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
};
