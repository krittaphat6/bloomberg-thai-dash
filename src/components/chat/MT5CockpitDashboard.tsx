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
  Zap,
  Activity,
  Terminal,
  Shield,
  Key,
  Link2,
  Radio,
  Gauge,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { BrokerAPI, MT5Credentials, BrokerConnection } from '@/services/brokers/BrokerAPIClient';

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
  onCredentialsChange,
  onConnect,
  onDisconnect,
  onRefreshStatus,
  status,
  isConnecting,
  isLoadingStatus
}) => {
  const [showKey, setShowKey] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [lastPollTime, setLastPollTime] = useState<string | null>(null);
  
  const isConnected = status?.connected || connection?.is_connected;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  
  // Calculate signal strength based on latency
  const getSignalStrength = () => {
    if (!status?.latency) return 0;
    if (status.latency < 50) return 100;
    if (status.latency < 100) return 80;
    if (status.latency < 200) return 60;
    if (status.latency < 500) return 40;
    return 20;
  };
  
  const signalStrength = getSignalStrength();
  
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
        setLastPollTime(new Date().toISOString().slice(11, 19));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, onRefreshStatus]);
  
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '📋 Copied!',
      description: `${label} copied to clipboard`,
    });
  }, []);
  
  const apiUrl = `${supabaseUrl}/functions/v1/mt5-poll`;

  return (
    <div className="cockpit-dashboard min-h-[600px] relative overflow-hidden rounded-lg">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 cockpit-grid-bg opacity-30" />
      
      {/* Scan Line Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="scan-line" />
      </div>
      
      {/* === Header Section === */}
      <div className="cockpit-header relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`pulse-dot ${isConnected ? 'online' : 'offline'}`} />
            <span className={`font-mono text-xs font-bold tracking-wider ${isConnected ? 'text-terminal-green' : 'text-terminal-amber'}`}>
              {isConnected ? 'SYSTEM ONLINE' : 'AWAITING CONNECTION'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-terminal-cyan font-mono text-xs">
            <Clock className="w-3 h-3" />
            <span>{currentTime} UTC</span>
          </div>
        </div>
      </div>

      {/* === Main Dashboard Grid === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 relative z-10">
        
        {/* Left Column - Credentials Panel */}
        <div className="cockpit-panel">
          <div className="panel-header-cockpit">
            <Terminal className="w-4 h-4" />
            <span>CONNECTION CREDENTIALS</span>
          </div>
          
          <div className="space-y-4 p-4">
            {/* Connection ID */}
            <div className="credential-group">
              <label className="credential-label">
                <Key className="w-3 h-3" />
                CONNECTION ID
              </label>
              <div className="credential-input-wrapper">
                <div className="input-with-scan">
                  <div className="scan-line-input" />
                  <Input
                    value={connection?.id || '--'}
                    readOnly
                    className="credential-input font-mono text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(connection?.id || '', 'Connection ID')}
                  className="copy-btn"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* API URL */}
            <div className="credential-group">
              <label className="credential-label">
                <Link2 className="w-3 h-3" />
                API ENDPOINT
              </label>
              <div className="credential-input-wrapper">
                <div className="input-with-scan">
                  <div className="scan-line-input" />
                  <Input
                    value={apiUrl}
                    readOnly
                    className="credential-input font-mono text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(apiUrl, 'API URL')}
                  className="copy-btn"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* API Key */}
            <div className="credential-group">
              <label className="credential-label">
                <Shield className="w-3 h-3" />
                AUTHORIZATION KEY
              </label>
              <div className="credential-input-wrapper">
                <div className="input-with-scan">
                  <div className="scan-line-input" />
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={anonKey}
                    readOnly
                    className="credential-input font-mono text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowKey(!showKey)}
                  className="eye-btn"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(anonKey, 'API Key')}
                  className="copy-btn"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="instruction-panel m-4 mt-0">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-terminal-amber" />
              <span className="text-xs font-bold text-terminal-amber tracking-wider">DEPLOYMENT PROTOCOL</span>
            </div>
            <div className="space-y-1 text-xs text-terminal-cyan/80 font-mono">
              <p>▸ COPY credentials to MT5 terminal</p>
              <p>▸ DEPLOY ABLE_Bridge_EA.mq5 to chart</p>
              <p>▸ ENABLE WebRequest permissions</p>
              <p>▸ VERIFY connection established</p>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Monitoring */}
        <div className="space-y-4">
          
          {/* Connection Status Panel */}
          <div className="cockpit-panel">
            <div className="panel-header-cockpit">
              <Radio className="w-4 h-4" />
              <span>LINK STATUS</span>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="stat-item">
                  <div className="stat-label">CONNECTION</div>
                  <div className={`stat-value ${isConnected ? 'text-terminal-green' : 'text-terminal-amber'}`}>
                    {isConnected ? 'ACTIVE' : 'STANDBY'}
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">LATENCY</div>
                  <div className="stat-value text-terminal-cyan">
                    {status?.latency ? `${status.latency}ms` : '--'}
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-label">LAST POLL</div>
                  <div className="stat-value text-terminal-cyan">
                    {lastPollTime || '--:--:--'}
                  </div>
                </div>
              </div>

              {/* Signal Strength Indicator */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground tracking-wider">SIGNAL STRENGTH</span>
                  <span className="text-xs font-mono text-terminal-cyan">{signalStrength}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${signalStrength}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Orders Panel */}
          <div className="cockpit-panel">
            <div className="panel-header-cockpit">
              <BarChart3 className="w-4 h-4" />
              <span>OPERATIONS LOG</span>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="order-stat">
                  <div className="order-icon">📊</div>
                  <div>
                    <div className="stat-label">TOTAL</div>
                    <div className="stat-value text-terminal-cyan">{totalOrders}</div>
                  </div>
                </div>
                
                <div className="order-stat">
                  <div className="order-icon text-terminal-green">✓</div>
                  <div>
                    <div className="stat-label">SUCCESS</div>
                    <div className="stat-value text-terminal-green">{successOrders}</div>
                  </div>
                </div>
                
                <div className="order-stat">
                  <div className="order-icon text-terminal-red">✗</div>
                  <div>
                    <div className="stat-label">FAILED</div>
                    <div className="stat-value text-terminal-red">{failedOrders}</div>
                  </div>
                </div>
              </div>

              {/* Success Rate Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground tracking-wider">SUCCESS RATE</span>
                  <span className="text-xs font-mono text-terminal-green">{successRate}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill success"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Info Panel */}
          <div className="cockpit-panel">
            <div className="panel-header-cockpit">
              <Gauge className="w-4 h-4" />
              <span>ACCOUNT STATUS</span>
            </div>
            
            <div className="p-4">
              <div className="space-y-2">
                <div className="info-row">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="text-terminal-cyan font-mono">{mt5Credentials.account || '--'}</span>
                </div>
                <div className="info-row">
                  <span className="text-muted-foreground">Server:</span>
                  <span className="text-terminal-cyan font-mono">{mt5Credentials.server || '--'}</span>
                </div>
                <div className="info-row">
                  <span className="text-muted-foreground">Magic #:</span>
                  <span className="text-terminal-cyan font-mono">{mt5Credentials.magic_number}</span>
                </div>
                {status?.account && (
                  <>
                    <div className="info-row">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="text-terminal-green font-mono">
                        ${status.account.balance?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="text-muted-foreground">Equity:</span>
                      <span className="text-terminal-cyan font-mono">
                        ${status.account.equity?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === Bottom Action Bar === */}
      <div className="cockpit-footer relative z-10">
        <Button
          onClick={onRefreshStatus}
          disabled={isLoadingStatus}
          className="action-button flex-1"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          REFRESH
        </Button>
        
        <Button
          onClick={isConnected ? onDisconnect : onConnect}
          disabled={isConnecting}
          className={`action-button flex-1 ${isConnected ? 'disconnect' : 'connect'}`}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isConnected ? (
            <WifiOff className="w-4 h-4 mr-2" />
          ) : (
            <Wifi className="w-4 h-4 mr-2" />
          )}
          {isConnecting ? 'CONNECTING...' : isConnected ? 'DISCONNECT' : 'CONNECT'}
        </Button>
      </div>
    </div>
  );
};
