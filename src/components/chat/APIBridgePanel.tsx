import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { BrokerAPI, BrokerConnection, TradovateCredentials, SettradeCredentials, MT5Credentials } from '@/services/brokers/BrokerAPIClient';
import { MT5CockpitDashboard } from './MT5CockpitDashboard';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plug, 
  PlugZap, 
  Activity, 
  Loader2, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Terminal
} from 'lucide-react';

interface APIBridgePanelProps {
  roomId: string;
  userId: string;
  onClose: () => void;
}

export const APIBridgePanel: React.FC<APIBridgePanelProps> = ({ roomId, userId, onClose }) => {
  const [brokerType, setBrokerType] = useState<'tradovate' | 'settrade' | 'mt5'>('tradovate');
  const [connection, setConnection] = useState<BrokerConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [forwardLogs, setForwardLogs] = useState<any[]>([]);
  const [expertsLog, setExpertsLog] = useState<any[]>([]);
  
  // Status
  const [status, setStatus] = useState<{
    connected: boolean;
    latency?: number;
    account?: any;
  } | null>(null);

  // Tradovate credentials
  const [tradovateCredentials, setTradovateCredentials] = useState<TradovateCredentials>({
    username: '',
    password: '',
    cid: '',
    deviceId: 'ABLE-Terminal',
    env: 'demo'
  });

  // Settrade credentials
  const [settradeCredentials, setSettradeCredentials] = useState<SettradeCredentials>({
    appId: '',
    appSecret: '',
    brokerId: '',
    accountNo: '',
    pin: '',
    env: 'uat'
  });

  // MT5 credentials
  const [mt5Credentials, setMt5Credentials] = useState<MT5Credentials>({
    account: '',
    server: '',
    password: '',
    magic_number: 888888
  });

  // Load existing connection
  useEffect(() => {
    const loadConnection = async () => {
      try {
        const conn = await BrokerAPI.getOrCreateConnection(roomId, userId, brokerType);
        setConnection(conn);
        
        // Load saved credentials
        if (conn.credentials) {
          const creds = conn.credentials as unknown;
          if (brokerType === 'tradovate' && (creds as TradovateCredentials).username) {
            setTradovateCredentials(creds as TradovateCredentials);
          } else if (brokerType === 'settrade' && (creds as SettradeCredentials).appId) {
            setSettradeCredentials(creds as SettradeCredentials);
          } else if (brokerType === 'mt5' && (creds as MT5Credentials).account) {
            setMt5Credentials(creds as MT5Credentials);
          }
        }

        // Get status if connected
        if (conn.is_connected) {
          refreshStatus(conn.id);
        }

        // Load forward logs
        const logs = await BrokerAPI.getForwardLogs(conn.id);
        setForwardLogs(logs || []);
      } catch (error) {
        console.error('Failed to load connection:', error);
      }
    };

    loadConnection();
  }, [roomId, userId, brokerType]);

  // Load Experts Log (MT5 commands)
  const loadExpertsLog = useCallback(async () => {
    if (!connection?.id) return;
    
    try {
      const { data: commands } = await supabase
        .from('mt5_commands')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!commands) return;
      
      // Convert to log format
      const logs = commands.flatMap(cmd => {
        const logEntries = [];
        
        // Command received
        logEntries.push({
          id: `${cmd.id}_received`,
          timestamp: cmd.created_at,
          type: 'info',
          message: `📥 Command received: ${cmd.command_type} ${cmd.symbol} ${cmd.volume}`
        });
        
        // Command status
        if (cmd.status === 'completed') {
          logEntries.push({
            id: `${cmd.id}_success`,
            timestamp: cmd.executed_at || cmd.created_at,
            type: 'success',
            message: `✅ Order executed: Ticket #${cmd.ticket_id} @ ${cmd.executed_price}`,
            details: `Volume: ${cmd.executed_volume} lots, SL: ${cmd.sl || 'None'}, TP: ${cmd.tp || 'None'}`
          });
        } else if (cmd.status === 'failed') {
          logEntries.push({
            id: `${cmd.id}_error`,
            timestamp: cmd.executed_at || cmd.created_at,
            type: 'error',
            message: `❌ OrderSend failed: ${cmd.error_code} - ${cmd.error_message || 'Unknown error'}`,
            details: `Command: ${cmd.command_type} ${cmd.symbol} ${cmd.volume} lots`
          });
        } else {
          logEntries.push({
            id: `${cmd.id}_pending`,
            timestamp: cmd.created_at,
            type: 'info',
            message: `⏳ Order pending: ${cmd.command_type} ${cmd.symbol} ${cmd.volume} lots`
          });
        }
        
        return logEntries;
      });
      
      setExpertsLog(logs);
    } catch (error) {
      console.error('Failed to load experts log:', error);
    }
  }, [connection?.id]);

  // Auto-refresh experts log with real-time subscription
  useEffect(() => {
    if (connection?.id) {
      loadExpertsLog();
      
      // Subscribe to real-time updates
      const subscription = supabase
        .channel(`mt5_commands_${connection.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mt5_commands',
            filter: `connection_id=eq.${connection.id}`
          },
          () => {
            loadExpertsLog();
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [connection?.id, loadExpertsLog]);

  const refreshStatus = useCallback(async (connId?: string) => {
    const id = connId || connection?.id;
    if (!id) return;

    setIsLoadingStatus(true);
    try {
      const result = await BrokerAPI.getStatus(id);
      setStatus({
        connected: result.connected,
        latency: result.latency,
        account: result.account
      });
    } catch (error) {
      console.error('Failed to get status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [connection?.id]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      let conn = connection;
      if (!conn) {
        conn = await BrokerAPI.getOrCreateConnection(roomId, userId, brokerType);
        setConnection(conn);
      }

      const credentials = brokerType === 'tradovate' 
        ? tradovateCredentials 
        : brokerType === 'settrade' 
          ? settradeCredentials 
          : mt5Credentials;
      
      // Update credentials first
      await BrokerAPI.updateCredentials(conn.id, credentials as TradovateCredentials | SettradeCredentials | MT5Credentials);

      // Call edge function to connect
      const result = await BrokerAPI.connect(conn.id, credentials as TradovateCredentials | SettradeCredentials | MT5Credentials, brokerType);

      if (!result.success) {
        toast({
          title: '❌ Connection Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
        return;
      }

      // Refresh connection from DB
      const updated = await BrokerAPI.getConnection(conn.id);
      if (updated) {
        setConnection(updated);
      }

      await refreshStatus(conn.id);
      
      toast({
        title: '✅ Connected!',
        description: `Connected to ${brokerType.toUpperCase()}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    try {
      await BrokerAPI.disconnect(connection.id);
      setConnection(prev => prev ? { ...prev, is_active: false, is_connected: false } : null);
      setStatus(null);
      toast({
        title: 'Disconnected',
        description: 'API Bridge disconnected'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-primary" />
          <h2 className="font-bold">API Bridge</h2>
          {status?.connected && (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Connected
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      <Tabs defaultValue="connect" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="connect">Connect</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="experts">Experts</TabsTrigger>
        </TabsList>

        {/* Connect Tab */}
        <TabsContent value="connect" className="flex-1 p-4">
          <div className="space-y-4">
            {/* Broker Selector */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={brokerType === 'tradovate' ? 'default' : 'outline'}
                onClick={() => setBrokerType('tradovate')}
                size="sm"
              >
                Tradovate
              </Button>
              <Button
                variant={brokerType === 'settrade' ? 'default' : 'outline'}
                onClick={() => setBrokerType('settrade')}
                size="sm"
              >
                Settrade
              </Button>
              <Button
                variant={brokerType === 'mt5' ? 'default' : 'outline'}
                onClick={() => setBrokerType('mt5')}
                size="sm"
              >
                MT5
              </Button>
            </div>

            {/* Tradovate Form */}
            {brokerType === 'tradovate' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Environment</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      variant={tradovateCredentials.env === 'demo' ? 'default' : 'outline'}
                      onClick={() => setTradovateCredentials(p => ({ ...p, env: 'demo' }))}
                    >
                      Demo
                    </Button>
                    <Button
                      size="sm"
                      variant={tradovateCredentials.env === 'live' ? 'default' : 'outline'}
                      onClick={() => setTradovateCredentials(p => ({ ...p, env: 'live' }))}
                    >
                      Live
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Username</Label>
                  <Input
                    value={tradovateCredentials.username}
                    onChange={e => setTradovateCredentials(p => ({ ...p, username: e.target.value }))}
                    placeholder="Tradovate username"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    type="password"
                    value={tradovateCredentials.password}
                    onChange={e => setTradovateCredentials(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">CID (Client ID)</Label>
                  <Input
                    value={tradovateCredentials.cid}
                    onChange={e => setTradovateCredentials(p => ({ ...p, cid: e.target.value }))}
                    placeholder="Your CID from API Access"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Settrade Form */}
            {brokerType === 'settrade' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Environment</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      variant={settradeCredentials.env === 'uat' ? 'default' : 'outline'}
                      onClick={() => setSettradeCredentials(p => ({ ...p, env: 'uat' }))}
                    >
                      UAT
                    </Button>
                    <Button
                      size="sm"
                      variant={settradeCredentials.env === 'prod' ? 'default' : 'outline'}
                      onClick={() => setSettradeCredentials(p => ({ ...p, env: 'prod' }))}
                    >
                      Production
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">App ID</Label>
                  <Input
                    value={settradeCredentials.appId}
                    onChange={e => setSettradeCredentials(p => ({ ...p, appId: e.target.value }))}
                    placeholder="Your App ID"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">App Secret</Label>
                  <Input
                    type="password"
                    value={settradeCredentials.appSecret}
                    onChange={e => setSettradeCredentials(p => ({ ...p, appSecret: e.target.value }))}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Broker ID</Label>
                  <Input
                    value={settradeCredentials.brokerId}
                    onChange={e => setSettradeCredentials(p => ({ ...p, brokerId: e.target.value }))}
                    placeholder="e.g., SBITO"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Account No</Label>
                  <Input
                    value={settradeCredentials.accountNo}
                    onChange={e => setSettradeCredentials(p => ({ ...p, accountNo: e.target.value }))}
                    placeholder="Your account number"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">PIN (Optional)</Label>
                  <Input
                    type="password"
                    value={settradeCredentials.pin || ''}
                    onChange={e => setSettradeCredentials(p => ({ ...p, pin: e.target.value }))}
                    placeholder="Trading PIN"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* MT5 Cockpit Dashboard */}
            {brokerType === 'mt5' && (
              <MT5CockpitDashboard
                connection={connection}
                mt5Credentials={mt5Credentials}
                onCredentialsChange={setMt5Credentials}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRefreshStatus={refreshStatus}
                status={status}
                isConnecting={isConnecting}
                isLoadingStatus={isLoadingStatus}
              />
            )}

            {/* Connect/Disconnect Button - Only for non-MT5 */}
            {brokerType !== 'mt5' && (
              <div className="pt-4">
                {connection?.is_connected ? (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleDisconnect}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={handleConnect}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plug className="w-4 h-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="flex-1 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Connection Status</h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => refreshStatus()}
                disabled={isLoadingStatus}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {status ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={status.connected ? 'default' : 'secondary'}>
                      {status.connected ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>
                      )}
                    </Badge>
                  </div>
                  
                  {status.latency && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Latency</span>
                      <span className="text-sm font-mono">
                        <Zap className="w-3 h-3 inline mr-1 text-yellow-500" />
                        {status.latency}ms
                      </span>
                    </div>
                  )}
                </div>

                {status.account && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="text-sm font-semibold mb-2">Account Info</h4>
                    <div className="space-y-1 text-sm">
                      {status.account.name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name</span>
                          <span>{status.account.name}</span>
                        </div>
                      )}
                      {status.account.balance !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-mono">${status.account.balance.toLocaleString()}</span>
                        </div>
                      )}
                      {status.account.equity !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Equity</span>
                          <span className="font-mono">${status.account.equity.toLocaleString()}</span>
                        </div>
                      )}
                      {status.account.positions !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Open Positions</span>
                          <span>{status.account.positions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Connection Stats */}
                {connection && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="text-sm font-semibold mb-2">Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 rounded bg-background">
                        <div className="text-lg font-bold">{connection.total_orders_sent || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Orders</div>
                      </div>
                      <div className="text-center p-2 rounded bg-background">
                        <div className="text-lg font-bold text-green-500">{connection.successful_orders || 0}</div>
                        <div className="text-xs text-muted-foreground">Successful</div>
                      </div>
                      <div className="text-center p-2 rounded bg-background">
                        <div className="text-lg font-bold text-red-500">{connection.failed_orders || 0}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center p-2 rounded bg-background">
                        <div className="text-lg font-bold">{connection.avg_latency_ms || '-'}ms</div>
                        <div className="text-xs text-muted-foreground">Avg Latency</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Not connected</p>
                <p className="text-xs">Connect to see status</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Forward Logs</h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={async () => {
                  if (connection) {
                    const logs = await BrokerAPI.getForwardLogs(connection.id);
                    setForwardLogs(logs || []);
                  }
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              {forwardLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No logs yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {forwardLogs.map(log => (
                    <div 
                      key={log.id}
                      className="p-2 rounded bg-muted/30 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {log.action.toLowerCase().includes('buy') ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          )}
                          <span className="font-semibold">{log.action.toUpperCase()}</span>
                          <span>{log.symbol}</span>
                          <span className="text-muted-foreground">x{log.quantity}</span>
                        </div>
                        <Badge 
                          variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                        {log.latency_ms && (
                          <span className="ml-2">{log.latency_ms}ms</span>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="mt-1 text-red-400 text-[10px]">
                          ❌ {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Experts Tab - MT5 Command Logs */}
        <TabsContent value="experts" className="flex-1 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                MT5 Experts Log
              </h3>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={loadExpertsLog}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              {expertsLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No commands sent yet</p>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {expertsLog.map((log, index) => (
                    <div 
                      key={log.id || index}
                      className={`p-2 rounded border ${
                        log.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        log.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        log.type === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap break-all">
                          {log.message}
                        </span>
                      </div>
                      {log.details && (
                        <div className="mt-1 pl-20 text-xs text-muted-foreground">
                          {log.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
