import { OrderbookData } from '@/services/PolymarketService';

interface Props {
  orderbook: OrderbookData;
}

export const PolymarketOrderbook = ({ orderbook }: Props) => {
  const bids = (orderbook.bids || []).slice(0, 6);
  const asks = (orderbook.asks || []).slice(0, 6);
  const maxSize = Math.max(
    ...bids.map(b => parseFloat(b.size || '0')),
    ...asks.map(a => parseFloat(a.size || '0')),
    1
  );

  return (
    <div className="grid grid-cols-2 gap-2 text-[10px]">
      {/* Bids */}
      <div>
        <div className="flex justify-between text-muted-foreground mb-1 px-1">
          <span>PRICE</span><span>SIZE</span>
        </div>
        {bids.map((b, i) => {
          const pct = (parseFloat(b.size) / maxSize) * 100;
          return (
            <div key={i} className="relative flex justify-between px-1 py-0.5">
              <div className="absolute inset-0 bg-green-500/10 rounded-sm" style={{ width: `${pct}%` }} />
              <span className="relative text-green-400">${parseFloat(b.price).toFixed(2)}</span>
              <span className="relative text-muted-foreground">{parseFloat(b.size).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      {/* Asks */}
      <div>
        <div className="flex justify-between text-muted-foreground mb-1 px-1">
          <span>PRICE</span><span>SIZE</span>
        </div>
        {asks.map((a, i) => {
          const pct = (parseFloat(a.size) / maxSize) * 100;
          return (
            <div key={i} className="relative flex justify-between px-1 py-0.5">
              <div className="absolute inset-0 right-0 bg-red-500/10 rounded-sm" style={{ width: `${pct}%`, marginLeft: 'auto' }} />
              <span className="relative text-red-400">${parseFloat(a.price).toFixed(2)}</span>
              <span className="relative text-muted-foreground">{parseFloat(a.size).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
