import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Layout, Grid2X2, Grid3X3, LayoutGrid, Check, Info } from 'lucide-react';

// Layout configurations - mimics TradingView layout selector
interface LayoutConfig {
  id: string;
  name: string;
  panels: number;
  grid: string; // CSS grid template
  icon: React.ReactNode;
}

// Generate layout icon SVG
const LayoutIcon: React.FC<{ panels: number[][]; selected?: boolean }> = ({ panels, selected }) => {
  const size = 24;
  const gap = 1;
  const rows = panels.length;
  const maxCols = Math.max(...panels.map(r => r.reduce((a, b) => a + b, 0)));
  
  const cellH = (size - (rows - 1) * gap) / rows;
  
  let elements: React.ReactNode[] = [];
  let yOffset = 0;
  
  panels.forEach((row, rowIdx) => {
    let xOffset = 0;
    const totalSpan = row.reduce((a, b) => a + b, 0);
    const cellW = (size - (row.length - 1) * gap) / row.length;
    
    row.forEach((span, colIdx) => {
      const w = (size - (row.length - 1) * gap) * (span / totalSpan);
      elements.push(
        <rect
          key={`${rowIdx}-${colIdx}`}
          x={xOffset}
          y={yOffset}
          width={w - 0.5}
          height={cellH - 0.5}
          rx={1}
          fill={selected ? '#22c55e' : '#6b7280'}
          opacity={0.8}
        />
      );
      xOffset += w + gap;
    });
    yOffset += cellH + gap;
  });
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {elements}
    </svg>
  );
};

// All layout options (1-16 panels) like TradingView
const LAYOUT_OPTIONS = [
  // Row 1: Single layouts
  { id: '1', label: '1', panels: [[1]] },
  
  // Row 2: 2-panel layouts
  { id: '2-h', label: '2', panels: [[1], [1]] },
  { id: '2-v', label: '2', panels: [[1, 1]] },
  
  // Row 3: 3-panel layouts
  { id: '3-top', label: '3', panels: [[1], [1, 1]] },
  { id: '3-bottom', label: '3', panels: [[1, 1], [1]] },
  { id: '3-left', label: '3', panels: [[1, 1], [1, 1]] },
  { id: '3-h', label: '3', panels: [[1], [1], [1]] },
  { id: '3-v', label: '3', panels: [[1, 1, 1]] },
  { id: '3-right', label: '3', panels: [[2, 1], [2, 1]] },
  { id: '3-big-left', label: '3', panels: [[1, 2], [1, 2]] },
  
  // Row 4: 4-panel layouts
  { id: '4-grid', label: '4', panels: [[1, 1], [1, 1]] },
  { id: '4-top', label: '4', panels: [[1], [1, 1, 1]] },
  { id: '4-bottom', label: '4', panels: [[1, 1, 1], [1]] },
  { id: '4-left', label: '4', panels: [[1, 1], [1, 1], [1, 1]] },
  { id: '4-right', label: '4', panels: [[2, 1], [2, 1], [2, 1]] },
  { id: '4-h', label: '4', panels: [[1], [1], [1], [1]] },
  { id: '4-v', label: '4', panels: [[1, 1, 1, 1]] },
  { id: '4-center', label: '4', panels: [[1, 2, 1]] },
  
  // Row 5: 5-panel layouts
  { id: '5-cross', label: '5', panels: [[1, 1], [1], [1, 1]] },
  { id: '5-top', label: '5', panels: [[1], [1, 1], [1, 1]] },
  { id: '5-grid', label: '5', panels: [[1, 1, 1], [1, 1]] },
  { id: '5-left', label: '5', panels: [[2, 1], [2, 1], [1, 1]] },
  { id: '5-center', label: '5', panels: [[1, 1], [2], [1, 1]] },
  { id: '5-h', label: '5', panels: [[1], [1], [1], [1], [1]] },
  
  // Row 6: 6-panel layouts
  { id: '6-grid', label: '6', panels: [[1, 1], [1, 1], [1, 1]] },
  { id: '6-top', label: '6', panels: [[1], [1, 1], [1, 1, 1]] },
  { id: '6-wide', label: '6', panels: [[1, 1, 1], [1, 1, 1]] },
  { id: '6-tall', label: '6', panels: [[1, 1], [1, 1], [1, 1]] },
  
  // Row 7: 7-8 panel layouts
  { id: '7-grid', label: '7', panels: [[1, 1], [1, 1], [1, 1, 1]] },
  { id: '8-grid', label: '8', panels: [[1, 1, 1, 1], [1, 1, 1, 1]] },
  { id: '8-top', label: '8', panels: [[1], [1, 1, 1], [1, 1, 1, 1]] },
  { id: '8-sides', label: '8', panels: [[1, 1], [1, 1], [1, 1], [1, 1]] },
  
  // Row 8-9: 9-12 panel layouts
  { id: '9-grid', label: '9', panels: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
  { id: '10-grid', label: '10', panels: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] },
  { id: '12-grid', label: '12', panels: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
  
  // Row 10: 14-16 panel layouts
  { id: '14-grid', label: '14', panels: [[1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
  { id: '16-grid', label: '16', panels: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
];

// Group layouts by row count for display
const groupedLayouts = [
  { row: 1, layouts: LAYOUT_OPTIONS.filter(l => l.id === '1') },
  { row: 2, layouts: LAYOUT_OPTIONS.filter(l => l.id.startsWith('2-')) },
  { row: 3, layouts: LAYOUT_OPTIONS.filter(l => l.id.startsWith('3-')) },
  { row: 4, layouts: LAYOUT_OPTIONS.filter(l => l.id.startsWith('4-')) },
  { row: 5, layouts: LAYOUT_OPTIONS.filter(l => l.id.startsWith('5-')) },
  { row: 6, layouts: LAYOUT_OPTIONS.filter(l => l.id.startsWith('6-')) },
  { row: 7, layouts: LAYOUT_OPTIONS.filter(l => ['7-grid', '8-grid', '8-top', '8-sides'].includes(l.id)) },
  { row: 8, layouts: LAYOUT_OPTIONS.filter(l => ['9-grid', '10-grid', '12-grid'].includes(l.id)) },
  { row: 10, layouts: LAYOUT_OPTIONS.filter(l => ['14-grid', '16-grid'].includes(l.id)) },
];

interface LayoutSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: string;
  onLayoutChange: (layoutId: string) => void;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onLayoutChange,
}) => {
  const [syncSymbol, setSyncSymbol] = useState(true);
  const [syncCrosshair, setSyncCrosshair] = useState(true);
  const [syncInterval, setSyncInterval] = useState(false);
  const [syncRange, setSyncRange] = useState(false);

  const handleSelectLayout = (layoutId: string) => {
    onLayoutChange(layoutId);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="w-[380px] sm:w-[420px] bg-card border-terminal-green/30 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-terminal-green text-sm">
            <Layout className="w-4 h-4" />
            Layout Selector
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 space-y-4">
            {/* Layout Grid */}
            <div className="space-y-2">
              {groupedLayouts.map((group, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="w-6 text-xs text-muted-foreground font-mono text-right">
                    {group.row}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {group.layouts.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => handleSelectLayout(layout.id)}
                        className={`p-1.5 rounded border transition-all hover:bg-muted/50 ${
                          currentLayout === layout.id
                            ? 'border-terminal-green bg-terminal-green/10'
                            : 'border-transparent hover:border-terminal-green/30'
                        }`}
                        title={`${layout.panels.flat().length} panels`}
                      >
                        <LayoutIcon 
                          panels={layout.panels} 
                          selected={currentLayout === layout.id}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sync Settings */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                ซิงค์ในเลย์เอาท์
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">สัญลักษณ์</Label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={syncSymbol}
                    onCheckedChange={setSyncSymbol}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">ช่วงเวลา</Label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={syncInterval}
                    onCheckedChange={setSyncInterval}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Crosshair</Label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={syncCrosshair}
                    onCheckedChange={setSyncCrosshair}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">เวลา</Label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={syncRange}
                    onCheckedChange={setSyncRange}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">ช่วงวันที่</Label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={syncRange}
                    onCheckedChange={setSyncRange}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Current: {currentLayout}</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-terminal-green"></span>
              XNGU 4.4
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LayoutSelector;
