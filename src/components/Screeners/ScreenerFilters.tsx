import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { X, Plus, Search, Trash2, Zap, Columns, SlidersHorizontal } from 'lucide-react';
import {
  MarketScreener,
  ScreenerType,
  FilterCondition,
  Field,
  getNumericFields,
  getFieldCategories,
  getFieldsForType,
  getPresetsForType,
  getFilterPresetsForType,
  ColumnPreset,
  FilterPreset,
  PRESETS,
} from '@/services/ScreenerService';

interface ScreenerFiltersProps {
  type: ScreenerType;
  onSearch: (screener: MarketScreener) => void;
  onColumnsChange?: (fields: Field[]) => void;
  activePreset?: string;
  onPresetChange?: (preset: ColumnPreset) => void;
}

interface ActiveFilter {
  field: Field;
  operator: string;
  value: number;
  displayValue: string;
}

const ScreenerFilters = ({ type, onSearch, onColumnsChange, onPresetChange }: ScreenerFiltersProps) => {
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [selectedFieldName, setSelectedFieldName] = useState<string>('');
  const [operator, setOperator] = useState<string>('>');
  const [value, setValue] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [resultLimit, setResultLimit] = useState<number>(150);

  const numericFields = getNumericFields(type);
  const categories = getFieldCategories(type);
  const columnPresets = getPresetsForType(type);
  const filterPresets = getFilterPresetsForType(type);

  // Reset filters when type changes
  useEffect(() => {
    setFilters([]);
    setSelectedFieldName('');
    setFieldSearch('');
    setSelectedCategory('all');
    setSortField('');
  }, [type]);

  const filteredFields = numericFields.filter(f => {
    const matchSearch = !fieldSearch || f.label.toLowerCase().includes(fieldSearch.toLowerCase()) || f.name.toLowerCase().includes(fieldSearch.toLowerCase());
    const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleAddFilter = () => {
    const selectedField = numericFields.find(f => f.name === selectedFieldName);
    if (!selectedField || !value) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    setFilters(prev => [...prev, {
      field: selectedField,
      operator: operator as ActiveFilter['operator'],
      value: numValue,
      displayValue: `${selectedField.label} ${operator} ${value}`
    }]);
    setValue('');
  };

  const handleApplyFilterPreset = (preset: FilterPreset) => {
    const newFilters: ActiveFilter[] = preset.filters.map(f => {
      const field = numericFields.find(nf => nf.name === f.field) || new Field(f.field, 'number', f.field);
      return {
        field,
        operator: f.operator as string,
        value: f.value as number,
        displayValue: `${field.label} ${f.operator} ${f.value}`
      };
    });
    setFilters(newFilters);
  };

  const handleSearch = useCallback(() => {
    const screener = new MarketScreener(type);
    filters.forEach(f => {
      screener.where({ field: f.field.name, operator: f.operator as FilterCondition['operator'], value: f.value });
    });
    if (sortField) {
      const sf = numericFields.find(f => f.name === sortField);
      if (sf) screener.orderBy(sf, sortDir);
    }
    screener.limit(resultLimit);
    onSearch(screener);
  }, [type, filters, sortField, sortDir, resultLimit, numericFields, onSearch]);

  const handleColumnPreset = (preset: ColumnPreset) => {
    onPresetChange?.(preset);
    onColumnsChange?.(preset.fields);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-terminal-green" />
        <h3 className="text-xs font-mono font-bold text-foreground">FILTERS & COLUMNS</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <Accordion type="multiple" defaultValue={['filters', 'presets', 'columns']} className="space-y-1">
            
            {/* Active Filters */}
            <AccordionItem value="filters" className="border-border/50">
              <AccordionTrigger className="text-xs font-mono text-terminal-green hover:no-underline py-2">
                Active Filters ({filters.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                {filters.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {filters.map((filter, index) => (
                        <Badge key={index} variant="outline" className="border-terminal-green/40 text-terminal-green font-mono text-[10px] gap-1 py-0.5">
                          {filter.displayValue}
                          <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" onClick={() => setFilters(prev => prev.filter((_, i) => i !== index))} />
                        </Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFilters([])} className="h-5 text-[10px] text-destructive hover:text-destructive p-1">
                      <Trash2 className="w-2.5 h-2.5 mr-1" /> Clear
                    </Button>
                  </div>
                )}

                {/* Add filter form */}
                <div className="space-y-1.5">
                  <Input
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={e => setFieldSearch(e.target.value)}
                    className="h-7 border-border text-[10px] font-mono"
                  />

                  <div className="flex gap-1">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-7 border-border text-[10px] font-mono flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-[10px] font-mono">All Categories</SelectItem>
                        {categories.map(c => (
                          <SelectItem key={c} value={c} className="text-[10px] font-mono capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={selectedFieldName} onValueChange={setSelectedFieldName}>
                    <SelectTrigger className="h-7 border-border text-[10px] font-mono">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {filteredFields.map(field => (
                        <SelectItem key={field.name} value={field.name} className="text-[10px] font-mono">
                          <span className="text-muted-foreground">[{field.category}]</span> {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-1">
                    <Select value={operator} onValueChange={setOperator}>
                      <SelectTrigger className="h-7 border-border text-[10px] font-mono w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">" className="text-[10px] font-mono">&gt;</SelectItem>
                        <SelectItem value="<" className="text-[10px] font-mono">&lt;</SelectItem>
                        <SelectItem value=">=" className="text-[10px] font-mono">&gt;=</SelectItem>
                        <SelectItem value="<=" className="text-[10px] font-mono">&lt;=</SelectItem>
                        <SelectItem value="=" className="text-[10px] font-mono">=</SelectItem>
                        <SelectItem value="!=" className="text-[10px] font-mono">≠</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddFilter()}
                      className="h-7 border-border text-[10px] font-mono flex-1" />
                    <Button variant="outline" size="sm" onClick={handleAddFilter} disabled={!selectedFieldName || !value}
                      className="h-7 px-2 border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Filter Presets */}
            <AccordionItem value="presets" className="border-border/50">
              <AccordionTrigger className="text-xs font-mono text-terminal-cyan hover:no-underline py-2">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Quick Strategies</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-1 pb-3">
                {filterPresets.map(preset => (
                  <Button key={preset.name} variant="ghost" size="sm"
                    className="w-full justify-start text-[10px] font-mono text-terminal-cyan hover:bg-terminal-cyan/10 h-7 gap-1"
                    onClick={() => handleApplyFilterPreset(preset)}>
                    <span>{preset.emoji}</span>
                    <span className="truncate">{preset.label}</span>
                  </Button>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Column Presets */}
            <AccordionItem value="columns" className="border-border/50">
              <AccordionTrigger className="text-xs font-mono text-terminal-amber hover:no-underline py-2">
                <span className="flex items-center gap-1"><Columns className="w-3 h-3" /> Column Presets</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-1 pb-3">
                {columnPresets.map(preset => (
                  <Button key={preset.name} variant="ghost" size="sm"
                    className="w-full justify-start text-[10px] font-mono text-terminal-amber hover:bg-terminal-amber/10 h-7"
                    onClick={() => handleColumnPreset(preset)}>
                    {preset.label} ({preset.fields.length} cols)
                  </Button>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Sort & Limit */}
            <AccordionItem value="sort" className="border-border/50">
              <AccordionTrigger className="text-xs font-mono text-muted-foreground hover:no-underline py-2">
                Sort & Limit
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="h-7 border-border text-[10px] font-mono">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="none" className="text-[10px] font-mono">None</SelectItem>
                    {numericFields.slice(0, 30).map(f => (
                      <SelectItem key={f.name} value={f.name} className="text-[10px] font-mono">{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button variant={sortDir === 'desc' ? 'default' : 'outline'} size="sm"
                    className="h-6 text-[10px] font-mono flex-1" onClick={() => setSortDir('desc')}>DESC</Button>
                  <Button variant={sortDir === 'asc' ? 'default' : 'outline'} size="sm"
                    className="h-6 text-[10px] font-mono flex-1" onClick={() => setSortDir('asc')}>ASC</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">Limit:</Label>
                  <Input type="number" value={resultLimit} onChange={e => setResultLimit(parseInt(e.target.value) || 50)}
                    className="h-7 border-border text-[10px] font-mono w-20" min={1} max={5000} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <Button onClick={handleSearch}
          className="w-full bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30 border border-terminal-green/40 font-mono text-xs h-9">
          <Search className="w-4 h-4 mr-2" /> RUN SCREENER
        </Button>
      </div>
    </div>
  );
};

export default ScreenerFilters;
