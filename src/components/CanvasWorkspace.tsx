import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, ZoomIn, ZoomOut, Move, Save, Edit, X } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[];
  isFavorite: boolean;
  folder?: string;
  blocks?: any[];
  richContent?: string;
  isRichText?: boolean;
  icon?: string;
  properties?: Record<string, any>;
  comments?: any[];
  children?: string[];
}

interface CanvasPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasWorkspaceProps {
  notes: Note[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onCreateNote: () => void;
  onSelectNote: (note: Note) => void;
  selectedNote: Note | null;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  notes,
  onUpdateNote,
  onCreateNote,
  onSelectNote,
  selectedNote
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [canvasPositions, setCanvasPositions] = useState<Record<string, CanvasPosition>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ noteId: string; side: string } | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note>>({});

  // Load canvas positions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('canvas-positions');
    if (saved) {
      try {
        setCanvasPositions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load canvas positions:', e);
      }
    }
  }, []);

  // Save canvas positions to localStorage
  useEffect(() => {
    localStorage.setItem('canvas-positions', JSON.stringify(canvasPositions));
  }, [canvasPositions]);

  // Initialize positions for new notes
  useEffect(() => {
    const newPositions = { ...canvasPositions };
    let hasChanges = false;

    notes.forEach((note, index) => {
      if (!newPositions[note.id]) {
        newPositions[note.id] = {
          x: 100 + (index % 5) * 300,
          y: 100 + Math.floor(index / 5) * 200,
          width: 250,
          height: 150
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setCanvasPositions(newPositions);
    }
  }, [notes, canvasPositions]);

  const handleMouseDown = useCallback((e: React.MouseEvent, noteId?: string) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    if (noteId) {
      const position = canvasPositions[noteId];
      if (position) {
        setIsDragging(true);
        setDragTarget(noteId);
        setDragOffset({
          x: x - position.x,
          y: y - position.y
        });
      }
    } else {
      setIsDragging(true);
      setDragTarget(null);
    }
  }, [viewport, canvasPositions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

    if (dragTarget) {
      // Move note
      setCanvasPositions(prev => ({
        ...prev,
        [dragTarget]: {
          ...prev[dragTarget],
          x: x - dragOffset.x,
          y: y - dragOffset.y
        }
      }));
    } else {
      // Pan canvas
      setViewport(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [isDragging, dragTarget, dragOffset, viewport.zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, viewport.zoom * zoomFactor));
    
    setViewport(prev => ({ ...prev, zoom: newZoom }));
  }, [viewport.zoom]);

  const createNewNote = useCallback(() => {
    const centerX = (-viewport.x + 400) / viewport.zoom;
    const centerY = (-viewport.y + 300) / viewport.zoom;
    
    setEditingNote({
      title: 'New Note',
      content: '',
      tags: [],
      icon: '📄'
    });
    
    // Store position for when note is created
    const tempId = 'temp-' + Date.now();
    setCanvasPositions(prev => ({
      ...prev,
      [tempId]: { x: centerX, y: centerY, width: 250, height: 150 }
    }));
    
    setShowNoteEditor(true);
  }, [viewport]);

  const handleCreateNote = useCallback(() => {
    const newNote = {
      id: Date.now().toString(),
      title: editingNote.title || 'Untitled Note',
      content: editingNote.content || '',
      tags: editingNote.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: [],
      isFavorite: false,
      blocks: [],
      richContent: '',
      isRichText: false,
      icon: editingNote.icon || '📄',
      properties: {},
      comments: [],
      children: []
    };

    // Find temp position and assign to new note
    const tempKey = Object.keys(canvasPositions).find(key => key.startsWith('temp-'));
    if (tempKey) {
      const tempPos = canvasPositions[tempKey];
      setCanvasPositions(prev => {
        const newPos = { ...prev };
        delete newPos[tempKey];
        newPos[newNote.id] = tempPos;
        return newPos;
      });
    }

    onUpdateNote(newNote.id, newNote);
    setShowNoteEditor(false);
    setEditingNote({});
  }, [editingNote, canvasPositions, onUpdateNote]);

  const handleNoteClick = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onSelectNote(note);
    }
  }, [isDragging, onSelectNote]);

  const getConnectionPoints = (position: CanvasPosition) => ({
    top: { x: position.x + position.width / 2, y: position.y },
    right: { x: position.x + position.width, y: position.y + position.height / 2 },
    bottom: { x: position.x + position.width / 2, y: position.y + position.height },
    left: { x: position.x, y: position.y + position.height / 2 }
  });

  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    notes.forEach(note => {
      const startPos = canvasPositions[note.id];
      if (!startPos) return;

      note.linkedNotes.forEach(linkedId => {
        const endPos = canvasPositions[linkedId];
        if (!endPos) return;

        const startPoints = getConnectionPoints(startPos);
        const endPoints = getConnectionPoints(endPos);
        
        // Find closest connection points
        let minDistance = Infinity;
        let bestStart = startPoints.right;
        let bestEnd = endPoints.left;

        Object.entries(startPoints).forEach(([startSide, startPoint]) => {
          Object.entries(endPoints).forEach(([endSide, endPoint]) => {
            const distance = Math.sqrt(
              Math.pow(startPoint.x - endPoint.x, 2) + 
              Math.pow(startPoint.y - endPoint.y, 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              bestStart = startPoint;
              bestEnd = endPoint;
            }
          });
        });

        // Create curved path
        const midX = (bestStart.x + bestEnd.x) / 2;
        const pathD = `M ${bestStart.x} ${bestStart.y} Q ${midX} ${bestStart.y} ${midX} ${(bestStart.y + bestEnd.y) / 2} Q ${midX} ${bestEnd.y} ${bestEnd.x} ${bestEnd.y}`;

        connections.push(
          <g key={`${note.id}-${linkedId}`}>
            <path
              d={pathD}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              opacity="0.7"
            />
            <circle
              cx={bestEnd.x}
              cy={bestEnd.y}
              r="4"
              fill="hsl(var(--primary))"
            />
          </g>
        );
      });
    });

    return connections;
  };

  const gridSize = 50;
  const gridExtent = 10000;

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Button size="sm" onClick={createNewNote}>
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom * 0.9) }))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">{Math.round(viewport.zoom * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.1) }))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        >
          <Move className="h-4 w-4 mr-1" />
          Center
        </Button>
        <div className="flex-1" />
        <div className="text-sm text-muted-foreground">
          {notes.length} notes • Drag to move • Scroll to zoom
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
          }}
        >
          {/* Grid */}
          <defs>
            <pattern
              id="grid"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect
            x={-gridExtent}
            y={-gridExtent}
            width={gridExtent * 2}
            height={gridExtent * 2}
            fill="url(#grid)"
          />

          {/* Connections */}
          {renderConnections()}
        </svg>

        {/* Notes */}
        {notes.map(note => {
          const position = canvasPositions[note.id];
          if (!position) return null;

          return (
            <Card
              key={note.id}
              className={`absolute border-2 cursor-pointer transition-all duration-150 hover:shadow-lg ${
                selectedNote?.id === note.id ? 'border-primary shadow-lg' : 'border-border'
              }`}
              style={{
                left: viewport.x + position.x * viewport.zoom,
                top: viewport.y + position.y * viewport.zoom,
                width: position.width * viewport.zoom,
                height: position.height * viewport.zoom,
                transform: `scale(1)`,
                zIndex: dragTarget === note.id ? 10 : 1
              }}
              onMouseDown={(e) => handleMouseDown(e, note.id)}
              onClick={(e) => handleNoteClick(note, e)}
            >
              <CardHeader className="pb-2" style={{ padding: `${8 * viewport.zoom}px` }}>
                <CardTitle 
                  className="text-sm font-medium truncate flex items-center gap-1"
                  style={{ fontSize: `${12 * viewport.zoom}px` }}
                >
                  <span>{note.icon}</span>
                  <span>{note.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: `0 ${8 * viewport.zoom}px ${8 * viewport.zoom}px` }}>
                <div 
                  className="text-xs text-muted-foreground line-clamp-3 mb-2"
                  style={{ 
                    fontSize: `${10 * viewport.zoom}px`,
                    lineHeight: '1.3'
                  }}
                >
                  {note.content.substring(0, 100)}...
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 2).map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="text-xs px-1 py-0"
                        style={{ fontSize: `${8 * viewport.zoom}px` }}
                      >
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 2 && (
                      <Badge 
                        variant="outline" 
                        className="text-xs px-1 py-0"
                        style={{ fontSize: `${8 * viewport.zoom}px` }}
                      >
                        +{note.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>

              {/* Connection Points */}
              {viewport.zoom >= 0.7 && (
                <>
                  {['top', 'right', 'bottom', 'left'].map(side => (
                    <div
                      key={side}
                      className="absolute w-2 h-2 bg-primary rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-crosshair"
                      style={{
                        [side === 'top' ? 'top' : side === 'bottom' ? 'bottom' : side === 'left' ? 'left' : 'right']: '-4px',
                        [side === 'top' || side === 'bottom' ? 'left' : 'top']: side === 'top' || side === 'bottom' ? '50%' : '50%',
                        transform: side === 'top' || side === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)'
                      }}
                    />
                  ))}
                </>
              )}
            </Card>
          );
        })}

        {/* Mini-map */}
        <div className="absolute bottom-4 right-4 w-36 h-24 bg-card border border-border rounded-lg p-2 opacity-80">
          <div className="text-xs text-muted-foreground mb-1">Canvas Map</div>
          <div className="relative w-full h-16 bg-muted rounded overflow-hidden">
            {notes.map(note => {
              const position = canvasPositions[note.id];
              if (!position) return null;
              
              return (
                <div
                  key={note.id}
                  className="absolute bg-primary rounded-sm"
                  style={{
                    left: `${((position.x + gridExtent) / (gridExtent * 2)) * 100}%`,
                    top: `${((position.y + gridExtent) / (gridExtent * 2)) * 100}%`,
                    width: '4px',
                    height: '3px'
                  }}
                />
              );
            })}
            {/* Viewport indicator */}
            <div
              className="absolute border border-primary bg-primary/20"
              style={{
                left: `${((-viewport.x / viewport.zoom + gridExtent) / (gridExtent * 2)) * 100}%`,
                top: `${((-viewport.y / viewport.zoom + gridExtent) / (gridExtent * 2)) * 100}%`,
                width: `${(800 / viewport.zoom / (gridExtent * 2)) * 100}%`,
                height: `${(600 / viewport.zoom / (gridExtent * 2)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Note Editor Dialog */}
      <Dialog open={showNoteEditor} onOpenChange={setShowNoteEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="📄"
                value={editingNote.icon || ''}
                onChange={(e) => setEditingNote({ ...editingNote, icon: e.target.value })}
                className="w-16"
              />
              <Input
                placeholder="Note title..."
                value={editingNote.title || ''}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                className="flex-1"
              />
            </div>
            <Input
              placeholder="Tags (comma separated)..."
              value={editingNote.tags?.join(', ') || ''}
              onChange={(e) => setEditingNote({ 
                ...editingNote, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
            />
            <Textarea
              placeholder="Write your note content here..."
              value={editingNote.content || ''}
              onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
              rows={8}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNoteEditor(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNote}>
                Create Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};