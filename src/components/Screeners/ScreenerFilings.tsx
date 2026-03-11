import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ExternalLink, Loader2, ChevronDown, ChevronRight, Building2, X, FileText, Presentation, FileCheck } from 'lucide-react';
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

// ─── Component ────────────────────────────────────────────────────────────────

const ScreenerFilings = () => {
  // Search & autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected company state
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSuggestion | null>(null);
  const [filingType, setFilingType] = useState<FilingTypeFilter>('all');
  const [filings, setFilings] = useState<FilingItem[]>([]);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loadingFilings, setLoadingFilings] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // ─── Symbol Search with Debounce ──────────────────────────────────────────

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

  // ─── Click outside to close suggestions ───────────────────────────────────

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

  // ─── Select a symbol ─────────────────────────────────────────────────────

  const handleSelectSymbol = useCallback(async (sym: SymbolSuggestion) => {
    setSelectedSymbol(sym);
    setSearchQuery(`${sym.exchange}:${sym.symbol}`);
    setShowSuggestions(false);
    setSuggestions([]);

    // Fetch filings
    setLoadingFilings(true);
    try {
      const { data, error } = await supabase.functions.invoke('tv-filings', {
        body: { symbol: sym.symbol, exchange: sym.exchange, type: filingType },
      });
      if (!error && data) {
        setFilings(data.filings || []);
        setFinancials(data.financials || null);
        // Auto-expand latest 2 years
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

  // ─── Refetch when filter type changes ─────────────────────────────────────

  useEffect(() => {
    if (selectedSymbol) {
      handleSelectSymbol(selectedSymbol);
    }
  }, [filingType]);

  // ─── Clear selection ──────────────────────────────────────────────────────

  const handleClear = () => {
    setSelectedSymbol(null);
    setSearchQuery('');
    setFilings([]);
    setFinancials(null);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // ─── Group filings by year ────────────────────────────────────────────────

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

  // ─── Get type icon ────────────────────────────────────────────────────────

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'annual': return <FileCheck className="w-3.5 h-3.5 text-terminal-green" />;
      case 'interim': case 'quarterly': return <FileText className="w-3.5 h-3.5 text-terminal-cyan" />;
      case 'slides': return <Presentation className="w-3.5 h-3.5 text-terminal-amber" />;
      default: return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return 'รายงานประจำปี';
      case 'interim': return 'รายงานระหว่างกาล';
      case 'quarterly': return 'รายงานรายไตรมาส';
      case 'slides': return 'สไลด์';
      default: return type;
    }
  };

  const getExchangeFlag = (exchange: string) => {
    const flags: Record<string, string> = {
      SET: '🇹🇭', BKK: '🇹🇭', TFEX: '🇹🇭',
      NASDAQ: '🇺🇸', NYSE: '🇺🇸', AMEX: '🇺🇸',
      TSE: '🇯🇵', HKEX: '🇭🇰', LSE: '🇬🇧',
      XETR: '🇩🇪', FRA: '🇩🇪', FWB: '🇩🇪', SWB: '🇩🇪', GETTEX: '🇩🇪',
      SSE: '🇨🇳', SZSE: '🇨🇳',
      BSE: '🇮🇳', NSE: '🇮🇳',
      ASX: '🇦🇺', SGX: '🇸🇬',
      BURSA: '🇲🇾', MYX: '🇲🇾',
      KRX: '🇰🇷', TWSE: '🇹🇼',
      IDX: '🇮🇩', PSE: '🇵🇭',
      UPCOM: '🇻🇳',
    };
    return flags[exchange] || '🏳️';
  };

  // ─── Filter type tabs ────────────────────────────────────────────────────

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
      {/* Search Bar with Autocomplete */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
          {(loadingSuggestions || loadingFilings) && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin z-10" />
          )}
          {selectedSymbol && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground"
            >
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
            onFocus={() => {
              if (suggestions.length > 0 && !selectedSymbol) setShowSuggestions(true);
            }}
            className="pl-8 pr-8 h-9 border-border font-mono text-[12px] bg-background focus-visible:ring-terminal-green/30"
            autoFocus
          />

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-[400px] overflow-y-auto"
            >
              {suggestions.map((sym, i) => (
                <button
                  key={`${sym.exchange}-${sym.symbol}-${i}`}
                  onClick={() => handleSelectSymbol(sym)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 text-left border-b border-border/30 last:border-b-0 transition-colors"
                >
                  {/* Logo placeholder */}
                  <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-[10px]">
                    {getExchangeFlag(sym.exchange)}
                  </div>

                  {/* Symbol & Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-mono font-bold text-terminal-cyan">{sym.symbol}</span>
                      <span className="text-[11px] font-mono text-foreground truncate">{sym.description}</span>
                    </div>
                  </div>

                  {/* Type & Exchange */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">{sym.type}</span>
                    <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                      {sym.exchange}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Company Header */}
      {selectedSymbol && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center text-[11px]">
              {getExchangeFlag(selectedSymbol.exchange)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-mono font-bold text-foreground">
                  {selectedSymbol.symbol}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {selectedSymbol.description}
                </span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">
                • เอกสาร
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
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

      {/* Content Area */}
      <ScrollArea className="flex-1">
        {/* Initial empty state — no symbol selected */}
        {!selectedSymbol && !showSuggestions && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3 max-w-xs">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-sm font-mono font-bold text-foreground mb-1">
                  ค้นหาเอกสารบริษัท
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  พิมพ์ชื่อหรือตัวย่อหุ้นเพื่อดูรายงานประจำปี รายงานไตรมาส และสไลด์นักลงทุน
                </p>
              </div>
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                {['PTT', 'GULF', 'AAPL', 'ADVANC', 'NVDA'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSearchQuery(s)}
                    className="px-2 py-0.5 rounded border border-border/50 text-[10px] font-mono text-terminal-cyan hover:bg-muted/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading filings */}
        {loadingFilings && (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[11px] font-mono">กำลังโหลดเอกสาร...</span>
            </div>
          </div>
        )}

        {/* Filings Table — TradingView Style */}
        {selectedSymbol && !loadingFilings && filings.length > 0 && (
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_auto_auto] px-4 py-2 border-b border-border/50 sticky top-0 bg-background z-10">
              <span className="text-[10px] font-mono text-muted-foreground">เหตุการณ์/รายงาน</span>
              <span className="text-[10px] font-mono text-muted-foreground text-center w-32">วันที่เผยแพร่</span>
              <span className="text-[10px] font-mono text-muted-foreground text-right w-48">เอกสารและเอกสารอื่น</span>
            </div>

            {sortedYears.map(year => {
              const isExpanded = expandedYears.has(year);
              const items = grouped[year];

              return (
                <div key={year}>
                  {/* Year Header */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-muted/20 hover:bg-muted/30 text-left border-b border-border/30 transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    }
                    <span className="text-[12px] font-mono font-bold text-foreground">{year}</span>
                  </button>

                  {/* Filing Rows */}
                  {isExpanded && items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[1fr_auto_auto] px-4 py-2.5 border-b border-border/20 hover:bg-muted/20 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-muted/5'
                      }`}
                    >
                      {/* Description */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-foreground">
                          {item.quarter || item.titleTh || item.title}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="w-32 text-center">
                        <span className="text-[11px] font-mono text-muted-foreground">{item.date}</span>
                      </div>

                      {/* Documents */}
                      <div className="w-48 flex items-center justify-end gap-1.5 flex-wrap">
                        {item.documents.map((doc, di) => (
                          <button
                            key={di}
                            onClick={() => item.url && window.open(item.url, '_blank')}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted/40 transition-colors group"
                            title={doc.label}
                          >
                            {getTypeIcon(doc.type === 'slides' ? 'slides' : doc.type === 'annual_report' ? 'annual' : 'interim')}
                            <span className="text-[10px] font-mono text-terminal-cyan group-hover:underline">
                              {doc.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* No filings found */}
        {selectedSymbol && !loadingFilings && filings.length === 0 && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-[11px] font-mono text-muted-foreground">
                ไม่พบเอกสารสำหรับ {selectedSymbol.exchange}:{selectedSymbol.symbol}
              </p>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ScreenerFilings;
