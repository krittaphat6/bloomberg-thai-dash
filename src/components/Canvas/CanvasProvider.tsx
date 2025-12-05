import React, { useEffect } from 'react';
import { create } from 'zustand';
import { temporal } from 'zundo';
import { CanvasData, EdgeData } from '@/types/canvas';

// Canvas Store without WebSocket - uses localStorage only
interface CanvasState {
  data: CanvasData;
  viewport: { x: number; y: number; zoom: number };
  selection: { nodeIds: string[]; edgeIds: string[] };
  tool: 'select' | 'text' | 'file' | 'group' | 'image' | 'draw' | 'pan' | 'note' | 'connect';
  isDragging: boolean;
  isConnecting: boolean;
  collaborators: any[];
  updateViewport: (viewport: Partial<{ x: number; y: number; zoom: number }>) => void;
  updateSelection: (selection: Partial<{ nodeIds: string[]; edgeIds: string[] }>) => void;
  addNode: (node: any) => void;
  updateNode: (nodeId: string, updates: any) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: EdgeData) => void;
  deleteEdge: (edgeId: string) => void;
  setTool: (tool: 'select' | 'text' | 'file' | 'group' | 'image' | 'draw' | 'pan' | 'note' | 'connect') => void;
  loadFromStorage: (roomId: string) => void;
  saveToStorage: (roomId: string) => void;
}

const initialCanvasData: CanvasData = {
  nodes: [],
  edges: [],
  metadata: {
    title: 'Untitled Canvas',
    created: new Date(),
    modified: new Date(),
    author: 'User',
    version: '1.0'
  }
};

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set, get) => ({
      data: initialCanvasData,
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
      
      loadFromStorage: (roomId) => {
        try {
          const saved = localStorage.getItem(`canvas-${roomId}`);
          if (saved) {
            const data = JSON.parse(saved);
            set({ data });
            console.log('✅ Canvas loaded from storage');
          }
        } catch (e) {
          console.error('Failed to load canvas:', e);
        }
      },
      
      saveToStorage: (roomId) => {
        try {
          const { data } = get();
          localStorage.setItem(`canvas-${roomId}`, JSON.stringify(data));
          console.log('✅ Canvas saved to storage');
        } catch (e) {
          console.error('Failed to save canvas:', e);
        }
      }
    }),
    { limit: 50 }
  )
);

interface CanvasProviderProps {
  children: React.ReactNode;
  roomId: string;
  userId: string;
}

export function CanvasProvider({ children, roomId, userId }: CanvasProviderProps) {
  const { loadFromStorage, saveToStorage } = useCanvasStore();

  // Load on mount
  useEffect(() => {
    loadFromStorage(roomId);
  }, [roomId, loadFromStorage]);

  // Auto-save every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveToStorage(roomId);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [roomId, saveToStorage]);

  return <>{children}</>;
}
