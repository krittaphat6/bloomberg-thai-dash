import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${
          selected ? 'stroke-primary' : data?.color ? '' : 'stroke-border'
        } ${data?.animated ? 'animate-pulse' : ''}`}
        d={edgePath}
        strokeWidth={selected ? 3 : 2}
        fill="none"
        stroke={data?.color}
        markerEnd="url(#arrowhead-labeled)"
      />
      
      <defs>
        <marker
          id="arrowhead-labeled"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={selected ? 'hsl(var(--primary))' : data?.color || 'hsl(var(--border))'}
          />
        </marker>
      </defs>

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan bg-background/90 backdrop-blur border border-border rounded px-2 py-1 text-xs shadow-sm font-medium"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}