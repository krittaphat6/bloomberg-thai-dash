import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  Minus,
  Hash,
  ArrowUpRight,
  Square,
  Triangle,
  Type,
  Trash2,
  BarChart2,
  Settings,
  Maximize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  Code,
  Bell,
  Layout,
  Save,
  Camera,
} from 'lucide-react';
import { Timeframe } from '@/services/ChartDataService';

interface ChartToolbarProps {
  selectedDrawingTool: string | null;
  onSelectDrawingTool: (tool: string | null) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onToggleIndicators: () => void;
  onTogglePineScript: () => void;
  onToggleAlerts: () => void;
  onToggleMultiChart: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
  onClearDrawings: () => void;
  onSaveChart: () => void;
  onScreenshot: () => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

const DRAWING_TOOLS = [
  { id: 'trendline', icon: TrendingUp, label: 'Trend Line' },
  { id: 'horizontal', icon: Minus, label: 'Horizontal Line' },
  { id: 'vertical', icon: Hash, label: 'Vertical Line' },
  { id: 'fibonacci', icon: ArrowUpRight, label: 'Fibonacci' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'text', icon: Type, label: 'Text' },
];

const ChartToolbar: React.FC<ChartToolbarProps> = ({
  selectedDrawingTool,
  onSelectDrawingTool,
  timeframe,
  onTimeframeChange,
  onToggleIndicators,
  onTogglePineScript,
  onToggleAlerts,
  onToggleMultiChart,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onFullscreen,
  onClearDrawings,
  onSaveChart,
  onScreenshot,
}) => {
  return (
    <div className="flex items-center gap-1 p-2 bg-card/50 border-b border-terminal-green/20">
      {/* Timeframe selector */}
      <div className="flex items-center gap-0.5 mr-2">
        {TIMEFRAMES.map(tf => (
          <Button
            key={tf}
            variant={timeframe === tf ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 px-2 text-xs font-mono ${
              timeframe === tf 
                ? 'bg-terminal-green text-black' 
                : 'text-terminal-green hover:bg-terminal-green/20'
            }`}
            onClick={() => onTimeframeChange(tf)}
          >
            {tf}
          </Button>
        ))}
      </div>

      <div className="w-px h-6 bg-terminal-green/20" />

      {/* Drawing tools */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-terminal-green">
            {selectedDrawingTool ? (
              <>
                {DRAWING_TOOLS.find(t => t.id === selectedDrawingTool)?.icon && 
                  React.createElement(DRAWING_TOOLS.find(t => t.id === selectedDrawingTool)!.icon, { className: 'w-4 h-4' })}
                <span className="text-xs">{DRAWING_TOOLS.find(t => t.id === selectedDrawingTool)?.label}</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Draw</span>
              </>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-terminal-green/30">
          {DRAWING_TOOLS.map(tool => (
            <DropdownMenuItem
              key={tool.id}
              onClick={() => onSelectDrawingTool(selectedDrawingTool === tool.id ? null : tool.id)}
              className={`gap-2 ${selectedDrawingTool === tool.id ? 'bg-terminal-green/20' : ''}`}
            >
              <tool.icon className="w-4 h-4" />
              {tool.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClearDrawings} className="gap-2 text-red-500">
            <Trash2 className="w-4 h-4" />
            Clear All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Indicators */}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-terminal-green" onClick={onToggleIndicators}>
        <BarChart2 className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Indicators</span>
      </Button>

      {/* Pine Script */}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-terminal-cyan" onClick={onTogglePineScript}>
        <Code className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Pine</span>
      </Button>

      {/* Alerts */}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-terminal-amber" onClick={onToggleAlerts}>
        <Bell className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Alerts</span>
      </Button>

      {/* Multi-chart */}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-terminal-green" onClick={onToggleMultiChart}>
        <Layout className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Layout</span>
      </Button>

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-terminal-green" onClick={onZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-terminal-green" onClick={onZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-terminal-green" onClick={onResetZoom}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-terminal-green/20" />

      {/* Actions */}
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-terminal-green" onClick={onScreenshot}>
        <Camera className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-terminal-green" onClick={onSaveChart}>
        <Save className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-terminal-green" onClick={onFullscreen}>
        <Maximize className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ChartToolbar;
