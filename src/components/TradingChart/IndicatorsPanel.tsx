import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BarChart2, TrendingUp, Activity, Settings, X, Plus } from 'lucide-react';
import { ChartIndicator, DEFAULT_INDICATORS } from './types';

interface IndicatorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: ChartIndicator[];
  onToggleIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, settings: Record<string, any>) => void;
  onAddCustomIndicator: (indicator: ChartIndicator) => void;
  onRemoveIndicator: (id: string) => void;
}

const INDICATOR_CATEGORIES = [
  {
    name: 'Moving Averages',
    icon: TrendingUp,
    indicators: ['SMA 20', 'SMA 50', 'SMA 200', 'EMA 9', 'EMA 21'],
  },
  {
    name: 'Volatility',
    icon: Activity,
    indicators: ['Bollinger Bands'],
  },
  {
    name: 'Oscillators',
    icon: BarChart2,
    indicators: ['RSI', 'MACD', 'Stochastic', 'CVD'],
  },
  {
    name: 'Volume',
    icon: BarChart2,
    indicators: ['Volume'],
  },
];

const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({
  isOpen,
  onClose,
  indicators,
  onToggleIndicator,
  onUpdateIndicator,
  onAddCustomIndicator,
  onRemoveIndicator,
}) => {
  const [editingIndicator, setEditingIndicator] = useState<string | null>(null);

  const getIndicatorByName = (name: string) => {
    return indicators.find(i => i.name === name);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[350px] bg-card border-l border-terminal-green/30">
        <SheetHeader>
          <SheetTitle className="text-terminal-green font-mono flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Indicators
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {/* Active indicators */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Indicators</h3>
            <div className="space-y-2">
              {indicators.filter(i => i.visible).map(indicator => (
                <div
                  key={indicator.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 border border-terminal-green/20"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: indicator.color }}
                    />
                    <span className="text-sm font-mono">{indicator.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {indicator.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setEditingIndicator(
                        editingIndicator === indicator.id ? null : indicator.id
                      )}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => onToggleIndicator(indicator.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {indicators.filter(i => i.visible).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active indicators
                </p>
              )}
            </div>
          </div>

          {/* Edit indicator settings */}
          {editingIndicator && (
            <div className="mb-6 p-3 rounded border border-terminal-green/30 bg-muted/20">
              <h4 className="text-sm font-medium mb-3">
                {indicators.find(i => i.id === editingIndicator)?.name} Settings
              </h4>
              {Object.entries(
                indicators.find(i => i.id === editingIndicator)?.settings || {}
              ).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 mb-2">
                  <Label className="w-20 text-xs capitalize">{key}</Label>
                  <Input
                    type="number"
                    value={value as number}
                    onChange={e =>
                      onUpdateIndicator(editingIndicator, {
                        ...indicators.find(i => i.id === editingIndicator)?.settings,
                        [key]: parseFloat(e.target.value),
                      })
                    }
                    className="h-7 text-xs"
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setEditingIndicator(null)}
              >
                Done
              </Button>
            </div>
          )}

          {/* Available indicators */}
          <Accordion type="multiple" className="w-full">
            {INDICATOR_CATEGORIES.map(category => (
              <AccordionItem key={category.name} value={category.name}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <category.icon className="w-4 h-4 text-terminal-green" />
                    {category.name}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pl-6">
                    {category.indicators.map(indName => {
                      const indicator = getIndicatorByName(indName);
                      const isActive = indicator?.visible;

                      return (
                        <div
                          key={indName}
                          className="flex items-center justify-between py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: indicator?.color || '#3b82f6',
                              }}
                            />
                            <span className="text-sm">{indName}</span>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => {
                              if (indicator) {
                                onToggleIndicator(indicator.id);
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Custom indicator */}
          <div className="mt-6 pt-4 border-t border-terminal-green/20">
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => {
                const customId = `custom-${Date.now()}`;
                onAddCustomIndicator({
                  id: customId,
                  name: 'Custom Indicator',
                  type: 'overlay',
                  visible: true,
                  settings: {},
                  color: '#f97316',
                  pineScript: '',
                });
              }}
            >
              <Plus className="w-4 h-4" />
              Add Custom (Pine Script)
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default IndicatorsPanel;
