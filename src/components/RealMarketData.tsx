import { useEffect, useState, useCallback } from 'react';
import { openbb, useOpenBBHealth } from '@/lib/openbb';
import { dataPipelineService, MarketQuote } from '@/services/DataPipelineService';
import { DEFAULT_SYMBOLS } from '@/config/DataSourceConfig';
import { supabase } from '@/integrations/supabase/client';
import {
  RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown, Activity,
  BarChart3, Globe, DollarSign, Landmark, Bitcoin, Gem, Fuel,
  Search, Filter, ChevronDown, ChevronRight, Star, StarOff,
  ArrowUpRight, ArrowDownRight, Minus, Layers, Database, Zap, Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ===== Types =====
interface AssetData {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  bid?: number;
  ask?: number;
  marketCap?: number;
  pe?: number;
  rsi?: number;
  sma50?: number;
  sma200?: number;
  sector?: string;
  source: string;
  category: 'equity' | 'crypto' | 'forex' | 'commodity' | 'index' | 'etf' | 'bond';
  starred?: boolean;
}

interface EconomicEvent {
  date: string;
  event: string;
  country: string;
  impact: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

interface SectionState {
  expanded: boolean;
  loading: boolean;
  data: AssetData[];
}

// ===== Category configs =====
const CATEGORIES = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'equity', label: 'Equities', icon: BarChart3 },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'forex', label: 'Forex', icon: DollarSign },
  { id: 'commodity', label: 'Commodities', icon: Fuel },
  { id: 'index', label: 'Indices', icon: Globe },
  { id: 'etf', label: 'ETFs', icon: Layers },
  { id: 'economy', label: 'Economy', icon: Landmark },
] as const;

const WATCHLIST_SYMBOLS = {
  equity: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'WMT', 'JNJ', 'XOM', 'BAC', 'DIS', 'NFLX'],
  crypto: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOTUSD', 'AVAXUSD'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'USDCAD', 'NZDUSD', 'EURGBP'],
  commodity: ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'PL=F', 'PA=F', 'ZW=F'],
  index: ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', '^FTSE', '^N225', '^HSI'],
  etf: ['SPY', 'QQQ', 'IWM', 'GLD', 'SLV', 'USO', 'TLT', 'VXX', 'ARKK', 'XLF'],
};

// ===== Component =====
const RealMarketData = () => {
  const openbbConnected = useOpenBBHealth();
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [equities, setEquities] = useState<AssetData[]>([]);
  const [cryptos, setCryptos] = useState<AssetData[]>([]);
  const [forex, setForex] = useState<AssetData[]>([]);
  const [commodities, setCommodities] = useState<AssetData[]>([]);
  const [indices, setIndices] = useState<AssetData[]>([]);
  const [etfs, setEtfs] = useState<AssetData[]>([]);
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([]);
  const [fearGreed, setFearGreed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fallback data from existing pipeline
  const [fallbackData, setFallbackData] = useState<MarketQuote[]>([]);

  const toggleStar = (symbol: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
      return next;
    });
  };

  // ===== Data fetching =====
  const fetchOpenBBData = useCallback(async () => {
    if (!openbbConnected) return;

    try {
      // Fetch in parallel
      const [eqData, cryptoData, fxData, idxData, etfData, econData, fgData] = await Promise.allSettled([
        // Equities
        Promise.all(WATCHLIST_SYMBOLS.equity.slice(0, 10).map(async (sym) => {
          try {
            const q = await openbb.equity.quote(sym);
            const row = Array.isArray(q) ? q[0] : q?.results?.[0] || q;
            return {
              symbol: sym,
              name: row?.name || row?.short_name || sym,
              price: row?.last_price || row?.price || row?.regular_market_price || 0,
              change: row?.change || row?.regular_market_change || 0,
              changePercent: row?.change_percent || row?.regular_market_change_percent || 0,
              volume: row?.volume || 0,
              high: row?.high || row?.day_high || 0,
              low: row?.low || row?.day_low || 0,
              open: row?.open || row?.regular_market_open || 0,
              marketCap: row?.market_cap || 0,
              pe: row?.pe_ratio || 0,
              source: 'OpenBB',
              category: 'equity' as const,
            };
          } catch { return null; }
        })),
        // Crypto
        Promise.all(WATCHLIST_SYMBOLS.crypto.map(async (sym) => {
          try {
            const q = await openbb.crypto.quote(sym);
            const row = Array.isArray(q) ? q[0] : q?.results?.[0] || q;
            return {
              symbol: sym,
              name: row?.name || sym,
              price: row?.last_price || row?.price || 0,
              change: row?.change || 0,
              changePercent: row?.change_percent || 0,
              volume: row?.volume || 0,
              source: 'OpenBB',
              category: 'crypto' as const,
            };
          } catch { return null; }
        })),
        // Forex
        Promise.all(WATCHLIST_SYMBOLS.forex.map(async (sym) => {
          try {
            const q = await openbb.forex.quote(sym);
            const row = Array.isArray(q) ? q[0] : q?.results?.[0] || q;
            return {
              symbol: sym,
              price: row?.last_price || row?.price || 0,
              change: row?.change || 0,
              changePercent: row?.change_percent || 0,
              bid: row?.bid || 0,
              ask: row?.ask || 0,
              source: 'OpenBB',
              category: 'forex' as const,
            };
          } catch { return null; }
        })),
        // Indices
        Promise.all(WATCHLIST_SYMBOLS.index.map(async (sym) => {
          try {
            const q = await openbb.index.historical(sym);
            const row = Array.isArray(q) ? q[q.length - 1] : q?.results?.[0] || q;
            return {
              symbol: sym.replace('^', ''),
              name: sym,
              price: row?.close || row?.price || 0,
              change: row?.change || 0,
              changePercent: row?.change_percent || 0,
              volume: row?.volume || 0,
              source: 'OpenBB',
              category: 'index' as const,
            };
          } catch { return null; }
        })),
        // ETFs
        Promise.all(WATCHLIST_SYMBOLS.etf.map(async (sym) => {
          try {
            const q = await openbb.etf.info(sym);
            const row = Array.isArray(q) ? q[0] : q?.results?.[0] || q;
            return {
              symbol: sym,
              name: row?.name || sym,
              price: row?.last_price || row?.price || 0,
              change: row?.change || 0,
              changePercent: row?.change_percent || 0,
              source: 'OpenBB',
              category: 'etf' as const,
            };
          } catch { return null; }
        })),
        // Economy calendar
        openbb.economy.calendar().catch(() => null),
        // Fear & Greed
        openbb.alternative.fearGreed().catch(() => null),
      ]);

      if (eqData.status === 'fulfilled') setEquities(eqData.value.filter(Boolean) as AssetData[]);
      if (cryptoData.status === 'fulfilled') setCryptos(cryptoData.value.filter(Boolean) as AssetData[]);
      if (fxData.status === 'fulfilled') setForex(fxData.value.filter(Boolean) as AssetData[]);
      if (idxData.status === 'fulfilled') setIndices(idxData.value.filter(Boolean) as AssetData[]);
      if (etfData.status === 'fulfilled') setEtfs(etfData.value.filter(Boolean) as AssetData[]);
      if (econData.status === 'fulfilled' && econData.value) {
        const events = Array.isArray(econData.value) ? econData.value : econData.value?.results || [];
        setEconomicEvents(events.slice(0, 20).map((e: any) => ({
          date: e.date || '',
          event: e.event || e.title || '',
          country: e.country || '',
          impact: e.importance || e.impact || 'medium',
          actual: e.actual?.toString(),
          forecast: e.forecast?.toString(),
          previous: e.previous?.toString(),
        })));
      }
      if (fgData.status === 'fulfilled' && fgData.value) {
        const fg = Array.isArray(fgData.value) ? fgData.value[0] : fgData.value;
        setFearGreed(fg?.value || fg?.score || null);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('OpenBB fetch error:', err);
    }
  }, [openbbConnected]);

  // Fallback: existing pipeline
  const fetchFallbackData = useCallback(async () => {
    try {
      const data = await dataPipelineService.fetchMarketData(DEFAULT_SYMBOLS);
      setFallbackData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Fallback fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (openbbConnected) {
        await fetchOpenBBData();
      }
      await fetchFallbackData();
      setLoading(false);
    };
    init();
    const interval = setInterval(() => {
      if (openbbConnected) fetchOpenBBData();
      fetchFallbackData();
    }, 60000);
    return () => clearInterval(interval);
  }, [openbbConnected, fetchOpenBBData, fetchFallbackData]);

  // Supabase realtime
  useEffect(() => {
    const channel = supabase
      .channel('market-data-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_data' }, (payload) => {
        const n = payload.new as any;
        setFallbackData(prev => {
          const updated = prev.filter(q => q.symbol !== n.symbol);
          return [...updated, {
            symbol: n.symbol, price: parseFloat(n.price), change: parseFloat(n.change),
            changePercent: parseFloat(n.change_percent), volume: n.volume,
            high: parseFloat(n.high), low: parseFloat(n.low), open: parseFloat(n.open),
            bid: n.bid ? parseFloat(n.bid) : undefined, ask: n.ask ? parseFloat(n.ask) : undefined,
            timestamp: n.timestamp, source: n.source
          }];
        });
        setLastUpdate(new Date());
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (openbbConnected) await fetchOpenBBData();
    await fetchFallbackData();
    setIsRefreshing(false);
  };

  // ===== Helpers =====
  const fmtPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };
  const fmtChange = (c: number) => (c > 0 ? '+' : '') + c.toFixed(2);
  const fmtPct = (p: number) => (p > 0 ? '+' : '') + p.toFixed(2) + '%';
  const fmtVol = (v: number) => {
    if (!v) return '-';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toString();
  };
  const fmtMcap = (m: number) => {
    if (!m) return '-';
    if (m >= 1e12) return '$' + (m / 1e12).toFixed(2) + 'T';
    if (m >= 1e9) return '$' + (m / 1e9).toFixed(1) + 'B';
    if (m >= 1e6) return '$' + (m / 1e6).toFixed(0) + 'M';
    return '$' + m.toLocaleString();
  };

  const changeColor = (c: number) =>
    c > 0 ? 'text-emerald-400' : c < 0 ? 'text-red-400' : 'text-zinc-400';
  const changeBg = (c: number) =>
    c > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : c < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-800 border-zinc-700';

  // Filter logic
  const filterAssets = (assets: AssetData[]) => {
    if (!search) return assets;
    const q = search.toLowerCase();
    return assets.filter(a => a.symbol.toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q));
  };

  // Merge fallback data into categories if OpenBB is down
  const getMergedEquities = () => {
    if (equities.length > 0) return equities;
    return fallbackData.filter(d => !d.symbol.includes('USD') && !d.symbol.startsWith('^')).map(d => ({
      ...d, category: 'equity' as const, source: d.source || 'proxy', name: d.symbol,
    }));
  };

  // ===== Asset Row =====
  const AssetRow = ({ asset }: { asset: AssetData }) => (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] group">
      <button onClick={() => toggleStar(asset.symbol)} className="opacity-40 group-hover:opacity-100 transition-opacity">
        {starred.has(asset.symbol) ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <StarOff className="w-3.5 h-3.5 text-zinc-600" />}
      </button>
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-100 truncate">{asset.symbol}</div>
        {asset.name && asset.name !== asset.symbol && (
          <div className="text-[10px] text-zinc-500 truncate">{asset.name}</div>
        )}
      </div>
      <div className="text-right text-sm font-mono text-zinc-100 tabular-nums">{fmtPrice(asset.price)}</div>
      <div className={`text-right text-xs font-mono tabular-nums flex items-center justify-end gap-0.5 ${changeColor(asset.change)}`}>
        {asset.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : asset.change < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        {fmtChange(asset.change)}
      </div>
      <div className={`text-right text-xs px-1.5 py-0.5 rounded font-mono tabular-nums border ${changeBg(asset.changePercent)} ${changeColor(asset.changePercent)}`}>
        {fmtPct(asset.changePercent)}
      </div>
      <div className="text-right text-[10px] text-zinc-500 font-mono tabular-nums min-w-[48px]">
        {asset.volume ? fmtVol(asset.volume) : asset.marketCap ? fmtMcap(asset.marketCap) : '-'}
      </div>
    </div>
  );

  // ===== Section =====
  const AssetSection = ({ title, icon: Icon, assets, showExtra = false }: {
    title: string; icon: any; assets: AssetData[]; showExtra?: boolean;
  }) => {
    const filtered = filterAssets(assets);
    if (filtered.length === 0 && assets.length === 0) {
      return (
        <div className="p-4 text-center text-xs text-zinc-600">
          {openbbConnected ? 'Loading...' : 'Connect OpenBB to see data'}
        </div>
      );
    }
    return (
      <div>
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Icon className="w-3.5 h-3.5" />
            {title}
            <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-500">{filtered.length}</Badge>
          </div>
        </div>
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider border-b border-white/[0.04]">
          <div className="w-3.5" />
          <div>Symbol</div>
          <div className="text-right">Price</div>
          <div className="text-right">Chg</div>
          <div className="text-right">%</div>
          <div className="text-right">Vol/MCap</div>
        </div>
        {filtered.map(a => <AssetRow key={a.symbol} asset={a} />)}
      </div>
    );
  };

  // ===== Overview Tab =====
  const OverviewContent = () => {
    const allAssets = [...getMergedEquities(), ...cryptos, ...forex, ...commodities, ...indices, ...etfs];
    const starredAssets = allAssets.filter(a => starred.has(a.symbol));
    const topGainers = [...allAssets].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const topLosers = [...allAssets].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    return (
      <ScrollArea className="flex-1">
        {/* Status bar */}
        <div className="p-3 flex items-center gap-3 border-b border-white/[0.06]">
          <div className={`flex items-center gap-1.5 text-xs ${openbbConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
            <Database className="w-3.5 h-3.5" />
            <span>OpenBB {openbbConnected ? 'Connected' : 'Offline'}</span>
          </div>
          {fearGreed !== null && (
            <div className="flex items-center gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className={fearGreed > 60 ? 'text-emerald-400' : fearGreed < 40 ? 'text-red-400' : 'text-amber-400'}>
                Fear & Greed: {fearGreed}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Zap className="w-3.5 h-3.5" />
            <span>{allAssets.length} assets</span>
          </div>
        </div>

        {/* Starred */}
        {starredAssets.length > 0 && (
          <AssetSection title="Watchlist" icon={Star} assets={starredAssets} />
        )}

        {/* Top Movers */}
        {topGainers.length > 0 && (
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">🔥 Top Movers</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] text-emerald-500 mb-1">GAINERS</div>
                {topGainers.map(a => (
                  <div key={a.symbol} className="flex justify-between text-xs py-0.5">
                    <span className="text-zinc-300 font-medium">{a.symbol}</span>
                    <span className="text-emerald-400 font-mono">{fmtPct(a.changePercent)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[9px] text-red-500 mb-1">LOSERS</div>
                {topLosers.map(a => (
                  <div key={a.symbol} className="flex justify-between text-xs py-0.5">
                    <span className="text-zinc-300 font-medium">{a.symbol}</span>
                    <span className="text-red-400 font-mono">{fmtPct(a.changePercent)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All categories preview */}
        <AssetSection title="Equities" icon={BarChart3} assets={filterAssets(getMergedEquities()).slice(0, 8)} />
        <AssetSection title="Crypto" icon={Bitcoin} assets={filterAssets(cryptos).slice(0, 5)} />
        <AssetSection title="Forex" icon={DollarSign} assets={filterAssets(forex).slice(0, 5)} />
        <AssetSection title="Indices" icon={Globe} assets={filterAssets(indices).slice(0, 5)} />

        {/* Economic Calendar */}
        {economicEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <Landmark className="w-3.5 h-3.5" />
              Economic Calendar
              <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-500">{economicEvents.length}</Badge>
            </div>
            {economicEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="px-3 py-1.5 border-b border-white/[0.04] text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-300 font-medium truncate flex-1">{ev.event}</span>
                  <span className="text-zinc-600 ml-2">{ev.country}</span>
                </div>
                <div className="flex gap-3 text-[10px] text-zinc-500 mt-0.5">
                  {ev.actual && <span>Act: <span className="text-zinc-300">{ev.actual}</span></span>}
                  {ev.forecast && <span>Fcst: {ev.forecast}</span>}
                  {ev.previous && <span>Prev: {ev.previous}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fallback data (always show if available) */}
        {fallbackData.length > 0 && (
          <AssetSection 
            title="Live Feed (Proxy)" 
            icon={Shield} 
            assets={fallbackData.map(d => ({
              symbol: d.symbol, price: d.price, change: d.change,
              changePercent: d.changePercent, volume: d.volume,
              high: d.high, low: d.low, open: d.open, bid: d.bid, ask: d.ask,
              source: d.source || 'proxy', category: 'equity' as const,
            }))} 
          />
        )}
      </ScrollArea>
    );
  };

  // ===== Render =====
  if (loading) {
    return (
      <div className="h-full bg-zinc-950 border border-white/[0.06] rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading market data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-950 border border-white/[0.06] rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-100">REAL MARKET DATA</span>
          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${openbbConnected ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}>
            {openbbConnected ? '● OpenBB' : '○ Proxy'}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {lastUpdate && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbols..."
            className="h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 pl-7 placeholder:text-zinc-700"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start gap-0 px-1 py-1 bg-transparent border-b border-white/[0.06] rounded-none overflow-x-auto flex-shrink-0">
          {CATEGORIES.map(cat => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="text-[10px] px-2 py-1 h-6 rounded data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 hover:text-zinc-400 gap-1"
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="flex-1 m-0 overflow-hidden">
          <OverviewContent />
        </TabsContent>
        <TabsContent value="equity" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AssetSection title="Equities" icon={BarChart3} assets={getMergedEquities()} showExtra />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="crypto" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AssetSection title="Crypto" icon={Bitcoin} assets={cryptos} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="forex" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AssetSection title="Forex" icon={DollarSign} assets={forex} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="commodity" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AssetSection title="Commodities" icon={Fuel} assets={commodities} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="index" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AssetSection title="Indices" icon={Globe} assets={indices} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="etf" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AssetSection title="ETFs" icon={Layers} assets={etfs} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="economy" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <Landmark className="w-3.5 h-3.5" />
                Economic Calendar
              </div>
              {economicEvents.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-600">
                  {openbbConnected ? 'No events' : 'Connect OpenBB for economic data'}
                </div>
              ) : (
                economicEvents.map((ev, i) => (
                  <div key={i} className="px-3 py-2 border-b border-white/[0.04]">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-200 font-medium">{ev.event}</div>
                        <div className="text-[10px] text-zinc-500">{ev.date} · {ev.country}</div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] h-4 ml-2 ${
                        ev.impact === 'high' ? 'border-red-500/30 text-red-400' :
                        ev.impact === 'medium' ? 'border-amber-500/30 text-amber-400' :
                        'border-zinc-700 text-zinc-500'
                      }`}>
                        {ev.impact}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-[10px]">
                      {ev.actual && <span className="text-zinc-400">Actual: <span className="text-zinc-200 font-medium">{ev.actual}</span></span>}
                      {ev.forecast && <span className="text-zinc-500">Forecast: {ev.forecast}</span>}
                      {ev.previous && <span className="text-zinc-600">Previous: {ev.previous}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealMarketData;
