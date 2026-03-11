import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, ChevronDown, ChevronRight, Building2, X, FileText, Presentation, FileCheck, TrendingUp, TrendingDown, BarChart3, DollarSign, PieChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilingTypeFilter = 'all' | 'annual' | 'quarterly' | 'interim' | 'slides';

interface SymbolSuggestion {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  country: string;
  logo_id: string;
  market_cap?: number;
  sector?: string;
}

interface FilingDocument {
  type: string;
  label: string;
  icon: string;
}

interface FilingItem {
  id: string;
  symbol: string;
  title: string;
  titleTh?: string;
  type: string;
  form?: string;
  date: string;
  quarter?: string;
  year: number;
  documents: FilingDocument[];
  url?: string;
}

interface Financials {
  [key: string]: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (val: any, decimals = 2): string => {
  if (val == null || isNaN(val)) return '—';
  const n = Number(val);
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(decimals) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
};

const formatPercent = (val: any): string => {
  if (val == null || isNaN(val)) return '—';
  return (Number(val) * 100).toFixed(2) + '%';
};

const formatPrice = (val: any): string => {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getExchangeFlag = (exchange: string) => {
  const flags: Record<string, string> = {
    SET: '🇹🇭', BKK: '🇹🇭', TFEX: '🇹🇭',
    NASDAQ: '🇺🇸', NYSE: '🇺🇸', AMEX: '🇺🇸', OTC: '🇺🇸',
    TSE: '🇯🇵', HKEX: '🇭🇰', LSE: '🇬🇧',
    XETR: '🇩🇪', FRA: '🇩🇪', FWB: '🇩🇪', SWB: '🇩🇪', GETTEX: '🇩🇪',
    SSE: '🇨🇳', SZSE: '🇨🇳',
    BSE: '🇮🇳', NSE: '🇮🇳',
    ASX: '🇦🇺', SGX: '🇸🇬',
    BURSA: '🇲🇾', MYX: '🇲🇾',
    KRX: '🇰🇷', TWSE: '🇹🇼',
    IDX: '🇮🇩', PSE: '🇵🇭',
    EURONEXT: '🇪🇺', NEO: '🇨🇦', TSX: '🇨🇦',
    BMFBOVESPA: '🇧🇷',
  };
  return flags[exchange] || '🏳️';
};

// ─── Financial Summary Card ──────────────────────────────────────────────────

const FinancialSummary = ({ financials, symbol }: { financials: Financials; symbol: SymbolSuggestion }) => {
  if (!financials) return null;

  const change = financials['change'];
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;

  const sections = [
    {
      title: 'ราคาและมูลค่า',
      icon: <DollarSign className="w-3.5 h-3.5" />,
      items: [
        { label: 'ราคาปิด', value: formatPrice(financials['close']) },
        { label: 'เปลี่ยนแปลง', value: change != null ? `${change > 0 ? '+' : ''}${Number(change).toFixed(2)}%` : '—', color: isUp ? 'text-green-400' : isDown ? 'text-red-400' : '' },
        { label: 'Market Cap', value: formatNumber(financials['market_cap_basic']) },
        { label: '52W High', value: formatPrice(financials['52w_high']) },
        { label: '52W Low', value: formatPrice(financials['52w_low']) },
      ]
    },
    {
      title: 'อัตราส่วนทางการเงิน',
      icon: <PieChart className="w-3.5 h-3.5" />,
      items: [
        { label: 'P/E (TTM)', value: financials['price_earnings_ttm'] != null ? Number(financials['price_earnings_ttm']).toFixed(2) : '—' },
        { label: 'EPS (TTM)', value: financials['earnings_per_share_basic_ttm'] != null ? Number(financials['earnings_per_share_basic_ttm']).toFixed(2) : '—' },
        { label: 'EPS Diluted', value: financials['earnings_per_share_diluted_ttm'] != null ? Number(financials['earnings_per_share_diluted_ttm']).toFixed(2) : '—' },
        { label: 'Dividend Yield', value: financials['dividends_yield'] != null ? Number(financials['dividends_yield']).toFixed(2) + '%' : '—' },
      ]
    },
    {
      title: 'รายได้และกำไร',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      items: [
        { label: 'Revenue (TTM)', value: formatNumber(financials['revenue_ttm']) },
        { label: 'Net Income (TTM)', value: formatNumber(financials['net_income_ttm']) },
        { label: 'Total Assets', value: formatNumber(financials['total_assets_mrq']) },
        { label: 'Total Debt', value: formatNumber(financials['total_debt_mrq']) },
      ]
    },
    {
      title: 'เทคนิค & ผลตอบแทน',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      items: [
        { label: 'RSI', value: financials['RSI'] != null ? Number(financials['RSI']).toFixed(1) : '—' },
        { label: 'SMA 50', value: formatPrice(financials['SMA50']) },
        { label: 'SMA 200', value: formatPrice(financials['SMA200']) },
        { label: 'สัปดาห์', value: financials['Perf.W'] != null ? formatPercent(financials['Perf.W']) : '—', color: financials['Perf.W'] > 0 ? 'text-green-400' : financials['Perf.W'] < 0 ? 'text-red-400' : '' },
        { label: '1 เดือน', value: financials['Perf.1M'] != null ? formatPercent(financials['Perf.1M']) : '—', color: financials['Perf.1M'] > 0 ? 'text-green-400' : financials['Perf.1M'] < 0 ? 'text-red-400' : '' },
        { label: '3 เดือน', value: financials['Perf.3M'] != null ? formatPercent(financials['Perf.3M']) : '—', color: financials['Perf.3M'] > 0 ? 'text-green-400' : financials['Perf.3M'] < 0 ? 'text-red-400' : '' },
        { label: 'YTD', value: financials['Perf.YTD'] != null ? formatPercent(financials['Perf.YTD']) : '—', color: financials['Perf.YTD'] > 0 ? 'text-green-400' : financials['Perf.YTD'] < 0 ? 'text-red-400' : '' },
        { label: '1 ปี', value: financials['Perf.Y'] != null ? formatPercent(financials['Perf.Y']) : '—', color: financials['Perf.Y'] > 0 ? 'text-green-400' : financials['Perf.Y'] < 0 ? 'text-red-400' : '' },
      ]
    },
  ];

  // AI Recommendation
  const rec = financials['Recommend.All'];
  let recLabel = 'Neutral';
  let recColor = 'text-muted-foreground';
  if (rec != null) {
    if (rec >= 0.5) { recLabel = 'Strong Buy'; recColor = 'text-green-400'; }
    else if (rec >= 0.1) { recLabel = 'Buy'; recColor = 'text-green-400'; }
    else if (rec <= -0.5) { recLabel = 'Strong Sell'; recColor = 'text-red-400'; }
    else if (rec <= -0.1) { recLabel = 'Sell'; recColor = 'text-red-400'; }
  }

  return (
    <div className="border-b border-border">
      {/* Price Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-bold text-foreground">{formatPrice(financials['close'])}</span>
          {change != null && (
            <span className={`text-sm font-mono font-medium ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-muted-foreground'}`}>
              {isUp ? '▲' : isDown ? '▼' : '—'} {Math.abs(change).toFixed(2)}%
            </span>
          )}
        </div>
        <Badge variant="outline" className={`text-[10px] font-mono ${recColor} border-current`}>
          {recLabel}
        </Badge>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-2 gap-0">
        {sections.map((section, si) => (
          <div key={si} className={`p-3 ${si < 2 ? 'border-b border-border/30' : ''} ${si % 2 === 0 ? 'border-r border-border/30' : ''}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-muted-foreground">{section.icon}</span>
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{section.title}</span>
            </div>
            <div className="space-y-1">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">{item.label}</span>
                  <span className={`text-[11px] font-mono font-medium ${(item as any).color || 'text-foreground'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sector & Industry */}
      {(financials['sector'] || financials['industry']) && (
        <div className="px-4 py-2 border-t border-border/30 flex items-center gap-3">
          {financials['sector'] && (
            <Badge variant="outline" className="text-[9px] font-mono">{financials['sector']}</Badge>
          )}
          {financials['industry'] && (
            <span className="text-[10px] font-mono text-muted-foreground">{financials['industry']}</span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ScreenerFilings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSuggestion | null>(null);
  const [filingType, setFilingType] = useState<FilingTypeFilter>('all');
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loadingFilings, setLoadingFilings] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedFiling, setExpandedFiling] = useState<string | null>(null);

  // ─── Symbol Search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim() || selectedSymbol) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const { data, error } = await supabase.functions.invoke('tv-symbol-search', {
          body: { text: searchQuery.trim(), lang: 'en' },
        });
        if (!error && data?.symbols) {
          setSuggestions(data.symbols);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Symbol search error:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedSymbol]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Select symbol ────────────────────────────────────────────────────────

  const handleSelectSymbol = useCallback(async (sym: SymbolSuggestion) => {
    setSelectedSymbol(sym);
    setSearchQuery(`${sym.exchange}:${sym.symbol}`);
    setShowSuggestions(false);
    setSuggestions([]);
    setLoadingFilings(true);
    try {
      const { data, error } = await supabase.functions.invoke('tv-filings', {
        body: { symbol: sym.symbol, exchange: sym.exchange, type: filingType },
      });
      if (!error && data) {
        setFilings(data.filings || []);
        setFinancials(data.financials || null);
        const years: number[] = [...new Set((data.filings || []).map((f: FilingItem) => f.year))] as number[];
        years.sort((a: number, b: number) => b - a);
        setExpandedYears(new Set(years.slice(0, 2)));
      }
    } catch (err) {
      console.error('Filings fetch error:', err);
    } finally {
      setLoadingFilings(false);
    }
  }, [filingType]);

  useEffect(() => {
    if (selectedSymbol) handleSelectSymbol(selectedSymbol);
  }, [filingType]);

  const handleClear = () => {
    setSelectedSymbol(null);
    setSearchQuery('');
    setFilings([]);
    setFinancials(null);
    setSuggestions([]);
    setExpandedFiling(null);
    inputRef.current?.focus();
  };

  // ─── Group filings ────────────────────────────────────────────────────────

  const grouped = filings.reduce<Record<number, FilingItem[]>>((acc, item) => {
    if (!acc[item.year]) acc[item.year] = [];
    acc[item.year].push(item);
    return acc;
  }, {});
  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'annual': return <FileCheck className="w-3.5 h-3.5 text-green-400" />;
      case 'interim': case 'quarterly': return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case 'slides': return <Presentation className="w-3.5 h-3.5 text-amber-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const FILTER_TABS: { value: FilingTypeFilter; label: string }[] = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'annual', label: 'รายงานประจำปี' },
    { value: 'quarterly', label: 'รายงานรายไตรมาส' },
    { value: 'interim', label: 'รายงานระหว่างกาล' },
    { value: 'slides', label: 'กิจกรรมของบริษัท' },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Search Bar */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
          {(loadingSuggestions || loadingFilings) && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin z-10" />
          )}
          {selectedSymbol && (
            <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <Input
            ref={inputRef}
            placeholder="ค้นหาตัวย่อ... เช่น PTT, GULF, AAPL"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (selectedSymbol) {
                setSelectedSymbol(null);
                setFilings([]);
                setFinancials(null);
              }
            }}
            onFocus={() => { if (suggestions.length > 0 && !selectedSymbol) setShowSuggestions(true); }}
            className="pl-8 pr-8 h-9 border-border font-mono text-[12px] bg-background focus-visible:ring-1 focus-visible:ring-green-500/30"
            autoFocus
          />

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-[400px] overflow-y-auto">
              {suggestions.map((sym, i) => (
                <button
                  key={`${sym.exchange}-${sym.symbol}-${i}`}
                  onClick={() => handleSelectSymbol(sym)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 text-left border-b border-border/30 last:border-b-0 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-[10px]">
                    {getExchangeFlag(sym.exchange)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-mono font-bold text-cyan-400">{sym.symbol}</span>
                      <span className="text-[11px] font-mono text-foreground truncate">{sym.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">{sym.type}</span>
                    <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{sym.exchange}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Company Header + Filter */}
      {selectedSymbol && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-[11px]">
              {getExchangeFlag(selectedSymbol.exchange)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono font-bold text-foreground">{selectedSymbol.symbol}</span>
                <span className="text-[11px] font-mono text-muted-foreground">{selectedSymbol.description}</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">• {selectedSymbol.exchange} • เอกสารและข้อมูลการเงิน</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilingType(tab.value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors ${
                  filingType === tab.value
                    ? 'bg-muted/60 border-border text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        {/* Empty state */}
        {!selectedSymbol && !showSuggestions && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3 max-w-xs">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-sm font-mono font-bold text-foreground mb-1">ค้นหาเอกสารบริษัท</h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  พิมพ์ชื่อหรือตัวย่อหุ้นเพื่อดูข้อมูลการเงิน รายงานประจำปี รายงานไตรมาส และสไลด์นักลงทุน
                </p>
              </div>
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                {['PTT', 'GULF', 'AAPL', 'ADVANC', 'NVDA'].map(s => (
                  <button key={s} onClick={() => setSearchQuery(s)}
                    className="px-2 py-0.5 rounded border border-border/50 text-[10px] font-mono text-cyan-400 hover:bg-muted/30 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingFilings && (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[11px] font-mono">กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        )}

        {/* Financial Summary + Filings */}
        {selectedSymbol && !loadingFilings && (
          <>
            {/* Financial Data Panel — shown inline instead of linking to TradingView */}
            {financials && <FinancialSummary financials={financials} symbol={selectedSymbol} />}

            {/* Filings Table */}
            {filings.length > 0 ? (
              <div className="w-full">
                <div className="grid grid-cols-[1fr_auto_auto] px-4 py-2 border-b border-border/50 sticky top-0 bg-background z-10">
                  <span className="text-[10px] font-mono text-muted-foreground">เหตุการณ์/รายงาน</span>
                  <span className="text-[10px] font-mono text-muted-foreground text-center w-32">วันที่</span>
                  <span className="text-[10px] font-mono text-muted-foreground text-right w-32">ประเภท</span>
                </div>

                {sortedYears.map(year => {
                  const isExpanded = expandedYears.has(year);
                  const items = grouped[year];
                  return (
                    <div key={year}>
                      <button onClick={() => toggleYear(year)}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-muted/20 hover:bg-muted/30 text-left border-b border-border/30 transition-colors">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[12px] font-mono font-bold text-foreground">{year}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto">{items.length}</Badge>
                      </button>

                      {isExpanded && items.map((item, idx) => (
                        <div key={item.id}>
                          <div
                            className={`grid grid-cols-[1fr_auto_auto] px-4 py-2.5 border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}
                            onClick={() => setExpandedFiling(expandedFiling === item.id ? null : item.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {getTypeIcon(item.type)}
                              <span className="text-[11px] font-mono text-foreground">
                                {item.quarter || item.titleTh || item.title}
                              </span>
                            </div>
                            <div className="w-32 text-center">
                              <span className="text-[11px] font-mono text-muted-foreground">{item.date}</span>
                            </div>
                            <div className="w-32 flex items-center justify-end gap-1.5">
                              {item.documents.map((doc, di) => (
                                <Badge key={di} variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                                  {doc.icon} {doc.label}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Expanded detail — shows inline info instead of linking out */}
                          {expandedFiling === item.id && (
                            <div className="px-6 py-3 bg-muted/10 border-b border-border/20 space-y-2">
                              <div className="text-[10px] font-mono text-muted-foreground">
                                📋 <span className="text-foreground font-medium">{item.title}</span>
                                {item.form && <span className="ml-2 text-muted-foreground">({item.form})</span>}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                📅 วันที่เผยแพร่: <span className="text-foreground">{item.date}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.documents.map((doc, di) => (
                                  <div key={di} className="flex items-center gap-1 px-2 py-1 rounded bg-muted/30 border border-border/30">
                                    <span className="text-[11px]">{doc.icon}</span>
                                    <span className="text-[10px] font-mono text-foreground">{doc.label}</span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[9px] font-mono text-muted-foreground/70 mt-1">
                                ℹ️ ข้อมูลการเงินแสดงด้านบน — ดึงจาก TradingView Scanner API โดยตรง
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center p-12">
                <p className="text-[11px] font-mono text-muted-foreground">
                  ไม่พบเอกสารสำหรับ {selectedSymbol.exchange}:{selectedSymbol.symbol}
                </p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
};

export default ScreenerFilings;
