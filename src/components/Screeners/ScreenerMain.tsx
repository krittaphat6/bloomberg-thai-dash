import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import ScreenerFilters from './ScreenerFilters';
import ScreenerResults from './ScreenerResults';
import ScreenerPresets from './ScreenerPresets';
import { ScreenerType, MarketScreener, FilterCondition } from '@/services/screener';

const SCREENER_TABS: { value: ScreenerType; label: string; color: string }[] = [
  { value: 'stock', label: '📈 STOCKS', color: 'data-[state=active]:text-terminal-green' },
  { value: 'crypto', label: '₿ CRYPTO', color: 'data-[state=active]:text-terminal-cyan' },
  { value: 'forex', label: '💱 FOREX', color: 'data-[state=active]:text-terminal-amber' },
  { value: 'bond', label: '🏦 BONDS', color: 'data-[state=active]:text-terminal-green' },
  { value: 'futures', label: '📊 FUTURES', color: 'data-[state=active]:text-terminal-green' },
  { value: 'coin', label: '🪙 COINS', color: 'data-[state=active]:text-terminal-cyan' },
];

const ScreenerMain = () => {
  const [activeType, setActiveType] = useState<ScreenerType>('stock');
  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [activeColumns, setActiveColumns] = useState<string[]>([]);
  const [lastScreener, setLastScreener] = useState<MarketScreener | null>(null);

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

  const handleTypeChange = (v: string) => {
    setActiveType(v as ScreenerType);
    setResults([]);
    setTotalCount(0);
    setActiveColumns([]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-mono font-bold text-terminal-green tracking-wider">
              🔍 MARKET SCREENERS
            </h2>
            <p className="text-[10px] font-mono text-muted-foreground">
              TradingView-Powered • 180+ Fields • 40+ Markets • Financial Statements • All Timeframes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFallback && (
            <Badge variant="outline" className="font-mono text-[10px] border-terminal-amber/40 text-terminal-amber">
              MOCK DATA
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-xs border-terminal-green/30 text-terminal-green">
            {totalCount > 0 ? `${results.length}/${totalCount}` : `${results.length}`} Results
          </Badge>
          {lastScreener && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeType} onValueChange={handleTypeChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-1.5 pb-0 border-b border-border shrink-0">
          <TabsList className="bg-muted/30 h-7">
            {SCREENER_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className={`text-[11px] font-mono px-2 py-0.5 ${tab.color}`}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Filters + Presets */}
          <div className="w-72 border-r border-border shrink-0 flex flex-col overflow-hidden">
            <Tabs defaultValue="filters" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-muted/20 h-7 mx-2 mt-1.5 shrink-0">
                <TabsTrigger value="filters" className="text-[10px] font-mono">🔧 Filters</TabsTrigger>
                <TabsTrigger value="strategies" className="text-[10px] font-mono">⚡ Strategies</TabsTrigger>
              </TabsList>
              <TabsContent value="filters" className="flex-1 overflow-hidden m-0">
                <ScreenerFilters type={activeType} onSearch={handleSearch} />
              </TabsContent>
              <TabsContent value="strategies" className="flex-1 overflow-hidden m-0">
                <ScreenerPresets type={activeType} onApply={handleStrategyApply} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {SCREENER_TABS.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
                <ScreenerResults type={tab.value} data={results} loading={loading} columns={activeColumns} />
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default ScreenerMain;
