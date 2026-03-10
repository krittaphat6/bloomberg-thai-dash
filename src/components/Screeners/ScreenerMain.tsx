import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, PanelLeftClose, PanelLeft } from 'lucide-react';
import ScreenerFilters from './ScreenerFilters';
import ScreenerResults from './ScreenerResults';
import ScreenerPresets from './ScreenerPresets';
import ScreenerDetail from './ScreenerDetail';
import ScreenerFilings from './ScreenerFilings';
import { ScreenerType, MarketScreener, FilterCondition } from '@/services/screener';

const SCREENER_TABS: { value: ScreenerType | 'filings'; label: string; color: string }[] = [
  { value: 'stock', label: '📈 STOCKS', color: 'data-[state=active]:text-terminal-green' },
  { value: 'crypto', label: '₿ CRYPTO', color: 'data-[state=active]:text-terminal-cyan' },
  { value: 'forex', label: '💱 FOREX', color: 'data-[state=active]:text-terminal-amber' },
  { value: 'bond', label: '🏦 BONDS', color: 'data-[state=active]:text-terminal-green' },
  { value: 'futures', label: '📊 FUTURES', color: 'data-[state=active]:text-terminal-green' },
  { value: 'coin', label: '🪙 COINS', color: 'data-[state=active]:text-terminal-cyan' },
  { value: 'filings', label: '📄 FILINGS', color: 'data-[state=active]:text-terminal-amber' },
];

const SCREENER_TYPES: ScreenerType[] = ['stock', 'crypto', 'forex', 'bond', 'futures', 'coin'];

const ScreenerMain = () => {
  const [activeTab, setActiveTab] = useState<string>('stock');
  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [lastScreener, setLastScreener] = useState<MarketScreener | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);

  const activeType: ScreenerType = SCREENER_TYPES.includes(activeTab as ScreenerType)
    ? (activeTab as ScreenerType)
    : 'stock';

  const isFilings = activeTab === 'filings';

  const handleSearch = useCallback(async (screener: MarketScreener) => {
    setLoading(true);
    setLastScreener(screener);
    try {
      const result = await screener.get();
      setResults(result.data);
      setTotalCount(result.totalCount);
      setIsFallback(!!result.fallback);
      setActiveColumns(screener.getColumns());
    } catch (error) {
      console.error('Screener error:', error);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (lastScreener) handleSearch(lastScreener);
  }, [lastScreener, handleSearch]);

  const handleStrategyApply = useCallback((filters: FilterCondition[], columns: string[], sort?: { field: string; direction: 'asc' | 'desc' }) => {
    const screener = new MarketScreener(activeType);
    filters.forEach(f => screener.where(f));
    if (columns.length > 0) screener.select(...columns);
    if (sort) screener.sortBy(sort.field, sort.direction);
    handleSearch(screener);
  }, [activeType, handleSearch]);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    if (v !== 'filings') {
      setResults([]);
      setTotalCount(0);
      setActiveColumns([]);
      setSelectedItem(null);
    }
  };

  const handleColumnsChange = (cols: string[]) => {
    setActiveColumns(cols);
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortConfig({ field, direction });
    // Re-sort local data
    const sorted = [...results].sort((a, b) => {
      const va = a[field] ?? 0;
      const vb = b[field] ?? 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return direction === 'asc' ? va - vb : vb - va;
      }
      return direction === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    setResults(sorted);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const cols = activeColumns.length > 0 ? activeColumns : Object.keys(results[0]);
    const header = ['symbol', ...cols].join(',');
    const rows = results.map(item => {
      const symbol = item.name || item.symbol || '';
      return [symbol, ...cols.map(c => item[c] ?? '')].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screener-${activeType}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftOpen(!leftOpen)}
            className="h-6 w-6 p-0"
          >
            {leftOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" /> : <PanelLeft className="w-3.5 h-3.5 text-muted-foreground" />}
          </Button>
          <div>
            <h2 className="text-xs font-mono font-bold text-terminal-green tracking-wider">
              🔍 MARKET SCREENERS
            </h2>
            <p className="text-[9px] font-mono text-muted-foreground">
              180+ Fields • 40+ Markets • Financial Statements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isFallback && (
            <Badge variant="outline" className="font-mono text-[9px] border-terminal-amber/40 text-terminal-amber">
              MOCK
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-[10px] border-terminal-green/30 text-terminal-green">
            {totalCount > 0 ? `${results.length}/${totalCount}` : `${results.length}`}
          </Badge>
          {lastScreener && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="h-6 w-6 p-0">
              <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 pt-1 pb-0 border-b border-border shrink-0">
          <TabsList className="bg-muted/30 h-6">
            {SCREENER_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className={`text-[10px] font-mono px-1.5 py-0.5 ${tab.color}`}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Filings tab */}
        {isFilings ? (
          <TabsContent value="filings" className="flex-1 m-0 overflow-hidden">
            <ScreenerFilings />
          </TabsContent>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel */}
            {leftOpen && (
              <div className="w-60 border-r border-border shrink-0 flex flex-col overflow-hidden">
                <Tabs defaultValue="filters" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="bg-muted/20 h-6 mx-2 mt-1 shrink-0">
                    <TabsTrigger value="filters" className="text-[9px] font-mono">🔧 Filters</TabsTrigger>
                    <TabsTrigger value="strategies" className="text-[9px] font-mono">⚡ Strategies</TabsTrigger>
                  </TabsList>
                  <TabsContent value="filters" className="flex-1 overflow-hidden m-0">
                    <ScreenerFilters type={activeType} onSearch={handleSearch} />
                  </TabsContent>
                  <TabsContent value="strategies" className="flex-1 overflow-hidden m-0">
                    <ScreenerPresets type={activeType} onApply={handleStrategyApply} />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Center - Results */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {SCREENER_TYPES.map(t => (
                <TabsContent key={t} value={t} className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
                  <ScreenerResults
                    type={t}
                    data={results}
                    loading={loading}
                    columns={activeColumns}
                    onColumnsChange={handleColumnsChange}
                    onSortChange={handleSortChange}
                    sortConfig={sortConfig}
                    onRowSelect={setSelectedItem}
                    selectedItem={selectedItem}
                    onExportCSV={handleExportCSV}
                    onRunScreener={() => {
                      const screener = new MarketScreener(activeType);
                      handleSearch(screener);
                    }}
                  />
                </TabsContent>
              ))}
            </div>

            {/* Right - Detail Panel */}
            {selectedItem && (
              <div className="w-80 shrink-0 overflow-hidden">
                <ScreenerDetail
                  item={selectedItem}
                  type={activeType}
                  onClose={() => setSelectedItem(null)}
                />
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default ScreenerMain;
