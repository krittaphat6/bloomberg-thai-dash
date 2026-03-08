import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Trade } from '@/utils/tradingMetrics';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut, Network, Eye, EyeOff } from 'lucide-react';

interface TradeNode extends d3.SimulationNodeDatum {
  id: string;
  trade: Trade;
  radius: number;
  color: string;
  label: string;
}

interface TradeLink extends d3.SimulationLinkDatum<TradeNode> {
  type: 'symbol' | 'strategy' | 'folder';
  color: string;
}

type GroupBy = 'symbol' | 'strategy' | 'session';

export default function TradeGraphTab({ trades }: { trades: Trade[]; initialCapital?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showClusters, setShowClusters] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('symbol');

  // Limit nodes for performance
  const activeTrades = useMemo(() => trades.slice(0, 200), [trades]);

  const getNodeColor = useCallback((trade: Trade) => {
    if (trade.status === 'OPEN') return 'hsl(var(--muted-foreground))';
    if ((trade.pnl ?? 0) > 0) return '#22C55E';
    if ((trade.pnl ?? 0) < 0) return '#EF4444';
    return 'hsl(var(--muted-foreground))';
  }, []);

  const getNodeRadius = useCallback((trade: Trade) => {
    const absPnl = Math.abs(trade.pnl ?? 0);
    return Math.max(6, Math.min(28, 6 + Math.sqrt(absPnl) * 0.8));
  }, []);

  // Build nodes & links
  const { nodes, links, clusters } = useMemo(() => {
    const nodes: TradeNode[] = activeTrades.map(t => ({
      id: t.id,
      trade: t,
      radius: getNodeRadius(t),
      color: getNodeColor(t),
      label: `${t.symbol} ${t.date?.slice(5, 10) || ''}`,
    }));

    const links: TradeLink[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Group by key
    const groupMap = new Map<string, string[]>();
    activeTrades.forEach(t => {
      let key = '';
      if (groupBy === 'symbol') key = t.symbol;
      else if (groupBy === 'strategy') key = t.strategy || 'none';
      else key = t.folderId || 'default';

      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(t.id);
    });

    // Create links within groups (limit links per group)
    groupMap.forEach(ids => {
      const maxLinks = Math.min(ids.length, 15);
      for (let i = 0; i < maxLinks; i++) {
        for (let j = i + 1; j < Math.min(i + 3, ids.length); j++) {
          links.push({
            source: ids[i],
            target: ids[j],
            type: groupBy === 'symbol' ? 'symbol' : groupBy === 'strategy' ? 'strategy' : 'folder',
            color: groupBy === 'symbol' ? 'rgba(255,255,255,0.15)' : groupBy === 'strategy' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)',
          });
        }
      }
    });

    // Also add cross-symbol links for same strategy (secondary)
    if (groupBy === 'symbol') {
      const stratMap = new Map<string, string[]>();
      activeTrades.forEach(t => {
        const s = t.strategy || 'none';
        if (!stratMap.has(s)) stratMap.set(s, []);
        stratMap.get(s)!.push(t.id);
      });
      stratMap.forEach(ids => {
        for (let i = 0; i < Math.min(ids.length - 1, 5); i++) {
          links.push({
            source: ids[i],
            target: ids[i + 1],
            type: 'strategy',
            color: 'rgba(139,92,246,0.15)',
          });
        }
      });
    }

    // Clusters
    const clusters = Array.from(groupMap.entries()).map(([key, ids], i) => ({
      key,
      ids,
      color: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][i % 8],
    }));

    return { nodes, links, clusters };
  }, [activeTrades, groupBy, getNodeColor, getNodeRadius]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 500;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<TradeNode, TradeLink>(links).id(d => d.id).distance(60).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<TradeNode>().radius(d => d.radius + 4));

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', d => d.type === 'strategy' ? '4,3' : d.type === 'folder' ? '2,4' : 'none');

    // Cluster boundaries
    const clusterGroup = g.append('g').attr('class', 'clusters');

    // Nodes
    const node = g.append('g')
      .selectAll<SVGCircleElement, TradeNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.85)
      .on('click', (_, d) => setSelectedTrade(d.trade))
      .on('mouseenter', function (_, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 2);
        tooltip.style('display', 'block')
          .html(`<b>${d.trade.symbol}</b><br>${d.trade.side} | ${d.trade.status}<br>P&L: ${(d.trade.pnl ?? 0).toFixed(2)}<br>${d.trade.strategy || ''}`);
      })
      .on('mousemove', (event) => {
        const [x, y] = d3.pointer(event, svg.node());
        tooltip.style('left', `${x + 12}px`).style('top', `${y - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.85).attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1);
        tooltip.style('display', 'none');
      })
      .call(d3.drag<SVGCircleElement, TradeNode>()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Labels (only for larger nodes)
    const labels = g.append('g')
      .selectAll('text')
      .data(nodes.filter(n => n.radius > 12))
      .join('text')
      .text(d => d.trade.symbol)
      .attr('font-size', 9)
      .attr('fill', 'hsl(var(--foreground))')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 12)
      .attr('opacity', 0.7)
      .attr('pointer-events', 'none');

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .style('position', 'absolute')
      .style('display', 'none')
      .style('background', 'rgba(0,0,0,0.85)')
      .style('border', '1px solid rgba(34,197,94,0.3)')
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('font-size', '11px')
      .style('color', '#fff')
      .style('pointer-events', 'none')
      .style('z-index', '50');

    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as TradeNode).x!)
        .attr('y1', d => (d.source as TradeNode).y!)
        .attr('x2', d => (d.target as TradeNode).x!)
        .attr('y2', d => (d.target as TradeNode).y!);

      node.attr('cx', d => d.x!).attr('cy', d => d.y!);
      labels.attr('x', d => d.x!).attr('y', d => d.y!);

      // Draw cluster boundaries
      if (showClusters) {
        clusterGroup.selectAll('*').remove();
        clusters.forEach(cluster => {
          const clusterNodes = nodes.filter(n => cluster.ids.includes(n.id));
          if (clusterNodes.length < 2) return;
          const cx = d3.mean(clusterNodes, n => n.x!) || 0;
          const cy = d3.mean(clusterNodes, n => n.y!) || 0;
          const maxDist = d3.max(clusterNodes, n => Math.hypot(n.x! - cx, n.y! - cy)) || 30;

          clusterGroup.append('circle')
            .attr('cx', cx).attr('cy', cy)
            .attr('r', maxDist + 20)
            .attr('fill', 'none')
            .attr('stroke', cluster.color)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '6,4')
            .attr('opacity', 0.25);

          clusterGroup.append('text')
            .attr('x', cx).attr('y', cy - maxDist - 24)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .attr('fill', cluster.color)
            .attr('opacity', 0.5)
            .text(cluster.key);
        });
      }
    });

    // Store zoom for buttons
    (svgRef.current as any).__zoom_behavior = zoom;
    (svgRef.current as any).__sim = sim;

    return () => {
      sim.stop();
      tooltip.remove();
    };
  }, [nodes, links, clusters, showClusters]);

  const handleZoom = (dir: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = (svgRef.current as any).__zoom_behavior;
    if (zoom) svg.transition().duration(300).call(zoom.scaleBy, dir > 0 ? 1.3 : 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = (svgRef.current as any).__zoom_behavior;
    if (zoom) svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    const sim = (svgRef.current as any).__sim;
    if (sim) sim.alpha(0.5).restart();
  };

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        ยังไม่มีข้อมูล trade สำหรับแสดงกราฟ
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => handleZoom(1)} className="h-7 px-2">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleZoom(-1)} className="h-7 px-2">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset} className="h-7 px-2">
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant={showClusters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowClusters(!showClusters)}
          className="h-7 px-2 text-xs"
        >
          {showClusters ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
          Clusters
        </Button>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] text-muted-foreground mr-1">Group:</span>
          {(['symbol', 'strategy', 'session'] as GroupBy[]).map(g => (
            <Button
              key={g}
              variant={groupBy === g ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setGroupBy(g)}
              className="h-6 px-2 text-[10px] capitalize"
            >
              {g === 'session' ? 'Folder' : g}
            </Button>
          ))}
        </div>

        <span className="text-[10px] text-muted-foreground">
          <Network className="w-3 h-3 inline mr-1" />
          {nodes.length} nodes · {links.length} links
          {trades.length > 200 && ` (showing 200/${trades.length})`}
        </span>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="relative w-full rounded-lg border border-border/50 overflow-hidden bg-background/50" style={{ height: 480 }}>
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1" /> กำไร</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1" /> ขาดทุน</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground mr-1" /> OPEN</span>
        <span className="border-l border-border pl-3">เส้นทึบ = Symbol · เส้นประ = Strategy · จุด = Folder</span>
      </div>

      {/* Selected trade details */}
      {selectedTrade && (
        <div className="p-3 rounded-lg border border-terminal-green/30 bg-terminal-green/5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-terminal-green">{selectedTrade.symbol} — {selectedTrade.side}</span>
            <button onClick={() => setSelectedTrade(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
            <span>Date: {selectedTrade.date}</span>
            <span>Entry: {selectedTrade.entryPrice}</span>
            <span>Exit: {selectedTrade.exitPrice ?? '—'}</span>
            <span className={`font-medium ${(selectedTrade.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              P&L: {(selectedTrade.pnl ?? 0).toFixed(2)}
            </span>
            <span>Strategy: {selectedTrade.strategy || '—'}</span>
            <span>Status: {selectedTrade.status}</span>
            {selectedTrade.emotion && <span>Emotion: {selectedTrade.emotion}</span>}
            {selectedTrade.notes && <span className="col-span-2">Notes: {selectedTrade.notes}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
