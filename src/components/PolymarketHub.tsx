import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Search, TrendingUp, BarChart3, Users, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { PolymarketService, PolymarketEvent, PolymarketMarket, PriceHistoryPoint, OrderbookData, TradeData } from '@/services/PolymarketService';
import { polymarketWS, PolymarketBookUpdate, PolymarketLastTrade } from '@/services/PolymarketWebSocketService';
import { PolymarketMarketDetail } from '@/components/polymarket/PolymarketMarketDetail';
import { PolymarketPriceChart } from '@/components/polymarket/PolymarketPriceChart';

const MAIN_TABS = ['TRENDING', 'POLITICS', 'CRYPTO', 'SPORTS', 'FINANCE', 'AI & TECH'];
const SUB_TAGS = ['All', 'Elections', 'Fed & Rates', 'Bitcoin', 'Geopolitics', 'AI Models', 'Sports', 'Regulation', 'Earnings'];

const TAB_TO_TAG: Record<string, string | undefined> = {
  TRENDING: undefined,
  POLITICS: 'politics',
  CRYPTO: 'crypto',
  SPORTS: 'sports',
  FINANCE: 'finance',
  'AI & TECH': 'ai',
};

const PolymarketHub = () => {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PolymarketEvent | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [activeTab, setActiveTab] = useState('TRENDING');
  const [activeSubTag, setActiveSubTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [multiPriceHistory, setMultiPriceHistory] = useState<Map<string, PriceHistoryPoint[]>>(new Map());
  const [wsConnected, setWsConnected] = useState(false);
  const [liveBooks, setLiveBooks] = useState<Map<string, PolymarketBookUpdate>>(new Map());
  const [liveTrades, setLiveTrades] = useState<PolymarketLastTrade[]>([]);
  const [totalMarketCount, setTotalMarketCount] = useState(0);

  // REST polling fallback
  const [polledOrderbook, setPolledOrderbook] = useState<OrderbookData | null>(null);
  const [polledTrades, setPolledTrades] = useState<PolymarketLastTrade[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const obPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tradePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- DATA FETCH ----------

  const fetchData = useCallback(async (tag?: string) => {
    setLoading(true);
    try {
      let evts: PolymarketEvent[];
      let mkts: PolymarketMarket[];

      if (!tag) {
        [evts, mkts] = await Promise.all([
          PolymarketService.getAllActiveEvents(),
          PolymarketService.getAllActiveMarkets(),
        ]);
      } else {
        [evts, mkts] = await Promise.all([
          PolymarketService.getTrendingEvents(100, tag),
          PolymarketService.getMarkets(100, tag),
        ]);
      }

      setEvents(Array.isArray(evts) ? evts : []);
      const markets = Array.isArray(mkts) ? mkts : [];
      setAllMarkets(markets);

      // Subscribe top 200 markets to WebSocket
      const topMarkets = [...markets]
        .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
        .slice(0, 200);
      const tokenIds = PolymarketService.extractTokenIds(topMarkets);
      if (tokenIds.length > 0) {
        polymarketWS.subscribeToAssets(tokenIds);
      }
      setTotalMarketCount(markets.length);
    } catch (e: any) {
      console.error('Polymarket fetch error:', e);
      toast.error('Failed to load Polymarket data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(TAB_TO_TAG[activeTab]); }, [activeTab]);
  useEffect(() => {
    const iv = setInterval(() => fetchData(TAB_TO_TAG[activeTab]), 5 * 60_000);
    return () => clearInterval(iv);
  }, [activeTab]);

  // ---------- WEBSOCKET ----------

  useEffect(() => {
    const unsub = polymarketWS.onStatus(setWsConnected);
    return unsub;
  }, []);

  useEffect(() => {
    const unsubBook = polymarketWS.onBook('ALL', (data) => {
      setLiveBooks(prev => {
        const next = new Map(prev);
        next.set(data.asset_id, data);
        return next;
      });
    });
    const unsubTrade = polymarketWS.onTrade('ALL', (data) => {
      setLiveTrades(prev => [data, ...prev].slice(0, 100));
    });
    return () => { unsubBook(); unsubTrade(); };
  }, []);

  useEffect(() => { return () => { polymarketWS.disconnect(); }; }, []);

  // ---------- SELECTED EVENT/MARKET ----------

  useEffect(() => {
    if (!selectedMarket) {
      if (obPollRef.current) clearInterval(obPollRef.current);
      if (tradePollRef.current) clearInterval(tradePollRef.current);
      setPolledOrderbook(null);
      setPolledTrades([]);
      setPollingActive(false);
      return;
    }

    const outcomes = PolymarketService.parseOutcomes(selectedMarket);
    const yesToken = outcomes[0]?.tokenId;
    if (!yesToken) return;

    PolymarketService.getPriceHistory(yesToken).then(setPriceHistory).catch(() => setPriceHistory([]));

    const tokenIds = outcomes.map(o => o.tokenId).filter(Boolean);
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

    const conditionId = selectedMarket.conditionId || selectedMarket.id;
    const fetchTrades = async () => {
      try {
        const trades = await PolymarketService.getRecentTrades(conditionId, 20);
        if (Array.isArray(trades) && trades.length > 0) {
          setPolledTrades(normalizeTrades(trades));
        }
      } catch { /* silent */ }
    };

    fetchOrderbook();
    fetchTrades();
    obPollRef.current = setInterval(fetchOrderbook, 3000);
    tradePollRef.current = setInterval(fetchTrades, 5000);

    return () => {
      if (obPollRef.current) clearInterval(obPollRef.current);
      if (tradePollRef.current) clearInterval(tradePollRef.current);
    };
  }, [selectedMarket]);

  // Load multi-outcome price histories when event is selected
  useEffect(() => {
    if (!selectedEvent || !selectedEvent.markets?.length) {
      setMultiPriceHistory(new Map());
      return;
    }
    PolymarketService.getMultiOutcomePriceHistory(selectedEvent.markets)
      .then(setMultiPriceHistory)
      .catch(() => setMultiPriceHistory(new Map()));
  }, [selectedEvent]);

  // ---------- NORMALIZE TRADES ----------

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

  // ---------- LIVE DATA GETTERS ----------

  const getLivePrice = useCallback((market: PolymarketMarket): { yesPrice: number; noPrice: number } => {
    const outcomes = PolymarketService.parseOutcomes(market);
    const yesTokenId = outcomes[0]?.tokenId;
    if (yesTokenId) {
      const liveBook = liveBooks.get(yesTokenId);
      if (liveBook && liveBook.bids?.length > 0 && liveBook.asks?.length > 0) {
        const bestBid = parseFloat(liveBook.bids[0].price);
        const bestAsk = parseFloat(liveBook.asks[0].price);
        const mid = (bestBid + bestAsk) / 2;
        return { yesPrice: mid, noPrice: 1 - mid };
      }
    }
    const yesPrice = outcomes[0]?.price || 0;
    return { yesPrice, noPrice: 1 - yesPrice };
  }, [liveBooks]);

  const getLiveOrderbook = useCallback((): OrderbookData | null => {
    if (!selectedMarket) return null;
    const outcomes = PolymarketService.parseOutcomes(selectedMarket);
    const yesTokenId = outcomes[0]?.tokenId;

    if (wsConnected && yesTokenId) {
      const wsBook = liveBooks.get(yesTokenId);
      if (wsBook?.bids?.length > 0) return {
        bids: wsBook.bids, asks: wsBook.asks,
        hash: wsBook.hash, timestamp: wsBook.timestamp, market: wsBook.market,
      };
    }
    return polledOrderbook;
  }, [selectedMarket, liveBooks, wsConnected, polledOrderbook]);

  const mergedTrades = liveTrades.length > 0 ? liveTrades : polledTrades;

  const dataStatus: 'live' | 'polling' | 'offline' = wsConnected
    ? 'live' : pollingActive ? 'polling' : 'offline';

  const isDataAvailable = wsConnected || polledOrderbook !== null;

  // ---------- SEARCH ----------

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await PolymarketService.searchEvents(searchQuery);
      setEvents(Array.isArray(results) ? results : []);
      const mkts = (Array.isArray(results) ? results : []).flatMap((e: PolymarketEvent) => e.markets || []);
      setAllMarkets(mkts);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // ---------- COMPUTED ----------

  const totalVol24h = events.reduce((s, e) => s + (e.volume24hr || 0), 0);
  const totalLiquidity = events.reduce((s, e) => s + (e.liquidity || 0), 0);

  const displayEvents = useMemo(() => {
    let filtered = events.filter(e => e.active && !e.closed);
    if (activeSubTag !== 'All') {
      const tagLower = activeSubTag.toLowerCase();
      filtered = filtered.filter(e =>
        e.tags?.some(t => t.toLowerCase().includes(tagLower)) ||
        e.title?.toLowerCase().includes(tagLower)
      );
    }
    return filtered;
  }, [events, activeSubTag]);

  const liveOrderbook = getLiveOrderbook();

  const handleSelectEvent = (event: PolymarketEvent) => {
    setSelectedEvent(event);
    if (event.markets?.length > 0) {
      setSelectedMarket(event.markets[0]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Main Tabs */}
      <div className="flex items-center border-b border-border bg-card">
        <div className="flex-1 flex overflow-x-auto">
          {MAIN_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedEvent(null); setSelectedMarket(null); }}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-terminal-amber text-terminal-amber'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 shrink-0">
          <StatusBadge status={dataStatus} />
          <div className="flex items-center gap-1">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search markets..."
              className="h-7 w-44 text-[10px] bg-background border-border"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSearch}>
              <Search className="w-3 h-3" />
            </Button>
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

      {/* Sub Tags */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-border bg-card/50 overflow-x-auto">
        {SUB_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveSubTag(tag)}
            className={`px-2.5 py-1 text-[10px] border rounded transition-colors whitespace-nowrap ${
              activeSubTag === tag
                ? 'border-terminal-green/50 text-terminal-green bg-terminal-green/10'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading Polymarket data...</span>
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
                  displayEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isSelected={selectedEvent?.id === event.id}
                      onClick={() => handleSelectEvent(event)}
                      getLivePrice={getLivePrice}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Detail */}
          <ScrollArea className="flex-1">
            {selectedEvent ? (
              <EventDetailView
                event={selectedEvent}
                selectedMarket={selectedMarket}
                onSelectMarket={setSelectedMarket}
                priceHistory={priceHistory}
                multiPriceHistory={multiPriceHistory}
                orderbook={liveOrderbook}
                allMarkets={allMarkets}
                onSelectEvent={(m) => setSelectedMarket(m)}
                liveTrades={mergedTrades}
                wsConnected={isDataAvailable}
                dataStatus={dataStatus}
                getLivePrice={getLivePrice}
              />
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

// ============== EVENT CARD ==============

const EventCard = ({ event, isSelected, onClick, getLivePrice }: {
  event: PolymarketEvent;
  isSelected: boolean;
  onClick: () => void;
  getLivePrice: (m: PolymarketMarket) => { yesPrice: number; noPrice: number };
}) => {
  const markets = event.markets || [];
  const vol = PolymarketService.formatVolume(event.volume24hr || 0);
  const liq = PolymarketService.formatVolume(event.liquidity || 0);
  const endDate = event.endDate ? new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <div
      onClick={onClick}
      className={`px-3 py-3 cursor-pointer transition-all ${
        isSelected ? 'bg-terminal-amber/5 border-l-2 border-l-terminal-amber' : 'hover:bg-muted/30 border-l-2 border-l-transparent'
      }`}
    >
      {/* Event title + icon */}
      <div className="flex items-start gap-2 mb-2">
        {event.image && (
          <img
            src={event.image}
            alt=""
            className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2">
            {event.title}
          </div>
        </div>
      </div>

      {/* Outcomes */}
      {markets.length <= 2 ? (
        // Binary market — show Yes/No bar
        markets.slice(0, 1).map(m => {
          const { yesPrice, noPrice } = getLivePrice(m);
          const yesPct = Math.round(yesPrice * 100);
          const noPct = Math.round(noPrice * 100);
          return (
            <div key={m.id} className="mb-2">
              <div className="flex h-6 rounded overflow-hidden">
                <div
                  className="flex items-center justify-center text-[11px] font-bold text-black bg-terminal-green transition-all"
                  style={{ width: `${Math.max(yesPct, 8)}%` }}
                >
                  {yesPct}% Yes
                </div>
                <div
                  className="flex items-center justify-center text-[11px] font-bold text-white bg-destructive transition-all"
                  style={{ width: `${Math.max(noPct, 8)}%` }}
                >
                  {noPct}%
                </div>
              </div>
            </div>
          );
        })
      ) : (
        // Multi-outcome — show compact list
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
                      <div
                        className="absolute inset-y-0 left-0 bg-terminal-green/60 rounded"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                      <span className="relative text-[9px] font-medium text-foreground px-1.5 leading-4 block truncate">
                        {label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold min-w-[35px] text-right ${pct > 50 ? 'text-terminal-green' : 'text-muted-foreground'}`}>
                      {pct > 0 ? `${pct}%` : '<1%'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {markets.length > 4 && (
            <span className="text-[9px] text-muted-foreground">+{markets.length - 4} more outcomes</span>
          )}
        </div>
      )}

      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="text-terminal-green">Vol: {vol}</span>
        <span>Liquidity: {liq}</span>
        {endDate && <span>Ends: {endDate}</span>}
      </div>
    </div>
  );
};

// ============== EVENT DETAIL VIEW (Polymarket-style) ==============

const CHART_COLORS = [
  'hsl(var(--terminal-cyan))',
  'hsl(var(--terminal-amber))',
  'hsl(var(--terminal-green))',
  'hsl(210, 90%, 60%)',
  'hsl(340, 80%, 60%)',
  'hsl(160, 80%, 50%)',
];

const EventDetailView = ({
  event, selectedMarket, onSelectMarket, priceHistory, multiPriceHistory,
  orderbook, allMarkets, onSelectEvent, liveTrades, wsConnected, dataStatus, getLivePrice,
}: {
  event: PolymarketEvent;
  selectedMarket: PolymarketMarket | null;
  onSelectMarket: (m: PolymarketMarket) => void;
  priceHistory: PriceHistoryPoint[];
  multiPriceHistory: Map<string, PriceHistoryPoint[]>;
  orderbook: OrderbookData | null;
  allMarkets: PolymarketMarket[];
  onSelectEvent: (m: PolymarketMarket) => void;
  liveTrades: PolymarketLastTrade[];
  wsConnected: boolean;
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

  // For single/binary market, show classic detail
  if (!isMulti && selectedMarket) {
    return (
      <PolymarketMarketDetail
        market={selectedMarket}
        priceHistory={priceHistory}
        orderbook={orderbook}
        allMarkets={allMarkets}
        onSelectMarket={onSelectEvent}
        liveTrades={liveTrades}
        wsConnected={wsConnected}
        dataStatus={dataStatus}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <span className="text-[10px] font-bold text-terminal-amber tracking-wider">MARKET DETAIL</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[8px] ${statusConfig.border} ${statusConfig.text} px-1 py-0`}>
            <span className={`w-1 h-1 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''} mr-1 inline-block`} />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Event Header */}
        <div className="flex items-start gap-3">
          {event.image && (
            <img
              src={event.image}
              alt=""
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1">
            {event.tags?.length > 0 && (
              <div className="flex gap-1 mb-1">
                {event.tags.slice(0, 3).map(t => (
                  <span key={t} className="text-[9px] text-muted-foreground">{t}</span>
                ))}
              </div>
            )}
            <h3 className="text-base font-bold text-foreground leading-snug">{event.title}</h3>
          </div>
        </div>

        {/* Multi-Outcome Legend */}
        {isMulti && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            {markets.map((m, i) => {
              const { yesPrice } = getLivePrice(m);
              const pct = Math.round(yesPrice * 100);
              const label = m.groupItemTitle || m.question;
              return (
                <div key={m.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-bold text-foreground">{pct > 0 ? `${pct}%` : '<1%'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Multi-line Price Chart */}
        <div className="border border-border rounded bg-card p-3">
          <div className="text-[10px] text-terminal-amber uppercase tracking-wider mb-2">PRICE HISTORY</div>
          {isMulti && multiPriceHistory.size > 0 ? (
            <MultiOutcomePriceChart histories={multiPriceHistory} />
          ) : (
            <PolymarketPriceChart data={priceHistory} />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{PolymarketService.formatVolume(totalVol)} Vol.</span>
          <span className="flex items-center gap-1">📅 {endDate || 'Open'}</span>
        </div>

        {/* Outcome Rows (Polymarket-style) */}
        <div className="border border-border rounded overflow-hidden">
          {markets.map((m, i) => {
            const { yesPrice } = getLivePrice(m);
            const pct = Math.round(yesPrice * 100);
            const label = m.groupItemTitle || m.question;
            const mVol = parseFloat(m.volume || '0');
            const yesCents = Math.round(yesPrice * 100);
            const noCents = Math.round((1 - yesPrice) * 100);
            const isSelected = selectedMarket?.id === m.id;

            return (
              <div
                key={m.id}
                onClick={() => onSelectMarket(m)}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 cursor-pointer transition-colors ${
                  isSelected ? 'bg-terminal-amber/5' : 'hover:bg-muted/30'
                }`}
              >
                {/* Outcome Name + Volume */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-foreground">{label}</div>
                  <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="w-2.5 h-2.5" />
                    {PolymarketService.formatVolume(mVol)} Vol. 🗑️
                  </div>
                </div>

                {/* Probability */}
                <div className="text-right mr-2">
                  <div className={`text-lg font-black ${pct > 50 ? 'text-terminal-green' : pct < 10 ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {pct > 0 ? `${pct}%` : '<1%'}
                  </div>
                </div>

                {/* Buy Yes / Buy No buttons */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button className="px-3 py-1.5 rounded text-[10px] font-bold bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:bg-terminal-green/30 transition-colors">
                    Buy Yes {yesCents > 0 ? `${yesCents}¢` : ''}
                  </button>
                  <button className="px-3 py-1.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition-colors">
                    Buy No {noCents > 0 ? `${noCents}¢` : ''}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Orderbook + Trades if a specific market is selected */}
        {selectedMarket && (
          <>
            {/* Orderbook */}
            <div className="border border-border rounded bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">ORDER BOOK</span>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />
                <span className={`text-[9px] ${statusConfig.text}`}>{statusConfig.label}</span>
              </div>
              {orderbook ? (
                <OrderbookDisplay orderbook={orderbook} />
              ) : (
                <div className="text-center py-4 text-[10px] text-muted-foreground">Waiting for orderbook...</div>
              )}
            </div>

            {/* Trades */}
            <div className="border border-border rounded bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-terminal-amber uppercase tracking-wider font-bold">
                  {dataStatus === 'live' ? 'LIVE TRADES' : 'RECENT TRADES'}
                </span>
                {dataStatus !== 'offline' && (
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} ${dataStatus === 'live' ? 'animate-pulse' : ''}`} />
                )}
              </div>
              {liveTrades.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {liveTrades.slice(0, 15).map((trade, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-muted/30">
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                        trade.side === 'BUY' ? 'border-terminal-green/50 text-terminal-green' : 'border-destructive/50 text-destructive'
                      }`}>
                        {trade.side}
                      </Badge>
                      <span className="text-foreground">${trade.price} × {parseFloat(trade.size).toLocaleString()}</span>
                      <span className="text-muted-foreground">{new Date(parseInt(trade.timestamp)).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-[10px] text-muted-foreground">Waiting for trades...</div>
              )}
            </div>

            {/* Calculator + AI */}
            <div className="space-y-4">
              <PolymarketCalculatorInline market={selectedMarket} />
            </div>
          </>
        )}

        {/* Description */}
        {event.description && (
          <div className="border border-border rounded bg-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rules</span>
              <span className="text-[10px] text-muted-foreground">Market Context</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== INLINE CALCULATOR ==============

import { PolymarketCalculator } from '@/components/polymarket/PolymarketCalculator';

const PolymarketCalculatorInline = ({ market }: { market: PolymarketMarket }) => (
  <PolymarketCalculator market={market} />
);

// ============== MULTI-OUTCOME PRICE CHART ==============

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MultiOutcomePriceChart = ({ histories }: { histories: Map<string, PriceHistoryPoint[]> }) => {
  const labels = Array.from(histories.keys());
  if (labels.length === 0) return <div className="h-[250px] flex items-center justify-center text-[10px] text-muted-foreground">Loading chart...</div>;

  // Merge all timestamps
  const allTimestamps = new Set<number>();
  histories.forEach(points => points.forEach(p => allTimestamps.add(p.t)));
  const sortedTs = Array.from(allTimestamps).sort((a, b) => a - b);

  const chartData = sortedTs.map(t => {
    const row: any = { t };
    labels.forEach(label => {
      const points = histories.get(label) || [];
      const closest = points.reduce((prev, curr) => Math.abs(curr.t - t) < Math.abs(prev.t - t) ? curr : prev, points[0]);
      row[label] = closest ? Math.round(closest.p * 100) : null;
    });
    return row;
  });

  // Sample to max ~200 points for perf
  const step = Math.max(1, Math.floor(chartData.length / 200));
  const sampled = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={sampled}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={t => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          interval="preserveStartEnd"
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `${v}%`}
          width={35}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 10, borderRadius: 4 }}
          labelFormatter={t => new Date(Number(t) * 1000).toLocaleDateString()}
          formatter={(v: number, name: string) => [`${v}%`, name]}
        />
        {labels.map((label, i) => (
          <Line
            key={label}
            type="monotone"
            dataKey={label}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

// ============== ORDERBOOK DISPLAY ==============

const OrderbookDisplay = ({ orderbook }: { orderbook: OrderbookData }) => {
  const bids = (orderbook.bids || []).slice(0, 8);
  const asks = (orderbook.asks || []).slice(0, 8);

  const maxSize = Math.max(
    ...bids.map(b => parseFloat(b.size || '0')),
    ...asks.map(a => parseFloat(a.size || '0')),
    1
  );

  const spread = bids.length > 0 && asks.length > 0
    ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(4)
    : null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 text-[10px]">
        {/* Bids */}
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1 px-1 font-bold">
            <span className="flex items-center gap-1">BIDS (YES) <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" /></span>
            <span>SIZE</span>
          </div>
          {bids.map((b, i) => {
            const pct = (parseFloat(b.size) / maxSize) * 100;
            return (
              <div key={i} className="relative flex justify-between px-1 py-[3px] rounded-sm mb-[1px]">
                <div className="absolute inset-0 bg-terminal-green/10 rounded-sm" style={{ width: `${pct}%` }} />
                <span className="relative text-terminal-green font-mono">${parseFloat(b.price).toFixed(2)}</span>
                <span className="relative text-muted-foreground font-mono">{parseFloat(b.size).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </div>
        {/* Asks */}
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1 px-1 font-bold">
            <span className="flex items-center gap-1">ASKS (YES) <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /></span>
            <span>SIZE</span>
          </div>
          {asks.map((a, i) => {
            const pct = (parseFloat(a.size) / maxSize) * 100;
            return (
              <div key={i} className="relative flex justify-between px-1 py-[3px] rounded-sm mb-[1px]">
                <div className="absolute inset-0 right-0 bg-destructive/10 rounded-sm" style={{ width: `${pct}%`, marginLeft: 'auto' }} />
                <span className="relative text-destructive font-mono">${parseFloat(a.price).toFixed(2)}</span>
                <span className="relative text-muted-foreground font-mono">{parseFloat(a.size).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </div>
      </div>
      {spread && (
        <div className="text-center mt-2 text-[9px] text-muted-foreground">
          Spread: <span className="text-terminal-amber font-mono">${spread}</span>
        </div>
      )}
    </div>
  );
};

// ============== SUB COMPONENTS ==============

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="px-4 py-3 border-r border-border/30 last:border-r-0 bg-card/30">
    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

const StatusBadge = ({ status, compact }: { status: 'live' | 'polling' | 'offline'; compact?: boolean }) => {
  const config = {
    live: { color: 'bg-terminal-green', text: 'text-terminal-green', border: 'border-terminal-green/40', label: 'LIVE' },
    polling: { color: 'bg-terminal-amber', text: 'text-terminal-amber', border: 'border-terminal-amber/40', label: 'POLLING' },
    offline: { color: 'bg-destructive', text: 'text-destructive', border: 'border-destructive/40', label: 'OFFLINE' },
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${status === 'live' ? 'animate-pulse' : ''}`} />
      {!compact && (
        <Badge variant="outline" className={`text-[8px] ${config.border} ${config.text} px-1 py-0`}>
          ● {config.label}
        </Badge>
      )}
    </div>
  );
};

export default PolymarketHub;
