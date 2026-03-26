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

// ============ NEW PANELS ============

// 1. Momentum Scanner - detect price momentum from live trades
const MomentumPanel = memo(({ events, liveTrades, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  liveTrades: (PolymarketLastTrade & { title?: string })[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const momentum = useMemo(() => {
    const results: { event: PolymarketEvent; market: PolymarketMarket; currentPct: number; tradeCount: number; buyPressure: number; avgTradeSize: number; momentum: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN'; vol24h: number; liq: number }[] = [];

    // Aggregate trade flow per market token
    const tokenFlow = new Map<string, { buys: number; sells: number; buyVol: number; sellVol: number; count: number }>();
    for (const t of liveTrades) {
      const entry = tokenFlow.get(t.asset_id) || { buys: 0, sells: 0, buyVol: 0, sellVol: 0, count: 0 };
      const size = parseFloat(t.size || '0') * parseFloat(t.price || '0');
      if (t.side === 'BUY') { entry.buys++; entry.buyVol += size; }
      else { entry.sells++; entry.sellVol += size; }
      entry.count++;
      tokenFlow.set(t.asset_id, entry);
    }

    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0 || yesPrice >= 1) continue;
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        if (vol < 5000) continue;

        // Check token flow
        const tokens = PolymarketService.extractTokenIds([market]);
        let totalBuyPressure = 0, totalCount = 0, totalAvgSize = 0;
        for (const tid of tokens) {
          const flow = tokenFlow.get(tid);
          if (flow) {
            totalBuyPressure += flow.buys / Math.max(flow.buys + flow.sells, 1);
            totalCount += flow.count;
            totalAvgSize += (flow.buyVol + flow.sellVol) / Math.max(flow.count, 1);
          }
        }
        const buyPressure = tokens.length > 0 ? totalBuyPressure / tokens.length : 0.5;

        let momentumSignal: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN' = 'NEUTRAL';
        if (buyPressure > 0.75) momentumSignal = 'STRONG_UP';
        else if (buyPressure > 0.6) momentumSignal = 'UP';
        else if (buyPressure < 0.25) momentumSignal = 'STRONG_DOWN';
        else if (buyPressure < 0.4) momentumSignal = 'DOWN';

        if (momentumSignal !== 'NEUTRAL' && totalCount > 2) {
          results.push({
            event, market,
            currentPct: Math.round(yesPrice * 100),
            tradeCount: totalCount,
            buyPressure: Math.round(buyPressure * 100),
            avgTradeSize: totalAvgSize / Math.max(tokens.length, 1),
            momentum: momentumSignal,
            vol24h: vol, liq
          });
        }
      }
    }

    return results.sort((a, b) => Math.abs(b.buyPressure - 50) - Math.abs(a.buyPressure - 50)).slice(0, 40);
  }, [events, liveTrades, getLivePrice]);

  const getMomentumColor = (m: string) => {
    if (m === 'STRONG_UP') return 'text-terminal-green';
    if (m === 'UP') return 'text-terminal-green/70';
    if (m === 'STRONG_DOWN') return 'text-destructive';
    if (m === 'DOWN') return 'text-destructive/70';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] text-muted-foreground">{momentum.length} markets with momentum signals</span>
      </div>
      <div className="grid grid-cols-[1fr_50px_60px_70px_70px_80px] gap-2 px-3 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>MARKET</span><span className="text-right">PROB</span><span className="text-right">TRADES</span>
        <span className="text-right">BUY %</span><span className="text-right">AVG SIZE</span><span className="text-right">SIGNAL</span>
      </div>
      {momentum.map((m, i) => (
        <div key={m.market.id} onClick={() => onSelect(m.event)}
          className={`grid grid-cols-[1fr_50px_60px_70px_70px_80px] gap-2 px-3 py-2 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${
            i < 3 ? 'bg-terminal-green/[0.03]' : ''
          }`}>
          <span className="text-foreground truncate font-medium">{m.market.question}</span>
          <span className={`text-right font-bold ${m.currentPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{m.currentPct}%</span>
          <span className="text-right text-muted-foreground font-mono">{m.tradeCount}</span>
          <span className={`text-right font-bold ${m.buyPressure >= 60 ? 'text-terminal-green' : m.buyPressure <= 40 ? 'text-destructive' : 'text-muted-foreground'}`}>{m.buyPressure}%</span>
          <span className="text-right text-terminal-cyan font-mono">${m.avgTradeSize >= 1000 ? `${(m.avgTradeSize / 1000).toFixed(1)}K` : m.avgTradeSize.toFixed(0)}</span>
          <span className={`text-right font-bold text-[9px] ${getMomentumColor(m.momentum)}`}>
            {m.momentum === 'STRONG_UP' ? '🚀 STRONG↑' : m.momentum === 'UP' ? '📈 UP' : m.momentum === 'STRONG_DOWN' ? '💥 STRONG↓' : '📉 DOWN'}
          </span>
        </div>
      ))}
      {momentum.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">Waiting for live trade data to compute momentum...</div>
      )}
    </div>
  );
});
MomentumPanel.displayName = 'MomentumPanel';

// 2. Time Decay Scanner - markets resolving soon with high uncertainty
const TimeDecayPanel = memo(({ events, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const decaying = useMemo(() => {
    const results: { event: PolymarketEvent; market: PolymarketMarket; daysLeft: number; yesPct: number; vol: number; liq: number; uncertainty: number; decayRate: string }[] = [];

    for (const event of events) {
      for (const market of event.markets || []) {
        if (!market.endDate) continue;
        const daysLeft = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000);
        if (daysLeft <= 0 || daysLeft > 30) continue;

        const { yesPrice } = getLivePrice(market);
        const yesPct = Math.round(yesPrice * 100);
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        
        // Uncertainty = distance from 0 or 100
        const uncertainty = Math.min(yesPct, 100 - yesPct);
        
        let decayRate = 'LOW';
        if (daysLeft <= 3 && uncertainty > 20) decayRate = 'CRITICAL';
        else if (daysLeft <= 7 && uncertainty > 15) decayRate = 'HIGH';
        else if (daysLeft <= 14 && uncertainty > 25) decayRate = 'MEDIUM';

        if (decayRate !== 'LOW') {
          results.push({ event, market, daysLeft, yesPct, vol, liq, uncertainty, decayRate });
        }
      }
    }

    return results.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 40);
  }, [events, getLivePrice]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] text-muted-foreground">{decaying.length} markets with time decay pressure</span>
      </div>
      <div className="grid grid-cols-[1fr_50px_50px_60px_70px_70px] gap-2 px-3 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>MARKET</span><span className="text-right">PROB</span><span className="text-right">DAYS</span>
        <span className="text-right">UNCERT</span><span className="text-right">VOLUME</span><span className="text-right">DECAY</span>
      </div>
      {decaying.map((d, i) => (
        <div key={d.market.id} onClick={() => onSelect(d.event)}
          className={`grid grid-cols-[1fr_50px_50px_60px_70px_70px] gap-2 px-3 py-2 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${
            d.decayRate === 'CRITICAL' ? 'bg-destructive/[0.05]' : d.decayRate === 'HIGH' ? 'bg-terminal-amber/[0.03]' : ''
          }`}>
          <span className="text-foreground truncate font-medium">{d.market.question}</span>
          <span className={`text-right font-bold ${d.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{d.yesPct}%</span>
          <span className={`text-right font-bold ${d.daysLeft <= 3 ? 'text-destructive' : d.daysLeft <= 7 ? 'text-terminal-amber' : 'text-muted-foreground'}`}>{d.daysLeft}d</span>
          <span className="text-right text-terminal-cyan font-mono">{d.uncertainty}%</span>
          <span className="text-right text-muted-foreground">{PolymarketService.formatVolume(d.vol)}</span>
          <span className={`text-right font-bold text-[9px] ${d.decayRate === 'CRITICAL' ? 'text-destructive' : d.decayRate === 'HIGH' ? 'text-terminal-amber' : 'text-terminal-cyan'}`}>
            {d.decayRate === 'CRITICAL' ? '🔥 CRIT' : d.decayRate === 'HIGH' ? '⚠️ HIGH' : '📊 MED'}
          </span>
        </div>
      ))}
      {decaying.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">No markets with significant time decay pressure</div>
      )}
    </div>
  );
});
TimeDecayPanel.displayName = 'TimeDecayPanel';

// 3. Category Rotation - which categories are gaining/losing attention
const CategoryRotationPanel = memo(({ events, getLivePrice }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
}) => {
  const rotation = useMemo(() => {
    const cats = new Map<string, { count: number; totalVol: number; totalLiq: number; highVol: number; avgProb: number; probSum: number; resolving: number }>();

    for (const event of events) {
      const cat = categorizeForAnalysis(event);
      const entry = cats.get(cat) || { count: 0, totalVol: 0, totalLiq: 0, highVol: 0, avgProb: 0, probSum: 0, resolving: 0 };

      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        entry.count++;
        entry.totalVol += vol;
        entry.totalLiq += liq;
        if (vol > 50000) entry.highVol++;
        entry.probSum += Math.round(yesPrice * 100);
        if (market.endDate) {
          const days = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000);
          if (days > 0 && days <= 7) entry.resolving++;
        }
      }

      entry.avgProb = entry.count > 0 ? Math.round(entry.probSum / entry.count) : 0;
      cats.set(cat, entry);
    }

    return Array.from(cats.entries())
      .map(([category, data]) => ({
        category,
        ...data,
        volPerMarket: data.count > 0 ? data.totalVol / data.count : 0,
        liqPerMarket: data.count > 0 ? data.totalLiq / data.count : 0,
        hotness: data.highVol / Math.max(data.count, 1),
      }))
      .sort((a, b) => b.totalVol - a.totalVol);
  }, [events, getLivePrice]);

  const maxVol = Math.max(...rotation.map(r => r.totalVol), 1);

  return (
    <div className="space-y-4">
      <div className="text-[10px] text-muted-foreground px-1">{rotation.length} categories tracked</div>
      {rotation.map(r => (
        <div key={r.category} className="border border-border rounded-lg p-3 bg-card/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-foreground">{r.category}</span>
            <div className="flex items-center gap-2">
              {r.resolving > 0 && <Badge className="text-[8px] bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30">⏰ {r.resolving} resolving</Badge>}
              <Badge className={`text-[8px] ${r.hotness > 0.3 ? 'bg-destructive/20 text-destructive border-destructive/30' : r.hotness > 0.1 ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30' : 'bg-muted text-muted-foreground border-border'}`}>
                {r.hotness > 0.3 ? '🔥 HOT' : r.hotness > 0.1 ? '📈 WARM' : '❄️ COLD'}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3 text-[10px]">
            <div><span className="text-muted-foreground block">Markets</span><span className="font-bold text-foreground">{r.count}</span></div>
            <div><span className="text-muted-foreground block">Total Vol</span><span className="font-bold text-terminal-green">{PolymarketService.formatVolume(r.totalVol)}</span></div>
            <div><span className="text-muted-foreground block">Avg Vol/Mkt</span><span className="font-bold text-terminal-cyan">{PolymarketService.formatVolume(r.volPerMarket)}</span></div>
            <div><span className="text-muted-foreground block">Liquidity</span><span className="font-bold text-terminal-amber">{PolymarketService.formatVolume(r.totalLiq)}</span></div>
            <div><span className="text-muted-foreground block">Avg Prob</span><span className={`font-bold ${r.avgProb >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{r.avgProb}%</span></div>
          </div>
          {/* Volume bar */}
          <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full bg-terminal-green/60 rounded-full transition-all" style={{ width: `${(r.totalVol / maxVol) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
});
CategoryRotationPanel.displayName = 'CategoryRotationPanel';

// 4. Liquidity Depth Analyzer
const LiquidityPanel = memo(({ events, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const liquidityData = useMemo(() => {
    const results: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; liq: number; vol: number; liqVolRatio: number; efficiency: string; spread: number }[] = [];

    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0 || yesPrice >= 1) continue;
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        if (liq < 1000) continue;

        const liqVolRatio = vol > 0 ? liq / vol : 999;
        const spread = Math.abs(yesPrice - 0.5) * 2; // simplified spread estimate
        
        let efficiency = 'NORMAL';
        if (liqVolRatio > 10) efficiency = 'DEEP'; // lots of liquidity relative to volume
        else if (liqVolRatio < 0.5) efficiency = 'THIN'; // high volume draining liquidity
        else if (liqVolRatio > 5 && vol > 10000) efficiency = 'STABLE';

        results.push({
          event, market,
          yesPct: Math.round(yesPrice * 100),
          liq, vol, liqVolRatio, efficiency, spread
        });
      }
    }

    return results.sort((a, b) => b.liq - a.liq).slice(0, 40);
  }, [events, getLivePrice]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] text-muted-foreground">{liquidityData.length} markets analyzed for liquidity depth</span>
      </div>
      <div className="grid grid-cols-[1fr_50px_80px_80px_60px_70px] gap-2 px-3 py-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>MARKET</span><span className="text-right">PROB</span><span className="text-right">LIQUIDITY</span>
        <span className="text-right">VOLUME</span><span className="text-right">L/V</span><span className="text-right">TYPE</span>
      </div>
      {liquidityData.map((d, i) => (
        <div key={d.market.id} onClick={() => onSelect(d.event)}
          className={`grid grid-cols-[1fr_50px_80px_80px_60px_70px] gap-2 px-3 py-2 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${
            d.efficiency === 'DEEP' ? 'bg-terminal-green/[0.03]' : d.efficiency === 'THIN' ? 'bg-destructive/[0.03]' : ''
          }`}>
          <span className="text-foreground truncate font-medium">{d.market.question}</span>
          <span className={`text-right font-bold ${d.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{d.yesPct}%</span>
          <span className="text-right text-terminal-cyan font-mono">{PolymarketService.formatVolume(d.liq)}</span>
          <span className="text-right text-terminal-green font-mono">{PolymarketService.formatVolume(d.vol)}</span>
          <span className="text-right font-mono text-terminal-amber">{d.liqVolRatio.toFixed(1)}×</span>
          <span className={`text-right font-bold text-[9px] ${
            d.efficiency === 'DEEP' ? 'text-terminal-green' : d.efficiency === 'THIN' ? 'text-destructive' : d.efficiency === 'STABLE' ? 'text-terminal-cyan' : 'text-muted-foreground'
          }`}>
            {d.efficiency === 'DEEP' ? '🏊 DEEP' : d.efficiency === 'THIN' ? '⚡ THIN' : d.efficiency === 'STABLE' ? '🔒 STABLE' : '➡️ NORM'}
          </span>
        </div>
      ))}
    </div>
  );
});
LiquidityPanel.displayName = 'LiquidityPanel';

// 5. Multi-Outcome Analyzer - events with multiple outcomes
const MultiOutcomePanel = memo(({ events, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const multiOutcome = useMemo(() => {
    const results: { event: PolymarketEvent; marketCount: number; totalLiq: number; totalVol: number; probSum: number; overround: number; markets: { question: string; yesPct: number; liq: number }[] }[] = [];

    for (const event of events) {
      const markets = event.markets || [];
      if (markets.length < 3) continue;

      let totalLiq = 0, totalVol = 0, probSum = 0;
      const mkts: { question: string; yesPct: number; liq: number }[] = [];

      for (const m of markets) {
        const { yesPrice } = getLivePrice(m);
        const liq = parseFloat(m.liquidity || '0');
        const vol = m.volume24hr || 0;
        totalLiq += liq;
        totalVol += vol;
        probSum += yesPrice;
        mkts.push({ question: m.question, yesPct: Math.round(yesPrice * 100), liq });
      }

      const overround = Math.round((probSum - 1) * 100);
      mkts.sort((a, b) => b.yesPct - a.yesPct);

      results.push({
        event, marketCount: markets.length,
        totalLiq, totalVol, probSum,
        overround, markets: mkts.slice(0, 8)
      });
    }

    return results.sort((a, b) => b.totalVol - a.totalVol).slice(0, 20);
  }, [events, getLivePrice]);

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground px-1">{multiOutcome.length} multi-outcome events</div>
      {multiOutcome.map((mo, i) => (
        <div key={mo.event.id} className="border border-border rounded-lg p-3 bg-card/30 cursor-pointer hover:border-accent" onClick={() => onSelect(mo.event)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-foreground line-clamp-1 flex-1">{mo.event.title}</span>
            <div className="flex items-center gap-2 ml-2">
              <Badge className="text-[8px] bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30">{mo.marketCount} outcomes</Badge>
              <Badge className={`text-[8px] ${Math.abs(mo.overround) > 5 ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/30' : 'bg-terminal-green/20 text-terminal-green border-terminal-green/30'}`}>
                {mo.overround > 0 ? '+' : ''}{mo.overround}% overround
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {mo.markets.map((m, mi) => (
              <div key={mi} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/20">
                <span className="text-muted-foreground truncate flex-1 mr-2">{m.question}</span>
                <span className={`font-bold shrink-0 ${m.yesPct >= 50 ? 'text-terminal-green' : m.yesPct >= 20 ? 'text-terminal-amber' : 'text-destructive'}`}>{m.yesPct}%</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[9px] text-muted-foreground">
            <span>Vol: <span className="text-terminal-green font-bold">{PolymarketService.formatVolume(mo.totalVol)}</span></span>
            <span>Liq: <span className="text-terminal-cyan font-bold">{PolymarketService.formatVolume(mo.totalLiq)}</span></span>
          </div>
        </div>
      ))}
      {multiOutcome.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-xs">No multi-outcome events found</div>
      )}
    </div>
  );
});
MultiOutcomePanel.displayName = 'MultiOutcomePanel';

// 6. Heatmap Overview - scatter of volume vs probability
const HeatmapOverviewPanel = memo(({ events, getLivePrice }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
}) => {
  const scatterData = useMemo(() => {
    const data: { name: string; prob: number; vol: number; liq: number }[] = [];

    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        if (vol < 1000 || liq < 1000) continue;
        data.push({
          name: market.question.slice(0, 40),
          prob: Math.round(yesPrice * 100),
          vol: Math.round(vol),
          liq: Math.round(liq)
        });
      }
    }

    return data.slice(0, 200);
  }, [events, getLivePrice]);

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg p-3 bg-card/30">
        <div className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider mb-3">VOLUME VS PROBABILITY SCATTER</div>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis type="number" dataKey="prob" name="Probability" unit="%" domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Probability %', position: 'bottom', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis type="number" dataKey="vol" name="Volume" scale="log" domain={['auto', 'auto']}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} label={{ value: '24h Volume', angle: -90, position: 'left', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <ZAxis type="number" dataKey="liq" range={[20, 200]} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10, borderRadius: 4 }}
              formatter={(val: number, name: string) => [name === 'vol' ? PolymarketService.formatVolume(val) : `${val}%`, name === 'vol' ? 'Volume' : 'Probability']} />
            <Scatter data={scatterData} fill="hsl(var(--terminal-cyan))" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[10px]">
        <div className="border border-border rounded-lg p-3 bg-card/30 text-center">
          <div className="text-muted-foreground">Total Plotted</div>
          <div className="text-lg font-black text-terminal-cyan">{scatterData.length}</div>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card/30 text-center">
          <div className="text-muted-foreground">Avg Probability</div>
          <div className="text-lg font-black text-terminal-green">
            {scatterData.length > 0 ? Math.round(scatterData.reduce((a, b) => a + b.prob, 0) / scatterData.length) : 0}%
          </div>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card/30 text-center">
          <div className="text-muted-foreground">Median Volume</div>
          <div className="text-lg font-black text-terminal-amber">
            {PolymarketService.formatVolume(scatterData.length > 0 ? [...scatterData].sort((a, b) => a.vol - b.vol)[Math.floor(scatterData.length / 2)]?.vol || 0 : 0)}
          </div>
        </div>
      </div>
    </div>
  );
});
HeatmapOverviewPanel.displayName = 'HeatmapOverviewPanel';

// ============ NEW V3 PANELS ============

// 7. EV Ranker — Expected Value ranking for every market
const EVRankerPanel = memo(({ events, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const [bankroll, setBankroll] = useState(1000);
  const evData = useMemo(() => {
    const results: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; bestSide: 'YES' | 'NO'; bestEV: number; kelly: number; optimalBet: number; roi: number; liq: number }[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0.02 || yesPrice >= 0.98) continue;
        const liq = parseFloat(market.liquidity || '0');
        if (liq < 5000) continue;
        const yesEV = PolymarketService.expectedValue(yesPrice + 0.05, 100, 100 / yesPrice);
        const noEV = PolymarketService.expectedValue((1 - yesPrice) + 0.05, 100, 100 / (1 - yesPrice));
        const bestSide: 'YES' | 'NO' = yesEV > noEV ? 'YES' : 'NO';
        const bestEV = Math.max(yesEV, noEV);
        const price = bestSide === 'YES' ? yesPrice : 1 - yesPrice;
        const kelly = Math.min(PolymarketService.kellyFraction(price + 0.05, 1 / price), 0.15);
        const optimalBet = bankroll * kelly;
        const roi = PolymarketService.potentialROI(price);
        results.push({ event, market, yesPct: Math.round(yesPrice * 100), bestSide, bestEV, kelly, optimalBet, roi, liq });
      }
    }
    return results.sort((a, b) => b.bestEV - a.bestEV).slice(0, 50);
  }, [events, getLivePrice, bankroll]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-1 mb-2">
        <span className="text-[10px] text-muted-foreground">Bankroll:</span>
        <div className="flex gap-1">
          {[500, 1000, 5000, 10000].map(b => (
            <button key={b} onClick={() => setBankroll(b)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${bankroll === b ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30' : 'text-muted-foreground hover:text-foreground'}`}>
              ${b.toLocaleString()}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">{evData.length} markets ranked</span>
      </div>
      <div className="grid grid-cols-[30px_1fr_45px_55px_55px_60px_55px_55px] gap-1 px-3 py-1.5 text-[8px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>#</span><span>MARKET</span><span className="text-right">PROB</span><span className="text-right">BEST EV</span>
        <span className="text-right">SIDE</span><span className="text-right">KELLY</span><span className="text-right">BET $</span><span className="text-right">ROI</span>
      </div>
      {evData.map((d, i) => (
        <div key={d.market.id} onClick={() => onSelect(d.event)}
          className={`grid grid-cols-[30px_1fr_45px_55px_55px_60px_55px_55px] gap-1 px-3 py-1.5 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${i < 5 ? 'bg-terminal-green/[0.03]' : ''}`}>
          <span className="text-muted-foreground font-mono">{i + 1}</span>
          <span className="text-foreground truncate font-medium">{d.market.question}</span>
          <span className={`text-right font-bold ${d.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{d.yesPct}%</span>
          <span className={`text-right font-bold ${d.bestEV > 0 ? 'text-terminal-green' : 'text-destructive'}`}>${d.bestEV.toFixed(1)}</span>
          <span className={`text-right font-bold ${d.bestSide === 'YES' ? 'text-terminal-green' : 'text-destructive'}`}>{d.bestSide}</span>
          <span className="text-right text-terminal-cyan font-mono">{(d.kelly * 100).toFixed(1)}%</span>
          <span className="text-right text-terminal-amber font-mono">${d.optimalBet.toFixed(0)}</span>
          <span className="text-right text-terminal-green font-mono">{d.roi.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
});
EVRankerPanel.displayName = 'EVRankerPanel';

// 8. Volatility Scanner
const VolatilityPanel = memo(({ events, liveTrades, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  liveTrades: (PolymarketLastTrade & { title?: string })[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const volatility = useMemo(() => {
    const tokenPrices = new Map<string, number[]>();
    for (const t of liveTrades) {
      const p = parseFloat(t.price || '0');
      if (p > 0) { const arr = tokenPrices.get(t.asset_id) || []; arr.push(p); tokenPrices.set(t.asset_id, arr); }
    }
    const results: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; priceRange: number; stdDev: number; tradeCount: number; implied: string; volScore: number }[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0.02 || yesPrice >= 0.98) continue;
        const vol = market.volume24hr || 0;
        if (vol < 3000) continue;
        const tokens = PolymarketService.extractTokenIds([market]);
        let maxStd = 0, maxRange = 0, totalTrades = 0;
        for (const tid of tokens) {
          const prices = tokenPrices.get(tid);
          if (!prices || prices.length < 3) continue;
          totalTrades += prices.length;
          const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
          const std = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
          const range = Math.max(...prices) - Math.min(...prices);
          if (std > maxStd) maxStd = std;
          if (range > maxRange) maxRange = range;
        }
        const distFrom50 = Math.abs(yesPrice - 0.5);
        const impliedVol = (1 - distFrom50 * 2) * 100;
        const volScore = maxStd * 1000 + impliedVol * 0.5;
        if (volScore > 5 || totalTrades > 5) {
          results.push({ event, market, yesPct: Math.round(yesPrice * 100), priceRange: maxRange * 100, stdDev: maxStd * 100, tradeCount: totalTrades, volScore, implied: impliedVol > 70 ? 'EXTREME' : impliedVol > 50 ? 'HIGH' : impliedVol > 30 ? 'MEDIUM' : 'LOW' });
        }
      }
    }
    return results.sort((a, b) => b.volScore - a.volScore).slice(0, 40);
  }, [events, liveTrades, getLivePrice]);

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-muted-foreground px-1 mb-2">{volatility.length} markets ranked by volatility</div>
      <div className="grid grid-cols-[1fr_45px_55px_55px_50px_65px] gap-1 px-3 py-1.5 text-[8px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>MARKET</span><span className="text-right">PROB</span><span className="text-right">RANGE</span>
        <span className="text-right">STD</span><span className="text-right">TRADES</span><span className="text-right">IMPLIED</span>
      </div>
      {volatility.map((v, i) => (
        <div key={v.market.id} onClick={() => onSelect(v.event)}
          className={`grid grid-cols-[1fr_45px_55px_55px_50px_65px] gap-1 px-3 py-1.5 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${v.implied === 'EXTREME' ? 'bg-destructive/[0.04]' : i < 5 ? 'bg-terminal-amber/[0.03]' : ''}`}>
          <span className="text-foreground truncate font-medium">{v.market.question}</span>
          <span className={`text-right font-bold ${v.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{v.yesPct}%</span>
          <span className="text-right text-terminal-amber font-mono">{v.priceRange.toFixed(1)}%</span>
          <span className="text-right text-terminal-cyan font-mono">{v.stdDev.toFixed(2)}</span>
          <span className="text-right text-muted-foreground">{v.tradeCount}</span>
          <span className={`text-right font-bold text-[9px] ${v.implied === 'EXTREME' ? 'text-destructive' : v.implied === 'HIGH' ? 'text-terminal-amber' : 'text-muted-foreground'}`}>
            {v.implied === 'EXTREME' ? '🌋' : v.implied === 'HIGH' ? '🔥' : v.implied === 'MEDIUM' ? '📊' : '❄️'} {v.implied}
          </span>
        </div>
      ))}
      {volatility.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs">Waiting for live trade data...</div>}
    </div>
  );
});
VolatilityPanel.displayName = 'VolatilityPanel';

// 9. Position Sizer — optimal portfolio allocation
const PositionSizerPanel = memo(({ events, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const [totalCapital, setTotalCapital] = useState(5000);
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const portfolio = useMemo(() => {
    const kellyMult = riskLevel === 'conservative' ? 0.25 : riskLevel === 'moderate' ? 0.5 : 0.75;
    const maxPos = riskLevel === 'conservative' ? 0.08 : riskLevel === 'moderate' ? 0.12 : 0.20;
    const minLiq = riskLevel === 'conservative' ? 100000 : riskLevel === 'moderate' ? 50000 : 20000;
    const candidates: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; side: 'YES' | 'NO'; kelly: number; ev: number; roi: number; allocation: number; potentialProfit: number }[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0.05 || yesPrice >= 0.95) continue;
        const liq = parseFloat(market.liquidity || '0');
        if (liq < minLiq) continue;
        for (const side of ['YES', 'NO'] as const) {
          const price = side === 'YES' ? yesPrice : 1 - yesPrice;
          const trueProb = Math.min(price + 0.05, 0.95);
          const kelly = PolymarketService.kellyFraction(trueProb, 1 / price) * kellyMult;
          if (kelly <= 0.005) continue;
          const ev = PolymarketService.expectedValue(trueProb, 100, 100 / price);
          const roi = PolymarketService.potentialROI(price);
          const allocation = Math.min(kelly, maxPos) * totalCapital;
          const potentialProfit = (allocation / price) - allocation;
          candidates.push({ event, market, yesPct: Math.round(yesPrice * 100), side, kelly, ev, roi, allocation, potentialProfit });
        }
      }
    }
    const byMarket = new Map<string, typeof candidates[0]>();
    for (const c of candidates) { const ex = byMarket.get(c.market.id); if (!ex || c.ev > ex.ev) byMarket.set(c.market.id, c); }
    const sorted = Array.from(byMarket.values()).sort((a, b) => b.ev - a.ev).slice(0, 20);
    const totalAlloc = sorted.reduce((s, c) => s + c.allocation, 0);
    if (totalAlloc > totalCapital) { const scale = totalCapital / totalAlloc; for (const c of sorted) { c.allocation *= scale; c.potentialProfit = (c.allocation / (c.side === 'YES' ? c.yesPct / 100 : (100 - c.yesPct) / 100)) - c.allocation; } }
    return sorted;
  }, [events, getLivePrice, totalCapital, riskLevel]);

  const totalAllocated = portfolio.reduce((s, p) => s + p.allocation, 0);
  const totalPotProfit = portfolio.reduce((s, p) => s + p.potentialProfit, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Capital:</span>
          {[1000, 5000, 10000, 50000].map(c => (
            <button key={c} onClick={() => setTotalCapital(c)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${totalCapital === c ? 'bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/30' : 'text-muted-foreground hover:text-foreground'}`}>${c.toLocaleString()}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Risk:</span>
          {(['conservative', 'moderate', 'aggressive'] as const).map(r => (
            <button key={r} onClick={() => setRiskLevel(r)} className={`px-2 py-0.5 rounded text-[9px] font-bold capitalize ${riskLevel === r ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30' : 'text-muted-foreground hover:text-foreground'}`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ALLOCATED', value: `$${totalAllocated.toFixed(0)}`, color: 'text-terminal-cyan' },
          { label: 'POSITIONS', value: portfolio.length.toString(), color: 'text-terminal-green' },
          { label: 'POT. PROFIT', value: `$${totalPotProfit.toFixed(0)}`, color: 'text-terminal-amber' },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-lg p-2.5 bg-card/30 text-center">
            <div className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className={`text-base font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[25px_1fr_45px_40px_55px_55px_55px] gap-1 px-3 py-1.5 text-[8px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>#</span><span>MARKET</span><span className="text-right">PROB</span><span className="text-right">SIDE</span>
        <span className="text-right">ALLOC</span><span className="text-right">PROFIT</span><span className="text-right">EV</span>
      </div>
      {portfolio.map((p, i) => (
        <div key={p.market.id} onClick={() => onSelect(p.event)}
          className="grid grid-cols-[25px_1fr_45px_40px_55px_55px_55px] gap-1 px-3 py-1.5 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30">
          <span className="text-muted-foreground font-mono">{i + 1}</span>
          <span className="text-foreground truncate font-medium">{p.market.question}</span>
          <span className={`text-right font-bold ${p.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{p.yesPct}%</span>
          <span className={`text-right font-bold ${p.side === 'YES' ? 'text-terminal-green' : 'text-destructive'}`}>{p.side}</span>
          <span className="text-right text-terminal-cyan font-mono">${p.allocation.toFixed(0)}</span>
          <span className="text-right text-terminal-green font-mono">${p.potentialProfit.toFixed(0)}</span>
          <span className={`text-right font-mono ${p.ev > 0 ? 'text-terminal-green' : 'text-destructive'}`}>${p.ev.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
});
PositionSizerPanel.displayName = 'PositionSizerPanel';

// 10. Conviction Tracker — markets with biggest probability shifts
const ConvictionPanel = memo(({ events, liveTrades, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  liveTrades: (PolymarketLastTrade & { title?: string })[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const convictions = useMemo(() => {
    const tokenFirstLast = new Map<string, { first: number; last: number; count: number }>();
    for (const t of liveTrades) {
      const p = parseFloat(t.price || '0');
      if (p <= 0) continue;
      const entry = tokenFirstLast.get(t.asset_id);
      if (!entry) tokenFirstLast.set(t.asset_id, { first: p, last: p, count: 1 });
      else { entry.last = p; entry.count++; }
    }
    const results: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; priceShift: number; direction: 'UP' | 'DOWN'; tradeCount: number; vol: number; conviction: string }[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0 || yesPrice >= 1) continue;
        const vol = market.volume24hr || 0;
        const tokens = PolymarketService.extractTokenIds([market]);
        let maxShift = 0, dir: 'UP' | 'DOWN' = 'UP', tc = 0;
        for (const tid of tokens) {
          const entry = tokenFirstLast.get(tid);
          if (!entry || entry.count < 3) continue;
          const shift = (entry.last - entry.first) * 100;
          tc += entry.count;
          if (Math.abs(shift) > Math.abs(maxShift)) { maxShift = shift; dir = shift >= 0 ? 'UP' : 'DOWN'; }
        }
        const absShift = Math.abs(maxShift);
        if (absShift < 1) continue;
        const conviction = absShift > 5 ? 'VERY_HIGH' : absShift > 3 ? 'HIGH' : 'MODERATE';
        results.push({ event, market, yesPct: Math.round(yesPrice * 100), priceShift: maxShift, direction: dir, tradeCount: tc, vol, conviction });
      }
    }
    return results.sort((a, b) => Math.abs(b.priceShift) - Math.abs(a.priceShift)).slice(0, 40);
  }, [events, liveTrades, getLivePrice]);

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-muted-foreground px-1 mb-2">{convictions.length} markets with significant price movement</div>
      <div className="grid grid-cols-[1fr_45px_60px_50px_60px_75px] gap-1 px-3 py-1.5 text-[8px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>MARKET</span><span className="text-right">NOW</span><span className="text-right">SHIFT</span>
        <span className="text-right">TRADES</span><span className="text-right">VOLUME</span><span className="text-right">CONVICTION</span>
      </div>
      {convictions.map((c) => (
        <div key={c.market.id} onClick={() => onSelect(c.event)}
          className={`grid grid-cols-[1fr_45px_60px_50px_60px_75px] gap-1 px-3 py-1.5 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${c.conviction === 'VERY_HIGH' ? 'bg-terminal-amber/[0.04]' : ''}`}>
          <span className="text-foreground truncate font-medium">{c.market.question}</span>
          <span className={`text-right font-bold ${c.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{c.yesPct}%</span>
          <span className={`text-right font-bold font-mono ${c.direction === 'UP' ? 'text-terminal-green' : 'text-destructive'}`}>
            {c.direction === 'UP' ? '↑' : '↓'}{Math.abs(c.priceShift).toFixed(1)}%
          </span>
          <span className="text-right text-muted-foreground">{c.tradeCount}</span>
          <span className="text-right text-terminal-cyan font-mono">{PolymarketService.formatVolume(c.vol)}</span>
          <span className={`text-right font-bold text-[8px] ${c.conviction === 'VERY_HIGH' ? 'text-terminal-amber' : c.conviction === 'HIGH' ? 'text-terminal-cyan' : 'text-muted-foreground'}`}>
            {c.conviction === 'VERY_HIGH' ? '🔥 V.HIGH' : c.conviction === 'HIGH' ? '⚡ HIGH' : '📊 MOD'}
          </span>
        </div>
      ))}
      {convictions.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs">Waiting for live trade data...</div>}
    </div>
  );
});
ConvictionPanel.displayName = 'ConvictionPanel';

// 11. Profit Simulator — Monte Carlo
const ProfitSimPanel = memo(({ events, getLivePrice }: {
  events: PolymarketEvent[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
}) => {
  const [capital, setCapital] = useState(5000);
  const sim = useMemo(() => {
    const bets: { price: number }[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0.05 || yesPrice >= 0.95) continue;
        const liq = parseFloat(market.liquidity || '0');
        if (liq < 20000) continue;
        const ev = PolymarketService.expectedValue(yesPrice + 0.05, 100, 100 / yesPrice);
        if (ev > 0) bets.push({ price: yesPrice });
      }
    }
    bets.sort((a, b) => b.price - a.price);
    const topBets = bets.slice(0, 20);
    if (topBets.length === 0) return null;
    const betPer = capital / topBets.length;
    const finals: number[] = [];
    const simRuns = 1000;
    for (let r = 0; r < simRuns; r++) {
      let eq = capital;
      for (const bet of topBets) {
        if (Math.random() < (bet.price + 0.03)) eq += betPer * ((1 / bet.price) - 1);
        else eq -= betPer;
      }
      finals.push(eq);
    }
    finals.sort((a, b) => a - b);
    const mean = finals.reduce((a, b) => a + b, 0) / simRuns;
    const p10 = finals[Math.floor(simRuns * 0.1)];
    const p50 = finals[Math.floor(simRuns * 0.5)];
    const p90 = finals[Math.floor(simRuns * 0.9)];
    const winRate = finals.filter(e => e > capital).length / simRuns * 100;
    const bucketCount = 20;
    const min = Math.min(...finals), max = Math.max(...finals);
    const bs = (max - min) / bucketCount || 1;
    const histogram: { range: string; count: number; isProfit: boolean }[] = [];
    for (let b = 0; b < bucketCount; b++) {
      const lo = min + b * bs;
      histogram.push({ range: `$${lo.toFixed(0)}`, count: finals.filter(e => e >= lo && e < lo + bs).length, isProfit: lo >= capital });
    }
    return { mean, p10, p50, p90, winRate, bestCase: Math.max(...finals), maxLoss: Math.min(...finals) - capital, numBets: topBets.length, histogram };
  }, [events, getLivePrice, capital]);

  if (!sim) return <div className="text-center py-8 text-muted-foreground text-xs">Not enough +EV markets to simulate</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Capital:</span>
        {[1000, 5000, 10000].map(c => (
          <button key={c} onClick={() => setCapital(c)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${capital === c ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30' : 'text-muted-foreground hover:text-foreground'}`}>${c.toLocaleString()}</button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'WIN RATE', value: `${sim.winRate.toFixed(1)}%`, color: sim.winRate > 50 ? 'text-terminal-green' : 'text-destructive' },
          { label: 'MEDIAN', value: `$${sim.p50.toFixed(0)}`, color: sim.p50 > capital ? 'text-terminal-green' : 'text-destructive' },
          { label: 'MEAN', value: `$${sim.mean.toFixed(0)}`, color: sim.mean > capital ? 'text-terminal-green' : 'text-destructive' },
          { label: 'BEST CASE', value: `$${sim.bestCase.toFixed(0)}`, color: 'text-terminal-amber' },
          { label: 'MAX LOSS', value: `$${sim.maxLoss.toFixed(0)}`, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-lg p-2 bg-card/30 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">{s.label}</div>
            <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="border border-border rounded-lg p-3 bg-card/30">
        <div className="text-[10px] font-bold text-terminal-amber uppercase tracking-wider mb-3">EQUITY DISTRIBUTION ({sim.numBets} bets × 1,000 runs)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sim.histogram}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis dataKey="range" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10, borderRadius: 4 }} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {sim.histogram.map((entry, idx) => (
                <Cell key={idx} fill={entry.isProfit ? 'hsl(var(--terminal-green))' : 'hsl(var(--destructive))'} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[10px]">
        <div className="text-center"><span className="text-muted-foreground block text-[9px]">10th pctl</span><span className={`font-bold ${sim.p10 >= capital ? 'text-terminal-green' : 'text-destructive'}`}>${sim.p10.toFixed(0)}</span></div>
        <div className="text-center"><span className="text-muted-foreground block text-[9px]">50th pctl</span><span className={`font-bold ${sim.p50 >= capital ? 'text-terminal-green' : 'text-destructive'}`}>${sim.p50.toFixed(0)}</span></div>
        <div className="text-center"><span className="text-muted-foreground block text-[9px]">90th pctl</span><span className={`font-bold ${sim.p90 >= capital ? 'text-terminal-green' : 'text-destructive'}`}>${sim.p90.toFixed(0)}</span></div>
      </div>
    </div>
  );
});
ProfitSimPanel.displayName = 'ProfitSimPanel';

// 12. Value Composite Score
const ValueCompositePanel = memo(({ events, liveTrades, getLivePrice, onSelect }: {
  events: PolymarketEvent[];
  liveTrades: (PolymarketLastTrade & { title?: string })[];
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
  onSelect: (e: PolymarketEvent) => void;
}) => {
  const composites = useMemo(() => {
    const tokenFlow = new Map<string, { buys: number; sells: number; total: number }>();
    for (const t of liveTrades) {
      const entry = tokenFlow.get(t.asset_id) || { buys: 0, sells: 0, total: 0 };
      const val = parseFloat(t.price || '0') * parseFloat(t.size || '0');
      if (t.side === 'BUY') entry.buys += val; else entry.sells += val;
      entry.total += val;
      tokenFlow.set(t.asset_id, entry);
    }
    const allVols = events.flatMap(e => (e.markets || []).map(m => m.volume24hr || 0)).filter(v => v > 0);
    const medianVol = allVols.sort((a, b) => a - b)[Math.floor(allVols.length / 2)] || 1;

    const results: { event: PolymarketEvent; market: PolymarketMarket; yesPct: number; compositeScore: number; evScore: number; momentumScore: number; volumeScore: number; liquidityScore: number; timeScore: number; bestSide: 'YES' | 'NO'; grade: string }[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        const { yesPrice } = getLivePrice(market);
        if (yesPrice <= 0.03 || yesPrice >= 0.97) continue;
        const vol = market.volume24hr || 0;
        const liq = parseFloat(market.liquidity || '0');
        if (liq < 5000) continue;
        const yesEV = PolymarketService.expectedValue(yesPrice + 0.05, 100, 100 / yesPrice);
        const noEV = PolymarketService.expectedValue((1 - yesPrice) + 0.05, 100, 100 / (1 - yesPrice));
        const bestSide: 'YES' | 'NO' = yesEV > noEV ? 'YES' : 'NO';
        const evScore = Math.min(Math.max(yesEV, noEV) / 4, 25);
        const tokens = PolymarketService.extractTokenIds([market]);
        let buyPressure = 0.5;
        for (const tid of tokens) { const flow = tokenFlow.get(tid); if (flow && flow.total > 0) buyPressure = flow.buys / flow.total; }
        const momentumScore = bestSide === 'YES' ? Math.min(buyPressure * 25, 25) : Math.min((1 - buyPressure) * 25, 25);
        const volumeScore = Math.min((vol / medianVol) * 5, 25);
        const liquidityScore = Math.min(liq / 100000 * 15, 15);
        let timeScore = 5;
        if (market.endDate) { const d = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000); if (d > 0 && d <= 7) timeScore = 10; else if (d <= 14) timeScore = 8; }
        const compositeScore = evScore + momentumScore + volumeScore + liquidityScore + timeScore;
        const grade = compositeScore >= 70 ? 'A+' : compositeScore >= 60 ? 'A' : compositeScore >= 50 ? 'B+' : compositeScore >= 40 ? 'B' : compositeScore >= 30 ? 'C' : 'D';
        results.push({ event, market, yesPct: Math.round(yesPrice * 100), compositeScore, evScore, momentumScore, volumeScore, liquidityScore, timeScore, bestSide, grade });
      }
    }
    return results.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 50);
  }, [events, liveTrades, getLivePrice]);

  const gradeColor = (g: string) => g === 'A+' || g === 'A' ? 'text-terminal-green' : g === 'B+' || g === 'B' ? 'text-terminal-amber' : 'text-destructive';

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground px-1 mb-1">Composite = EV(25) + Momentum(25) + Volume(25) + Liquidity(15) + Time(10)</div>
      <div className="grid grid-cols-[25px_1fr_35px_40px_50px_30px_30px_30px_30px_30px] gap-1 px-2 py-1.5 text-[7px] text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
        <span>#</span><span>MARKET</span><span className="text-right">PROB</span><span className="text-right">SIDE</span>
        <span className="text-right">SCORE</span><span className="text-right">EV</span><span className="text-right">MOM</span>
        <span className="text-right">VOL</span><span className="text-right">LIQ</span><span className="text-right">GRD</span>
      </div>
      {composites.map((c, i) => (
        <div key={c.market.id} onClick={() => onSelect(c.event)}
          className={`grid grid-cols-[25px_1fr_35px_40px_50px_30px_30px_30px_30px_30px] gap-1 px-2 py-1.5 text-[10px] border-b border-border/20 cursor-pointer hover:bg-muted/30 ${i < 3 ? 'bg-terminal-green/[0.04]' : ''}`}>
          <span className="text-muted-foreground font-mono">{i + 1}</span>
          <span className="text-foreground truncate font-medium">{c.market.question}</span>
          <span className={`text-right font-bold ${c.yesPct >= 50 ? 'text-terminal-green' : 'text-destructive'}`}>{c.yesPct}%</span>
          <span className={`text-right font-bold ${c.bestSide === 'YES' ? 'text-terminal-green' : 'text-destructive'}`}>{c.bestSide}</span>
          <span className="text-right font-black text-terminal-amber">{c.compositeScore.toFixed(0)}</span>
          <span className="text-right text-terminal-green font-mono text-[8px]">{c.evScore.toFixed(0)}</span>
          <span className="text-right text-terminal-cyan font-mono text-[8px]">{c.momentumScore.toFixed(0)}</span>
          <span className="text-right text-terminal-amber font-mono text-[8px]">{c.volumeScore.toFixed(0)}</span>
          <span className="text-right text-muted-foreground font-mono text-[8px]">{c.liquidityScore.toFixed(0)}</span>
          <span className={`text-right font-black ${gradeColor(c.grade)}`}>{c.grade}</span>
        </div>
      ))}
    </div>
  );
});
ValueCompositePanel.displayName = 'ValueCompositePanel';

// ============ MAIN ANALYTICS COMPONENT ============

const ANALYSIS_TABS = [
  { id: 'composite', label: '🏆 Value Score', icon: Brain },
  { id: 'opportunities', label: '🎯 Opportunities', icon: Target },
  { id: 'evranker', label: '💰 EV Ranker', icon: DollarSign },
  { id: 'positionsizer', label: '📐 Position Sizer', icon: Shield },
  { id: 'profitsim', label: '🎰 Profit Sim', icon: BarChart3 },
  { id: 'whales', label: '🐋 Smart Money', icon: Eye },
  { id: 'conviction', label: '🔮 Conviction', icon: TrendingUp },
  { id: 'momentum', label: '🚀 Momentum', icon: TrendingUp },
  { id: 'volatility', label: '🌋 Volatility', icon: Activity },
  { id: 'volume', label: '📊 Vol Anomalies', icon: Flame },
  { id: 'edge', label: '⚡ Edge Scanner', icon: Zap },
  { id: 'timedecay', label: '⏰ Time Decay', icon: AlertTriangle },
  { id: 'arbitrage', label: '🔄 Arbitrage', icon: ArrowUpRight },
  { id: 'liquidity', label: '🏊 Liquidity', icon: DollarSign },
  { id: 'multioutcome', label: '🎲 Multi-Outcome', icon: Activity },
  { id: 'rotation', label: '🔄 Rotation', icon: Shield },
  { id: 'scatter', label: '🗺️ Scatter Map', icon: BarChart3 },
  { id: 'structure', label: '🏗️ Structure', icon: Brain },
];

const PolymarketAnalytics = memo(({ events, allMarkets, liveTrades, onSelectEvent, getLivePrice }: AnalyticsProps) => {
  const [activeAnalysis, setActiveAnalysis] = useState('composite');

  const opportunities = useMemo(() => computeOpportunities(events, allMarkets, getLivePrice), [events, allMarkets, getLivePrice]);
  const whaleActivity = useMemo(() => computeWhaleActivity(liveTrades), [liveTrades]);
  const volumeAnomalies = useMemo(() => computeVolumeAnomalies(events, getLivePrice), [events, getLivePrice]);
  const arbitrageOpps = useMemo(() => computeArbitrageOpportunities(events, getLivePrice), [events, getLivePrice]);
  const marketStructure = useMemo(() => computeMarketStructure(events, getLivePrice), [events, getLivePrice]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-terminal-amber" />
          <span className="text-[11px] font-bold text-terminal-amber tracking-wider">ABLE ANALYTICS ENGINE v3</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="text-terminal-green">{opportunities.length} signals</span>
          <span className="text-terminal-amber">🐋 {whaleActivity.length}</span>
          <span className="text-terminal-cyan">{volumeAnomalies.length} anomalies</span>
          <span className="text-foreground font-bold">{ANALYSIS_TABS.length} tools</span>
        </div>
      </div>

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

      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeAnalysis === 'composite' && <ValueCompositePanel events={events} liveTrades={liveTrades} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'opportunities' && <OpportunitiesPanel opportunities={opportunities} onSelect={onSelectEvent} />}
          {activeAnalysis === 'evranker' && <EVRankerPanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'positionsizer' && <PositionSizerPanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'profitsim' && <ProfitSimPanel events={events} getLivePrice={getLivePrice} />}
          {activeAnalysis === 'whales' && <WhalePanel activities={whaleActivity} />}
          {activeAnalysis === 'conviction' && <ConvictionPanel events={events} liveTrades={liveTrades} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'momentum' && <MomentumPanel events={events} liveTrades={liveTrades} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'volatility' && <VolatilityPanel events={events} liveTrades={liveTrades} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'volume' && <VolumeAnomalyPanel anomalies={volumeAnomalies} onSelect={onSelectEvent} />}
          {activeAnalysis === 'edge' && <EdgeScannerPanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'timedecay' && <TimeDecayPanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'arbitrage' && <ArbitragePanel arbs={arbitrageOpps} onSelect={onSelectEvent} />}
          {activeAnalysis === 'liquidity' && <LiquidityPanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'multioutcome' && <MultiOutcomePanel events={events} getLivePrice={getLivePrice} onSelect={onSelectEvent} />}
          {activeAnalysis === 'rotation' && <CategoryRotationPanel events={events} getLivePrice={getLivePrice} />}
          {activeAnalysis === 'scatter' && <HeatmapOverviewPanel events={events} getLivePrice={getLivePrice} />}
          {activeAnalysis === 'structure' && <StructurePanel structure={marketStructure} />}
        </div>
      </ScrollArea>
    </div>
  );
});
PolymarketAnalytics.displayName = 'PolymarketAnalytics';

export default PolymarketAnalytics;
