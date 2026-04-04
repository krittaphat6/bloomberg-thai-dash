import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  RefreshCw, TrendingUp, TrendingDown, Activity,
  BarChart3, Globe, DollarSign, Landmark, Bitcoin, Fuel,
  Search, Star, StarOff, ArrowUpRight, ArrowDownRight, Minus,
  Layers, Database, Zap, Shield, Wifi, WifiOff
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
  ma50?: number;
  ma200?: number;
  source: string;
  category: 'equity' | 'crypto' | 'forex' | 'commodity' | 'index' | 'etf' | 'bond';
  starred?: boolean;
}

// ===== Seed data (always available) =====
const SEED_DATA: AssetData[] = [
  // Equities
  { symbol: 'AAPL', name: 'Apple Inc.', price: 255.92, change: 0.29, changePercent: 0.11, volume: 31289400, high: 256.13, low: 250.65, source: 'seed', category: 'equity' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 441.83, change: -2.17, changePercent: -0.49, volume: 21345600, high: 445.20, low: 440.10, source: 'seed', category: 'equity' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 173.68, change: -0.95, changePercent: -0.54, volume: 22800100, high: 175.90, low: 172.05, source: 'seed', category: 'equity' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 205.74, change: 1.32, changePercent: 0.65, volume: 35600700, high: 207.10, low: 203.50, source: 'seed', category: 'equity' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 118.06, change: -1.78, changePercent: -1.49, volume: 45200300, high: 121.50, low: 117.20, source: 'seed', category: 'equity' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 268.45, change: 5.12, changePercent: 1.94, volume: 52300100, high: 272.80, low: 262.30, source: 'seed', category: 'equity' },
  { symbol: 'META', name: 'Meta Platforms', price: 597.21, change: -3.45, changePercent: -0.57, volume: 15600200, high: 602.30, low: 594.10, source: 'seed', category: 'equity' },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 245.30, change: 1.20, changePercent: 0.49, volume: 8500300, high: 246.80, low: 243.10, source: 'seed', category: 'equity' },
  { symbol: 'V', name: 'Visa Inc.', price: 335.10, change: -0.85, changePercent: -0.25, volume: 5400200, high: 337.50, low: 333.20, source: 'seed', category: 'equity' },
  { symbol: 'WMT', name: 'Walmart Inc.', price: 92.45, change: 0.67, changePercent: 0.73, volume: 12300400, high: 93.10, low: 91.50, source: 'seed', category: 'equity' },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin', price: 67164.78, change: 301.45, changePercent: 0.45, volume: 8701, source: 'seed', category: 'crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum', price: 2052.90, change: -6.06, changePercent: -0.30, volume: 90546, source: 'seed', category: 'crypto' },
  { symbol: 'BNBUSD', name: 'BNB', price: 608.30, change: 3.20, changePercent: 0.53, volume: 12340, source: 'seed', category: 'crypto' },
  { symbol: 'SOLUSD', name: 'Solana', price: 142.50, change: -1.85, changePercent: -1.28, volume: 34200, source: 'seed', category: 'crypto' },
  { symbol: 'XRPUSD', name: 'Ripple', price: 0.5234, change: 0.0089, changePercent: 1.73, volume: 125000, source: 'seed', category: 'crypto' },
  { symbol: 'ADAUSD', name: 'Cardano', price: 0.4521, change: -0.0045, changePercent: -0.99, volume: 89000, source: 'seed', category: 'crypto' },
  // Forex
  { symbol: 'EURUSD', name: 'EUR/USD', price: 1.0842, change: 0.0012, changePercent: 0.11, source: 'seed', category: 'forex' },
  { symbol: 'GBPUSD', name: 'GBP/USD', price: 1.2634, change: -0.0018, changePercent: -0.14, source: 'seed', category: 'forex' },
  { symbol: 'USDJPY', name: 'USD/JPY', price: 151.42, change: 0.35, changePercent: 0.23, source: 'seed', category: 'forex' },
  { symbol: 'AUDUSD', name: 'AUD/USD', price: 0.6534, change: -0.0008, changePercent: -0.12, source: 'seed', category: 'forex' },
  { symbol: 'USDCHF', name: 'USD/CHF', price: 0.8845, change: 0.0015, changePercent: 0.17, source: 'seed', category: 'forex' },
  { symbol: 'USDCAD', name: 'USD/CAD', price: 1.3612, change: -0.0023, changePercent: -0.17, source: 'seed', category: 'forex' },
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold', price: 2345.60, change: 12.40, changePercent: 0.53, source: 'seed', category: 'commodity' },
  { symbol: 'XAGUSD', name: 'Silver', price: 27.85, change: -0.15, changePercent: -0.54, source: 'seed', category: 'commodity' },
  { symbol: 'USOIL', name: 'Crude Oil WTI', price: 78.42, change: 0.85, changePercent: 1.10, source: 'seed', category: 'commodity' },
  { symbol: 'NG=F', name: 'Natural Gas', price: 2.134, change: -0.045, changePercent: -2.07, source: 'seed', category: 'commodity' },
  // Indices
  { symbol: 'SPY', name: 'S&P 500 ETF', price: 568.30, change: 2.45, changePercent: 0.43, volume: 45200000, source: 'seed', category: 'index' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', price: 487.20, change: -1.30, changePercent: -0.27, volume: 32100000, source: 'seed', category: 'index' },
  { symbol: 'DIA', name: 'Dow Jones ETF', price: 412.50, change: 1.80, changePercent: 0.44, volume: 3200000, source: 'seed', category: 'index' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', price: 210.35, change: -0.95, changePercent: -0.45, volume: 18500000, source: 'seed', category: 'index' },
  { symbol: 'VIX', name: 'Volatility Index', price: 14.85, change: -0.32, changePercent: -2.11, source: 'seed', category: 'index' },
  // ETFs
  { symbol: 'GLD', name: 'SPDR Gold', price: 218.45, change: 1.20, changePercent: 0.55, volume: 8900000, source: 'seed', category: 'etf' },
  { symbol: 'SLV', name: 'iShares Silver', price: 25.60, change: -0.15, changePercent: -0.58, volume: 12300000, source: 'seed', category: 'etf' },
  { symbol: 'TLT', name: 'iShares 20+ Treasury', price: 92.30, change: 0.45, changePercent: 0.49, volume: 15600000, source: 'seed', category: 'etf' },
  { symbol: 'ARKK', name: 'ARK Innovation', price: 48.20, change: -0.65, changePercent: -1.33, volume: 6700000, source: 'seed', category: 'etf' },
  { symbol: 'XLF', name: 'Financial Select', price: 43.80, change: 0.30, changePercent: 0.69, volume: 25400000, source: 'seed', category: 'etf' },
];

// Symbols to fetch from proxy
const PROXY_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'SPY', 'QQQ', 'GLD', 'USOIL', 'VIX'];

const CATEGORIES = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'equity', label: 'Equities', icon: BarChart3 },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'forex', label: 'Forex', icon: DollarSign },
  { id: 'commodity', label: 'Commodities', icon: Fuel },
  { id: 'index', label: 'Indices', icon: Globe },
  { id: 'etf', label: 'ETFs', icon: Layers },
] as const;

// ===== Component =====
const RealMarketData = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [starred, setStarred] = useState<Set<string>>(new Set(['AAPL', 'BTCUSD', 'XAUUSD']));
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assets, setAssets] = useState<AssetData[]>(SEED_DATA);
  const [loading, setLoading] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<'connected' | 'offline' | 'loading'>('loading');
  const fetchRef = useRef(false);

  const toggleStar = (symbol: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol); else next.add(symbol);
      return next;
    });
  };

  // Fetch from market-data-proxy edge function
  const fetchFromProxy = useCallback(async () => {
    if (fetchRef.current) return;
    fetchRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-data-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ symbols: PROXY_SYMBOLS }),
        }
      );

      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const json = await res.json();

      if (json.data && typeof json.data === 'object') {
        setAssets(prev => {
          const updated = [...prev];
          Object.entries(json.data).forEach(([sym, raw]: [string, any]) => {
            if (!raw || !raw.price) return;
            const idx = updated.findIndex(a => a.symbol === sym);
            const mapped: AssetData = {
              symbol: sym,
              name: updated.find(a => a.symbol === sym)?.name || sym,
              price: raw.price,
              change: raw.previousClose ? raw.price - raw.previousClose : (raw.change24h ? raw.price * raw.change24h / 100 : 0),
              changePercent: raw.change24h || 0,
              volume: raw.volume || raw.quoteVolume || 0,
              high: raw.high || 0,
              low: raw.low || 0,
              rsi: raw.rsi14,
              ma50: raw.ma50,
              ma200: raw.ma200,
              source: 'live',
              category: updated.find(a => a.symbol === sym)?.category || 'equity',
            };
            if (idx >= 0) updated[idx] = { ...updated[idx], ...mapped };
            else updated.push(mapped);
          });
          return updated;
        });
        setProxyStatus('connected');
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.warn('Proxy fetch error:', err);
      setProxyStatus('offline');
    } finally {
      fetchRef.current = false;
    }
  }, []);

  // Initial load + interval
  useEffect(() => {
    setLoading(true);
    fetchFromProxy().finally(() => setLoading(false));
    const interval = setInterval(fetchFromProxy, 60000);
    return () => clearInterval(interval);
  }, [fetchFromProxy]);

  // Supabase realtime
  useEffect(() => {
    const channel = supabase
      .channel('market-data-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_data' }, (payload) => {
        const n = payload.new as any;
        setAssets(prev => {
          const idx = prev.findIndex(a => a.symbol === n.symbol);
          const mapped: AssetData = {
            symbol: n.symbol,
            price: parseFloat(n.price),
            change: parseFloat(n.change || '0'),
            changePercent: parseFloat(n.change_percent || '0'),
            volume: n.volume,
            high: parseFloat(n.high || '0'),
            low: parseFloat(n.low || '0'),
            source: 'realtime',
            category: prev.find(a => a.symbol === n.symbol)?.category || 'equity',
          };
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...mapped };
            return updated;
          }
          return [...prev, mapped];
        });
        setLastUpdate(new Date());
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFromProxy();
    setIsRefreshing(false);
  };

  // ===== Helpers =====
  const fmtPrice = (p: number) => {
    if (p >= 10000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };
  const fmtChange = (c: number) => (c > 0 ? '+' : '') + (Math.abs(c) >= 1 ? c.toFixed(2) : c.toFixed(4));
  const fmtPct = (p: number) => (p > 0 ? '+' : '') + p.toFixed(2) + '%';
  const fmtVol = (v: number) => {
    if (!v) return '-';
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toString();
  };

  const changeColor = (c: number) =>
    c > 0 ? 'text-emerald-400' : c < 0 ? 'text-red-400' : 'text-zinc-400';
  const changeBg = (c: number) =>
    c > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : c < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-800 border-zinc-700';

  // Filters
  const byCategory = (cat: string) => assets.filter(a => a.category === cat);
  const filterAssets = (list: AssetData[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(a => a.symbol.toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q));
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
        {asset.volume ? fmtVol(asset.volume) : '-'}
      </div>
    </div>
  );

  // ===== Section =====
  const AssetSection = ({ title, icon: Icon, data }: { title: string; icon: any; data: AssetData[] }) => {
    const filtered = filterAssets(data);
    return (
      <div>
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Icon className="w-3.5 h-3.5" />
            {title}
            <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-500">{filtered.length}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider border-b border-white/[0.04]">
          <div className="w-3.5" />
          <div>Symbol</div>
          <div className="text-right">Price</div>
          <div className="text-right">Chg</div>
          <div className="text-right">%</div>
          <div className="text-right">Vol</div>
        </div>
        {filtered.length > 0 ? (
          filtered.map(a => <AssetRow key={a.symbol} asset={a} />)
        ) : (
          <div className="p-4 text-center text-xs text-zinc-600">No data</div>
        )}
      </div>
    );
  };

  // ===== Overview =====
  const OverviewContent = () => {
    const starredAssets = assets.filter(a => starred.has(a.symbol));
    const sorted = [...assets].filter(a => a.changePercent !== 0);
    const topGainers = sorted.sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const topLosers = [...assets].filter(a => a.changePercent !== 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    return (
      <ScrollArea className="flex-1">
        {/* Status */}
        <div className="p-3 flex items-center gap-3 border-b border-white/[0.06]">
          <div className={`flex items-center gap-1.5 text-xs ${proxyStatus === 'connected' ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {proxyStatus === 'connected' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{proxyStatus === 'connected' ? 'Live Data' : proxyStatus === 'loading' ? 'Connecting...' : 'Using Cached Data'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Zap className="w-3.5 h-3.5" />
            <span>{assets.length} assets</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Database className="w-3.5 h-3.5" />
            <span>{assets.filter(a => a.source === 'live').length} live</span>
          </div>
        </div>

        {/* Watchlist */}
        {starredAssets.length > 0 && (
          <AssetSection title="⭐ Watchlist" icon={Star} data={starredAssets} />
        )}

        {/* Top Movers */}
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">🔥 Top Movers</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-emerald-500 font-bold mb-1">▲ GAINERS</div>
              {topGainers.map(a => (
                <div key={a.symbol} className="flex justify-between text-xs py-0.5">
                  <span className="text-zinc-300 font-medium">{a.symbol}</span>
                  <span className="text-emerald-400 font-mono">{fmtPct(a.changePercent)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] text-red-500 font-bold mb-1">▼ LOSERS</div>
              {topLosers.map(a => (
                <div key={a.symbol} className="flex justify-between text-xs py-0.5">
                  <span className="text-zinc-300 font-medium">{a.symbol}</span>
                  <span className="text-red-400 font-mono">{fmtPct(a.changePercent)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category previews */}
        <AssetSection title="Equities" icon={BarChart3} data={filterAssets(byCategory('equity')).slice(0, 8)} />
        <AssetSection title="Crypto" icon={Bitcoin} data={filterAssets(byCategory('crypto')).slice(0, 6)} />
        <AssetSection title="Forex" icon={DollarSign} data={filterAssets(byCategory('forex')).slice(0, 6)} />
        <AssetSection title="Commodities" icon={Fuel} data={filterAssets(byCategory('commodity'))} />
        <AssetSection title="Indices & ETFs" icon={Globe} data={filterAssets([...byCategory('index'), ...byCategory('etf')]).slice(0, 8)} />
      </ScrollArea>
    );
  };

  // ===== Render =====
  return (
    <div className="h-full bg-zinc-950 border border-white/[0.06] rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-100">REAL MARKET DATA</span>
          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${proxyStatus === 'connected' ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}>
            {proxyStatus === 'connected' ? '● Live' : '○ Cached'}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {lastUpdate && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={isRefreshing} className="h-6 w-6 text-zinc-500 hover:text-zinc-300">
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
          <ScrollArea className="h-full"><AssetSection title="Equities" icon={BarChart3} data={byCategory('equity')} /></ScrollArea>
        </TabsContent>
        <TabsContent value="crypto" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full"><AssetSection title="Crypto" icon={Bitcoin} data={byCategory('crypto')} /></ScrollArea>
        </TabsContent>
        <TabsContent value="forex" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full"><AssetSection title="Forex" icon={DollarSign} data={byCategory('forex')} /></ScrollArea>
        </TabsContent>
        <TabsContent value="commodity" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full"><AssetSection title="Commodities" icon={Fuel} data={byCategory('commodity')} /></ScrollArea>
        </TabsContent>
        <TabsContent value="index" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full"><AssetSection title="Indices" icon={Globe} data={byCategory('index')} /></ScrollArea>
        </TabsContent>
        <TabsContent value="etf" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full"><AssetSection title="ETFs" icon={Layers} data={byCategory('etf')} /></ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealMarketData;
