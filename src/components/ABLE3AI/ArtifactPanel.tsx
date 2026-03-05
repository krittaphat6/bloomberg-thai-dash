import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X, Copy, Table2, GitBranch, BarChart3, FileSpreadsheet, TrendingUp, Brain, Workflow, Network, Palette, PanelRightOpen } from 'lucide-react';

export type ArtifactType = 'table' | 'relationship' | 'chart_analysis' | 'financial_statement' | 'screener_result';
export type ArtifactViewMode = 'table' | 'flowchart' | 'graph';

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  timestamp: Date;
  content: any;
  source?: string;
}

interface ArtifactPanelProps {
  artifact: ArtifactData | null;
  onClose: () => void;
  isOpen: boolean;
}

const TYPE_META: Record<ArtifactType, { icon: typeof Table2; label: string; color: string }> = {
  table: { icon: Table2, label: 'Table', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  relationship: { icon: GitBranch, label: 'Relationship Map', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  chart_analysis: { icon: BarChart3, label: 'Chart Analysis', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  financial_statement: { icon: FileSpreadsheet, label: 'Financial Statement', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  screener_result: { icon: TrendingUp, label: 'Screener', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
};

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose, isOpen }) => {
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('table');

  // Empty state when panel is open but no artifact
  if (!artifact) {
    return (
      <div className="h-full flex flex-col bg-zinc-950 border-l border-green-500/20">
        <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/20 bg-black/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10">
              <PanelRightOpen className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Artifact Panel</h3>
              <span className="text-[10px] text-zinc-500">Ready</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7 text-zinc-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* View Mode Selector */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">Display Mode</p>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ArtifactViewMode)}>
            <TabsList className="w-full bg-zinc-900/80 border border-zinc-800">
              <TabsTrigger value="table" className="flex-1 text-xs gap-1 data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
                <Table2 className="w-3 h-3" /> Table
              </TabsTrigger>
              <TabsTrigger value="flowchart" className="flex-1 text-xs gap-1 data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
                <Workflow className="w-3 h-3" /> Flowchart
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex-1 text-xs gap-1 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
                <Network className="w-3 h-3" /> Graph
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 flex items-center justify-center">
              {viewMode === 'table' && <Table2 className="w-8 h-8 text-cyan-400/60" />}
              {viewMode === 'flowchart' && <Workflow className="w-8 h-8 text-purple-400/60" />}
              {viewMode === 'graph' && <Network className="w-8 h-8 text-emerald-400/60" />}
            </div>
            <div>
              <p className="text-sm text-zinc-400 font-medium">Artifact Mode Active</p>
              <p className="text-xs text-zinc-600 mt-1">
                {viewMode === 'table' && 'ถาม AI เกี่ยวกับหุ้น, งบการเงิน, หรือ screener — ผลจะแสดงเป็นตารางที่นี่'}
                {viewMode === 'flowchart' && 'ถาม AI วิเคราะห์ตลาด — ผลจะแสดงเป็น Decision Flowchart'}
                {viewMode === 'graph' && 'ถาม AI เรื่องความสัมพันธ์สินทรัพย์ — ผลจะแสดงเป็น Network Graph'}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Try asking</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400/80">ดูงบการเงิน AAPL</Badge>
                <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400/80">วิเคราะห์ Gold vs USD</Badge>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400/80">หา top gainers</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = TYPE_META[artifact.type];
  const Icon = meta.icon;

  const copyToClipboard = () => {
    let text = '';
    if (artifact.type === 'table' || artifact.type === 'screener_result' || artifact.type === 'financial_statement') {
      const { headers, rows, groups } = artifact.content;
      if (groups) {
        text = groups.map((g: any) => `${g.title}\n${g.headers.join('\t')}\n${g.rows.map((r: any[]) => r.join('\t')).join('\n')}`).join('\n\n');
      } else {
        text = [headers.join('\t'), ...rows.map((r: any[]) => r.join('\t'))].join('\n');
      }
    } else {
      text = JSON.stringify(artifact.content, null, 2);
    }
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-green-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/20 bg-black/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-md border ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{artifact.title}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${meta.color}`}>
                {meta.label}
              </Badge>
              {artifact.source && (
                <span className="text-[10px] text-zinc-500">{artifact.source}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={copyToClipboard} className="h-7 w-7 text-zinc-400 hover:text-white">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7 text-zinc-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="px-4 py-2 border-b border-zinc-800">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ArtifactViewMode)}>
          <TabsList className="w-full bg-zinc-900/80 border border-zinc-800">
            <TabsTrigger value="table" className="flex-1 text-xs gap-1 data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400">
              <Table2 className="w-3 h-3" /> Table
            </TabsTrigger>
            <TabsTrigger value="flowchart" className="flex-1 text-xs gap-1 data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
              <Workflow className="w-3 h-3" /> Flowchart
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex-1 text-xs gap-1 data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              <Network className="w-3 h-3" /> Graph
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {viewMode === 'table' && (
            <>
              {(artifact.type === 'table' || artifact.type === 'screener_result' || artifact.type === 'financial_statement') && (
                <RenderTable content={artifact.content} type={artifact.type} />
              )}
              {artifact.type === 'relationship' && (
                <RenderRelationship content={artifact.content} />
              )}
              {artifact.type === 'chart_analysis' && (
                <RenderChartAnalysis content={artifact.content} />
              )}
            </>
          )}
          {viewMode === 'flowchart' && (
            <RenderFlowchart artifact={artifact} />
          )}
          {viewMode === 'graph' && (
            <RenderGraph artifact={artifact} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

/* ─── Flowchart Renderer ─── */
const RenderFlowchart: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  const nodes = extractFlowchartNodes(artifact);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Workflow className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">AI Decision Flowchart</span>
        <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400">AI Generated</Badge>
        <span className="ml-auto text-[10px] text-zinc-600">{nodes.length} nodes</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Start</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Decision</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Process</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Action</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Result</span>
      </div>

      {/* Flowchart nodes */}
      <div className="flex flex-col items-center gap-1">
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            <div className={`w-full max-w-md px-4 py-3 rounded-lg border text-xs text-center ${getFlowNodeStyle(node.type)}`}>
              <div className="flex items-center justify-center gap-2">
                <span>{getFlowNodeIcon(node.type)}</span>
                <span className="font-medium">{node.label}</span>
              </div>
              {node.detail && <div className="text-[10px] opacity-60 mt-1">{node.detail}</div>}
            </div>
            {i < nodes.length - 1 && (
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-zinc-700" />
                <div className="text-zinc-600 text-[10px]">↓</div>
                <div className="w-px h-4 bg-zinc-700" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/* ─── Graph Renderer ─── */
const RenderGraph: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  const { nodes, connections } = extractGraphData(artifact);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-300">Network Graph</span>
        <span className="ml-auto text-[10px] text-zinc-600">{nodes.length} nodes • {connections.length} links</span>
      </div>

      {/* Node clusters */}
      <div className="relative p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 min-h-[300px]">
        <div className="flex flex-wrap gap-3 justify-center">
          {nodes.map((node, i) => (
            <div
              key={i}
              className={`relative px-4 py-3 rounded-xl border-2 text-xs transition-all hover:scale-105 ${getGraphNodeStyle(node.type)}`}
              style={{ 
                transform: `translate(${Math.sin(i * 1.2) * 20}px, ${Math.cos(i * 0.8) * 15}px)`,
              }}
            >
              <div className="font-bold">{node.label}</div>
              {node.detail && <div className="text-[10px] opacity-60 mt-0.5">{node.detail}</div>}
              {node.value && (
                <div className={`text-[10px] font-mono mt-1 ${typeof node.value === 'number' && node.value > 0 ? 'text-emerald-400' : typeof node.value === 'number' && node.value < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {node.value}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Connection lines (text representation) */}
        {connections.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-1.5">
            {connections.map((conn, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-zinc-800/40">
                <span className="text-zinc-300 font-medium">{conn.from}</span>
                <span className={`text-[10px] ${conn.type === 'positive' ? 'text-emerald-400' : conn.type === 'negative' ? 'text-red-400' : 'text-zinc-500'}`}>
                  {conn.type === 'positive' ? '━━▶ ↑' : conn.type === 'negative' ? '━━▶ ↓' : '━━▶'}
                </span>
                <span className="text-zinc-300 font-medium">{conn.to}</span>
                {conn.label && <span className="text-zinc-600 text-[10px] ml-auto">({conn.label})</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Table Renderer ─── */
const RenderTable: React.FC<{ content: any; type: ArtifactType }> = ({ content, type }) => {
  const { headers, rows, groups } = content;

  if (groups && groups.length > 0) {
    return (
      <div className="space-y-4">
        {groups.map((group: any, gi: number) => (
          <div key={gi}>
            <h4 className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {group.title}
            </h4>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-900/80">
                    {group.headers.map((h: string, i: number) => (
                      <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium border-b border-zinc-800 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row: any[], ri: number) => (
                    <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      {row.map((cell: any, ci: number) => (
                        <td key={ci} className={`px-3 py-2 whitespace-nowrap ${getCellColor(cell)}`}>{formatCell(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-900/80">
            {headers?.map((h: string, i: number) => (
              <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium border-b border-zinc-800 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row: any[], ri: number) => (
            <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
              {row.map((cell: any, ci: number) => (
                <td key={ci} className={`px-3 py-2 whitespace-nowrap ${getCellColor(cell)}`}>{formatCell(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── Relationship Renderer ─── */
const RenderRelationship: React.FC<{ content: any }> = ({ content }) => {
  const { nodes, connections, summary } = content;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">AI Summary</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{summary}</p>
        </div>
      )}
      {nodes && Object.entries(groupNodesByCategory(nodes)).map(([category, items]: [string, any]) => (
        <div key={category}>
          <h4 className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">{category}</h4>
          <div className="flex flex-wrap gap-2">
            {items.map((node: any, i: number) => (
              <div key={i} className={`px-3 py-2 rounded-lg border text-xs ${getNodeStyle(node.type)}`}>
                <div className="font-medium">{node.label}</div>
                {node.detail && <div className="text-[10px] opacity-60 mt-0.5">{node.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {connections && connections.length > 0 && (
        <div>
          <h4 className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">Relationships</h4>
          <div className="space-y-1.5">
            {connections.map((conn: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-zinc-800/40">
                <span className="text-zinc-300">{conn.from}</span>
                <span className={`text-[10px] ${conn.type === 'positive' ? 'text-emerald-400' : conn.type === 'negative' ? 'text-red-400' : 'text-zinc-500'}`}>
                  {conn.type === 'positive' ? '→ ↑' : conn.type === 'negative' ? '→ ↓' : '→'}
                </span>
                <span className="text-zinc-300">{conn.to}</span>
                {conn.label && <span className="text-zinc-600 text-[10px]">({conn.label})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Chart Analysis Renderer ─── */
const RenderChartAnalysis: React.FC<{ content: any }> = ({ content }) => {
  const { symbol, timeframe, indicators, signals, levels, analysis } = content;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        <div>
          <div className="text-sm font-bold text-white">{symbol || 'Unknown'}</div>
          <div className="text-[10px] text-zinc-500">{timeframe || 'Daily'}</div>
        </div>
      </div>
      {indicators && (
        <div>
          <h4 className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">Technical Indicators</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(indicators).map(([key, val]: [string, any]) => (
              <div key={key} className="p-2 rounded bg-zinc-900/50 border border-zinc-800">
                <div className="text-[10px] text-zinc-500">{key}</div>
                <div className={`text-sm font-mono font-bold ${getValueColor(val)}`}>
                  {typeof val === 'number' ? val.toFixed(2) : String(val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {signals && signals.length > 0 && (
        <div>
          <h4 className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">Signals</h4>
          <div className="space-y-1.5">
            {signals.map((sig: any, i: number) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                sig.direction === 'bullish' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' :
                sig.direction === 'bearish' ? 'border-red-500/20 bg-red-500/5 text-red-300' :
                'border-zinc-700 bg-zinc-800/30 text-zinc-400'
              }`}>
                <span>{sig.direction === 'bullish' ? '🟢' : sig.direction === 'bearish' ? '🔴' : '⚪'}</span>
                <span className="font-medium">{sig.name}</span>
                {sig.detail && <span className="text-[10px] opacity-60 ml-auto">{sig.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {levels && (
        <div>
          <h4 className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">Key Levels</h4>
          <div className="space-y-1">
            {Object.entries(levels).map(([label, price]: [string, any]) => (
              <div key={label} className="flex justify-between items-center px-3 py-1.5 text-xs bg-zinc-900/30 rounded">
                <span className="text-zinc-400">{label}</span>
                <span className="text-white font-mono">{typeof price === 'number' ? price.toFixed(2) : price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {analysis && (
        <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{analysis}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Helpers ─── */
function extractFlowchartNodes(artifact: ArtifactData): Array<{ label: string; type: string; detail?: string }> {
  const nodes: Array<{ label: string; type: string; detail?: string }> = [];

  if (artifact.type === 'chart_analysis') {
    const { symbol, indicators, signals, analysis } = artifact.content;
    nodes.push({ label: `สถานการณ์ปัจจุบัน: ${symbol || 'Market'}`, type: 'start' });
    if (indicators) {
      Object.entries(indicators).forEach(([k, v]) => {
        nodes.push({ label: `${k}: ${typeof v === 'number' ? (v as number).toFixed(2) : v}`, type: 'process', detail: 'Technical Indicator' });
      });
    }
    if (signals) {
      (signals as any[]).forEach(s => {
        nodes.push({ label: s.name, type: s.direction === 'bullish' ? 'action' : s.direction === 'bearish' ? 'decision' : 'condition', detail: s.detail });
      });
    }
    nodes.push({ label: analysis ? analysis.slice(0, 80) + '...' : 'สรุปผลวิเคราะห์', type: 'result' });
  } else if (artifact.type === 'relationship') {
    const { nodes: rNodes, summary } = artifact.content;
    nodes.push({ label: 'เริ่มวิเคราะห์', type: 'start' });
    if (rNodes) {
      (rNodes as any[]).slice(0, 6).forEach(n => {
        nodes.push({ label: n.label, type: n.type === 'event' ? 'decision' : n.type === 'asset' ? 'process' : 'condition', detail: n.detail });
      });
    }
    nodes.push({ label: summary ? summary.slice(0, 80) + '...' : 'ผลสรุป', type: 'result' });
  } else if (artifact.type === 'financial_statement' || artifact.type === 'screener_result' || artifact.type === 'table') {
    nodes.push({ label: artifact.title, type: 'start' });
    const groups = artifact.content.groups || [{ title: 'Data', rows: artifact.content.rows || [] }];
    groups.slice(0, 4).forEach((g: any) => {
      nodes.push({ label: g.title, type: 'process', detail: `${g.rows?.length || 0} items` });
    });
    nodes.push({ label: 'ข้อมูลพร้อมวิเคราะห์', type: 'result' });
  }

  return nodes.length > 0 ? nodes : [{ label: artifact.title, type: 'start' }, { label: 'Processing...', type: 'result' }];
}

function extractGraphData(artifact: ArtifactData): { nodes: any[]; connections: any[] } {
  if (artifact.type === 'relationship') {
    return { nodes: artifact.content.nodes || [], connections: artifact.content.connections || [] };
  }

  // Convert other artifact types to graph
  const nodes: any[] = [];
  const connections: any[] = [];

  if (artifact.type === 'chart_analysis') {
    const { symbol, indicators, signals } = artifact.content;
    nodes.push({ label: symbol || 'Asset', type: 'asset' });
    if (indicators) {
      Object.entries(indicators).forEach(([k, v]) => {
        nodes.push({ label: k, type: 'indicator', value: typeof v === 'number' ? (v as number).toFixed(2) : v });
        connections.push({ from: symbol || 'Asset', to: k, type: typeof v === 'number' && (v as number) > 50 ? 'positive' : 'negative' });
      });
    }
    if (signals) {
      (signals as any[]).forEach(s => {
        nodes.push({ label: s.name, type: s.direction === 'bullish' ? 'event' : 'condition' });
        connections.push({ from: s.name, to: symbol || 'Asset', type: s.direction === 'bullish' ? 'positive' : 'negative' });
      });
    }
  } else if (artifact.type === 'financial_statement') {
    nodes.push({ label: artifact.title.replace('📋 งบการเงิน ', ''), type: 'asset' });
    const groups = artifact.content.groups || [];
    groups.forEach((g: any) => {
      nodes.push({ label: g.title.replace(/[💰📊💵📈]\s*/g, ''), type: 'indicator' });
      connections.push({ from: artifact.title.replace('📋 งบการเงิน ', ''), to: g.title.replace(/[💰📊💵📈]\s*/g, ''), type: 'positive' });
    });
  }

  return { nodes, connections };
}

function getFlowNodeStyle(type: string): string {
  const styles: Record<string, string> = {
    start: 'bg-blue-500/10 border-blue-500/40 text-blue-300 rounded-full',
    decision: 'bg-orange-500/10 border-orange-500/40 text-orange-300 rotate-0',
    process: 'bg-purple-500/10 border-purple-500/40 text-purple-300',
    action: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
    result: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 rounded-full',
    condition: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300',
  };
  return styles[type] || 'bg-zinc-800 border-zinc-700 text-zinc-300';
}

function getFlowNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    start: '▶', decision: '◆', process: '⊕', action: '⚡', result: '◎', condition: '◇',
  };
  return icons[type] || '●';
}

function getGraphNodeStyle(type: string): string {
  const styles: Record<string, string> = {
    asset: 'bg-blue-500/10 border-blue-500/50 text-blue-300 shadow-blue-500/10 shadow-lg',
    indicator: 'bg-purple-500/10 border-purple-500/50 text-purple-300',
    event: 'bg-orange-500/10 border-orange-500/50 text-orange-300',
    condition: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300',
  };
  return styles[type] || 'bg-zinc-800 border-zinc-600 text-zinc-300';
}

function getCellColor(val: any): string {
  if (typeof val === 'number') {
    if (val > 0) return 'text-emerald-400';
    if (val < 0) return 'text-red-400';
  }
  if (typeof val === 'string') {
    if (val.includes('Strong Buy') || val.includes('🟢')) return 'text-emerald-400 font-medium';
    if (val.includes('Strong Sell') || val.includes('🔴')) return 'text-red-400 font-medium';
    if (val.includes('Buy') || val.includes('Bullish')) return 'text-green-400';
    if (val.includes('Sell') || val.includes('Bearish')) return 'text-red-400';
  }
  return 'text-zinc-300';
}

function formatCell(val: any): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K';
    return val.toFixed(2);
  }
  return String(val);
}

function getValueColor(val: any): string {
  if (typeof val !== 'number') return 'text-white';
  if (val > 70) return 'text-red-400';
  if (val < 30) return 'text-emerald-400';
  return 'text-white';
}

function groupNodesByCategory(nodes: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  nodes.forEach((node: any) => {
    const cat = node.category || node.type || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(node);
  });
  return groups;
}

function getNodeStyle(type: string): string {
  const styles: Record<string, string> = {
    event: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
    asset: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    indicator: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    decision: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    condition: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    outcome: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    source: 'bg-pink-500/10 border-pink-500/30 text-pink-300',
  };
  return styles[type] || 'bg-zinc-800 border-zinc-700 text-zinc-300';
}

export default ArtifactPanel;
