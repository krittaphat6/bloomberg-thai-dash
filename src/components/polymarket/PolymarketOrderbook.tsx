import { useMemo } from 'react';
import { OrderbookData } from '@/services/PolymarketService';

interface Props {
  orderbook: OrderbookData;
  isLive?: boolean;
}

export const PolymarketOrderbook = ({ orderbook, isLive }: Props) => {
  const bids = useMemo(() => (orderbook.bids || []).slice(0, 8), [orderbook]);
  const asks = useMemo(() => (orderbook.asks || []).slice(0, 8), [orderbook]);

  const maxSize = useMemo(() => Math.max(
    ...bids.map(b => parseFloat(b.size || '0')),
    ...asks.map(a => parseFloat(a.size || '0')),
    1
  ), [bids, asks]);

  const spread = useMemo(() => {
    if (bids.length > 0 && asks.length > 0) {
      return (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(4);
    }
    return null;
  }, [bids, asks]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 text-[10px]">
        {/* Bids */}
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5 px-1 font-bold">
            <span>BIDS (YES)</span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />}
            <span className="ml-auto">SIZE</span>
          </div>
          {bids.map((b, i) => {
            const pct = (parseFloat(b.size) / maxSize) * 100;
            return (
              <div key={i} className="relative flex justify-between px-1 py-[3px] rounded-sm mb-[1px]">
                <div className="absolute inset-0 bg-green-500/10 rounded-sm" style={{ width: `${pct}%` }} />
                <span className="relative text-green-400 font-mono">${parseFloat(b.price).toFixed(2)}</span>
                <span className="relative text-muted-foreground font-mono">{parseFloat(b.size).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        {/* Asks */}
        <div>
          <div className="flex justify-between text-muted-foreground mb-1.5 px-1 font-bold">
            <span>ASKS (YES)</span><span>SIZE</span>
          </div>
          {asks.map((a, i) => {
            const pct = (parseFloat(a.size) / maxSize) * 100;
            return (
              <div key={i} className="relative flex justify-between px-1 py-[3px] rounded-sm mb-[1px]">
                <div className="absolute inset-0 right-0 bg-red-500/10 rounded-sm" style={{ width: `${pct}%`, marginLeft: 'auto' }} />
                <span className="relative text-red-400 font-mono">${parseFloat(a.price).toFixed(2)}</span>
                <span className="relative text-muted-foreground font-mono">{parseFloat(a.size).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
      {spread && (
        <div className="text-center mt-2 text-[9px] text-muted-foreground">
          Spread: <span className="text-amber-400 font-mono">${spread}</span>
        </div>
      )}
    </div>
  );
};
