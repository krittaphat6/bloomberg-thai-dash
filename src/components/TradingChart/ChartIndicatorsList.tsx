// ChartIndicatorsList - Shows active indicators on chart like TradingView
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Eye, EyeOff, Settings, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { ChartIndicator } from './types';
import { cn } from '@/lib/utils';

interface ChartIndicatorsListProps {
  indicators: ChartIndicator[];
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onSettings?: (id: string) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ChartIndicatorsList: React.FC<ChartIndicatorsListProps> = ({
  indicators,
  onToggleVisibility,
  onRemove,
  onSettings,
  className,
  collapsed = false,
  onToggleCollapse,
}) => {
  // Filter only visible or recently added indicators
  const activeIndicators = indicators.filter(ind => ind.visible || ind.name === 'DOM');

  if (activeIndicators.length === 0) return null;

  return (
    <div 
      className={cn(
        "absolute top-2 left-2 z-20 bg-card/95 backdrop-blur-sm rounded-lg border border-border shadow-lg overflow-hidden",
        "min-w-[180px] max-w-[280px]",
        className
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted/70"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Indicators ({activeIndicators.length})
          </span>
        </div>
        {onToggleCollapse && (
          <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
            {collapsed ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>

      {/* Indicators List */}
      {!collapsed && (
        <div className="max-h-[200px] overflow-y-auto">
          {activeIndicators.map((indicator) => (
            <div
              key={indicator.id}
              className={cn(
                "group flex items-center justify-between px-2 py-1 hover:bg-muted/30 border-b border-border/50 last:border-0",
                !indicator.visible && "opacity-50"
              )}
            >
              {/* Indicator Name with Color */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: indicator.color }}
                />
                <span className="text-xs font-mono truncate" style={{ color: indicator.color }}>
                  {indicator.name}
                </span>
                {indicator.type === 'dom' && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-terminal-cyan/20 text-terminal-cyan">
                    PRO
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Visibility Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(indicator.id);
                  }}
                  title={indicator.visible ? 'Hide' : 'Show'}
                >
                  {indicator.visible ? (
                    <Eye className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>

                {/* Settings */}
                {onSettings && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSettings(indicator.id);
                    }}
                    title="Settings"
                  >
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </Button>
                )}

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(indicator.id);
                  }}
                  title="Remove"
                >
                  <X className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartIndicatorsList;
