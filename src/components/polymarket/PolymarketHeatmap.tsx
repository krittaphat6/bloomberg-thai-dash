import { memo, useMemo, useCallback } from 'react';
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

    if (isHorizontal) { x += rowSize; w -= rowSize; }
    else { y += rowSize; h -= rowSize; }
  }
  return result;
}

// TradingView-style color gradient: deep red → red → yellow → green → deep green
function getTvColor(yesPrice: number): string {
  if (yesPrice >= 0.85) return '#089981';
  if (yesPrice >= 0.7) return '#26a69a';
  if (yesPrice >= 0.55) return '#4caf50';
  if (yesPrice >= 0.45) return '#787b86';
  if (yesPrice >= 0.3) return '#f44336';
  if (yesPrice >= 0.15) return '#ef5350';
  return '#d32f2f';
}

function getTvBg(yesPrice: number): string {
  if (yesPrice >= 0.85) return 'rgba(8,153,129,0.35)';
  if (yesPrice >= 0.7) return 'rgba(38,166,154,0.25)';
  if (yesPrice >= 0.55) return 'rgba(76,175,80,0.18)';
  if (yesPrice >= 0.45) return 'rgba(120,123,134,0.15)';
  if (yesPrice >= 0.3) return 'rgba(244,67,54,0.18)';
  if (yesPrice >= 0.15) return 'rgba(239,83,80,0.25)';
  return 'rgba(211,47,47,0.35)';
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

const PolymarketHeatmap = memo(({ events, onSelectEvent, selectedEventId, getLivePrice }: Props) => {
  const items = useMemo<TreemapItem[]>(() => {
    return events
      .filter(e => e.active && !e.closed && (e.volume24hr || 0) > 0)
      .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
      .slice(0, 80)
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

  const containerWidth = 1200;
  const containerHeight = 600;
  const layoutItems = useMemo(() => layoutTreemap(items, containerWidth, containerHeight), [items]);

  return (
    <div className="flex flex-col h-full">
      {/* TradingView-style legend */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
        <div className="flex flex-wrap gap-3">
          {categoryGroups.map(([cat, catItems]) => (
            <div key={cat} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-foreground font-semibold">{cat}</span>
              <span className="text-muted-foreground">({catItems.length})</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span>{items.length} markets</span>
        </div>
      </div>

      {/* Treemap */}
      <div className="flex-1 p-1 overflow-hidden">
        <div className="relative w-full h-full" style={{ minHeight: 400 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${containerWidth} ${containerHeight}`} preserveAspectRatio="xMidYMid meet">
            {layoutItems.map((item) => {
              const pct = Math.round(item.yesPrice * 100);
              const vol = PolymarketService.formatVolume(item.volume);
              const isSelected = selectedEventId === item.event.id;
              const color = getTvColor(item.yesPrice);
              const bg = getTvBg(item.yesPrice);
              const showLabel = item.w > 55 && item.h > 30;
              const showVol = item.w > 75 && item.h > 45;
              const title = item.event.title.length > 40 && item.w < 150
                ? item.event.title.slice(0, 30) + '…'
                : item.event.title.length > 60
                  ? item.event.title.slice(0, 50) + '…'
                  : item.event.title;

              return (
                <g key={item.event.id} onClick={() => handleClick(item.event)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={item.x + 0.5} y={item.y + 0.5}
                    width={Math.max(item.w - 1, 0)} height={Math.max(item.h - 1, 0)}
                    rx={2} fill={bg}
                    stroke={isSelected ? 'hsl(var(--terminal-amber))' : 'hsl(var(--border))'}
                    strokeWidth={isSelected ? 2 : 0.5}
                    strokeOpacity={isSelected ? 1 : 0.6}
                  />
                  {showLabel && (
                    <>
                      {/* Title */}
                      <text
                        x={item.x + item.w / 2} y={item.y + item.h / 2 - (showVol ? 10 : 2)}
                        textAnchor="middle" dominantBaseline="central"
                        fill="hsl(var(--foreground))"
                        fontSize={item.w > 200 ? 11 : item.w > 120 ? 9 : 7}
                        fontWeight="500" opacity={0.9}
                      >{title}</text>
                      {/* Percentage — large bold, TradingView style */}
                      <text
                        x={item.x + item.w / 2} y={item.y + item.h / 2 + (showVol ? 5 : 12)}
                        textAnchor="middle" dominantBaseline="central"
                        fill={color}
                        fontSize={item.w > 200 ? 18 : item.w > 120 ? 14 : 11}
                        fontWeight="900"
                      >{pct > 0 ? `${pct}%` : '<1%'}</text>
                      {showVol && (
                        <text
                          x={item.x + item.w / 2} y={item.y + item.h / 2 + 22}
                          textAnchor="middle" dominantBaseline="central"
                          fill="hsl(var(--muted-foreground))" fontSize={8} opacity={0.7}
                        >{vol}</text>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* TradingView-style color scale */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-card/50 text-[9px] text-muted-foreground">
        <span>Size = 24h Volume</span>
        <div className="flex items-center gap-1">
          <span className="text-[8px]">Low</span>
          <div className="flex h-2.5 rounded overflow-hidden">
            {['#d32f2f', '#ef5350', '#f44336', '#787b86', '#4caf50', '#26a69a', '#089981'].map((c, i) => (
              <div key={i} className="w-5 h-full" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-[8px]">High</span>
        </div>
        <span>Probability</span>
      </div>
    </div>
  );
});
PolymarketHeatmap.displayName = 'PolymarketHeatmap';

export default PolymarketHeatmap;
