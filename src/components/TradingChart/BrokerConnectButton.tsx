// BrokerConnectButton.tsx - Broker connection & order panel for Trading Chart
// Supports MT5, Tradovate, Settrade with TradingView-style UI

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Cable, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  Loader2,
  X,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface BrokerConnectButtonProps {
  symbol: string;
  currentPrice: number;
}

interface WebhookRoom {
  id: string;
  room_id: string;
  room_name: string;
  webhook_url: string;
}

type BrokerType = 'tradovate' | 'settrade' | 'mt5';
type OrderType = 'market' | 'limit' | 'stop';

interface BrokerConnection {
  id: string;
  broker: BrokerType;
  connected: boolean;
  accountId?: string;
  balance?: number;
}

export const BrokerConnectButton: React.FC<BrokerConnectButtonProps> = ({
  symbol,
  currentPrice
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [webhookRooms, setWebhookRooms] = useState<WebhookRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | ''>('');
  const [connection, setConnection] = useState<BrokerConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // MT5 full order panel
  const [showMT5Panel, setShowMT5Panel] = useState(false);
  
  // Order form
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState('0.01');
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Fetch webhook rooms and existing connections
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      // Fetch webhook rooms
      const { data: webhooksData } = await supabase
        .from('webhooks')
        .select(`
          id,
          room_id,
          webhook_url,
          chat_rooms:room_id (
            id,
            name
          )
        `)
        .eq('is_active', true);
      
      if (webhooksData) {
        const rooms: WebhookRoom[] = webhooksData.map((w: any) => ({
          id: w.id,
          room_id: w.room_id,
          room_name: w.chat_rooms?.name || 'Unknown Room',
          webhook_url: w.webhook_url
        }));
        setWebhookRooms(rooms);
      }
      
      // Check for existing connections
      const { data: connData } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .limit(1)
        .single();
      
      if (connData) {
        setConnection({
          id: connData.id,
          broker: connData.broker_type as BrokerType,
          connected: true,
          accountId: (connData.session_data as any)?.account_id || connData.id.slice(0, 8).toUpperCase(),
          balance: 100000
        });
        setSelectedBroker(connData.broker_type as BrokerType);
      }
    };
    
    fetchData();
  }, [user]);

  // Connect to broker - creates real connection in database
  const handleConnect = async () => {
    if (!selectedBroker) {
      toast({
        title: 'เลือก Broker',
        variant: 'destructive'
      });
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Create broker connection in database
      const { data, error } = await supabase
        .from('broker_connections')
        .insert({
          user_id: user?.id,
          broker_type: selectedBroker,
          room_id: selectedRoom || null,
          is_active: true,
          is_connected: true,
          credentials: {},
          session_data: {
            account_id: `${selectedBroker.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
            connected_at: new Date().toISOString()
          }
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const accountId = (data.session_data as any)?.account_id || data.id.slice(0, 8).toUpperCase();
      
      setConnection({
        id: data.id,
        broker: selectedBroker,
        connected: true,
        accountId,
        balance: 100000
      });
      
      toast({
        title: `✅ เชื่อมต่อ ${selectedBroker.toUpperCase()} สำเร็จ`,
        description: `Account: ${accountId}`
      });
      
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: '❌ เชื่อมต่อไม่สำเร็จ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect - updates database
  const handleDisconnect = async () => {
    if (connection?.id) {
      await supabase
        .from('broker_connections')
        .update({ is_connected: false, is_active: false })
        .eq('id', connection.id);
    }
    setConnection(null);
    toast({ title: '🔌 ยกเลิกการเชื่อมต่อแล้ว' });
  };

  // Place order - for MT5, open full panel; for others, quick order
  const handlePlaceOrder = async (side: 'buy' | 'sell') => {
    if (!connection) return;
    
    // For MT5, open the full order panel
    if (connection.broker === 'mt5') {
      setShowMT5Panel(true);
      return;
    }
    
    setIsPlacingOrder(true);
    
    try {
      const normalizedSymbol = symbol.replace('USDT', 'USD').replace('/', '');
      
      const orderData = {
        connectionId: connection.id,
        symbol: normalizedSymbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType !== 'market' ? parseFloat(price || currentPrice.toString()) : currentPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        broker: connection.broker,
        roomId: selectedRoom
      };
      
      // Use broker-order edge function
      const { data, error } = await supabase.functions.invoke('broker-order', {
        body: orderData
      });
      
      if (error) throw error;
      
      toast({
        title: `✅ ${side.toUpperCase()} ${quantity} ${symbol}`,
        description: `Order ID: ${data?.orderId || 'ORD-' + Date.now()}`
      });
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: '❌ Order failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Handle submitting order via MT5 commands
  const handleSubmitMT5Order = async (side: 'buy' | 'sell') => {
    if (!connection) return;
    setIsPlacingOrder(true);

    try {
      const normalizedSymbol = symbol.replace('USDT', 'USD').replace('/', '');
      const commandType = orderType === 'market' 
        ? (side === 'buy' ? 'BUY' : 'SELL')
        : orderType === 'limit'
          ? (side === 'buy' ? 'BUY_LIMIT' : 'SELL_LIMIT')
          : (side === 'buy' ? 'BUY_STOP' : 'SELL_STOP');

      const { data, error } = await supabase
        .from('mt5_commands')
        .insert({
          connection_id: connection.id,
          command_type: commandType,
          symbol: normalizedSymbol,
          volume: parseFloat(quantity),
          price: orderType !== 'market' ? parseFloat(price || currentPrice.toString()) : null,
          sl: stopLoss ? parseFloat(stopLoss) : null,
          tp: takeProfit ? parseFloat(takeProfit) : null,
          deviation: 20,
          comment: `ABLE-${Date.now()}`,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: `✅ ${side.toUpperCase()} Order Submitted`,
        description: `${quantity} lots ${normalizedSymbol}`
      });

      // Poll for result
      pollOrderStatus(data.id);

    } catch (error: any) {
      toast({
        title: '❌ Order Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Poll order status
  const pollOrderStatus = async (commandId: string) => {
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      const { data } = await supabase
        .from('mt5_commands')
        .select('*')
        .eq('id', commandId)
        .single();

      if (data?.status === 'executed') {
        toast({
          title: '✅ Order Executed',
          description: `Ticket #${data.ticket_id} @ ${data.executed_price}`
        });
        return;
      }

      if (data?.status === 'error') {
        toast({
          title: '❌ Execution Error',
          description: data.error_message,
          variant: 'destructive'
        });
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 1000);
      }
    };

    setTimeout(poll, 1000);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${connection?.connected ? 'text-terminal-green' : 'text-muted-foreground'}`}
            title="Broker Connection"
          >
            {connection?.connected ? <Wifi className="w-4 h-4" /> : <Cable className="w-4 h-4" />}
          </Button>
        </SheetTrigger>
        
        <SheetContent className="w-80 bg-card border-terminal-green/20">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-terminal-green font-mono">
              <Cable className="w-5 h-5" />
              Broker Connect
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 space-y-4">
            {!connection ? (
              // Connection setup
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Webhook Room</label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="bg-muted/30 border-terminal-green/20">
                    <SelectValue placeholder="เลือกห้อง Webhook..." />
                  </SelectTrigger>
                  <SelectContent>
                    {webhookRooms.length === 0 ? (
                      <SelectItem value="_" disabled>
                        ไม่พบ Webhook Room - สร้างในMessenger
                      </SelectItem>
                    ) : (
                      webhookRooms.map(room => (
                        <SelectItem key={room.id} value={room.room_id}>
                          {room.room_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Broker</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['tradovate', 'settrade', 'mt5'] as BrokerType[]).map(broker => (
                    <Button
                      key={broker}
                      variant={selectedBroker === broker ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs ${
                        selectedBroker === broker 
                          ? 'bg-terminal-green text-black' 
                          : 'border-terminal-green/30 text-terminal-green'
                      }`}
                      onClick={() => setSelectedBroker(broker)}
                    >
                      {broker.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button
                className="w-full bg-terminal-green text-black hover:bg-terminal-green/80"
                disabled={!selectedRoom || !selectedBroker || isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังเชื่อมต่อ...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 mr-2" />
                    เชื่อมต่อ
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Order panel
            <div className="space-y-4">
              {/* Connection status */}
              <div className="flex items-center justify-between p-2 rounded bg-terminal-green/10 border border-terminal-green/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-terminal-green" />
                  <div>
                    <p className="text-xs font-bold text-terminal-green">{connection.broker.toUpperCase()}</p>
                    <p className="text-[10px] text-muted-foreground">{connection.accountId}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-terminal-red hover:bg-terminal-red/10"
                  onClick={handleDisconnect}
                >
                  <WifiOff className="w-3 h-3 mr-1" />
                  ตัด
                </Button>
              </div>
              
              {/* Symbol & Price */}
              <div className="text-center py-2 border-b border-border">
                <p className="font-mono font-bold text-lg text-foreground">{symbol}</p>
                <p className="text-2xl font-bold text-terminal-green">
                  {currentPrice.toLocaleString()}
                </p>
              </div>
              
              {/* Order Type */}
              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
                <TabsList className="w-full grid grid-cols-3 bg-muted/30">
                  <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
                  <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
                  <TabsTrigger value="stop" className="text-xs">Stop</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Quantity */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">จำนวน</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-muted/30 border-terminal-green/20 font-mono"
                  min="0.001"
                  step="0.001"
                />
              </div>
              
              {/* Price (for limit/stop) */}
              {orderType !== 'market' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ราคา</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-muted/30 border-terminal-green/20 font-mono"
                    placeholder={currentPrice.toString()}
                  />
                </div>
              )}
              
              {/* SL/TP */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-terminal-red mb-1 block">Stop Loss</label>
                  <Input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="bg-muted/30 border-terminal-red/20 font-mono text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-xs text-terminal-green mb-1 block">Take Profit</label>
                  <Input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="bg-muted/30 border-terminal-green/20 font-mono text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>
              
              {/* Buy/Sell Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12 bg-terminal-green text-black hover:bg-terminal-green/80 font-bold text-lg"
                  disabled={isPlacingOrder}
                  onClick={() => connection.broker === 'mt5' 
                    ? handleSubmitMT5Order('buy') 
                    : handlePlaceOrder('buy')
                  }
                >
                  {isPlacingOrder ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5 mr-2" />
                      BUY
                    </>
                  )}
                </Button>
                <Button
                  className="h-12 bg-terminal-red text-white hover:bg-terminal-red/80 font-bold text-lg"
                  disabled={isPlacingOrder}
                  onClick={() => connection.broker === 'mt5' 
                    ? handleSubmitMT5Order('sell') 
                    : handlePlaceOrder('sell')
                  }
                >
                  {isPlacingOrder ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <TrendingDown className="w-5 h-5 mr-2" />
                      SELL
                    </>
                  )}
                </Button>
              </div>
              
              {/* Balance */}
              <div className="text-center pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-mono font-bold text-terminal-amber">
                  ${connection.balance?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
};

export default BrokerConnectButton;
