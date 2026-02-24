import React, { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  BackgroundVariant,
  SelectionMode,
  ConnectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { 
  Undo, Redo, ZoomIn, ZoomOut, Maximize, Grid, Layers, Download, Upload,
  MousePointer, Hand, Type, FileText, Image as ImageIcon, Video, Link, Code,
  StickyNote, Square, Lock, Unlock, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-react';

// Node Components
import TextNodeV2 from './nodes/TextNodeV2';
import NoteNodeV2 from './nodes/NoteNodeV2';
import ImageNodeV2 from './nodes/ImageNodeV2';
import VideoNode from './nodes/VideoNode';
import LinkNode from './nodes/LinkNode';
import CodeNode from './nodes/CodeNode';
import StickyNode from './nodes/StickyNode';
import FrameNode from './nodes/FrameNode';

// Edge Components  
import SmartEdgeV2 from './edges/SmartEdgeV2';
import ArrowEdge from './edges/ArrowEdge';

const nodeTypes: NodeTypes = {
  text: TextNodeV2,
  note: NoteNodeV2,
  image: ImageNodeV2,
  video: VideoNode,
  link: LinkNode,
  code: CodeNode,
  sticky: StickyNode,
  frame: FrameNode,
};

const edgeTypes: EdgeTypes = {
  smart: SmartEdgeV2,
  arrow: ArrowEdge,
};

interface ToolButtonProps {
  icon: React.ElementType;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip: string;
}

const ToolButton = ({ icon: Icon, onClick, active, disabled, tooltip }: ToolButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 transition-all ${
            active 
              ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50' 
              : 'text-muted-foreground hover:text-terminal-green hover:bg-terminal-green/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-card border-terminal-green/30">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Edge color options
const EDGE_COLORS = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7', 
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#ffffff'
];

// Color blending utility
function blendColors(colors: string[]): string {
  if (colors.length === 0) return '#22c55e';
  if (colors.length === 1) return colors[0];
  
  const rgbs = colors.map(hex => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  });
  
  const avg = rgbs.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  const len = rgbs.length;
  const toHex = (n: number) => Math.round(n / len).toString(16).padStart(2, '0');
  return `#${toHex(avg.r)}${toHex(avg.g)}${toHex(avg.b)}`;
}

interface AbleCanvasV2Props {
  notes: any[];
  onUpdateNote?: (noteId: string, updates: any) => void;
  onCreateNote?: (note: any) => void;
  mainView?: string;
  onChangeView?: (view: string) => void;
  sidebarContent?: React.ReactNode;
}

function CanvasContent({ notes, onUpdateNote, onCreateNote, mainView, onChangeView, sidebarContent }: AbleCanvasV2Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedEdgeColor, setSelectedEdgeColor] = useState('#22c55e');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showEdgeColorPicker, setShowEdgeColorPicker] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, getViewport } = useReactFlow();

  // Keep refs in sync — this ensures saveCanvas always gets latest data
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Clean node/edge data to remove non-serializable properties
  const cleanForStorage = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    const cleanNodes = currentNodes.map(n => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: JSON.parse(JSON.stringify(n.data || {})),
      width: n.width,
      height: n.height,
      style: n.style ? JSON.parse(JSON.stringify(n.style)) : undefined,
      ...(n.parentNode ? { parentNode: n.parentNode } : {}),
    }));
    const cleanEdges = currentEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      data: e.data ? JSON.parse(JSON.stringify(e.data)) : undefined,
      style: e.style ? JSON.parse(JSON.stringify(e.style)) : undefined,
      label: e.label,
      animated: e.animated,
    }));
    return { cleanNodes, cleanEdges };
  }, []);

  // Stable saveCanvas that reads from refs (doesn't depend on nodes/edges)
  const saveCanvas = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    
    if (currentNodes.length === 0 && currentEdges.length === 0) return;
    
    setIsSaving(true);
    try {
      const { cleanNodes, cleanEdges } = cleanForStorage(currentNodes, currentEdges);
      const canvasData = {
        nodes: cleanNodes,
        edges: cleanEdges,
        viewport: getViewport(),
        savedAt: new Date().toISOString(),
        version: '2.0'
      };
      
      const serialized = JSON.stringify(canvasData);
      localStorage.setItem('able-canvas-v2', serialized);
      
      // Keep last 9 history snapshots
      const historyKey = 'able-canvas-history';
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const newHistory = [{ ...canvasData, id: Date.now() }, ...existingHistory.slice(0, 9)];
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('✅ Canvas V2 auto-saved', new Date().toLocaleTimeString(), `(${cleanNodes.length} nodes, ${cleanEdges.length} edges, ${(serialized.length / 1024).toFixed(1)}KB)`);
    } catch (error) {
      console.error('❌ Failed to save canvas:', error);
      toast({ title: "Save Failed", description: String(error), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [getViewport, cleanForStorage]);

  // Auto-save: triggers on any node/edge change, debounced 2s
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    setHasUnsavedChanges(true);
    
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveCanvas();
    }, 2000);
    
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [nodes, edges, saveCanvas]);

  // Load saved canvas
  useEffect(() => {
    const saved = localStorage.getItem('able-canvas-v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.nodes?.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
          setLastSaved(new Date(data.savedAt));
        }
      } catch (e) {
        console.error('Failed to load canvas:', e);
      }
    }
  }, []);

  // History management
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, nodes, edges]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Node creation
  const createNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const pos = position || screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    const nodeDefaults: Record<string, any> = {
      text: { data: { text: 'Double-click to edit...', fontSize: 16 }, style: { width: 200, minHeight: 100 } },
      note: { data: { title: 'New Note', content: '', tags: [] }, style: { width: 280, minHeight: 150 } },
      image: { data: { url: '', alt: 'Image' }, style: { width: 300, height: 200 } },
      video: { data: { url: '', platform: 'youtube' }, style: { width: 480, height: 270 } },
      link: { data: { url: '', title: '', description: '', favicon: '' }, style: { width: 320, height: 120 } },
      code: { data: { code: '// Your code here', language: 'javascript' }, style: { width: 400, minHeight: 200 } },
      sticky: { data: { text: '', color: '#fef08a' }, style: { width: 200, height: 200 } },
      frame: { data: { label: 'Frame', color: 'transparent' }, style: { width: 400, height: 300 } }
    };

    const defaults = nodeDefaults[type] || nodeDefaults.text;
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: pos,
      data: { ...defaults.data, onChange: (newData: any) => updateNodeData(newNode.id, newData) },
      style: defaults.style,
    };

    setNodes(nds => [...nds, newNode]);
    saveToHistory();
  }, [screenToFlowPosition, saveToHistory]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
    ));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (key === 'v' && !ctrl) setSelectedTool('select');
      if (key === 't' && !ctrl) createNode('text');
      if (key === 'n' && !ctrl) createNode('note');
      if (key === ' ') { e.preventDefault(); setSelectedTool('pan'); }
      if (ctrl && key === 'z') { e.preventDefault(); undo(); }
      if (ctrl && key === 'y') { e.preventDefault(); redo(); }
      if (ctrl && key === 's') { e.preventDefault(); saveCanvas(); }
      if (key === 'delete' || key === 'backspace') {
        const selected = nodes.filter(n => n.selected);
        if (selected.length > 0) {
          setNodes(nds => nds.filter(n => !n.selected));
          saveToHistory();
        }
      }
      if (key === 'f') fitView({ duration: 300, padding: 0.2 });
      if (key === '=' || key === '+') zoomIn({ duration: 200 });
      if (key === '-') zoomOut({ duration: 200 });
      if (key === 'g' && !ctrl) setShowGrid(!showGrid);
      if (key === '[' && !ctrl) setIsSidebarOpen(prev => !prev);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSelectedTool('select');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, saveCanvas, createNode, showGrid, fitView, zoomIn, zoomOut, nodes, saveToHistory]);

  // Drag & drop
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    
    const noteId = e.dataTransfer.getData('application/note-id');
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const newNode: Node = {
          id: `note-${Date.now()}`,
          type: 'note',
          position,
          data: { ...note },
          style: { width: 280, minHeight: 150 }
        };
        setNodes(nds => [...nds, newNode]);
        return;
      }
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      Array.from(files).forEach((file, index) => {
        const offsetPosition = { x: position.x + (index * 20), y: position.y + (index * 20) };
        
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newNode: Node = {
              id: `image-${Date.now()}-${index}`,
              type: 'image',
              position: offsetPosition,
              data: { url: event.target?.result as string, alt: file.name },
              style: { width: 300, height: 200 }
            };
            setNodes(nds => [...nds, newNode]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }, [screenToFlowPosition, notes]);

  const onConnect = useCallback((params: Connection) => {
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: params.source!,
      target: params.target!,
      type: 'smart',
      animated: true,
      style: { stroke: selectedEdgeColor, strokeWidth: 2 },
      data: { color: selectedEdgeColor }
    };
    setEdges(eds => {
      const updated = addEdge(newEdge, eds);
      // Update node colors based on connected edges
      updateNodeColorsFromEdges(updated);
      return updated;
    });
    saveToHistory();
  }, [saveToHistory, selectedEdgeColor]);

  // Update node border colors based on connected edge colors
  const updateNodeColorsFromEdges = useCallback((currentEdges: Edge[]) => {
    setNodes(nds => nds.map(node => {
      const connectedEdges = currentEdges.filter(
        e => (typeof e.source === 'string' ? e.source : (e.source as any).id) === node.id || 
             (typeof e.target === 'string' ? e.target : (e.target as any).id) === node.id
      );
      if (connectedEdges.length === 0) return node;
      
      const edgeColors = connectedEdges.map(e => (e.data?.color || e.style?.stroke || '#22c55e') as string);
      const blended = blendColors(edgeColors);
      
      return {
        ...node,
        style: { ...node.style, borderColor: blended, borderWidth: 2 }
      };
    }));
  }, []);

  // Edge click handler for color picker
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setShowEdgeColorPicker(true);
  }, []);

  const changeEdgeColor = useCallback((color: string) => {
    if (!selectedEdgeId) return;
    setEdges(eds => {
      const updated = eds.map(e => 
        e.id === selectedEdgeId 
          ? { ...e, style: { ...e.style, stroke: color }, data: { ...e.data, color } }
          : e
      );
      updateNodeColorsFromEdges(updated);
      return updated;
    });
    setSelectedEdgeColor(color);
    setShowEdgeColorPicker(false);
    setSelectedEdgeId(null);
  }, [selectedEdgeId, updateNodeColorsFromEdges]);

  const exportAsJSON = () => {
    const data = { nodes, edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `able-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            toast({ title: "Import Successful", description: `Loaded ${data.nodes?.length || 0} nodes` });
          } catch {
            toast({ title: "Import Failed", variant: "destructive" });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="h-full flex w-full overflow-hidden relative bg-[#0a0a0a]" ref={reactFlowWrapper}>
      {/* Sidebar Panel — collapsible */}
      <div
        className={`
          flex-shrink-0 flex flex-col border-r border-terminal-green/20 bg-card/50
          transition-all duration-300 ease-in-out overflow-hidden
          ${isSidebarOpen ? 'w-[280px]' : 'w-0'}
        `}
      >
        <div className="w-[280px] h-full flex flex-col overflow-hidden">
          {/* Tab bar from parent */}
          {sidebarContent && (
            <div className="p-2 border-b border-terminal-green/20 flex-shrink-0">
              {sidebarContent}
            </div>
          )}

          {/* Notes Library header */}
          <div className="p-3 border-b border-terminal-green/20">
            <h3 className="text-sm font-semibold text-terminal-green flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Notes Library
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Drag notes to canvas</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {notes.map(note => (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/note-id', note.id)}
                className="p-2 rounded border border-transparent hover:border-terminal-green/30 hover:bg-terminal-green/5 cursor-grab active:cursor-grabbing transition-all"
              >
                <div className="font-medium text-sm text-terminal-green truncate">{note.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {note.content?.substring(0, 50)}...
                </div>
                <div className="flex gap-1 mt-1">
                  {note.tags?.slice(0, 2).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-8">
                No notes yet. Create some in the Notes tab!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(prev => !prev)}
        className={`
          absolute top-1/2 -translate-y-1/2 z-50
          w-5 h-12 flex items-center justify-center
          bg-card border border-terminal-green/30 rounded-r-md
          hover:bg-terminal-green/10 transition-all duration-300
          ${isSidebarOpen ? 'left-[280px]' : 'left-0'}
        `}
        title={isSidebarOpen ? 'Close sidebar ( [ )' : 'Open sidebar ( [ )'}
      >
        {isSidebarOpen
          ? <ChevronLeft className="h-3 w-3 text-terminal-green" />
          : <ChevronRight className="h-3 w-3 text-terminal-green" />
        }
      </button>

      {/* Main Canvas — full remaining space */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-12 bg-card/50 border-b border-terminal-green/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <ToolButton icon={MousePointer} active={selectedTool === 'select'} onClick={() => setSelectedTool('select')} tooltip="Select (V)" />
            <ToolButton icon={Hand} active={selectedTool === 'pan'} onClick={() => setSelectedTool('pan')} tooltip="Pan (Space)" />
            <div className="w-px h-6 bg-terminal-green/20 mx-1" />
            <ToolButton icon={Type} onClick={() => createNode('text')} tooltip="Text (T)" />
            <ToolButton icon={FileText} onClick={() => createNode('note')} tooltip="Note (N)" />
            <ToolButton icon={ImageIcon} onClick={() => createNode('image')} tooltip="Image" />
            <ToolButton icon={Video} onClick={() => createNode('video')} tooltip="Video" />
            <ToolButton icon={Link} onClick={() => createNode('link')} tooltip="Link" />
            <ToolButton icon={Code} onClick={() => createNode('code')} tooltip="Code" />
            <ToolButton icon={StickyNote} onClick={() => createNode('sticky')} tooltip="Sticky" />
            <ToolButton icon={Square} onClick={() => createNode('frame')} tooltip="Frame" />
          </div>

          <div className="flex items-center gap-1">
            <ToolButton icon={Undo} onClick={undo} disabled={historyIndex <= 0} tooltip="Undo (Ctrl+Z)" />
            <ToolButton icon={Redo} onClick={redo} disabled={historyIndex >= history.length - 1} tooltip="Redo (Ctrl+Y)" />
            <div className="w-px h-6 bg-terminal-green/20 mx-1" />
            <ToolButton icon={ZoomOut} onClick={() => zoomOut({ duration: 200 })} tooltip="Zoom Out (-)" />
            <ToolButton icon={ZoomIn} onClick={() => zoomIn({ duration: 200 })} tooltip="Zoom In (+)" />
            <ToolButton icon={Maximize} onClick={() => fitView({ duration: 300, padding: 0.2 })} tooltip="Fit View (F)" />
            <div className="w-px h-6 bg-terminal-green/20 mx-1" />
            {/* Edge color selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Edge:</span>
              {EDGE_COLORS.slice(0, 5).map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedEdgeColor(color)}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${selectedEdgeColor === color ? 'border-foreground scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={`Edge color: ${color}`}
                />
              ))}
              <div className="relative group">
                <button className="w-4 h-4 rounded-full border border-terminal-green/30 flex items-center justify-center text-[8px] text-muted-foreground hover:text-foreground">
                  +
                </button>
                <div className="absolute top-6 right-0 hidden group-hover:flex flex-wrap gap-1 p-2 bg-card border border-terminal-green/30 rounded-lg z-50 w-24">
                  {EDGE_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedEdgeColor(color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${selectedEdgeColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToolButton icon={Grid} active={showGrid} onClick={() => setShowGrid(!showGrid)} tooltip="Toggle Grid (G)" />
            <ToolButton icon={showMinimap ? Eye : EyeOff} active={showMinimap} onClick={() => setShowMinimap(!showMinimap)} tooltip="Minimap" />
            <ToolButton icon={isLocked ? Lock : Unlock} active={isLocked} onClick={() => setIsLocked(!isLocked)} tooltip="Lock Canvas" />
            <div className="w-px h-6 bg-terminal-green/20 mx-1" />
            <ToolButton icon={Download} onClick={exportAsJSON} tooltip="Export JSON" />
            <ToolButton icon={Upload} onClick={importJSON} tooltip="Import JSON" />
            
            <div className="flex items-center gap-2 ml-2 px-3 py-1 rounded bg-background/50 border border-terminal-green/20">
              {isSaving ? (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-xs text-yellow-500">Saving...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-xs text-orange-500">Unsaved</span>
                </>
              ) : lastSaved ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-500">Saved {lastSaved.toLocaleTimeString()}</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-xs text-muted-foreground">New canvas</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* React Flow */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          selectionMode={SelectionMode.Partial}
          panOnDrag={selectedTool === 'pan' || selectedTool === 'select'}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          snapToGrid={true}
          snapGrid={[15, 15]}
          minZoom={0.02}
          maxZoom={4}
          fitView
          className="bg-[#0a0a0a]"
        >
          {showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="rgba(34, 197, 94, 0.15)"
            />
          )}
          <Controls 
            className="!bg-card/80 !border-terminal-green/30 !rounded-lg [&>button]:!bg-transparent [&>button]:!border-terminal-green/20 [&>button:hover]:!bg-terminal-green/10 [&>button>svg]:!fill-terminal-green"
            showZoom={false}
            showFitView={false}
          />
          {showMinimap && (
            <MiniMap 
              className="!bg-card/80 !border-terminal-green/30 !rounded-lg"
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  text: '#22c55e',
                  note: '#f59e0b',
                  image: '#a855f7',
                  video: '#ef4444',
                  link: '#3b82f6',
                  code: '#06b6d4',
                  sticky: '#eab308',
                  frame: '#6b7280'
                };
                return colors[node.type || 'text'] || '#22c55e';
              }}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
          )}

          {/* Edge color picker popup */}
          {showEdgeColorPicker && selectedEdgeId && (
            <Panel position="top-center">
              <div className="flex items-center gap-2 p-2 bg-card border border-terminal-green/30 rounded-lg shadow-lg">
                <span className="text-xs text-muted-foreground">Edge color:</span>
                {EDGE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => changeEdgeColor(color)}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground transition-all hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  onClick={() => { setShowEdgeColorPicker(false); setSelectedEdgeId(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground ml-2"
                >
                  ✕
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function AbleCanvasV2(props: AbleCanvasV2Props) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
}
