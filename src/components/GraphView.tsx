import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphClustering } from '@/utils/GraphClustering';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[];
  isFavorite: boolean;
  folder?: string;
}

interface GraphViewProps {
  notes: Note[];
  onNodeClick: (note: Note) => void;
  selectedNote: Note | null;
  searchTerm: string;
  selectedFolder: string;
  selectedTag: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  note: Note;
  connections: number;
  importance: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: 'direct' | 'shared-tag' | 'folder';
}

const COMMUNITY_COLORS = [
  '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

const importanceScore = (note: Note, allNotes: Note[]): number => {
  const directLinks = note.linkedNotes.length;
  const backLinks = allNotes.filter(n =>
    n.linkedNotes.includes(note.id) ||
    n.content.includes(`[[${note.title}]]`)
  ).length;
  const tagScore = note.tags.length * 0.5;
  const favoriteBonus = note.isFavorite ? 3 : 0;
  return directLinks * 2 + backLinks * 1.5 + tagScore + favoriteBonus;
};

export default function GraphView({
  notes,
  onNodeClick,
  selectedNote,
  searchTerm,
  selectedFolder,
  selectedTag
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [tooltip, setTooltip] = useState<{ note: Note; x: number; y: number } | null>(null);
  const [showClusters, setShowClusters] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [graphStats, setGraphStats] = useState({ nodes: 0, links: 0, clusters: 0 });

  const resetPositions = useCallback(() => {
    localStorage.removeItem('graph-positions');
    setFocusedNodeId(null);
    setResetKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Filter notes
    const filteredNotes = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = !selectedFolder || note.folder === selectedFolder;
      const matchesTag = !selectedTag || note.tags.includes(selectedTag);
      return matchesSearch && matchesFolder && matchesTag;
    });

    // Load saved positions
    const savedPositions = JSON.parse(localStorage.getItem('graph-positions') || '{}');

    // Create nodes with importance
    const nodes: GraphNode[] = filteredNotes.map(note => {
      const directLinks = note.linkedNotes.length;
      const backLinks = filteredNotes.filter(n =>
        n.linkedNotes.includes(note.id) ||
        n.content.includes(`[[${note.title}]]`)
      ).length;
      const importance = importanceScore(note, filteredNotes);
      const saved = savedPositions[note.id];

      return {
        id: note.id,
        title: note.title,
        note,
        connections: directLinks + backLinks,
        importance,
        x: saved?.x,
        y: saved?.y,
        fx: saved ? saved.x : undefined,
        fy: saved ? saved.y : undefined,
      };
    });

    // Create links (no proximity noise)
    const links: (GraphLink & { type: 'direct' | 'shared-tag' | 'folder' })[] = [];

    filteredNotes.forEach(note => {
      note.linkedNotes.forEach(linkedId => {
        if (filteredNotes.find(n => n.id === linkedId)) {
          links.push({ source: note.id, target: linkedId, type: 'direct' });
        }
      });

      const contentLinks = note.content.match(/\[\[([^\]]+)\]\]/g);
      if (contentLinks) {
        contentLinks.forEach(link => {
          const linkTitle = link.replace(/\[\[|\]\]/g, '');
          const targetNote = filteredNotes.find(n => n.title === linkTitle);
          if (targetNote && targetNote.id !== note.id) {
            const exists = links.some(l =>
              (l.source === note.id && l.target === targetNote.id) ||
              (l.source === targetNote.id && l.target === note.id)
            );
            if (!exists) links.push({ source: note.id, target: targetNote.id, type: 'direct' });
          }
        });
      }
    });

    // Shared tag links
    for (let i = 0; i < filteredNotes.length; i++) {
      for (let j = i + 1; j < filteredNotes.length; j++) {
        const a = filteredNotes[i], b = filteredNotes[j];
        const shared = a.tags.filter(t => b.tags.includes(t));
        if (shared.length > 0) {
          const exists = links.some(l =>
            (l.source === a.id && l.target === b.id) || (l.source === b.id && l.target === a.id)
          );
          if (!exists) links.push({ source: a.id, target: b.id, type: 'shared-tag' });
        }
      }
    }

    // Folder links
    for (let i = 0; i < filteredNotes.length; i++) {
      for (let j = i + 1; j < filteredNotes.length; j++) {
        const a = filteredNotes[i], b = filteredNotes[j];
        if (a.folder && b.folder && a.folder === b.folder) {
          const exists = links.some(l =>
            (l.source === a.id && l.target === b.id) || (l.source === b.id && l.target === a.id)
          );
          if (!exists) links.push({ source: a.id, target: b.id, type: 'folder' });
        }
      }
    }

    // Community detection
    const detectedCommunities = GraphClustering.detectCommunities(
      filteredNotes.map(n => ({ ...n, connections: 0 })),
      links
    );

    // Update stats
    const uniqueCommunities = new Set(detectedCommunities.values());
    setGraphStats({ nodes: nodes.length, links: links.length, clusters: uniqueCommunities.size });

    // --- SVG Defs for effects ---
    const defs = svg.append("defs");
    
    // Glow filter for favorite nodes
    const glowFilter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Radial gradient for background
    const bgGrad = defs.append("radialGradient").attr("id", "bg-gradient").attr("cx", "50%").attr("cy", "50%").attr("r", "60%");
    bgGrad.append("stop").attr("offset", "0%").attr("stop-color", "#1a1a2e").attr("stop-opacity", 1);
    bgGrad.append("stop").attr("offset", "100%").attr("stop-color", "#0a0a14").attr("stop-opacity", 1);

    // Background
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "url(#bg-gradient)");

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(l => {
          const t = (l as any).type;
          if (t === 'direct') return 80;
          if (t === 'shared-tag') return 120;
          if (t === 'folder') return 150;
          return 200;
        })
        .strength(l => {
          const t = (l as any).type;
          if (t === 'direct') return 0.8;
          if (t === 'shared-tag') return 0.4;
          if (t === 'folder') return 0.2;
          return 0.05;
        })
      )
      .force("charge", d3.forceManyBody()
        .strength(d => -200 - (d as GraphNode).connections * 30)
        .distanceMax(300)
      )
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius(d => 10 + Math.min((d as GraphNode).connections * 2, 20)).strength(0.8))
      .force("x", d3.forceX(width / 2).strength(0.02))
      .force("y", d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    // Release pinned positions after 500ms
    setTimeout(() => {
      nodes.forEach(n => { n.fx = null; n.fy = null; });
      simulation.alpha(0.1).restart();
    }, 500);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Double-click background to exit focus
    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
      setFocusedNodeId(null);
      node.transition().duration(300).style("opacity", 1);
      link.transition().duration(300).style("opacity", null);
    });

    // Cluster boundaries
    let clusterGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    if (showClusters && nodes.length > 1) {
      const clusters = GraphClustering.clusterByConnections(
        nodes.map(n => ({ ...n.note, connections: n.connections, x: n.x || 0, y: n.y || 0 })),
        Math.min(5, Math.ceil(nodes.length / 3))
      );
      clusterGroup = g.append("g").attr("class", "clusters");

      simulation.on("tick.clusters", () => {
        clusterGroup!.selectAll("*").remove();
        clusters.forEach(cluster => {
          const clusterNodes = nodes.filter(n => cluster.nodes.includes(n.id));
          if (clusterNodes.length < 2) return;
          const cx = d3.mean(clusterNodes, d => d.x) || 0;
          const cy = d3.mean(clusterNodes, d => d.y) || 0;
          const maxR = d3.max(clusterNodes, d => {
            const dx = (d.x || 0) - cx;
            const dy = (d.y || 0) - cy;
            return Math.sqrt(dx * dx + dy * dy);
          }) || 40;

          // Soft cluster boundary with gradient feel
          clusterGroup!.append("circle")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", maxR + 40)
            .attr("fill", cluster.color)
            .attr("fill-opacity", 0.03)
            .attr("stroke", cluster.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "8,4")
            .attr("stroke-opacity", 0.35);

          clusterGroup!.append("text")
            .attr("x", cx).attr("y", cy - maxR - 45)
            .attr("text-anchor", "middle")
            .attr("fill", cluster.color)
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("opacity", 0.6)
            .attr("letter-spacing", "0.5px")
            .text(cluster.label);
        });
      });
    }

    // --- Links with animated gradients ---
    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", d => {
        if (d.type === 'direct') return "rgba(255,255,255,0.6)";
        if (d.type === 'shared-tag') return "rgba(34,197,94,0.5)";
        if (d.type === 'folder') return "rgba(59,130,246,0.4)";
        return "rgba(255,255,255,0.2)";
      })
      .attr("stroke-width", d => {
        if (d.type === 'direct') return 1.5;
        if (d.type === 'shared-tag') return 1;
        return 0.8;
      })
      .attr("stroke-dasharray", d => d.type === 'folder' ? "4,3" : d.type === 'shared-tag' ? "2,2" : "none")
      .style("pointer-events", "none");

    // --- Nodes ---
    const node = g.append("g").selectAll("g").data(nodes).enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
          const pos = JSON.parse(localStorage.getItem('graph-positions') || '{}');
          pos[d.id] = { x: d.x, y: d.y };
          localStorage.setItem('graph-positions', JSON.stringify(pos));
        }));

    // Outer glow ring for favorite nodes
    node.filter(d => d.note.isFavorite).append("circle")
      .attr("r", d => 8 + Math.min(d.importance * 2, 20) + 6)
      .attr("fill", "none")
      .attr("stroke", d => {
        const cId = detectedCommunities.get(d.id) ?? 0;
        return COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
      })
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.3)
      .attr("filter", "url(#glow)");

    // Main node circles
    node.append("circle")
      .attr("r", d => {
        const r = 8 + Math.min(d.importance * 2, 20);
        return selectedNote?.id === d.id ? r + 2 : r;
      })
      .attr("fill", d => {
        const cId = detectedCommunities.get(d.id) ?? 0;
        const color = COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
        return color;
      })
      .attr("fill-opacity", 0.85)
      .attr("stroke", d => {
        if (selectedNote?.id === d.id) return "#FFFFFF";
        const cId = detectedCommunities.get(d.id) ?? 0;
        return COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
      })
      .attr("stroke-width", d => selectedNote?.id === d.id ? 3 : 1.5)
      .attr("stroke-opacity", d => selectedNote?.id === d.id ? 1 : 0.4)
      .style("filter", d => d.note.isFavorite ? "url(#glow)" : "none")
      .style("transition", "all 0.15s ease");

    // Inner highlight dot for important nodes
    node.filter(d => d.importance >= 5).append("circle")
      .attr("r", 3)
      .attr("fill", "white")
      .attr("fill-opacity", 0.6);

    // Label background + text
    node.each(function (d) {
      const el = d3.select(this);
      const label = d.title.length > 20 ? d.title.substring(0, 20) + '…' : d.title;
      const fontSize = d.importance >= 5 ? 11 : 9;
      const fontWeight = d.importance >= 5 ? '600' : '400';
      const r = 8 + Math.min(d.importance * 2, 20) + (selectedNote?.id === d.id ? 2 : 0);
      const yOff = r + 14;

      const textWidth = label.length * (fontSize * 0.55);

      el.append("rect")
        .attr("x", -textWidth / 2 - 4)
        .attr("y", yOff - fontSize)
        .attr("width", textWidth + 8)
        .attr("height", fontSize + 6)
        .attr("rx", 4)
        .attr("fill", "rgba(10,10,20,0.75)")
        .attr("stroke", "rgba(255,255,255,0.06)")
        .attr("stroke-width", 0.5)
        .style("pointer-events", "none");

      el.append("text")
        .text(label)
        .attr("x", 0)
        .attr("y", yOff + 1)
        .attr("text-anchor", "middle")
        .attr("font-size", `${fontSize}px`)
        .attr("font-weight", fontWeight)
        .attr("fill", selectedNote?.id === d.id ? "#FFFFFF" : "rgba(209,213,219,0.9)")
        .attr("letter-spacing", "0.2px")
        .style("pointer-events", "none");
    });

    // Hover events
    node.on("mouseover", function (event, d) {
      const rect = containerRef.current?.getBoundingClientRect();
      setTooltip({
        note: d.note,
        x: event.clientX - (rect?.left || 0) + 16,
        y: event.clientY - (rect?.top || 0) - 8
      });
      d3.select(this).select("circle:nth-child(2), circle:first-child")
        .transition().duration(150)
        .attr("stroke-width", 3).attr("stroke", "#FFFFFF").attr("stroke-opacity", 1);
      d3.select(this).transition().duration(150).attr("transform", function() {
        const current = d3.select(this).attr("transform");
        return current; // keep position, just highlight
      });
    })
    .on("mouseout", function (_event, d) {
      setTooltip(null);
      const mainCircle = d3.select(this).selectAll("circle").filter(function(_, i) { return i === (d.note.isFavorite ? 1 : 0); });
      mainCircle.transition().duration(200)
        .attr("stroke-width", selectedNote?.id === d.id ? 3 : 1.5)
        .attr("stroke", () => {
          if (selectedNote?.id === d.id) return "#FFFFFF";
          const cId = detectedCommunities.get(d.id) ?? 0;
          return COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
        })
        .attr("stroke-opacity", selectedNote?.id === d.id ? 1 : 0.4);
    })
    .on("mousemove", (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      setTooltip(prev => prev ? {
        ...prev,
        x: event.clientX - (rect?.left || 0) + 16,
        y: event.clientY - (rect?.top || 0) - 8
      } : null);
    });

    // Click
    node.on("click", (_event, d) => onNodeClick(d.note));

    // Double-click focus
    node.on("dblclick", function (event, d) {
      event.stopPropagation();
      const newFocus = focusedNodeId === d.id ? null : d.id;
      setFocusedNodeId(newFocus);

      if (newFocus) {
        const connectedIds = new Set<string>();
        connectedIds.add(newFocus);
        links.forEach(l => {
          const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          if (src === newFocus) connectedIds.add(tgt);
          if (tgt === newFocus) connectedIds.add(src);
        });

        node.transition().duration(400).ease(d3.easeCubicOut)
          .style("opacity", (n: GraphNode) => connectedIds.has(n.id) ? 1 : 0.08);
        link.transition().duration(400).ease(d3.easeCubicOut)
          .style("opacity", (l: any) => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            return connectedIds.has(s) && connectedIds.has(t) ? 1 : 0.03;
          });
      } else {
        node.transition().duration(400).ease(d3.easeCubicOut).style("opacity", 1);
        link.transition().duration(400).ease(d3.easeCubicOut).style("opacity", null);
      }
    });

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [notes, onNodeClick, selectedNote, searchTerm, selectedFolder, selectedTag, showClusters, resetKey, focusedNodeId]);

  return (
    <div className="w-full h-full flex flex-col select-none">
      {/* Main graph area */}
      <div 
        ref={containerRef}
        className="flex-1 rounded-xl overflow-hidden relative border border-white/[0.06]"
        style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #111122 50%, #0a0a14 100%)' }}
      >
        {/* Glassmorphism Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setShowClusters(p => !p)}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-all duration-200 ${
                showClusters 
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}
            >
              <span className="mr-1">{showClusters ? '◉' : '○'}</span>
              Clusters
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={resetPositions}
              className="px-2.5 py-1 text-[11px] rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-all duration-200 font-medium"
            >
              ↻ Reset
            </button>
            {focusedNodeId && (
              <>
                <div className="w-px h-4 bg-white/10" />
                <button
                  onClick={() => setFocusedNodeId(null)}
                  className="px-2.5 py-1 text-[11px] rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-all duration-200 font-medium"
                >
                  ✕ Exit Focus
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats badge */}
        <div className="absolute top-3 right-3 z-10">
          <div className="px-3 py-1.5 rounded-lg backdrop-blur-xl text-[10px] font-mono tracking-wide"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-emerald-400/80">{graphStats.nodes}</span>
            <span className="text-gray-600 mx-1">nodes</span>
            <span className="text-gray-700 mx-1">•</span>
            <span className="text-blue-400/80">{graphStats.links}</span>
            <span className="text-gray-600 mx-1">links</span>
            {graphStats.clusters > 1 && (
              <>
                <span className="text-gray-700 mx-1">•</span>
                <span className="text-purple-400/80">{graphStats.clusters}</span>
                <span className="text-gray-600 mx-1">clusters</span>
              </>
            )}
          </div>
        </div>

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-30 animate-in fade-in duration-150"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth || 800) - 220),
              top: tooltip.y,
              maxWidth: 220,
            }}
          >
            <div className="rounded-xl overflow-hidden backdrop-blur-xl"
              style={{ 
                background: 'rgba(15,15,30,0.92)', 
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)'
              }}>
              <div className="px-3 py-2.5">
                <div className="text-white text-xs font-semibold mb-1.5 truncate">{tooltip.note.title}</div>
                {tooltip.note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tooltip.note.tags.slice(0, 4).map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(34,197,94,0.12)', color: 'rgba(34,197,94,0.9)' }}>
                        #{t}
                      </span>
                    ))}
                    {tooltip.note.tags.length > 4 && (
                      <span className="text-[9px] text-gray-500">+{tooltip.note.tags.length - 4}</span>
                    )}
                  </div>
                )}
                {tooltip.note.content && (
                  <div className="text-gray-400 text-[10px] leading-relaxed mb-1.5 line-clamp-2">
                    {tooltip.note.content.substring(0, 80)}{tooltip.note.content.length > 80 ? '…' : ''}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[9px] text-gray-500 pt-1 border-t border-white/[0.06]">
                  <span>{tooltip.note.linkedNotes.length} links</span>
                  {tooltip.note.folder && <span>📁 {tooltip.note.folder}</span>}
                  {tooltip.note.isFavorite && <span>⭐</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-600 text-sm mb-1">No notes to visualize</div>
              <div className="text-gray-700 text-xs">Create notes and link them to build your knowledge graph</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend bar */}
      <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-500 px-2 py-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-px bg-white/50 inline-block" /> Direct
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-px inline-block" style={{ borderTop: '1px dashed rgba(34,197,94,0.6)' }} /> Shared tag
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-px inline-block" style={{ borderTop: '1px dashed rgba(59,130,246,0.5)' }} /> Folder
        </span>
        <span className="text-gray-600">|</span>
        <span>Double-click → Focus</span>
        <span>Drag → Save position</span>
      </div>
    </div>
  );
}
