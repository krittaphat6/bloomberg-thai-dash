import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PolymarketMarket, PolymarketService, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { Zap, Brain, TrendingUp, AlertTriangle } from 'lucide-react';

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
    // Momentum analysis from price history
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

    // Volume analysis
    const vol = market.volume24hr || 0;
    const volumeSignal = vol > 1_000_000 ? 'HIGH' : vol > 100_000 ? 'MEDIUM' : 'LOW';

    // Orderbook imbalance
    let bookImbalance = 0;
    if (orderbook) {
      const bidVol = (orderbook.bids || []).reduce((s, b) => s + parseFloat(b.size || '0'), 0);
      const askVol = (orderbook.asks || []).reduce((s, a) => s + parseFloat(a.size || '0'), 0);
      const total = bidVol + askVol;
      bookImbalance = total > 0 ? ((bidVol - askVol) / total) * 100 : 0;
    }

    // Liquidity depth
    const liq = parseFloat(market.liquidity || '0');
    const liquidityGrade = liq > 1_000_000 ? 'DEEP' : liq > 100_000 ? 'MODERATE' : 'THIN';

    // Confidence level
    const confidence = volumeSignal === 'HIGH' && liquidityGrade !== 'THIN' ? 'HIGH' :
      volumeSignal === 'MEDIUM' ? 'MEDIUM' : 'LOW';

    // Key drivers (heuristic)
    const drivers: string[] = [];
    if (momentumScore > 0) drivers.push(`Upward momentum (+${momentumScore.toFixed(1)}%)`);
    if (momentumScore < 0) drivers.push(`Downward pressure (${momentumScore.toFixed(1)}%)`);
    if (bookImbalance > 10) drivers.push(`Bid-heavy orderbook (+${bookImbalance.toFixed(0)}% imbalance)`);
    if (bookImbalance < -10) drivers.push(`Ask-heavy orderbook (${bookImbalance.toFixed(0)}% imbalance)`);
    if (volumeSignal === 'HIGH') drivers.push('High trading volume signals strong interest');
    if (liquidityGrade === 'DEEP') drivers.push('Deep liquidity supports price stability');
    if (yesPct > 80) drivers.push('Strong consensus — watch for complacency');
    if (yesPct < 20) drivers.push('Low probability — contrarian opportunity?');

    // Risk factors
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

  const confColor = analysis.confidence === 'HIGH' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    analysis.confidence === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
    'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <div className="border border-purple-500/30 rounded bg-[#0d1117] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">ABLE AI — PREDICTION ANALYSIS</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge className={`text-[9px] border ${confColor}`}>{analysis.confidence} CONFIDENCE</Badge>
        <span className="text-[9px] text-muted-foreground">Based on 40-module ABLE-HF analysis</span>
      </div>

      {/* Summary */}
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        {market.question} — Market currently prices YES at {yesPct}%.
        {analysis.momentum !== 'NEUTRAL' && ` Momentum is ${analysis.momentum.toLowerCase()} (${analysis.momentumScore > 0 ? '+' : ''}${analysis.momentumScore.toFixed(1)}%).`}
        {' '}Volume signal: {analysis.volumeSignal}. Liquidity: {analysis.liquidityGrade}.
        {analysis.bookImbalance !== 0 && ` Orderbook ${analysis.bookImbalance > 0 ? 'bid' : 'ask'}-heavy (${Math.abs(analysis.bookImbalance).toFixed(0)}% imbalance).`}
      </p>

      {/* Drivers */}
      {analysis.drivers.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-green-400 font-bold mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> KEY DRIVERS
          </div>
          {analysis.drivers.map((d, i) => (
            <div key={i} className="text-[10px] text-muted-foreground pl-4 mb-0.5">• {d}</div>
          ))}
        </div>
      )}

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] text-red-400 font-bold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> RISK FACTORS
          </div>
          {analysis.risks.map((r, i) => (
            <div key={i} className="text-[10px] text-muted-foreground pl-4 mb-0.5">• {r}</div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="sm" className="h-6 text-[9px] border-border/50" onClick={() => setExpanded(!expanded)}>
          Full analysis
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[9px] border-border/50">
          Correlations
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[9px] border-border/50">
          News impact
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground space-y-1">
          <div>📊 Volume Signal: <span className="text-foreground">{analysis.volumeSignal}</span></div>
          <div>💧 Liquidity Grade: <span className="text-foreground">{analysis.liquidityGrade}</span></div>
          <div>📈 Momentum: <span className={analysis.momentumScore >= 0 ? 'text-green-400' : 'text-red-400'}>{analysis.momentum} ({analysis.momentumScore.toFixed(2)}%)</span></div>
          <div>📖 Book Imbalance: <span className={analysis.bookImbalance >= 0 ? 'text-green-400' : 'text-red-400'}>{analysis.bookImbalance.toFixed(1)}%</span></div>
          <div>🎯 Implied Prob: <span className="text-cyan-400">{yesPct}%</span></div>
          <div>📐 Sharpe-like: <span className="text-foreground">{PolymarketService.predictionSharpe(yesPct / 100, outcomes[0]?.price || 0.5).toFixed(4)}</span></div>
        </div>
      )}
    </div>
  );
};
