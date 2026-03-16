import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { PolymarketMarket, PolymarketService, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { PolymarketPriceChart } from './PolymarketPriceChart';
import { PolymarketOrderbook } from './PolymarketOrderbook';
import { PolymarketCalculator } from './PolymarketCalculator';
import { PolymarketCorrelated } from './PolymarketCorrelated';
import { PolymarketAIAnalysis } from './PolymarketAIAnalysis';
import { Calendar, DollarSign, BarChart3, TrendingUp, Zap } from 'lucide-react';

interface Props {
  market: PolymarketMarket;
  priceHistory: PriceHistoryPoint[];
  orderbook: OrderbookData | null;
  allMarkets: PolymarketMarket[];
  onSelectMarket: (m: PolymarketMarket) => void;
}

export const PolymarketMarketDetail = ({ market, priceHistory, orderbook, allMarkets, onSelectMarket }: Props) => {
  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = outcomes[0]?.price || 0;
  const yesPct = Math.round(yesPrice * 100);
  const vol = PolymarketService.formatVolume(market.volume24hr || 0);
  const liq = PolymarketService.formatVolume(parseFloat(market.liquidity || '0'));
  const endDate = market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const conditionId = market.conditionId || market.id;

  // Calculate 24h change from price history
  const change24h = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return null;
    const now = priceHistory[priceHistory.length - 1].p;
    const oneDayAgo = Date.now() / 1000 - 86400;
    const pastPoint = priceHistory.find(p => p.t >= oneDayAgo) || priceHistory[0];
    const diff = (now - pastPoint.p) * 100;
    return diff;
  }, [priceHistory]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-[#161b22]/30">
        <span className="text-[10px] font-bold text-amber-400 tracking-wider">MARKET DETAIL — {market.question?.slice(0, 30)}...</span>
        <span className="text-[9px] text-muted-foreground font-mono">ID: {conditionId.slice(0, 8)}...</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Title & Probability */}
        <div>
          <h3 className="text-sm font-bold text-foreground leading-snug mb-3">{market.question}</h3>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black ${yesPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {yesPct}%
            </span>
            <span className="text-xs text-muted-foreground">YES probability</span>
            {change24h !== null && (
              <>
                <span className="text-xs text-muted-foreground">|</span>
                <span className={`text-xs font-bold ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
        <div className="border border-border/30 rounded bg-[#0d1117] p-3">
          <div className="text-[10px] text-amber-400 uppercase tracking-wider mb-2">Price history (Recharts)</div>
          <PolymarketPriceChart data={priceHistory} />
        </div>

        {/* Orderbook - Real-time */}
        {orderbook && (
          <div className="border border-border/30 rounded bg-[#0d1117] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 uppercase tracking-wider">ORDER BOOK</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] text-green-400">LIVE 5s</span>
              </div>
            </div>
            <PolymarketOrderbook orderbook={orderbook} />
          </div>
        )}

        {/* Calculator */}
        <PolymarketCalculator market={market} />

        {/* AI Analysis */}
        <PolymarketAIAnalysis market={market} priceHistory={priceHistory} orderbook={orderbook} />

        {/* Correlated Markets */}
        <PolymarketCorrelated
          currentMarket={market}
          allMarkets={allMarkets}
          onSelect={onSelectMarket}
        />

        {/* Description */}
        {market.description && (
          <div className="border border-border/30 rounded bg-[#0d1117] p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">DETAILS</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{market.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
