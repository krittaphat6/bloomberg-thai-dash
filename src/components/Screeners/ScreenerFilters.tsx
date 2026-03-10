import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Search, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import {
  ScreenerType,
  MarketScreener,
  FilterCondition,
  FieldDef,
  FieldCategory,
  FIELD_CATEGORIES,
  getFieldsForScreener,
  getFieldsByCategory,
  getNumericFields,
  getCategoriesForScreener,
  searchFields,
  getPresetsForScreener,
  FieldPreset,
  TIME_INTERVALS,
} from '@/services/screener';
import { MarketSelector } from './MarketSelector';

interface ScreenerFiltersProps {
  type: ScreenerType;
  onSearch: (screener: MarketScreener) => void;
}

interface ActiveFilter {
  field: FieldDef;
  operator: FilterCondition['operator'];
  value: any;
  displayValue: string;
  fieldNameWithTF: string; // actual field name with timeframe suffix
}

const TECHNICAL_CATEGORIES: FieldCategory[] = ['oscillator', 'moving_average', 'technical', 'bollinger', 'pivot', 'candlestick'];

const TF_OPTIONS = [
  { code: '', label: '1D' },
  { code: '1', label: '1m' },
  { code: '5', label: '5m' },
  { code: '15', label: '15m' },
  { code: '30', label: '30m' },
  { code: '60', label: '1h' },
  { code: '120', label: '2h' },
  { code: '240', label: '4h' },
  { code: '1W', label: '1W' },
  { code: '1M', label: '1M' },
];

const OPERATORS: { value: FilterCondition['operator']; label: string }[] = [
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
  { value: '>=', label: 'Greater or equal (≥)' },
  { value: '<=', label: 'Less or equal (≤)' },
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not equal (≠)' },
  { value: 'between', label: 'Between' },
];

const ScreenerFilters = ({ type, onSearch }: ScreenerFiltersProps) => {
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [selectedFieldName, setSelectedFieldName] = useState<string>('');
  const [operator, setOperator] = useState<FilterCondition['operator']>('>');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<FieldCategory | null>('oscillator');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState(150);

  const availableFields = useMemo(() => getNumericFields(type), [type]);
  const categories = useMemo(() => getCategoriesForScreener(type), [type]);
  const presets = useMemo(() => getPresetsForScreener(type), [type]);

  const filteredFields = useMemo(() => {
    if (fieldSearch) return searchFields(fieldSearch, type).filter(f => f.format !== 'text' && f.format !== 'date');
    if (expandedCategory) return getFieldsByCategory(type, expandedCategory).filter(f => f.format !== 'text' && f.format !== 'date');
    return availableFields;
  }, [fieldSearch, expandedCategory, type, availableFields]);

  const selectedField = useMemo(() => {
    return availableFields.find(f => f.name === selectedFieldName) ||
           filteredFields.find(f => f.name === selectedFieldName);
  }, [selectedFieldName, availableFields, filteredFields]);

  const isTechnicalField = selectedField && TECHNICAL_CATEGORIES.includes(selectedField.category);

  const handleAddFilter = () => {
    const field = selectedField;
    if (!field || !value) return;

    let filterValue: any;
    let display: string;
    const actualFieldName = isTechnicalField && timeframe ? `${field.name}|${timeframe}` : field.name;
    const tfLabel = timeframe ? TF_OPTIONS.find(t => t.code === timeframe)?.label : '';

    if (operator === 'between') {
      const v1 = parseFloat(value);
      const v2 = parseFloat(value2);
      if (isNaN(v1) || isNaN(v2)) return;
      filterValue = [v1, v2];
      display = `${field.label}${tfLabel ? ` (${tfLabel})` : ''} ∈ [${v1}, ${v2}]`;
    } else {
      const numVal = parseFloat(value);
      if (isNaN(numVal)) return;
      filterValue = numVal;
      display = `${field.label}${tfLabel ? ` (${tfLabel})` : ''} ${operator} ${value}`;
    }

    setFilters(prev => [...prev, {
      field,
      operator,
      value: filterValue,
      displayValue: display,
      fieldNameWithTF: actualFieldName,
    }]);
    setValue('');
    setValue2('');
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setSelectedColumns(preset.fieldNames);
    }
  };

  const handleSearch = () => {
    const screener = new MarketScreener(type);

    filters.forEach(f => {
      screener.where({ field: f.fieldNameWithTF, operator: f.operator, value: f.value });
    });

    if (selectedColumns.length > 0) {
      screener.select(...selectedColumns);
    }

    if (selectedMarkets.length > 0) {
      screener.setMarkets(...selectedMarkets);
    }

    if (sortField) {
      screener.sortBy(sortField, sortDir);
    }

    screener.setRange(0, Math.max(10, Math.min(5000, limit)));

    onSearch(screener);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddFilter();
  };

  const categoryInfo = FIELD_CATEGORIES.filter(c => categories.includes(c.id));
  const showMarketSelector = type === 'stock' || type === 'crypto' || type === 'coin' || type === 'futures';

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2.5">
          {/* Market Selector */}
          {showMarketSelector && (
            <div className="space-y-1">
              <Label className="text-[9px] font-mono text-muted-foreground">🌏 Market / Exchange</Label>
              <MarketSelector type={type} selectedMarkets={selectedMarkets} onMarketsChange={setSelectedMarkets} />
            </div>
          )}

          {/* Active Filters */}
          {filters.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] font-mono text-muted-foreground">Active Filters ({filters.length})</Label>
                <Button variant="ghost" size="sm" onClick={() => setFilters([])} className="h-4 text-[9px] text-destructive hover:text-destructive px-1">
                  <Trash2 className="w-2.5 h-2.5 mr-0.5" /> Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.map((filter, index) => (
                  <Badge key={index} variant="outline" className="border-terminal-green/40 text-terminal-green font-mono text-[9px] gap-0.5 py-0 px-1">
                    {filter.displayValue}
                    <X className="w-2 h-2 cursor-pointer hover:text-destructive" onClick={() => handleRemoveFilter(index)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Column Preset */}
          <div className="space-y-1">
            <Label className="text-[9px] font-mono text-muted-foreground">Column Preset</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="border-border text-[9px] font-mono h-6">
                <SelectValue placeholder="Select columns..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-[9px] font-mono">{p.label} ({p.fieldNames.length})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Config */}
          <div className="space-y-1">
            <Label className="text-[9px] font-mono text-muted-foreground">Sort By</Label>
            <div className="flex gap-1">
              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="border-border text-[9px] font-mono h-6 flex-1">
                  <SelectValue placeholder="Field..." />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none" className="text-[9px] font-mono">None</SelectItem>
                  {availableFields.slice(0, 40).map(f => (
                    <SelectItem key={f.name} value={f.name} className="text-[9px] font-mono">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="h-6 w-8 p-0 border-border"
              >
                {sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Limit */}
          <div className="space-y-1">
            <Label className="text-[9px] font-mono text-muted-foreground">Limit</Label>
            <Input
              type="number"
              min={10}
              max={5000}
              value={limit}
              onChange={e => setLimit(parseInt(e.target.value) || 150)}
              className="border-border text-[9px] font-mono h-6"
            />
          </div>

          {/* Field Search */}
          <div className="space-y-1">
            <Label className="text-[9px] font-mono text-muted-foreground">Search Fields ({availableFields.length}+)</Label>
            <Input
              placeholder="RSI, MACD, SMA, Revenue..."
              value={fieldSearch}
              onChange={e => setFieldSearch(e.target.value)}
              className="border-border text-[9px] font-mono h-6"
            />
          </div>

          {/* Category Browser */}
          {!fieldSearch && (
            <div className="space-y-0.5">
              <Label className="text-[9px] font-mono text-muted-foreground">Categories</Label>
              {categoryInfo.map(cat => {
                const isExpanded = expandedCategory === cat.id;
                const catFields = getFieldsByCategory(type, cat.id).filter(f => f.format !== 'text' && f.format !== 'date');
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                      className="w-full flex items-center gap-1 px-1 py-0.5 text-[9px] font-mono text-foreground/80 hover:bg-muted/30 rounded"
                    >
                      {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                      <span>{cat.icon}</span>
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span className="text-muted-foreground">{catFields.length}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Field List */}
          {(fieldSearch || expandedCategory) && filteredFields.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[9px] font-mono text-muted-foreground">
                {fieldSearch ? `Results (${filteredFields.length})` : `${FIELD_CATEGORIES.find(c => c.id === expandedCategory)?.label}`}
              </Label>
              <div className="max-h-28 overflow-y-auto space-y-0.5 border border-border/50 rounded p-1">
                {filteredFields.map(field => (
                  <button
                    key={field.name}
                    onClick={() => setSelectedFieldName(field.name)}
                    className={`w-full text-left px-1 py-0.5 text-[9px] font-mono rounded hover:bg-muted/40 transition-colors ${
                      selectedFieldName === field.name ? 'bg-terminal-green/10 text-terminal-green' : 'text-foreground/70'
                    }`}
                  >
                    {field.label}
                    <span className="text-muted-foreground ml-1">({field.format})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Filter */}
          <div className="space-y-1.5 border-t border-border/50 pt-2">
            <Label className="text-[9px] font-mono text-muted-foreground">Add Filter</Label>

            <Select value={selectedFieldName} onValueChange={setSelectedFieldName}>
              <SelectTrigger className="border-border text-[9px] font-mono h-6">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {(filteredFields.length > 0 ? filteredFields : availableFields.slice(0, 30)).map(field => (
                  <SelectItem key={field.name} value={field.name} className="text-[9px] font-mono">
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Timeframe selector for technical fields */}
            {isTechnicalField && (
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="border-border text-[9px] font-mono h-6">
                  <SelectValue placeholder="Timeframe: 1D (default)" />
                </SelectTrigger>
                <SelectContent>
                  {TF_OPTIONS.map(tf => (
                    <SelectItem key={tf.code || 'default'} value={tf.code || 'default'} className="text-[9px] font-mono">
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={operator} onValueChange={v => setOperator(v as FilterCondition['operator'])}>
              <SelectTrigger className="border-border text-[9px] font-mono h-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value} className="text-[9px] font-mono">{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Input
                type="number"
                placeholder={operator === 'between' ? 'Min...' : 'Value...'}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-border text-[9px] font-mono h-6"
              />
              {operator === 'between' && (
                <Input
                  type="number"
                  placeholder="Max..."
                  value={value2}
                  onChange={e => setValue2(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border-border text-[9px] font-mono h-6"
                />
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFilter}
              disabled={!selectedFieldName || !value}
              className="w-full border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 font-mono text-[9px] h-6"
            >
              <Plus className="w-2.5 h-2.5 mr-1" /> Add Filter
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Run Button */}
      <div className="p-2 border-t border-border shrink-0">
        <Button
          onClick={handleSearch}
          className="w-full bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/40 font-mono text-[10px] h-7"
        >
          <Search className="w-3 h-3 mr-1" /> RUN SCREENER
        </Button>
      </div>
    </div>
  );
};

export default ScreenerFilters;
