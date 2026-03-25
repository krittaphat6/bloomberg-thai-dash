import { memo, useMemo, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PolymarketEvent, PolymarketMarket, PolymarketService } from '@/services/PolymarketService';
import { PolymarketLastTrade } from '@/services/PolymarketWebSocketService';
import {
  TrendingUp, TrendingDown, Zap, Target, AlertTriangle, BarChart3,
  ArrowUpRight, ArrowDownRight, DollarSign, Activity, Brain, Shield, Flame, Eye
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ScatterChart, Scatter, ZAxis, CartesianGrid } from 'recharts';

// ============ TYPES ============

interface AnalyticsProps {
  events: PolymarketEvent[];
  allMarkets: PolymarketMarket[];
  liveTrades: (PolymarketLastTrade & { title?: string })[];
  onSelectEvent: (event: PolymarketEvent) => void;
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
}

interface OpportunitySignal {
  market: PolymarketMarket;
  event: PolymarketEvent;
  signal: string;
  score: number;
  edge: number;
  kelly: number;
  roi: number;
  volume: number;
  liquidity: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  direction: 'YES' | 'NO';
  reasoning: string[];
}

interface WhaleActivity {
  assetId: string;
  title: string;
  buyVolume: number;
  sellVolume: number;
  netFlow: number;
  whaleCount: number;
  avgSize: number;
  signal: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL';
}

interface VolumeAnomaly {
  event: PolymarketEvent;
  market: PolymarketMarket;
  volume24h: number;
  avgVolume: number;
  volumeRatio: number;
  liquidity: number;
  yesPct: number;
  anomalyType: 'SPIKE' | 'SURGE' | 'UNUSUAL';
}

interface ArbitrageOpportunity {
  events: [PolymarketEvent, PolymarketEvent];
  markets: [PolymarketMarket, PolymarketMarket];
  correlation: string;
  priceDiff: number;
  expectedEdge: number;
  reasoning: string;
}

// ============ ANALYSIS ENGINE ============

function computeOpportunities(events: PolymarketEvent[], markets: PolymarketMarket[], getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number }): OpportunitySignal[] {
  const opportunities: OpportunitySignal[] = [];

  for (const event of events) {
    for (const market of event.markets || []) {
      const { yesPrice } = getLivePrice(market);
      if (yesPrice <= 0 || yesPrice >= 1) continue;

      const vol = market.volume24hr || 0;
      const liq = parseFloat(market.liquidity || '0');
      const yesPct = Math.round(yesPrice * 100);
      const noPct = 100 - yesPct;

      // Kelly Criterion analysis
      const yesROI = PolymarketService.potentialROI(yesPrice);
      const noROI = PolymarketService.potentialROI(1 - yesPrice);
      const yesOdds = (1 - yesPrice) / yesPrice;
      const noOdds = yesPrice / (1 - yesPrice);

      // Edge detection: markets near extremes with high liquidity
      const isDeepLiquidity = liq > 100_000;
      const isHighVolume = vol > 50_000;
      const reasoning: string[] = [];
      let score = 0;
      let direction: 'YES' | 'NO' = 'YES';

      // Contrarian signals
      if (yesPct >= 85 && yesPct <= 95 && isDeepLiquidity) {
        score += 30;
        direction = 'NO';
        reasoning.push(`High consensus at ${yesPct}% — contrarian NO bet offers ${noROI.toFixed(0)}% ROI`);
      }
      if (yesPct >= 5 && yesPct <= 15 && isDeepLiquidity) {
        score += 30;
        direction = 'YES';
        reasoning.push(`Low probability ${yesPct}% — contrarian YES bet offers ${yesROI.toFixed(0)}% ROI`);
      }

      // Value zone (mid-range with good liquidity)
      if (yesPct >= 35 && yesPct <= 65 && isDeepLiquidity && isHighVolume) {
        score += 20;
        direction = yesPct > 50 ? 'YES' : 'NO';
        reasoning.push(`Competitive market at ${yesPct}% with deep liquidity — significant edge potential`);
      }

      // High ROI with liquidity
      if (yesROI > 200 && isDeepLiquidity) {
        score += 15;
        direction = 'YES';
        reasoning.push(`YES ROI ${yesROI.toFixed(0)}% with ${PolymarketService.formatVolume(liq)} liquidity`);
      }
      if (noROI > 200 && isDeepLiquidity) {
        score += 15;
        direction = 'NO';
        reasoning.push(`NO ROI ${noROI.toFixed(0)}% with ${PolymarketService.formatVolume(liq)} liquidity`);
      }

      // Volume confirmation
      if (isHighVolume) {
        score += 10;
        reasoning.push(`24h volume ${PolymarketService.formatVolume(vol)} confirms market interest`);
      }

      // Time decay bonus (resolving soon)
      if (market.endDate) {
        const daysLeft = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000);
        if (daysLeft > 0 && daysLeft < 14) {
          score += 15;
          reasoning.push(`Resolves in ${daysLeft} days — time decay amplifies edge`);
        }
        if (daysLeft <= 0) continue; // skip resolved
      }

      if (score < 20 || reasoning.length === 0) continue;

      const kelly = direction === 'YES'
        ? PolymarketService.kellyFraction(yesPrice + 0.05, yesOdds)
        : PolymarketService.kellyFraction(1 - yesPrice + 0.05, noOdds);
      const roi = direction === 'YES' ? yesROI : noROI;
      const edge = direction === 'YES'
        ? PolymarketService.predictionSharpe(yesPrice + 0.05, yesPrice)
        : PolymarketService.predictionSharpe(1 - yesPrice + 0.05, 1 - yesPrice);

      const confidence = score >= 50 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

      opportunities.push({
        market, event,
        signal: reasoning[0],
        score, edge, kelly: Math.min(kelly, 0.25), roi,
        volume: vol, liquidity: liq,
        confidence, direction, reasoning,
      });
    }
  }

  return opportunities.sort((a, b) => b.score - a.score).slice(0, 50);
}

function computeWhaleActivity(trades: (PolymarketLastTrade & { title?: string })[]): WhaleActivity[] {
  const byAsset = new Map<string, (PolymarketLastTrade & { title?: string })[]>();

  for (const t of trades) {
    const val = parseFloat(t.price || '0') * parseFloat(t.size || '0');
    if (val < 100) continue; // only track meaningful orders
    const arr = byAsset.get(t.asset_id) || [];
    arr.push(t);
    byAsset.set(t.asset_id, arr);
  }

  const activities: WhaleActivity[] = [];

  for (const [assetId, assetTrades] of byAsset) {
    let buyVol = 0, sellVol = 0, whaleCount = 0;
    const sizes: number[] = [];

    for (const t of assetTrades) {
      const val = parseFloat(t.price || '0') * parseFloat(t.size || '0');
      sizes.push(val);
      if (t.side === 'BUY') buyVol += val; else sellVol += val;
      if (val >= 500) whaleCount++;
    }

    const netFlow = buyVol - sellVol;
    const avgSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
    const title = assetTrades[0]?.title || assetId.slice(0, 12) + '…';

    const signal = netFlow > avgSize * 2 ? 'ACCUMULATING' as const
      : netFlow < -avgSize * 2 ? 'DISTRIBUTING' as const
      : 'NEUTRAL' as const;

    if (signal !== 'NEUTRAL' || whaleCount > 0) {
      activities.push({ assetId, title, buyVolume: buyVol, sellVolume: sellVol, netFlow, whaleCount, avgSize, signal });
    }
  }

  return activities.sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow)).slice(0, 30);
}

function computeVolumeAnomalies(events: PolymarketEvent[], getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number }): VolumeAnomaly[] {
  const anomalies: VolumeAnomaly[] = [];
  const allVolumes = events.flatMap(e => (e.markets || []).map(m => m.volume24hr || 0)).filter(v => v > 0);
  const medianVol = allVolumes.sort((a, b) => a - b)[Math.floor(allVolumes.length / 2)] || 1;

  for (const event of events) {
    for (const market of event.markets || []) {
      const vol = market.volume24hr || 0;
      const liq = parseFloat(market.liquidity || '0');
      const ratio = vol / medianVol;
      const { yesPrice } = getLivePrice(market);

      if (ratio > 5 && vol > 10000) {
        anomalies.push({
          event, market,
          volume24h: vol, avgVolume: medianVol, volumeRatio: ratio,
          liquidity: liq, yesPct: Math.round(yesPrice * 100),
          anomalyType: ratio > 20 ? 'SPIKE' : ratio > 10 ? 'SURGE' : 'UNUSUAL',
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.volumeRatio - a.volumeRatio).slice(0, 30);
}

function computeArbitrageOpportunities(events: PolymarketEvent[], getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number }): ArbitrageOpportunity[] {
  const arbs: ArbitrageOpportunity[] = [];
  const eventPairs: [PolymarketEvent, PolymarketMarket, number][] = [];

  for (const e of events) {
    for (const m of e.markets || []) {
      const { yesPrice } = getLivePrice(m);
      if (yesPrice > 0 && yesPrice < 1) {
        eventPairs.push([e, m, yesPrice]);
      }
    }
  }

  // Find inverse-correlated pairs (probabilities that should sum to ~100%)
  for (let i = 0; i < Math.min(eventPairs.length, 200); i++) {
    for (let j = i + 1; j < Math.min(eventPairs.length, 200); j++) {
      const [e1, m1, p1] = eventPairs[i];
      const [e2, m2, p2] = eventPairs[j];

      // Check for complementary markets (should sum close to 1)
      const sum = p1 + p2;
      if (sum > 1.05 || (sum < 0.95 && sum > 0.5)) {
        const edge = Math.abs(sum - 1) * 100;
        if (edge > 3) {
          const q1 = m1.question.toLowerCase();
          const q2 = m2.question.toLowerCase();
          // Check keyword overlap for relatedness
          const words1 = new Set(q1.split(/\s+/));
          const words2 = new Set(q2.split(/\s+/));
          const overlap = [...words1].filter(w => words2.has(w) && w.length > 3).length;
          if (overlap >= 2) {
            arbs.push({
              events: [e1, e2], markets: [m1, m2],
              correlation: overlap >= 4 ? 'STRONG' : 'MODERATE',
              priceDiff: sum - 1,
              expectedEdge: edge,
              reasoning: sum > 1
                ? `Combined YES probability ${(sum * 100).toFixed(1)}% > 100% — potential short opportunity`
                : `Combined YES probability ${(sum * 100).toFixed(1)}% < 100% — potential long opportunity`,
            });
          }
        }
      }
    }
  }

  return arbs.sort((a, b) => b.expectedEdge - a.expectedEdge).slice(0, 20);
}

// Market structure analysis
interface MarketStructure {
  totalMarkets: number;
  avgLiquidity: number;
  avgVolume: number;
  highConfidence: number; // markets > 80% or < 20%
  contested: number; // markets 40-60%
  resolving7d: number;
  totalLiquidity: number;
  totalVolume: number;
  categoryBreakdown: { category: string; count: number; avgProb: number; totalVol: number }[];
  probabilityDistribution: { range: string; count: number }[];
}

function computeMarketStructure(events: PolymarketEvent[], getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number }): MarketStructure {
  const categories = new Map<string, { count: number; probSum: number; volSum: number }>();
  const probBuckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const probDist = probBuckets.slice(0, -1).map((_, i) => ({ range: `${probBuckets[i]}-${probBuckets[i + 1]}%`, count: 0 }));

  let totalLiq = 0, totalVol = 0, highConf = 0, contested = 0, resolving = 0;
  let marketCount = 0;

  for (const event of events) {
    const cat = categorizeForAnalysis(event);
    const entry = categories.get(cat) || { count: 0, probSum: 0, volSum: 0 };

    for (const market of event.markets || []) {
      const { yesPrice } = getLivePrice(market);
      const pct = Math.round(yesPrice * 100);
      const liq = parseFloat(market.liquidity || '0');
      const vol = market.volume24hr || 0;
      totalLiq += liq;
      totalVol += vol;
      marketCount++;

      if (pct > 80 || pct < 20) highConf++;
      if (pct >= 40 && pct <= 60) contested++;

      if (market.endDate) {
        const days = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000);
        if (days > 0 && days <= 7) resolving++;
      }

      entry.count++;
      entry.probSum += pct;
      entry.volSum += vol;

      const bucketIdx = Math.min(Math.floor(pct / 10), 9);
      probDist[bucketIdx].count++;
    }

    categories.set(cat, entry);
  }

  const catBreakdown = Array.from(categories.entries())
    .map(([category, data]) => ({
      category, count: data.count,
      avgProb: data.count > 0 ? Math.round(data.probSum / data.count) : 0,
      totalVol: data.volSum,
    }))
    .sort((a, b) => b.totalVol - a.totalVol);

  return {
    totalMarkets: marketCount,
    avgLiquidity: marketCount > 0 ? totalLiq / marketCount : 0,
    avgVolume: marketCount > 0 ? totalVol / marketCount : 0,
    highConfidence: highConf,
    contested,
    resolving7d: resolving,
    totalLiquidity: totalLiq,
    totalVolume: totalVol,
    categoryBreakdown: catBreakdown,
    probabilityDistribution: probDist,
  };
}

function categorizeForAnalysis(event: PolymarketEvent): string {
  const text = `${event.title} ${event.description || ''}`.toLowerCase();
  const tags = ((event.tags || []) as any[]).map(t => typeof t === 'string' ? t : t?.label || '').join(' ').toLowerCase();
  const combined = `${text} ${tags}`;
  if (/election|president|senate|congress|governor|vote/.test(combined)) return 'Elections';
  if (/bitcoin|crypto|ethereum|solana|defi/.test(combined)) return 'Crypto';
  if (/fed|fomc|rate|inflation|cpi|gdp/.test(combined)) return 'Fed & Rates';
  if (/nba|nfl|mlb|soccer|football|tennis|sport/.test(combined)) return 'Sports';
  if (/ai|gpt|openai|tech|nvidia|google|apple/.test(combined)) return 'AI & Tech';
  if (/war|conflict|military|nato|russia|ukraine|china/.test(combined)) return 'Geopolitics';
  return 'Other';
}

// ============ SUB COMPONENTS ============

const ConfidenceBadge = memo(({ level }: { level: 'HIGH' | 'MEDIUM' | 'LOW' }) => {
  const cls = level === 'HIGH' ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/30'
    : level === 'MEDIUM' ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30'
    : 'bg-destructive/20 text-destructive border-destructive/30';
  return <Badge className={`text-[8px] border ${cls} px-1.5 py-0`}>{level}</Badge>;
});
ConfidenceBadge.displayName = 'ConfidenceBadge';

const SignalBadge = memo(({ signal }: { signal: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL' }) => {
  const cls = signal === 'ACCUMULATING' ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/30'
    : signal === 'DISTRIBUTING' ? 'bg-destructive/20 text-destructive border-destructive/30'
    : 'bg-muted text-muted-foreground border-border';
  return <Badge className={`text-[8px] border ${cls} px-1.5 py-0`}>{signal}</Badge>;
});
SignalBadge.displayName = 'SignalBadge';

const AnomalyBadge = memo(({ type }: { type: 'SPIKE' | 'SURGE' | 'UNUSUAL' }) => {
  const cls = type === 'SPIKE' ? 'bg-destructive/20 text-destructive border-destructive/30'
    : type === 'SURGE' ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30'
    : 'bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30';
  return <Badge className={`text-[8px] border ${cls} px-1.5 py-0`}>{type}</Badge>;
});
AnomalyBadge.displayName = 'AnomalyBadge';

// ============ PANELS ============

const OpportunitiesPanel = memo(({ opportunities, onSelect }: { opportunities: OpportunitySignal[]; onSelect: (e: PolymarketEvent) => void }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] text-muted-foreground">{opportunities.length} signals detected</span>
        <span className="text-[9px] text-muted-foreground">Sorted by composite score</span>
      </div>
      {opportunities.map((opp, i) => (
        <div key={opp.market.id}
          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
            i < 3 ? 'border-terminal-green/30 bg-terminal-green/[0.03]' : 'border-border hover:border-accent'
          }`}
          onClick={() => onSelect(opp.event)}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                <ConfidenceBadge level={opp.confidence} />
                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                  opp.direction === 'YES' ? 'border-terminal-green/50 text-terminal-green' : 'border-destructive/50 text-destructive'
                }`}>{opp.direction}</Badge>
              </div>
              <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">{opp.market.question}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black text-terminal-amber">{opp.score}</div>
              <div className="text-[8px] text-muted-foreground">SCORE</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">ROI</span>
              <div className="font-bold text-terminal-green">{opp.roi.toFixed(0)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Kelly</span>
              <div className="font-bold text-terminal-cyan">{(opp.kelly * 100).toFixed(1)}%</div>
            </div>
            <div>
              <span className="text-muted-foreground">Volume</span>
              <div className="font-bold text-foreground">{PolymarketService.formatVolume(opp.volume)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Liquidity</span>
              <div className="font-bold text-foreground">{PolymarketService.formatVolume(opp.liquidity)}</div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{opp.signal}</p>

          {expanded === opp.market.id && opp.reasoning.length > 1 && (
            <div className="mt-2 pt-2 border-t border-border space-y-1">
              {opp.reasoning.map((r, ri) => (
                <div key={ri} className="text-[10px] text-muted-foreground flex gap-1.5">
                  <span className="text-terminal-green shrink-0">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {opp.reasoning.length > 1 && (
            <button className="text-[9px] text-terminal-cyan mt-1.5 hover:underline"
              onClick={e => { e.stopPropagation(); setExpanded(expanded === opp.market.id ? null : opp.market.id); }}>
              {expanded === opp.market.id ? 'Hide reasoning' : `${opp.reasoning.length} reasons ▸`}
            </button>
          )}
        </div>
      ))}
      {opportunities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">No significant opportunities detected right now</div>
      )}
    </div>
  );
});
OpportunitiesPanel.displayName = 'OpportunitiesPanel';

const WhalePanel = memo(({ activities }: { activities: WhaleActivity[] }) => (
  <div className="space-y-1">
    <div className="grid grid-cols-[1fr_80px_80px_80px_60px_90px] gap-2 px-3 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
      <span>MARKET</span>
      <span className="text-right">BUY VOL</span>
      <span className="text-right">SELL VOL</span>
      <span className="text-right">NET FLOW</span>
      <span className="text-right">🐋</span>
      <span className="text-right">SIGNAL</span>
    </div>
    {activities.map((a, i) => (
      <div key={a.assetId} className={`grid grid-cols-[1fr_80px_80px_80px_60px_90px] gap-2 px-3 py-2 text-[10px] border-b border-border/20 ${
        a.signal === 'ACCUMULATING' ? 'bg-terminal-green/[0.03]' : a.signal === 'DISTRIBUTING' ? 'bg-destructive/[0.03]' : ''
      }`}>
        <span className="text-foreground truncate font-medium">{a.title}</span>
        <span className="text-right text-terminal-green font-mono">${a.buyVolume >= 1000 ? `${(a.buyVolume / 1000).toFixed(1)}K` : a.buyVolume.toFixed(0)}</span>
        <span className="text-right text-destructive font-mono">${a.sellVolume >= 1000 ? `${(a.sellVolume / 1000).toFixed(1)}K` : a.sellVolume.toFixed(0)}</span>
        <span className={`text-right font-mono font-bold ${a.netFlow >= 0 ? 'text-terminal-green' : 'text-destructive'}`}>
          {a.netFlow >= 0 ? '+' : ''}{a.netFlow >= 1000 ? `$${(a.netFlow / 1000).toFixed(1)}K` : `$${a.netFlow.toFixed(0)}`}
        </span>
        <span className="text-right text-terminal-amber font-bold">{a.whaleCount}</span>
        <span className="text-right"><SignalBadge signal={a.signal} /></span>
      </div>
    ))}
    {activities.length === 0 && (
      <div className="text-center py-8 text-muted-foreground text-xs">Waiting for live trade data to detect whale activity...</div>
    )}
  </div>
));
WhalePanel.displayName = 'WhalePanel';

const VolumeAnomalyPanel = memo(({ anomalies, onSelect }: { anomalies: VolumeAnomaly[]; onSelect: (e: PolymarketEvent) => void }) => (
  <div className="space-y-1">
    <div className="grid grid-cols-[1fr_80px_80px_60px_70px] gap-2 px-3 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
      <span>MARKET</span>
      <span className="text-right">24H VOL</span>
      <span className="text-right">VS MEDIAN</span>
      <span className="text-right">PROB</span>
      <span className="text-right">TYPE</span>
    </div>
    {anomalies.map((a, i) => (
      <div key={a.market.id}
        onClick={() => onSelect(a.event)}
        className={`grid grid-cols-[1fr_80px_80px_60px_70px] gap-2 px-3 py-2 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${
          a.anomalyType === 'SPIKE' ? 'bg-destructive/[0.03]' : a.anomalyType === 'SURGE' ? 'bg-terminal-amber/[0.03]' : ''
        }`}>
        <span className="text-foreground truncate font-medium">{a.market.question}</span>
        <span className="text-right text-terminal-green font-mono">{PolymarketService.formatVolume(a.volume24h)}</span>
        <span className="text-right text-terminal-amber font-mono font-bold">{a.volumeRatio.toFixed(1)}×</span>
        <span className={`text-right font-bold ${a.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{a.yesPct}%</span>
        <span className="text-right"><AnomalyBadge type={a.anomalyType} /></span>
      </div>
    ))}
    {anomalies.length === 0 && (
      <div className="text-center py-8 text-muted-foreground text-xs">No volume anomalies detected</div>
    )}
  </div>
));
VolumeAnomalyPanel.displayName = 'VolumeAnomalyPanel';

const ArbitragePanel = memo(({ arbs, onSelect }: { arbs: ArbitrageOpportunity[]; onSelect: (e: PolymarketEvent) => void }) => (
  <div className="space-y-2">
    {arbs.map((arb, i) => (
      <div key={i} className="border border-terminal-amber/20 rounded-lg p-3 bg-terminal-amber/[0.02]">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="text-[8px] bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30">{arb.correlation}</Badge>
          <span className="text-[10px] font-bold text-terminal-amber">{arb.expectedEdge.toFixed(1)}% EDGE</span>
        </div>
        <div className="space-y-1.5">
          {arb.markets.map((m, mi) => {
            const pct = Math.round(parseFloat(JSON.parse(m.outcomePrices || '["0"]')[0]) * 100);
            return (
              <div key={m.id} onClick={() => onSelect(arb.events[mi])}
                className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded bg-card/50 cursor-pointer hover:bg-muted/30">
                <span className="text-foreground flex-1 truncate mr-2">{m.question}</span>
                <span className={`font-bold ${pct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{pct}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{arb.reasoning}</p>
      </div>
    ))}
    {arbs.length === 0 && (
      <div className="text-center py-8 text-muted-foreground text-xs">No arbitrage opportunities detected across current markets</div>
    )}
  </div>
));
ArbitragePanel.displayName = 'ArbitragePanel';

const StructurePanel = memo(({ structure }: { structure: MarketStructure }) => (
  <div className="space-y-4">
    {/* Overview Stats */}
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'TOTAL MARKETS', value: structure.totalMarkets.toLocaleString(), icon: BarChart3, color: 'text-terminal-cyan' },
        { label: 'TOTAL LIQUIDITY', value: PolymarketService.formatVolume(structure.totalLiquidity), icon: DollarSign, color: 'text-terminal-green' },
        { label: 'HIGH CONFIDENCE', value: structure.highConfidence.toString(), icon: Target, color: 'text-terminal-amber' },
        { label: 'CONTESTED', value: structure.contested.toString(), icon: Activity, color: 'text-destructive' },
      ].map(s => (
        <div key={s.label} className="border border-border rounded-lg p-3 bg-card/30">
          <div className="flex items-center gap-1.5 mb-1">
            <s.icon className="w-3 h-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
          </div>
          <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>

    {/* Probability Distribution */}
    <div className="border border-border rounded-lg p-3 bg-card/30">
      <div className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider mb-3">PROBABILITY DISTRIBUTION</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={structure.probabilityDistribution}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
          <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10, borderRadius: 4 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {structure.probabilityDistribution.map((_, idx) => (
              <Cell key={idx} fill={idx < 2 || idx >= 8 ? 'hsl(var(--destructive))' : idx >= 4 && idx <= 5 ? 'hsl(var(--terminal-amber))' : 'hsl(var(--terminal-green))'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    {/* Category Breakdown */}
    <div className="border border-border rounded-lg p-3 bg-card/30">
      <div className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider mb-3">CATEGORY ANALYSIS</div>
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_60px_60px_80px] gap-2 px-2 py-1 text-[9px] text-muted-foreground font-bold uppercase">
          <span>CATEGORY</span><span className="text-right">COUNT</span><span className="text-right">AVG %</span><span className="text-right">VOLUME</span>
        </div>
        {structure.categoryBreakdown.map(c => (
          <div key={c.category} className="grid grid-cols-[1fr_60px_60px_80px] gap-2 px-2 py-1.5 text-[10px] border-b border-border/20 hover:bg-muted/20">
            <span className="text-foreground font-medium">{c.category}</span>
            <span className="text-right text-muted-foreground">{c.count}</span>
            <span className={`text-right font-bold ${c.avgProb >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{c.avgProb}%</span>
            <span className="text-right text-terminal-cyan font-mono">{PolymarketService.formatVolume(c.totalVol)}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Resolving Soon */}
    <div className="border border-border rounded-lg p-3 bg-card/30">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-terminal-amber" />
        <span className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider">RESOLVING WITHIN 7 DAYS</span>
        <Badge className="text-[8px] bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30">{structure.resolving7d}</Badge>
      </div>
    </div>
  </div>
));
StructurePanel.displayName = 'StructurePanel';

// Edge scanner: find markets with mispriced risk/reward
const EdgeScannerPanel = memo(({ events, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const edges = useMemo(() => {
    const results: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; rr: ReturnType<typeof PolymarketService.riskReward>; sharpe: number; kelly: number; vol: number; liq: number; daysLeft: number }[] = [];

    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0.05 || yesPrice >= 0.95) continue;
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        if (vol < 5000 || liq < 10000) continue;

        const rr = PolymarketService.riskReward(yesPrice);
        const sharpe = PolymarketService.predictionSharpe(yesPrice + 0.03, yesPrice);
        const kelly = PolymarketService.kellyFraction(yesPrice + 0.03, (1 - yesPrice) / yesPrice);
        const daysLeft = market.endDate ? Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000) : 999;

        if (rr.ratio < 0.5 && kelly > 0.01) {
          results.push({ event, market, yesPct: Math.round(yesPrice * 100), rr, sharpe, kelly: Math.min(kelly, 0.25), vol, liq, daysLeft });
        }
      }
    }

    return results.sort((a, b) => a.rr.ratio - b.rr.ratio).slice(0, 30);
  }, [events, getLivePrice]);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_50px_70px_60px_60px_60px_60px] gap-2 px-3 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>MARKET</span><span className="text-right">PROB</span><span className="text-right">R:R</span>
        <span className="text-right">SHARPE</span><span className="text-right">KELLY</span><span className="text-right">VOL</span><span className="text-right">DAYS</span>
      </div>
      {edges.map((e, i) => (
        <div key={e.market.id}
          onClick={() => onSelect(e.event)}
          className={`grid grid-cols-[1fr_50px_70px_60px_60px_60px_60px] gap-2 px-3 py-2 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${
            i < 5 ? 'bg-terminal-green/[0.03]' : ''
          }`}>
          <span className="text-foreground truncate font-medium">{e.market.question}</span>
          <span className={`text-right font-bold ${e.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{e.yesPct}%</span>
          <span className="text-right font-mono text-terminal-amber">{e.rr.risk.toFixed(2)}:{e.rr.reward.toFixed(2)}</span>
          <span className={`text-right font-mono ${e.sharpe > 0 ? 'text-terminal-green' : 'text-destructive'}`}>{e.sharpe.toFixed(3)}</span>
          <span className="text-right font-mono text-terminal-cyan">{(e.kelly * 100).toFixed(1)}%</span>
          <span className="text-right text-muted-foreground">{PolymarketService.formatVolume(e.vol)}</span>
          <span className={`text-right ${e.daysLeft <= 7 ? 'text-terminal-amber font-bold' : 'text-muted-foreground'}`}>{e.daysLeft > 365 ? '∞' : e.daysLeft}</span>
        </div>
      ))}
      {edges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">No favorable risk/reward setups found</div>
      )}
    </div>
  );
});
EdgeScannerPanel.displayName = 'EdgeScannerPanel';

// ============ MAIN ANALYTICS COMPONENT ============

const ANALYSIS_TABS = [
  { id: 'opportunities', label: '🎯 Opportunities', icon: Target },
  { id: 'whales', label: '🐋 Smart Money', icon: Eye },
  { id: 'volume', label: '📊 Vol Anomalies', icon: Flame },
  { id: 'edge', label: '⚡ Edge Scanner', icon: Zap },
  { id: 'arbitrage', label: '🔄 Arbitrage', icon: ArrowUpRight },
  { id: 'structure', label: '🏗️ Structure', icon: Brain },
];

const PolymarketAnalytics = memo(({ events, allMarkets, liveTrades, onSelectEvent, getLivePrice }: AnalyticsProps) => {
  const [activeAnalysis, setActiveAnalysis] = useState('opportunities');

  const opportunities = useMemo(() => computeOpportunities(events, allMarkets, getLivePrice), [events, allMarkets, getLivePrice]);
  const whaleActivity = useMemo(() => computeWhaleActivity(liveTrades), [liveTrades]);
  const volumeAnomalies = useMemo(() => computeVolumeAnomalies(events, getLivePrice), [events, getLivePrice]);
  const arbitrageOpps = useMemo(() => computeArbitrageOpportunities(events, getLivePrice), [events, getLivePrice]);
  const marketStructure = useMemo(() => computeMarketStructure(events, getLivePrice), [events, getLivePrice]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-terminal-amber" />
          <span className="text-[11px] font-bold text-terminal-amber tracking-wider">ABLE ANALYTICS ENGINE</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="text-terminal-green">{opportunities.length} signals</span>
          <span className="text-terminal-amber">🐋 {whaleActivity.length} tracked</span>
          <span className="text-terminal-cyan">{volumeAnomalies.length} anomalies</span>
        </div>
      </div>

      {/* Analysis Tabs */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-border bg-card/30 overflow-x-auto">
        {ANALYSIS_TABS.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveAnalysis(tab.id)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap ${
              activeAnalysis === tab.id
                ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeAnalysis === 'opportunities' && <OpportunitiesPanel opportunities={opportunities} onSelect={onSelectEvent} />}
          {activeAnalysis === 'whales' && <WhalePanel activities={whaleActivity} />}
          {activeAnalysis === 'volume' && <VolumeAnomalyPanel anomalies={volumeAnomalies} onSelect={onSelectEvent} />}
          {activeAnalysis === 'edge' && <EdgeScannerPanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'arbitrage' && <ArbitragePanel arbs={arbitrageOpps} onSelect={onSelectEvent} />}
          {activeAnalysis === 'structure' && <StructurePanel structure={marketStructure} />}
        </div>
      </ScrollArea>
    </div>
  );
});
PolymarketAnalytics.displayName = 'PolymarketAnalytics';

export default PolymarketAnalytics;
