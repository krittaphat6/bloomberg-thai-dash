import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PolymarketService, PolymarketEvent, PolymarketMarket, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { polymarketWS, PolymarketBookUpdate, PolymarketLastTrade } from '@/services/PolymarketWebSocketService';
import { PolymarketMarketCard } from '@/components/polymarket/PolymarketMarketCard';
import { PolymarketMarketDetail } from '@/components/polymarket/PolymarketMarketDetail';

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
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [activeTab, setActiveTab] = useState('TRENDING');
  const [activeSubTag, setActiveSubTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveBooks, setLiveBooks] = useState<Map<string, PolymarketBookUpdate>>(new Map());
  const [liveTrades, setLiveTrades] = useState<PolymarketLastTrade[]>([]);
  const [totalMarketCount, setTotalMarketCount] = useState(0);

  const fetchData = useCallback(async (tag?: string) => {
    setLoading(true);
    try {
      const [evts, mkts] = await Promise.all([
        PolymarketService.getTrendingEvents(20, tag),
        PolymarketService.getMarkets(50, tag),
      ]);
      setEvents(Array.isArray(evts) ? evts : []);
      setAllMarkets(Array.isArray(mkts) ? mkts : []);

      // Subscribe top markets to WebSocket
      const markets = Array.isArray(mkts) ? mkts : [];
      const topMarkets = markets
        .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0))
        .slice(0, 100);
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

  useEffect(() => {
    fetchData(TAB_TO_TAG[activeTab]);
  }, [activeTab]);

  useEffect(() => {
    const iv = setInterval(() => fetchData(TAB_TO_TAG[activeTab]), 60000);
    return () => clearInterval(iv);
  }, [activeTab]);

  // WebSocket status
  useEffect(() => {
    const unsub = polymarketWS.onStatus(setWsConnected);
    return unsub;
  }, []);

  // Subscribe to ALL book & trade updates
  useEffect(() => {
    const unsubBook = polymarketWS.onBook('ALL', (data) => {
      setLiveBooks(prev => {
        const next = new Map(prev);
        next.set(data.asset_id, data);
        return next;
      });
    });
    const unsubTrade = polymarketWS.onTrade('ALL', (data) => {
      setLiveTrades(prev => [data, ...prev].slice(0, 50));
    });
    return () => { unsubBook(); unsubTrade(); };
  }, []);

  // When market selected — fetch price history + subscribe WS
  useEffect(() => {
    if (!selectedMarket) return;
    const outcomes = PolymarketService.parseOutcomes(selectedMarket);
    const yesToken = outcomes[0]?.tokenId;
    if (!yesToken) return;

    PolymarketService.getPriceHistory(yesToken).then(setPriceHistory).catch(() => setPriceHistory([]));

    // Subscribe selected market tokens
    const tokenIds = outcomes.map(o => o.tokenId).filter(Boolean);
    if (tokenIds.length > 0) {
      polymarketWS.subscribeToAssets(tokenIds);
    }
  }, [selectedMarket]);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => { polymarketWS.disconnect(); };
  }, []);

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
    if (yesTokenId) {
      const liveBook = liveBooks.get(yesTokenId);
      if (liveBook) return {
        bids: liveBook.bids,
        asks: liveBook.asks,
        hash: liveBook.hash,
        timestamp: liveBook.timestamp,
        market: liveBook.market,
      };
    }
    return null;
  }, [selectedMarket, liveBooks]);

  const activeCount = allMarkets.filter(m => m.active && !m.closed).length;
  const totalVol24h = allMarkets.reduce((s, m) => s + (m.volume24hr || 0), 0);
  const totalLiquidity = allMarkets.reduce((s, m) => s + parseFloat(m.liquidity || '0'), 0);

  const displayMarkets = allMarkets.length > 0
    ? allMarkets.filter(m => m.active && !m.closed)
    : events.flatMap(e => e.markets || []).filter(m => m.active && !m.closed);

  const liveOrderbook = getLiveOrderbook();

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Main Tabs */}
      <div className="flex items-center border-b border-border bg-card">
        <div className="flex-1 flex">
          {MAIN_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedMarket(null); }}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-wider transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-terminal-amber text-terminal-amber'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3">
          {/* WS Status */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-terminal-green animate-pulse' : 'bg-destructive'}`} />
            <span className={`text-[9px] font-bold ${wsConnected ? 'text-terminal-green' : 'text-destructive'}`}>
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
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
        <StatCard label="ACTIVE MARKETS" value={activeCount.toLocaleString()} color="text-terminal-cyan" />
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
          {/* Left: Market List */}
          <div className="w-[480px] min-w-[380px] border-r border-border flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/30">
              <span className="text-[10px] font-bold text-terminal-green tracking-wider">TRENDING MARKETS</span>
              <Badge variant="outline" className="text-[9px] border-terminal-green/40 text-terminal-green px-1.5 py-0">
                <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse mr-1 inline-block" />
                LIVE
              </Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border/30">
                {displayMarkets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">No active markets found</div>
                ) : (
                  displayMarkets.slice(0, 30).map(market => (
                    <PolymarketMarketCard
                      key={market.id}
                      market={market}
                      isSelected={selectedMarket?.id === market.id}
                      onClick={() => setSelectedMarket(market)}
                      getLivePrice={getLivePrice}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Detail */}
          <ScrollArea className="flex-1">
            {selectedMarket ? (
              <PolymarketMarketDetail
                market={selectedMarket}
                priceHistory={priceHistory}
                orderbook={liveOrderbook}
                allMarkets={displayMarkets}
                onSelectMarket={setSelectedMarket}
                liveTrades={liveTrades}
                wsConnected={wsConnected}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                <div className="text-center">
                  <span className="text-3xl mb-3 block">🔮</span>
                  <p className="text-sm text-muted-foreground">Select a market to view details</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="px-4 py-3 border-r border-border/30 last:border-r-0 bg-card/30">
    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

export default PolymarketHub;
