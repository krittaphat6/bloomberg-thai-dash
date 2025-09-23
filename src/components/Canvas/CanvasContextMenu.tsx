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
import { Node } from 'reactflow';
import { TextNodeData, FileNodeData, GroupNodeData, ImageNodeData } from '@/types/canvas';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateNote: (note: any) => void;
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  addNode: (node: any) => void;
  selectedNodes: Node[];
  onDeleteSelected: () => void;
  clipboard: any[];
  setTool: (tool: string) => void;
}

export function CanvasContextMenu({ 
  x, 
  y, 
  onClose, 
  onCreateNote,
  screenToFlowPosition,
  setNodes,
  addNode,
  selectedNodes,
  onDeleteSelected,
  clipboard,
  setTool
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
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

  const handleCreateTextNode = () => {
    const position = screenToFlowPosition({ x, y });
    const textNode: TextNodeData = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Double-click to edit',
      x: position.x,
      y: position.y,
      width: 200,
      height: 100,
      fontSize: 14,
      textAlign: 'left'
    };
    
    const reactFlowNode: Node = {
      id: textNode.id,
      type: 'text',
      position: { x: textNode.x, y: textNode.y },
      data: textNode,
      style: { width: textNode.width, height: textNode.height }
    };
    
    setNodes(nds => [...nds, reactFlowNode]);
    addNode(textNode);
    onClose();
  };

  const handleCreateNote = () => {
    const position = screenToFlowPosition({ x, y });
    const newNote = {
      id: `note-${Date.now()}`,
      title: 'Canvas Note',
      content: '# New Canvas Note\n\nStart writing here...',
      tags: ['canvas'],
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: [],
      isFavorite: false,
      folder: undefined
    };
    
    onCreateNote(newNote);
    
    const fileNode: FileNodeData = {
      id: `file-${Date.now()}`,
      type: 'file',
      x: position.x,
      y: position.y,
      width: 250,
      height: 150,
      file: newNote.id,
      preview: true
    };
    
    const reactFlowNode: Node = {
      id: fileNode.id,
      type: 'file',
      position: { x: fileNode.x, y: fileNode.y },
      data: { ...fileNode, note: newNote },
      style: { width: fileNode.width, height: fileNode.height }
    };
    
    setNodes(nds => [...nds, reactFlowNode]);
    addNode(fileNode);
    onClose();
  };

  const handleCreateImage = () => {
    const position = screenToFlowPosition({ x, y });
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageNode: ImageNodeData = {
            id: `image-${Date.now()}`,
            type: 'image',
            x: position.x,
            y: position.y,
            width: 300,
            height: 200,
            file: file.name,
            url: event.target?.result as string,
            alt: file.name
          };
          
          const reactFlowNode: Node = {
            id: imageNode.id,
            type: 'image',
            position: { x: imageNode.x, y: imageNode.y },
            data: imageNode,
            style: { width: imageNode.width, height: imageNode.height }
          };
          
          setNodes(nds => [...nds, reactFlowNode]);
          addNode(imageNode);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
    onClose();
  };

  const handleCreateGroup = () => {
    const position = screenToFlowPosition({ x, y });
    const groupNode: GroupNodeData = {
      id: `group-${Date.now()}`,
      type: 'group',
      x: position.x,
      y: position.y,
      width: 400,
      height: 300,
      label: 'Group',
      background: '',
      backgroundStyle: 'cover',
      children: []
    };
    
    const reactFlowNode: Node = {
      id: groupNode.id,
      type: 'group',
      position: { x: groupNode.x, y: groupNode.y },
      data: groupNode,
      style: { 
        width: groupNode.width, 
        height: groupNode.height,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        border: '2px dashed rgba(34, 197, 94, 0.3)',
        borderRadius: '8px'
      }
    };
    
    setNodes(nds => [...nds, reactFlowNode]);
    addNode(groupNode);
    onClose();
  };

  const handlePasteHere = () => {
    const position = screenToFlowPosition({ x, y });
    clipboard.forEach((item, index) => {
      const newNode = {
        ...item,
        id: `${item.type}-${Date.now()}-${index}`,
        x: position.x + (index * 20),
        y: position.y + (index * 20)
      };
      
      const reactFlowNode: Node = {
        id: newNode.id,
        type: newNode.type,
        position: { x: newNode.x, y: newNode.y },
        data: newNode,
        style: { width: newNode.width, height: newNode.height }
      };
      
      setNodes(nds => [...nds, reactFlowNode]);
      addNode(newNode);
    });
    onClose();
  };

  const handleCreateConnection = () => {
    setTool('connect');
    onClose();
  };

  const handleChangeBackground = () => {
    // Implement background change functionality
    onClose();
  };

  const handleDeleteSelected = () => {
    onDeleteSelected();
    onClose();
  };

  return (
    <Card 
      ref={menuRef}
      className="fixed z-50 p-2 min-w-48 bg-background/95 backdrop-blur border border-terminal-green/30 shadow-lg"
      style={{ 
        left: x, 
        top: y,
        transform: 'translate(0, 0)'
      }}
    >
      <div className="space-y-1">
        <div className="text-xs text-terminal-green px-2 py-1 font-medium">
          Add to Canvas
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateTextNode}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-green/10"
        >
          <Type className="h-4 w-4 mr-2 text-terminal-green" />
          Text Node
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateNote}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-green/10"
        >
          <FileText className="h-4 w-4 mr-2 text-terminal-green" />
          Note
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateImage}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-green/10"
        >
          <Image className="h-4 w-4 mr-2 text-terminal-green" />
          Image
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateGroup}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-green/10"
        >
          <Group className="h-4 w-4 mr-2 text-terminal-green" />
          Group
        </Button>

        <Separator className="my-1 bg-border" />
        
        <div className="text-xs text-terminal-amber px-2 py-1 font-medium">
          Actions
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePasteHere}
          disabled={clipboard.length === 0}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-amber/10"
        >
          <Copy className="h-4 w-4 mr-2 text-terminal-amber" />
          Paste Here
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateConnection}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-amber/10"
        >
          <Link2 className="h-4 w-4 mr-2 text-terminal-amber" />
          Create Connection
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleChangeBackground}
          className="w-full justify-start h-8 text-foreground hover:bg-terminal-amber/10"
        >
          <Palette className="h-4 w-4 mr-2 text-terminal-amber" />
          Change Background
        </Button>

        <Separator className="my-1 bg-border" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={selectedNodes.length === 0}
          className="w-full justify-start h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>
      </div>
    </Card>
  );
}