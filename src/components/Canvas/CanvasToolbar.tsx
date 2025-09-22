import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer, 
  Hand, 
  Type, 
  FileText, 
  Link2, 
  Group,
  Plus,
  Undo,
  Redo,
  Search,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';
import { useCanvasStore } from './CanvasProvider';
import { useReactFlow } from 'reactflow';

interface CanvasToolbarProps {
  currentTool: string;
  onToolChange: (tool: any) => void;
  onCreateNote: (position: { x: number; y: number }) => void;
}

export function CanvasToolbar({ currentTool, onToolChange, onCreateNote }: CanvasToolbarProps) {
  const { viewport, updateViewport } = useCanvasStore();
  const { fitView, zoomIn, zoomOut, getViewport } = useReactFlow();

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ duration: 200, padding: 0.2 });
  };

  const handleCreateNote = () => {
    const center = {
      x: viewport.x + (window.innerWidth / 2) / viewport.zoom,
      y: viewport.y + (window.innerHeight / 2) / viewport.zoom
    };
    onCreateNote(center);
  };

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select (V)' },
    { id: 'pan', icon: Hand, label: 'Pan (Space)' },
    { id: 'text', icon: Type, label: 'Add Text (T)' },
    { id: 'note', icon: FileText, label: 'Add Note (N)' },
    { id: 'connect', icon: Link2, label: 'Connect (C)' },
    { id: 'group', icon: Group, label: 'Group (G)' }
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg">
      {/* Tool Selection */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={currentTool === tool.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className="h-8 w-8 p-0"
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateNote}
          title="Add Note (Ctrl+N)"
          className="h-8 px-2"
        >
          <Plus className="h-4 w-4 mr-1" />
          Note
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs text-muted-foreground px-2 min-w-[50px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFitView}
          title="Fit View (Ctrl+0)"
          className="h-8 w-8 p-0"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* History Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          title="Undo (Ctrl+Z)"
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          title="Redo (Ctrl+Y)"
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Settings */}
      <Button
        variant="ghost"
        size="sm"
        title="Canvas Settings"
        className="h-8 w-8 p-0"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}