// src/components/TopNews/FlowchartDiagram.tsx
// AI-Generated Decision Flowchart Visualization

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Target, AlertTriangle, CheckCircle, XCircle, ArrowDown, ArrowRight, PlayCircle, CircleDot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FlowchartNode {
  id: string;
  type: 'start' | 'decision' | 'process' | 'action' | 'result' | 'condition';
  label: string;
  details?: string;
  color?: 'emerald' | 'red' | 'orange' | 'blue' | 'purple' | 'yellow';
}

interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  type?: 'yes' | 'no' | 'default';
}

interface FlowchartDiagramProps {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  title?: string;
}

const NODE_STYLES: Record<string, { 
  shape: string; 
  defaultColor: string; 
  icon: React.ReactNode;
}> = {
  start: { 
    shape: 'rounded-full', 
    defaultColor: 'blue',
    icon: <PlayCircle className="w-4 h-4" />
  },
  decision: { 
    shape: 'rotate-45', 
    defaultColor: 'orange',
    icon: <AlertTriangle className="w-4 h-4 -rotate-45" />
  },
  process: { 
    shape: 'rounded-lg', 
    defaultColor: 'purple',
    icon: <Brain className="w-4 h-4" />
  },
  action: { 
    shape: 'rounded-md', 
    defaultColor: 'emerald',
    icon: <Zap className="w-4 h-4" />
  },
  result: { 
    shape: 'rounded-xl', 
    defaultColor: 'emerald',
    icon: <Target className="w-4 h-4" />
  },
  condition: { 
    shape: 'rounded-lg', 
    defaultColor: 'yellow',
    icon: <CircleDot className="w-4 h-4" />
  },
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/50', text: 'text-purple-400' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400' },
};

export const FlowchartDiagram: React.FC<FlowchartDiagramProps> = ({ 
  nodes,
  edges,
  title = 'AI Decision Flowchart'
}) => {
  // Create a map for quick node lookup
  const nodeMap = new Map<string, FlowchartNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  // Build adjacency list for layout
  const adjacency: Record<string, string[]> = {};
  edges.forEach(edge => {
    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    adjacency[edge.from].push(edge.to);
  });

  // Find start nodes (nodes with no incoming edges)
  const incomingCount: Record<string, number> = {};
  edges.forEach(edge => {
    incomingCount[edge.to] = (incomingCount[edge.to] || 0) + 1;
  });
  const startNodes = nodes.filter(n => !incomingCount[n.id]);

  // BFS to create levels
  const levels: FlowchartNode[][] = [];
  const visited = new Set<string>();
  let currentLevel = startNodes;
  
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach(n => visited.add(n.id));
    
    const nextLevel: FlowchartNode[] = [];
    currentLevel.forEach(node => {
      const children = adjacency[node.id] || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          const childNode = nodeMap.get(childId);
          if (childNode && !nextLevel.find(n => n.id === childId)) {
            nextLevel.push(childNode);
          }
        }
      });
    });
    
    currentLevel = nextLevel;
  }

  // Add any orphan nodes
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      if (levels.length === 0) levels.push([]);
      levels[levels.length - 1].push(node);
    }
  });

  const renderNode = (node: FlowchartNode) => {
    const style = NODE_STYLES[node.type] || NODE_STYLES.process;
    const color = node.color || style.defaultColor;
    const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.blue;
    const isDecision = node.type === 'decision';

    return (
      <div
        key={node.id}
        className={`
          relative flex items-center justify-center gap-2 
          px-4 py-2 border-2 transition-all hover:scale-105 cursor-pointer
          ${colorClass.bg} ${colorClass.border} ${style.shape}
          ${isDecision ? 'w-24 h-24' : 'min-w-[120px]'}
        `}
        title={node.details || node.label}
      >
        <div className={`flex items-center gap-2 ${isDecision ? '-rotate-45' : ''}`}>
          <span className={colorClass.text}>{style.icon}</span>
          <span className={`text-xs font-medium ${colorClass.text} whitespace-nowrap`}>
            {node.label}
          </span>
        </div>
        {node.details && (
          <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500 max-w-[100px] text-center ${isDecision ? '' : ''}`}>
            {node.details}
          </div>
        )}
      </div>
    );
  };

  const renderEdge = (edge: FlowchartEdge, index: number) => {
    const colorClass = edge.type === 'yes' 
      ? 'text-emerald-500' 
      : edge.type === 'no' 
      ? 'text-red-500' 
      : 'text-zinc-600';

    return (
      <div key={index} className="flex flex-col items-center mx-2">
        <div className={`h-6 w-0.5 ${colorClass.replace('text-', 'bg-')}`} />
        {edge.label && (
          <Badge 
            variant="outline" 
            className={`text-[8px] px-1.5 py-0 ${
              edge.type === 'yes' 
                ? 'border-emerald-500/30 text-emerald-400' 
                : edge.type === 'no'
                ? 'border-red-500/30 text-red-400'
                : 'border-zinc-700 text-zinc-500'
            }`}
          >
            {edge.label}
          </Badge>
        )}
        <ArrowDown className={`w-4 h-4 ${colorClass}`} />
      </div>
    );
  };

  if (!nodes || nodes.length === 0) {
    return (
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="text-center text-zinc-500">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>กดปุ่ม "Run Gemini Analysis" เพื่อสร้าง Flowchart</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-5 h-5 text-emerald-400" />
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
          AI Generated
        </Badge>
        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 ml-auto">
          {nodes.length} nodes • {edges.length} connections
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b border-zinc-800">
        {Object.entries(NODE_STYLES).map(([type, style]) => {
          const colorClass = COLOR_CLASSES[style.defaultColor];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 ${colorClass.bg} ${colorClass.border} border ${style.shape} flex items-center justify-center`}>
                <span className={`text-[8px] ${colorClass.text}`}>{style.icon}</span>
              </div>
              <span className="text-[10px] text-zinc-500 capitalize">{type}</span>
            </div>
          );
        })}
      </div>

      {/* Flowchart Visualization */}
      <ScrollArea className="h-[600px]">
        <div className="flex flex-col items-center gap-4 min-w-[800px] px-4 pb-8">
          {levels.map((level, levelIndex) => (
            <React.Fragment key={levelIndex}>
              {/* Level nodes */}
              <div className="flex items-center justify-center gap-8 flex-wrap">
                {level.map(node => renderNode(node))}
              </div>
              
              {/* Edges to next level */}
              {levelIndex < levels.length - 1 && (
                <div className="flex items-center justify-center gap-4">
                  {level.map(node => {
                    const outgoingEdges = edges.filter(e => e.from === node.id);
                    return outgoingEdges.map((edge, ei) => renderEdge(edge, levelIndex * 100 + ei));
                  })}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>

      {/* Edge Summary */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Decision Flow</p>
        <div className="flex flex-wrap gap-2">
          {edges.slice(0, 10).map((edge, i) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;
            
            return (
              <div 
                key={i}
                className="flex items-center gap-1 px-2 py-1 bg-zinc-800/30 rounded-full"
              >
                <span className="text-[10px] text-zinc-400">{fromNode.label}</span>
                <ArrowRight className={`w-3 h-3 ${
                  edge.type === 'yes' ? 'text-emerald-500' : 
                  edge.type === 'no' ? 'text-red-500' : 'text-zinc-600'
                }`} />
                <span className="text-[10px] text-zinc-400">{toNode.label}</span>
                {edge.label && (
                  <Badge 
                    variant="outline" 
                    className={`text-[8px] px-1 py-0 ml-1 ${
                      edge.type === 'yes' ? 'border-emerald-500/30 text-emerald-400' : 
                      edge.type === 'no' ? 'border-red-500/30 text-red-400' : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {edge.label}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default FlowchartDiagram;
