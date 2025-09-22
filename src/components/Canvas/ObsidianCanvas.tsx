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
  
  // Convert canvas data to ReactFlow format
  const convertNodesToReactFlow = (canvasNodes: any[]): Node[] => {
    return canvasNodes.map(node => ({
      id: node.id,
      type: node.type,
      position: { x: node.x || 0, y: node.y || 0 },
      data: node,
      style: { 
        width: node.width || 200, 
        height: node.height || 100 
      }
    }));
  };

  const convertEdgesToReactFlow = (canvasEdges: EdgeData[]): Edge[] => {
    return canvasEdges.map(edge => ({
      id: edge.id,
      source: edge.fromNode,
      target: edge.toNode,
      sourceHandle: edge.fromSide,
      targetHandle: edge.toSide,
      type: 'smart',
      animated: edge.animated || false,
      data: edge
    }));
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(convertNodesToReactFlow(data.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertEdgesToReactFlow(data.edges));
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getViewport, setViewport } = useReactFlow();

  // Sync store data with ReactFlow
  useEffect(() => {
    setNodes(convertNodesToReactFlow(data.nodes));
    setEdges(convertEdgesToReactFlow(data.edges));
  }, [data.nodes, data.edges, setNodes, setEdges]);

  // Sync viewport
  useEffect(() => {
    setViewport(viewport, { duration: 0 });
  }, [viewport, setViewport]);

  const onConnect = useCallback(
    (params: Connection) => {
      const canvasEdge: EdgeData = {
        id: `edge-${Date.now()}`,
        fromNode: params.source!,
        toNode: params.target!,
        fromSide: params.sourceHandle as any,
        toSide: params.targetHandle as any,
        animated: false,
      };
      
      const reactFlowEdge = {
        id: canvasEdge.id,
        source: canvasEdge.fromNode,
        target: canvasEdge.toNode,
        sourceHandle: canvasEdge.fromSide,
        targetHandle: canvasEdge.toSide,
        type: 'smart',
        animated: false,
        data: canvasEdge
      };
      
      setEdges((eds) => addEdge(reactFlowEdge, eds));
      addCanvasEdge(canvasEdge);
    },
    [setEdges, addCanvasEdge]
  );

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'file') {
      // Open the linked note in the main editor
      const noteId = node.data.file;
      const note = notes.find(n => n.id === noteId);
      if (note) {
        // This would trigger opening the note in the main NoteTaking component
        console.log('Open note:', note);
      }
    } else if (node.type === 'text') {
      // Enable inline editing
      updateNode(node.id, { ...node.data, editing: true });
    }
  }, [notes, updateNode]);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    updateNode(node.id, { 
      ...node.data,
      x: node.position.x, 
      y: node.position.y 
    });
  }, [updateNode]);

  const onViewportChange = useCallback((newViewport: any) => {
    updateViewport(newViewport);
  }, [updateViewport]);

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    updateSelection({
      nodeIds: selectedNodes.map(n => n.id),
      edgeIds: selectedEdges.map(e => e.id)
    });
  }, [updateSelection]);

  const onCanvasDoubleClick = useCallback((event: React.MouseEvent) => {
    if (tool === 'text' || event.detail === 2) {
      const position = screenToFlowPosition({ 
        x: event.clientX, 
        y: event.clientY 
      });
      
      const canvasNode: TextNodeData = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: position.x,
        y: position.y,
        width: 200,
        height: 100,
        text: 'New text node',
        fontSize: 14,
        textAlign: 'left'
      };
      
      const reactFlowNode: Node = {
        id: canvasNode.id,
        type: canvasNode.type,
        position: { x: canvasNode.x, y: canvasNode.y },
        data: canvasNode,
        style: {
          width: canvasNode.width,
          height: canvasNode.height
        }
      };
      
      setNodes(nds => [...nds, reactFlowNode]);
      addNode(canvasNode);
    }
  }, [tool, screenToFlowPosition, setNodes, addNode]);

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const onCanvasClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const createNoteNode = useCallback((position: { x: number; y: number }) => {
    // Create a new note in the NoteTaking system
    const newNote = {
      id: `note-${Date.now()}`,
      title: 'Canvas Note',
      content: 'Created from canvas',
      tags: ['canvas'],
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: [],
      isFavorite: false,
      folder: undefined
    };
    
    onCreateNote(newNote);
    
    // Create the file node on canvas
    const canvasNode: FileNodeData = {
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
      id: canvasNode.id,
      type: canvasNode.type,
      position: { x: canvasNode.x, y: canvasNode.y },
      data: { ...canvasNode, note: newNote },
      style: {
        width: canvasNode.width,
        height: canvasNode.height
      }
    };
    
    setNodes(nds => [...nds, reactFlowNode]);
    addNode(canvasNode);
    
    setTool('select');
  }, [onCreateNote, setNodes, addNode, setTool]);

  const dropExistingNote = useCallback((noteId: string, position: { x: number; y: number }) => {
    const note = notes.find(n => n.id === noteId);
    
    const canvasNode: FileNodeData = {
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
      id: canvasNode.id,
      type: canvasNode.type,
      position: { x: canvasNode.x, y: canvasNode.y },
      data: { ...canvasNode, note },
      style: {
        width: canvasNode.width,
        height: canvasNode.height
      }
    };
    
    setNodes(nds => [...nds, reactFlowNode]);
    addNode(canvasNode);
  }, [notes, setNodes, addNode]);

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <KeyboardShortcuts />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onMove={onViewportChange}
        onSelectionChange={onSelectionChange}
        onDoubleClick={onCanvasDoubleClick}
        onContextMenu={onContextMenu}
        onClick={onCanvasClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-background"
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background 
          variant={BackgroundVariant.Dots}
          gap={50}
          size={1}
          className="opacity-30"
        />
        
        <Panel position="top-left">
          <CanvasToolbar 
            currentTool={tool}
            onToolChange={setTool}
            onCreateNote={createNoteNode}
          />
        </Panel>
        
        <Controls 
          position="bottom-right"
          showZoom
          showFitView
          showInteractive={false}
        />
        
        <MiniMap 
          position="bottom-left"
          className="bg-background border border-border"
          nodeColor="#10b981"
          maskColor="rgba(0,0,0,0.3)"
        />
      </ReactFlow>

      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCreateNote={createNoteNode}
          screenToFlowPosition={screenToFlowPosition}
        />
      )}
    </div>
  );
}

export function ObsidianCanvas(props: ObsidianCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}