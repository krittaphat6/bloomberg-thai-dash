import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ScreenerFilters from './ScreenerFilters';
import ScreenerResults from './ScreenerResults';
import { MarketScreener, ScreenerType, Field, ColumnPreset, getPresetsForType } from '@/services/ScreenerService';

const ScreenerMain = () => {
  const [activeType, setActiveType] = useState<ScreenerType>('stock');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeColumns, setActiveColumns] = useState<Field[]>([]);
  const [activePresetName, setActivePresetName] = useState<string>('');

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
    setActiveColumns([]);
    setActivePresetName('');
  };

  const handleColumnsChange = (fields: Field[]) => {
    setActiveColumns(fields);
  };

  const handlePresetChange = (preset: ColumnPreset) => {
    setActivePresetName(preset.name);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-mono font-bold text-terminal-green tracking-wider">
            🔍 MARKET SCREENERS
          </h2>
          <span className="text-[9px] font-mono text-muted-foreground/60 hidden sm:inline">
            tvscreener-compatible · 13K+ fields · 6 markets
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activePresetName && (
            <Badge variant="outline" className="font-mono text-[9px] border-terminal-amber/30 text-terminal-amber">
              {activePresetName}
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-xs border-terminal-green/30 text-terminal-green">
            {results.length} Results
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeType} onValueChange={handleTypeChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-1.5 border-b border-border shrink-0">
          <TabsList className="bg-muted/30 h-7">
            <TabsTrigger value="stock" className="text-[10px] font-mono data-[state=active]:text-terminal-green px-3 py-1">📈 STOCKS</TabsTrigger>
            <TabsTrigger value="crypto" className="text-[10px] font-mono data-[state=active]:text-terminal-cyan px-3 py-1">₿ CRYPTO</TabsTrigger>
            <TabsTrigger value="forex" className="text-[10px] font-mono data-[state=active]:text-terminal-amber px-3 py-1">💱 FOREX</TabsTrigger>
            <TabsTrigger value="bond" className="text-[10px] font-mono data-[state=active]:text-terminal-green px-3 py-1">🏦 BONDS</TabsTrigger>
            <TabsTrigger value="futures" className="text-[10px] font-mono data-[state=active]:text-terminal-green px-3 py-1">📊 FUTURES</TabsTrigger>
            <TabsTrigger value="coin" className="text-[10px] font-mono data-[state=active]:text-terminal-cyan px-3 py-1">🪙 COINS</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Filters Panel */}
          <div className="w-60 border-r border-border shrink-0 flex flex-col overflow-hidden">
            <ScreenerFilters 
              type={activeType} 
              onSearch={handleSearch} 
              onColumnsChange={handleColumnsChange}
              onPresetChange={handlePresetChange}
            />
          </div>

          {/* Right: Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {(['stock', 'crypto', 'forex', 'bond', 'futures', 'coin'] as ScreenerType[]).map(t => (
              <TabsContent key={t} value={t} className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:hidden">
                <ScreenerResults 
                  type={t} 
                  data={results} 
                  loading={loading}
                  columns={activeColumns}
                />
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default ScreenerMain;
