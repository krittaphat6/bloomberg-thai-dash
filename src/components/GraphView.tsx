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

const COMMUNITY_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

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
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [tooltip, setTooltip] = useState<{ note: Note; x: number; y: number } | null>(null);
  const [communities, setCommunities] = useState<Map<string, number>>(new Map());
  const [showClusters, setShowClusters] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

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

    // Create links (no proximity)
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
    setCommunities(detectedCommunities);

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
    if (showClusters && nodes.length > 1) {
      const clusters = GraphClustering.clusterByConnections(
        nodes.map(n => ({ ...n.note, connections: n.connections, x: n.x || 0, y: n.y || 0 })),
        Math.min(5, Math.ceil(nodes.length / 3))
      );
      const clusterGroup = g.append("g").attr("class", "clusters");

      simulation.on("tick.clusters", () => {
        clusterGroup.selectAll("*").remove();
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

          clusterGroup.append("circle")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", maxR + 30)
            .attr("fill", "none")
            .attr("stroke", cluster.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "6,4")
            .attr("opacity", 0.4);

          clusterGroup.append("text")
            .attr("x", cx).attr("y", cy - maxR - 35)
            .attr("text-anchor", "middle")
            .attr("fill", cluster.color)
            .attr("font-size", "10px")
            .attr("opacity", 0.7)
            .text(cluster.label);
        });
      });
    }

    // Links
    const link = g.append("g").selectAll("line").data(links).enter().append("line")
      .attr("stroke", d => {
        if (d.type === 'shared-tag') return "#22C55E";
        if (d.type === 'folder') return "#3B82F6";
        return "#FFFFFF";
      })
      .attr("stroke-opacity", d => {
        if (d.type === 'shared-tag') return 0.9;
        if (d.type === 'folder') return 0.8;
        return 0.8;
      })
      .attr("stroke-width", d => {
        if (d.type === 'shared-tag') return 2;
        if (d.type === 'folder') return 2;
        return 1.5;
      })
      .style("pointer-events", "none");

    // Nodes
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

    // Node circles
    node.append("circle")
      .attr("r", d => {
        const r = 8 + Math.min(d.importance * 2, 20);
        return selectedNote?.id === d.id ? r + 3 : r;
      })
      .attr("fill", d => {
        const cId = detectedCommunities.get(d.id) ?? 0;
        return COMMUNITY_COLORS[cId % COMMUNITY_COLORS.length];
      })
      .attr("stroke", d => selectedNote?.id === d.id ? "#FFFFFF" : "#374151")
      .attr("stroke-width", d => selectedNote?.id === d.id ? 3 : 1)
      .style("filter", d => d.note.isFavorite ? "drop-shadow(0 0 8px currentColor)" : "drop-shadow(0px 1px 3px rgba(0,0,0,0.6))");

    // Label background + text
    node.each(function (d) {
      const el = d3.select(this);
      const label = d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title;
      const fontSize = d.importance >= 5 ? 12 : 10;
      const fontWeight = d.importance >= 5 ? '600' : '400';
      const r = 8 + Math.min(d.importance * 2, 20) + (selectedNote?.id === d.id ? 3 : 0);
      const yOff = r + 14;

      // Measure text width roughly
      const textWidth = label.length * (fontSize * 0.55);

      el.append("rect")
        .attr("x", -textWidth / 2 - 3)
        .attr("y", yOff - fontSize + 1)
        .attr("width", textWidth + 6)
        .attr("height", fontSize + 4)
        .attr("rx", 3)
        .attr("fill", "rgba(0,0,0,0.6)")
        .style("pointer-events", "none");

      el.append("text")
        .text(label)
        .attr("x", 0)
        .attr("y", yOff)
        .attr("text-anchor", "middle")
        .attr("font-size", `${fontSize}px`)
        .attr("font-weight", fontWeight)
        .attr("fill", selectedNote?.id === d.id ? "#FFFFFF" : "#D1D5DB")
        .style("pointer-events", "none")
        .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.9)");
    });

    // Hover events
    node.on("mouseover", function (event, d) {
      const rect = svgRef.current?.getBoundingClientRect();
      setTooltip({
        note: d.note,
        x: event.clientX - (rect?.left || 0) + 12,
        y: event.clientY - (rect?.top || 0) + 12
      });
      d3.select(this).select("circle")
        .transition().duration(150)
        .attr("stroke-width", 3).attr("stroke", "#FFFFFF");
    })
      .on("mouseout", function (event, d) {
        setTooltip(null);
        d3.select(this).select("circle")
          .transition().duration(150)
          .attr("stroke-width", selectedNote?.id === d.id ? 3 : 1)
          .attr("stroke", selectedNote?.id === d.id ? "#FFFFFF" : "#374151");
      })
      .on("mousemove", (event) => {
        const rect = svgRef.current?.getBoundingClientRect();
        setTooltip(prev => prev ? {
          ...prev,
          x: event.clientX - (rect?.left || 0) + 12,
          y: event.clientY - (rect?.top || 0) + 12
        } : null);
      });

    // Click
    node.on("click", (event, d) => onNodeClick(d.note));

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

        node.transition().duration(300)
          .style("opacity", (n: GraphNode) => connectedIds.has(n.id) ? 1 : 0.15);
        link.transition().duration(300)
          .style("opacity", (l: any) => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            return connectedIds.has(s) && connectedIds.has(t) ? 0.9 : 0.05;
          });
      } else {
        node.transition().duration(300).style("opacity", 1);
        link.transition().duration(300).style("opacity", null);
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

  const totalLinks = notes.reduce((acc, n) => acc + n.linkedNotes.length, 0);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 border border-gray-800 rounded-lg overflow-hidden relative" style={{ background: '#1e1e1e' }}>
        {/* Toolbar */}
        <div className="absolute top-2 left-2 z-10 flex gap-1.5">
          <button
            onClick={() => setShowClusters(p => !p)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${showClusters ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-black/50 border-gray-700 text-gray-400 hover:text-gray-200'}`}
          >
            {showClusters ? '🔵 Clusters ON' : '⚪ Clusters'}
          </button>
          <button
            onClick={resetPositions}
            className="px-2 py-1 text-xs rounded border bg-black/50 border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            🔄 Reset
          </button>
          {focusedNodeId && (
            <button
              onClick={() => setFocusedNodeId(null)}
              className="px-2 py-1 text-xs rounded border bg-blue-500/20 border-blue-500 text-blue-400"
            >
              ✕ Exit Focus
            </button>
          )}
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="w-full h-full"
          style={{ background: '#1e1e1e', minHeight: '600px' }}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              maxWidth: 200,
              background: '#1a1a2e',
              border: '1px solid #374151',
              borderRadius: 8,
              padding: 8,
            }}
          >
            <div className="text-white text-xs font-bold mb-1 truncate">{tooltip.note.title}</div>
            {tooltip.note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {tooltip.note.tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">#{t}</span>
                ))}
              </div>
            )}
            {tooltip.note.content && (
              <div className="text-gray-400 text-[10px] mb-1 line-clamp-2">
                {tooltip.note.content.substring(0, 60)}{tooltip.note.content.length > 60 ? '...' : ''}
              </div>
            )}
            <div className="text-gray-500 text-[9px]">
              {tooltip.note.linkedNotes.length} links
              {tooltip.note.folder ? ` • ${tooltip.note.folder}` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400 flex-wrap px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-px bg-white inline-block" /> Direct</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Shared tag</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Same folder</span>
        <span>📌 Dbl-click = Focus</span>
        <span>💾 Drag to pin</span>
        <span className="ml-auto text-gray-500">{notes.length} notes • {totalLinks} links</span>
      </div>
    </div>
  );
}
