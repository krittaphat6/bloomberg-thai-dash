import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Network, RefreshCw, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// ── Types ──────────────────────────────────────────────────────────────
type NodeType = 'page' | 'service' | 'api' | 'database' | 'context';

interface MapNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  x: number;
  y: number;
  reqPerSec: number;
  errPct: number;
  avgLatency: string;
}

interface MapEdge {
  from: string;
  to: string;
  label: string;
}

// ── Color palette ──────────────────────────────────────────────────────
const TYPE_COLORS: Record<NodeType, string> = {
  page: '#4B9EFF',
  service: '#9B59B6',
  api: '#1DB954',
  database: '#E67E22',
  context: '#F1C40F',
};

const TYPE_LABELS: Record<NodeType, string> = {
  page: 'Pages',
  service: 'Services',
  api: 'External APIs',
  database: 'Database',
  context: 'Contexts',
};

// ── Node data ──────────────────────────────────────────────────────────
const NODES: MapNode[] = [
  // Pages (row 1)
  { id: 'index', label: 'Index /', type: 'page', description: 'Main dashboard page', x: 120, y: 80, reqPerSec: 0.08, errPct: 0, avgLatency: '92ms' },
  { id: 'intelligence', label: 'IntelligencePlatform', type: 'page', description: 'Intelligence dashboard at /intelligence', x: 380, y: 80, reqPerSec: 0.04, errPct: 0, avgLatency: '130ms' },
  { id: 'globalmap', label: 'GlobalMap', type: 'page', description: 'World map at /map', x: 640, y: 80, reqPerSec: 0.03, errPct: 0, avgLatency: '210ms' },
  { id: 'notes', label: 'Notes & Viz', type: 'page', description: 'Notes & visualization at /notes', x: 900, y: 80, reqPerSec: 0.02, errPct: 0, avgLatency: '105ms' },
  { id: 'relationships', label: 'RelationshipDash', type: 'page', description: 'Relationship dashboard at /relationship-dashboard', x: 1140, y: 80, reqPerSec: 0.01, errPct: 0, avgLatency: '88ms' },
  { id: 'options', label: 'OptionsSurface', type: 'page', description: 'Options surface plot at /options', x: 1380, y: 80, reqPerSec: 0.01, errPct: 0, avgLatency: '150ms' },

  // Contexts (row 2)
  { id: 'authctx', label: 'AuthContext', type: 'context', description: 'Authentication state provider', x: 120, y: 260, reqPerSec: 0.5, errPct: 0, avgLatency: '12ms' },
  { id: 'agentctx', label: 'AgentContext', type: 'context', description: 'AI Agent state provider', x: 380, y: 260, reqPerSec: 0.3, errPct: 0, avgLatency: '18ms' },
  { id: 'mcpctx', label: 'MCPContext', type: 'context', description: 'MCP tool orchestration context', x: 640, y: 260, reqPerSec: 0.2, errPct: 0, avgLatency: '15ms' },
  { id: 'panelctx', label: 'PanelCommander', type: 'context', description: 'Panel layout commander context', x: 900, y: 260, reqPerSec: 0.1, errPct: 0, avgLatency: '8ms' },

  // Services (row 3)
  { id: 'gemini-svc', label: 'GeminiService', type: 'service', description: 'Handles Gemini AI requests', x: 120, y: 440, reqPerSec: 1.2, errPct: 9.3, avgLatency: '320ms' },
  { id: 'mempool-svc', label: 'MempoolService', type: 'service', description: 'Bitcoin mempool data service', x: 380, y: 440, reqPerSec: 0.5, errPct: 0, avgLatency: '180ms' },
  { id: 'chart-svc', label: 'ChartDataService', type: 'service', description: 'Trading chart data provider', x: 640, y: 440, reqPerSec: 2.0, errPct: 0.5, avgLatency: '95ms' },
  { id: 'screener-svc', label: 'MarketScreener', type: 'service', description: 'TradingView market screener', x: 900, y: 440, reqPerSec: 0.8, errPct: 0, avgLatency: '250ms' },
  { id: 'agent-svc', label: 'AgentService', type: 'service', description: 'AI agent execution service', x: 1140, y: 440, reqPerSec: 0.3, errPct: 1.2, avgLatency: '450ms' },
  { id: 'openclaw-svc', label: 'OpenClawAgent', type: 'service', description: 'OpenClaw autonomous agent', x: 1380, y: 440, reqPerSec: 0.1, errPct: 0, avgLatency: '380ms' },
  { id: 'news-svc', label: 'NewsAnalyzer', type: 'service', description: 'Comprehensive news analysis', x: 120, y: 600, reqPerSec: 0.4, errPct: 0, avgLatency: '290ms' },
  { id: 'weather-svc', label: 'WeatherService', type: 'service', description: 'Weather alerts and tsunami warnings', x: 380, y: 600, reqPerSec: 0.15, errPct: 0, avgLatency: '200ms' },
  { id: 'cyclone-svc', label: 'CycloneService', type: 'service', description: 'Tropical cyclone tracking', x: 640, y: 600, reqPerSec: 0.1, errPct: 0, avgLatency: '350ms' },
  { id: 'conflict-svc', label: 'ConflictService', type: 'service', description: 'Global conflict zone monitor', x: 900, y: 600, reqPerSec: 0.1, errPct: 0, avgLatency: '150ms' },

  // External APIs (row 4)
  { id: 'gemini-api', label: 'Gemini AI', type: 'api', description: 'generativelanguage.googleapis.com', x: 60, y: 780, reqPerSec: 1.0, errPct: 2.1, avgLatency: '500ms' },
  { id: 'binance-api', label: 'Binance API', type: 'api', description: 'api.binance.com', x: 280, y: 780, reqPerSec: 2.0, errPct: 0, avgLatency: '65ms' },
  { id: 'mempool-api', label: 'Mempool.space', type: 'api', description: 'mempool.space/api', x: 500, y: 780, reqPerSec: 0.5, errPct: 0, avgLatency: '120ms' },
  { id: 'opensky-api', label: 'OpenSky Network', type: 'api', description: 'opensky-network.org', x: 720, y: 780, reqPerSec: 0.07, errPct: 5.0, avgLatency: '800ms' },
  { id: 'usgs-api', label: 'USGS Earthquakes', type: 'api', description: 'earthquake.usgs.gov', x: 940, y: 780, reqPerSec: 0.03, errPct: 0, avgLatency: '300ms' },
  { id: 'worldbank-api', label: 'WorldBank API', type: 'api', description: 'api.worldbank.org', x: 1160, y: 780, reqPerSec: 0.02, errPct: 0, avgLatency: '400ms' },
  { id: 'tv-screener-api', label: 'TV Screener', type: 'api', description: 'via Supabase edge fn', x: 60, y: 920, reqPerSec: 0.8, errPct: 0, avgLatency: '180ms' },
  { id: 'gnews-api', label: 'GNews / NewsAPI', type: 'api', description: 'gnews.io', x: 280, y: 920, reqPerSec: 0.3, errPct: 0, avgLatency: '220ms' },
  { id: 'nominatim-api', label: 'Nominatim', type: 'api', description: 'nominatim.openstreetmap.org', x: 500, y: 920, reqPerSec: 0.05, errPct: 0, avgLatency: '350ms' },

  // Database
  { id: 'supabase', label: 'Supabase', type: 'database', description: 'Lovable Cloud database', x: 1380, y: 780, reqPerSec: 1.8, errPct: 0, avgLatency: '45ms' },
];

// ── Edge data ──────────────────────────────────────────────────────────
const EDGES: MapEdge[] = [
  // Index connections
  { from: 'index', to: 'gemini-svc', label: '120' },
  { from: 'index', to: 'screener-svc', label: '85' },
  { from: 'index', to: 'chart-svc', label: '1.6k' },
  { from: 'index', to: 'agentctx', label: '50' },
  { from: 'index', to: 'mcpctx', label: '51' },
  // Intelligence
  { from: 'intelligence', to: 'gemini-svc', label: '90' },
  { from: 'intelligence', to: 'screener-svc', label: '60' },
  { from: 'intelligence', to: 'news-svc', label: '45' },
  { from: 'intelligence', to: 'supabase', label: '200' },
  // GlobalMap
  { from: 'globalmap', to: 'opensky-api', label: '30' },
  { from: 'globalmap', to: 'usgs-api', label: '20' },
  { from: 'globalmap', to: 'weather-svc', label: '25' },
  { from: 'globalmap', to: 'cyclone-svc', label: '18' },
  { from: 'globalmap', to: 'conflict-svc', label: '15' },
  { from: 'globalmap', to: 'nominatim-api', label: '10' },
  // Notes
  { from: 'notes', to: 'supabase', label: '80' },
  { from: 'notes', to: 'gemini-svc', label: '30' },
  // Relationships
  { from: 'relationships', to: 'supabase', label: '55' },
  // Options
  { from: 'options', to: 'chart-svc', label: '40' },
  { from: 'options', to: 'binance-api', label: '35' },
  // Services → APIs
  { from: 'gemini-svc', to: 'gemini-api', label: '1.2k' },
  { from: 'gemini-svc', to: 'supabase', label: '500' },
  { from: 'mempool-svc', to: 'mempool-api', label: '300' },
  { from: 'chart-svc', to: 'binance-api', label: '1.6k' },
  { from: 'screener-svc', to: 'tv-screener-api', label: '400' },
  { from: 'screener-svc', to: 'supabase', label: '150' },
  { from: 'agent-svc', to: 'gemini-svc', label: '80' },
  { from: 'agent-svc', to: 'openclaw-svc', label: '40' },
  { from: 'openclaw-svc', to: 'supabase', label: '100' },
  { from: 'news-svc', to: 'gnews-api', label: '200' },
  { from: 'news-svc', to: 'supabase', label: '90' },
  { from: 'news-svc', to: 'gemini-api', label: '60' },
  { from: 'weather-svc', to: 'worldbank-api', label: '50' },
  // Contexts → Services
  { from: 'agentctx', to: 'agent-svc', label: '70' },
  { from: 'agentctx', to: 'supabase', label: '45' },
  { from: 'mcpctx', to: 'supabase', label: '30' },
];

// ── Helpers ────────────────────────────────────────────────────────────
const NODE_W = 200;
const NODE_H = 100;

const getNodeCenter = (n: MapNode) => ({ cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2 });

function cubicPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = (x2 - x1) * 0.4;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// ── Component ──────────────────────────────────────────────────────────
const ServiceMap: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NodeType | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);

  // pan & zoom
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform(t => {
      const ds = e.deltaY > 0 ? 0.92 : 1.08;
      const ns = Math.max(0.2, Math.min(3, t.scale * ds));
      return { ...t, scale: ns };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [transform]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setTransform(t => ({
      ...t,
      x: panStart.current.tx + (e.clientX - panStart.current.x),
      y: panStart.current.ty + (e.clientY - panStart.current.y),
    }));
  }, []);

  const onPointerUp = useCallback(() => { isPanning.current = false; }, []);

  // derived
  const nodeMap = useMemo(() => {
    const m = new Map<string, MapNode>();
    NODES.forEach(n => m.set(n.id, n));
    return m;
  }, []);

  const connectedIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    const s = new Set<string>();
    s.add(hovered);
    EDGES.forEach(e => {
      if (e.from === hovered) s.add(e.to);
      if (e.to === hovered) s.add(e.from);
    });
    return s;
  }, [hovered]);

  const filteredNodes = useMemo(() =>
    filter === 'all' ? NODES : NODES.filter(n => n.type === filter),
    [filter]
  );
  const filteredIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);
  const filteredEdges = useMemo(() =>
    EDGES.filter(e => filteredIds.has(e.from) && filteredIds.has(e.to)),
    [filteredIds]
  );

  const selectedNode = selected ? nodeMap.get(selected) : null;
  const selectedEdges = useMemo(() => {
    if (!selected) return [];
    return EDGES.filter(e => e.from === selected || e.to === selected);
  }, [selected]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: '#0b0e14' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e2330' }}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Network size={20} style={{ color: TYPE_COLORS.service }} />
              <h1 className="text-xl font-bold text-foreground font-mono">Service Map</h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">Visualize service-to-service dependencies and data flow.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono border rounded px-2 py-1" style={{ borderColor: '#1e2330' }}>Last 12 hours</span>
          <Button variant="ghost" size="icon" onClick={() => setAnimKey(k => k + 1)} className="text-muted-foreground hover:text-foreground">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-6 py-2" style={{ borderBottom: '1px solid #1e2330' }}>
        {(['all', 'page', 'service', 'api', 'database', 'context'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded text-xs font-mono transition-colors"
            style={{
              background: filter === f ? (f === 'all' ? '#2a2f3e' : TYPE_COLORS[f as NodeType] + '30') : 'transparent',
              color: filter === f ? (f === 'all' ? '#e1e5ee' : TYPE_COLORS[f as NodeType]) : '#6b7280',
              border: `1px solid ${filter === f ? (f === 'all' ? '#3a4050' : TYPE_COLORS[f as NodeType] + '60') : '#1e2330'}`,
            }}
          >
            {f === 'all' ? 'All' : TYPE_LABELS[f as NodeType]}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e233066 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ touchAction: 'none' }}
        >
          <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', willChange: 'transform' }}>
            {/* SVG edges */}
            <svg
              key={animKey}
              width="1600" height="1050"
              className="absolute top-0 left-0 pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#3a4050" />
                </marker>
              </defs>
              {filteredEdges.map((edge, i) => {
                const fromN = nodeMap.get(edge.from);
                const toN = nodeMap.get(edge.to);
                if (!fromN || !toN) return null;
                const { cx: x1, cy: y1 } = getNodeCenter(fromN);
                const { cx: x2, cy: y2 } = getNodeCenter(toN);
                const d = cubicPath(x1, y1, x2, y2);
                const dimmed = hovered && (!connectedIds.has(edge.from) || !connectedIds.has(edge.to));
                const highlighted = hovered && connectedIds.has(edge.from) && connectedIds.has(edge.to);
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                return (
                  <g key={i} style={{ opacity: dimmed ? 0.08 : 1, transition: 'opacity 0.2s' }}>
                    <path d={d} fill="none" stroke={highlighted ? '#6b8aff' : '#2a3040'} strokeWidth={highlighted ? 2 : 1.5} markerEnd="url(#arrowhead)" />
                    {/* animated dot */}
                    <circle r="3" fill={highlighted ? '#6b8aff' : '#4B9EFF'} opacity={0.9}>
                      <animateMotion dur={`${2 + Math.random() * 2}s`} repeatCount="indefinite" path={d} />
                    </circle>
                    {/* label */}
                    <rect x={mx - 16} y={my - 9} width={32} height={18} rx={4} fill="#1a1f2e" stroke="#2a3040" strokeWidth={0.5} />
                    <text x={mx} y={my + 4} textAnchor="middle" fill="#8892a8" fontSize={9} fontFamily="monospace">{edge.label}</text>
                  </g>
                );
              })}
            </svg>

            {/* Node cards */}
            {filteredNodes.map(node => {
              const dimmed = hovered && !connectedIds.has(node.id);
              const color = TYPE_COLORS[node.type];
              return (
                <div
                  key={node.id}
                  className="absolute select-none"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    height: NODE_H,
                    opacity: dimmed ? 0.15 : 1,
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
                >
                  <div
                    className="h-full rounded-md overflow-hidden"
                    style={{
                      background: '#141820',
                      border: `1px solid ${hovered === node.id ? color : '#1e2330'}`,
                      boxShadow: hovered === node.id ? `0 0 20px ${color}20` : 'none',
                    }}
                  >
                    {/* Header */}
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: color + '25', borderBottom: `1px solid ${color}30` }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: node.errPct > 5 ? '#ef4444' : '#22c55e', boxShadow: `0 0 6px ${node.errPct > 5 ? '#ef4444' : '#22c55e'}80` }} />
                      <span className="text-xs font-mono font-bold truncate" style={{ color }}>{node.label}</span>
                    </div>
                    {/* Metrics */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground font-mono">req/s</div>
                        <div className="text-xs font-mono text-foreground font-bold">{node.reqPerSec.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground font-mono">err%</div>
                        <div className="text-xs font-mono font-bold" style={{ color: node.errPct > 0 ? '#ef4444' : '#6b7280' }}>{node.errPct.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] text-muted-foreground font-mono">avg</div>
                        <div className="text-xs font-mono text-foreground font-bold">{node.avgLatency}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex items-center gap-4 px-4 py-2 rounded-lg" style={{ background: '#141820e0', border: '1px solid #1e2330' }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
              <span className="text-[10px] font-mono text-muted-foreground">{TYPE_LABELS[type as NodeType]}</span>
            </div>
          ))}
          <span className="w-px h-4" style={{ background: '#2a3040' }} />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e80' }} />
            <span className="text-[10px] font-mono text-muted-foreground">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
            <span className="text-[10px] font-mono text-muted-foreground">Degraded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
            <span className="text-[10px] font-mono text-muted-foreground">Error</span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" style={{ background: '#141820', border: '1px solid #1e2330' }}
            onClick={() => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))}>
            <span className="text-sm font-mono">+</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" style={{ background: '#141820', border: '1px solid #1e2330' }}
            onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale * 0.8) }))}>
            <span className="text-sm font-mono">−</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" style={{ background: '#141820', border: '1px solid #1e2330' }}
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}>
            <span className="text-[10px] font-mono">⟲</span>
          </Button>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-4 px-6 py-1.5 text-[10px] font-mono text-muted-foreground" style={{ background: '#0b0e14e0', borderTop: '1px solid #1e2330' }}>
          <span>Drag to pan</span>
          <span>|</span>
          <span>Scroll to zoom</span>
          <span>|</span>
          <span>{filteredNodes.length} nodes</span>
          <span>·</span>
          <span>{filteredEdges.length} edges</span>
        </div>

        {/* Side panel */}
        {selectedNode && (
          <div className="absolute top-0 right-0 h-full w-80 overflow-y-auto" style={{ background: '#0f1219', borderLeft: '1px solid #1e2330' }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: TYPE_COLORS[selectedNode.type] }} />
                  <span className="text-sm font-mono font-bold text-foreground">{selectedNode.label}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setSelected(null)}>
                  <X size={14} />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Type</div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: TYPE_COLORS[selectedNode.type] + '20', color: TYPE_COLORS[selectedNode.type] }}>
                    {TYPE_LABELS[selectedNode.type]}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Description</div>
                  <p className="text-xs text-foreground font-mono">{selectedNode.description}</p>
                </div>
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Uptime', value: selectedNode.errPct > 5 ? '98.2%' : '99.9%', color: selectedNode.errPct > 5 ? '#f59e0b' : '#22c55e' },
                    { label: 'Latency', value: selectedNode.avgLatency, color: '#4B9EFF' },
                    { label: 'Error Rate', value: `${selectedNode.errPct.toFixed(1)}%`, color: selectedNode.errPct > 0 ? '#ef4444' : '#22c55e' },
                  ].map(m => (
                    <div key={m.label} className="rounded p-2 text-center" style={{ background: '#141820', border: '1px solid #1e2330' }}>
                      <div className="text-[9px] text-muted-foreground font-mono">{m.label}</div>
                      <div className="text-xs font-mono font-bold" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                {/* Connections */}
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Connections ({selectedEdges.length})</div>
                  <div className="space-y-1">
                    {selectedEdges.map((edge, i) => {
                      const otherId = edge.from === selected ? edge.to : edge.from;
                      const other = nodeMap.get(otherId);
                      if (!other) return null;
                      const dir = edge.from === selected ? '→' : '←';
                      return (
                        <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono" style={{ background: '#141820', border: '1px solid #1e2330' }}
                          onClick={() => setSelected(otherId)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-sm" style={{ background: TYPE_COLORS[other.type] }} />
                            <span className="text-foreground">{dir} {other.label}</span>
                          </div>
                          <span className="text-muted-foreground">{edge.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceMap;
