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
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useCanvasStore } from './CanvasProvider';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasContextMenu } from './CanvasContextMenu';
import { TextNode } from './nodes/TextNode';
import { FileNode } from './nodes/FileNode';
import { GroupNode } from './nodes/GroupNode';
import { ImageNode } from './nodes/ImageNode';
import { SmartEdge } from './edges/SmartEdge';
import { LabeledEdge } from './edges/LabeledEdge';
import { KeyboardShortcuts } from './utils/KeyboardShortcuts';
import { TextNodeData, FileNodeData, GroupNodeData, ImageNodeData, EdgeData } from '@/types/canvas';
import { FileText } from 'lucide-react';

const nodeTypes: NodeTypes = {
  text: TextNode,
  file: FileNode,
  group: GroupNode,
  image: ImageNode,
};

const edgeTypes: EdgeTypes = {
  smart: SmartEdge,
  labeled: LabeledEdge,
};

interface ObsidianCanvasProps {
  notes: any[];
  onUpdateNote: (noteId: string, updates: any) => void;
  onCreateNote: (note: any) => void;
}

function CanvasInner({ notes, onUpdateNote, onCreateNote }: ObsidianCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [clipboard, setClipboard] = useState<any[]>([]);
  
  const { 
    data, 
    viewport, 
    selection, 
    tool,
    updateViewport, 
    updateSelection, 
    addNode, 
    updateNode,
    deleteNode,
    addEdge: addCanvasEdge,
    deleteEdge,
    setTool
  } = useCanvasStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    setSelectedNodes(selectedNodes);
    updateSelection({ nodeIds: selectedNodes.map(n => n.id), edgeIds: [] });
  }, [updateSelection]);

  const onDeleteSelected = useCallback(() => {
    selectedNodes.forEach(node => {
      deleteNode(node.id);
    });
    setNodes(nds => nds.filter(n => !selectedNodes.find(sn => sn.id === n.id)));
    setSelectedNodes([]);
  }, [selectedNodes, deleteNode, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: EdgeData = {
        id: `edge-${Date.now()}`,
        fromNode: params.source!,
        toNode: params.target!,
        fromSide: params.sourceHandle as any,
        toSide: params.targetHandle as any,
        toEnd: 'arrow'
      };
      
      const reactFlowEdge: Edge = {
        id: newEdge.id,
        source: newEdge.fromNode,
        target: newEdge.toNode,
        type: 'smart',
        data: newEdge
      };
      
      setEdges((eds) => addEdge(reactFlowEdge, eds));
      addCanvasEdge(newEdge);
    },
    [setEdges, addCanvasEdge]
  );

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const onCanvasClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Drag and Drop functionality
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const noteId = event.dataTransfer.getData('application/note-id');
    
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const position = screenToFlowPosition({
          x: event.clientX - (reactFlowWrapper.current?.offsetLeft || 0),
          y: event.clientY - (reactFlowWrapper.current?.offsetTop || 0),
        });
        
        const fileNode: FileNodeData = {
          id: `file-${Date.now()}`,
          type: 'file',
          x: position.x,
          y: position.y,
          width: 250,
          height: 150,
          file: noteId,
          preview: true
        };
        
        const reactFlowNode: Node = {
          id: fileNode.id,
          type: 'file',
          position: { x: fileNode.x, y: fileNode.y },
          data: { ...fileNode, note },
          style: { width: fileNode.width, height: fileNode.height }
        };
        
        setNodes(nds => [...nds, reactFlowNode]);
        addNode(fileNode);
      }
    }
  }, [notes, screenToFlowPosition, setNodes, addNode]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNodes.length > 0) {
        onDeleteSelected();
      }
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c' && selectedNodes.length > 0) {
          setClipboard([...selectedNodes.map(n => n.data)]);
        }
        if (event.key === 'v' && clipboard.length > 0) {
          // Paste at center of viewport
          const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          clipboard.forEach((item, index) => {
            const newNode = {
              ...item,
              id: `${item.type}-${Date.now()}-${index}`,
              x: center.x + (index * 20),
              y: center.y + (index * 20)
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
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, onDeleteSelected, clipboard, screenToFlowPosition, setNodes, addNode]);

  return (
    <div className="flex h-full bg-background">
      {/* Notes Sidebar */}
      <div className="w-64 bg-card border-r border-terminal-green/30 p-4 overflow-y-auto">
        <h3 className="text-sm font-medium text-terminal-green mb-3 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Notes Library
        </h3>
        <div className="space-y-1">
          {notes.map((note) => (
            <div
              key={note.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/note-id', note.id);
              }}
              className="p-2 text-xs bg-background/50 border border-border rounded cursor-move hover:bg-terminal-green/10 hover:border-terminal-green/50 transition-colors"
            >
              <div className="font-medium truncate text-terminal-green">{note.title}</div>
              <div className="text-muted-foreground truncate mt-1">
                {note.content.substring(0, 50)}...
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {note.tags?.slice(0, 2).map((tag: string) => (
                  <span key={tag} className="px-1 py-0.5 bg-terminal-amber/20 text-terminal-amber rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onContextMenu={onContextMenu}
          onPaneClick={onCanvasClick}
          onSelectionChange={onSelectionChange}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="canvas-flow"
          style={{ 
            backgroundColor: '#0a0a0a',
          }}
          attributionPosition="bottom-left"
        >
          <Background 
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(34, 197, 94, 0.2)"
            className="opacity-50"
          />
          <Controls 
            showZoom={true}
            showFitView={true}
            showInteractive={true}
            className="bg-background/90 border border-terminal-green/30 rounded"
          />
          <MiniMap 
            className="bg-background/90 border border-terminal-green/30 rounded"
            maskColor="rgba(0, 0, 0, 0.6)"
            nodeColor={(node) => {
              switch (node.type) {
                case 'text': return '#22c55e';
                case 'file': return '#f59e0b';
                case 'image': return '#8b5cf6';
                case 'group': return '#06b6d4';
                default: return '#6b7280';
              }
            }}
          />
          
          {/* Floating Toolbar */}
          <Panel position="top-center">
            <CanvasToolbar 
              currentTool={tool}
              onToolChange={setTool}
              onCreateNote={(position) => {
                const newNote = {
                  id: `note-${Date.now()}`,
                  title: 'New Canvas Note',
                  content: '# New Note\n\nStart writing here...',
                  tags: ['canvas'],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  linkedNotes: [],
                  isFavorite: false,
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
              }}
            />
          </Panel>
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onCreateNote={onCreateNote}
            screenToFlowPosition={screenToFlowPosition}
            setNodes={setNodes}
            addNode={addNode}
            selectedNodes={selectedNodes}
            onDeleteSelected={onDeleteSelected}
            clipboard={clipboard}
            setTool={setTool}
          />
        )}

        {/* Keyboard Shortcuts Component */}
        <KeyboardShortcuts />
      </div>
    </div>
  );
}

export default function ObsidianCanvas(props: ObsidianCanvasProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}