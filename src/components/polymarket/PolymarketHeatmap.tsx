import { memo, useMemo, useCallback } from 'react';
import { PolymarketEvent, PolymarketService } from '@/services/PolymarketService';

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

// Simple treemap layout algorithm (squarified-like)
function layoutTreemap(items: TreemapItem[], width: number, height: number): (TreemapItem & { x: number; y: number; w: number; h: number })[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  const totalVol = items.reduce((s, i) => s + i.volume, 0);
  if (totalVol <= 0) return [];

  const result: (TreemapItem & { x: number; y: number; w: number; h: number })[] = [];
  let remaining = [...items];
  let x = 0, y = 0, w = width, h = height;

  while (remaining.length > 0) {
    const isHorizontal = w >= h;
    const totalRemaining = remaining.reduce((s, i) => s + i.volume, 0);
    
    // Take items for this row
    let row: TreemapItem[] = [];
    let rowVol = 0;
    const target = totalRemaining * (isHorizontal ? h : w) / (isHorizontal ? w : h) * 0.4;

    for (const item of remaining) {
      row.push(item);
      rowVol += item.volume;
      if (rowVol >= target && row.length >= 1) break;
    }
    if (row.length === 0) break;
    remaining = remaining.slice(row.length);

    const rowFraction = rowVol / totalRemaining;
    const rowSize = isHorizontal ? w * rowFraction : h * rowFraction;

    let offset = 0;
    for (const item of row) {
      const itemFraction = item.volume / rowVol;
      const itemSize = (isHorizontal ? h : w) * itemFraction;

      result.push({
        ...item,
        x: isHorizontal ? x : x + offset,
        y: isHorizontal ? y + offset : y,
        w: isHorizontal ? rowSize : itemSize,
        h: isHorizontal ? itemSize : rowSize,
      });
      offset += itemSize;
    }

    if (isHorizontal) {
      x += rowSize;
      w -= rowSize;
    } else {
      y += rowSize;
      h -= rowSize;
    }
  }

  return result;
}

function getHeatmapColor(yesPrice: number): string {
  // Color based on probability: high prob = green, low = red, mid = neutral
  if (yesPrice >= 0.8) return 'hsl(var(--terminal-green))';
  if (yesPrice >= 0.6) return 'hsl(142, 60%, 35%)';
  if (yesPrice >= 0.4) return 'hsl(45, 50%, 35%)';
  if (yesPrice >= 0.2) return 'hsl(0, 40%, 35%)';
  return 'hsl(0, 60%, 30%)';
}

function getHeatmapBg(yesPrice: number): string {
  if (yesPrice >= 0.8) return 'hsla(var(--terminal-green), 0.25)';
  if (yesPrice >= 0.6) return 'hsla(142, 60%, 35%, 0.2)';
  if (yesPrice >= 0.4) return 'hsla(45, 50%, 35%, 0.15)';
  if (yesPrice >= 0.2) return 'hsla(0, 40%, 35%, 0.15)';
  return 'hsla(0, 60%, 30%, 0.2)';
}

const CATEGORY_COLORS: Record<string, string> = {
  'Elections': 'hsl(210, 70%, 50%)',
  'Fed & Rates': 'hsl(45, 80%, 50%)',
  'Bitcoin': 'hsl(35, 90%, 55%)',
  'Geopolitics': 'hsl(0, 60%, 50%)',
  'AI & Tech': 'hsl(270, 60%, 55%)',
  'Sports': 'hsl(142, 50%, 45%)',
  'Regulation': 'hsl(190, 60%, 45%)',
  'Earnings': 'hsl(320, 50%, 50%)',
  'Entertainment': 'hsl(280, 50%, 55%)',
  'Other': 'hsl(220, 20%, 45%)',
};

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

const PolymarketHeatmap = memo(({ events, onSelectEvent, selectedEventId, getLivePrice }: Props) => {
  const items = useMemo<TreemapItem[]>(() => {
    return events
      .filter(e => e.active && !e.closed && (e.volume24hr || 0) > 0)
      .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
      .slice(0, 80) // Top 80 by volume for readability
      .map(event => {
        const markets = event.markets || [];
        const firstMarket = markets[0];
        const yesPrice = firstMarket ? getLivePrice(firstMarket).yesPrice : 0.5;
        return {
          event,
          volume: event.volume24hr || 1,
          yesPrice,
          category: categorize(event),
        };
      });
  }, [events, getLivePrice]);

  // Group by category for section headers
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

  const handleClick = useCallback((event: PolymarketEvent) => {
    onSelectEvent(event);
  }, [onSelectEvent]);

  // Full treemap layout
  const containerWidth = 1200;
  const containerHeight = 600;
  const layoutItems = useMemo(() => layoutTreemap(items, containerWidth, containerHeight), [items]);

  return (
    <div className="flex flex-col h-full">
      {/* Category legend */}
      <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-border bg-card/30">
        {categoryGroups.map(([cat, catItems]) => (
          <div key={cat} className="flex items-center gap-1 text-[9px]">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'] }} />
            <span className="text-muted-foreground">{cat}</span>
            <span className="text-foreground font-bold">({catItems.length})</span>
          </div>
        ))}
      </div>

      {/* Treemap */}
      <div className="flex-1 p-2 overflow-hidden">
        <div className="relative w-full h-full" style={{ minHeight: 400 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${containerWidth} ${containerHeight}`} preserveAspectRatio="xMidYMid meet">
            {layoutItems.map((item, i) => {
              const pct = Math.round(item.yesPrice * 100);
              const vol = PolymarketService.formatVolume(item.volume);
              const isSelected = selectedEventId === item.event.id;
              const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];
              const showLabel = item.w > 60 && item.h > 35;
              const showVol = item.w > 80 && item.h > 50;
              const title = item.event.title.length > 40 && item.w < 150
                ? item.event.title.slice(0, 35) + '...'
                : item.event.title.length > 60
                  ? item.event.title.slice(0, 55) + '...'
                  : item.event.title;

              return (
                <g key={item.event.id} onClick={() => handleClick(item.event)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={item.x + 1} y={item.y + 1}
                    width={Math.max(item.w - 2, 0)} height={Math.max(item.h - 2, 0)}
                    rx={3}
                    fill={isSelected ? 'hsla(var(--terminal-amber), 0.15)' : getHeatmapBg(item.yesPrice)}
                    stroke={isSelected ? 'hsl(var(--terminal-amber))' : catColor}
                    strokeWidth={isSelected ? 2 : 0.5}
                    strokeOpacity={isSelected ? 1 : 0.4}
                  />
                  {/* Category stripe */}
                  <rect
                    x={item.x + 1} y={item.y + 1}
                    width={Math.max(item.w - 2, 0)} height={3}
                    rx={3}
                    fill={catColor}
                    opacity={0.7}
                  />
                  {showLabel && (
                    <>
                      <text
                        x={item.x + item.w / 2} y={item.y + item.h / 2 - (showVol ? 8 : 0)}
                        textAnchor="middle" dominantBaseline="central"
                        fill="hsl(var(--foreground))"
                        fontSize={item.w > 200 ? 11 : item.w > 120 ? 9 : 7}
                        fontWeight="600"
                        fontFamily="inherit"
                      >
                        {title}
                      </text>
                      <text
                        x={item.x + item.w / 2} y={item.y + item.h / 2 + (showVol ? 6 : 12)}
                        textAnchor="middle" dominantBaseline="central"
                        fill={getHeatmapColor(item.yesPrice)}
                        fontSize={item.w > 200 ? 14 : item.w > 120 ? 11 : 9}
                        fontWeight="800"
                        fontFamily="inherit"
                      >
                        {pct > 0 ? `${pct}%` : '<1%'}
                      </text>
                      {showVol && (
                        <text
                          x={item.x + item.w / 2} y={item.y + item.h / 2 + 22}
                          textAnchor="middle" dominantBaseline="central"
                          fill="hsl(var(--muted-foreground))"
                          fontSize={8}
                          fontFamily="inherit"
                        >
                          {vol}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Volume color legend */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-card/30 text-[9px] text-muted-foreground">
        <span>Size = 24h Volume</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'hsl(0, 60%, 30%)' }} /> {'<20%'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'hsl(45, 50%, 35%)' }} /> 40-60%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'hsl(var(--terminal-green))' }} /> {'>80%'}</span>
        </div>
        <span>{items.length} markets shown</span>
      </div>
    </div>
  );
});
PolymarketHeatmap.displayName = 'PolymarketHeatmap';

export default PolymarketHeatmap;
