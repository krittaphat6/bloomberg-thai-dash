import { TacticalUnit, UNIT_CONFIGS, AFFILIATION_COLORS } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  ChevronRight, 
  Radio, 
  Shield, 
  Crosshair, 
  Move,
  AlertTriangle,
  Signal
} from 'lucide-react';

interface UnitListPanelProps {
  units: TacticalUnit[];
  selectedUnitId?: string;
  onSelectUnit: (unit: TacticalUnit) => void;
  filter?: 'all' | 'friendly' | 'hostile';
}

export const UnitListPanel = ({
  units,
  selectedUnitId,
  onSelectUnit,
  filter = 'all',
}: UnitListPanelProps) => {
  const filteredUnits = units.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'friendly') return u.affiliation === 'friendly';
    if (filter === 'hostile') return u.affiliation === 'hostile';
    return true;
  });

  const friendlyUnits = filteredUnits.filter(u => u.affiliation === 'friendly');
  const hostileUnits = filteredUnits.filter(u => u.affiliation === 'hostile');

  const renderUnitItem = (unit: TacticalUnit) => {
    const config = UNIT_CONFIGS[unit.type];
    const isSelected = unit.id === selectedUnitId;
    const affiliationColor = AFFILIATION_COLORS[unit.affiliation];

    return (
      <div
        key={unit.id}
        onClick={() => onSelectUnit(unit)}
        className={cn(
          "flex items-center gap-3 p-2 rounded cursor-pointer transition-all",
          "hover:bg-accent/50",
          isSelected ? "bg-primary/20 border border-primary/50" : "border border-transparent"
        )}
      >
        {/* Unit Icon */}
        <div 
          className="w-8 h-8 rounded flex items-center justify-center text-lg"
          style={{ backgroundColor: `${affiliationColor.fill}20` }}
        >
          {config.icon}
        </div>

        {/* Unit Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground truncate">
              {unit.callsign}
            </span>
            {unit.status === 'engaging' && (
              <Crosshair className="w-3 h-3 text-destructive animate-pulse" />
            )}
            {unit.status === 'moving' && (
              <Move className="w-3 h-3 text-primary animate-pulse" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {unit.name}
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-end gap-1">
          <Progress 
            value={unit.strength} 
            className="w-12 h-1.5"
          />
          <span className="text-[9px] text-muted-foreground">
            {Math.round(unit.strength)}%
          </span>
        </div>

        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/50 border-r border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-foreground">
            UNIT TRACKER
          </span>
          <Badge variant="outline" className="text-[10px]">
            {filteredUnits.length} units
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Friendly Forces */}
          {friendlyUnits.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-2">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-mono text-primary font-bold">
                  FRIENDLY FORCES ({friendlyUnits.length})
                </span>
              </div>
              <div className="space-y-1">
                {friendlyUnits.map(renderUnitItem)}
              </div>
            </div>
          )}

          {/* Hostile Forces */}
          {hostileUnits.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-mono text-destructive font-bold">
                  HOSTILE FORCES ({hostileUnits.length})
                </span>
              </div>
              <div className="space-y-1">
                {hostileUnits.map(renderUnitItem)}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Status Bar */}
      <div className="px-3 py-2 border-t border-border bg-card/80 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Signal className="w-3 h-3 text-primary" />
        <span>Live tracking active</span>
      </div>
    </div>
  );
};
