import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Copy, Download, Table2, GitBranch, BarChart3, FileSpreadsheet, TrendingUp, Brain } from 'lucide-react';

export type ArtifactType = 'table' | 'relationship' | 'chart_analysis' | 'financial_statement' | 'screener_result';

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
}

const TYPE_META: Record<ArtifactType, { icon: typeof Table2; label: string; color: string }> = {
  table: { icon: Table2, label: 'Table', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  relationship: { icon: GitBranch, label: 'Relationship Map', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  chart_analysis: { icon: BarChart3, label: 'Chart Analysis', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  financial_statement: { icon: FileSpreadsheet, label: 'Financial Statement', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  screener_result: { icon: TrendingUp, label: 'Screener', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
};

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  if (!artifact) return null;

  const meta = TYPE_META[artifact.type];
  const Icon = meta.icon;

  const copyToClipboard = () => {
    let text = '';
    if (artifact.type === 'table' || artifact.type === 'screener_result' || artifact.type === 'financial_statement') {
      const { headers, rows } = artifact.content;
      text = [headers.join('\t'), ...rows.map((r: any[]) => r.join('\t'))].join('\n');
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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {(artifact.type === 'table' || artifact.type === 'screener_result' || artifact.type === 'financial_statement') && (
            <RenderTable content={artifact.content} type={artifact.type} />
          )}
          {artifact.type === 'relationship' && (
            <RenderRelationship content={artifact.content} />
          )}
          {artifact.type === 'chart_analysis' && (
            <RenderChartAnalysis content={artifact.content} />
          )}
        </div>
      </ScrollArea>
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
                      <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium border-b border-zinc-800 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row: any[], ri: number) => (
                    <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      {row.map((cell: any, ci: number) => (
                        <td key={ci} className={`px-3 py-2 whitespace-nowrap ${getCellColor(cell)}`}>
                          {formatCell(cell)}
                        </td>
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
              <th key={i} className="px-3 py-2 text-left text-zinc-400 font-medium border-b border-zinc-800 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row: any[], ri: number) => (
            <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
              {row.map((cell: any, ci: number) => (
                <td key={ci} className={`px-3 py-2 whitespace-nowrap ${getCellColor(cell)}`}>
                  {formatCell(cell)}
                </td>
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

      {/* Nodes by category */}
      {nodes && Object.entries(groupNodesByCategory(nodes)).map(([category, items]: [string, any]) => (
        <div key={category}>
          <h4 className="text-[10px] text-zinc-600 mb-2 uppercase tracking-widest">{category}</h4>
          <div className="flex flex-wrap gap-2">
            {items.map((node: any, i: number) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg border text-xs ${getNodeStyle(node.type)}`}
              >
                <div className="font-medium">{node.label}</div>
                {node.detail && <div className="text-[10px] opacity-60 mt-0.5">{node.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Connections */}
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
      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        <div>
          <div className="text-sm font-bold text-white">{symbol || 'Unknown'}</div>
          <div className="text-[10px] text-zinc-500">{timeframe || 'Daily'}</div>
        </div>
      </div>

      {/* Indicators */}
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

      {/* Signals */}
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

      {/* Key Levels */}
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

      {/* Analysis Text */}
      {analysis && (
        <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{analysis}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Helpers ─── */
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
