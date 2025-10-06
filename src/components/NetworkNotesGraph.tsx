import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Hash, Link, Save, Trash2, Network as NetworkIcon } from 'lucide-react';
import * as d3 from 'd3';
import { GraphClustering, ClusterResult } from '@/utils/GraphClustering';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  position: { x: number; y: number };
  color: string;
  createdAt: Date;
  updatedAt: Date;
  linkedNotes: string[];
}

interface NetworkNotesGraphProps {
  className?: string;
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
  type: 'direct' | 'tag-link';
}

export const NetworkNotesGraph = ({ className }: NetworkNotesGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Clustering state
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [clusterCount, setClusterCount] = useState('5');
  const [clusters, setClusters] = useState<ClusterResult[]>([]);
  const [communities, setCommunities] = useState<Map<string, number>>(new Map());
  
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '2b5be',
      title: '#2b5be',
      content: 'wave4.1 เก็บเล็ม wave 4 hft แผ่เก็บ',
      tags: ['wave4', 'hft'],
      position: { x: 200, y: 400 },
      color: '#22C55E',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      linkedNotes: ['5d606b', '21573']
    },
    {
      id: '5d606b',
      title: '#5d606b',
      content: 'มอบการแล้กสาหนถแนวอดีตl',
      tags: ['wave4'],
      position: { x: 150, y: 300 },
      color: '#22C55E',
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16'),
      linkedNotes: ['2b5be']
    },
    {
      id: '21573',
      title: '#21573',
      content: 'การวิเคราะห์โต้ค Breaker Blocks',
      tags: ['breaker', 'analysis'],
      position: { x: 100, y: 500 },
      color: '#22C55E',
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17'),
      linkedNotes: ['2b5be', 'f23645']
    },
    {
      id: 'f23645',
      title: '#f23645',
      content: 'Signals LuxAlgo',
      tags: ['signals', 'luxalgo'],
      position: { x: 250, y: 550 },
      color: '#22C55E',
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18'),
      linkedNotes: ['21573', '878b94']
    },
    {
      id: '878b94',
      title: '#878b94',
      content: 'WaveTrend Scatter Plot',
      tags: ['wavetrend', 'plot'],
      position: { x: 300, y: 650 },
      color: '#22C55E',
      createdAt: new Date('2024-01-19'),
      updatedAt: new Date('2024-01-19'),
      linkedNotes: ['f23645']
    },
    {
      id: 'ffffa080',
      title: '#ffffa080',
      content: 'code1 - โครงการพลัง ql v56',
      tags: ['code1', 'v56'],
      position: { x: 400, y: 400 },
      color: '#9CA3AF',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      linkedNotes: []
    }
  ]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');

  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    // Create nodes
    const nodes: GraphNode[] = notes.map(note => ({
      id: note.id,
      title: note.title,
      note,
      connections: note.linkedNotes.length,
      x: note.position.x,
      y: note.position.y
    }));

    // Create links
    const links: GraphLink[] = [];
    notes.forEach(note => {
      note.linkedNotes.forEach(linkedId => {
        const targetNote = notes.find(n => n.id === linkedId);
        if (targetNote) {
          links.push({
            source: note.id,
            target: linkedId,
            type: 'direct'
          });
        }
      });

      // Create tag-based links
      notes.forEach(otherNote => {
        if (note.id !== otherNote.id) {
          const sharedTags = note.tags.filter(tag => otherNote.tags.includes(tag));
          if (sharedTags.length > 0) {
            const linkExists = links.some(l => 
              (l.source === note.id && l.target === otherNote.id) ||
              (l.source === otherNote.id && l.target === note.id)
            );
            if (!linkExists) {
              links.push({
                source: note.id,
                target: otherNote.id,
                type: 'tag-link'
              });
            }
          }
        }
      });
    });

    // Create simulation with fixed positions
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
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
        return d.type === 'tag-link' ? "#8B5CF6" : "#FFFFFF";
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

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
      .attr("r", d => {
        const baseSize = 8;
        return selectedNote?.id === d.id ? baseSize + 4 : baseSize;
      })
      .attr("fill", d => {
        if (selectedNote?.id === d.id) return "#60A5FA";
        return d.note.color;
      })
      .attr("stroke", "#374151")
      .attr("stroke-width", 2);

    // Add labels
    node.append("text")
      .text(d => d.title)
      .attr("x", 0)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#FFFFFF")
      .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.9)");

    // Add click handler
    node.on("click", (event, d) => {
      setSelectedNote(d.note);
    });

    // Update positions on simulation tick
    // Apply clustering if enabled
    if (clusteringEnabled && nodes.length > parseInt(clusterCount)) {
      const detectedClusters = GraphClustering.clusterByConnections(
        nodes.map(n => ({ ...n.note, connections: n.connections, x: n.x, y: n.y })),
        parseInt(clusterCount)
      );
      const detectedCommunities = GraphClustering.detectCommunities(
        nodes.map(n => ({ ...n.note, connections: n.connections })),
        links
      );
      setClusters(detectedClusters);
      setCommunities(detectedCommunities);
      
      // Draw cluster boundaries
      const clusterGroup = g.append("g").attr("class", "clusters");
      
      const clusterCircles = clusterGroup
        .selectAll("circle")
        .data(detectedClusters)
        .enter().append("circle")
        .attr("r", 120)
        .attr("fill", d => d.color)
        .attr("opacity", 0.1)
        .attr("stroke", d => d.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
      
      const clusterLabels = clusterGroup
        .selectAll("text")
        .data(detectedClusters)
        .enter().append("text")
        .text(d => d.label)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", d => d.color)
        .attr("text-anchor", "middle");
      
      simulation.on("tick", () => {
        link
          .attr("x1", d => (d.source as GraphNode).x!)
          .attr("y1", d => (d.source as GraphNode).y!)
          .attr("x2", d => (d.target as GraphNode).x!)
          .attr("y2", d => (d.target as GraphNode).y!);

        node
          .attr("transform", d => `translate(${d.x},${d.y})`);
        
        clusterCircles
          .attr("cx", d => d.center.x)
          .attr("cy", d => d.center.y);
        
        clusterLabels
          .attr("x", d => d.center.x)
          .attr("y", d => d.center.y - 130);
      });
    } else {
      simulation.on("tick", () => {
        link
          .attr("x1", d => (d.source as GraphNode).x!)
          .attr("y1", d => (d.source as GraphNode).y!)
          .attr("x2", d => (d.target as GraphNode).x!)
          .attr("y2", d => (d.target as GraphNode).y!);

        node
          .attr("transform", d => `translate(${d.x},${d.y})`);
      });
    }

    // Color nodes by community
    if (communities.size > 0) {
      node.select("circle")
        .attr("fill", d => {
          if (communities.has(d.id)) {
            const colors = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
            return colors[communities.get(d.id)! % colors.length];
          }
          return d.note.color;
        });
    }

    return () => {
      simulation.stop();
    };
  }, [notes, selectedNote, clusteringEnabled, clusterCount]);

  const addNote = () => {
    if (!newNoteTitle.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title: newNoteTitle.startsWith('#') ? newNoteTitle : `#${newNoteTitle}`,
      content: newNoteContent,
      tags: newNoteTags.split(',').map(tag => tag.trim()).filter(Boolean),
      position: { x: Math.random() * 400 + 200, y: Math.random() * 400 + 100 },
      color: '#22C55E',
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedNotes: []
    };

    setNotes(prev => [...prev, newNote]);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags('');
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  const updateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    setSelectedNote(updatedNote);
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Network Notes Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Note Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <Input
              placeholder="Note title (e.g., #wave4)"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
            />
            <Input
              placeholder="Content"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <Input
              placeholder="Tags (comma separated)"
              value={newNoteTags}
              onChange={(e) => setNewNoteTags(e.target.value)}
            />
            <Button onClick={addNote} className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add Note
            </Button>
          </div>

          {/* Graph */}
          <div className="border border-border rounded-lg overflow-hidden bg-slate-900">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              className="w-full"
              style={{ background: '#0f172a' }}
            />
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-white"></div>
              <span>Direct Links</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-purple-500"></div>
              <span>Tag Links</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Notes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Note Details */}
      {selectedNote && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedNote.title}</span>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => deleteNote(selectedNote.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Content:</label>
              <div className="mt-1 p-2 bg-muted rounded text-sm">
                {selectedNote.content}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tags:</label>
              <div className="flex gap-1 mt-1">
                {selectedNote.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Created: {selectedNote.createdAt.toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};