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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart2, X, Layers, MousePointerClick, Grid3X3, Monitor, Zap, Activity, TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { ChartIndicator } from './types';

interface ChartPanel {
  id: string;
  label: string;
}

interface IndicatorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: ChartIndicator[];
  onToggleIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, settings: Record<string, any>) => void;
  onAddCustomIndicator: (indicator: ChartIndicator) => void;
  onRemoveIndicator: (id: string) => void;
  chartPanels?: ChartPanel[];  // Available chart panels
  selectedDOMPanel?: string;   // Which panel shows DOM
  onSelectDOMPanel?: (panelId: string) => void;  // Callback to change DOM panel
  onDOMClose?: () => void;  // Close DOM view
  isDOMFullscreen?: boolean;  // Is DOM currently in fullscreen mode
}

const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({
  isOpen,
  onClose,
  indicators,
  onToggleIndicator,
  onUpdateIndicator,
  onAddCustomIndicator,
  chartPanels = [{ id: 'main', label: 'Main Chart' }],
  selectedDOMPanel = 'main',
  onSelectDOMPanel,
  onDOMClose,
  isDOMFullscreen = false,
}) => {
  const [domRows, setDomRows] = useState(25);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(true);
  
  const domIndicator = indicators.find(i => i.name === 'DOM');
  const isDOMActive = domIndicator?.visible ?? false;

  const handleDOMToggle = () => {
    // TradingView-like behavior: if DOM was removed, toggling re-adds it to the active panel
    if (domIndicator) {
      onToggleIndicator(domIndicator.id);
      return;
    }

    onAddCustomIndicator({
      id: `dom-${Date.now()}`,
      name: 'DOM',
      type: 'dom',
      visible: true,
      settings: {
        rows: domRows,
        showImbalance: true,
        showProfile: true,
        showValueArea: true,
      },
      color: '#00BCD4',
    });
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

  const handlePanelChange = (panelId: string) => {
    onSelectDOMPanel?.(panelId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={false}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-[380px] bg-card border-l border-terminal-green/30"
      >
        <SheetHeader>
          <SheetTitle className="text-terminal-green font-mono flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Indicators
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          <div className="space-y-4">
            {/* OI Bubbles Indicator Card */}
            <div className="p-4 rounded-lg border border-terminal-amber/30 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-terminal-amber" />
                  <span className="text-lg font-mono font-bold text-terminal-amber">OI Bubbles</span>
                  <Badge variant="outline" className="text-[10px] border-terminal-amber/50">
                    Crypto
                  </Badge>
                </div>
                <Switch
                  checked={indicators.some(i => i.name === 'OI Bubbles' && i.visible)}
                  onCheckedChange={() => {
                    const oiBubbles = indicators.find(i => i.name === 'OI Bubbles');
                    if (oiBubbles) {
                      onToggleIndicator(oiBubbles.id);
                    } else {
                      onAddCustomIndicator({
                        id: `oi-bubbles-${Date.now()}`,
                        name: 'OI Bubbles',
                        type: 'overlay',
                        visible: true,
                        settings: {
                          threshold: 1.5,
                          extremeThreshold: 3.0,
                          showPositive: true,
                          showNegative: true,
                        },
                        color: '#FFB800',
                      });
                    }
                  }}
                  className="data-[state=checked]:bg-terminal-amber"
                />
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Open Interest bubbles show accumulation/liquidation zones based on Z-Score analysis. 
                <span className="text-terminal-green"> Green = Accumulation</span>,
                <span className="text-terminal-red"> Red = Liquidation</span>.
              </p>

              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[9px]">Z-Score</Badge>
                <Badge variant="secondary" className="text-[9px]">Binance Futures</Badge>
                <Badge variant="secondary" className="text-[9px]">Real-time OI</Badge>
              </div>
            </div>

            {/* DOM Indicator Card */}
            <div className="p-4 rounded-lg border border-terminal-cyan/30 bg-muted/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-terminal-cyan" />
                  <span className="text-lg font-mono font-bold text-terminal-cyan">DOM</span>
                  <Badge variant="outline" className="text-[10px] border-terminal-cyan/50">
                    Pro
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isDOMFullscreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDOMClose}
                      className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                  )}
                  <Switch
                    checked={isDOMActive}
                    onCheckedChange={handleDOMToggle}
                    className="data-[state=checked]:bg-terminal-cyan"
                  />
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">
                Professional Depth of Market with real-time order flow, liquidity analysis, and whale detection.
              </p>

              {/* Layout/Panel Selector - Always show when DOM is enabled */}
              <div className="mb-4 space-y-3">
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Grid3X3 className="w-3 h-3" />
                  Layout & Display Panel:
                </label>
                
                {/* Layout Grid Selection */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: '1', label: '1', grid: '1×1' },
                    { id: '2', label: '2', grid: '1×2' },
                    { id: '4', label: '4', grid: '2×2' },
                    { id: '6', label: '6', grid: '2×3' },
                  ].map((layout) => (
                    <Button
                      key={layout.id}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // If there's more than 1 panel, we can select which one to show DOM
                        if (parseInt(layout.id) > 1) {
                          onSelectDOMPanel?.('panel-0');
                        } else {
                          onSelectDOMPanel?.('main');
                        }
                      }}
                      className={`h-8 text-[10px] ${
                        chartPanels.length === parseInt(layout.id) 
                          ? 'border-terminal-cyan bg-terminal-cyan/20' 
                          : 'border-border'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <Grid3X3 className="w-3 h-3 mb-0.5" />
                        <span>{layout.grid}</span>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Panel Selector - Show when multi-chart is active */}
                {chartPanels.length > 1 && (
                  <Select value={selectedDOMPanel} onValueChange={handlePanelChange}>
                    <SelectTrigger className="h-8 text-xs bg-muted/50 border-terminal-cyan/30">
                      <SelectValue placeholder="Select panel for DOM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          All Panels
                        </span>
                      </SelectItem>
                      {chartPanels.map((panel) => (
                        <SelectItem key={panel.id} value={panel.id}>
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            {panel.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Current Layout Status */}
                <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground">Current Layout:</span>
                  <Badge variant="outline" className="text-[10px] border-terminal-cyan/50">
                    {chartPanels.length} Panel{chartPanels.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

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
                      max={40}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Advanced metrics toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Advanced Metrics
                    </span>
                    <Switch
                      checked={showAdvancedMetrics}
                      onCheckedChange={setShowAdvancedMetrics}
                      className="data-[state=checked]:bg-terminal-amber"
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

            {/* Enhanced Pro Features */}
            {isDOMActive && showAdvancedMetrics && (
              <div className="p-4 rounded-lg border border-terminal-amber/30 bg-muted/20">
                <h4 className="text-sm font-bold text-terminal-amber mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Pro Trading Metrics
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      Whale Buys
                    </div>
                    <div className="text-sm font-bold text-green-500">Tracked</div>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                      Whale Sells
                    </div>
                    <div className="text-sm font-bold text-red-500">Tracked</div>
                  </div>
                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Activity className="w-3 h-3 text-blue-500" />
                      Liquidity Zones
                    </div>
                    <div className="text-sm font-bold text-blue-500">Active</div>
                  </div>
                  <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <DollarSign className="w-3 h-3 text-purple-500" />
                      Smart Money
                    </div>
                    <div className="text-sm font-bold text-purple-500">Detected</div>
                  </div>
                </div>
              </div>
            )}

            {/* Pro DOM Features Info */}
            <div className="p-3 rounded border border-border bg-muted/10">
              <h4 className="text-xs font-bold text-terminal-amber mb-2">📊 Pro DOM Features</h4>
              <ul className="text-[10px] text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-1">
                  <span className="text-terminal-green">•</span>
                  <span><strong className="text-terminal-green">Volume Profile</strong> - Visual histogram of order sizes at each price level</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-terminal-amber">•</span>
                  <span><strong className="text-terminal-amber">POC (Point of Control)</strong> - Price with the highest accumulated volume</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-terminal-amber">•</span>
                  <span><strong className="text-terminal-amber">Value Area</strong> - 70% volume zone (VAH/VAL) for support/resistance</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-terminal-cyan">•</span>
                  <span><strong className="text-terminal-cyan">Cumulative Depth</strong> - Running total of orders above/below</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-purple-400">•</span>
                  <span><strong className="text-purple-400">Delta</strong> - Buy vs Sell pressure at each price level</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong className="text-blue-400">Large Orders</strong> - Whale activity detection (10x+ average)</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-pink-400">•</span>
                  <span><strong className="text-pink-400">Imbalance</strong> - Bid/Ask pressure for trend prediction</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-yellow-400">•</span>
                  <span><strong className="text-yellow-400">Liquidity Zones</strong> - Where large orders are concentrated</span>
                </li>
              </ul>
            </div>

            {/* Alert: DOM only works with Crypto */}
            <div className="flex items-start gap-2 p-3 rounded bg-terminal-amber/10 border border-terminal-amber/30">
              <AlertTriangle className="w-4 h-4 text-terminal-amber flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-muted-foreground">
                <span className="font-bold text-terminal-amber">Note:</span> DOM requires real-time order book data. Currently available for <strong>Crypto pairs</strong> via Binance.
              </div>
            </div>

            {/* Data Source */}
            <div className="text-center text-[10px] text-muted-foreground pt-4 flex items-center justify-center gap-2">
              <Activity className="w-3 h-3 text-terminal-green animate-pulse" />
              <span>Real-time data from Binance API</span>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default IndicatorsPanel;
