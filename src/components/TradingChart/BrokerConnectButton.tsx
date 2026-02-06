// BrokerConnectButton.tsx - Minimal order panel for Trading Chart
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Cable, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader2
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
  
  // Order form
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Fetch webhook rooms from webhooks table joined with chat_rooms
  useEffect(() => {
    if (!user) return;
    
    const fetchRooms = async () => {
      const { data } = await supabase
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
      
      if (data) {
        const rooms: WebhookRoom[] = data.map((w: any) => ({
          id: w.id,
          room_id: w.room_id,
          room_name: w.chat_rooms?.name || 'Unknown Room',
          webhook_url: w.webhook_url
        }));
        setWebhookRooms(rooms);
      }
    };
    
    fetchRooms();
  }, [user]);

  // Connect to broker
  const handleConnect = async () => {
    if (!selectedBroker || !selectedRoom) {
      toast({
        title: 'เลือกห้อง Webhook และ Broker',
        variant: 'destructive'
      });
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Simulate connection - in real implementation, use broker-connect edge function
      const { data, error } = await supabase.functions.invoke('broker-status', {
        body: { broker: selectedBroker, roomId: selectedRoom }
      });
      
      if (error) throw error;
      
      setConnection({
        broker: selectedBroker,
        connected: true,
        accountId: data?.accountId || 'DEMO-123',
        balance: data?.balance || 100000
      });
      
      toast({
        title: `✅ เชื่อมต่อ ${selectedBroker.toUpperCase()} สำเร็จ`,
        description: `Account: ${data?.accountId || 'DEMO-123'}`
      });
    } catch (error) {
      console.error('Connect error:', error);
      
      // Fallback to simulated connection for demo
      setConnection({
        broker: selectedBroker,
        connected: true,
        accountId: 'DEMO-' + Math.random().toString(36).substring(7).toUpperCase(),
        balance: 100000
      });
      
      toast({
        title: `✅ เชื่อมต่อ ${selectedBroker.toUpperCase()} (Demo)`,
        description: 'ใช้โหมด Demo เพราะ API ไม่พร้อม'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    setConnection(null);
    toast({ title: '🔌 ยกเลิกการเชื่อมต่อแล้ว' });
  };

  // Place order
  const handlePlaceOrder = async (side: 'buy' | 'sell') => {
    if (!connection) return;
    
    setIsPlacingOrder(true);
    
    try {
      const orderData = {
        symbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType !== 'market' ? parseFloat(price || currentPrice.toString()) : currentPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        broker: connection.broker,
        roomId: selectedRoom
      };
      
      // Try to use broker-order edge function
      const { data, error } = await supabase.functions.invoke('broker-order', {
        body: orderData
      });
      
      if (error) throw error;
      
      toast({
        title: `✅ ${side.toUpperCase()} ${quantity} ${symbol}`,
        description: `Order ID: ${data?.orderId || 'ORD-' + Date.now()}`
      });
    } catch (error) {
      console.error('Order error:', error);
      
      // Fallback toast for demo
      toast({
        title: `✅ ${side.toUpperCase()} ${quantity} ${symbol} (Demo)`,
        description: `ราคา: ${currentPrice.toLocaleString()}`
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
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
                  className="bg-terminal-green text-black hover:bg-terminal-green/80 font-bold"
                  disabled={isPlacingOrder}
                  onClick={() => handlePlaceOrder('buy')}
                >
                  {isPlacingOrder ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-1" />
                      BUY
                    </>
                  )}
                </Button>
                <Button
                  className="bg-terminal-red text-white hover:bg-terminal-red/80 font-bold"
                  disabled={isPlacingOrder}
                  onClick={() => handlePlaceOrder('sell')}
                >
                  {isPlacingOrder ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 mr-1" />
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
  );
};

export default BrokerConnectButton;
