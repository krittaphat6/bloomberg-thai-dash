// TradingViewOrderPanel - Minimal TradingView-style order panel 
// Based on reference images - compact & professional design

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  X, 
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TradingViewOrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  brokerType: 'tradovate' | 'settrade' | 'mt5';
  accountId: string;
  symbol: string;
  currentPrice: number;
  balance?: number;
}

type OrderType = 'market' | 'limit' | 'stop';

export const TradingViewOrderPanel: React.FC<TradingViewOrderPanelProps> = ({
  isOpen,
  onClose,
  connectionId,
  brokerType,
  accountId,
  symbol,
  currentPrice,
  balance = 100000
}) => {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [volume, setVolume] = useState('0.01');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalize symbol for MT5
  const normalizedSymbol = symbol.replace('USDT', 'USD').replace('/', '');

  const handleOrder = async (side: 'buy' | 'sell') => {
    setIsSubmitting(true);

    try {
      const commandType = orderType === 'market' 
        ? (side === 'buy' ? 'BUY' : 'SELL')
        : orderType === 'limit'
          ? (side === 'buy' ? 'BUY_LIMIT' : 'SELL_LIMIT')
          : (side === 'buy' ? 'BUY_STOP' : 'SELL_STOP');

      // Insert command to mt5_commands table
      const { data, error } = await supabase
        .from('mt5_commands')
        .insert({
          connection_id: connectionId,
          command_type: commandType,
          symbol: normalizedSymbol,
          volume: parseFloat(volume),
          price: orderType !== 'market' ? currentPrice : null,
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
        description: `${volume} lots ${normalizedSymbol}`
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
      setIsSubmitting(false);
    }
  };

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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-80 bg-card border-terminal-green/20 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-terminal-green font-mono">
              <Wifi className="w-4 h-4" />
              Broker Connect
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Connected Account */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-terminal-green/10 border border-terminal-green/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-terminal-green" />
              <div>
                <p className="text-sm font-bold text-terminal-green">{brokerType.toUpperCase()}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{accountId}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-terminal-red hover:bg-terminal-red/10"
              onClick={onClose}
            >
              <WifiOff className="w-3 h-3 mr-1" />
              ตัด
            </Button>
          </div>

          {/* Symbol & Price */}
          <div className="text-center py-3 border-b border-border">
            <p className="text-lg font-mono font-bold text-foreground">{normalizedSymbol}</p>
            <p className="text-2xl font-bold text-terminal-green font-mono">
              {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
            </p>
          </div>

          {/* Order Type Tabs */}
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
            <TabsList className="w-full grid grid-cols-3 bg-muted/30 h-9">
              <TabsTrigger value="market" className="text-xs font-mono">Market</TabsTrigger>
              <TabsTrigger value="limit" className="text-xs font-mono">Limit</TabsTrigger>
              <TabsTrigger value="stop" className="text-xs font-mono">Stop</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Volume */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">จำนวน</label>
            <Input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="h-10 bg-muted/30 border-terminal-green/20 font-mono text-center"
              step="0.01"
              min="0.01"
            />
          </div>

          {/* SL/TP Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-terminal-red mb-1 block">Stop Loss</label>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="h-9 bg-muted/30 border-terminal-red/20 font-mono text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs text-terminal-green mb-1 block">Take Profit</label>
              <Input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="h-9 bg-muted/30 border-terminal-green/20 font-mono text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Buy/Sell Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              className="h-12 bg-terminal-green text-black hover:bg-terminal-green/80 font-bold text-lg"
              disabled={isSubmitting}
              onClick={() => handleOrder('buy')}
            >
              {isSubmitting ? (
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
              disabled={isSubmitting}
              onClick={() => handleOrder('sell')}
            >
              {isSubmitting ? (
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
          <div className="text-center pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-mono font-bold text-terminal-amber">
              ${balance.toLocaleString()}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TradingViewOrderPanel;
