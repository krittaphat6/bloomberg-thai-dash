import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check, Globe, Search, ChevronDown } from 'lucide-react';
import {
  STOCK_MARKETS,
  CRYPTO_EXCHANGES,
  getMarketsByRegion,
  REGION_LABELS,
  type MarketInfo,
  type CryptoExchange,
  type MarketRegion,
} from '@/services/screener/markets';
import { ScreenerType } from '@/services/screener';

interface MarketSelectorProps {
  type: ScreenerType;
  selectedMarkets: string[];
  onMarketsChange: (markets: string[]) => void;
}

export function MarketSelector({ type, selectedMarkets, onMarketsChange }: MarketSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [primaryListing, setPrimaryListing] = useState(false);

  const isStock = type === 'stock' || type === 'futures';
  const isCrypto = type === 'crypto' || type === 'coin';

  const marketsByRegion = useMemo(() => getMarketsByRegion(), []);

  const filteredStockMarkets = useMemo(() => {
    if (!search) return STOCK_MARKETS;
    const q = search.toLowerCase();
    return STOCK_MARKETS.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.exchanges.some(e => e.toLowerCase().includes(q))
    );
  }, [search]);

  const filteredCryptoExchanges = useMemo(() => {
    if (!search) return CRYPTO_EXCHANGES;
    const q = search.toLowerCase();
    return CRYPTO_EXCHANGES.filter(e =>
      e.label.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleToggle = (code: string) => {
    if (selectedMarkets.includes(code)) {
      onMarketsChange(selectedMarkets.filter(m => m !== code));
    } else {
      onMarketsChange([...selectedMarkets, code]);
    }
  };

  const allCodes = isStock
    ? STOCK_MARKETS.map(m => m.code)
    : CRYPTO_EXCHANGES.map(e => e.code);
  const allSelected = allCodes.length > 0 && allCodes.every(c => selectedMarkets.includes(c));

  const handleToggleAll = () => {
    if (allSelected) {
      onMarketsChange([]);
    } else {
      onMarketsChange(allCodes);
    }
  };

  const selectedLabel = selectedMarkets.length === 0
    ? 'All Markets'
    : selectedMarkets.length === 1
      ? (isStock
        ? STOCK_MARKETS.find(m => m.code === selectedMarkets[0])?.label
        : CRYPTO_EXCHANGES.find(e => e.code === selectedMarkets[0])?.label)
      : `${selectedMarkets.length} Markets`;

  const selectedFlag = selectedMarkets.length === 1 && isStock
    ? STOCK_MARKETS.find(m => m.code === selectedMarkets[0])?.flag
    : null;

  if (!isStock && !isCrypto) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between border-border text-[10px] font-mono h-7 px-2"
        >
          <span className="flex items-center gap-1.5 truncate">
            {selectedFlag ? <span>{selectedFlag}</span> : <Globe className="w-3 h-3 text-muted-foreground shrink-0" />}
            <span className="truncate">{selectedLabel}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-[8px] font-mono px-1 py-0 border-border">
              {selectedMarkets.length || allCodes.length}
            </Badge>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[380px] p-0 bg-background border-border">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-mono flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {isStock ? 'Select Markets' : 'Select Exchanges'}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 bg-muted/30 border-border text-xs h-8 font-mono"
            />
          </div>
        </div>

        {/* Select All */}
        <div className="px-4 pb-1">
          <button
            onClick={handleToggleAll}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-foreground/80 hover:bg-muted/30 rounded"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              allSelected ? 'bg-primary border-primary' : 'border-border'
            }`}>
              {allSelected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            Select All {isStock ? 'Markets' : 'Exchanges'}
          </button>
        </div>

        {/* Market/Exchange List */}
        <ScrollArea className="h-[360px]">
          <div className="px-4 pb-2 space-y-2">
            {isStock ? (
              search ? (
                // Flat filtered list
                <div className="space-y-0.5">
                  {filteredStockMarkets.map(market => (
                    <MarketItem
                      key={market.code}
                      market={market}
                      selected={selectedMarkets.includes(market.code)}
                      onToggle={() => handleToggle(market.code)}
                    />
                  ))}
                </div>
              ) : (
                // Grouped by region
                Object.entries(marketsByRegion).map(([region, markets]) => {
                  const regionInfo = REGION_LABELS[region as MarketRegion];
                  return (
                    <div key={region}>
                      <div className="text-[10px] font-mono text-muted-foreground px-2 py-1 flex items-center gap-1.5 sticky top-0 bg-background z-10">
                        <span>{regionInfo?.icon}</span>
                        <span className="font-medium">{regionInfo?.label}</span>
                        <span className="text-muted-foreground/60">({markets.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {markets.map(market => (
                          <MarketItem
                            key={market.code}
                            market={market}
                            selected={selectedMarkets.includes(market.code)}
                            onToggle={() => handleToggle(market.code)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // Crypto exchanges flat list
              <div className="space-y-0.5">
                {filteredCryptoExchanges.map(exchange => (
                  <ExchangeItem
                    key={exchange.code}
                    exchange={exchange}
                    selected={selectedMarkets.includes(exchange.code)}
                    onToggle={() => handleToggle(exchange.code)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          {isStock && (
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                <span>📊</span> Primary Listing
              </Label>
              <Switch
                checked={primaryListing}
                onCheckedChange={setPrimaryListing}
                className="scale-75"
              />
            </div>
          )}
          <Button
            size="sm"
            onClick={() => setOpen(false)}
            className="w-full h-7 text-[10px] font-mono bg-primary text-primary-foreground"
          >
            Done ({selectedMarkets.length || 'All'} selected)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MarketItem({ market, selected, onToggle }: {
  market: MarketInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono rounded transition-colors ${
        selected ? 'bg-primary/10 text-foreground' : 'text-foreground/70 hover:bg-muted/30'
      }`}
    >
      <span className="text-sm">{market.flag}</span>
      <span className="flex-1 text-left truncate">{market.label}</span>
      {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

function ExchangeItem({ exchange, selected, onToggle }: {
  exchange: CryptoExchange;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono rounded transition-colors ${
        selected ? 'bg-primary/10 text-foreground' : 'text-foreground/70 hover:bg-muted/30'
      }`}
    >
      <span className="text-sm">{exchange.icon}</span>
      <span className="flex-1 text-left truncate">{exchange.label}</span>
      <span className="text-[9px] text-muted-foreground">{exchange.code}</span>
      {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

export default MarketSelector;
