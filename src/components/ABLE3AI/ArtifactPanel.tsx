import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X, Copy, Table2, GitBranch, BarChart3, FileSpreadsheet, TrendingUp, Brain, Workflow, Network, Palette, PanelRightOpen } from 'lucide-react';

export type ArtifactType = 'table' | 'relationship' | 'chart_analysis' | 'financial_statement' | 'screener_result' | 'quantagent_report';
export type ArtifactViewMode = 'table' | 'flowchart' | 'graph';

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  timestamp: Date;
  content: any;
  source?: string;
  aiResponse?: string;
  userQuery?: string;
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
  quantagent_report: { icon: Brain, label: 'QuantAgent Report', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
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
              {artifact.type === 'quantagent_report' && (
                <RenderQuantAgentReport content={artifact.content} />
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
  const response = artifact.aiResponse || '';
  const query = artifact.userQuery || artifact.title;

  // Step 1: Start node from user query
  nodes.push({ label: query.slice(0, 60), type: 'start', detail: 'คำถามจากผู้ใช้' });

  // Step 2: Extract key points from AI response
  if (response) {
    // Extract numbered items or bullet points from AI response
    const bulletLines = response.split('\n').filter(l => 
      /^[\d]+[.)]\s|^[-•]\s|^\*\s/.test(l.trim())
    );
    
    // Extract section headers (bold text)
    const headers = response.match(/\*\*([^*]+)\*\*/g)?.map(h => h.replace(/\*\*/g, '')) || [];
    
    // Extract key decisions/conditions from response
    const conditionPatterns = response.match(/(?:ถ้า|หาก|เมื่อ|if|when|because|เนื่องจาก|สาเหตุ)[^.\n]{5,60}/gi) || [];
    const actionPatterns = response.match(/(?:ควร|แนะนำ|suggest|recommend|should|buy|sell|ซื้อ|ขาย|hold|ถือ)[^.\n]{5,60}/gi) || [];
    const resultPatterns = response.match(/(?:ผลลัพธ์|สรุป|conclusion|result|ดังนั้น|therefore|target|เป้า)[^.\n]{5,60}/gi) || [];

    // Add data sources as process nodes
    if (headers.length > 0) {
      headers.slice(0, 3).forEach(h => {
        nodes.push({ label: h.slice(0, 50), type: 'process', detail: 'หัวข้อวิเคราะห์' });
      });
    }

    // Add key data points from bullet items
    if (bulletLines.length > 0) {
      const dataNode = bulletLines.length > 3 
        ? `พบข้อมูล ${bulletLines.length} รายการ`
        : bulletLines.slice(0, 3).map(l => l.replace(/^[\d]+[.)]\s|^[-•*]\s/, '').trim().slice(0, 40)).join(', ');
      nodes.push({ label: dataNode, type: 'process', detail: `${bulletLines.length} data points` });
    }

    // Add conditions
    conditionPatterns.slice(0, 2).forEach(c => {
      nodes.push({ label: c.trim().slice(0, 50), type: 'decision', detail: 'เงื่อนไข' });
    });

    // Add actions
    actionPatterns.slice(0, 2).forEach(a => {
      nodes.push({ label: a.trim().slice(0, 50), type: 'action', detail: 'แนวทางปฏิบัติ' });
    });

    // Add results/conclusions
    if (resultPatterns.length > 0) {
      nodes.push({ label: resultPatterns[0].trim().slice(0, 60), type: 'result', detail: 'ผลสรุป' });
    }
  }

  // Fallback: use artifact structured data
  if (nodes.length <= 1) {
    if (artifact.type === 'chart_analysis') {
      const { symbol, indicators, signals, analysis } = artifact.content;
      nodes.push({ label: `วิเคราะห์ ${symbol || 'Asset'}`, type: 'process' });
      if (indicators) {
        Object.entries(indicators).slice(0, 3).forEach(([k, v]) => {
          nodes.push({ label: `${k}: ${typeof v === 'number' ? (v as number).toFixed(2) : v}`, type: 'process', detail: 'Indicator' });
        });
      }
      if (signals) {
        (signals as any[]).slice(0, 2).forEach(s => {
          nodes.push({ label: s.name, type: s.direction === 'bullish' ? 'action' : 'decision', detail: s.detail });
        });
      }
      if (analysis) nodes.push({ label: analysis.slice(0, 60) + '...', type: 'result' });
    } else if (artifact.type === 'financial_statement' || artifact.type === 'screener_result') {
      const groups = artifact.content.groups || [{ title: 'Data', rows: artifact.content.rows || [] }];
      groups.slice(0, 4).forEach((g: any) => {
        nodes.push({ label: g.title, type: 'process', detail: `${g.rows?.length || 0} items` });
      });
      nodes.push({ label: 'ข้อมูลพร้อมวิเคราะห์', type: 'result' });
    }
  }

  // Ensure we have an end node
  if (nodes.length > 1 && nodes[nodes.length - 1].type !== 'result') {
    nodes.push({ label: 'สรุปผลการวิเคราะห์', type: 'result' });
  }

  return nodes.length > 1 ? nodes : [{ label: query.slice(0, 50), type: 'start' }, { label: 'กำลังรอข้อมูล...', type: 'result' }];
}

function extractGraphData(artifact: ArtifactData): { nodes: any[]; connections: any[] } {
  const nodes: any[] = [];
  const connections: any[] = [];
  const response = artifact.aiResponse || '';
  const query = artifact.userQuery || artifact.title;

  // If relationship type, use its data as base
  if (artifact.type === 'relationship' && artifact.content.nodes?.length) {
    return { nodes: artifact.content.nodes, connections: artifact.content.connections || [] };
  }

  // Extract entities from AI response text
  if (response) {
    // Extract assets/tickers
    const assetMatches = [...new Set((response.match(/\b(?:XAU|BTC|ETH|USD|EUR|GBP|JPY|SPX|DXY|VIX|AAPL|TSLA|NVDA|GOOGL|MSFT|Gold|Bitcoin|Oil|ทองคำ|น้ำมัน)[A-Z]*/gi) || []))];
    assetMatches.slice(0, 6).forEach(a => {
      nodes.push({ label: a, type: 'asset', detail: 'สินทรัพย์' });
    });

    // Extract indicators/metrics
    const indicatorMatches = [...new Set((response.match(/\b(?:RSI|MACD|SMA|EMA|P\/E|ROE|ROA|GDP|CPI|NFP|PMI|ATR|Bollinger|Volume|Market Cap|Revenue|EPS|Dividend)[^,\n]{0,20}/gi) || []))];
    indicatorMatches.slice(0, 6).forEach(ind => {
      nodes.push({ label: ind.trim().slice(0, 30), type: 'indicator', detail: 'ตัวชี้วัด' });
    });

    // Extract events
    const eventMatches = [...new Set((response.match(/\b(?:Fed|ECB|BOJ|FOMC|ดอกเบี้ย|เงินเฟ้อ|inflation|recession|war|crisis|breakout|support|resistance|แนวรับ|แนวต้าน)[^,.\n]{0,30}/gi) || []))];
    eventMatches.slice(0, 4).forEach(ev => {
      nodes.push({ label: ev.trim().slice(0, 30), type: 'event', detail: 'เหตุการณ์' });
    });

    // Extract decisions/actions
    const decisionMatches = [...new Set((response.match(/(?:ซื้อ|ขาย|buy|sell|hold|ถือ|Long|Short|strong buy|strong sell)[^,.\n]{0,30}/gi) || []))];
    decisionMatches.slice(0, 3).forEach(d => {
      nodes.push({ label: d.trim().slice(0, 30), type: 'condition', detail: 'สัญญาณ' });
    });
  }

  // Fallback to artifact structured data
  if (nodes.length === 0) {
    if (artifact.type === 'chart_analysis') {
      const { symbol, indicators, signals } = artifact.content;
      nodes.push({ label: symbol || 'Asset', type: 'asset' });
      if (indicators) {
        Object.entries(indicators).forEach(([k, v]) => {
          nodes.push({ label: k, type: 'indicator', value: typeof v === 'number' ? (v as number).toFixed(2) : v });
        });
      }
      if (signals) {
        (signals as any[]).forEach(s => {
          nodes.push({ label: s.name, type: s.direction === 'bullish' ? 'event' : 'condition' });
        });
      }
    } else if (artifact.type === 'financial_statement') {
      nodes.push({ label: artifact.title.replace('📋 งบการเงิน ', ''), type: 'asset' });
      const groups = artifact.content.groups || [];
      groups.forEach((g: any) => {
        nodes.push({ label: g.title.replace(/[💰📊💵📈]\s*/g, ''), type: 'indicator' });
      });
    }
  }

  // Auto-generate connections between nodes
  const assets = nodes.filter(n => n.type === 'asset');
  const others = nodes.filter(n => n.type !== 'asset');
  
  assets.forEach(asset => {
    others.slice(0, 5).forEach(other => {
      const isNegative = response.includes('ลดลง') || response.includes('bearish') || response.includes('sell') || response.includes('ขาย');
      connections.push({
        from: asset.label,
        to: other.label,
        type: other.type === 'condition' ? (isNegative ? 'negative' : 'positive') : 'neutral',
        label: other.type === 'indicator' ? 'มีผลต่อ' : other.type === 'event' ? 'ได้รับผลกระทบ' : undefined,
      });
    });
  });

  // Connect events to conditions
  const events = nodes.filter(n => n.type === 'event');
  const conditions = nodes.filter(n => n.type === 'condition');
  events.forEach(ev => {
    conditions.forEach(cond => {
      connections.push({ from: ev.label, to: cond.label, type: 'neutral', label: 'นำไปสู่' });
    });
  });

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

/* ─── QuantAgent Report Renderer ─── */
const RenderQuantAgentReport: React.FC<{ content: any }> = ({ content }) => {
  const { agents, finalDecision, symbol, timeframe } = content

  const signalColor = (sig: string) => {
    if (sig?.includes('BUY')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    if (sig?.includes('SELL')) return 'text-red-400 border-red-500/30 bg-red-500/10'
    return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  }

  const confidenceBar = (conf: number) => (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${conf > 65 ? 'bg-emerald-500' : conf > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
        style={{ width: `${conf}%` }} />
    </div>
  )

  const agentRow = (label: string, result: any) => {
    if (!result) return null
    return (
      <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">{label}</span>
          <Badge variant="outline" className={`text-[10px] ${signalColor(result.signal)}`}>
            {result.signal} · {result.confidence}%
          </Badge>
        </div>
        {confidenceBar(result.confidence)}
        <p className="text-[10px] text-zinc-500 mt-1">{result.summary}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`p-3 rounded-lg border ${signalColor(finalDecision?.signal)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">{symbol ?? 'Unknown'}</span>
          <span className="text-[10px] text-zinc-500">{timeframe ?? '1H'} · QuantAgent Multi-Agent Analysis</span>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${signalColor(finalDecision?.signal)}`}>
          {finalDecision?.signal ?? 'N/A'}
        </Badge>
      </div>

      {/* Confidence + Targets */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-500">Confidence</p>
          <p className="text-lg font-bold text-white">{finalDecision?.confidence ?? 0}%</p>
          {confidenceBar(finalDecision?.confidence ?? 0)}
        </div>
        <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20 text-center">
          <p className="text-[10px] text-zinc-500">Target</p>
          <p className="text-sm font-mono text-emerald-400">{finalDecision?.priceTarget?.toFixed(4) ?? '—'}</p>
        </div>
        <div className="p-2 rounded bg-red-500/5 border border-red-500/20 text-center">
          <p className="text-[10px] text-zinc-500">Stop Loss</p>
          <p className="text-sm font-mono text-red-400">{finalDecision?.stopLoss?.toFixed(4) ?? '—'}</p>
        </div>
      </div>

      {finalDecision?.riskReward && (
        <div className="text-center text-xs text-zinc-500">
          Risk:Reward <span className="text-white font-mono">1 : {finalDecision.riskReward.toFixed(2)}</span>
        </div>
      )}

      {/* Agent Breakdown */}
      <div className="space-y-2">
        <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest">Agent Breakdown</h4>
        {agentRow('📊 IndicatorAgent', agents?.indicator)}
        {agentRow('🔍 PatternAgent', agents?.pattern)}
        {agentRow('📈 TrendAgent', agents?.trend)}
        {agentRow('🛡️ RiskAgent', agents?.risk)}
      </div>

      {/* Rationale */}
      {finalDecision?.rationale && (
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Rationale</h4>
          <p className="text-xs text-zinc-300">{finalDecision.rationale}</p>
        </div>
      )}
    </div>
  )
}

export default ArtifactPanel;
