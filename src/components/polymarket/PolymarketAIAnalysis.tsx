import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PolymarketMarket, PolymarketService, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  market: PolymarketMarket;
  priceHistory: PriceHistoryPoint[];
  orderbook: OrderbookData | null;
}

export const PolymarketAIAnalysis = ({ market, priceHistory, orderbook }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = outcomes[0]?.price || 0;
  const yesPct = Math.round(yesPrice * 100);

  const analysis = useMemo(() => {
    let momentum = 'NEUTRAL';
    let momentumScore = 0;
    if (priceHistory.length >= 10) {
      const recent = priceHistory.slice(-10);
      const older = priceHistory.slice(-20, -10);
      const recentAvg = recent.reduce((s, p) => s + p.p, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((s, p) => s + p.p, 0) / older.length : recentAvg;
      momentumScore = (recentAvg - olderAvg) * 100;
      momentum = momentumScore > 2 ? 'BULLISH' : momentumScore < -2 ? 'BEARISH' : 'NEUTRAL';
    }

    const vol = market.volume24hr || 0;
    const volumeSignal = vol > 1_000_000 ? 'HIGH' : vol > 100_000 ? 'MEDIUM' : 'LOW';

    let bookImbalance = 0;
    if (orderbook) {
      const bidVol = (orderbook.bids || []).reduce((s, b) => s + parseFloat(b.size || '0'), 0);
      const askVol = (orderbook.asks || []).reduce((s, a) => s + parseFloat(a.size || '0'), 0);
      const total = bidVol + askVol;
      bookImbalance = total > 0 ? ((bidVol - askVol) / total) * 100 : 0;
    }

    const liq = parseFloat(market.liquidity || '0');
    const liquidityGrade = liq > 1_000_000 ? 'DEEP' : liq > 100_000 ? 'MODERATE' : 'THIN';

    const confidence = volumeSignal === 'HIGH' && liquidityGrade !== 'THIN' ? 'HIGH' :
      volumeSignal === 'MEDIUM' ? 'MEDIUM' : 'LOW';

    const drivers: string[] = [];
    if (momentumScore > 0) drivers.push(`Upward momentum (+${momentumScore.toFixed(1)}%)`);
    if (momentumScore < 0) drivers.push(`Downward pressure (${momentumScore.toFixed(1)}%)`);
    if (bookImbalance > 10) drivers.push(`Bid-heavy orderbook (+${bookImbalance.toFixed(0)}% imbalance)`);
    if (bookImbalance < -10) drivers.push(`Ask-heavy orderbook (${bookImbalance.toFixed(0)}% imbalance)`);
    if (volumeSignal === 'HIGH') drivers.push('High trading volume signals strong interest');
    if (liquidityGrade === 'DEEP') drivers.push('Deep liquidity supports price stability');
    if (yesPct > 80) drivers.push('Strong consensus — watch for complacency');
    if (yesPct < 20) drivers.push('Low probability — contrarian opportunity?');

    const risks: string[] = [];
    if (liquidityGrade === 'THIN') risks.push('Thin liquidity — prone to large swings');
    if (volumeSignal === 'LOW') risks.push('Low volume — price may not reflect true sentiment');
    if (Math.abs(bookImbalance) > 30) risks.push('Significant orderbook imbalance — potential manipulation');
    if (market.endDate) {
      const daysLeft = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000);
      if (daysLeft < 7) risks.push(`Resolves in ${daysLeft} days — high time decay risk`);
    }

    return { momentum, momentumScore, volumeSignal, bookImbalance, liquidityGrade, confidence, drivers, risks };
  }, [market, priceHistory, orderbook, yesPct]);

  const confColor = analysis.confidence === 'HIGH' ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/30' :
    analysis.confidence === 'MEDIUM' ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30' :
    'bg-destructive/20 text-destructive border-destructive/30';

  return (
    <div className="border border-accent/30 rounded bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-accent-foreground" />
        <span className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider">ABLE AI — PREDICTION ANALYSIS</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge className={`text-[9px] border ${confColor}`}>{analysis.confidence} CONFIDENCE</Badge>
        <span className="text-[9px] text-muted-foreground">Based on 40-module ABLE-HF analysis</span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        {market.question} — Market currently prices YES at {yesPct}%.
        {analysis.momentum !== 'NEUTRAL' && ` Momentum is ${analysis.momentum.toLowerCase()} (${analysis.momentumScore > 0 ? '+' : ''}${analysis.momentumScore.toFixed(1)}%).`}
        {' '}Volume signal: {analysis.volumeSignal}. Liquidity: {analysis.liquidityGrade}.
        {analysis.bookImbalance !== 0 && ` Orderbook ${analysis.bookImbalance > 0 ? 'bid' : 'ask'}-heavy (${Math.abs(analysis.bookImbalance).toFixed(0)}% imbalance).`}
      </p>

      {analysis.drivers.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-terminal-green font-bold mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> KEY DRIVERS
          </div>
          {analysis.drivers.map((d, i) => (
            <div key={i} className="text-[10px] text-muted-foreground pl-4 mb-0.5">• {d}</div>
          ))}
        </div>
      )}

      {analysis.risks.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-destructive font-bold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> RISK FACTORS
          </div>
          {analysis.risks.map((r, i) => (
            <div key={i} className="text-[10px] text-muted-foreground pl-4 mb-0.5">• {r}</div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" className="h-6 text-[9px] border-border" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide details' : 'Full analysis'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground space-y-1">
          <div>📊 Volume Signal: <span className="text-foreground">{analysis.volumeSignal}</span></div>
          <div>💧 Liquidity Grade: <span className="text-foreground">{analysis.liquidityGrade}</span></div>
          <div>📈 Momentum: <span className={analysis.momentumScore >= 0 ? 'text-terminal-green' : 'text-destructive'}>{analysis.momentum} ({analysis.momentumScore.toFixed(2)}%)</span></div>
          <div>📖 Book Imbalance: <span className={analysis.bookImbalance >= 0 ? 'text-terminal-green' : 'text-destructive'}>{analysis.bookImbalance.toFixed(1)}%</span></div>
          <div>🎯 Implied Prob: <span className="text-terminal-cyan">{yesPct}%</span></div>
          <div>📐 Sharpe-like: <span className="text-foreground">{PolymarketService.predictionSharpe(yesPct / 100, outcomes[0]?.price || 0.5).toFixed(4)}</span></div>
        </div>
      )}
    </div>
  );
};
