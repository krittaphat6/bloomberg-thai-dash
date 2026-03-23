import { lazy, memo, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Search, TrendingUp, TrendingDown, BarChart3, Wifi, Grid3X3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { PolymarketService, PolymarketEvent, PolymarketMarket, PriceHistoryPoint, OrderbookData, TradeData } from '@/services/PolymarketService';
import { polymarketWS, PolymarketBookUpdate, PolymarketLastTrade } from '@/services/PolymarketWebSocketService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PolymarketMarketDetail = lazy(async () => ({ default: (await import('@/components/polymarket/PolymarketMarketDetail')).PolymarketMarketDetail }));
const PolymarketPriceChart = lazy(async () => ({ default: (await import('@/components/polymarket/PolymarketPriceChart')).PolymarketPriceChart }));
const PolymarketCalculator = lazy(async () => ({ default: (await import('@/components/polymarket/PolymarketCalculator')).PolymarketCalculator }));
const PolymarketHeatmap = lazy(() => import('@/components/polymarket/PolymarketHeatmap'));

// ============ CONSTANTS ============

const MAIN_TABS = ['TRENDING', 'POLITICS', 'CRYPTO', 'SPORTS', 'FINANCE', 'AI & TECH'];
const TAB_TO_TAG: Record<string, string | undefined> = {
  TRENDING: undefined, POLITICS: 'politics', CRYPTO: 'crypto',
  SPORTS: 'sports', FINANCE: 'finance', 'AI & TECH': 'ai',
};

const CATEGORY_MAP: Record<string, string[]> = {
  'Elections': ['election', 'president', 'governor', 'senate', 'congress', 'vote', 'nominee', 'primary', 'democrat', 'republican', 'netanyahu', 'trudeau', 'modi', 'macron', 'starmer', 'poll'],
  'Fed & Rates': ['fed', 'fomc', 'interest rate', 'inflation', 'cpi', 'gdp', 'treasury', 'unemployment', 'jobs', 'monetary', 'recession'],
  'Bitcoin': ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'solana', 'defi', 'nft', 'blockchain', 'dogecoin', 'xrp', 'binance'],
  'Geopolitics': ['war', 'conflict', 'military', 'nato', 'china', 'russia', 'ukraine', 'iran', 'missile', 'sanction', 'territory', 'cease', 'peace', 'trump', 'musk', 'tweet', 'tariff'],
  'AI & Tech': ['ai', 'gpt', 'openai', 'google', 'anthropic', 'llm', 'artificial intelligence', 'machine learning', 'chatgpt', 'apple', 'meta', 'nvidia', 'robot'],
  'Sports': ['nba', 'nfl', 'mlb', 'soccer', 'football', 'basketball', 'tennis', 'premier league', 'champion', 'playoff', 'world cup', 'ncaa', 'esports', 'ufc', 'f1', 'formula', 'lakers', 'warriors', 'march madness'],
  'Regulation': ['regulation', 'sec', 'ban', 'law', 'bill', 'executive order', 'policy', 'tiktok', 'supreme court'],
  'Earnings': ['earnings', 'revenue', 'stock', 'market cap', 'ipo', 'sp500', 's&p', 'dow', 'nasdaq'],
  'Entertainment': ['oscar', 'grammy', 'movie', 'music', 'album', 'celebrity', 'instagram', 'youtube', 'twitch', 'reality tv'],
};

function categorizeEvent(event: PolymarketEvent): string {
  const text = `${event.title} ${event.description || ''}`.toLowerCase();
  const tagLabels = (event.tags || []).map((t: any) => (typeof t === 'string' ? t : t?.label || '').toLowerCase()).join(' ');
  const combined = `${text} ${tagLabels}`;
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => combined.includes(kw))) return cat;
  }
  return 'Other';
}

const normalizeTrades = (trades: TradeData[]): PolymarketLastTrade[] =>
  trades.map(t => ({
    event_type: 'last_trade_price' as const,
    asset_id: t.asset_id || '',
    market: t.market || '',
    price: t.price || '0',
    size: t.size || '0',
    side: t.side || 'BUY',
    timestamp: t.match_time ? String(new Date(t.match_time).getTime()) : String(Date.now()),
  }));

const getTimestampMs = (timestamp?: string) => {
  if (!timestamp) return 0;
  const numeric = Number(timestamp);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  }
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const EVENT_ROW_ESTIMATE = 156;
const EVENT_LIST_OVERSCAN = 10;

const extractMarketsFromEvents = (items: PolymarketEvent[]): PolymarketMarket[] => {
  const deduped = new Map<string, PolymarketMarket>();
  for (const event of items) {
    for (const market of event.markets || []) {
      if (market?.id) deduped.set(market.id, market);
    }
  }
  return Array.from(deduped.values());
};

const primeMarketTitleCache = (items: PolymarketEvent[], cache: Map<string, string>) => {
  for (const event of items) {
    for (const market of event.markets || []) {
      try {
        const ids: string[] = JSON.parse(market.clobTokenIds || '[]');
        const label = market.groupItemTitle || market.question || event.title;
        ids.forEach((id) => {
          if (id) cache.set(id, label);
        });
      } catch {
        // Ignore malformed token arrays
      }
    }
  }
};

const mergeTradeBuffer = <T extends PolymarketLastTrade>(existing: T[], incoming: T, limit: number): T[] => {
  const incomingKey = `${incoming.asset_id}-${incoming.side}-${incoming.price}-${incoming.size}-${incoming.timestamp}`;
  const next = existing.filter((trade) => {
    const tradeKey = `${trade.asset_id}-${trade.side}-${trade.price}-${trade.size}-${trade.timestamp}`;
    return tradeKey !== incomingKey;
  });

  return [incoming, ...next].slice(0, limit);
};

const PanelFallback = ({ label }: { label: string }) => (
  <div className="h-[240px] flex items-center justify-center text-[10px] text-muted-foreground">
    <Loader2 className="w-4 h-4 animate-spin mr-2" />
    {label}
  </div>
);

// ============ MAIN COMPONENT ============

const PolymarketHub = () => {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [activeTab, setActiveTab] = useState('TRENDING');
  const [activeSubTag, setActiveSubTag] = useState('All');
  const [viewMode, setViewMode] = useState<'LIST' | 'HEATMAP' | 'GAINERS' | 'TICKER'>('LIST');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [multiPriceHistory, setMultiPriceHistory] = useState<Map<string, PriceHistoryPoint[]>>(new Map());
  const [wsConnected, setWsConnected] = useState(false);
  const [totalMarketCount, setTotalMarketCount] = useState(0);

  // Refs for high-frequency WS data
  const liveBooksRef = useRef<Map<string, PolymarketBookUpdate>>(new Map());
  const liveTradesRef = useRef<PolymarketLastTrade[]>([]);

  const [selectedOrderbook, setSelectedOrderbook] = useState<OrderbookData | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<PolymarketLastTrade[]>([]);
  const [polledOrderbook, setPolledOrderbook] = useState<OrderbookData | null>(null);
  const [polledTrades, setPolledTrades] = useState<PolymarketLastTrade[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [priceTickCounter, setPriceTickCounter] = useState(0);

  // Live order ticker tape
  const [tickerTrades, setTickerTrades] = useState<(PolymarketLastTrade & { title?: string })[]>([]);
  const marketTitleCacheRef = useRef<Map<string, string>>(new Map());

  const obPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tradePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedMarketRef = useRef<PolymarketMarket | null>(null);
  selectedMarketRef.current = selectedMarket;

  // ---- DATA FETCH (Progressive: show first page fast, load rest in background) ----
  const isLoadingMoreRef = useRef(false);

  const fetchData = useCallback(async (tag?: string) => {
    setLoading(true);
    try {
      // STEP 1: Load first page FAST (100 events)
      const [firstEvts, firstMkts] = await Promise.all([
        PolymarketService.getTrendingEvents(100, tag),
        PolymarketService.getMarkets(100, tag),
      ]);

      const evts1 = Array.isArray(firstEvts) ? firstEvts : [];
      const mkts1 = Array.isArray(firstMkts) ? firstMkts : [];
      setEvents(evts1);
      setAllMarkets(mkts1);
      setTotalMarketCount(mkts1.length);
      setLoading(false); // Show data immediately

      // Build title cache from first page
      const titleCache = marketTitleCacheRef.current;
      for (const evt of evts1) {
        for (const m of evt.markets || []) {
          try {
            const ids: string[] = JSON.parse(m.clobTokenIds || '[]');
            const label = m.groupItemTitle || m.question || evt.title;
            ids.forEach(id => { if (id) titleCache.set(id, label); });
          } catch {}
        }
      }

      // Subscribe top 200 to WS
      const topMarkets = [...mkts1]
        .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
        .slice(0, 200);
      const tokenIds = PolymarketService.extractTokenIds(topMarkets);
      if (tokenIds.length > 0) polymarketWS.subscribeToAssets(tokenIds);

      // STEP 2: If TRENDING (no tag), load ALL remaining in background
      if (!tag && !isLoadingMoreRef.current) {
        isLoadingMoreRef.current = true;
        try {
          const [allEvts, allMkts] = await Promise.all([
            PolymarketService.getAllActiveEvents(),
            PolymarketService.getAllActiveMarkets(),
          ]);
          const fullEvts = Array.isArray(allEvts) ? allEvts : evts1;
          const fullMkts = Array.isArray(allMkts) ? allMkts : mkts1;
          setEvents(fullEvts);
          setAllMarkets(fullMkts);
          setTotalMarketCount(fullMkts.length);

          // Update title cache
          for (const evt of fullEvts) {
            for (const m of evt.markets || []) {
              try {
                const ids: string[] = JSON.parse(m.clobTokenIds || '[]');
                const label = m.groupItemTitle || m.question || evt.title;
                ids.forEach(id => { if (id) titleCache.set(id, label); });
              } catch {}
            }
          }
        } catch (bgErr) {
          console.warn('Background pagination partial:', bgErr);
        } finally {
          isLoadingMoreRef.current = false;
        }
      }
    } catch (e: any) {
      console.error('Polymarket fetch error:', e);
      toast.error('Failed to load Polymarket data');
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(TAB_TO_TAG[activeTab]); }, [activeTab]);
  useEffect(() => {
    const iv = setInterval(() => fetchData(TAB_TO_TAG[activeTab]), 5 * 60_000);
    return () => clearInterval(iv);
  }, [activeTab]);

  // ---- WEBSOCKET ----
  useEffect(() => polymarketWS.onStatus(setWsConnected), []);

  useEffect(() => {
    const unsubBook = polymarketWS.onBook('ALL', (data) => {
      liveBooksRef.current.set(data.asset_id, data);
      const sm = selectedMarketRef.current;
      if (sm) {
        const outcomes = PolymarketService.parseOutcomes(sm);
        if (outcomes[0]?.tokenId === data.asset_id) {
          setSelectedOrderbook({
            bids: data.bids, asks: data.asks,
            hash: data.hash, timestamp: data.timestamp, market: data.market,
          });
        }
      }
    });

    const unsubTrade = polymarketWS.onTrade('ALL', (data) => {
      liveTradesRef.current = [data, ...liveTradesRef.current].slice(0, 100);
      // Add to ticker tape with market title
      const title = marketTitleCacheRef.current.get(data.asset_id) || '';
      const enriched = { ...data, title };
      setTickerTrades(prev => [enriched, ...prev].slice(0, 200));
      const sm = selectedMarketRef.current;
      if (sm) {
        const outcomes = PolymarketService.parseOutcomes(sm);
        const tokenIds = outcomes.map(o => o.tokenId).filter(Boolean);
        if (tokenIds.includes(data.asset_id)) {
          setSelectedTrades(prev => [data, ...prev].slice(0, 50));
        }
      }
    });

    return () => { unsubBook(); unsubTrade(); };
  }, []);

  // Throttled price tick for card re-renders
  useEffect(() => {
    const iv = setInterval(() => setPriceTickCounter(c => c + 1), 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => () => { polymarketWS.disconnect(); }, []);

  // ---- SELECTED MARKET ----
  useEffect(() => {
    if (!selectedMarket) {
      if (obPollRef.current) clearInterval(obPollRef.current);
      if (tradePollRef.current) clearInterval(tradePollRef.current);
      setPolledOrderbook(null); setPolledTrades([]); setSelectedOrderbook(null); setSelectedTrades([]);
      setPollingActive(false);
      return;
    }

    const outcomes = PolymarketService.parseOutcomes(selectedMarket);
    const yesToken = outcomes[0]?.tokenId;
    const conditionId = selectedMarket.conditionId || selectedMarket.id;
    const tokenIds = outcomes.map(o => o.tokenId).filter(Boolean);
    if (!yesToken) return;

    setPolledOrderbook(null); setPolledTrades([]); setSelectedOrderbook(null); setSelectedTrades([]);
    setPollingActive(false);

    const existingBook = liveBooksRef.current.get(yesToken);
    if (existingBook) {
      setSelectedOrderbook({ bids: existingBook.bids, asks: existingBook.asks, hash: existingBook.hash, timestamp: existingBook.timestamp, market: existingBook.market });
    }

    const existingTrades = liveTradesRef.current
      .filter(trade => tokenIds.includes(trade.asset_id))
      .sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp))
      .slice(0, 50);
    if (existingTrades.length > 0) setSelectedTrades(existingTrades);

    PolymarketService.getPriceHistory(yesToken).then(setPriceHistory).catch(() => setPriceHistory([]));
    if (tokenIds.length > 0) {
      polymarketWS.subscribeToAssets(tokenIds);
      polymarketWS.forceResubscribe();
    }

    const fetchOrderbook = async () => {
      try {
        const ob = await PolymarketService.getOrderbook(yesToken);
        if (ob) { setPolledOrderbook(ob); setPollingActive(true); }
      } catch { /* silent */ }
    };
    const fetchTrades = async () => {
      try {
        const trades = await PolymarketService.getRecentTrades(conditionId, 50);
        if (Array.isArray(trades)) { setPolledTrades(normalizeTrades(trades)); setPollingActive(true); }
      } catch { /* silent */ }
    };

    fetchOrderbook(); fetchTrades();
    obPollRef.current = setInterval(fetchOrderbook, 1000);
    tradePollRef.current = setInterval(fetchTrades, 2000);

    return () => {
      if (obPollRef.current) clearInterval(obPollRef.current);
      if (tradePollRef.current) clearInterval(tradePollRef.current);
    };
  }, [selectedMarket]);

  // Multi-outcome histories
  useEffect(() => {
    if (!selectedEvent?.markets?.length) { setMultiPriceHistory(new Map()); return; }
    PolymarketService.getMultiOutcomePriceHistory(selectedEvent.markets)
      .then(setMultiPriceHistory).catch(() => setMultiPriceHistory(new Map()));
  }, [selectedEvent]);

  // ---- LIVE DATA GETTERS ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLivePrice = useCallback((market: PolymarketMarket): { yesPrice: number; noPrice: number } => {
    const outcomes = PolymarketService.parseOutcomes(market);
    const yesTokenId = outcomes[0]?.tokenId;
    if (yesTokenId) {
      const liveBook = liveBooksRef.current.get(yesTokenId);
      if (liveBook?.bids?.length > 0 && liveBook?.asks?.length > 0) {
        const mid = (parseFloat(liveBook.bids[0].price) + parseFloat(liveBook.asks[0].price)) / 2;
        return { yesPrice: mid, noPrice: 1 - mid };
      }
    }
    return { yesPrice: outcomes[0]?.price || 0, noPrice: 1 - (outcomes[0]?.price || 0) };
  }, [priceTickCounter]);

  const liveOrderbook = useMemo((): OrderbookData | null => {
    if (!selectedOrderbook && !polledOrderbook) return null;
    if (!selectedOrderbook) return polledOrderbook;
    if (!polledOrderbook) return selectedOrderbook;
    return getTimestampMs(selectedOrderbook.timestamp) >= getTimestampMs(polledOrderbook.timestamp) ? selectedOrderbook : polledOrderbook;
  }, [selectedOrderbook, polledOrderbook]);

  const mergedTrades = useMemo(() => {
    const deduped = new Map<string, PolymarketLastTrade>();
    for (const trade of [...selectedTrades, ...polledTrades]) {
      const key = `${trade.asset_id}-${trade.side}-${trade.price}-${trade.size}-${trade.timestamp}`;
      if (!deduped.has(key)) deduped.set(key, trade);
    }
    return Array.from(deduped.values())
      .sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp))
      .slice(0, 50);
  }, [selectedTrades, polledTrades]);

  const dataStatus: 'live' | 'polling' | 'offline' = wsConnected ? 'live' : pollingActive ? 'polling' : 'offline';
  const isDataAvailable = wsConnected || polledOrderbook !== null;

  // ---- SEARCH ----
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await PolymarketService.searchEvents(searchQuery);
      setEvents(Array.isArray(results) ? results : []);
      setAllMarkets((Array.isArray(results) ? results : []).flatMap((e: PolymarketEvent) => e.markets || []));
    } catch { toast.error('Search failed'); } finally { setLoading(false); }
  };

  // ---- COMPUTED ----
  const totalVol24h = useMemo(() => events.reduce((s, e) => s + (e.volume24hr || 0), 0), [events]);
  const totalLiquidity = useMemo(() => events.reduce((s, e) => s + (e.liquidity || 0), 0), [events]);

  const subTags = useMemo(() => {
    const cats = new Set<string>();
    const active = events.filter(e => e.active && !e.closed);
    active.forEach(e => cats.add(categorizeEvent(e)));
    return ['All', ...Array.from(cats).sort()];
  }, [events]);

  const displayEvents = useMemo(() => {
    let filtered = events.filter(e => e.active && !e.closed);
    if (activeSubTag !== 'All') filtered = filtered.filter(e => categorizeEvent(e) === activeSubTag);
    return filtered.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
  }, [events, activeSubTag]);

  const categoryCounts = useMemo(() => {
    const active = events.filter(e => e.active && !e.closed);
    const counts: Record<string, number> = { All: active.length };
    active.forEach(e => {
      const cat = categorizeEvent(e);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Top gainers & losers by probability
  const { topGainers, topLosers } = useMemo(() => {
    const withPrice = events
      .filter(e => e.active && !e.closed && e.markets?.length > 0)
      .map(e => {
        const m = e.markets[0];
        const { yesPrice } = getLivePrice(m);
        return { event: e, market: m, yesPrice, pct: Math.round(yesPrice * 100), vol: e.volume24hr || 0 };
      })
      .filter(e => e.pct > 0 && e.pct < 100);

    const sorted = [...withPrice].sort((a, b) => b.pct - a.pct);
    return {
      topGainers: sorted.filter(e => e.pct >= 50).slice(0, 100),
      topLosers: sorted.filter(e => e.pct < 50).sort((a, b) => a.pct - b.pct).slice(0, 100),
    };
  }, [events, getLivePrice]);

  const handleSelectEvent = useCallback((event: PolymarketEvent) => {
    setSelectedEvent(event);
    if (event.markets?.length > 0) setSelectedMarket(event.markets[0]);
  }, []);

  // ============ RENDER ============
  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Tab Bar + Controls */}
      <div className="flex items-center border-b border-border bg-card">
        <div className="flex-1 flex overflow-x-auto">
          {MAIN_TABS.map(tab => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); setSelectedEvent(null); setSelectedMarket(null); setActiveSubTag('All'); }}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab ? 'border-terminal-amber text-terminal-amber' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 shrink-0">
          <div className="flex border border-border rounded overflow-hidden">
            {(['LIST', 'GAINERS', 'TICKER', 'HEATMAP'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-[9px] ${viewMode === mode ? 'bg-terminal-green/20 text-terminal-green' : 'text-muted-foreground hover:text-foreground'}`}>
                {mode === 'LIST' ? '☰ List' : mode === 'GAINERS' ? '📊 Movers' : mode === 'TICKER' ? '⚡ Ticker' : <><Grid3X3 className="w-3 h-3 inline mr-0.5" />Map</>}
              </button>
            ))}
          </div>
          <StatusBadge status={dataStatus} />
          <div className="flex items-center gap-1">
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search markets..." className="h-7 w-44 text-[10px] bg-background border-border" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSearch}><Search className="w-3 h-3" /></Button>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => fetchData(TAB_TO_TAG[activeTab])}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-0 border-b border-border">
        <StatCard label="ACTIVE MARKETS" value={totalMarketCount.toLocaleString()} color="text-terminal-cyan" />
        <StatCard label="24H VOLUME" value={PolymarketService.formatVolume(totalVol24h)} color="text-terminal-green" />
        <StatCard label="OPEN INTEREST" value={PolymarketService.formatVolume(totalLiquidity)} color="text-terminal-amber" />
        <StatCard label="WS STREAMS" value={polymarketWS.getSubscribedCount().toString()} color="text-terminal-cyan" />
      </div>

      {/* Live Order Ticker Tape */}
      <OrderTickerTape trades={tickerTrades} />

      {/* Sub Tags */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-border bg-card/50 overflow-x-auto">
        {subTags.map(tag => (
          <button key={tag} onClick={() => setActiveSubTag(tag)}
            className={`px-2.5 py-1 text-[10px] border rounded transition-colors whitespace-nowrap ${
              activeSubTag === tag
                ? 'border-terminal-green/50 text-terminal-green bg-terminal-green/10'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            {tag} {(categoryCounts[tag] || 0) > 0 && <span className="text-[8px] opacity-60">({categoryCounts[tag]})</span>}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading all Polymarket data...</span>
        </div>
      ) : viewMode === 'HEATMAP' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <PolymarketHeatmap events={displayEvents} onSelectEvent={handleSelectEvent}
            selectedEventId={selectedEvent?.id} getLivePrice={getLivePrice} />
        </div>
      ) : viewMode === 'GAINERS' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <TopMoversView gainers={topGainers} losers={topLosers} onSelect={handleSelectEvent} selectedId={selectedEvent?.id} />
        </div>
      ) : viewMode === 'TICKER' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <OrderTickerFullView trades={tickerTrades} marketTitleCache={marketTitleCacheRef.current} />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Event List */}
          <div className="w-[480px] min-w-[380px] border-r border-border flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/30">
              <span className="text-[10px] font-bold text-terminal-green tracking-wider">
                {activeSubTag === 'All' ? 'TRENDING MARKETS' : activeSubTag.toUpperCase()} ({displayEvents.length})
              </span>
              <StatusBadge status={dataStatus} compact />
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border/30">
                {displayEvents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">No active markets found</div>
                ) : (
                  displayEvents.map((event, idx) => (
                    <EventCard key={`${event.id}-${idx}`} event={event}
                      isSelected={selectedEvent?.id === event.id}
                      onClick={() => handleSelectEvent(event)}
                      getLivePrice={getLivePrice}
                      category={categorizeEvent(event)} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Detail */}
          <ScrollArea className="flex-1">
            {selectedEvent ? (
              <EventDetailView event={selectedEvent} selectedMarket={selectedMarket}
                onSelectMarket={setSelectedMarket} priceHistory={priceHistory}
                multiPriceHistory={multiPriceHistory} orderbook={liveOrderbook}
                allMarkets={allMarkets} onSelectEvent={m => setSelectedMarket(m)}
                liveTrades={mergedTrades} wsConnected={isDataAvailable}
                dataStatus={dataStatus} getLivePrice={getLivePrice} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                <div className="text-center">
                  <span className="text-3xl mb-3 block">🔮</span>
                  <p className="text-sm text-muted-foreground">Select a market to view details</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{displayEvents.length} events available</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

// ============ ORDER TICKER TAPE (horizontal bar with whale detection) ============

const OrderTickerTape = memo(({ trades }: { trades: (PolymarketLastTrade & { title?: string })[] }) => {
  if (trades.length === 0) return (
    <div className="border-b border-border bg-card/30 h-7 flex items-center justify-center">
      <span className="text-[9px] text-muted-foreground/50 animate-pulse">Waiting for live orders...</span>
    </div>
  );

  const displayTrades = trades.slice(0, 25);
  const doubled = displayTrades.concat(displayTrades);

  return (
    <div className="border-b border-border bg-card/30 overflow-hidden h-7 relative">
      <div className="flex items-center gap-0 animate-ticker absolute whitespace-nowrap h-full will-change-transform">
        {doubled.map((t, i) => {
          const isBuy = t.side === 'BUY';
          const price = parseFloat(t.price || '0');
          const size = parseFloat(t.size || '0');
          const pct = Math.round(price * 100);
          const value = price * size;
          const isWhale = value >= 500;
          const title = t.title ? (t.title.length > 22 ? t.title.slice(0, 20) + '…' : t.title) : '';
          const sizeStr = size >= 1000 ? `${(size / 1000).toFixed(1)}K` : size.toFixed(0);
          return (
            <span key={`${t.timestamp}-${i}`}
              className={`flex items-center gap-1 text-[10px] shrink-0 px-2.5 py-0.5 border-r border-border/20 ${
                isWhale ? 'bg-terminal-amber/10' : isBuy ? 'bg-terminal-green/[0.03]' : 'bg-destructive/[0.03]'
              }`}>
              {isWhale && <span className="text-[9px]">🐋</span>}
              <span className={`font-black text-[11px] ${isBuy ? 'text-terminal-green' : 'text-destructive'}`}>{isBuy ? '▲' : '▼'}</span>
              {title && <span className={`font-medium max-w-[140px] truncate ${isWhale ? 'text-terminal-amber' : 'text-foreground/70'}`}>{title}</span>}
              <span className={`font-mono font-bold ${isBuy ? 'text-terminal-green' : 'text-destructive'}`}>{pct}¢</span>
              <span className="text-muted-foreground font-mono">×{sizeStr}</span>
              {isWhale && <span className="text-terminal-amber font-mono font-bold">${value >= 1000 ? `${(value/1000).toFixed(1)}K` : value.toFixed(0)}</span>}
            </span>
          );
        })}
      </div>
      <style>{`
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-ticker { animation: ticker 40s linear infinite; }
        .animate-ticker:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
});
OrderTickerTape.displayName = 'OrderTickerTape';

// ============ ORDER TICKER FULL VIEW (vertical, with whale detection) ============

const WHALE_THRESHOLD = 500; // $500+ value = whale order
const BIG_ORDER_THRESHOLD = 200; // $200+ = big order

const OrderTickerFullView = memo(({ trades, marketTitleCache }: {
  trades: (PolymarketLastTrade & { title?: string })[];
  marketTitleCache: Map<string, string>;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [trades.length]);

  const displayTrades = trades.slice(0, 200);

  // Stats
  const whaleCount = useMemo(() =>
    displayTrades.filter(t => parseFloat(t.price || '0') * parseFloat(t.size || '0') >= WHALE_THRESHOLD).length,
    [displayTrades]);
  const totalVolume = useMemo(() =>
    displayTrades.reduce((s, t) => s + parseFloat(t.price || '0') * parseFloat(t.size || '0'), 0),
    [displayTrades]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-terminal-amber tracking-wider">⚡ LIVE ORDER FLOW</span>
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
          <span className="text-[9px] text-terminal-green">REAL-TIME</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{displayTrades.length} orders</span>
          <span className="text-terminal-green">{displayTrades.filter(t => t.side === 'BUY').length} buys</span>
          <span className="text-destructive">{displayTrades.filter(t => t.side === 'SELL').length} sells</span>
          {whaleCount > 0 && (
            <span className="text-terminal-amber font-bold">🐋 {whaleCount} whales</span>
          )}
          <span className="text-terminal-cyan font-mono">${totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}K` : totalVolume.toFixed(0)} vol</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[50px_50px_1fr_80px_80px_100px] gap-2 px-4 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground font-bold uppercase tracking-wider bg-card/30">
        <span>TIME</span>
        <span>SIDE</span>
        <span>MARKET</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">SIZE</span>
        <span className="text-right">VALUE</span>
      </div>

      {/* Trade rows */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {displayTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <span className="text-2xl mb-2">⚡</span>
            <span className="text-xs">Waiting for live orders...</span>
          </div>
        ) : (
          displayTrades.map((trade, i) => {
            const isBuy = trade.side === 'BUY';
            const price = parseFloat(trade.price || '0');
            const size = parseFloat(trade.size || '0');
            const pct = Math.round(price * 100);
            const value = price * size;
            const isWhale = value >= WHALE_THRESHOLD;
            const isBig = value >= BIG_ORDER_THRESHOLD;
            const title = trade.title || marketTitleCache.get(trade.asset_id) || trade.market?.slice(0, 10) + '…' || 'Unknown';
            const ts = getTimestampMs(trade.timestamp);
            const timeStr = ts > 0 ? new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';
            const sizeStr = size >= 1000 ? `${(size / 1000).toFixed(1)}K` : size.toFixed(0);
            const valStr = value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(0)}`;
            const isNew = i < 3;

            return (
              <div key={`${trade.timestamp}-${trade.asset_id}-${i}`}
                className={`grid grid-cols-[50px_50px_1fr_80px_80px_100px] gap-2 px-4 py-2 border-b transition-colors ${
                  isWhale
                    ? 'bg-terminal-amber/10 border-terminal-amber/30'
                    : isBig
                      ? (isBuy ? 'bg-terminal-green/[0.06]' : 'bg-destructive/[0.06]') + ' border-border/20'
                      : isNew
                        ? (isBuy ? 'bg-terminal-green/[0.03]' : 'bg-destructive/[0.03]') + ' border-border/10'
                        : 'border-border/10 hover:bg-muted/20'
                }`}>
                <span className="text-[10px] text-muted-foreground font-mono">{timeStr}</span>
                <span className={`text-[10px] font-bold ${isBuy ? 'text-terminal-green' : 'text-destructive'}`}>
                  {isBuy ? '▲ BUY' : '▼ SELL'}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {isWhale && <span className="text-[10px]">🐋</span>}
                  {isBig && !isWhale && <span className="text-[9px]">💎</span>}
                  <span className={`text-[10px] truncate font-medium ${isWhale ? 'text-terminal-amber' : 'text-foreground'}`}>{title}</span>
                </div>
                <span className={`text-[10px] font-mono font-bold text-right ${isBuy ? 'text-terminal-green' : 'text-destructive'}`}>{pct}¢</span>
                <span className={`text-[10px] font-mono text-right ${isWhale ? 'text-terminal-amber font-bold' : 'text-muted-foreground'}`}>{sizeStr}</span>
                <span className={`text-[10px] font-mono text-right ${isWhale ? 'text-terminal-amber font-black' : 'text-terminal-cyan'}`}>{valStr}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
OrderTickerFullView.displayName = 'OrderTickerFullView';

// ============ TOP MOVERS VIEW (100 gainers + 100 losers) ============

const TopMoversView = memo(({ gainers, losers, onSelect, selectedId }: {
  gainers: { event: PolymarketEvent; pct: number; vol: number }[];
  losers: { event: PolymarketEvent; pct: number; vol: number }[];
  onSelect: (e: PolymarketEvent) => void;
  selectedId?: string;
}) => (
  <div className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden">
    <div className="border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-terminal-green/5">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-terminal-green" />
          <span className="text-[11px] font-bold text-terminal-green tracking-wider">TOP GAINERS — HIGHEST PROBABILITY</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{gainers.length} markets</span>
      </div>
      {/* Column header */}
      <div className="grid grid-cols-[28px_1fr_60px_55px] gap-2 px-4 py-1 border-b border-border/30 text-[8px] text-muted-foreground font-bold uppercase tracking-wider bg-card/30">
        <span>#</span><span>MARKET</span><span className="text-right">VOL</span><span className="text-right">PROB</span>
      </div>
      <ScrollArea className="flex-1">
        <div>
          {gainers.map((g, i) => (
            <MoverRow key={g.event.id} rank={i + 1} event={g.event} pct={g.pct} vol={g.vol}
              isGainer onClick={() => onSelect(g.event)} isSelected={selectedId === g.event.id} />
          ))}
          {gainers.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">No data</div>}
        </div>
      </ScrollArea>
    </div>
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-destructive/5">
        <div className="flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4 text-destructive" />
          <span className="text-[11px] font-bold text-destructive tracking-wider">TOP LOSERS — LOWEST PROBABILITY</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{losers.length} markets</span>
      </div>
      <div className="grid grid-cols-[28px_1fr_60px_55px] gap-2 px-4 py-1 border-b border-border/30 text-[8px] text-muted-foreground font-bold uppercase tracking-wider bg-card/30">
        <span>#</span><span>MARKET</span><span className="text-right">VOL</span><span className="text-right">PROB</span>
      </div>
      <ScrollArea className="flex-1">
        <div>
          {losers.map((l, i) => (
            <MoverRow key={l.event.id} rank={i + 1} event={l.event} pct={l.pct} vol={l.vol}
              isGainer={false} onClick={() => onSelect(l.event)} isSelected={selectedId === l.event.id} />
          ))}
          {losers.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">No data</div>}
        </div>
      </ScrollArea>
    </div>
  </div>
));
TopMoversView.displayName = 'TopMoversView';

const MoverRow = memo(({ rank, event, pct, vol, isGainer, onClick, isSelected }: {
  rank: number; event: PolymarketEvent; pct: number; vol: number;
  isGainer: boolean; onClick: () => void; isSelected: boolean;
}) => (
  <div onClick={onClick}
    className={`grid grid-cols-[28px_1fr_60px_55px] gap-2 items-center px-4 py-2 cursor-pointer transition-colors border-b border-border/10 ${
      isSelected ? 'bg-terminal-amber/5' : 'hover:bg-muted/20'
    }`}>
    <span className={`text-[10px] font-bold ${rank <= 3 ? 'text-terminal-amber' : 'text-muted-foreground'}`}>{rank}</span>
    <div className="min-w-0 flex items-center gap-2">
      {event.image && (
        <img src={event.image} alt="" className="w-5 h-5 rounded object-cover shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <span className="text-[10px] font-medium text-foreground truncate">{event.title}</span>
    </div>
    <span className="text-[9px] text-muted-foreground text-right font-mono">{PolymarketService.formatVolume(vol)}</span>
    <div className="flex items-center justify-end gap-1">
      <div className="w-10 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full rounded-full ${isGainer ? 'bg-terminal-green' : 'bg-destructive'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-black min-w-[32px] text-right ${isGainer ? 'text-terminal-green' : 'text-destructive'}`}>{pct}%</span>
    </div>
  </div>
));
MoverRow.displayName = 'MoverRow';

// ============ EVENT CARD ============

const EventCard = memo(({ event, isSelected, onClick, getLivePrice, category }: {
  event: PolymarketEvent; isSelected: boolean; onClick: () => void;
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number }; category: string;
}) => {
  const markets = event.markets || [];
  const vol = PolymarketService.formatVolume(event.volume24hr || 0);
  const liq = PolymarketService.formatVolume(event.liquidity || 0);
  const endDate = event.endDate ? new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div onClick={onClick}
      className={`px-3 py-3 cursor-pointer transition-colors ${
        isSelected ? 'bg-terminal-amber/5 border-l-2 border-l-terminal-amber' : 'hover:bg-muted/30 border-l-2 border-l-transparent'
      }`}>
      <div className="flex items-start gap-2 mb-2">
        {event.image && (
          <img src={event.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-border text-muted-foreground">{category}</Badge>
          </div>
          <div className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2">{event.title}</div>
        </div>
      </div>

      {markets.length <= 2 ? (
        markets.slice(0, 1).map(m => {
          const { yesPrice, noPrice } = getLivePrice(m);
          const yesPct = Math.round(yesPrice * 100);
          const noPct = Math.round(noPrice * 100);
          return (
            <div key={m.id} className="mb-2">
              <div className="flex h-6 rounded overflow-hidden">
                <div className="flex items-center justify-center text-[11px] font-bold text-black bg-terminal-green transition-all"
                  style={{ width: `${Math.max(yesPct, 8)}%` }}>{yesPct}% Yes</div>
                <div className="flex items-center justify-center text-[11px] font-bold text-white bg-destructive transition-all"
                  style={{ width: `${Math.max(noPct, 8)}%` }}>{noPct}%</div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="space-y-1 mb-2">
          {markets.slice(0, 4).map(m => {
            const { yesPrice } = getLivePrice(m);
            const pct = Math.round(yesPrice * 100);
            const label = m.groupItemTitle || m.question;
            return (
              <div key={m.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 bg-terminal-green/20 rounded relative overflow-hidden flex-1">
                      <div className="absolute inset-y-0 left-0 bg-terminal-green/60 rounded"
                        style={{ width: `${Math.max(pct, 2)}%` }} />
                      <span className="relative text-[9px] font-medium text-foreground px-1.5 leading-4 block truncate">{label}</span>
                    </div>
                    <span className={`text-[10px] font-bold min-w-[35px] text-right ${pct > 50 ? 'text-terminal-green' : 'text-muted-foreground'}`}>
                      {pct > 0 ? `${pct}%` : '<1%'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {markets.length > 4 && <span className="text-[9px] text-muted-foreground">+{markets.length - 4} more outcomes</span>}
        </div>
      )}

      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="text-terminal-green">Vol: {vol}</span>
        <span>Liquidity: {liq}</span>
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </div>
  );
});
EventCard.displayName = 'EventCard';

// ============ EVENT DETAIL VIEW ============

const CHART_COLORS = [
  'hsl(var(--terminal-cyan))', 'hsl(var(--terminal-amber))', 'hsl(var(--terminal-green))',
  'hsl(210, 90%, 60%)', 'hsl(340, 80%, 60%)', 'hsl(160, 80%, 50%)',
];

const EventDetailView = memo(({
  event, selectedMarket, onSelectMarket, priceHistory, multiPriceHistory,
  orderbook, allMarkets, onSelectEvent, liveTrades, wsConnected, dataStatus, getLivePrice,
}: {
  event: PolymarketEvent; selectedMarket: PolymarketMarket | null;
  onSelectMarket: (m: PolymarketMarket) => void; priceHistory: PriceHistoryPoint[];
  multiPriceHistory: Map<string, PriceHistoryPoint[]>; orderbook: OrderbookData | null;
  allMarkets: PolymarketMarket[]; onSelectEvent: (m: PolymarketMarket) => void;
  liveTrades: PolymarketLastTrade[]; wsConnected: boolean;
  dataStatus: 'live' | 'polling' | 'offline';
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
}) => {
  const markets = event.markets || [];
  const isMulti = markets.length > 2;
  const totalVol = parseFloat(event.volume?.toString() || '0') || markets.reduce((s, m) => s + parseFloat(m.volume || '0'), 0);
  const endDate = event.endDate ? new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  const statusConfig = {
    live: { color: 'bg-terminal-green', text: 'text-terminal-green', border: 'border-terminal-green/40', label: 'WS LIVE' },
    polling: { color: 'bg-terminal-amber', text: 'text-terminal-amber', border: 'border-terminal-amber/40', label: 'POLLING' },
    offline: { color: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/40', label: 'OFFLINE' },
  }[dataStatus];

  if (!isMulti && selectedMarket) {
    return <PolymarketMarketDetail market={selectedMarket} priceHistory={priceHistory}
      orderbook={orderbook} allMarkets={allMarkets} onSelectMarket={onSelectEvent}
      liveTrades={liveTrades} wsConnected={wsConnected} dataStatus={dataStatus} />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <span className="text-[10px] font-bold text-terminal-amber tracking-wider">MARKET DETAIL</span>
        <Badge variant="outline" className={`text-[8px] ${statusConfig.border} ${statusConfig.text} px-1 py-0`}>
          <span className={`w-1 h-1 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''} mr-1 inline-block`} />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          {event.image && (
            <img src={event.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <div className="flex-1">
            {event.tags?.length > 0 && (
              <div className="flex gap-1 mb-1">
                {event.tags.slice(0, 3).map((t: any, i: number) => {
                  const label = typeof t === 'string' ? t : t?.label || '';
                  return label ? <Badge key={i} variant="outline" className="text-[8px] px-1 py-0 border-border text-muted-foreground">{label}</Badge> : null;
                })}
              </div>
            )}
            <h3 className="text-base font-bold text-foreground leading-snug">{event.title}</h3>
          </div>
        </div>

        {isMulti && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            {markets.map((m, i) => {
              const { yesPrice } = getLivePrice(m);
              const pct = Math.round(yesPrice * 100);
              return (
                <div key={m.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{m.groupItemTitle || m.question}</span>
                  <span className="font-bold text-foreground">{pct > 0 ? `${pct}%` : '<1%'}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="border border-border rounded bg-card p-3">
          <div className="text-[10px] text-terminal-amber uppercase tracking-wider mb-2">PRICE HISTORY</div>
          {isMulti && multiPriceHistory.size > 0 ? (
            <MultiOutcomePriceChart histories={multiPriceHistory} />
          ) : (
            <PolymarketPriceChart data={priceHistory} />
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{PolymarketService.formatVolume(totalVol)} Vol.</span>
          <span>📅 {endDate || 'Open'}</span>
        </div>

        <div className="border border-border rounded overflow-hidden">
          {markets.map(m => {
            const { yesPrice } = getLivePrice(m);
            const pct = Math.round(yesPrice * 100);
            const label = m.groupItemTitle || m.question;
            const mVol = parseFloat(m.volume || '0');
            const yesCents = Math.round(yesPrice * 100);
            const noCents = Math.round((1 - yesPrice) * 100);
            const isSelected = selectedMarket?.id === m.id;

            return (
              <div key={m.id} onClick={() => onSelectMarket(m)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 cursor-pointer transition-colors ${
                  isSelected ? 'bg-terminal-amber/5' : 'hover:bg-muted/30'
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-foreground">{label}</div>
                  <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="w-2.5 h-2.5" />{PolymarketService.formatVolume(mVol)} Vol.
                  </div>
                </div>
                <div className="text-right mr-2">
                  <div className={`text-lg font-black ${pct > 50 ? 'text-terminal-green' : pct < 10 ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {pct > 0 ? `${pct}%` : '<1%'}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="px-3 py-1.5 rounded text-[10px] font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:bg-terminal-green/30 transition-colors">
                    Yes {yesCents > 0 ? `${yesCents}¢` : ''}
                  </button>
                  <button className="px-3 py-1.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition-colors">
                    No {noCents > 0 ? `${noCents}¢` : ''}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ORDER BOOK + TRADES */}
        {selectedMarket && (
          <>
            <div className="border border-border rounded bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">📊 ORDER BOOK</span>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />
                <span className={`text-[9px] ${statusConfig.text}`}>{statusConfig.label}</span>
              </div>
              {orderbook ? <OrderbookDisplay orderbook={orderbook} /> : (
                <div className="text-center py-4 text-[10px] text-muted-foreground">
                  <Wifi className="w-4 h-4 mx-auto mb-1 animate-pulse" />Connecting to orderbook...
                </div>
              )}
            </div>

            <div className="border border-border rounded bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">
                  {dataStatus === 'live' ? '⚡ LIVE TRADES' : '📋 RECENT TRADES'}
                </span>
                {dataStatus !== 'offline' && <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />}
                <span className="text-[9px] text-muted-foreground ml-auto">{liveTrades.length} trades</span>
              </div>
              {liveTrades.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {liveTrades.slice(0, 15).map((trade, i) => (
                    <div key={`${trade.timestamp}-${i}`} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/30">
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                        trade.side === 'BUY' ? 'border-terminal-green/50 text-terminal-green' : 'border-destructive/50 text-destructive'
                      }`}>{trade.side}</Badge>
                      <span className="text-foreground font-mono">${trade.price} × {parseFloat(trade.size).toLocaleString()}</span>
                      <span className="text-muted-foreground">{new Date(parseInt(trade.timestamp)).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-[10px] text-muted-foreground">Waiting for trades...</div>
              )}
            </div>

            <PolymarketCalculator market={selectedMarket} />
          </>
        )}

        {event.description && (
          <div className="border border-border rounded bg-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rules · Market Context</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
});
EventDetailView.displayName = 'EventDetailView';

// ============ MULTI-OUTCOME CHART ============

const MultiOutcomePriceChart = memo(({ histories }: { histories: Map<string, PriceHistoryPoint[]> }) => {
  const labels = useMemo(() => Array.from(histories.keys()), [histories]);

  const chartData = useMemo(() => {
    if (labels.length === 0) return [];
    const allTimestamps = new Set<number>();
    histories.forEach(points => points.forEach(p => allTimestamps.add(p.t)));
    const sortedTs = Array.from(allTimestamps).sort((a, b) => a - b);
    const data = sortedTs.map(t => {
      const row: any = { t };
      labels.forEach(label => {
        const points = histories.get(label) || [];
        const closest = points.reduce((prev, curr) => Math.abs(curr.t - t) < Math.abs(prev.t - t) ? curr : prev, points[0]);
        row[label] = closest ? Math.round(closest.p * 100) : null;
      });
      return row;
    });
    const step = Math.max(1, Math.floor(data.length / 200));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [histories, labels]);

  if (chartData.length === 0) return <div className="h-[250px] flex items-center justify-center text-[10px] text-muted-foreground">Loading chart...</div>;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={t => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          interval="preserveStartEnd" axisLine={{ stroke: 'hsl(var(--border))' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `${v}%`} width={35} axisLine={{ stroke: 'hsl(var(--border))' }} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10, borderRadius: 4 }}
          labelFormatter={t => new Date(Number(t) * 1000).toLocaleDateString()}
          formatter={(v: number, name: string) => [`${v}%`, name]} />
        {labels.map((label, i) => (
          <Line key={label} type="monotone" dataKey={label} stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});
MultiOutcomePriceChart.displayName = 'MultiOutcomePriceChart';

// ============ ORDERBOOK DISPLAY ============

const OrderbookDisplay = memo(({ orderbook }: { orderbook: OrderbookData }) => {
  const bids = (orderbook.bids || []).slice(0, 10);
  const asks = (orderbook.asks || []).slice(0, 10);
  const maxSize = Math.max(...bids.map(b => parseFloat(b.size || '0')), ...asks.map(a => parseFloat(a.size || '0')), 1);
  const spread = bids.length > 0 && asks.length > 0
    ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(4) : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 text-[10px]">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1 px-1 font-bold">
            <span className="flex items-center gap-1">BIDS (YES) <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" /></span>
            <span>SIZE</span>
          </div>
          {bids.map((b, i) => {
            const pct = (parseFloat(b.size) / maxSize) * 100;
            return (
              <div key={`bid-${i}`} className="relative flex justify-between px-1 py-[3px] rounded-sm mb-[1px]">
                <div className="absolute inset-0 bg-terminal-green/10 rounded-sm" style={{ width: `${pct}%` }} />
                <span className="relative text-terminal-green font-mono">${parseFloat(b.price).toFixed(2)}</span>
                <span className="relative text-muted-foreground font-mono">{parseFloat(b.size).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
          {bids.length === 0 && <div className="text-center py-2 text-muted-foreground text-[9px]">No bids</div>}
        </div>
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1 px-1 font-bold">
            <span className="flex items-center gap-1">ASKS (YES) <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /></span>
            <span>SIZE</span>
          </div>
          {asks.map((a, i) => {
            const pct = (parseFloat(a.size) / maxSize) * 100;
            return (
              <div key={`ask-${i}`} className="relative flex justify-between px-1 py-[3px] rounded-sm mb-[1px]">
                <div className="absolute inset-0 right-0 bg-destructive/10 rounded-sm" style={{ width: `${pct}%`, marginLeft: 'auto' }} />
                <span className="relative text-destructive font-mono">${parseFloat(a.price).toFixed(2)}</span>
                <span className="relative text-muted-foreground font-mono">{parseFloat(a.size).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
          {asks.length === 0 && <div className="text-center py-2 text-muted-foreground text-[9px]">No asks</div>}
        </div>
      </div>
      {spread && (
        <div className="text-center mt-2 text-[9px] text-muted-foreground">
          Spread: <span className="text-terminal-amber font-mono">${spread}</span>
        </div>
      )}
    </div>
  );
});
OrderbookDisplay.displayName = 'OrderbookDisplay';

// ============ SUB COMPONENTS ============

const StatCard = memo(({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="px-4 py-3 border-r border-border/30 last:border-r-0 bg-card/30">
    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
));
StatCard.displayName = 'StatCard';

const StatusBadge = memo(({ status, compact }: { status: 'live' | 'polling' | 'offline'; compact?: boolean }) => {
  const config = {
    live: { color: 'bg-terminal-green', text: 'text-terminal-green', border: 'border-terminal-green/40', label: 'LIVE' },
    polling: { color: 'bg-terminal-amber', text: 'text-terminal-amber', border: 'border-terminal-amber/40', label: 'POLLING' },
    offline: { color: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/40', label: 'OFFLINE' },
  }[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${status === 'live' ? 'animate-pulse' : ''}`} />
      {!compact && <Badge variant="outline" className={`text-[8px] ${config.border} ${config.text} px-1 py-0`}>● {config.label}</Badge>}
    </div>
  );
});
StatusBadge.displayName = 'StatusBadge';

export default PolymarketHub;
