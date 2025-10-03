import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CategorySection {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface SupplyChainNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: string;
  value: number;
  color: string;
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

    // Define category sections (Bloomberg Terminal style)
    const categories: CategorySection[] = [
      { id: 'indices', title: 'Indices', x: 50, y: 50, width: 150, height: 200, color: '#1e40af' },
      { id: 'news', title: 'News', x: 50, y: 280, width: 150, height: 150, color: '#1e40af' },
      { id: 'events', title: 'Events', x: 50, y: 460, width: 150, height: 150, color: '#1e40af' },
      
      { id: 'options', title: 'Options', x: 230, y: 350, width: 150, height: 120, color: '#6b7280' },
      { id: 'exchanges', title: 'Exchanges', x: 230, y: 500, width: 150, height: 120, color: '#6b7280' },
      
      { id: 'cdss', title: 'CDSs', x: 410, y: 350, width: 120, height: 120, color: '#6b7280' },
      
      { id: 'balance', title: 'Balance Sheet', x: 560, y: 350, width: 150, height: 120, color: '#6b7280' },
      
      { id: 'executives', title: 'Executives', x: 740, y: 350, width: 150, height: 120, color: '#6b7280' },
      
      { id: 'board', title: 'Board', x: 1000, y: 50, width: 150, height: 200, color: '#f59e0b' },
      { id: 'analysts', title: 'Analysts', x: 1000, y: 280, width: 150, height: 150, color: '#22c55e' },
    ];

    // Central company node position
    const centralX = width / 2;
    const centralY = height / 2;

    // Parse spreadsheet data and create nodes
    const nodes: SupplyChainNode[] = [];
    const companiesMap = new Map<string, number>();

    // Parse spreadsheet data
    Object.entries(data).forEach(([cellAddress, value]) => {
      if (!value || typeof value !== 'string') return;
      
      const match = cellAddress.match(/([A-Z]+)(\d+)/);
      if (!match) return;
      
      const rowNum = parseInt(match[2]);
      if (rowNum <= 1) return; // Skip header
      
      const colLetter = match[1];
      let colIndex = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
      }
      colIndex--;
      
      const columnName = columns[colIndex];
      
      // Categorize based on column
      let category = 'news';
      if (columnName === 'Ticker' || columnName === 'Fund') category = 'indices';
      else if (columnName === 'Region') category = 'board';
      else if (columnName === 'Security') category = 'analysts';
      
      companiesMap.set(value.substring(0, 20), (companiesMap.get(value) || 0) + 1);
    });

    // Create nodes for each category
    categories.forEach(cat => {
      const itemsInCategory = Math.floor(Math.random() * 5) + 3;
      
      for (let i = 0; i < itemsInCategory; i++) {
        nodes.push({
          id: `${cat.id}-${i}`,
          name: `${cat.title} ${i + 1}`,
          category: cat.id,
          value: 20 + Math.random() * 30,
          color: cat.color,
          x: cat.x + Math.random() * cat.width,
          y: cat.y + Math.random() * cat.height,
          fx: cat.x + cat.width / 2 + (Math.random() - 0.5) * (cat.width * 0.8),
          fy: cat.y + cat.height / 2 + (Math.random() - 0.5) * (cat.height * 0.8)
        });
      }
    });

    // Add central node
    nodes.push({
      id: 'central',
      name: 'MRK US Equity',
      category: 'central',
      value: 150,
      color: '#22c55e',
      x: centralX,
      y: centralY,
      fx: centralX,
      fy: centralY
    });

    // Create links from categories to central node
    const links: SupplyChainLink[] = categories.flatMap(cat => 
      nodes
        .filter(n => n.category === cat.id)
        .map(n => ({
          source: n.id,
          target: 'central',
          value: 1
        }))
    );

    // D3 Visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    // Draw category sections (background rectangles)
    g.selectAll('.category-bg')
      .data(categories)
      .enter()
      .append('rect')
      .attr('class', 'category-bg')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0.1)
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.5)
      .attr('rx', 8);

    // Draw category titles
    g.selectAll('.category-title')
      .data(categories)
      .enter()
      .append('text')
      .attr('class', 'category-title')
      .attr('x', d => d.x + d.width / 2)
      .attr('y', d => d.y - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', d => d.color)
      .text(d => d.title);

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, SupplyChainNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Node circles
    node.append('circle')
      .attr('r', d => d.id === 'central' ? 50 : 12)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .text(d => d.name.substring(0, 15))
      .attr('x', 0)
      .attr('y', d => d.id === 'central' ? 60 : 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.id === 'central' ? '12px' : '9px')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<SupplyChainNode, SupplyChainLink>(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('collision', d3.forceCollide().radius(15))
      .alphaDecay(0.05);

    simulation.on('tick', () => {
      // Keep nodes within their categories
      nodes.forEach(n => {
        if (n.category !== 'central') {
          const cat = categories.find(c => c.id === n.category);
          if (cat) {
            n.x = Math.max(cat.x + 15, Math.min(cat.x + cat.width - 15, n.x!));
            n.y = Math.max(cat.y + 15, Math.min(cat.y + cat.height - 15, n.y!));
          }
        }
      });

      link
        .attr('x1', d => (d.source as SupplyChainNode).x!)
        .attr('y1', d => (d.source as SupplyChainNode).y!)
        .attr('x2', d => (d.target as SupplyChainNode).x!)
        .attr('y2', d => (d.target as SupplyChainNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, SupplyChainNode, SupplyChainNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, SupplyChainNode, SupplyChainNode>) {
      const cat = categories.find(c => c.id === event.subject.category);
      if (cat && event.subject.category !== 'central') {
        event.subject.fx = Math.max(cat.x + 15, Math.min(cat.x + cat.width - 15, event.x));
        event.subject.fy = Math.max(cat.y + 15, Math.min(cat.y + cat.height - 15, event.y));
      } else if (event.subject.category === 'central') {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, SupplyChainNode, SupplyChainNode>) {
      if (!event.active) simulation.alphaTarget(0);
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
    <Card className="w-full h-full bg-black border-terminal-green/30">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-terminal-green/30">
        <CardTitle className="flex items-center gap-2 text-terminal-green text-sm font-mono">
          <Network className="h-4 w-4" />
          RELATIONSHIP MAP
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-terminal-amber font-mono">
            Zoom: {(zoomLevel * 100).toFixed(0)}%
          </span>
          <Button size="sm" variant="outline" onClick={handleZoomIn} className="h-7 w-7 p-0">
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut} className="h-7 w-7 p-0">
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset} className="h-7 w-7 p-0">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)] p-0">
        <svg ref={svgRef} className="w-full h-full bg-black" />
      </CardContent>
    </Card>
  );
}
