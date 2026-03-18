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
  dataStatus?: 'live' | 'polling' | 'offline';
}

export const PolymarketMarketDetail = ({ market, priceHistory, orderbook, allMarkets, onSelectMarket, liveTrades, wsConnected, dataStatus = 'offline' }: Props) => {
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

  const marketTrades = useMemo(() => {
    const tokenIds = outcomes.map(o => o.tokenId).filter(Boolean);
    return liveTrades.filter(t => tokenIds.includes(t.asset_id)).slice(0, 15);
  }, [liveTrades, outcomes]);

  const displayTrades = marketTrades.length > 0 ? marketTrades : liveTrades.slice(0, 15);

  const statusConfig = {
    live: { color: 'bg-terminal-green', text: 'text-terminal-green', border: 'border-terminal-green/40', label: 'WS LIVE' },
    polling: { color: 'bg-terminal-amber', text: 'text-terminal-amber', border: 'border-terminal-amber/40', label: 'POLLING' },
    offline: { color: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/40', label: 'OFFLINE' },
  }[dataStatus];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <span className="text-[10px] font-bold text-terminal-amber tracking-wider">MARKET DETAIL</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[8px] ${statusConfig.border} ${statusConfig.text} px-1 py-0`}>
            <span className={`w-1 h-1 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''} mr-1 inline-block`} />
            {statusConfig.label}
          </Badge>
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

        {/* Buy Yes / Buy No for binary */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded text-sm font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:bg-terminal-green/30 transition-colors">
            Buy Yes {Math.round(yesPrice * 100)}¢
          </button>
          <button className="flex-1 py-2.5 rounded text-sm font-bold bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition-colors">
            Buy No {Math.round((1 - yesPrice) * 100)}¢
          </button>
        </div>

        {/* Price Chart */}
        <div className="border border-border rounded bg-card p-3">
          <div className="text-[10px] text-terminal-amber uppercase tracking-wider mb-2">PRICE HISTORY</div>
          <PolymarketPriceChart data={priceHistory} />
        </div>

        {/* Orderbook */}
        <div className="border border-border rounded bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">ORDER BOOK</span>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />
            <span className={`text-[9px] ${statusConfig.text}`}>{statusConfig.label}</span>
          </div>
          {orderbook ? (
            <PolymarketOrderbook orderbook={orderbook} isLive={wsConnected} />
          ) : (
            <div className="text-center py-4 text-[10px] text-muted-foreground">Waiting for orderbook data...</div>
          )}
        </div>

        {/* Trades */}
        <div className="border border-border rounded bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">
              {dataStatus === 'live' ? 'LIVE TRADES' : 'RECENT TRADES'}
            </span>
            {dataStatus !== 'offline' && (
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />
            )}
            <span className="text-[9px] text-muted-foreground ml-auto">{displayTrades.length} trades</span>
          </div>
          {displayTrades.length > 0 ? (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {displayTrades.map((trade, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/30">
                  <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                    trade.side === 'BUY' ? 'border-terminal-green/50 text-terminal-green' : 'border-destructive/50 text-destructive'
                  }`}>
                    {trade.side}
                  </Badge>
                  <span className="text-foreground">${trade.price} × {parseFloat(trade.size).toLocaleString()}</span>
                  <span className="text-muted-foreground">{new Date(parseInt(trade.timestamp)).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-[10px] text-muted-foreground">Waiting for trades...</div>
          )}
        </div>

        <PolymarketCalculator market={market} />
        <PolymarketAIAnalysis market={market} priceHistory={priceHistory} orderbook={orderbook} />
        <PolymarketCorrelated currentMarket={market} allMarkets={allMarkets} onSelect={onSelectMarket} />

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
