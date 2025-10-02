import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplyChainNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: string;
  value: number;
  type: 'company' | 'sector' | 'region' | 'holder' | 'analyst';
}

interface SupplyChainLink extends d3.SimulationLinkDatum<SupplyChainNode> {
  value: number;
}

interface SupplyChainVizProps {
  data: Record<string, any>;
  columns: string[];
}

export function SupplyChainViz({ data, columns }: SupplyChainVizProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomBehaviorRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 1400;
    const height = 800;

    // Parse spreadsheet data
    const nodes: SupplyChainNode[] = [];
    const links: SupplyChainLink[] = [];
    const nodeMap = new Map<string, SupplyChainNode>();

    // Add central node
    const centralNode: SupplyChainNode = {
      id: 'central',
      name: 'MRK US Equity',
      group: 'central',
      value: 200,
      type: 'company',
    };
    nodes.push(centralNode);
    nodeMap.set('central', centralNode);

    // Helper to create node if not exists
    const getOrCreateNode = (id: string, name: string, type: SupplyChainNode['type'], value: number) => {
      if (!nodeMap.has(id)) {
        const node: SupplyChainNode = { id, name, group: type, value, type };
        nodes.push(node);
        nodeMap.set(id, node);
      }
      return nodeMap.get(id)!;
    };

    // Parse data from spreadsheet
    const rows = new Map<number, Map<string, any>>();
    
    Object.entries(data).forEach(([cellAddress, value]) => {
      if (!value) return;
      
      const match = cellAddress.match(/([A-Z]+)(\d+)/);
      if (!match) return;
      
      const colLetter = match[1];
      const rowNum = parseInt(match[2]) - 1;
      
      let colIndex = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
      }
      colIndex--;
      
      if (!rows.has(rowNum)) {
        rows.set(rowNum, new Map());
      }
      const columnName = columns[colIndex] || `Col${colIndex}`;
      rows.get(rowNum)!.set(columnName, value);
    });

    // Create nodes from parsed rows
    rows.forEach((rowData, rowIndex) => {
      if (rowIndex === 0) return; // Skip header row
      
      const security = rowData.get('Security');
      const ticker = rowData.get('Ticker');
      const region = rowData.get('Region');
      const fund = rowData.get('Fund');
      
      if (security && typeof security === 'string') {
        const companyNode = getOrCreateNode(
          `company-${rowIndex}`,
          security.substring(0, 20),
          'company',
          80
        );
        links.push({
          source: 'central',
          target: companyNode.id,
          value: 2
        });
      }
      
      if (ticker && typeof ticker === 'string') {
        const sectorNode = getOrCreateNode(
          `sector-${ticker}`,
          ticker.split(' ')[0].substring(0, 15),
          'sector',
          50
        );
        links.push({
          source: 'central',
          target: sectorNode.id,
          value: 1
        });
      }
      
      if (region && typeof region === 'string') {
        const regionNode = getOrCreateNode(
          `region-${region}`,
          region.substring(0, 15),
          'region',
          100
        );
        links.push({
          source: 'central',
          target: regionNode.id,
          value: 3
        });
      }
      
      if (fund && typeof fund === 'string') {
        const holderNode = getOrCreateNode(
          `holder-${fund}`,
          fund.substring(0, 15),
          'holder',
          60
        );
        links.push({
          source: 'central',
          target: holderNode.id,
          value: 1.5
        });
      }
    });

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    const g = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<SupplyChainNode, SupplyChainLink>(links)
        .id(d => d.id)
        .distance(d => {
          const targetNode = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
          if (targetNode?.type === 'region') return 200;
          if (targetNode?.type === 'sector') return 150;
          if (targetNode?.type === 'holder') return 180;
          return 120;
        })
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SupplyChainNode>()
        .radius(d => {
          if (d.type === 'region') return 50;
          if (d.type === 'sector') return 35;
          if (d.type === 'holder') return 40;
          if (d.id === 'central') return 80;
          return 25;
        })
      );

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'hsl(var(--terminal-green))')
      .attr('stroke-width', d => Math.sqrt(d.value))
      .attr('stroke-opacity', 0.4);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, SupplyChainNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Node circles
    node.append('circle')
      .attr('r', d => {
        if (d.id === 'central') return 50;
        if (d.type === 'region') return 35;
        if (d.type === 'sector') return 20;
        if (d.type === 'holder') return 25;
        return 12;
      })
      .attr('fill', d => {
        if (d.id === 'central') return 'hsl(var(--terminal-green))';
        if (d.type === 'region') return '#22c55e';
        if (d.type === 'sector') return '#3b82f6';
        if (d.type === 'holder') return '#f59e0b';
        return '#10b981';
      })
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', d => {
        if (d.id === 'central') return 60;
        if (d.type === 'region') return 45;
        if (d.type === 'holder') return 35;
        return 25;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.id === 'central' ? '13px' : '10px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-weight', d => d.id === 'central' ? 'bold' : 'normal');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SupplyChainNode).x!)
        .attr('y1', d => (d.source as SupplyChainNode).y!)
        .attr('x2', d => (d.target as SupplyChainNode).x!)
        .attr('y2', d => (d.target as SupplyChainNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, SupplyChainNode, SupplyChainNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SupplyChainNode, SupplyChainNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, SupplyChainNode, SupplyChainNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, columns]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <Network className="h-5 w-5" />
          Relationship Map
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">
            Zoom: {(zoomLevel * 100).toFixed(0)}%
          </span>
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <div className="w-full h-full border border-border rounded-lg bg-background/50 overflow-hidden">
          <svg ref={svgRef} className="w-full h-full" />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-muted-foreground">Regions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            <span className="text-muted-foreground">Sectors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <span className="text-muted-foreground">Holders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
            <span className="text-muted-foreground">Companies</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-green))' }} />
            <span className="text-muted-foreground font-semibold">Central</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
