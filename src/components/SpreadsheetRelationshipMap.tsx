import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';

interface SpreadsheetRelationshipMapProps {
  data: any;
  columns: string[];
}

interface Node {
  id: string;
  name: string;
  type: 'security' | 'fund' | 'region';
  value: number;
  group: number;
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

// Louvain community detection algorithm
class LouvainCommunityDetection {
  private graph: Map<string, Set<string>>;
  private weights: Map<string, Map<string, number>>;
  private communities: Map<string, number>;

  constructor(nodes: string[], edges: Array<{ source: string; target: string; weight: number }>) {
    this.graph = new Map();
    this.weights = new Map();
    this.communities = new Map();

    nodes.forEach(node => {
      this.graph.set(node, new Set());
      this.weights.set(node, new Map());
      this.communities.set(node, nodes.indexOf(node));
    });

    edges.forEach(({ source, target, weight }) => {
      this.graph.get(source)?.add(target);
      this.graph.get(target)?.add(source);
      this.weights.get(source)?.set(target, weight);
      this.weights.get(target)?.set(source, weight);
    });
  }

  detect(): Map<string, number> {
    let improved = true;
    let iteration = 0;

    while (improved && iteration < 10) {
      improved = false;
      iteration++;

      const nodes = Array.from(this.graph.keys());
      for (const node of nodes) {
        const currentCommunity = this.communities.get(node)!;
        const neighbors = this.graph.get(node)!;
        
        const communityGains = new Map<number, number>();
        
        for (const neighbor of neighbors) {
          const neighborCommunity = this.communities.get(neighbor)!;
          const weight = this.weights.get(node)?.get(neighbor) || 1;
          
          if (!communityGains.has(neighborCommunity)) {
            communityGains.set(neighborCommunity, 0);
          }
          communityGains.set(neighborCommunity, communityGains.get(neighborCommunity)! + weight);
        }

        let bestCommunity = currentCommunity;
        let bestGain = communityGains.get(currentCommunity) || 0;

        for (const [community, gain] of communityGains) {
          if (gain > bestGain) {
            bestGain = gain;
            bestCommunity = community;
          }
        }

        if (bestCommunity !== currentCommunity) {
          this.communities.set(node, bestCommunity);
          improved = true;
        }
      }
    }

    return this.communities;
  }
}

export default function SpreadsheetRelationshipMap({ data, columns }: SpreadsheetRelationshipMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, links } = useMemo(() => {
    if (!data || !data.rows || data.rows.length === 0) {
      return { nodes: [], links: [] };
    }

    const nodeMap = new Map<string, Node>();
    const linkMap = new Map<string, number>();
    
    // Parse spreadsheet data
    data.rows.forEach((row: any, idx: number) => {
      const security = row[columns.indexOf('Security')] || row[1];
      const ticker = row[columns.indexOf('Ticker')] || row[2];
      const fund = row[columns.indexOf('Fund')] || row[3];
      const region = row[columns.indexOf('Region')] || row[10];
      const marketValue = parseFloat(row[columns.indexOf('Current Mkt Val')] || row[7] || '0');

      if (!security || !fund) return;

      // Create security node
      const securityId = `security-${ticker || security}`;
      if (!nodeMap.has(securityId)) {
        nodeMap.set(securityId, {
          id: securityId,
          name: ticker || security,
          type: 'security',
          value: 0,
          group: 0
        });
      }
      nodeMap.get(securityId)!.value += marketValue;

      // Create fund node
      const fundId = `fund-${fund}`;
      if (!nodeMap.has(fundId)) {
        nodeMap.set(fundId, {
          id: fundId,
          name: fund,
          type: 'fund',
          value: 0,
          group: 0
        });
      }
      nodeMap.get(fundId)!.value += marketValue;

      // Create region node
      if (region) {
        const regionId = `region-${region}`;
        if (!nodeMap.has(regionId)) {
          nodeMap.set(regionId, {
            id: regionId,
            name: region,
            type: 'region',
            value: 0,
            group: 0
          });
        }
        nodeMap.get(regionId)!.value += marketValue;

        // Link security to region
        const linkKey = `${securityId}-${regionId}`;
        linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + marketValue);
      }

      // Link fund to security
      const linkKey = `${fundId}-${securityId}`;
      linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + marketValue);
    });

    const nodesArray = Array.from(nodeMap.values());
    const linksArray: Link[] = Array.from(linkMap.entries()).map(([key, value]) => {
      const [source, target] = key.split('-').map((id, i) => {
        const prefix = i === 0 ? id.split('-')[0] : id.split('-')[0];
        return key.includes(`${prefix}-`) ? key.split('-').slice(0, 2).join('-') : id;
      });
      return { source, target, value };
    });

    // Apply Louvain community detection
    const nodeIds = nodesArray.map(n => n.id);
    const edges = linksArray.map(l => ({
      source: typeof l.source === 'string' ? l.source : l.source.id,
      target: typeof l.target === 'string' ? l.target : l.target.id,
      weight: l.value
    }));

    const louvain = new LouvainCommunityDetection(nodeIds, edges);
    const communities = louvain.detect();

    // Assign community groups to nodes
    nodesArray.forEach(node => {
      node.group = communities.get(node.id) || 0;
    });

    return { nodes: nodesArray, links: linksArray };
  }, [data, columns]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append('g');

    // Color scale for communities
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => 100 - (d.value / 1000000))
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => Math.sqrt(d.value / 100000) + 10));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#4B5563')
      .attr('stroke-width', (d: any) => Math.sqrt(d.value / 1000000) || 1)
      .attr('stroke-opacity', 0.6);

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles
    node.append('circle')
      .attr('r', (d: any) => Math.sqrt(d.value / 100000) + 5)
      .attr('fill', (d: any) => colorScale(d.group.toString()))
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 2);

    // Add labels
    node.append('text')
      .text((d: any) => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => Math.sqrt(d.value / 100000) + 20)
      .attr('font-size', '10px')
      .attr('fill', '#F3F4F6')
      .attr('font-weight', '500')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No data available for relationship mapping</p>
          <p className="text-xs mt-1">Import spreadsheet data to visualize relationships</p>
        </div>
      </div>
    );
  }

  const uniqueGroups = new Set(nodes.map(n => n.group));

  return (
    <div className="relative w-full h-full bg-background">
      <div className="absolute top-2 left-2 z-10 flex gap-2 flex-wrap max-w-md">
        <Badge variant="outline" className="bg-background/90 backdrop-blur">
          <Network className="h-3 w-3 mr-1" />
          {nodes.length} Nodes
        </Badge>
        <Badge variant="outline" className="bg-background/90 backdrop-blur">
          {links.length} Connections
        </Badge>
        <Badge variant="outline" className="bg-background/90 backdrop-blur">
          {uniqueGroups.size} Communities
        </Badge>
      </div>
      
      <div className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur border border-border rounded p-2 text-xs">
        <div className="font-semibold mb-1 text-terminal-green">Controls:</div>
        <div className="space-y-0.5 text-muted-foreground">
          <div>🖱️ Drag nodes to move</div>
          <div>🔍 Scroll to zoom</div>
          <div>✋ Drag background to pan</div>
        </div>
      </div>

      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
