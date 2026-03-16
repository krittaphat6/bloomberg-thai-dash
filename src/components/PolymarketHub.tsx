import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RotateCcw, Search, TrendingUp, DollarSign, Target, BarChart3, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PolymarketService, PolymarketEvent, PolymarketMarket, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
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
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const orderbookRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (tag?: string) => {
    setLoading(true);
    try {
      const [evts, mkts] = await Promise.all([
        PolymarketService.getTrendingEvents(20, tag),
        PolymarketService.getMarkets(50, tag),
      ]);
      setEvents(Array.isArray(evts) ? evts : []);
      setAllMarkets(Array.isArray(mkts) ? mkts : []);
      setLastUpdate(new Date());
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

  // When market selected, fetch detail + start realtime orderbook
  useEffect(() => {
    if (orderbookRef.current) clearInterval(orderbookRef.current);
    if (!selectedMarket) return;

    const outcomes = PolymarketService.parseOutcomes(selectedMarket);
    const yesToken = outcomes[0]?.tokenId;
    if (!yesToken) return;

    PolymarketService.getPriceHistory(yesToken).then(setPriceHistory).catch(() => setPriceHistory([]));
    PolymarketService.getOrderbook(yesToken).then(setOrderbook).catch(() => setOrderbook(null));

    // Real-time orderbook polling every 5s
    orderbookRef.current = setInterval(() => {
      PolymarketService.getOrderbook(yesToken).then(setOrderbook).catch(() => {});
    }, 5000);

    return () => { if (orderbookRef.current) clearInterval(orderbookRef.current); };
  }, [selectedMarket]);

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

  const activeCount = allMarkets.filter(m => m.active && !m.closed).length;
  const totalVol24h = allMarkets.reduce((s, m) => s + (m.volume24hr || 0), 0);
  const totalLiquidity = allMarkets.reduce((s, m) => s + parseFloat(m.liquidity || '0'), 0);
  const resolvedCount = allMarkets.filter(m => m.closed).length;

  const displayMarkets = allMarkets.length > 0
    ? allMarkets.filter(m => m.active && !m.closed)
    : events.flatMap(e => e.markets || []).filter(m => m.active && !m.closed);

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-foreground overflow-hidden font-mono">
      {/* Main Tabs */}
      <div className="flex items-center border-b border-border/50 bg-[#161b22]">
        <div className="flex-1 flex">
          {MAIN_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedMarket(null); }}
              className={`px-4 py-2.5 text-[11px] font-bold tracking-wider transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3">
          <div className="flex items-center gap-1">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search markets..."
              className="h-7 w-44 text-[10px] bg-[#0d1117] border-border/50"
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
      <div className="grid grid-cols-4 gap-0 border-b border-border/50">
        <StatCard label="ACTIVE MARKETS" value={activeCount.toLocaleString()} color="text-cyan-400" />
        <StatCard label="24H VOLUME" value={PolymarketService.formatVolume(totalVol24h)} color="text-green-400" />
        <StatCard label="OPEN INTEREST" value={PolymarketService.formatVolume(totalLiquidity)} color="text-amber-400" />
        <StatCard label="RESOLVED TODAY" value={resolvedCount.toString()} color="text-purple-400" />
      </div>

      {/* Sub Tags */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-border/50 bg-[#161b22]/50 overflow-x-auto">
        {SUB_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveSubTag(tag)}
            className={`px-2.5 py-1 text-[10px] border rounded transition-colors whitespace-nowrap ${
              activeSubTag === tag
                ? 'border-green-500/50 text-green-400 bg-green-500/10'
                : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-[#1c2333]'
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
          <div className="w-[480px] min-w-[380px] border-r border-border/50 flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[#161b22]/30">
              <span className="text-[10px] font-bold text-green-400 tracking-wider">TRENDING MARKETS</span>
              <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-400 px-1.5 py-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1 inline-block" />
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
                orderbook={orderbook}
                allMarkets={displayMarkets}
                onSelectMarket={setSelectedMarket}
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
  <div className="px-4 py-3 border-r border-border/30 last:border-r-0 bg-[#161b22]/30">
    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

export default PolymarketHub;
