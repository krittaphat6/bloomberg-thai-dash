import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Search, Trash2 } from 'lucide-react';
import {
  MarketScreener,
  ScreenerType,
  StockField,
  CryptoField,
  ForexField,
  FilterCondition,
  Field,
  STOCK_PRICE_FIELDS,
  CRYPTO_PRICE_FIELDS
} from '@/services/ScreenerService';

interface ScreenerFiltersProps {
  type: ScreenerType;
  onSearch: (screener: MarketScreener) => void;
}

interface ActiveFilter {
  field: Field;
  operator: '>' | '<' | '>=' | '<=';
  value: number;
  displayValue: string;
}

const ScreenerFilters = ({ type, onSearch }: ScreenerFiltersProps) => {
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [selectedFieldName, setSelectedFieldName] = useState<string>('');
  const [operator, setOperator] = useState<string>('>');
  const [value, setValue] = useState('');

  const getFieldsForType = (): Field[] => {
    switch (type) {
      case 'stock': return Object.values(StockField).filter(f => f.type === 'number');
      case 'crypto': return Object.values(CryptoField).filter(f => f.type === 'number');
      case 'forex': return Object.values(ForexField).filter(f => f.type === 'number');
      default: return [];
    }
  };

  const fields = getFieldsForType();

  const handleAddFilter = () => {
    const selectedField = fields.find(f => f.name === selectedFieldName);
    if (!selectedField || !value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newFilter: ActiveFilter = {
      field: selectedField,
      operator: operator as ActiveFilter['operator'],
      value: numValue,
      displayValue: `${selectedField.label} ${operator} ${value}`
    };

    setFilters(prev => [...prev, newFilter]);
    setValue('');
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSearch = () => {
    const screener = new MarketScreener(type);

    filters.forEach(f => {
      let condition: FilterCondition;
      switch (f.operator) {
        case '>': condition = f.field.gt(f.value); break;
        case '<': condition = f.field.lt(f.value); break;
        case '>=': condition = f.field.gte(f.value); break;
        case '<=': condition = f.field.lte(f.value); break;
        default: condition = f.field.gt(f.value);
      }
      screener.where(condition);
    });

    if (type === 'stock') screener.select(...STOCK_PRICE_FIELDS);
    else if (type === 'crypto') screener.select(...CRYPTO_PRICE_FIELDS);

    onSearch(screener);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddFilter();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-mono font-bold text-foreground">Filter Criteria</h3>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {/* Active Filters */}
          {filters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono text-muted-foreground">Active Filters</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters([])}
                  className="h-6 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filters.map((filter, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="border-terminal-green/40 text-terminal-green font-mono text-xs gap-1"
                  >
                    {filter.displayValue}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveFilter(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add New Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">Add Filter</Label>

            <Select value={selectedFieldName} onValueChange={setSelectedFieldName}>
              <SelectTrigger className="border-border text-xs font-mono">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.name} value={field.name} className="text-xs font-mono">
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger className="border-border text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=">" className="text-xs font-mono">Greater than (&gt;)</SelectItem>
                <SelectItem value="<" className="text-xs font-mono">Less than (&lt;)</SelectItem>
                <SelectItem value=">=" className="text-xs font-mono">Greater or equal (&gt;=)</SelectItem>
                <SelectItem value="<=" className="text-xs font-mono">Less or equal (&lt;=)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Value..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-border text-xs font-mono"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFilter}
              disabled={!selectedFieldName || !value}
              className="w-full border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 font-mono text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Filter
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">Quick Presets</Label>
            <div className="space-y-1">
              {type === 'stock' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-mono text-terminal-cyan hover:bg-terminal-cyan/10"
                    onClick={() => {
                      setFilters([
                        { field: StockField.RSI_14, operator: '<', value: 30, displayValue: 'RSI(14) < 30' },
                        { field: StockField.VOLUME, operator: '>', value: 1000000, displayValue: 'Volume > 1M' },
                      ]);
                    }}
                  >
                    📉 Oversold + High Volume
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-mono text-terminal-cyan hover:bg-terminal-cyan/10"
                    onClick={() => {
                      setFilters([
                        { field: StockField.RSI_14, operator: '>', value: 70, displayValue: 'RSI(14) > 70' },
                      ]);
                    }}
                  >
                    📈 Overbought (RSI &gt; 70)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-mono text-terminal-cyan hover:bg-terminal-cyan/10"
                    onClick={() => {
                      setFilters([
                        { field: StockField.CHANGE_PERCENT, operator: '>', value: 5, displayValue: 'Change % > 5' },
                      ]);
                    }}
                  >
                    🚀 Top Gainers (&gt;5%)
                  </Button>
                </>
              )}
              {type === 'crypto' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-mono text-terminal-cyan hover:bg-terminal-cyan/10"
                    onClick={() => {
                      setFilters([
                        { field: CryptoField.CHANGE_24H, operator: '>', value: 10, displayValue: 'Change 24h > 10%' },
                      ]);
                    }}
                  >
                    🔥 Hot Movers (&gt;10%)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-mono text-terminal-cyan hover:bg-terminal-cyan/10"
                    onClick={() => {
                      setFilters([
                        { field: CryptoField.RSI_14, operator: '<', value: 30, displayValue: 'RSI(14) < 30' },
                      ]);
                    }}
                  >
                    📉 Oversold Crypto
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <Button
          onClick={handleSearch}
          className="w-full bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/40 font-mono text-sm"
        >
          <Search className="w-4 h-4 mr-2" />
          RUN SCREENER
        </Button>
      </div>
    </div>
  );
};

export default ScreenerFilters;
