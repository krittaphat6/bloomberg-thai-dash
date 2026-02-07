// MT5 Order Panel - Full-featured order form for real MT5 trading
// Matches the UI in reference image 5

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  X, 
  Send, 
  Loader2,
  Minus,
  Plus,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MT5OrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  accountId: string;
  balance: number;
  currentSymbol: string;
  currentPrice: number;
}

type OrderType = 'market' | 'limit' | 'stop' | 'close' | 'modify';
type OrderSide = 'buy' | 'sell';

const MT5_SYMBOLS = [
  'XAUUSD', 'XAGUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
  'BTCUSD', 'ETHUSD',
  'US30', 'US100', 'US500',
  'USOIL', 'UKOIL'
];

export const MT5OrderPanel: React.FC<MT5OrderPanelProps> = ({
  isOpen,
  onClose,
  connectionId,
  accountId,
  balance,
  currentSymbol,
  currentPrice
}) => {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [symbol, setSymbol] = useState(currentSymbol || 'XAUUSD');
  const [volume, setVolume] = useState(0.01);
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [slippage, setSlippage] = useState(20);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update symbol when prop changes
  useEffect(() => {
    if (currentSymbol) {
      const normalizedSymbol = currentSymbol.replace('USDT', 'USD').replace('/', '');
      if (MT5_SYMBOLS.includes(normalizedSymbol)) {
        setSymbol(normalizedSymbol);
      }
    }
  }, [currentSymbol]);

  // Adjust volume
  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0.01, Math.round((volume + delta) * 100) / 100);
    setVolume(newVolume);
  };

  // Submit order to MT5 via Edge Function
  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    
    try {
      const orderData = {
        connectionId,
        commandType: orderType === 'market' ? (orderSide === 'buy' ? 'BUY' : 'SELL') : 
                     orderType === 'limit' ? (orderSide === 'buy' ? 'BUY_LIMIT' : 'SELL_LIMIT') :
                     orderType === 'stop' ? (orderSide === 'buy' ? 'BUY_STOP' : 'SELL_STOP') :
                     orderType.toUpperCase(),
        symbol,
        volume,
        price: orderType !== 'market' && price ? parseFloat(price) : undefined,
        sl: stopLoss ? parseFloat(stopLoss) : undefined,
        tp: takeProfit ? parseFloat(takeProfit) : undefined,
        deviation: slippage,
        comment: comment || `ABLE-${Date.now()}`
      };

      // Insert command to mt5_commands table
      const { data, error } = await supabase
        .from('mt5_commands')
        .insert({
          connection_id: connectionId,
          command_type: orderData.commandType,
          symbol: orderData.symbol,
          volume: orderData.volume,
          price: orderData.price,
          sl: orderData.sl,
          tp: orderData.tp,
          deviation: orderData.deviation,
          comment: orderData.comment,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: `✅ Order Submitted`,
        description: (
          <div className="font-mono text-xs space-y-1">
            <p>Type: {orderData.commandType}</p>
            <p>Symbol: {symbol}</p>
            <p>Volume: {volume} lots</p>
            {orderData.sl && <p>SL: {orderData.sl}</p>}
            {orderData.tp && <p>TP: {orderData.tp}</p>}
          </div>
        )
      });

      // Poll for execution result
      pollCommandStatus(data.id);
      
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: '❌ Order Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll command status
  const pollCommandStatus = async (commandId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    const poll = async () => {
      const { data } = await supabase
        .from('mt5_commands')
        .select('*')
        .eq('id', commandId)
        .single();
      
      if (data?.status === 'executed') {
        toast({
          title: '✅ Order Executed!',
          description: `Ticket: ${data.ticket_id} @ ${data.executed_price}`
        });
        return;
      }
      
      if (data?.status === 'error') {
        toast({
          title: '❌ Order Error',
          description: data.error_message || 'Unknown error',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-zinc-900 border border-terminal-green/30 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-terminal-green" />
            <span className="font-mono font-bold text-white">Test Order - MT5 Bridge</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Order Type Tabs */}
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)} className="p-4">
          <TabsList className="w-full grid grid-cols-5 bg-muted/30">
            <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
            <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
            <TabsTrigger value="stop" className="text-xs">Stop</TabsTrigger>
            <TabsTrigger value="close" className="text-xs">Close</TabsTrigger>
            <TabsTrigger value="modify" className="text-xs">Modify</TabsTrigger>
          </TabsList>

          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant={orderSide === 'buy' ? 'default' : 'outline'}
              onClick={() => setOrderSide('buy')}
              className={`h-12 ${orderSide === 'buy' ? 'bg-terminal-green text-black font-bold' : 'border-terminal-green/30 text-terminal-green'}`}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Buy
            </Button>
            <Button
              variant={orderSide === 'sell' ? 'default' : 'outline'}
              onClick={() => setOrderSide('sell')}
              className={`h-12 ${orderSide === 'sell' ? 'bg-terminal-red text-white font-bold' : 'border-terminal-red/30 text-terminal-red'}`}
            >
              <TrendingDown className="w-5 h-5 mr-2" />
              Sell
            </Button>
          </div>

          {/* Symbol Selection */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-zinc-400">Symbol</Label>
            <div className="flex gap-2">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="flex-1 h-10 bg-black/50 border-terminal-green/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MT5_SYMBOLS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-24 h-10 bg-black/50 border-terminal-green/20 font-mono"
                placeholder="Custom"
              />
            </div>
          </div>

          {/* Volume (Lots) */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-zinc-400">Volume (Lots)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustVolume(-0.01)}
                className="h-10 w-10 border-terminal-green/20"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value) || 0.01)}
                className="flex-1 h-10 bg-black/50 border-terminal-green/20 font-mono text-center text-lg"
                step="0.01"
                min="0.01"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustVolume(0.01)}
                className="h-10 w-10 border-terminal-green/20"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Price (for limit/stop orders) */}
          {orderType !== 'market' && orderType !== 'close' && (
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-zinc-400">Price</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 bg-black/50 border-terminal-green/20 font-mono"
                placeholder={currentPrice.toString()}
              />
            </div>
          )}

          {/* Stop Loss */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-terminal-red flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Stop Loss (Optional)
            </Label>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="h-10 bg-black/50 border-terminal-red/20 font-mono"
              placeholder="Enter SL price"
            />
          </div>

          {/* Take Profit */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-terminal-green flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Take Profit (Optional)
            </Label>
            <Input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="h-10 bg-black/50 border-terminal-green/20 font-mono"
              placeholder="Enter TP price"
            />
          </div>

          {/* Slippage */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-zinc-400">Slippage (Points)</Label>
            <Input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseInt(e.target.value) || 20)}
              className="h-10 bg-black/50 border-terminal-green/20 font-mono"
            />
          </div>

          {/* Comment */}
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-zinc-400">Comment</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-10 bg-black/50 border-terminal-green/20 font-mono"
              placeholder="Order comment"
            />
          </div>

          {/* Order Summary */}
          <div className="mt-4 p-3 bg-black/50 rounded border border-terminal-green/20 font-mono text-xs space-y-1">
            <p className="font-bold text-terminal-green">Order Summary:</p>
            <p>Type: <span className="text-white">{orderType.toUpperCase()}</span></p>
            <p>Action: <span className={orderSide === 'buy' ? 'text-terminal-green' : 'text-terminal-red'}>
              {orderSide.toUpperCase()}
            </span></p>
            <p>Symbol: <span className="text-white">{symbol}</span></p>
            <p>Volume: <span className="text-white">{volume} lots</span></p>
          </div>

          {/* Tip */}
          <div className="mt-3 flex items-center gap-2 text-xs text-terminal-amber">
            <span>💡</span>
            <span>Tip: Check MT5 Market Watch for exact symbol name</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 border-zinc-600 text-zinc-400"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className={`h-12 font-bold ${
                orderSide === 'buy' 
                  ? 'bg-terminal-green hover:bg-terminal-green/80 text-black' 
                  : 'bg-terminal-red hover:bg-terminal-red/80 text-white'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Order
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default MT5OrderPanel;
