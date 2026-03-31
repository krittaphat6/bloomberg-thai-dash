import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X, Copy, Check, Table2, GitBranch, BarChart3, FileSpreadsheet, TrendingUp,
  Brain, Workflow, Network, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Download, Share2, Layers, FileText, Code, Eye, RotateCcw, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, Clock, Hash, Link2, BookOpen
} from 'lucide-react';

export type ArtifactType = 'table' | 'relationship' | 'chart_analysis' | 'financial_statement' | 'screener_result' | 'quantagent_report' | 'text' | 'code' | 'markdown';
export type ArtifactViewMode = 'preview' | 'code' | 'table' | 'flowchart' | 'graph';

export interface ArtifactData {
  id: string;
  type: ArtifactType;
  title: string;
  timestamp: Date;
  content: any;
  source?: string;
  aiResponse?: string;
  userQuery?: string;
  version?: number;
  linkedNotes?: string[];
}

interface ArtifactPanelProps {
  artifact: ArtifactData | null;
  onClose: () => void;
  isOpen: boolean;
  artifacts?: ArtifactData[];
  onSelectArtifact?: (artifact: ArtifactData) => void;
}

const TYPE_META: Record<ArtifactType, { icon: typeof Table2; label: string; accent: string }> = {
  table: { icon: Table2, label: 'Table', accent: 'hsl(210 100% 65%)' },
  relationship: { icon: GitBranch, label: 'Relationship Map', accent: 'hsl(270 70% 65%)' },
  chart_analysis: { icon: BarChart3, label: 'Chart Analysis', accent: 'hsl(190 80% 55%)' },
  financial_statement: { icon: FileSpreadsheet, label: 'Financial Statement', accent: 'hsl(150 70% 50%)' },
  screener_result: { icon: TrendingUp, label: 'Screener', accent: 'hsl(30 90% 55%)' },
  quantagent_report: { icon: Brain, label: 'QuantAgent Report', accent: 'hsl(160 70% 45%)' },
  text: { icon: FileText, label: 'Text', accent: 'hsl(220 15% 65%)' },
  code: { icon: Code, label: 'Code', accent: 'hsl(40 90% 55%)' },
  markdown: { icon: BookOpen, label: 'Document', accent: 'hsl(200 60% 55%)' },
};

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — Claude-style Artifact Panel
   ════════════════════════════════════════════════════════════════════ */
const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose, isOpen, artifacts = [], onSelectArtifact }) => {
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('preview');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const currentIndex = artifacts.findIndex(a => a.id === artifact?.id);

  const navigateArtifact = (dir: -1 | 1) => {
    const newIdx = currentIndex + dir;
    if (newIdx >= 0 && newIdx < artifacts.length && onSelectArtifact) {
      onSelectArtifact(artifacts[newIdx]);
    }
  };

  /* ─── Empty State ─── */
  if (!artifact) {
    return (
      <div className="h-full flex flex-col bg-[hsl(0,0%,4%)] border-l border-[hsl(0,0%,12%)]">
        {/* Clean header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(0,0%,12%)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(200,80%,50%)] to-[hsl(260,70%,55%)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[hsl(0,0%,93%)]">Artifacts</h3>
              <span className="text-[11px] text-[hsl(0,0%,45%)]">AI-generated content</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 rounded-lg text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,10%)]">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Empty state — Claude-style centered message */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-xs">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(200,60%,15%)] to-[hsl(260,50%,12%)] border border-[hsl(200,40%,20%)] flex items-center justify-center">
              <Layers className="w-10 h-10 text-[hsl(200,60%,45%)]" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-[hsl(0,0%,80%)]">No artifact yet</p>
              <p className="text-[13px] text-[hsl(0,0%,40%)] mt-2 leading-relaxed">
                เมื่อคุณสนทนากับ ABLE AI ผลลัพธ์จะแสดงที่นี่อัตโนมัติ — ตาราง, กราฟ, รายงาน, Flowchart และอื่นๆ
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {['วิเคราะห์ XAUUSD', 'ดูงบ AAPL', 'หา top gainers'].map((hint, i) => (
                <span key={i} className="text-[11px] px-3 py-1.5 rounded-full border border-[hsl(0,0%,15%)] text-[hsl(0,0%,50%)] bg-[hsl(0,0%,6%)]">{hint}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Obsidian-style graph toggle */}
        <div className="px-5 py-3 border-t border-[hsl(0,0%,12%)]">
          <Button variant="ghost" onClick={() => setShowGraph(!showGraph)} className="w-full h-9 text-xs text-[hsl(0,0%,45%)] hover:text-[hsl(200,60%,55%)] hover:bg-[hsl(0,0%,8%)] gap-2">
            <Network className="w-3.5 h-3.5" />
            {showGraph ? 'Hide' : 'Show'} Knowledge Graph
          </Button>
          {showGraph && (
            <div className="mt-3 p-4 rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5%)] text-center">
              <Network className="w-8 h-8 text-[hsl(200,40%,30%)] mx-auto mb-2" />
              <p className="text-[11px] text-[hsl(0,0%,35%)]">Graph view จะแสดงเมื่อมี artifacts หลายรายการเชื่อมโยงกัน</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const meta = TYPE_META[artifact.type] || TYPE_META.text;
  const Icon = meta.icon;

  const copyToClipboard = () => {
    let text = '';
    if (['table', 'screener_result', 'financial_statement'].includes(artifact.type)) {
      const { headers, rows, groups } = artifact.content;
      if (groups) {
        text = groups.map((g: any) => `${g.title}\n${g.headers.join('\t')}\n${g.rows.map((r: any[]) => r.join('\t')).join('\n')}`).join('\n\n');
      } else if (headers && rows) {
        text = [headers.join('\t'), ...rows.map((r: any[]) => r.join('\t'))].join('\n');
      }
    }
    if (!text && artifact.aiResponse) text = artifact.aiResponse;
    if (!text) text = JSON.stringify(artifact.content, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const viewModes: { value: ArtifactViewMode; icon: typeof Eye; label: string }[] = [
    { value: 'preview', icon: Eye, label: 'Preview' },
    { value: 'table', icon: Table2, label: 'Table' },
    { value: 'flowchart', icon: Workflow, label: 'Flow' },
    { value: 'graph', icon: Network, label: 'Graph' },
    { value: 'code', icon: Code, label: 'JSON' },
  ];

  return (
    <div className={`h-full flex flex-col bg-[hsl(0,0%,4%)] border-l border-[hsl(0,0%,12%)] ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* ─── Header — Claude style ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5%)]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Navigation arrows */}
          {artifacts.length > 1 && (
            <div className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" onClick={() => navigateArtifact(-1)} disabled={currentIndex <= 0}
                className="h-7 w-7 rounded text-[hsl(0,0%,45%)] hover:text-white hover:bg-[hsl(0,0%,12%)] disabled:opacity-20">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => navigateArtifact(1)} disabled={currentIndex >= artifacts.length - 1}
                className="h-7 w-7 rounded text-[hsl(0,0%,45%)] hover:text-white hover:bg-[hsl(0,0%,12%)] disabled:opacity-20">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {/* Type icon + title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${meta.accent}15`, border: `1px solid ${meta.accent}30` }}>
              <Icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-[hsl(0,0%,93%)] truncate">{artifact.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: meta.accent, backgroundColor: `${meta.accent}12` }}>
                  {meta.label}
                </span>
                {artifact.version && (
                  <span className="text-[10px] text-[hsl(0,0%,35%)] flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />v{artifact.version}
                  </span>
                )}
                <span className="text-[10px] text-[hsl(0,0%,30%)] flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(artifact.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={copyToClipboard}
            className="h-7 w-7 rounded text-[hsl(0,0%,45%)] hover:text-white hover:bg-[hsl(0,0%,12%)]">
            {copied ? <Check className="w-3.5 h-3.5 text-[hsl(150,70%,45%)]" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7 rounded text-[hsl(0,0%,45%)] hover:text-white hover:bg-[hsl(0,0%,12%)]">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose}
            className="h-7 w-7 rounded text-[hsl(0,0%,45%)] hover:text-white hover:bg-[hsl(0,0%,12%)]">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── View Mode Tabs — Claude style pill switcher ─── */}
      <div className="px-4 py-2 border-b border-[hsl(0,0%,10%)] bg-[hsl(0,0%,4.5%)]">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,12%)]">
          {viewModes.map(m => {
            const isActive = viewMode === m.value;
            return (
              <button key={m.value} onClick={() => setViewMode(m.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[hsl(0,0%,14%)] text-[hsl(0,0%,93%)] shadow-sm'
                    : 'text-[hsl(0,0%,40%)] hover:text-[hsl(0,0%,60%)] hover:bg-[hsl(0,0%,9%)]'
                }`}>
                <m.icon className="w-3 h-3" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Content ─── */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          {viewMode === 'preview' && <PreviewRenderer artifact={artifact} />}
          {viewMode === 'table' && <TableRenderer artifact={artifact} />}
          {viewMode === 'flowchart' && <FlowchartRenderer artifact={artifact} />}
          {viewMode === 'graph' && <GraphRenderer artifact={artifact} />}
          {viewMode === 'code' && <CodeRenderer artifact={artifact} />}
        </div>
      </ScrollArea>

      {/* ─── Obsidian-style footer with linked notes ─── */}
      {(artifact.linkedNotes?.length || artifacts.length > 1) && (
        <div className="px-4 py-3 border-t border-[hsl(0,0%,10%)] bg-[hsl(0,0%,4.5%)]">
          {artifact.linkedNotes && artifact.linkedNotes.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-3 h-3 text-[hsl(0,0%,35%)]" />
              <span className="text-[10px] text-[hsl(0,0%,35%)] uppercase tracking-wider">Linked</span>
              <div className="flex gap-1.5 flex-wrap">
                {artifact.linkedNotes.map((note, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(200,40%,12%)] text-[hsl(200,50%,55%)] border border-[hsl(200,30%,18%)]">
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}
          {artifacts.length > 1 && (
            <div className="flex items-center gap-1.5 text-[10px] text-[hsl(0,0%,35%)]">
              <Layers className="w-3 h-3" />
              <span>{currentIndex + 1} / {artifacts.length} artifacts</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   PREVIEW RENDERER — Smart auto-detect display
   ════════════════════════════════════════════════════════════════════ */
const PreviewRenderer: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  // Auto-select best renderer
  if (artifact.type === 'quantagent_report') return <QuantAgentRenderer content={artifact.content} />;
  if (artifact.type === 'chart_analysis') return <ChartAnalysisRenderer content={artifact.content} />;
  if (artifact.type === 'relationship') return <RelationshipRenderer content={artifact.content} />;
  if (['table', 'screener_result', 'financial_statement'].includes(artifact.type)) return <TableRenderer artifact={artifact} />;

  // Default: render AI response as document
  if (artifact.aiResponse) return <DocumentRenderer text={artifact.aiResponse} title={artifact.title} />;

  return (
    <div className="text-[13px] text-[hsl(0,0%,60%)] leading-relaxed">
      <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(artifact.content, null, 2)}</pre>
    </div>
  );
};

/* ─── Document Renderer (Markdown-like) ─── */
const DocumentRenderer: React.FC<{ text: string; title: string }> = ({ text, title }) => {
  const sections = useMemo(() => {
    const lines = text.split('\n');
    const result: Array<{ type: 'heading' | 'bullet' | 'divider' | 'bold-line' | 'text'; content: string }> = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === '---') {
        result.push({ type: 'divider', content: '' });
      } else if (/^#{1,3}\s/.test(trimmed)) {
        result.push({ type: 'heading', content: trimmed.replace(/^#+\s/, '') });
      } else if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
        result.push({ type: 'heading', content: trimmed.replace(/\*\*/g, '') });
      } else if (/^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
        result.push({ type: 'bullet', content: trimmed.replace(/^[-•*\d.)]+\s/, '') });
      } else {
        result.push({ type: 'text', content: trimmed });
      }
    }
    return result;
  }, [text]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-[hsl(200,50%,55%)]" />
        <span className="text-[13px] font-semibold text-[hsl(0,0%,85%)]">{title}</span>
      </div>
      {sections.map((sec, i) => {
        if (sec.type === 'divider') return <div key={i} className="border-t border-[hsl(0,0%,12%)] my-4" />;
        if (sec.type === 'heading') return <h3 key={i} className="text-[13px] font-bold text-[hsl(0,0%,88%)] mt-4 mb-1">{renderInlineMarkdown(sec.content)}</h3>;
        if (sec.type === 'bullet') return (
          <div key={i} className="flex gap-2 text-[13px] text-[hsl(0,0%,70%)] leading-relaxed ml-2">
            <span className="text-[hsl(200,50%,50%)] mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineMarkdown(sec.content)}</span>
          </div>
        );
        return <p key={i} className="text-[13px] text-[hsl(0,0%,70%)] leading-relaxed">{renderInlineMarkdown(sec.content)}</p>;
      })}
    </div>
  );
};

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, j) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={j} className="text-[hsl(0,0%,90%)] font-semibold">{part.slice(2, -2)}</strong>
      : <span key={j}>{part}</span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TABLE RENDERER
   ════════════════════════════════════════════════════════════════════ */
const TableRenderer: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  const { headers, rows, groups } = artifact.content;

  if (groups && groups.length > 0) {
    return (
      <div className="space-y-6">
        {groups.map((group: any, gi: number) => (
          <div key={gi}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(150,60%,45%)]" />
              <h4 className="text-[12px] font-bold text-[hsl(0,0%,80%)] uppercase tracking-wider">{group.title}</h4>
              <span className="text-[10px] text-[hsl(0,0%,30%)]">{group.rows?.length || 0} rows</span>
            </div>
            <DataTable headers={group.headers} rows={group.rows} />
          </div>
        ))}
      </div>
    );
  }

  if (headers && rows) return <DataTable headers={headers} rows={rows} />;

  return <p className="text-[13px] text-[hsl(0,0%,45%)]">No table data available for this artifact.</p>;
};

const DataTable: React.FC<{ headers: string[]; rows: any[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5%)]">
    <table className="w-full text-[12px]">
      <thead>
        <tr className="border-b border-[hsl(0,0%,12%)]">
          {headers?.map((h: string, i: number) => (
            <th key={i} className="px-4 py-2.5 text-left text-[hsl(0,0%,50%)] font-semibold whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows?.map((row: any[], ri: number) => (
          <tr key={ri} className="border-b border-[hsl(0,0%,8%)] hover:bg-[hsl(0,0%,7%)] transition-colors">
            {row.map((cell: any, ci: number) => (
              <td key={ci} className={`px-4 py-2.5 whitespace-nowrap ${getCellColor(cell)}`}>{formatCell(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   CHART ANALYSIS RENDERER
   ════════════════════════════════════════════════════════════════════ */
const ChartAnalysisRenderer: React.FC<{ content: any }> = ({ content }) => {
  const { symbol, timeframe, indicators, signals, levels, analysis } = content;

  return (
    <div className="space-y-5">
      {/* Symbol header card */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[hsl(195,30%,7%)] border border-[hsl(195,30%,15%)]">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(195,70%,25%)] to-[hsl(195,50%,15%)] flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-[hsl(195,80%,60%)]" />
        </div>
        <div>
          <div className="text-lg font-bold text-[hsl(0,0%,93%)]">{symbol || 'Unknown'}</div>
          <div className="text-[11px] text-[hsl(0,0%,45%)]">{timeframe || 'Daily'} · Technical Analysis</div>
        </div>
      </div>

      {/* Indicators grid */}
      {indicators && (
        <Section title="Technical Indicators">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(indicators).map(([key, val]: [string, any]) => (
              <div key={key} className="p-3 rounded-lg bg-[hsl(0,0%,6%)] border border-[hsl(0,0%,12%)]">
                <div className="text-[10px] text-[hsl(0,0%,40%)] uppercase tracking-wider">{key}</div>
                <div className={`text-[15px] font-mono font-bold mt-0.5 ${getValueColor(val)}`}>
                  {typeof val === 'number' ? val.toFixed(2) : String(val)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Signals */}
      {signals && signals.length > 0 && (
        <Section title="Signals">
          <div className="space-y-2">
            {signals.map((sig: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] border ${
                sig.direction === 'bullish' ? 'border-[hsl(150,40%,18%)] bg-[hsl(150,30%,6%)]' :
                sig.direction === 'bearish' ? 'border-[hsl(0,40%,18%)] bg-[hsl(0,30%,6%)]' :
                'border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)]'
              }`}>
                {sig.direction === 'bullish'
                  ? <ArrowUpRight className="w-4 h-4 text-[hsl(150,60%,50%)]" />
                  : sig.direction === 'bearish'
                  ? <ArrowDownRight className="w-4 h-4 text-[hsl(0,60%,55%)]" />
                  : <Minus className="w-4 h-4 text-[hsl(0,0%,45%)]" />}
                <span className="font-medium text-[hsl(0,0%,85%)]">{sig.name}</span>
                {sig.detail && <span className="text-[11px] text-[hsl(0,0%,40%)] ml-auto">{sig.detail}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key levels */}
      {levels && (
        <Section title="Key Levels">
          <div className="space-y-1.5">
            {Object.entries(levels).map(([label, price]: [string, any]) => (
              <div key={label} className="flex justify-between items-center px-4 py-2 rounded-lg bg-[hsl(0,0%,6%)]">
                <span className="text-[12px] text-[hsl(0,0%,50%)]">{label}</span>
                <span className="text-[13px] font-mono text-[hsl(0,0%,90%)] font-medium">{typeof price === 'number' ? price.toFixed(2) : price}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Analysis text */}
      {analysis && (
        <div className="p-4 rounded-xl bg-[hsl(195,20%,6%)] border border-[hsl(195,20%,14%)]">
          <p className="text-[13px] text-[hsl(0,0%,70%)] leading-relaxed whitespace-pre-wrap">{analysis}</p>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   QUANTAGENT REPORT RENDERER
   ════════════════════════════════════════════════════════════════════ */
const QuantAgentRenderer: React.FC<{ content: any }> = ({ content }) => {
  const { agents, finalDecision, symbol, timeframe } = content;

  const signalStyle = (sig: string) => {
    if (sig?.includes('BUY')) return { color: 'hsl(150,60%,50%)', bg: 'hsl(150,30%,7%)', border: 'hsl(150,30%,15%)' };
    if (sig?.includes('SELL')) return { color: 'hsl(0,60%,55%)', bg: 'hsl(0,30%,7%)', border: 'hsl(0,30%,15%)' };
    return { color: 'hsl(40,70%,55%)', bg: 'hsl(40,20%,7%)', border: 'hsl(40,20%,15%)' };
  };

  const style = signalStyle(finalDecision?.signal);

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className="p-5 rounded-xl border" style={{ backgroundColor: style.bg, borderColor: style.border }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-[hsl(0,0%,93%)]">{symbol ?? 'Unknown'}</div>
            <div className="text-[11px] text-[hsl(0,0%,45%)]">{timeframe ?? '1H'} · Multi-Agent Analysis</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: style.color }}>{finalDecision?.signal ?? 'N/A'}</div>
            <div className="text-[11px] text-[hsl(0,0%,45%)]">Confidence {finalDecision?.confidence ?? 0}%</div>
          </div>
        </div>
        <ConfidenceBar value={finalDecision?.confidence ?? 0} />
      </div>

      {/* Targets row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Confidence" value={`${finalDecision?.confidence ?? 0}%`} />
        <MetricCard label="Target" value={finalDecision?.priceTarget?.toFixed(4) ?? '—'} accent="hsl(150,60%,45%)" />
        <MetricCard label="Stop Loss" value={finalDecision?.stopLoss?.toFixed(4) ?? '—'} accent="hsl(0,55%,50%)" />
      </div>

      {finalDecision?.riskReward && (
        <div className="text-center text-[12px] text-[hsl(0,0%,45%)]">
          Risk:Reward <span className="text-[hsl(0,0%,90%)] font-mono font-bold">1 : {finalDecision.riskReward.toFixed(2)}</span>
        </div>
      )}

      {/* Agent Breakdown */}
      <Section title="Agent Breakdown">
        <div className="space-y-2.5">
          {[
            { label: 'Indicator Agent', icon: '📊', data: agents?.indicator },
            { label: 'Pattern Agent', icon: '🔍', data: agents?.pattern },
            { label: 'Trend Agent', icon: '📈', data: agents?.trend },
            { label: 'Risk Agent', icon: '🛡️', data: agents?.risk },
          ].map(a => a.data && (
            <AgentCard key={a.label} label={a.label} icon={a.icon} result={a.data} />
          ))}
        </div>
      </Section>

      {finalDecision?.rationale && (
        <div className="p-4 rounded-xl bg-[hsl(0,0%,5%)] border border-[hsl(0,0%,12%)]">
          <h4 className="text-[10px] text-[hsl(0,0%,40%)] uppercase tracking-wider mb-2">Rationale</h4>
          <p className="text-[13px] text-[hsl(0,0%,70%)] leading-relaxed">{finalDecision.rationale}</p>
        </div>
      )}
    </div>
  );
};

const AgentCard: React.FC<{ label: string; icon: string; result: any }> = ({ label, icon, result }) => {
  const style = result.signal?.includes('BUY') ? 'hsl(150,60%,50%)' : result.signal?.includes('SELL') ? 'hsl(0,60%,55%)' : 'hsl(40,70%,55%)';
  return (
    <div className="p-3.5 rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5.5%)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-[hsl(0,0%,65%)] font-medium">{icon} {label}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ color: style, backgroundColor: `${style}15` }}>
          {result.signal} · {result.confidence}%
        </span>
      </div>
      <ConfidenceBar value={result.confidence} />
      {result.summary && <p className="text-[11px] text-[hsl(0,0%,40%)] mt-2 leading-relaxed">{result.summary}</p>}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   RELATIONSHIP RENDERER
   ════════════════════════════════════════════════════════════════════ */
const RelationshipRenderer: React.FC<{ content: any }> = ({ content }) => {
  const { nodes, connections, summary } = content;
  return (
    <div className="space-y-5">
      {summary && (
        <div className="p-4 rounded-xl bg-[hsl(270,20%,7%)] border border-[hsl(270,20%,14%)]">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-[hsl(270,60%,60%)]" />
            <span className="text-[12px] font-semibold text-[hsl(270,40%,75%)]">AI Summary</span>
          </div>
          <p className="text-[13px] text-[hsl(0,0%,70%)] leading-relaxed">{summary}</p>
        </div>
      )}
      {nodes && (
        <div className="flex flex-wrap gap-2">
          {nodes.map((node: any, i: number) => {
            const s = getNodeAccent(node.type);
            return (
              <div key={i} className="px-3.5 py-2.5 rounded-xl border text-[12px]"
                style={{ backgroundColor: `${s}08`, borderColor: `${s}25`, color: s }}>
                <div className="font-medium">{node.label}</div>
                {node.detail && <div className="text-[10px] opacity-50 mt-0.5">{node.detail}</div>}
              </div>
            );
          })}
        </div>
      )}
      {connections && connections.length > 0 && (
        <Section title="Connections">
          <div className="space-y-1.5">
            {connections.map((conn: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg bg-[hsl(0,0%,6%)]">
                <span className="text-[hsl(0,0%,80%)]">{conn.from}</span>
                <span className={`text-[11px] ${conn.type === 'positive' ? 'text-[hsl(150,60%,50%)]' : conn.type === 'negative' ? 'text-[hsl(0,60%,55%)]' : 'text-[hsl(0,0%,35%)]'}`}>→</span>
                <span className="text-[hsl(0,0%,80%)]">{conn.to}</span>
                {conn.label && <span className="text-[hsl(0,0%,30%)] text-[10px] ml-auto">({conn.label})</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   FLOWCHART RENDERER
   ════════════════════════════════════════════════════════════════════ */
const FlowchartRenderer: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  const nodes = extractFlowchartNodes(artifact);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Workflow className="w-4 h-4 text-[hsl(270,60%,60%)]" />
        <span className="text-[12px] font-semibold text-[hsl(270,40%,75%)]">Decision Flowchart</span>
        <span className="text-[10px] text-[hsl(0,0%,35%)] ml-auto">{nodes.length} nodes</span>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-[10px] text-[hsl(0,0%,50%)]">
        {[
          { label: 'Start', color: 'hsl(210,70%,55%)' },
          { label: 'Decision', color: 'hsl(30,80%,55%)' },
          { label: 'Process', color: 'hsl(270,60%,55%)' },
          { label: 'Action', color: 'hsl(150,60%,45%)' },
          { label: 'Result', color: 'hsl(190,70%,50%)' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />{l.label}
          </span>
        ))}
      </div>
      {/* Nodes */}
      <div className="flex flex-col items-center gap-0">
        {nodes.map((node, i) => {
          const c = flowNodeColor(node.type);
          return (
            <React.Fragment key={i}>
              <div className={`w-full max-w-sm px-4 py-3 rounded-xl border text-[12px] text-center transition-all hover:scale-[1.02] ${
                node.type === 'start' || node.type === 'result' ? 'rounded-full' : ''
              }`} style={{ backgroundColor: `${c}08`, borderColor: `${c}30`, color: c }}>
                <div className="flex items-center justify-center gap-2 font-medium">
                  <span>{flowNodeIcon(node.type)}</span>
                  <span>{node.label}</span>
                </div>
                {node.detail && <div className="text-[10px] opacity-50 mt-0.5">{node.detail}</div>}
              </div>
              {i < nodes.length - 1 && (
                <div className="flex flex-col items-center my-0.5">
                  <div className="w-px h-5 bg-[hsl(0,0%,15%)]" />
                  <div className="text-[hsl(0,0%,25%)] text-[10px]">↓</div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   GRAPH RENDERER — Obsidian style
   ════════════════════════════════════════════════════════════════════ */
const GraphRenderer: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  const { nodes, connections } = extractGraphData(artifact);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-4 h-4 text-[hsl(200,50%,55%)]" />
        <span className="text-[12px] font-semibold text-[hsl(200,40%,70%)]">Knowledge Graph</span>
        <span className="text-[10px] text-[hsl(0,0%,35%)] ml-auto">{nodes.length} nodes · {connections.length} links</span>
      </div>

      {/* Obsidian-style graph canvas */}
      <div className="relative p-8 rounded-2xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,3%)] min-h-[350px] overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(200,40%,40%) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative flex flex-wrap gap-4 justify-center items-center">
          {nodes.map((node, i) => {
            const accent = getNodeAccent(node.type);
            const radius = Math.min(200, 60 + i * 25);
            const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
            const offsetX = Math.cos(angle) * radius * 0.3;
            const offsetY = Math.sin(angle) * radius * 0.2;
            return (
              <div key={i} className="relative px-4 py-3 rounded-2xl border-2 text-[12px] transition-all hover:scale-110 hover:shadow-lg cursor-pointer"
                style={{
                  backgroundColor: `${accent}10`,
                  borderColor: `${accent}40`,
                  color: accent,
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                  boxShadow: `0 0 20px ${accent}08`,
                }}>
                <div className="font-bold">{node.label}</div>
                {node.detail && <div className="text-[10px] opacity-50 mt-0.5">{node.detail}</div>}
                {node.value && (
                  <div className="text-[10px] font-mono mt-1 opacity-80">{node.value}</div>
                )}
                {/* Connection dot */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
              </div>
            );
          })}
        </div>

        {/* Connections list */}
        {connections.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[hsl(0,0%,10%)] space-y-1.5">
            {connections.map((conn, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg bg-[hsl(0,0%,5%)]">
                <span className="text-[hsl(0,0%,70%)]">{conn.from}</span>
                <span className={conn.type === 'positive' ? 'text-[hsl(150,60%,50%)]' : conn.type === 'negative' ? 'text-[hsl(0,60%,55%)]' : 'text-[hsl(0,0%,30%)]'}>
                  {conn.type === 'positive' ? '━▸ ↑' : conn.type === 'negative' ? '━▸ ↓' : '━▸'}
                </span>
                <span className="text-[hsl(0,0%,70%)]">{conn.to}</span>
                {conn.label && <span className="text-[hsl(0,0%,25%)] ml-auto">({conn.label})</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════
   CODE / JSON RENDERER
   ════════════════════════════════════════════════════════════════════ */
const CodeRenderer: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => (
  <div className="rounded-xl border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,3%)] overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[hsl(0,0%,10%)] bg-[hsl(0,0%,5%)]">
      <Code className="w-3.5 h-3.5 text-[hsl(40,80%,55%)]" />
      <span className="text-[11px] text-[hsl(0,0%,45%)]">artifact.json</span>
    </div>
    <pre className="p-4 text-[11px] font-mono text-[hsl(0,0%,60%)] leading-relaxed overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(artifact.content, null, 2)}
    </pre>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ════════════════════════════════════════════════════════════════════ */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-[10px] text-[hsl(0,0%,40%)] uppercase tracking-wider mb-3 font-semibold">{title}</h4>
    {children}
  </div>
);

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full bg-[hsl(0,0%,10%)] rounded-full h-1.5 mt-1.5 overflow-hidden">
    <div className={`h-1.5 rounded-full transition-all duration-500 ${value > 65 ? 'bg-[hsl(150,60%,45%)]' : value > 40 ? 'bg-[hsl(40,70%,50%)]' : 'bg-[hsl(0,55%,50%)]'}`}
      style={{ width: `${Math.min(100, value)}%` }} />
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className="p-3 rounded-xl bg-[hsl(0,0%,5.5%)] border border-[hsl(0,0%,12%)] text-center">
    <p className="text-[10px] text-[hsl(0,0%,40%)] uppercase tracking-wider">{label}</p>
    <p className="text-[14px] font-mono font-bold mt-1" style={{ color: accent || 'hsl(0,0%,90%)' }}>{value}</p>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ════════════════════════════════════════════════════════════════════ */
function extractFlowchartNodes(artifact: ArtifactData): Array<{ label: string; type: string; detail?: string }> {
  const nodes: Array<{ label: string; type: string; detail?: string }> = [];
  const response = artifact.aiResponse || '';
  const query = artifact.userQuery || artifact.title;

  nodes.push({ label: query.slice(0, 60), type: 'start', detail: 'User Query' });

  if (response) {
    const headers = response.match(/\*\*([^*]+)\*\*/g)?.map(h => h.replace(/\*\*/g, '')) || [];
    const conditions = response.match(/(?:ถ้า|หาก|เมื่อ|if|when|because)[^.\n]{5,60}/gi) || [];
    const actions = response.match(/(?:ควร|แนะนำ|suggest|recommend|should|buy|sell|ซื้อ|ขาย|hold)[^.\n]{5,60}/gi) || [];
    const results = response.match(/(?:ผลลัพธ์|สรุป|conclusion|result|ดังนั้น|therefore|target)[^.\n]{5,60}/gi) || [];

    headers.slice(0, 3).forEach(h => nodes.push({ label: h.slice(0, 50), type: 'process' }));
    conditions.slice(0, 2).forEach(c => nodes.push({ label: c.trim().slice(0, 50), type: 'decision' }));
    actions.slice(0, 2).forEach(a => nodes.push({ label: a.trim().slice(0, 50), type: 'action' }));
    if (results.length > 0) nodes.push({ label: results[0].trim().slice(0, 60), type: 'result' });
  }

  if (nodes.length <= 1) {
    if (artifact.type === 'chart_analysis') {
      const { symbol, indicators, signals, analysis } = artifact.content;
      nodes.push({ label: `Analyze ${symbol || 'Asset'}`, type: 'process' });
      if (indicators) Object.entries(indicators).slice(0, 3).forEach(([k, v]) => nodes.push({ label: `${k}: ${typeof v === 'number' ? (v as number).toFixed(2) : v}`, type: 'process' }));
      if (signals) (signals as any[]).slice(0, 2).forEach(s => nodes.push({ label: s.name, type: s.direction === 'bullish' ? 'action' : 'decision' }));
      if (analysis) nodes.push({ label: analysis.slice(0, 60) + '...', type: 'result' });
    } else if (artifact.type === 'financial_statement' || artifact.type === 'screener_result') {
      const groups = artifact.content.groups || [{ title: 'Data', rows: artifact.content.rows || [] }];
      groups.slice(0, 4).forEach((g: any) => nodes.push({ label: g.title, type: 'process', detail: `${g.rows?.length || 0} items` }));
      nodes.push({ label: 'Analysis Complete', type: 'result' });
    }
  }

  if (nodes.length > 1 && nodes[nodes.length - 1].type !== 'result') {
    nodes.push({ label: 'Summary', type: 'result' });
  }

  return nodes.length > 1 ? nodes : [{ label: query.slice(0, 50), type: 'start' }, { label: 'Awaiting data...', type: 'result' }];
}

function extractGraphData(artifact: ArtifactData): { nodes: any[]; connections: any[] } {
  if (artifact.type === 'relationship' && artifact.content.nodes?.length) {
    return { nodes: artifact.content.nodes, connections: artifact.content.connections || [] };
  }

  const nodes: any[] = [];
  const connections: any[] = [];
  const response = artifact.aiResponse || '';

  if (response) {
    const assets = [...new Set((response.match(/\b(?:XAU|BTC|ETH|USD|EUR|GBP|JPY|SPX|DXY|VIX|AAPL|TSLA|NVDA|GOOGL|MSFT|Gold|Bitcoin|Oil)[A-Z]*/gi) || []))];
    assets.slice(0, 6).forEach(a => nodes.push({ label: a, type: 'asset' }));

    const indicators = [...new Set((response.match(/\b(?:RSI|MACD|SMA|EMA|P\/E|ROE|ROA|GDP|CPI|NFP|PMI|ATR|Bollinger|Volume|Market Cap|Revenue|EPS)[^,\n]{0,20}/gi) || []))];
    indicators.slice(0, 6).forEach(ind => nodes.push({ label: ind.trim().slice(0, 30), type: 'indicator' }));

    const events = [...new Set((response.match(/\b(?:Fed|ECB|BOJ|FOMC|inflation|recession|breakout|support|resistance)[^,.\n]{0,30}/gi) || []))];
    events.slice(0, 4).forEach(ev => nodes.push({ label: ev.trim().slice(0, 30), type: 'event' }));

    const decisions = [...new Set((response.match(/(?:buy|sell|hold|Long|Short|strong buy|strong sell)[^,.\n]{0,30}/gi) || []))];
    decisions.slice(0, 3).forEach(d => nodes.push({ label: d.trim().slice(0, 30), type: 'condition' }));
  }

  if (nodes.length === 0 && artifact.type === 'chart_analysis') {
    const { symbol, indicators, signals } = artifact.content;
    nodes.push({ label: symbol || 'Asset', type: 'asset' });
    if (indicators) Object.entries(indicators).forEach(([k, v]) => nodes.push({ label: k, type: 'indicator', value: typeof v === 'number' ? (v as number).toFixed(2) : v }));
    if (signals) (signals as any[]).forEach(s => nodes.push({ label: s.name, type: s.direction === 'bullish' ? 'event' : 'condition' }));
  }

  const assetNodes = nodes.filter(n => n.type === 'asset');
  const others = nodes.filter(n => n.type !== 'asset');
  assetNodes.forEach(asset => {
    others.slice(0, 5).forEach(other => {
      const isNeg = response.includes('bearish') || response.includes('sell') || response.includes('ขาย');
      connections.push({ from: asset.label, to: other.label, type: other.type === 'condition' ? (isNeg ? 'negative' : 'positive') : 'neutral' });
    });
  });

  return { nodes, connections };
}

function flowNodeColor(type: string): string {
  const map: Record<string, string> = { start: 'hsl(210,70%,55%)', decision: 'hsl(30,80%,55%)', process: 'hsl(270,60%,55%)', action: 'hsl(150,60%,45%)', result: 'hsl(190,70%,50%)', condition: 'hsl(50,70%,50%)' };
  return map[type] || 'hsl(0,0%,45%)';
}

function flowNodeIcon(type: string): string {
  const map: Record<string, string> = { start: '▶', decision: '◆', process: '⊕', action: '⚡', result: '◎', condition: '◇' };
  return map[type] || '●';
}

function getNodeAccent(type: string): string {
  const map: Record<string, string> = { asset: 'hsl(210,70%,55%)', indicator: 'hsl(270,60%,55%)', event: 'hsl(30,80%,55%)', condition: 'hsl(50,70%,50%)', source: 'hsl(340,60%,55%)', outcome: 'hsl(190,70%,50%)', decision: 'hsl(150,60%,45%)' };
  return map[type] || 'hsl(0,0%,50%)';
}

function getCellColor(val: any): string {
  if (typeof val === 'number') {
    if (val > 0) return 'text-[hsl(150,60%,50%)]';
    if (val < 0) return 'text-[hsl(0,55%,55%)]';
  }
  if (typeof val === 'string') {
    if (val.includes('Strong Buy') || val.includes('🟢')) return 'text-[hsl(150,60%,50%)] font-medium';
    if (val.includes('Strong Sell') || val.includes('🔴')) return 'text-[hsl(0,55%,55%)] font-medium';
    if (val.includes('Buy') || val.includes('Bullish')) return 'text-[hsl(150,50%,50%)]';
    if (val.includes('Sell') || val.includes('Bearish')) return 'text-[hsl(0,50%,55%)]';
  }
  return 'text-[hsl(0,0%,70%)]';
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
  if (typeof val !== 'number') return 'text-[hsl(0,0%,90%)]';
  if (val > 70) return 'text-[hsl(0,55%,55%)]';
  if (val < 30) return 'text-[hsl(150,60%,50%)]';
  return 'text-[hsl(0,0%,90%)]';
}

export default ArtifactPanel;
