import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Bell, BellOff, ExternalLink, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

type FilingType = 'all' | 'annual' | 'quarterly' | 'interim' | 'slides';

interface FilingItem {
  id: string;
  symbol: string;
  title: string;
  type: string;
  date: string;
  quarter?: string;
  year: number;
  format: 'PDF' | 'SLIDES' | 'HTML';
  url?: string;
}

const MOCK_FILINGS: FilingItem[] = [
  { id: '1', symbol: 'SET:GULF', title: 'รายงานระหว่างกาล Q4 2025', type: 'interim', date: '17 ก.พ. 2026', quarter: 'Q4 2025', year: 2025, format: 'PDF' },
  { id: '2', symbol: 'SET:GULF', title: 'สไลด์นักลงทุน Q4 2025', type: 'slides', date: '17 ก.พ. 2026', quarter: 'Q4 2025', year: 2025, format: 'SLIDES' },
  { id: '3', symbol: 'SET:GULF', title: 'รายงานระหว่างกาล Q3 2025', type: 'interim', date: '19 พ.ย. 2025', quarter: 'Q3 2025', year: 2025, format: 'PDF' },
  { id: '4', symbol: 'SET:GULF', title: 'สไลด์นักลงทุน Q3 2025', type: 'slides', date: '19 พ.ย. 2025', quarter: 'Q3 2025', year: 2025, format: 'SLIDES' },
  { id: '5', symbol: 'SET:GULF', title: 'รายงานระหว่างกาล Q2 2025', type: 'interim', date: '27 ส.ค. 2025', quarter: 'Q2 2025', year: 2025, format: 'PDF' },
  { id: '6', symbol: 'SET:GULF', title: 'รายงานระหว่างกาล Q1 2025', type: 'interim', date: '13 พ.ค. 2025', quarter: 'Q1 2025', year: 2025, format: 'PDF' },
  { id: '7', symbol: 'SET:GULF', title: 'รายงานประจำปี 2024', type: 'annual', date: '30 เม.ย. 2025', quarter: 'FY 2024', year: 2024, format: 'PDF' },
  { id: '8', symbol: 'SET:PTT', title: 'รายงานระหว่างกาล Q4 2025', type: 'interim', date: '14 ก.พ. 2026', quarter: 'Q4 2025', year: 2025, format: 'PDF' },
  { id: '9', symbol: 'SET:PTT', title: 'รายงานประจำปี 2024', type: 'annual', date: '28 มี.ค. 2025', quarter: 'FY 2024', year: 2024, format: 'PDF' },
  { id: '10', symbol: 'NASDAQ:AAPL', title: '10-Q Q1 FY2025', type: 'quarterly', date: '2 Feb 2025', quarter: 'Q1 FY2025', year: 2025, format: 'PDF' },
  { id: '11', symbol: 'NASDAQ:AAPL', title: '10-K FY2024', type: 'annual', date: '1 Nov 2024', quarter: 'FY2024', year: 2024, format: 'PDF' },
];

const ScreenerFilings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filingType, setFilingType] = useState<FilingType>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FilingItem[]>([]);
  const [notified, setNotified] = useState(() => localStorage.getItem('filings_notify') === 'true');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([2025, 2026]));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toUpperCase());
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const filtered = MOCK_FILINGS.filter(f => {
        const matchSymbol = f.symbol.toUpperCase().includes(debouncedQuery) ||
          (f.symbol.split(':').pop()?.toUpperCase().includes(debouncedQuery) ?? false);
        const matchType = filingType === 'all' || f.type === filingType;
        return matchSymbol && matchType;
      });
      setResults(filtered);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedQuery, filingType]);

  const grouped = results.reduce<Record<number, FilingItem[]>>((acc, item) => {
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

  const handleNotify = () => {
    const next = !notified;
    setNotified(next);
    localStorage.setItem('filings_notify', String(next));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-3 border-b border-border shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          {loading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          <Input
            placeholder="Search symbol... e.g. GULF, PTT, AAPL"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 border-border font-mono text-[11px] bg-background focus-visible:ring-terminal-green/30"
            autoFocus
          />
        </div>

        <Select value={filingType} onValueChange={v => setFilingType(v as FilingType)}>
          <SelectTrigger className="w-28 h-8 text-[10px] font-mono border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[10px] font-mono">All Types</SelectItem>
            <SelectItem value="annual" className="text-[10px] font-mono">📋 Annual</SelectItem>
            <SelectItem value="quarterly" className="text-[10px] font-mono">📊 Quarterly</SelectItem>
            <SelectItem value="interim" className="text-[10px] font-mono">📄 Interim</SelectItem>
            <SelectItem value="slides" className="text-[10px] font-mono">📊 Slides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Area */}
      <ScrollArea className="flex-1">
        {/* Initial empty state */}
        {!searchQuery && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-12 h-12 rounded-full bg-terminal-amber/10 border border-terminal-amber/30 flex items-center justify-center mx-auto text-xl">
                🚧
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-foreground mb-1">
                  Filing Data Coming Soon
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  We're building the TradingView filings connector to bring you annual reports, quarterly statements, and presentation slides.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNotify}
                className="border-terminal-amber/30 text-terminal-amber hover:bg-terminal-amber/10 text-[10px] font-mono h-7 gap-1"
              >
                {notified
                  ? <><BellOff className="w-3 h-3" /> You'll be notified</>
                  : <><Bell className="w-3 h-3" /> Notify me</>
                }
              </Button>

              <p className="text-[9px] font-mono text-muted-foreground">
                Try searching:{' '}
                <button onClick={() => setSearchQuery('GULF')} className="text-terminal-cyan hover:underline">GULF</button> ·{' '}
                <button onClick={() => setSearchQuery('PTT')} className="text-terminal-cyan hover:underline">PTT</button> ·{' '}
                <button onClick={() => setSearchQuery('AAPL')} className="text-terminal-cyan hover:underline">AAPL</button>
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {searchQuery && loading && (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[11px] font-mono">Searching filings for "{searchQuery}"...</span>
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery && !loading && results.length === 0 && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-[11px] font-mono text-muted-foreground">
                No filings found for "{searchQuery}"
              </p>
              <p className="text-[9px] font-mono text-muted-foreground mt-1">
                Try: GULF · PTT · ADVANC · AAPL
              </p>
            </div>
          </div>
        )}

        {/* Results grouped by year */}
        {!loading && results.length > 0 && (
          <div className="p-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1">
                <Badge variant="outline" className="text-[9px] font-mono border-terminal-green/30 text-terminal-green">
                  {results.length} documents · {searchQuery}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-mono border-terminal-amber/30 text-terminal-amber">
                  MOCK DATA
                </Badge>
              </div>

              {sortedYears.map(year => {
                const isExpanded = expandedYears.has(year);
                const items = grouped[year];
                return (
                  <div key={year}>
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/20 hover:bg-muted/40 text-left rounded-sm"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      }
                      <span className="text-[11px] font-mono font-bold text-foreground">{year}</span>
                      <Badge variant="secondary" className="text-[9px] font-mono ml-auto">
                        {items.length} docs
                      </Badge>
                    </button>

                    {isExpanded && (
                      <div className="ml-2 border-l border-border/50 pl-2 space-y-0.5 py-1">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted/30 group"
                          >
                            <span className="text-sm shrink-0">
                              {item.format === 'SLIDES' ? '📊' : '📄'}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-mono text-foreground truncate">{item.title}</p>
                              <p className="text-[9px] font-mono text-muted-foreground">{item.date} · {item.quarter}</p>
                            </div>

                            <Badge variant="outline" className="text-[8px] font-mono shrink-0">
                              {item.type}
                            </Badge>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => item.url ? window.open(item.url, '_blank') : null}
                              title="Open document"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ScreenerFilings;