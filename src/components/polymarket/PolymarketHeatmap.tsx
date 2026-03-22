import { memo, useMemo, useCallback, useState } from 'react';
import { PolymarketEvent, PolymarketService } from '@/services/PolymarketService';
import { PolymarketMarket } from '@/services/PolymarketService';

interface Props {
  events: PolymarketEvent[];
  onSelectEvent: (event: PolymarketEvent) => void;
  selectedEventId?: string;
  getLivePrice: (m: any) => { yesPrice: number; noPrice: number };
}

interface TreemapItem {
  event: PolymarketEvent;
  volume: number;
  yesPrice: number;
  category: string;
}

// Squarified treemap layout for professional look
function layoutSquarified(
  items: TreemapItem[],
  x: number, y: number, w: number, h: number
): (TreemapItem & { x: number; y: number; w: number; h: number })[] {
  if (items.length === 0 || w <= 0 || h <= 0) return [];
  const totalVol = items.reduce((s, i) => s + i.volume, 0);
  if (totalVol <= 0) return [];

  const result: (TreemapItem & { x: number; y: number; w: number; h: number })[] = [];
  const sorted = [...items].sort((a, b) => b.volume - a.volume);
  
  let remaining = sorted;
  let cx = x, cy = y, cw = w, ch = h;
  
  while (remaining.length > 0) {
    const isWide = cw >= ch;
    const totalRemaining = remaining.reduce((s, i) => s + i.volume, 0);
    
    // Find best row using squarify algorithm
    let bestRow: TreemapItem[] = [];
    let bestWorst = Infinity;
    let rowVol = 0;
    
    for (let i = 0; i < remaining.length; i++) {
      const testRow = remaining.slice(0, i + 1);
      rowVol = testRow.reduce((s, item) => s + item.volume, 0);
      const rowFraction = rowVol / totalRemaining;
      const side = isWide ? cw * rowFraction : ch * rowFraction;
      
      let worstAspect = 0;
      for (const item of testRow) {
        const itemFrac = item.volume / rowVol;
        const itemSide = (isWide ? ch : cw) * itemFrac;
        const aspect = Math.max(side / itemSide, itemSide / side);
        worstAspect = Math.max(worstAspect, aspect);
      }
      
      if (worstAspect <= bestWorst) {
        bestWorst = worstAspect;
        bestRow = testRow;
      } else {
        break; // Aspect ratio getting worse, stop
      }
    }
    
    if (bestRow.length === 0) {
      bestRow = [remaining[0]];
    }
    
    remaining = remaining.slice(bestRow.length);
    const bestRowVol = bestRow.reduce((s, i) => s + i.volume, 0);
    const rowFraction = bestRowVol / totalRemaining;
    const rowSize = isWide ? cw * rowFraction : ch * rowFraction;
    
    let offset = 0;
    for (const item of bestRow) {
      const itemFraction = item.volume / bestRowVol;
      const itemSize = (isWide ? ch : cw) * itemFraction;
      result.push({
        ...item,
        x: isWide ? cx : cx + offset,
        y: isWide ? cy + offset : cy,
        w: isWide ? rowSize : itemSize,
        h: isWide ? itemSize : rowSize,
      });
      offset += itemSize;
    }
    
    if (isWide) { cx += rowSize; cw -= rowSize; }
    else { cy += rowSize; ch -= rowSize; }
  }
  return result;
}

function getHeatColor(yesPrice: number): { bg: string; text: string; glow: string } {
  if (yesPrice >= 0.90) return { bg: 'rgba(8,153,129,0.50)', text: '#0ECB81', glow: 'rgba(8,153,129,0.15)' };
  if (yesPrice >= 0.75) return { bg: 'rgba(38,166,154,0.38)', text: '#26a69a', glow: 'rgba(38,166,154,0.10)' };
  if (yesPrice >= 0.60) return { bg: 'rgba(76,175,80,0.28)', text: '#4caf50', glow: 'rgba(76,175,80,0.08)' };
  if (yesPrice >= 0.45) return { bg: 'rgba(120,123,134,0.22)', text: '#9E9EA8', glow: 'rgba(120,123,134,0.06)' };
  if (yesPrice >= 0.30) return { bg: 'rgba(244,67,54,0.28)', text: '#f44336', glow: 'rgba(244,67,54,0.08)' };
  if (yesPrice >= 0.15) return { bg: 'rgba(239,83,80,0.38)', text: '#ef5350', glow: 'rgba(239,83,80,0.10)' };
  return { bg: 'rgba(211,47,47,0.50)', text: '#F6465D', glow: 'rgba(211,47,47,0.15)' };
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Elections': ['election', 'president', 'governor', 'senate', 'congress', 'vote', 'nominee', 'primary', 'democrat', 'republican', 'netanyahu', 'trudeau', 'modi', 'macron', 'starmer'],
  'Fed & Rates': ['fed', 'fomc', 'interest rate', 'inflation', 'cpi', 'gdp', 'treasury', 'unemployment', 'jobs', 'monetary', 'recession', 'tariff'],
  'Bitcoin': ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'solana', 'defi', 'nft', 'blockchain', 'dogecoin', 'xrp'],
  'Geopolitics': ['war', 'conflict', 'military', 'nato', 'china', 'russia', 'ukraine', 'iran', 'missile', 'sanction', 'territory', 'cease', 'peace', 'trump', 'musk'],
  'AI & Tech': ['ai', 'gpt', 'openai', 'google', 'anthropic', 'llm', 'artificial intelligence', 'machine learning', 'chatgpt', 'apple', 'meta', 'tesla', 'nvidia'],
  'Sports': ['nba', 'nfl', 'mlb', 'soccer', 'football', 'basketball', 'tennis', 'premier league', 'champion', 'playoff', 'world cup', 'ncaa', 'esports', 'ufc', 'f1', 'formula'],
  'Regulation': ['regulation', 'sec', 'ban', 'law', 'bill', 'executive order', 'policy', 'tiktok', 'supreme court'],
  'Earnings': ['earnings', 'revenue', 'stock', 'market cap', 'ipo', 'sp500', 's&p', 'dow', 'nasdaq'],
  'Entertainment': ['oscar', 'grammy', 'movie', 'music', 'album', 'celebrity', 'twitter', 'tweet', 'instagram', 'youtube', 'twitch'],
};

function categorize(event: PolymarketEvent): string {
  const text = `${event.title} ${event.description || ''}`.toLowerCase();
  const tagLabels = (event.tags || []).map((t: any) => (typeof t === 'string' ? t : t?.label || '').toLowerCase()).join(' ');
  const combined = `${text} ${tagLabels}`;
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => combined.includes(kw))) return cat;
  }
  return 'Other';
}

const HeatmapCell = memo(({ item, isSelected, onClick, containerWidth }: {
  item: TreemapItem & { x: number; y: number; w: number; h: number };
  isSelected: boolean;
  onClick: () => void;
  containerWidth: number;
}) => {
  const [hovered, setHovered] = useState(false);
  const pct = Math.round(item.yesPrice * 100);
  const vol = PolymarketService.formatVolume(item.volume);
  const colors = getHeatColor(item.yesPrice);
  const showTitle = item.w > 50 && item.h > 35;
  const showVol = item.w > 70 && item.h > 50;
  const showCat = item.w > 100 && item.h > 65;
  const isLarge = item.w > 160 && item.h > 80;
  
  const title = item.event.title.length > (isLarge ? 50 : item.w < 120 ? 20 : 35)
    ? item.event.title.slice(0, isLarge ? 48 : item.w < 120 ? 18 : 33) + '…'
    : item.event.title;

  const scaleFactor = containerWidth / 1400;
  const pctFontSize = Math.max(10, Math.min(isLarge ? 22 : 15, item.w * 0.12)) * scaleFactor;
  const titleFontSize = Math.max(7, Math.min(isLarge ? 11 : 9, item.w * 0.07)) * scaleFactor;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Cell background */}
      <rect
        x={item.x + 0.5} y={item.y + 0.5}
        width={Math.max(item.w - 1, 0)} height={Math.max(item.h - 1, 0)}
        rx={3} fill={colors.bg}
        stroke={isSelected ? 'hsl(var(--terminal-amber))' : hovered ? 'hsl(var(--foreground)/0.3)' : 'hsl(var(--border)/0.4)'}
        strokeWidth={isSelected ? 2 : hovered ? 1.5 : 0.5}
        opacity={hovered ? 1 : 0.95}
      />
      {/* Inner glow */}
      <rect
        x={item.x + 2} y={item.y + 2}
        width={Math.max(item.w - 5, 0)} height={Math.max(item.h - 5, 0)}
        rx={2} fill="none"
        stroke={colors.glow} strokeWidth={1} opacity={0.5}
      />
      {showTitle && (
        <>
          {/* Category label */}
          {showCat && (
            <text
              x={item.x + item.w / 2} y={item.y + (isLarge ? 18 : 14)}
              textAnchor="middle" dominantBaseline="central"
              fill="hsl(var(--muted-foreground))"
              fontSize={Math.max(6, titleFontSize * 0.7)} fontWeight="600"
              opacity={0.5} letterSpacing="0.5"
            >{item.category.toUpperCase()}</text>
          )}
          {/* Title */}
          <text
            x={item.x + item.w / 2}
            y={item.y + item.h / 2 - (showVol ? pctFontSize * 0.6 : pctFontSize * 0.2)}
            textAnchor="middle" dominantBaseline="central"
            fill="hsl(var(--foreground))"
            fontSize={titleFontSize} fontWeight="600"
            opacity={0.85}
          >{title}</text>
          {/* Probability */}
          <text
            x={item.x + item.w / 2}
            y={item.y + item.h / 2 + (showVol ? titleFontSize * 0.4 : titleFontSize * 1.2)}
            textAnchor="middle" dominantBaseline="central"
            fill={colors.text}
            fontSize={pctFontSize} fontWeight="900"
            fontFamily="'JetBrains Mono', monospace"
          >{pct > 0 ? `${pct}%` : '<1%'}</text>
          {/* Volume */}
          {showVol && (
            <text
              x={item.x + item.w / 2}
              y={item.y + item.h / 2 + pctFontSize * 1.1 + titleFontSize * 0.2}
              textAnchor="middle" dominantBaseline="central"
              fill="hsl(var(--muted-foreground))" fontSize={Math.max(6, titleFontSize * 0.75)}
              opacity={0.55} fontFamily="'JetBrains Mono', monospace"
            >{vol}</text>
          )}
        </>
      )}
      {/* Tooltip on hover for tiny cells */}
      {hovered && !showTitle && (
        <>
          <rect x={item.x + item.w / 2 - 60} y={item.y - 28}
            width={120} height={24} rx={4}
            fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} />
          <text x={item.x + item.w / 2} y={item.y - 16}
            textAnchor="middle" dominantBaseline="central"
            fill="hsl(var(--foreground))" fontSize={8} fontWeight="600"
          >{item.event.title.slice(0, 25)}{item.event.title.length > 25 ? '…' : ''} {pct}%</text>
        </>
      )}
    </g>
  );
});
HeatmapCell.displayName = 'HeatmapCell';

const PolymarketHeatmap = memo(({ events, onSelectEvent, selectedEventId, getLivePrice }: Props) => {
  const items = useMemo<TreemapItem[]>(() => {
    return events
      .filter(e => e.active && !e.closed && (e.volume24hr || 0) > 0)
      .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
      .slice(0, 120)
      .map(event => {
        const markets = event.markets || [];
        const firstMarket = markets[0];
        const yesPrice = firstMarket ? getLivePrice(firstMarket).yesPrice : 0.5;
        return { event, volume: event.volume24hr || 1, yesPrice, category: categorize(event) };
      });
  }, [events, getLivePrice]);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, TreemapItem[]>();
    for (const item of items) {
      const arr = groups.get(item.category) || [];
      arr.push(item);
      groups.set(item.category, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const volA = a[1].reduce((s, i) => s + i.volume, 0);
      const volB = b[1].reduce((s, i) => s + i.volume, 0);
      return volB - volA;
    });
  }, [items]);

  const handleClick = useCallback((event: PolymarketEvent) => { onSelectEvent(event); }, [onSelectEvent]);

  const containerWidth = 1400;
  const containerHeight = 700;
  const layoutItems = useMemo(() => layoutSquarified(items, 0, 0, containerWidth, containerHeight), [items]);

  return (
    <div className="flex flex-col h-full">
      {/* Legend bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50">
        <div className="flex flex-wrap gap-3">
          {categoryGroups.map(([cat, catItems]) => {
            const catVol = catItems.reduce((s, i) => s + i.volume, 0);
            return (
              <div key={cat} className="flex items-center gap-1 text-[10px]">
                <span className="text-foreground font-semibold">{cat}</span>
                <span className="text-muted-foreground">({catItems.length})</span>
                <span className="text-muted-foreground/50 text-[8px]">{PolymarketService.formatVolume(catVol)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span>{items.length} markets</span>
        </div>
      </div>

      {/* Treemap */}
      <div className="flex-1 p-1.5 overflow-hidden">
        <div className="relative w-full h-full" style={{ minHeight: 400 }}>
          <svg width="100%" height="100%"
            viewBox={`0 0 ${containerWidth} ${containerHeight}`}
            preserveAspectRatio="xMidYMid meet">
            {/* Background */}
            <rect width={containerWidth} height={containerHeight} fill="hsl(var(--background))" rx={4} />
            {layoutItems.map((item) => (
              <HeatmapCell
                key={item.event.id}
                item={item}
                isSelected={selectedEventId === item.event.id}
                onClick={() => handleClick(item.event)}
                containerWidth={containerWidth}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Color scale footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-card/50 text-[9px] text-muted-foreground">
        <span className="font-medium">Size = 24h Volume</span>
        <div className="flex items-center gap-1.5">
          <span className="text-destructive font-semibold text-[8px]">LOW</span>
          <div className="flex h-3 rounded-sm overflow-hidden border border-border/30">
            {[
              'rgba(211,47,47,0.50)', 'rgba(239,83,80,0.38)', 'rgba(244,67,54,0.28)',
              'rgba(120,123,134,0.22)',
              'rgba(76,175,80,0.28)', 'rgba(38,166,154,0.38)', 'rgba(8,153,129,0.50)',
            ].map((c, i) => (
              <div key={i} className="w-6 h-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-terminal-green font-semibold text-[8px]">HIGH</span>
        </div>
        <span className="font-medium">Color = Probability</span>
      </div>
    </div>
  );
});
PolymarketHeatmap.displayName = 'PolymarketHeatmap';

export default PolymarketHeatmap;
