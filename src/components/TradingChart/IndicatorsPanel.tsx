import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BarChart2, X, Layers, MousePointerClick } from 'lucide-react';
import { ChartIndicator } from './types';

interface IndicatorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: ChartIndicator[];
  onToggleIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, settings: Record<string, any>) => void;
  onAddCustomIndicator: (indicator: ChartIndicator) => void;
  onRemoveIndicator: (id: string) => void;
}

const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({
  isOpen,
  onClose,
  indicators,
  onToggleIndicator,
  onUpdateIndicator,
}) => {
  const [domRows, setDomRows] = useState(20);
  
  const domIndicator = indicators.find(i => i.name === 'DOM');
  const isDOMActive = domIndicator?.visible ?? false;

  const handleDOMToggle = () => {
    if (domIndicator) {
      onToggleIndicator(domIndicator.id);
    }
  };

  const handleRowsChange = (value: number[]) => {
    setDomRows(value[0]);
    if (domIndicator) {
      onUpdateIndicator(domIndicator.id, { 
        ...domIndicator.settings, 
        rows: value[0] 
      });
    }
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
          {/* DOM Indicator Card */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-terminal-cyan/30 bg-muted/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-terminal-cyan" />
                  <span className="text-lg font-mono font-bold text-terminal-cyan">DOM</span>
                  <Badge variant="outline" className="text-[10px] border-terminal-cyan/50">
                    Depth of Market
                  </Badge>
                </div>
                <Switch
                  checked={isDOMActive}
                  onCheckedChange={handleDOMToggle}
                  className="data-[state=checked]:bg-terminal-cyan"
                />
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">
                Real-time order book depth visualization with Value Area, POC, and volume profile analysis.
              </p>

              {/* Usage Hint */}
              <div className="flex items-start gap-2 p-3 rounded bg-terminal-cyan/10 border border-terminal-cyan/20 mb-4">
                <MousePointerClick className="w-4 h-4 text-terminal-cyan mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-terminal-cyan">Click on chart</span>
                  <span className="text-muted-foreground"> to open fullscreen DOM view. Press ESC or click again to close.</span>
                </div>
              </div>

              {/* Settings */}
              {isDOMActive && (
                <div className="space-y-4 pt-4 border-t border-border">
                  {/* Rows slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Price Levels</span>
                      <span className="text-xs font-mono text-terminal-cyan">{domRows} rows</span>
                    </div>
                    <Slider
                      value={[domRows]}
                      onValueChange={handleRowsChange}
                      min={10}
                      max={30}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Feature badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[9px]">Volume Profile</Badge>
                    <Badge variant="secondary" className="text-[9px]">Value Area (70%)</Badge>
                    <Badge variant="secondary" className="text-[9px]">POC</Badge>
                    <Badge variant="secondary" className="text-[9px]">Bid/Ask Delta</Badge>
                    <Badge variant="secondary" className="text-[9px]">Imbalance</Badge>
                    <Badge variant="secondary" className="text-[9px]">Cumulative Depth</Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="p-3 rounded border border-border bg-muted/10">
              <h4 className="text-xs font-bold text-terminal-amber mb-2">📊 DOM Features</h4>
              <ul className="text-[10px] text-muted-foreground space-y-1">
                <li>• <strong className="text-terminal-green">Volume Profile</strong> - Visual histogram of order sizes</li>
                <li>• <strong className="text-terminal-amber">POC (Point of Control)</strong> - Price with highest volume</li>
                <li>• <strong className="text-terminal-amber">Value Area</strong> - 70% volume zone (VAH/VAL)</li>
                <li>• <strong className="text-terminal-green">Bid Size</strong> / <strong className="text-red-500">Ask Size</strong> - Order quantities</li>
                <li>• <strong className="text-terminal-cyan">Cumulative Depth</strong> - Running total of orders</li>
                <li>• <strong className="text-purple-400">Delta</strong> - Buy vs Sell pressure at each level</li>
              </ul>
            </div>

            {/* Data Source */}
            <div className="text-center text-[10px] text-muted-foreground pt-4">
              <span>Real-time data from Binance API</span>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default IndicatorsPanel;
