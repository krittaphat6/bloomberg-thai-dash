// Canvas Types - Following JSON Canvas specification exactly
export interface CanvasData {
  nodes: Array<TextNodeData | FileNodeData | GroupNodeData | ImageNodeData>;
  edges: EdgeData[];
  metadata: {
    title: string;
    created: Date;
    modified: Date;
    author: string;
    version: string;
  };
}

export interface BaseNodeData {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  zIndex?: number;
}

export interface TextNodeData extends BaseNodeData {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface FileNodeData extends BaseNodeData {
  type: 'file';
  file: string;
  subpath?: string;
  preview?: boolean;
}

export interface GroupNodeData extends BaseNodeData {
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'fit' | 'repeat';
  children?: string[];
}

export interface ImageNodeData extends BaseNodeData {
  type: 'image';
  file: string;
  alt?: string;
  url?: string;
}

export interface EdgeData {
  id: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  toEnd?: 'arrow' | 'none';
  color?: string;
  label?: string;
  animated?: boolean;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasSelection {
  nodeIds: string[];
  edgeIds: string[];
}

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: CanvasSelection;
}

export interface CanvasState {
  data: CanvasData;
  viewport: CanvasViewport;
  selection: CanvasSelection;
  tool: 'select' | 'pan' | 'text' | 'note' | 'connect' | 'group';
  isDragging: boolean;
  isConnecting: boolean;
  connectionStart?: { nodeId: string; side: string };
  collaborators: CollaborationUser[];
}