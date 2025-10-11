import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, RefreshCw, ZoomIn, ZoomOut, Minimize2, Maximize2, X } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  group: number;
  value: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Louvain Community Detection Algorithm (simplified)
class LouvainCommunity {
  static detectCommunities(nodes: Node[], links: Link[]): Map<string, number> {
    const communities = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();
    
    // Build adjacency list
    nodes.forEach(node => {
      adjacency.set(node.id, new Set());
      communities.set(node.id, parseInt(node.id)); // Initial: each node is its own community
    });
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      adjacency.get(sourceId)?.add(targetId);
      adjacency.get(targetId)?.add(sourceId);
    });
    
    // Simple modularity optimization
    let improved = true;
    let iterations = 0;
    const maxIterations = 10;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      nodes.forEach(node => {
        const neighbors = adjacency.get(node.id) || new Set();
        const communityCount = new Map<number, number>();
        
        // Count neighbor communities
        neighbors.forEach(neighborId => {
          const community = communities.get(neighborId);
          if (community !== undefined) {
            communityCount.set(community, (communityCount.get(community) || 0) + 1);
          }
        });
        
        // Move to most common neighbor community
        if (communityCount.size > 0) {
          const bestCommunity = Array.from(communityCount.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
          
          if (communities.get(node.id) !== bestCommunity) {
            communities.set(node.id, bestCommunity);
            improved = true;
          }
        }
      });
    }
    
    return communities;
  }
}

// Generate mock financial network data
const generateMockData = (): GraphData => {
  const categories = [
    { name: 'Indices', count: 8, color: 0 },
    { name: 'Peers', count: 12, color: 1 },
    { name: 'Holders', count: 10, color: 2 },
    { name: 'Analysts', count: 8, color: 3 },
    { name: 'Board', count: 6, color: 4 },
    { name: 'Executives', count: 7, color: 5 },
    { name: 'Events', count: 5, color: 6 },
    { name: 'Options', count: 4, color: 7 },
    { name: 'Exchanges', count: 6, color: 8 },
    { name: 'Balance Sheet', count: 8, color: 9 },
    { name: 'CDSs', count: 4, color: 10 },
  ];

  const nodes: Node[] = [];
  let nodeId = 0;

  categories.forEach(category => {
    for (let i = 0; i < category.count; i++) {
      nodes.push({
        id: `${nodeId}`,
        name: `${category.name} ${i + 1}`,
        group: category.color,
        value: Math.random() * 50 + 20
      });
      nodeId++;
    }
  });

  // Generate links with higher probability within same group
  const links: Link[] = [];
  nodes.forEach((node, i) => {
    // Connect to some nodes in same group
    const sameGroupNodes = nodes.filter(n => n.group === node.group && n.id !== node.id);
    const intraConnections = Math.min(3, sameGroupNodes.length);
    for (let j = 0; j < intraConnections; j++) {
      if (Math.random() > 0.3) {
        const target = sameGroupNodes[Math.floor(Math.random() * sameGroupNodes.length)];
        links.push({
          source: node.id,
          target: target.id,
          value: Math.random() * 5 + 1
        });
      }
    }

    // Connect to some nodes in different groups
    const otherGroupNodes = nodes.filter(n => n.group !== node.group);
    const interConnections = Math.min(2, otherGroupNodes.length);
    for (let j = 0; j < interConnections; j++) {
      if (Math.random() > 0.7) {
        const target = otherGroupNodes[Math.floor(Math.random() * otherGroupNodes.length)];
        links.push({
          source: node.id,
          target: target.id,
          value: Math.random() * 3 + 0.5
        });
      }
    }
  });

  return { nodes, links };
};

interface ABLEFocusProps {
  onMaximize?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  className?: string;
}

export const ABLEFocus = ({ onMaximize, onMinimize, onClose, className }: ABLEFocusProps = {}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Load data
    const mockData = generateMockData();
    
    // Apply community detection
    const communities = LouvainCommunity.detectCommunities(mockData.nodes, mockData.links);
    mockData.nodes.forEach(node => {
      node.group = communities.get(node.id) || node.group;
    });
    
    setData(mockData);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Color scheme - terminal theme
    const colorScale = d3.scaleOrdinal<number, string>()
      .domain(d3.range(0, 15))
      .range([
        '#10b981', // terminal-green
        '#f59e0b', // terminal-amber
        '#3b82f6', // blue
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
        '#f97316', // orange
        '#84cc16', // lime
        '#06b6d4', // cyan
        '#6366f1', // indigo
        '#a855f7', // violet
        '#22c55e', // green
        '#eab308', // yellow
        '#ef4444', // red
        '#64748b', // slate
      ]);

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior as any);

    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(data.nodes)
      .force('link', d3.forceLink<Node, Link>(data.links)
        .id(d => d.id)
        .distance(80)
        .strength(0.5))
      .force('charge', d3.forceManyBody()
        .strength(-300)
        .distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => (d as Node).value + 5))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', '#374151')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', d => Math.sqrt(d.value));

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    // Add circles
    node.append('circle')
      .attr('r', d => d.value)
      .attr('fill', d => colorScale(d.group))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0px 2px 6px rgba(0,0,0,0.6))')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      })
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke', '#10b981')
          .attr('stroke-width', 3);
      })
      .on('mouseout', function(event, d) {
        if (selectedNode?.id !== d.id) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke', '#1f2937')
            .attr('stroke-width', 2);
        }
      });

    // Add labels
    node.append('text')
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name)
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', '#ffffff')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.value + 15)
      .style('text-shadow', '0px 1px 3px rgba(0,0,0,0.9)')
      .style('pointer-events', 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x || 0)
        .attr('y1', d => (d.source as Node).y || 0)
        .attr('x2', d => (d.target as Node).x || 0)
        .attr('y2', d => (d.target as Node).y || 0);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Clear selection on background click
    svg.on('click', () => setSelectedNode(null));

    return () => {
      simulation.stop();
    };
  }, [data, selectedNode]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call((d3.zoom<SVGSVGElement, unknown>() as any).scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call((d3.zoom<SVGSVGElement, unknown>() as any).scaleBy, 0.7);
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call((d3.zoom<SVGSVGElement, unknown>() as any).transform, d3.zoomIdentity);
    setData(generateMockData());
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        handleReset();
      }
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      }
      if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Card className={`h-full bg-background border-border flex flex-col ${className || ''}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-green flex items-center gap-2">
            <Network className="h-5 w-5" />
            ABLE Focus
            <Badge variant="outline" className="ml-2 text-terminal-amber border-terminal-amber/30">
              Smart Clustering
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8"
              title="Zoom Out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8"
              title="Zoom In (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-8 w-8"
              title="Refresh (R)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {onMaximize && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMaximize}
                className="h-8 w-8 text-terminal-green hover:bg-terminal-green/20"
                title="Maximize"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            
            {onMinimize && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMinimize}
                className="h-8 w-8 text-terminal-amber hover:bg-terminal-amber/20"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-terminal-red hover:bg-terminal-red/20"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <Badge variant="outline" className="text-muted-foreground">
              Zoom: {(zoom * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        <svg 
          ref={svgRef} 
          className="w-full h-full"
          style={{ background: '#000000' }}
        />
        {selectedNode && (
          <div className="absolute top-4 left-4 bg-background/95 border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
            <div className="text-sm font-semibold text-terminal-green mb-1">
              {selectedNode.name}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Group: {selectedNode.group}</div>
              <div>Value: {selectedNode.value.toFixed(1)}</div>
              <div>ID: {selectedNode.id}</div>
            </div>
          </div>
        )}
        
        {/* Keyboard Shortcuts Info */}
        <div className="absolute bottom-4 right-4 bg-muted/90 rounded-lg p-3 text-xs space-y-1 backdrop-blur-sm">
          <p className="font-semibold mb-2">⌨️ Shortcuts:</p>
          <p>• <kbd className="px-1 py-0.5 bg-background rounded">R</kbd> Refresh</p>
          <p>• <kbd className="px-1 py-0.5 bg-background rounded">+</kbd> Zoom in</p>
          <p>• <kbd className="px-1 py-0.5 bg-background rounded">-</kbd> Zoom out</p>
          <p>• 🖱️ Click nodes for details</p>
        </div>
        
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
          <span>{data.nodes.length} nodes • {data.links.length} connections</span>
        </div>
      </CardContent>
    </Card>
  );
};
