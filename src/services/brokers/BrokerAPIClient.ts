import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callEdgeFunction(functionName: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body)
  });

  return response.json();
}

export interface BrokerConnection {
  id: string;
  room_id: string | null;
  user_id: string;
  broker_type: string;
  credentials: Record<string, unknown>;
  is_active: boolean | null;
  is_connected: boolean | null;
  session_data?: {
    access_token: string;
    token_expiry: number;
    account_id?: number | string;
    account_spec?: string;
  } | null;
  max_position_size: number | null;
  total_orders_sent: number | null;
  successful_orders: number | null;
  failed_orders: number | null;
  avg_latency_ms: number | null;
  last_connected_at: string | null;
  last_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BrokerStatus {
  success: boolean;
  connected: boolean;
  latency?: number;
  account?: {
    id?: number | string;
    name?: string;
    accountNo?: string;
    balance: number;
    equity: number;
    margin?: number;
    buyingPower?: number;
    positions: number;
  };
  error?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  orderStatus?: string;
  latency?: number;
  error?: string;
  logId?: string;
}

export interface TradovateCredentials {
  username: string;
  password: string;
  cid: string;
  deviceId?: string;
  env: 'demo' | 'live';
}

export interface SettradeCredentials {
  appId: string;
  appSecret: string;
  brokerId: string;
  accountNo: string;
  pin?: string;
  env: 'uat' | 'prod';
}

export interface MT5Credentials {
  account: string;
  server: string;
  password?: string;
  magic_number: number;
}

export const BrokerAPI = {
  /**
   * Connect to broker
   */
  async connect(
    connectionId: string, 
    credentials: TradovateCredentials | SettradeCredentials | MT5Credentials, 
    brokerType: 'tradovate' | 'settrade' | 'mt5'
  ): Promise<{ success: boolean; error?: string; session?: unknown }> {
    return callEdgeFunction('broker-connect', {
      connectionId,
      credentials,
      brokerType
    });
  },

  /**
   * Get connection status
   */
  async getStatus(connectionId: string): Promise<BrokerStatus> {
    return callEdgeFunction('broker-status', { connectionId });
  },

  /**
   * Place order
   */
  async placeOrder(params: {
    connectionId: string;
    roomId?: string;
    messageId?: string;
    action: 'buy' | 'sell' | 'close' | 'cancel';
    symbol?: string;
    quantity?: number;
    price?: number;
    orderType?: 'Market' | 'Limit' | 'Stop';
    orderId?: string;
  }): Promise<OrderResult> {
    return callEdgeFunction('broker-order', params);
  },

  /**
   * Disconnect from broker
   */
  async disconnect(connectionId: string): Promise<{ success: boolean; error?: string }> {
    return callEdgeFunction('broker-disconnect', { connectionId });
  },

  /**
   * Create or get connection from database
   */
  async getOrCreateConnection(
    roomId: string, 
    userId: string, 
    brokerType: 'tradovate' | 'settrade' | 'mt5'
  ): Promise<BrokerConnection> {
    // First, check for any CONNECTED connection for this room/broker type
    const { data: connectedList } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('room_id', roomId)
      .eq('broker_type', brokerType)
      .eq('is_connected', true)
      .order('last_connected_at', { ascending: false })
      .limit(1);

    if (connectedList && connectedList.length > 0) {
      return connectedList[0] as BrokerConnection;
    }

    // Check for any existing connection (even if not connected)
    const { data: existingList } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('room_id', roomId)
      .eq('broker_type', brokerType)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (existingList && existingList.length > 0) {
      return existingList[0] as BrokerConnection;
    }

    // Create new
    const { data: newConn, error } = await supabase
      .from('broker_connections')
      .insert({
        room_id: roomId,
        user_id: userId,
        broker_type: brokerType,
        credentials: {},
        is_active: false,
        is_connected: false
      })
      .select()
      .single();

    if (error) throw error;
    return newConn as BrokerConnection;
  },

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string): Promise<BrokerConnection | null> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('id', connectionId)
      .maybeSingle();

    if (error) throw error;
    return data as BrokerConnection | null;
  },

  /**
   * Update credentials
   */
  async updateCredentials(
    connectionId: string, 
    credentials: TradovateCredentials | SettradeCredentials | MT5Credentials
  ): Promise<void> {
    // Cast to any to satisfy Supabase's Json type
    const { error } = await supabase
      .from('broker_connections')
      .update({ credentials: JSON.parse(JSON.stringify(credentials)) })
      .eq('id', connectionId);

    if (error) throw error;
  },

  /**
   * Update max position size
   */
  async updateMaxPositionSize(connectionId: string, maxSize: number): Promise<void> {
    const { error } = await supabase
      .from('broker_connections')
      .update({ max_position_size: maxSize })
      .eq('id', connectionId);

    if (error) throw error;
  },

  /**
   * Get forward logs for a connection
   */
  async getForwardLogs(connectionId: string, limit = 50) {
    const { data, error } = await supabase
      .from('api_forward_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: string): Promise<BrokerConnection[]> {
    const { data, error } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as BrokerConnection[];
  }
};
