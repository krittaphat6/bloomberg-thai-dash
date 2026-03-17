import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { PolymarketMarket, PolymarketService, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { PolymarketLastTrade } from '@/services/PolymarketWebSocketService';
import { PolymarketPriceChart } from './PolymarketPriceChart';
import { PolymarketOrderbook } from './PolymarketOrderbook';
import { PolymarketCalculator } from './PolymarketCalculator';
import { PolymarketCorrelated } from './PolymarketCorrelated';
import { PolymarketAIAnalysis } from './PolymarketAIAnalysis';
import { Calendar, DollarSign, BarChart3 } from 'lucide-react';

interface Props {
  market: PolymarketMarket;
  priceHistory: PriceHistoryPoint[];
  orderbook: OrderbookData | null;
  allMarkets: PolymarketMarket[];
  onSelectMarket: (m: PolymarketMarket) => void;
  liveTrades: PolymarketLastTrade[];
  wsConnected: boolean;
}

export const PolymarketMarketDetail = ({ market, priceHistory, orderbook, allMarkets, onSelectMarket, liveTrades, wsConnected }: Props) => {
  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = outcomes[0]?.price || 0;
  const yesPct = Math.round(yesPrice * 100);
  const vol = PolymarketService.formatVolume(market.volume24hr || 0);
  const liq = PolymarketService.formatVolume(parseFloat(market.liquidity || '0'));
  const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const conditionId = market.conditionId || market.id;

  const change24h = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return null;
    const now = priceHistory[priceHistory.length - 1].p;
    const oneDayAgo = Date.now() / 1000 - 86400;
    const pastPoint = priceHistory.find(p => p.t >= oneDayAgo) || priceHistory[0];
    return (now - pastPoint.p) * 100;
  }, [priceHistory]);

  // Filter trades for this market
  const marketTrades = useMemo(() => {
    const tokenIds = outcomes.map(o => o.tokenId).filter(Boolean);
    return liveTrades.filter(t => tokenIds.includes(t.asset_id)).slice(0, 15);
  }, [liveTrades, outcomes]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <span className="text-[10px] font-bold text-terminal-amber tracking-wider">MARKET DETAIL</span>
        <div className="flex items-center gap-2">
          {wsConnected && (
            <Badge variant="outline" className="text-[8px] border-terminal-green/40 text-terminal-green px-1 py-0">
              <span className="w-1 h-1 rounded-full bg-terminal-green animate-pulse mr-1 inline-block" />
              WS LIVE
            </Badge>
          )}
          <span className="text-[9px] text-muted-foreground">ID: {conditionId.slice(0, 8)}…</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Title & Probability */}
        <div>
          <h3 className="text-sm font-bold text-foreground leading-snug mb-3">{market.question}</h3>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>
              {yesPct}%
            </span>
            <span className="text-xs text-muted-foreground">YES probability</span>
            {change24h !== null && (
              <>
                <span className="text-xs text-muted-foreground">|</span>
                <span className={`text-xs font-bold ${change24h >= 0 ? 'text-terminal-green' : 'text-destructive'}`}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}% 24h
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Vol: {vol}</span>
            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />Liq: {liq}</span>
            {endDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{endDate}</span>}
          </div>
        </div>

        {/* Price Chart */}
        <div className="border border-border rounded bg-card p-3">
          <div className="text-[10px] text-terminal-amber uppercase tracking-wider mb-2">PRICE HISTORY</div>
          <PolymarketPriceChart data={priceHistory} />
        </div>

        {/* Orderbook - Real-time */}
        {orderbook && (
          <div className="border border-border rounded bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">ORDER BOOK</span>
                <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
                <span className="text-[9px] text-terminal-green">REAL-TIME WS</span>
              </div>
            </div>
            <PolymarketOrderbook orderbook={orderbook} isLive={wsConnected} />
          </div>
        )}

        {/* Live Trades Feed */}
        {marketTrades.length > 0 && (
          <div className="border border-border rounded bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">LIVE TRADES</span>
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {marketTrades.map((trade, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/30">
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1 py-0 ${
                      trade.side === 'BUY' ? 'border-terminal-green/50 text-terminal-green' : 'border-destructive/50 text-destructive'
                    }`}
                  >
                    {trade.side}
                  </Badge>
                  <span className="text-foreground">${trade.price} × {parseFloat(trade.size).toLocaleString()}</span>
                  <span className="text-muted-foreground">
                    {new Date(parseInt(trade.timestamp)).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculator */}
        <PolymarketCalculator market={market} />

        {/* AI Analysis */}
        <PolymarketAIAnalysis market={market} priceHistory={priceHistory} orderbook={orderbook} />

        {/* Correlated Markets */}
        <PolymarketCorrelated currentMarket={market} allMarkets={allMarkets} onSelect={onSelectMarket} />

        {/* Description */}
        {market.description && (
          <div className="border border-border rounded bg-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">DETAILS</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{market.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
