// src/components/TopNews/RelationshipDiagram.tsx
// AI-Generated Relationship Map Visualization

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Zap, ArrowRight } from 'lucide-react';

interface RelationshipNode {
  id: string;
  type: 'event' | 'asset' | 'indicator' | 'decision' | 'condition' | 'outcome';
  label: string;
  details?: string;
  connections: { targetId: string; label?: string; type?: 'positive' | 'negative' | 'neutral' }[];
}

interface RelationshipDiagramProps {
  relationships: RelationshipNode[];
  title?: string;
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; icon: typeof Brain }> = {
  event: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: Zap },
  asset: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: Target },
  indicator: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: TrendingUp },
  decision: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: Brain },
  condition: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: AlertTriangle },
  outcome: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: Target },
};

const CONNECTION_COLORS = {
  positive: 'text-emerald-500',
  negative: 'text-red-500',
  neutral: 'text-zinc-500',
};

export const RelationshipDiagram: React.FC<RelationshipDiagramProps> = ({ 
  relationships,
  title = 'AI Relationship Analysis'
}) => {
  // Group nodes by type for layered layout
  const groupedNodes = useMemo(() => {
    const groups: Record<string, RelationshipNode[]> = {
      event: [],
      indicator: [],
      condition: [],
      asset: [],
      decision: [],
      outcome: [],
    };
    
    relationships.forEach(node => {
      if (groups[node.type]) {
        groups[node.type].push(node);
      } else {
        groups.event.push(node);
      }
    });
    
    return groups;
  }, [relationships]);

  // Create a map for quick node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, RelationshipNode>();
    relationships.forEach(node => map.set(node.id, node));
    return map;
  }, [relationships]);

  if (!relationships || relationships.length === 0) {
    return (
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="text-center text-zinc-500">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>ไม่มีข้อมูลความเชื่อมโยง</p>
          <p className="text-xs mt-1">AI กำลังวิเคราะห์...</p>
        </div>
      </Card>
    );
  }

  const renderNode = (node: RelationshipNode) => {
    const style = NODE_COLORS[node.type] || NODE_COLORS.event;
    const IconComponent = style.icon;

    return (
      <div
        key={node.id}
        className={`
          relative p-3 rounded-lg border-2 transition-all cursor-pointer
          ${style.bg} ${style.border} hover:scale-105
        `}
        title={node.details || node.label}
      >
        <div className="flex items-center gap-2 mb-1">
          <IconComponent className={`w-4 h-4 ${style.text}`} />
          <span className={`text-sm font-medium ${style.text}`}>{node.label}</span>
        </div>
        {node.details && (
          <p className="text-[10px] text-zinc-500 line-clamp-2">{node.details}</p>
        )}
        <Badge 
          variant="outline" 
          className={`absolute -top-2 -right-2 text-[8px] px-1.5 py-0 ${style.border} ${style.text}`}
        >
          {node.type}
        </Badge>
      </div>
    );
  };

  const renderConnections = (node: RelationshipNode) => {
    return node.connections.map((conn, i) => {
      const targetNode = nodeMap.get(conn.targetId);
      if (!targetNode) return null;

      const colorClass = CONNECTION_COLORS[conn.type || 'neutral'];

      return (
        <div 
          key={`${node.id}-${conn.targetId}-${i}`}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/30 rounded-full"
        >
          <span className="text-xs text-zinc-400">{node.label}</span>
          <div className={`flex items-center gap-1 ${colorClass}`}>
            <ArrowRight className="w-3 h-3" />
            <span className="text-[10px]">{conn.label || '→'}</span>
          </div>
          <span className="text-xs text-zinc-400">{targetNode.label}</span>
        </div>
      );
    });
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-emerald-400" />
        <h3 className="text-sm font-medium text-white">{title}</h3>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
          AI Generated
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(NODE_COLORS).map(([type, style]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${style.bg} ${style.border} border`} />
            <span className="text-[10px] text-zinc-500 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Flow Layout */}
      <div className="space-y-4">
        {/* Layer 1: Events */}
        {groupedNodes.event.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Events & Triggers</p>
            <div className="flex flex-wrap gap-2">
              {groupedNodes.event.map(renderNode)}
            </div>
          </div>
        )}

        {/* Layer 2: Indicators */}
        {groupedNodes.indicator.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Indicators & Signals</p>
            <div className="flex flex-wrap gap-2">
              {groupedNodes.indicator.map(renderNode)}
            </div>
          </div>
        )}

        {/* Layer 3: Conditions */}
        {groupedNodes.condition.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Conditions</p>
            <div className="flex flex-wrap gap-2">
              {groupedNodes.condition.map(renderNode)}
            </div>
          </div>
        )}

        {/* Layer 4: Assets */}
        {groupedNodes.asset.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Affected Assets</p>
            <div className="flex flex-wrap gap-2">
              {groupedNodes.asset.map(renderNode)}
            </div>
          </div>
        )}

        {/* Layer 5: Decisions */}
        {groupedNodes.decision.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Trading Decisions</p>
            <div className="flex flex-wrap gap-2">
              {groupedNodes.decision.map(renderNode)}
            </div>
          </div>
        )}

        {/* Layer 6: Outcomes */}
        {groupedNodes.outcome.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Expected Outcomes</p>
            <div className="flex flex-wrap gap-2">
              {groupedNodes.outcome.map(renderNode)}
            </div>
          </div>
        )}
      </div>

      {/* Connections Flow */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide">Relationships</p>
        <div className="flex flex-wrap gap-2">
          {relationships.flatMap(node => renderConnections(node))}
        </div>
      </div>
    </Card>
  );
};

export default RelationshipDiagram;
