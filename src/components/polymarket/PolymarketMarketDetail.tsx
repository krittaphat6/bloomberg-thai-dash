import { Badge } from '@/components/ui/badge';
import { PolymarketMarket, PolymarketService, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { PolymarketPriceChart } from './PolymarketPriceChart';
import { PolymarketOrderbook } from './PolymarketOrderbook';
import { Calendar, DollarSign, BarChart3 } from 'lucide-react';

interface Props {
  market: PolymarketMarket;
  priceHistory: PriceHistoryPoint[];
  orderbook: OrderbookData | null;
}

export const PolymarketMarketDetail = ({ market, priceHistory, orderbook }: Props) => {
  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = outcomes[0]?.price || 0;
  const yesPct = Math.round(yesPrice * 100);
  const vol = PolymarketService.formatVolume(market.volume24hr || 0);
  const liq = PolymarketService.formatVolume(parseFloat(market.liquidity || '0'));
  const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-foreground leading-snug mb-2">{market.question}</h3>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-2xl font-bold ${yesPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {yesPct}%
          </span>
          <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400">YES</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Vol: {vol}</span>
          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />Liq: {liq}</span>
          {endDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{endDate}</span>}
        </div>
      </div>

      {/* Price Chart */}
      <div className="border border-border rounded bg-card/50 p-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">PROBABILITY HISTORY</div>
        <PolymarketPriceChart data={priceHistory} />
      </div>

      {/* Orderbook */}
      {orderbook && (
        <div className="border border-border rounded bg-card/50 p-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">ORDER BOOK</div>
          <PolymarketOrderbook orderbook={orderbook} />
        </div>
      )}

      {/* Description */}
      {market.description && (
        <div className="border border-border rounded bg-card/50 p-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">DETAILS</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-4">{market.description}</p>
        </div>
      )}
    </div>
  );
};
