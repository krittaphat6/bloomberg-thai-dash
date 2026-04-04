import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PolygonService, PolygonTicker, PolygonNews } from '@/services/PolygonService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, RotateCcw, TrendingUp, TrendingDown, BarChart3, Grid3X3,
  Star, StarOff, Loader2, Activity, Zap, Globe, ArrowUpRight, ArrowDownRight,
  ChevronRight, X, ExternalLink, Newspaper, Brain
} from 'lucide-react';

// ============ TYPES ============
type ViewMode = 'LIST' | 'MOVERS' | 'HEATMAP' | 'TICKER' | 'NEWS';
type DataStatus = 'LIVE' | 'POLLING' | 'OFFLINE';
type SortField = 'ticker' | 'price' | 'changePercent' | 'volume';
type SortDir = 'asc' | 'desc';

interface StockDetail {
  ticker: string;
  name: string;
  description?: string;
  market_cap?: number;
  sic_description?: string;
  homepage_url?: string;
  total_employees?: number;
  list_date?: string;
}

// ============ CONSTANTS ============
const SECTORS = ['All', 'Tech', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrial', 'Utilities', 'Materials', 'Real Estate'];

const SECTOR_MAP: Record<string, string[]> = {
  Tech: ['AAPL','MSFT','GOOGL','GOOG','META','NVDA','AVGO','ADBE','CRM','AMD','INTC','ORCL','CSCO','QCOM','TXN','NOW','SHOP','SQ','PLTR','SNOW','NET','CRWD','DDOG','MDB','ZS','PANW'],
  Finance: ['JPM','BAC','WFC','GS','MS','C','BLK','SCHW','AXP','USB','PNC','TFC','COF','FIS','FISV','ICE','CME','MCO','SPGI','MMC'],
  Healthcare: ['UNH','JNJ','LLY','PFE','ABBV','MRK','TMO','ABT','DHR','BMY','AMGN','MDT','ISRG','GILD','CVS','ELV','CI','HCA','REGN','VRTX'],
  Energy: ['XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','PXD','OXY','HAL','DVN','HES','FANG','BKR','CTRA','MRO','APA','OVV','EQT'],
  Consumer: ['AMZN','TSLA','WMT','HD','MCD','NKE','SBUX','TGT','LOW','COST','PG','KO','PEP','PM','MDLZ','CL','EL','GIS','K','SJM'],
  Industrial: ['CAT','DE','BA','HON','UPS','RTX','LMT','GE','MMM','EMR','ETN','PH','ROK','CMI','FDX','WAB','GD','NOC','TT','IR'],
  Utilities: ['NEE','SO','DUK','D','AEP','EXC','XEL','WEC','ES','ED','AWK','ATO','CMS','AES','PNW','EVRG','OGE','NI','POR','DTE'],
  Materials: ['LIN','APD','SHW','ECL','NEM','FCX','NUE','DOW','VMC','MLM','CF','PPG','DD','ALB','IFF','EMN','BALL','IP','AVY','PKG'],
  'Real Estate': ['PLD','AMT','EQIX','CCI','SPG','O','PSA','WELL','DLR','AVB','EQR','VTR','ARE','MAA','ESS','UDR','KIM','REG','HST','PEAK'],
};

// ============ SUB-COMPONENTS ============
const StatCard = ({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) => (
  <div className="px-4 py-2.5 border-r border-border last:border-r-0">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[9px] tracking-widest text-muted-foreground font-medium">{label}</span>
    </div>
    <span className={`text-sm font-bold ${color} font-mono`}>{value}</span>
  </div>
);

const StatusBadge = ({ status }: { status: DataStatus }) => {
  const colors = { LIVE: 'bg-green-500', POLLING: 'bg-yellow-500', OFFLINE: 'bg-red-500' };
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border bg-card">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-[9px] font-bold tracking-wider">{status}</span>
    </div>
  );
};

// ============ HEATMAP ============
const StockHeatmap = ({ stocks, onSelect }: { stocks: PolygonTicker[]; onSelect: (t: PolygonTicker) => void }) => {
  const sorted = useMemo(() => [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 120), [stocks]);
  const getColor = (pct: number) => {
    if (pct >= 3) return 'bg-green-500';
    if (pct >= 1.5) return 'bg-green-600';
    if (pct >= 0.5) return 'bg-green-700';
    if (pct >= 0) return 'bg-green-900/60';
    if (pct >= -0.5) return 'bg-red-900/60';
    if (pct >= -1.5) return 'bg-red-700';
    if (pct >= -3) return 'bg-red-600';
    return 'bg-red-500';
  };
  return (
    <div className="grid grid-cols-10 gap-0.5 p-2 h-full auto-rows-fr">
      {sorted.map(s => (
        <button key={s.ticker} onClick={() => onSelect(s)}
          className={`${getColor(s.changePercent)} rounded-sm p-1 flex flex-col items-center justify-center hover:ring-1 hover:ring-white/30 transition-all min-h-[48px]`}>
          <span className="text-[9px] font-bold text-white truncate w-full text-center">{s.ticker}</span>
          <span className={`text-[8px] font-mono ${s.changePercent >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%
          </span>
        </button>
      ))}
    </div>
  );
};

// ============ TICKER TAPE ============
const TickerTape = ({ stocks }: { stocks: PolygonTicker[] }) => {
  const movers = useMemo(() => [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 30), [stocks]);
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-card/50 overflow-x-auto scrollbar-hide">
      {movers.map(s => (
        <div key={s.ticker} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold">{s.ticker}</span>
          <span className="text-[10px] font-mono">${PolygonService.formatPrice(s.price)}</span>
          <span className={`text-[9px] font-mono ${s.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {s.changePercent >= 0 ? '▲' : '▼'}{Math.abs(s.changePercent).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
};

// ============ STOCK ROW ============
const StockRow = React.memo(({ stock, starred, onStar, onSelect }: {
  stock: PolygonTicker; starred: boolean; onStar: () => void; onSelect: () => void;
}) => {
  const isUp = stock.changePercent >= 0;
  return (
    <div onClick={onSelect}
      className="flex items-center gap-2 px-3 py-2 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group">
      <button onClick={(e) => { e.stopPropagation(); onStar(); }} className="text-muted-foreground hover:text-yellow-400 transition-colors">
        {starred ? <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-3.5 h-3.5" />}
      </button>
      <div className="w-16"><span className="text-xs font-bold">{stock.ticker}</span></div>
      <div className="flex-1 min-w-0"><span className="text-[10px] text-muted-foreground truncate block">{stock.name}</span></div>
      <div className="w-20 text-right"><span className="text-xs font-mono font-bold">${PolygonService.formatPrice(stock.price)}</span></div>
      <div className={`w-20 text-right flex items-center justify-end gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span className="text-xs font-mono font-bold">{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
      </div>
      <div className="w-20 text-right"><span className="text-[10px] text-muted-foreground font-mono">{PolygonService.formatVolume(stock.volume)}</span></div>
      <div className="w-16 text-right hidden md:block"><span className="text-[10px] text-muted-foreground font-mono">${PolygonService.formatPrice(stock.vwap || 0)}</span></div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
});
StockRow.displayName = 'StockRow';

// ============ DETAIL PANEL ============
const DetailPanel = ({ stock, detail, news, onClose, onAnalyze }: {
  stock: PolygonTicker; detail: StockDetail | null; news: PolygonNews[]; onClose: () => void; onAnalyze: (t: string) => void;
}) => {
  const isUp = stock.changePercent >= 0;
  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{stock.ticker}</span>
            <Badge variant={isUp ? 'default' : 'destructive'} className="text-[10px]">{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{detail?.name || stock.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-2xl font-bold font-mono">${PolygonService.formatPrice(stock.price)}</div>
          <div className={`text-sm font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{stock.change.toFixed(2)} ({isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%)
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border">
          {[['Open', `$${PolygonService.formatPrice(stock.open)}`], ['High', `$${PolygonService.formatPrice(stock.high)}`],
            ['Low', `$${PolygonService.formatPrice(stock.low)}`], ['Prev Close', `$${PolygonService.formatPrice(stock.prevClose)}`],
            ['Volume', PolygonService.formatVolume(stock.volume)], ['VWAP', `$${PolygonService.formatPrice(stock.vwap || 0)}`],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-card px-3 py-2">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
              <div className="text-xs font-mono font-medium">{val}</div>
            </div>
          ))}
        </div>
        {detail && (
          <div className="px-4 py-3 border-t border-border">
            <h3 className="text-xs font-bold mb-2">Company Info</h3>
            {detail.sic_description && <p className="text-[10px] text-muted-foreground mb-1">Industry: {detail.sic_description}</p>}
            {detail.market_cap && <p className="text-[10px] text-muted-foreground mb-1">Market Cap: {PolygonService.formatVolume(detail.market_cap)}</p>}
            {detail.total_employees && <p className="text-[10px] text-muted-foreground mb-1">Employees: {detail.total_employees.toLocaleString()}</p>}
            {detail.description && <p className="text-[10px] text-muted-foreground leading-relaxed mt-2 line-clamp-4">{detail.description}</p>}
            {detail.homepage_url && (
              <a href={detail.homepage_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 flex items-center gap-1 mt-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> {detail.homepage_url}
              </a>
            )}
          </div>
        )}
        <div className="px-4 py-2 border-t border-border">
          <Button size="sm" className="w-full text-xs gap-1.5" onClick={() => onAnalyze(stock.ticker)}>
            <Brain className="w-3.5 h-3.5" /> ABLE AI Analysis
          </Button>
        </div>
        {news.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <h3 className="text-xs font-bold mb-2 flex items-center gap-1"><Newspaper className="w-3.5 h-3.5" /> Related News</h3>
            <div className="space-y-2">
              {news.slice(0, 5).map(n => (
                <a key={n.id} href={n.article_url} target="_blank" rel="noreferrer"
                  className="block p-2 rounded border border-border hover:bg-muted/30 transition-colors">
                  <div className="text-[10px] font-medium leading-snug line-clamp-2">{n.title}</div>
                  <div className="text-[9px] text-muted-foreground mt-1">{new Date(n.published_utc).toLocaleString()}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ MOVERS VIEW ============
const MoversView = ({ gainers, losers, onSelect }: { gainers: PolygonTicker[]; losers: PolygonTicker[]; onSelect: (t: PolygonTicker) => void }) => (
  <div className="flex flex-1 min-h-0">
    <div className="flex-1 border-r border-border flex flex-col">
      <div className="px-3 py-2 border-b border-border bg-green-500/5">
        <span className="text-xs font-bold text-green-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> TOP GAINERS</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {gainers.map((s, i) => (
          <div key={s.ticker} onClick={() => onSelect(s)}
            className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 hover:bg-muted/20 cursor-pointer">
            <span className="text-[9px] text-muted-foreground w-5">{i + 1}</span>
            <span className="text-xs font-bold w-14">{s.ticker}</span>
            <span className="text-xs font-mono flex-1">${PolygonService.formatPrice(s.price)}</span>
            <span className="text-xs font-mono text-green-400 font-bold">+{s.changePercent.toFixed(2)}%</span>
            <span className="text-[9px] text-muted-foreground">{PolygonService.formatVolume(s.volume)}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="px-3 py-2 border-b border-border bg-red-500/5">
        <span className="text-xs font-bold text-red-400 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> TOP LOSERS</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {losers.map((s, i) => (
          <div key={s.ticker} onClick={() => onSelect(s)}
            className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 hover:bg-muted/20 cursor-pointer">
            <span className="text-[9px] text-muted-foreground w-5">{i + 1}</span>
            <span className="text-xs font-bold w-14">{s.ticker}</span>
            <span className="text-xs font-mono flex-1">${PolygonService.formatPrice(s.price)}</span>
            <span className="text-xs font-mono text-red-400 font-bold">{s.changePercent.toFixed(2)}%</span>
            <span className="text-[9px] text-muted-foreground">{PolygonService.formatVolume(s.volume)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============ NEWS VIEW ============
const NewsView = ({ news }: { news: PolygonNews[] }) => (
  <div className="flex-1 overflow-y-auto p-3 space-y-2">
    {news.map(n => (
      <a key={n.id} href={n.article_url} target="_blank" rel="noreferrer"
        className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
        {n.image_url && <img src={n.image_url} alt="" className="w-20 h-14 object-cover rounded shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium leading-snug line-clamp-2">{n.title}</div>
          {n.description && <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{n.description}</div>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-muted-foreground">{n.author}</span>
            <span className="text-[9px] text-muted-foreground">{new Date(n.published_utc).toLocaleString()}</span>
            {n.tickers.length > 0 && (
              <div className="flex gap-1">{n.tickers.slice(0, 3).map(t => (
                <Badge key={t} variant="outline" className="text-[8px] px-1 py-0">{t}</Badge>
              ))}</div>
            )}
          </div>
        </div>
      </a>
    ))}
  </div>
);

// ============ MAIN COMPONENT ============
const RealMarketData: React.FC = () => {
  const [stocks, setStocks] = useState<PolygonTicker[]>([]);
  const [gainers, setGainers] = useState<PolygonTicker[]>([]);
  const [losers, setLosers] = useState<PolygonTicker[]>([]);
  const [news, setNews] = useState<PolygonNews[]>([]);
  const [detailNews, setDetailNews] = useState<PolygonNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DataStatus>('OFFLINE');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [activeSector, setActiveSector] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [starred, setStarred] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('polygon_starred') || '[]')); } catch { return new Set(); }
  });
  const [selectedStock, setSelectedStock] = useState<PolygonTicker | null>(null);
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null);
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('polygon_starred', JSON.stringify([...starred]));
  }, [starred]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [snapshotData, gainData, loseData, newsData, mktStatus] = await Promise.all([
        PolygonService.getAllSnapshots().catch(() => []),
        PolygonService.getGainers().catch(() => []),
        PolygonService.getLosers().catch(() => []),
        PolygonService.getNews(undefined, 30).catch(() => []),
        PolygonService.getMarketStatus().catch(() => null),
      ]);
      if (snapshotData.length > 0) { setStocks(snapshotData); setStatus('LIVE'); }
      if (gainData.length > 0) setGainers(gainData);
      if (loseData.length > 0) setLosers(loseData);
      if (newsData.length > 0) setNews(newsData);
      if (mktStatus) setMarketStatus(mktStatus);
    } catch (err) {
      console.error('Polygon fetch error:', err);
      setStatus('OFFLINE');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    refreshTimer.current = setInterval(() => fetchData(true), 60_000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [fetchData]);

  const handleSelectStock = useCallback(async (stock: PolygonTicker) => {
    setSelectedStock(stock);
    setStockDetail(null);
    setDetailNews([]);
    const [det, nws] = await Promise.all([
      PolygonService.getTickerDetails(stock.ticker).catch(() => null),
      PolygonService.getNews(stock.ticker, 10).catch(() => []),
    ]);
    if (det) setStockDetail(det);
    setDetailNews(nws);
  }, []);

  const toggleStar = useCallback((ticker: string) => {
    setStarred(prev => { const next = new Set(prev); next.has(ticker) ? next.delete(ticker) : next.add(ticker); return next; });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }, [sortField]);

  const handleAnalyze = useCallback((ticker: string) => {
    window.dispatchEvent(new CustomEvent('able-ai-query', {
      detail: { query: `Analyze ${ticker} stock - comprehensive analysis including technicals, fundamentals, news sentiment, and trading recommendation`, source: 'RealMarketData' }
    }));
  }, []);

  const displayStocks = useMemo(() => {
    let filtered = stocks;
    if (activeSector !== 'All') {
      const tickers = new Set(SECTOR_MAP[activeSector] || []);
      filtered = filtered.filter(s => tickers.has(s.ticker));
    }
    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      filtered = filtered.filter(s => s.ticker.includes(q) || s.name.toUpperCase().includes(q));
    }
    filtered = [...filtered].sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case 'ticker': return sortDir === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        case 'price': va = a.price; vb = b.price; break;
        case 'changePercent': va = a.changePercent; vb = b.changePercent; break;
        case 'volume': va = a.volume; vb = b.volume; break;
        default: va = 0; vb = 0;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    const starredItems = filtered.filter(s => starred.has(s.ticker));
    const rest = filtered.filter(s => !starred.has(s.ticker));
    return [...starredItems, ...rest];
  }, [stocks, activeSector, searchQuery, sortField, sortDir, starred]);

  const totalVolume = useMemo(() => stocks.reduce((s, t) => s + t.volume, 0), [stocks]);
  const avgChange = useMemo(() => stocks.length === 0 ? 0 : stocks.reduce((s, t) => s + t.changePercent, 0) / stocks.length, [stocks]);
  const advDecl = useMemo(() => { const adv = stocks.filter(s => s.changePercent > 0).length; return { adv, decl: stocks.length - adv }; }, [stocks]);

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-border bg-card">
        <div className="flex items-center gap-1 px-3">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-xs font-bold tracking-wider">US MARKET</span>
          {marketStatus?.market === 'open' && <Badge variant="outline" className="text-[8px] text-green-400 border-green-400/30">OPEN</Badge>}
        </div>
        <div className="flex-1 flex overflow-x-auto">
          {(['LIST', 'MOVERS', 'HEATMAP', 'TICKER', 'NEWS'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-2.5 text-[11px] font-bold tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                viewMode === mode ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {mode === 'LIST' ? '☰ Stocks' : mode === 'MOVERS' ? '📊 Movers' : mode === 'HEATMAP' ? '🗺 Heatmap' : mode === 'TICKER' ? '⚡ Ticker' : '📰 News'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 shrink-0">
          <StatusBadge status={status} />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ticker..." className="h-7 w-36 text-[10px] bg-background border-border" />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => fetchData()}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-0 border-b border-border">
        <StatCard label="TOTAL TICKERS" value={stocks.length.toLocaleString()} color="text-primary" icon={<Globe className="w-3 h-3 text-primary" />} />
        <StatCard label="TOTAL VOLUME" value={PolygonService.formatVolume(totalVolume)} color="text-green-400" icon={<BarChart3 className="w-3 h-3 text-green-400" />} />
        <StatCard label="AVG CHANGE" value={`${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`} color={avgChange >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatCard label="ADVANCE" value={advDecl.adv.toString()} color="text-green-400" icon={<TrendingUp className="w-3 h-3 text-green-400" />} />
        <StatCard label="DECLINE" value={advDecl.decl.toString()} color="text-red-400" icon={<TrendingDown className="w-3 h-3 text-red-400" />} />
      </div>

      {stocks.length > 0 && <TickerTape stocks={stocks} />}

      {/* Sectors */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-border bg-card/50 overflow-x-auto scrollbar-hide">
        {SECTORS.map(sector => (
          <button key={sector} onClick={() => setActiveSector(sector)}
            className={`px-2.5 py-1 text-[10px] border rounded transition-colors whitespace-nowrap ${
              activeSector === sector ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            {sector}{sector !== 'All' && <span className="text-[8px] opacity-60 ml-1">({SECTOR_MAP[sector]?.length || 0})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading Polygon.io market data...</span>
          </div>
        ) : viewMode === 'HEATMAP' ? (
          <div className="flex-1 min-h-0 overflow-hidden"><StockHeatmap stocks={displayStocks} onSelect={handleSelectStock} /></div>
        ) : viewMode === 'MOVERS' ? (
          <MoversView gainers={gainers} losers={losers} onSelect={handleSelectStock} />
        ) : viewMode === 'NEWS' ? (
          <NewsView news={news} />
        ) : viewMode === 'TICKER' ? (
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-3 gap-2">
              {displayStocks.slice(0, 60).map(s => {
                const isUp = s.changePercent >= 0;
                return (
                  <div key={s.ticker} onClick={() => handleSelectStock(s)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:ring-1 hover:ring-primary/30 ${
                      isUp ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{s.ticker}</span>
                      <Badge variant={isUp ? 'default' : 'destructive'} className="text-[8px] px-1.5">{isUp ? '+' : ''}{s.changePercent.toFixed(1)}%</Badge>
                    </div>
                    <div className="text-sm font-mono font-bold mt-0.5">${PolygonService.formatPrice(s.price)}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Vol: {PolygonService.formatVolume(s.volume)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="w-7" />
              <button className="w-16 text-left hover:text-foreground" onClick={() => handleSort('ticker')}>Ticker {sortField === 'ticker' && (sortDir === 'asc' ? '↑' : '↓')}</button>
              <div className="flex-1">Name</div>
              <button className="w-20 text-right hover:text-foreground" onClick={() => handleSort('price')}>Price {sortField === 'price' && (sortDir === 'asc' ? '↑' : '↓')}</button>
              <button className="w-20 text-right hover:text-foreground" onClick={() => handleSort('changePercent')}>Change {sortField === 'changePercent' && (sortDir === 'asc' ? '↑' : '↓')}</button>
              <button className="w-20 text-right hover:text-foreground" onClick={() => handleSort('volume')}>Volume {sortField === 'volume' && (sortDir === 'asc' ? '↑' : '↓')}</button>
              <div className="w-16 text-right hidden md:block">VWAP</div>
              <div className="w-4" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {displayStocks.map(stock => (
                <StockRow key={stock.ticker} stock={stock} starred={starred.has(stock.ticker)}
                  onStar={() => toggleStar(stock.ticker)} onSelect={() => handleSelectStock(stock)} />
              ))}
              {displayStocks.length === 0 && <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No stocks found</div>}
            </div>
          </div>
        )}
        {selectedStock && <DetailPanel stock={selectedStock} detail={stockDetail} news={detailNews} onClose={() => setSelectedStock(null)} onAnalyze={handleAnalyze} />}
      </div>
    </div>
  );
};

export default RealMarketData;
