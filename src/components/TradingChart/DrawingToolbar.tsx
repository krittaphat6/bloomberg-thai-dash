import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Minus,
  Trash2,
  Lock,
  Unlock,
  Copy,
  MoreHorizontal,
  Palette,
} from 'lucide-react';
import { DrawingObject } from './ABLEChartEngine/types';

interface DrawingToolbarProps {
  drawing: DrawingObject;
  position: { x: number; y: number };
  onUpdate: (updates: Partial<DrawingObject>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const COLORS = [
  '#ffffff', '#ff3b30', '#ff9500', '#ffcc00',
  '#34c759', '#00c7be', '#007aff', '#5856d6',
  '#af52de', '#ff2d55', '#a2845e', '#8e8e93',
];

const LINE_WIDTHS = [1, 2, 3, 4];

const LINE_STYLES: { id: DrawingObject['lineStyle']; label: string; dash: number[] }[] = [
  { id: 'solid', label: 'Solid', dash: [] },
  { id: 'dashed', label: 'Dashed', dash: [8, 4] },
  { id: 'dotted', label: 'Dotted', dash: [2, 4] },
];

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  drawing,
  position,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const [locked, setLocked] = useState(false);

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 px-2 py-1.5 rounded-lg border shadow-xl"
      style={{
        left: position.x,
        top: position.y - 52,
        background: 'hsl(var(--card))',
        borderColor: 'hsl(var(--border))',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <div
              className="w-5 h-5 rounded-sm border border-white/20"
              style={{ backgroundColor: drawing.color }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-card border-border" side="top" sideOffset={8}>
          <div className="grid grid-cols-6 gap-1">
            {COLORS.map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded-sm border-2 transition-transform hover:scale-110 ${
                  drawing.color === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => onUpdate({ color })}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Line style */}
      {LINE_STYLES.map(style => (
        <Button
          key={style.id}
          variant={drawing.lineStyle === style.id ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onUpdate({ lineStyle: style.id })}
          title={style.label}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line
              x1="1" y1="8" x2="15" y2="8"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={style.dash.join(',')}
            />
          </svg>
        </Button>
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Line width */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs font-mono">
            <Minus className="w-3 h-3" />
            {drawing.lineWidth}px
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-card border-border" side="top" sideOffset={8}>
          <div className="flex flex-col gap-1">
            {LINE_WIDTHS.map(w => (
              <button
                key={w}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  drawing.lineWidth === w
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
                onClick={() => onUpdate({ lineWidth: w })}
              >
                <svg width="24" height="12" viewBox="0 0 24 12">
                  <line x1="0" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth={w} />
                </svg>
                {w}px
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Lock */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setLocked(!locked)}
        title={locked ? 'Unlock' : 'Lock'}
      >
        {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </Button>

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        onClick={onDelete}
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* More */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1 bg-card border-border" side="top" sideOffset={8}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={onDuplicate}
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DrawingToolbar;
