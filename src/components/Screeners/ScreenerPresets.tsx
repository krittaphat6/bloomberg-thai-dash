import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  ScreenerType,
  FilterCondition,
  getStrategiesForScreener,
  getStrategyCategories,
  StrategyPreset,
} from '@/services/screener';

interface ScreenerPresetsProps {
  type: ScreenerType;
  onApply: (filters: FilterCondition[], columns: string[], sort?: { field: string; direction: 'asc' | 'desc' }) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  momentum: { label: 'Momentum', emoji: '🚀' },
  technical: { label: 'Technical Analysis', emoji: '📊' },
  volume: { label: 'Volume', emoji: '🌊' },
  value: { label: 'Value & Growth', emoji: '💰' },
  dividend: { label: 'Dividend', emoji: '💵' },
  custom: { label: 'Special', emoji: '⚡' },
};

const ScreenerPresets = ({ type, onApply }: ScreenerPresetsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const strategies = useMemo(() => getStrategiesForScreener(type), [type]);

  const groupedStrategies = useMemo(() => {
    const groups: Record<string, StrategyPreset[]> = {};
    strategies.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [strategies]);

  const handleApply = (strategy: StrategyPreset) => {
    setActiveId(strategy.id);
    const filters: FilterCondition[] = strategy.filters.map(f => ({
      field: f.field,
      operator: f.operator as FilterCondition['operator'],
      value: f.value,
    }));
    onApply(filters, strategy.columns, strategy.sort);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-2.5 space-y-3">
        <div className="text-[10px] font-mono text-muted-foreground">
          {strategies.length} strategies available for {type.toUpperCase()}
        </div>

        {Object.entries(groupedStrategies).map(([category, presets]) => {
          const catInfo = CATEGORY_LABELS[category] || { label: category, emoji: '📋' };
          return (
            <div key={category} className="space-y-1">
              <Label className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <span>{catInfo.emoji}</span> {catInfo.label}
              </Label>
              <div className="space-y-0.5">
                {presets.map(strategy => (
                  <Button
                    key={strategy.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApply(strategy)}
                    className={`w-full justify-start h-auto py-1.5 px-2 text-left ${
                      activeId === strategy.id 
                        ? 'bg-terminal-green/10 text-terminal-green border border-terminal-green/30' 
                        : 'text-foreground/70 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 w-full">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{strategy.emoji}</span>
                        <span className="text-[11px] font-mono font-medium">{strategy.label}</span>
                        <Badge variant="outline" className="ml-auto text-[8px] font-mono border-border px-1 py-0">
                          {strategy.filters.length} filters
                        </Badge>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground pl-5 leading-tight">
                        {strategy.description}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}

        {strategies.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs font-mono text-muted-foreground">No strategies for this market type</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ScreenerPresets;
