import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  FileText, 
  Image, 
  Group, 
  Copy, 
  Trash2,
  Link2,
  Palette,
  Move3D
} from 'lucide-react';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateNote: (position: { x: number; y: number }) => void;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

export function CanvasContextMenu({ 
  x, 
  y, 
  onClose, 
  onCreateNote, 
  screenToFlowPosition 
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCreateText = () => {
    const position = screenToFlowPosition({ x, y });
    // Create text node logic here
    onClose();
  };

  const handleCreateNote = () => {
    const position = screenToFlowPosition({ x, y });
    onCreateNote(position);
    onClose();
  };

  const handleCreateImage = () => {
    const position = screenToFlowPosition({ x, y });
    // Create image node logic here
    onClose();
  };

  const handleCreateGroup = () => {
    const position = screenToFlowPosition({ x, y });
    // Create group node logic here
    onClose();
  };

  return (
    <Card 
      ref={menuRef}
      className="fixed z-50 p-2 min-w-48 bg-background/95 backdrop-blur border border-border shadow-lg"
      style={{ 
        left: x, 
        top: y,
        transform: 'translate(0, 0)'
      }}
    >
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground px-2 py-1">
          Add to Canvas
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateText}
          className="w-full justify-start h-8"
        >
          <Type className="h-4 w-4 mr-2" />
          Text Node
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateNote}
          className="w-full justify-start h-8"
        >
          <FileText className="h-4 w-4 mr-2" />
          Note
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateImage}
          className="w-full justify-start h-8"
        >
          <Image className="h-4 w-4 mr-2" />
          Image
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateGroup}
          className="w-full justify-start h-8"
        >
          <Group className="h-4 w-4 mr-2" />
          Group
        </Button>

        <Separator className="my-1" />
        
        <div className="text-xs text-muted-foreground px-2 py-1">
          Actions
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8"
        >
          <Copy className="h-4 w-4 mr-2" />
          Paste Here
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Create Connection
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8"
        >
          <Palette className="h-4 w-4 mr-2" />
          Change Background
        </Button>

        <Separator className="my-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>
      </div>
    </Card>
  );
}