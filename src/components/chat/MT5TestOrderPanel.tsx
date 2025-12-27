import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Send, X, Target, Shield, Loader2 } from 'lucide-react';

interface MT5TestOrderPanelProps {
  connectionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MT5TestOrderPanel: React.FC<MT5TestOrderPanelProps> = ({
  connectionId,
  isOpen,
  onClose
}) => {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'close' | 'modify'>('market');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [volume, setVolume] = useState(0.01);
  const [price, setPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [deviation, setDeviation] = useState(20);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const popularSymbols = [
    'XAUUSD',   // Gold
    'BTCUSD',   // Bitcoin
    'ETHUSD',   // Ethereum
    'EURUSD',   // Euro
    'GBPUSD',   // Pound
    'USDJPY',   // Yen
    'USDCHF',   // Swiss Franc
    'AUDUSD',   // Aussie
    'USDCAD',   // Canadian
    'NZDUSD',   // Kiwi
    'EURJPY',   // Euro/Yen
    'GBPJPY',   // Pound/Yen
    'XAGUSD',   // Silver
    'US30',     // Dow Jones
    'NAS100',   // Nasdaq
    'SPX500',   // S&P 500
  ];

  const getCommandType = (): string => {
    if (orderType === 'close') return 'close';
    if (orderType === 'modify') return 'modify_sl_tp';
    
    if (orderType === 'market') {
      return action === 'buy' ? 'buy' : 'sell';
    } else if (orderType === 'limit') {
      return action === 'buy' ? 'buy_limit' : 'sell_limit';
    } else if (orderType === 'stop') {
      return action === 'buy' ? 'buy_stop' : 'sell_stop';
    }
    
    return 'buy';
  };

  const handleSubmit = async () => {
    const now = Date.now();
    
    // Prevent double submission with 2 second debounce
    if (isSubmitting || (now - lastSubmitTime < 2000)) {
      toast({
        title: '⏳ Please wait',
        description: 'Order is being processed...',
      });
      return;
    }

    if (!connectionId) {
      toast({
        title: 'Error',
        description: 'No connection ID available',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setLastSubmitTime(now);

    // Warning for crypto symbols
    if (['BTCUSD', 'ETHUSD'].includes(symbol.toUpperCase())) {
      toast({
        title: '⚠️ Crypto Symbol Notice',
        description: 'Make sure this symbol exists in your MT5. It might be named BTCUSDT, BTC/USD, or not available.',
      });
    }
    
    try {
      const commandType = getCommandType();

      const payload = {
        connection_id: connectionId,
        command_type: commandType,
        symbol: symbol.toUpperCase(),
        volume: volume,
        price: price ? Number(price) : 0,
        sl: stopLoss ? Number(stopLoss) : 0,
        tp: takeProfit ? Number(takeProfit) : 0,
        deviation: deviation,
        comment: comment || `ABLE_${commandType}`
      };

      const { data, error } = await supabase
        .from('mt5_commands')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '✅ Order Sent to MT5',
        description: `${commandType.toUpperCase()} ${volume} lots ${symbol}`,
      });

      // Keep isSubmitting true for 2 seconds to prevent double-click
      setTimeout(() => setIsSubmitting(false), 2000);
      setTimeout(() => onClose(), 1000);
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Send className="w-5 h-5 text-primary" />
            Test Order - MT5 Bridge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Type Tabs */}
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
              <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
              <TabsTrigger value="stop" className="text-xs">Stop</TabsTrigger>
              <TabsTrigger value="close" className="text-xs">Close</TabsTrigger>
              <TabsTrigger value="modify" className="text-xs">Modify</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Buy/Sell Selection */}
          {['market', 'limit', 'stop'].includes(orderType) && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={action === 'buy' ? 'default' : 'outline'}
                onClick={() => setAction('buy')}
                className={action === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Buy
              </Button>
              <Button
                type="button"
                variant={action === 'sell' ? 'default' : 'outline'}
                onClick={() => setAction('sell')}
                className={action === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Sell
              </Button>
            </div>
          )}

          {/* Symbol Selection */}
          {orderType !== 'close' && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Symbol</Label>
              <div className="flex gap-2">
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularSymbols.map(sym => (
                      <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Custom"
                  className="w-24"
                />
              </div>
            </div>
          )}

          {/* Volume */}
          {orderType !== 'close' && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Volume (Lots)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVolume(Math.max(0.01, +(volume - 0.01).toFixed(2)))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  step={0.01}
                  min={0.01}
                  max={10}
                  className="text-center flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVolume(Math.min(10, +(volume + 0.01).toFixed(2)))}
                >
                  +
                </Button>
              </div>
            </div>
          )}

          {/* Price (for Limit/Stop orders) */}
          {['limit', 'stop'].includes(orderType) && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Price</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                step={0.01}
              />
            </div>
          )}

          {/* Stop Loss */}
          {['market', 'limit', 'stop', 'modify'].includes(orderType) && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                Stop Loss (Optional)
              </Label>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Enter SL price"
                step={0.01}
              />
            </div>
          )}

          {/* Take Profit */}
          {['market', 'limit', 'stop', 'modify'].includes(orderType) && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                Take Profit (Optional)
              </Label>
              <Input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Enter TP price"
                step={0.01}
              />
            </div>
          )}

          {/* Deviation (Market only) */}
          {orderType === 'market' && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Slippage (Points)</Label>
              <Input
                type="number"
                value={deviation}
                onChange={(e) => setDeviation(Number(e.target.value))}
                placeholder="Deviation"
              />
            </div>
          )}

          {/* Comment */}
          {orderType !== 'close' && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Comment</Label>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Order comment"
                maxLength={31}
              />
            </div>
          )}

          {/* Summary */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm">
            <p className="font-medium text-foreground mb-2">Order Summary:</p>
            <div className="space-y-1 text-muted-foreground">
              <p>Type: <span className="text-foreground">{orderType.toUpperCase()}</span></p>
              {orderType !== 'close' && (
                <>
                  <p>Action: <span className={action === 'buy' ? 'text-green-500' : 'text-red-500'}>{action.toUpperCase()}</span></p>
                  <p>Symbol: <span className="text-foreground">{symbol}</span></p>
                  <p>Volume: <span className="text-foreground">{volume} lots</span></p>
                  {price && <p>Price: <span className="text-foreground">{price}</span></p>}
                  {stopLoss && <p>SL: <span className="text-red-500">{stopLoss}</span></p>}
                  {takeProfit && <p>TP: <span className="text-green-500">{takeProfit}</span></p>}
                </>
              )}
              {orderType === 'close' && <p className="text-amber-500">Will close all positions</p>}
            </div>
          </div>

          {/* Tip for crypto symbols */}
          <p className="text-xs text-muted-foreground">
            💡 Tip: Check MT5 Market Watch for exact symbol name
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className={`flex-1 ${action === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Order
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
