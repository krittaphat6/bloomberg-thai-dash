import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { temporal } from 'zundo';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CanvasState, CanvasData, CanvasViewport, CanvasSelection } from '@/types/canvas';

interface CanvasStore extends CanvasState {
  updateViewport: (viewport: Partial<CanvasViewport>) => void;
  updateSelection: (selection: Partial<CanvasSelection>) => void;
  addNode: (node: any) => void;
  updateNode: (nodeId: string, updates: any) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: any) => void;
  deleteEdge: (edgeId: string) => void;
  setTool: (tool: CanvasState['tool']) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useCanvasStore = create<CanvasStore>()(
  temporal(
    (set, get) => ({
      data: {
        nodes: [],
        edges: [],
        metadata: {
          title: 'Untitled Canvas',
          created: new Date(),
          modified: new Date(),
          author: 'User',
          version: '1.0.0'
        }
      },
      viewport: { x: 0, y: 0, zoom: 1 },
      selection: { nodeIds: [], edgeIds: [] },
      tool: 'select',
      isDragging: false,
      isConnecting: false,
      collaborators: [],

      updateViewport: (viewport) => set(state => ({ 
        viewport: { ...state.viewport, ...viewport } 
      })),
      
      updateSelection: (selection) => set(state => ({ 
        selection: { ...state.selection, ...selection } 
      })),
      
      addNode: (node) => set(state => ({
        data: {
          ...state.data,
          nodes: [...state.data.nodes, node],
          metadata: { ...state.data.metadata, modified: new Date() }
        }
      })),
      
      updateNode: (nodeId, updates) => set(state => ({
        data: {
          ...state.data,
          nodes: state.data.nodes.map(node => 
            node.id === nodeId ? { ...node, ...updates } : node
          ),
          metadata: { ...state.data.metadata, modified: new Date() }
        }
      })),
      
      deleteNode: (nodeId) => set(state => ({
        data: {
          ...state.data,
          nodes: state.data.nodes.filter(node => node.id !== nodeId),
          edges: state.data.edges.filter(edge => 
            edge.fromNode !== nodeId && edge.toNode !== nodeId
          ),
          metadata: { ...state.data.metadata, modified: new Date() }
        },
        selection: {
          ...state.selection,
          nodeIds: state.selection.nodeIds.filter(id => id !== nodeId)
        }
      })),
      
      addEdge: (edge) => set(state => ({
        data: {
          ...state.data,
          edges: [...state.data.edges, edge],
          metadata: { ...state.data.metadata, modified: new Date() }
        }
      })),
      
      deleteEdge: (edgeId) => set(state => ({
        data: {
          ...state.data,
          edges: state.data.edges.filter(edge => edge.id !== edgeId),
          metadata: { ...state.data.metadata, modified: new Date() }
        },
        selection: {
          ...state.selection,
          edgeIds: state.selection.edgeIds.filter(id => id !== edgeId)
        }
      })),
      
      setTool: (tool) => set({ tool }),
      
      undo: () => {},
      redo: () => {},
      canUndo: () => false,
      canRedo: () => false
    }),
    {
      limit: 50,
      handleSet: (handleSet) => (fn) => handleSet(fn),
    }
  )
);

interface CanvasProviderProps {
  children: React.ReactNode;
  roomId: string;
  userId: string;
}

export function CanvasProvider({ children, roomId, userId }: CanvasProviderProps) {
  const [ydoc] = React.useState(() => new Y.Doc());
  const [wsProvider] = React.useState(() => 
    new WebsocketProvider('ws://localhost:1234', roomId, ydoc)
  );

  useEffect(() => {
    const canvasMap = ydoc.getMap('canvas');
    const nodesArray = ydoc.getArray('nodes');
    const edgesArray = ydoc.getArray('edges');

    const handleNodesChange = () => {
      const nodes = nodesArray.toArray();
      useCanvasStore.getState().updateNode('sync', { nodes });
    };

    const handleEdgesChange = () => {
      const edges = edgesArray.toArray();
      useCanvasStore.getState().updateNode('sync', { edges });
    };

    nodesArray.observe(handleNodesChange);
    edgesArray.observe(handleEdgesChange);

    return () => {
      nodesArray.unobserve(handleNodesChange);
      edgesArray.unobserve(handleEdgesChange);
      wsProvider.destroy();
    };
  }, [ydoc, wsProvider]);

  // Auto-save to IndexedDB
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useCanvasStore.getState();
      localStorage.setItem(`canvas-${roomId}`, JSON.stringify(state.data));
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId]);

  return <>{children}</>;
}