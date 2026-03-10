import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Columns3, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { ALL_FIELDS, FieldDef, FIELD_CATEGORIES, ScreenerType } from '@/services/screener';

interface ColumnPickerProps {
  type: ScreenerType;
  activeColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const ColumnPicker = ({ type, activeColumns, onColumnsChange }: ColumnPickerProps) => {
  const [search, setSearch] = useState('');

  const allFields = useMemo(() => {
    return ALL_FIELDS.filter(f => f.screeners.includes(type));
  }, [type]);

  const grouped = useMemo(() => {
    const groups: Record<string, FieldDef[]> = {};
    const q = search.toLowerCase();
    allFields.forEach(f => {
      if (q && !f.label.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return;
      const cat = f.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
    return groups;
  }, [allFields, search]);

  const handleToggle = (fieldName: string) => {
    if (activeColumns.includes(fieldName)) {
      onColumnsChange(activeColumns.filter(c => c !== fieldName));
    } else {
      onColumnsChange([...activeColumns, fieldName]);
    }
  };

  const handleMoveUp = (fieldName: string) => {
    const idx = activeColumns.indexOf(fieldName);
    if (idx <= 0) return;
    const next = [...activeColumns];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onColumnsChange(next);
  };

  const handleMoveDown = (fieldName: string) => {
    const idx = activeColumns.indexOf(fieldName);
    if (idx < 0 || idx >= activeColumns.length - 1) return;
    const next = [...activeColumns];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onColumnsChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-[10px] font-mono border-border gap-1">
          <Columns3 className="w-3 h-3" />
          Columns
          <Badge variant="outline" className="text-[8px] px-1 py-0 border-border ml-0.5">
            {activeColumns.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-7 text-[10px] font-mono border-border"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-2">
            {Object.entries(grouped).map(([cat, fields]) => {
              const catInfo = FIELD_CATEGORIES.find(c => c.id === cat);
              return (
                <div key={cat}>
                  <div className="text-[9px] font-mono text-muted-foreground px-1 pb-0.5">
                    {catInfo?.icon} {catInfo?.label || cat}
                  </div>
                  {fields.map(field => {
                    const isActive = activeColumns.includes(field.name);
                    const idx = activeColumns.indexOf(field.name);
                    return (
                      <div key={field.name} className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-muted/30 rounded group">
                        <Checkbox
                          checked={isActive}
                          onCheckedChange={() => handleToggle(field.name)}
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-[10px] font-mono flex-1 truncate text-foreground/80">
                          {field.label}
                        </span>
                        {isActive && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                            <button onClick={() => handleMoveUp(field.name)} className="p-0.5 hover:bg-muted rounded">
                              <ChevronUp className="w-2.5 h-2.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleMoveDown(field.name)} className="p-0.5 hover:bg-muted rounded">
                              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                            </button>
                            <Badge variant="outline" className="text-[7px] px-0.5 py-0 border-border">
                              {idx + 1}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default ColumnPicker;
