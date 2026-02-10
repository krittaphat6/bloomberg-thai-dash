import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ScreenerFilters from './ScreenerFilters';
import ScreenerResults from './ScreenerResults';
import { MarketScreener, ScreenerType } from '@/services/ScreenerService';

const ScreenerMain = () => {
  const [activeType, setActiveType] = useState<ScreenerType>('stock');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (screener: MarketScreener) => {
    setLoading(true);
    try {
      const data = await screener.get();
      setResults(data);
    } catch (error) {
      console.error('Screener error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTypeChange = (v: string) => {
    setActiveType(v as ScreenerType);
    setResults([]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-mono font-bold text-terminal-green tracking-wider">
            🔍 MARKET SCREENERS
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground">
            Advanced Multi-Market Screening System
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs border-terminal-green/30 text-terminal-green">
          {results.length} Results
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeType} onValueChange={handleTypeChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2 border-b border-border shrink-0">
          <TabsList className="bg-muted/30 h-8">
            <TabsTrigger value="stock" className="text-xs font-mono data-[state=active]:text-terminal-green">📈 STOCKS</TabsTrigger>
            <TabsTrigger value="crypto" className="text-xs font-mono data-[state=active]:text-terminal-cyan">₿ CRYPTO</TabsTrigger>
            <TabsTrigger value="forex" className="text-xs font-mono data-[state=active]:text-terminal-amber">💱 FOREX</TabsTrigger>
            <TabsTrigger value="bond" className="text-xs font-mono data-[state=active]:text-terminal-green">🏦 BONDS</TabsTrigger>
            <TabsTrigger value="futures" className="text-xs font-mono data-[state=active]:text-terminal-green">📊 FUTURES</TabsTrigger>
            <TabsTrigger value="coin" className="text-xs font-mono data-[state=active]:text-terminal-cyan">🪙 COINS</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Filters */}
          <div className="w-64 border-r border-border shrink-0 flex flex-col overflow-hidden">
            <ScreenerFilters type={activeType} onSearch={handleSearch} />
          </div>

          {/* Right: Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {(['stock', 'crypto', 'forex', 'bond', 'futures', 'coin'] as ScreenerType[]).map(t => (
              <TabsContent key={t} value={t} className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
                <ScreenerResults type={t} data={results} loading={loading} />
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default ScreenerMain;
