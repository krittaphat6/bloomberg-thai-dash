import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RotateCcw, Search, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { PolymarketService, PolymarketEvent, PolymarketMarket, PriceHistoryPoint, OrderbookData } from '@/services/PolymarketService';
import { PolymarketMarketCard } from '@/components/polymarket/PolymarketMarketCard';
import { PolymarketMarketDetail } from '@/components/polymarket/PolymarketMarketDetail';
import { PolymarketCorrelated } from '@/components/polymarket/PolymarketCorrelated';

const CATEGORY_TAGS = ['All', 'Politics', 'Crypto', 'Sports', 'Science', 'Culture', 'Business'];

const PolymarketHub = () => {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [selectedTag, setSelectedTag] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async (tag?: string) => {
    setLoading(true);
    try {
      const tagParam = tag && tag !== 'All' ? tag.toLowerCase() : undefined;
      const [evts, mkts] = await Promise.all([
        PolymarketService.getTrendingEvents(20, tagParam),
        PolymarketService.getMarkets(50, tagParam),
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

  useEffect(() => { fetchData(selectedTag); }, [selectedTag]);

  useEffect(() => {
    const iv = setInterval(() => fetchData(selectedTag), 60000);
    return () => clearInterval(iv);
  }, [selectedTag]);

  useEffect(() => {
    if (!selectedMarket) return;
    const outcomes = PolymarketService.parseOutcomes(selectedMarket);
    const yesToken = outcomes[0]?.tokenId;
    if (yesToken) {
      PolymarketService.getPriceHistory(yesToken).then(setPriceHistory).catch(() => setPriceHistory([]));
      PolymarketService.getOrderbook(yesToken).then(setOrderbook).catch(() => setOrderbook(null));
    }
  }, [selectedMarket]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await PolymarketService.searchEvents(searchQuery);
      setEvents(Array.isArray(results) ? results : []);
      // extract markets from events
      const mkts = (Array.isArray(results) ? results : []).flatMap((e: PolymarketEvent) => e.markets || []);
      setAllMarkets(mkts);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const activeCount = allMarkets.filter(m => m.active && !m.closed).length;
  const totalVol24h = allMarkets.reduce((s, m) => s + (m.volume24hr || 0), 0);
  const totalLiquidity = allMarkets.reduce((s, m) => s + parseFloat(m.liquidity || '0'), 0);

  // Flatten markets for list
  const displayMarkets = allMarkets.length > 0
    ? allMarkets.filter(m => m.active && !m.closed)
    : events.flatMap(e => e.markets || []).filter(m => m.active && !m.closed);

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card" style={{ borderTop: '2px solid hsl(var(--terminal-amber, 45 93% 47%))' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider" style={{ color: 'hsl(var(--terminal-amber, 45 93% 47%))' }}>
            🔮 POLYMARKET PREDICTION HUB
          </span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-500 font-medium">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search markets..."
              className="h-6 w-40 text-[10px] bg-background border-border"
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSearch}>
              <Search className="w-3 h-3" />
            </Button>
          </div>
          <span className="text-[9px] text-muted-foreground">
            {lastUpdate.toLocaleTimeString()}
          </span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => fetchData(selectedTag)}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Category Tags */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-border bg-card/50 overflow-x-auto">
        {CATEGORY_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => { setSelectedTag(tag); setSelectedMarket(null); }}
            className={`px-2.5 py-1 text-[10px] font-medium border rounded transition-colors whitespace-nowrap ${
              selectedTag === tag
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-border">
        <StatCard icon={<Target className="w-3 h-3" />} label="ACTIVE MARKETS" value={activeCount.toString()} color="text-cyan-400" />
        <StatCard icon={<DollarSign className="w-3 h-3" />} label="24H VOLUME" value={PolymarketService.formatVolume(totalVol24h)} color="text-green-400" />
        <StatCard icon={<BarChart3 className="w-3 h-3" />} label="LIQUIDITY" value={PolymarketService.formatVolume(totalLiquidity)} color="text-amber-400" />
        <StatCard icon={<TrendingUp className="w-3 h-3" />} label="EVENTS" value={events.length.toString()} color="text-purple-400" />
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Loading Polymarket data...</span>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-0 min-h-0 overflow-hidden">
          {/* Left: Market List */}
          <ScrollArea className="h-full border-r border-border">
            <div className="divide-y divide-border">
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

          {/* Right: Detail */}
          <ScrollArea className="h-full">
            {selectedMarket ? (
              <div className="flex flex-col">
                <PolymarketMarketDetail
                  market={selectedMarket}
                  priceHistory={priceHistory}
                  orderbook={orderbook}
                />
                <PolymarketCorrelated
                  currentMarket={selectedMarket}
                  allMarkets={displayMarkets}
                  onSelect={setSelectedMarket}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-8">
                <div className="text-center">
                  <span className="text-2xl mb-2 block">🔮</span>
                  Select a market to view details
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <Card className="bg-card border-border">
    <CardContent className="p-2">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </CardContent>
  </Card>
);

export default PolymarketHub;
