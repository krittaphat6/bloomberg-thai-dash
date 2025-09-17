import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: 'direct' | 'shared-tag';
}

export default function GraphView({ 
  notes, 
  onNodeClick, 
  selectedNote, 
  searchTerm, 
  selectedFolder, 
  selectedTag 
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    // Filter notes based on search/folder/tag
    const filteredNotes = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = !selectedFolder || note.folder === selectedFolder;
      const matchesTag = !selectedTag || note.tags.includes(selectedTag);
      
      return matchesSearch && matchesFolder && matchesTag;
    });

    // Create nodes
    const nodes: GraphNode[] = filteredNotes.map(note => {
      // Count connections (linked notes + notes that link to this one)
      const directLinks = note.linkedNotes.length;
      const backLinks = filteredNotes.filter(n => 
        n.linkedNotes.includes(note.id) || 
        n.content.includes(`[[${note.title}]]`)
      ).length;
      
      return {
        id: note.id,
        title: note.title,
        note,
        connections: directLinks + backLinks
      };
    });

    // Create links
    const links: (GraphLink & { type: 'direct' | 'shared-tag' })[] = [];
    
    filteredNotes.forEach(note => {
      // Link to explicitly linked notes (direct links - white)
      note.linkedNotes.forEach(linkedId => {
        const targetNote = filteredNotes.find(n => n.id === linkedId);
        if (targetNote) {
          links.push({
            source: note.id,
            target: linkedId,
            type: 'direct'
          });
        }
      });

      // Link to notes mentioned in content via [[note name]] (direct links - white)
      const contentLinks = note.content.match(/\[\[([^\]]+)\]\]/g);
      if (contentLinks) {
        contentLinks.forEach(link => {
          const linkTitle = link.replace(/\[\[|\]\]/g, '');
          const targetNote = filteredNotes.find(n => n.title === linkTitle);
          if (targetNote && targetNote.id !== note.id) {
            // Check if link doesn't already exist
            const linkExists = links.some(l => 
              (l.source === note.id && l.target === targetNote.id) ||
              (l.source === targetNote.id && l.target === note.id)
            );
            if (!linkExists) {
              links.push({
                source: note.id,
                target: targetNote.id,
                type: 'direct'
              });
            }
          }
        });
      }
    });

    // Add shared tag links (green connections)
    filteredNotes.forEach(note => {
      filteredNotes.forEach(otherNote => {
        if (note.id !== otherNote.id) {
          // Check if notes share any tags
          const sharedTags = note.tags.filter(tag => otherNote.tags.includes(tag));
          if (sharedTags.length > 0) {
            // Check if any connection already exists between these nodes
            const connectionExists = links.some(l => 
              (l.source === note.id && l.target === otherNote.id) ||
              (l.source === otherNote.id && l.target === note.id)
            );
            if (!connectionExists) {
              links.push({
                source: note.id,
                target: otherNote.id,
                type: 'shared-tag'
              });
            }
          }
        }
      });
    });

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", (d: any) => {
        return d.type === 'shared-tag' ? "hsl(var(--terminal-green))" : "hsl(var(--foreground))";
      })
      .attr("stroke-opacity", (d: any) => d.type === 'shared-tag' ? 0.8 : 0.6)
      .attr("stroke-width", (d: any) => d.type === 'shared-tag' ? 2 : 1)
      .attr("stroke-dasharray", (d: any) => d.type === 'shared-tag' ? "5,5" : "none");

    // Create nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles for nodes
    node.append("circle")
      .attr("r", d => Math.max(8, Math.min(20, 8 + d.connections * 2)))
      .attr("fill", d => {
        if (d.note.isFavorite) return "hsl(var(--yellow))";
        if (selectedNote?.id === d.id) return "hsl(var(--terminal-green))";
        if (d.note.folder === "1") return "hsl(var(--blue))";
        if (d.note.folder === "2") return "hsl(var(--green))";
        if (d.note.folder === "3") return "hsl(var(--purple))";
        return "hsl(var(--primary))";
      })
      .attr("stroke", d => selectedNote?.id === d.id ? "hsl(var(--terminal-green))" : "hsl(var(--border))")
      .attr("stroke-width", d => selectedNote?.id === d.id ? 3 : 1);

    // Add labels
    node.append("text")
      .text(d => d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title)
      .attr("x", 0)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "hsl(var(--foreground))")
      .style("pointer-events", "none");

    // Add click handler
    node.on("click", (event, d) => {
      onNodeClick(d.note);
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [notes, onNodeClick, selectedNote, searchTerm, selectedFolder, selectedTag]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 bg-background border border-border rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="600"
          className="w-full h-full"
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        🔗 Graph View - Click and drag nodes • Scroll to zoom • Larger nodes have more connections
      </div>
    </div>
  );
}