import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { PolymarketMarket, PolymarketService } from '@/services/PolymarketService';
import { Calculator, TrendingUp, Shield, Zap, Target } from 'lucide-react';

interface Props {
  market: PolymarketMarket;
}

export const PolymarketCalculator = ({ market }: Props) => {
  const [betAmount, setBetAmount] = useState(100);
  const [userProbEstimate, setUserProbEstimate] = useState(75);

  const outcomes = PolymarketService.parseOutcomes(market);
  const yesPrice = outcomes[0]?.price || 0.5;

  const calculations = useMemo(() => {
    const userProb = userProbEstimate / 100;
    const kelly = PolymarketService.kellyFraction(userProb, 1 / yesPrice);
    const ev = PolymarketService.expectedValue(userProb, betAmount, betAmount / yesPrice);
    const roi = PolymarketService.potentialROI(yesPrice);
    const sharpe = PolymarketService.predictionSharpe(userProb, yesPrice);
    const rr = PolymarketService.riskReward(yesPrice);
    const sharesYes = betAmount / yesPrice;
    const profitIfYes = sharesYes - betAmount;
    const edge = (userProb - yesPrice) * 100;

    return { kelly, ev, roi, sharpe, rr, sharesYes, profitIfYes, edge };
  }, [betAmount, userProbEstimate, yesPrice]);

  return (
    <div className="border border-accent/30 rounded bg-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-3.5 h-3.5 text-terminal-amber" />
        <span className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider">PREDICTION CALCULATOR</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Bet Amount ($)</label>
          <Input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(Number(e.target.value) || 0)}
            className="h-7 text-[11px] bg-background border-border"
          />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground uppercase mb-1 block">Your Prob. Estimate (%)</label>
          <Input
            type="number"
            value={userProbEstimate}
            onChange={e => setUserProbEstimate(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            className="h-7 text-[11px] bg-background border-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <CalcMetric label="SHARES (YES)" value={calculations.sharesYes.toFixed(1)} icon={<Target className="w-3 h-3" />} color="text-terminal-cyan" />
        <CalcMetric label="PROFIT IF YES" value={`$${calculations.profitIfYes.toFixed(2)}`} icon={<TrendingUp className="w-3 h-3" />} color="text-terminal-green" />
        <CalcMetric label="ROI" value={`${calculations.roi.toFixed(1)}%`} icon={<Zap className="w-3 h-3" />} color="text-terminal-amber" />
        <CalcMetric label="EXPECTED VALUE" value={`$${calculations.ev.toFixed(2)}`} icon={<TrendingUp className="w-3 h-3" />} color={calculations.ev >= 0 ? 'text-terminal-green' : 'text-destructive'} />
        <CalcMetric label="KELLY %" value={`${(calculations.kelly * 100).toFixed(1)}%`} icon={<Shield className="w-3 h-3" />} color="text-terminal-cyan" />
        <CalcMetric label="EDGE" value={`${calculations.edge >= 0 ? '+' : ''}${calculations.edge.toFixed(1)}%`} icon={<Zap className="w-3 h-3" />} color={calculations.edge >= 0 ? 'text-terminal-green' : 'text-destructive'} />
        <CalcMetric label="RISK/REWARD" value={`1:${calculations.rr.ratio > 0 ? calculations.rr.ratio.toFixed(2) : '∞'}`} icon={<Shield className="w-3 h-3" />} color="text-terminal-amber" />
        <CalcMetric label="SHARPE-LIKE" value={calculations.sharpe.toFixed(3)} icon={<TrendingUp className="w-3 h-3" />} color={calculations.sharpe > 0 ? 'text-terminal-green' : 'text-destructive'} />
        <CalcMetric label="MARKET PRICE" value={`$${yesPrice.toFixed(2)}`} icon={<Target className="w-3 h-3" />} color="text-terminal-cyan" />
      </div>

      <div className={`mt-3 px-3 py-2 rounded text-[10px] font-medium ${
        calculations.edge > 5 ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/20' :
        calculations.edge > 0 ? 'bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/20' :
        'bg-destructive/10 text-destructive border border-destructive/20'
      }`}>
        {calculations.edge > 5
          ? `✅ POSITIVE EDGE +${calculations.edge.toFixed(1)}% — Kelly suggests ${(calculations.kelly * 100).toFixed(1)}% of bankroll`
          : calculations.edge > 0
          ? `⚠️ MARGINAL EDGE +${calculations.edge.toFixed(1)}% — Proceed with caution`
          : `❌ NEGATIVE EDGE ${calculations.edge.toFixed(1)}% — Market price implies higher probability than your estimate`
        }
      </div>
    </div>
  );
};

const CalcMetric = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) => (
  <div className="bg-muted/30 rounded p-2">
    <div className="flex items-center gap-1 mb-0.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[8px] text-muted-foreground uppercase">{label}</span>
    </div>
    <div className={`text-[12px] font-bold ${color}`}>{value}</div>
  </div>
);
