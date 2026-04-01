import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  X, Copy, Check, Table2, GitBranch, BarChart3, FileSpreadsheet, TrendingUp,
  Brain, Network, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  FileText, Code, Layers, Link2, BookOpen, Search, Star, StarOff,
  ArrowUpRight, ArrowDownRight, Minus, Hash, Clock, FolderOpen,
  ChevronDown, ChevronRight as ChevronR, Eye, MoreHorizontal,
  PanelRightClose, Vault, StickyNote, Tag, Bookmark
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */
export type ArtifactType = 'table' | 'relationship' | 'chart_analysis' | 'financial_statement' | 'screener_result' | 'quantagent_report' | 'text' | 'code' | 'markdown';
export type ArtifactViewMode = 'reading' | 'graph' | 'source';

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

/* ═══════════════════════════════════════════════════════════════
   OBSIDIAN COLOR PALETTE (HSL tokens)
   ═══════════════════════════════════════════════════════════════ */
const OBS = {
  bg:         'hsl(240, 6%, 10%)',
  bgDeep:     'hsl(240, 7%, 8%)',
  bgSurface:  'hsl(240, 5%, 13%)',
  bgHover:    'hsl(240, 5%, 16%)',
  bgActive:   'hsl(240, 5%, 18%)',
  border:     'hsl(240, 4%, 18%)',
  borderSoft: 'hsl(240, 3%, 14%)',
  text:       'hsl(220, 15%, 85%)',
  textMuted:  'hsl(220, 8%, 55%)',
  textFaint:  'hsl(220, 5%, 38%)',
  accent:     'hsl(254, 80%, 68%)',    // Obsidian purple
  accentDim:  'hsl(254, 40%, 22%)',
  accentGlow: 'hsl(254, 70%, 55%)',
  link:       'hsl(254, 70%, 72%)',
  tag:        'hsl(190, 55%, 55%)',
  green:      'hsl(150, 55%, 48%)',
  red:        'hsl(0, 55%, 55%)',
  orange:     'hsl(30, 75%, 55%)',
  yellow:     'hsl(45, 80%, 55%)',
  cyan:       'hsl(190, 65%, 50%)',
  pink:       'hsl(330, 55%, 60%)',
};

const TYPE_ICON: Record<ArtifactType, { icon: typeof Table2; color: string }> = {
  table:               { icon: Table2, color: OBS.cyan },
  relationship:        { icon: GitBranch, color: OBS.pink },
  chart_analysis:      { icon: BarChart3, color: OBS.orange },
  financial_statement: { icon: FileSpreadsheet, color: OBS.green },
  screener_result:     { icon: TrendingUp, color: OBS.yellow },
  quantagent_report:   { icon: Brain, color: OBS.accent },
  text:                { icon: FileText, color: OBS.textMuted },
  code:                { icon: Code, color: OBS.yellow },
  markdown:            { icon: BookOpen, color: OBS.link },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT — Obsidian Vault Artifact Panel
   ═══════════════════════════════════════════════════════════════ */
const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose, isOpen, artifacts = [], onSelectArtifact }) => {
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('reading');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [starred, setStarred] = useState<Set<string>>(new Set());

  const currentIndex = artifacts.findIndex(a => a.id === artifact?.id);

  const filteredArtifacts = useMemo(() => {
    if (!searchTerm) return artifacts;
    const q = searchTerm.toLowerCase();
    return artifacts.filter(a => a.title.toLowerCase().includes(q) || a.type.includes(q));
  }, [artifacts, searchTerm]);

  const navigateArtifact = (dir: -1 | 1) => {
    const newIdx = currentIndex + dir;
    if (newIdx >= 0 && newIdx < artifacts.length && onSelectArtifact) {
      onSelectArtifact(artifacts[newIdx]);
    }
  };

  const toggleStar = (id: string) => {
    setStarred(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = () => {
    if (!artifact) return;
    let text = '';
    if (['table', 'screener_result', 'financial_statement'].includes(artifact.type)) {
      const { headers, rows, groups } = artifact.content;
      if (groups) text = groups.map((g: any) => `${g.title}\n${g.headers.join('\t')}\n${g.rows.map((r: any[]) => r.join('\t')).join('\n')}`).join('\n\n');
      else if (headers && rows) text = [headers.join('\t'), ...rows.map((r: any[]) => r.join('\t'))].join('\n');
    }
    if (!text && artifact.aiResponse) text = artifact.aiResponse;
    if (!text) text = JSON.stringify(artifact.content, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ─── EMPTY STATE ─── */
  if (!artifact) {
    return (
      <div className="h-full flex flex-col" style={{ background: OBS.bgDeep }}>
        <PanelHeader onClose={onClose} title="Vault" subtitle="No note selected" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-5 max-w-[260px]">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: OBS.accentDim, border: `1px solid ${OBS.accent}30` }}>
              <StickyNote className="w-8 h-8" style={{ color: OBS.accent }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: OBS.text }}>Vault is empty</p>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: OBS.textFaint }}>
                เมื่อคุณสนทนากับ ABLE AI ผลลัพธ์จะถูกบันทึกเป็น Note ใน Vault อัตโนมัติ
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['วิเคราะห์ XAUUSD', 'ดูงบ AAPL', 'QuantAgent'].map((h, i) => (
                <span key={i} className="text-[11px] px-3 py-1.5 rounded-full"
                  style={{ background: OBS.bgSurface, border: `1px solid ${OBS.border}`, color: OBS.textFaint }}>
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const typeInfo = TYPE_ICON[artifact.type] || TYPE_ICON.text;

  return (
    <div className={`h-full flex ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={{ background: OBS.bgDeep }}>

      {/* ─── VAULT SIDEBAR (collapsible) ─── */}
      {showVault && artifacts.length > 0 && (
        <div className="w-[220px] flex-shrink-0 flex flex-col border-r" style={{ background: OBS.bg, borderColor: OBS.borderSoft }}>
          {/* Vault search */}
          <div className="p-2.5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs"
              style={{ background: OBS.bgSurface, border: `1px solid ${OBS.borderSoft}` }}>
              <Search className="w-3 h-3 flex-shrink-0" style={{ color: OBS.textFaint }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search vault..."
                className="bg-transparent outline-none flex-1 text-[11px] placeholder:text-[hsl(220,5%,30%)]"
                style={{ color: OBS.text }}
              />
            </div>
          </div>

          {/* Vault file tree */}
          <ScrollArea className="flex-1">
            <div className="px-1.5 pb-3">
              {/* Starred section */}
              {starred.size > 0 && (
                <VaultSection title="Starred" icon={<Star className="w-3 h-3" style={{ color: OBS.yellow }} />}>
                  {filteredArtifacts.filter(a => starred.has(a.id)).map(a => (
                    <VaultItem
                      key={a.id}
                      artifact={a}
                      isActive={a.id === artifact.id}
                      typeInfo={TYPE_ICON[a.type] || TYPE_ICON.text}
                      onClick={() => onSelectArtifact?.(a)}
                    />
                  ))}
                </VaultSection>
              )}

              {/* All notes */}
              <VaultSection title="All Notes" icon={<FolderOpen className="w-3 h-3" style={{ color: OBS.textFaint }} />} defaultOpen>
                {filteredArtifacts.map(a => (
                  <VaultItem
                    key={a.id}
                    artifact={a}
                    isActive={a.id === artifact.id}
                    typeInfo={TYPE_ICON[a.type] || TYPE_ICON.text}
                    onClick={() => onSelectArtifact?.(a)}
                  />
                ))}
              </VaultSection>
            </div>
          </ScrollArea>

          <div className="px-3 py-2 text-center border-t" style={{ borderColor: OBS.borderSoft }}>
            <span className="text-[10px]" style={{ color: OBS.textFaint }}>
              {artifacts.length} note{artifacts.length !== 1 ? 's' : ''} in vault
            </span>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b"
          style={{ background: OBS.bg, borderColor: OBS.borderSoft }}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Vault toggle */}
            <button onClick={() => setShowVault(!showVault)}
              className="p-1.5 rounded-md transition-colors hover:opacity-80"
              style={{ color: showVault ? OBS.accent : OBS.textFaint }}
              title="Toggle vault sidebar">
              <PanelRightClose className="w-4 h-4" style={{ transform: showVault ? 'scaleX(-1)' : 'none' }} />
            </button>

            {/* Nav arrows */}
            {artifacts.length > 1 && (
              <div className="flex items-center">
                <button onClick={() => navigateArtifact(-1)} disabled={currentIndex <= 0}
                  className="p-1 rounded disabled:opacity-20 transition-colors"
                  style={{ color: OBS.textMuted }}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => navigateArtifact(1)} disabled={currentIndex >= artifacts.length - 1}
                  className="p-1 rounded disabled:opacity-20 transition-colors"
                  style={{ color: OBS.textMuted }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 min-w-0 ml-1">
              <typeInfo.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: typeInfo.color }} />
              <span className="text-[13px] font-medium truncate" style={{ color: OBS.text }}>
                {artifact.title}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {/* View mode tabs - Obsidian style */}
            <div className="flex items-center mr-2 rounded-md overflow-hidden"
              style={{ background: OBS.bgSurface, border: `1px solid ${OBS.borderSoft}` }}>
              {([
                { mode: 'reading' as const, icon: Eye, tip: 'Reading' },
                { mode: 'graph' as const, icon: Network, tip: 'Graph' },
                { mode: 'source' as const, icon: Code, tip: 'Source' },
              ]).map(m => (
                <button key={m.mode} onClick={() => setViewMode(m.mode)}
                  title={m.tip}
                  className="p-1.5 transition-all"
                  style={{
                    color: viewMode === m.mode ? OBS.accent : OBS.textFaint,
                    background: viewMode === m.mode ? OBS.accentDim : 'transparent',
                  }}>
                  <m.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <button onClick={() => toggleStar(artifact.id)}
              className="p-1.5 rounded-md transition-colors" style={{ color: starred.has(artifact.id) ? OBS.yellow : OBS.textFaint }}>
              {starred.has(artifact.id) ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={copyToClipboard}
              className="p-1.5 rounded-md transition-colors" style={{ color: copied ? OBS.green : OBS.textFaint }}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md transition-colors" style={{ color: OBS.textFaint }}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md transition-colors" style={{ color: OBS.textFaint }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <ScrollArea className="flex-1">
          <div className="p-5 max-w-[720px] mx-auto">
            {viewMode === 'reading' && <ReadingView artifact={artifact} />}
            {viewMode === 'graph' && <ObsidianGraphView artifact={artifact} allArtifacts={artifacts} onSelect={onSelectArtifact} />}
            {viewMode === 'source' && <SourceView artifact={artifact} />}
          </div>
        </ScrollArea>

        {/* Backlinks footer — Obsidian signature feature */}
        <BacklinksFooter artifact={artifact} allArtifacts={artifacts} onSelect={onSelectArtifact} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PANEL HEADER (empty state)
   ═══════════════════════════════════════════════════════════════ */
const PanelHeader: React.FC<{ onClose: () => void; title: string; subtitle?: string }> = ({ onClose, title, subtitle }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: OBS.bg, borderColor: OBS.borderSoft }}>
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: OBS.accentDim }}>
        <Vault className="w-4 h-4" style={{ color: OBS.accent }} />
      </div>
      <div>
        <span className="text-sm font-semibold" style={{ color: OBS.text }}>{title}</span>
        {subtitle && <p className="text-[10px]" style={{ color: OBS.textFaint }}>{subtitle}</p>}
      </div>
    </div>
    <button onClick={onClose} className="p-1.5 rounded-md transition-colors" style={{ color: OBS.textFaint }}>
      <X className="w-4 h-4" />
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   VAULT SIDEBAR COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
const VaultSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors"
        style={{ color: OBS.textFaint }}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronR className="w-3 h-3" />}
        {icon}
        <span>{title}</span>
      </button>
      {open && <div className="ml-1">{children}</div>}
    </div>
  );
};

const VaultItem: React.FC<{ artifact: ArtifactData; isActive: boolean; typeInfo: { icon: typeof Table2; color: string }; onClick: () => void }> = ({ artifact, isActive, typeInfo, onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-left transition-all group"
    style={{
      background: isActive ? OBS.bgActive : 'transparent',
      color: isActive ? OBS.text : OBS.textMuted,
    }}>
    <typeInfo.icon className="w-3 h-3 flex-shrink-0" style={{ color: typeInfo.color }} />
    <span className="text-[11px] truncate flex-1">{artifact.title}</span>
    <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: OBS.textFaint }}>
      {new Date(artifact.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
    </span>
  </button>
);

/* ═══════════════════════════════════════════════════════════════
   READING VIEW — Obsidian's primary note view
   ═══════════════════════════════════════════════════════════════ */
const ReadingView: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  return (
    <div className="space-y-6">
      {/* Note metadata (Obsidian YAML frontmatter style) */}
      <div className="rounded-lg p-4" style={{ background: OBS.bgSurface, border: `1px solid ${OBS.borderSoft}` }}>
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[11px]">
          <MetaRow label="type" value={artifact.type} color={TYPE_ICON[artifact.type]?.color} />
          <MetaRow label="created" value={new Date(artifact.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} />
          {artifact.version && <MetaRow label="version" value={`v${artifact.version}`} />}
          {artifact.source && <MetaRow label="source" value={artifact.source} />}
        </div>
        {artifact.linkedNotes && artifact.linkedNotes.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: OBS.borderSoft }}>
            <Tag className="w-3 h-3" style={{ color: OBS.tag }} />
            <div className="flex gap-1.5 flex-wrap">
              {artifact.linkedNotes.map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${OBS.tag}15`, color: OBS.tag, border: `1px solid ${OBS.tag}25` }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content renderer based on type */}
      <NoteContent artifact={artifact} />
    </div>
  );
};

const MetaRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span style={{ color: OBS.textFaint }}>{label}:</span>
    <span className="font-mono" style={{ color: color || OBS.text }}>{value}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   NOTE CONTENT — Smart renderer per type
   ═══════════════════════════════════════════════════════════════ */
const NoteContent: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  if (artifact.type === 'quantagent_report') return <QuantAgentNote content={artifact.content} />;
  if (artifact.type === 'chart_analysis') return <ChartNote content={artifact.content} />;
  if (artifact.type === 'relationship') return <RelationshipNote content={artifact.content} />;
  if (['table', 'screener_result', 'financial_statement'].includes(artifact.type)) return <TableNote artifact={artifact} />;
  if (artifact.aiResponse) return <MarkdownNote text={artifact.aiResponse} />;
  return <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: OBS.textMuted }}>{JSON.stringify(artifact.content, null, 2)}</pre>;
};

/* ─── Markdown Note ─── */
const MarkdownNote: React.FC<{ text: string }> = ({ text }) => {
  const sections = useMemo(() => {
    const lines = text.split('\n');
    const result: Array<{ type: 'h1' | 'h2' | 'h3' | 'bullet' | 'divider' | 'callout' | 'text'; content: string }> = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t === '---') { result.push({ type: 'divider', content: '' }); continue; }
      if (/^#{1}\s/.test(t)) { result.push({ type: 'h1', content: t.replace(/^#+\s/, '') }); continue; }
      if (/^#{2}\s/.test(t)) { result.push({ type: 'h2', content: t.replace(/^#+\s/, '') }); continue; }
      if (/^#{3}\s/.test(t) || /^\*\*[^*]+\*\*$/.test(t)) { result.push({ type: 'h3', content: t.replace(/^#+\s/, '').replace(/\*\*/g, '') }); continue; }
      if (/^>\s/.test(t)) { result.push({ type: 'callout', content: t.replace(/^>\s?/, '') }); continue; }
      if (/^[-•*]\s/.test(t) || /^\d+[.)]\s/.test(t)) { result.push({ type: 'bullet', content: t.replace(/^[-•*\d.)]+\s/, '') }); continue; }
      result.push({ type: 'text', content: t });
    }
    return result;
  }, [text]);

  return (
    <div className="obsidian-note space-y-2.5">
      {sections.map((s, i) => {
        if (s.type === 'divider') return <div key={i} className="my-4" style={{ borderTop: `1px solid ${OBS.border}` }} />;
        if (s.type === 'h1') return <h1 key={i} className="text-xl font-bold mt-6 mb-2" style={{ color: OBS.text }}>{renderInline(s.content)}</h1>;
        if (s.type === 'h2') return <h2 key={i} className="text-base font-bold mt-5 mb-1.5" style={{ color: OBS.text }}>{renderInline(s.content)}</h2>;
        if (s.type === 'h3') return <h3 key={i} className="text-sm font-semibold mt-4 mb-1" style={{ color: OBS.text }}>{renderInline(s.content)}</h3>;
        if (s.type === 'callout') return (
          <div key={i} className="flex gap-2.5 px-4 py-3 rounded-lg my-2"
            style={{ background: `${OBS.accent}08`, borderLeft: `3px solid ${OBS.accent}` }}>
            <p className="text-[13px] leading-relaxed" style={{ color: OBS.textMuted }}>{renderInline(s.content)}</p>
          </div>
        );
        if (s.type === 'bullet') return (
          <div key={i} className="flex gap-2.5 text-[13px] leading-relaxed ml-3">
            <span className="mt-0.5 flex-shrink-0" style={{ color: OBS.accent }}>•</span>
            <span style={{ color: OBS.textMuted }}>{renderInline(s.content)}</span>
          </div>
        );
        return <p key={i} className="text-[13px] leading-[1.8]" style={{ color: OBS.textMuted }}>{renderInline(s.content)}</p>;
      })}
    </div>
  );
};

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, `code`, [[links]]
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\[\[[^\]]+\]\])/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={j} style={{ color: OBS.text }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={j} className="text-[12px] font-mono px-1.5 py-0.5 rounded" style={{ background: OBS.bgSurface, color: OBS.orange }}>{part.slice(1, -1)}</code>;
    if (part.startsWith('[[') && part.endsWith(']]'))
      return <span key={j} className="cursor-pointer underline decoration-dotted underline-offset-2" style={{ color: OBS.link }}>{part.slice(2, -2)}</span>;
    return <span key={j}>{part}</span>;
  });
}

/* ─── Table Note ─── */
const TableNote: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => {
  const { headers, rows, groups } = artifact.content;
  if (groups?.length) {
    return (
      <div className="space-y-6">
        {groups.map((g: any, gi: number) => (
          <div key={gi}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: OBS.text }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: OBS.accent }} />
              {g.title}
              <span className="text-[10px] font-normal" style={{ color: OBS.textFaint }}>({g.rows?.length || 0})</span>
            </h3>
            <ObsidianTable headers={g.headers} rows={g.rows} />
          </div>
        ))}
      </div>
    );
  }
  if (headers && rows) return <ObsidianTable headers={headers} rows={rows} />;
  return <p className="text-sm" style={{ color: OBS.textFaint }}>No table data.</p>;
};

const ObsidianTable: React.FC<{ headers: string[]; rows: any[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${OBS.borderSoft}` }}>
    <table className="w-full text-[12px]">
      <thead>
        <tr style={{ borderBottom: `2px solid ${OBS.accent}30`, background: OBS.bgSurface }}>
          {headers?.map((h, i) => (
            <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: OBS.textMuted }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows?.map((row, ri) => (
          <tr key={ri} className="transition-colors"
            style={{ borderBottom: `1px solid ${OBS.borderSoft}` }}
            onMouseEnter={e => (e.currentTarget.style.background = OBS.bgHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {row.map((cell, ci) => (
              <td key={ci} className={`px-3 py-2 whitespace-nowrap font-mono ${getCellColor(cell)}`}>{formatCell(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ─── QuantAgent Note ─── */
const QuantAgentNote: React.FC<{ content: any }> = ({ content }) => {
  const { agents, finalDecision, symbol, timeframe } = content;
  const signalColor = (sig: string) => {
    if (sig?.includes('BUY')) return OBS.green;
    if (sig?.includes('SELL')) return OBS.red;
    return OBS.orange;
  };
  const color = signalColor(finalDecision?.signal);

  return (
    <div className="space-y-5">
      {/* Signal callout */}
      <div className="rounded-lg p-5" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: OBS.text }}>{symbol ?? 'Unknown'}</h2>
            <span className="text-[11px]" style={{ color: OBS.textFaint }}>{timeframe ?? '1H'} · Multi-Agent</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono" style={{ color }}>{finalDecision?.signal ?? 'N/A'}</div>
            <ConfBar value={finalDecision?.confidence ?? 0} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <SmallStat label="Confidence" value={`${finalDecision?.confidence ?? 0}%`} />
          <SmallStat label="Target" value={finalDecision?.priceTarget?.toFixed(4) ?? '—'} color={OBS.green} />
          <SmallStat label="Stop Loss" value={finalDecision?.stopLoss?.toFixed(4) ?? '—'} color={OBS.red} />
        </div>
      </div>

      {/* Agent cards */}
      {[
        { label: 'Indicator Agent', icon: '📊', data: agents?.indicator },
        { label: 'Pattern Agent', icon: '🔍', data: agents?.pattern },
        { label: 'Trend Agent', icon: '📈', data: agents?.trend },
        { label: 'Risk Agent', icon: '🛡️', data: agents?.risk },
      ].map(a => a.data && (
        <div key={a.label} className="rounded-lg p-4" style={{ background: OBS.bgSurface, border: `1px solid ${OBS.borderSoft}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: OBS.text }}>{a.icon} {a.label}</span>
            <span className="text-[11px] font-mono font-bold" style={{ color: signalColor(a.data.signal) }}>
              {a.data.signal} · {a.data.confidence}%
            </span>
          </div>
          <ConfBar value={a.data.confidence} />
          {a.data.summary && <p className="text-[11px] mt-2 leading-relaxed" style={{ color: OBS.textFaint }}>{a.data.summary}</p>}
        </div>
      ))}

      {finalDecision?.rationale && (
        <div className="px-4 py-3 rounded-lg" style={{ background: `${OBS.accent}06`, borderLeft: `3px solid ${OBS.accent}` }}>
          <p className="text-[12px] leading-relaxed" style={{ color: OBS.textMuted }}>{finalDecision.rationale}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Chart Analysis Note ─── */
const ChartNote: React.FC<{ content: any }> = ({ content }) => {
  const { symbol, timeframe, indicators, signals, levels, analysis } = content;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: OBS.accentDim }}>
          <BarChart3 className="w-5 h-5" style={{ color: OBS.accent }} />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: OBS.text }}>{symbol || 'Unknown'}</h2>
          <span className="text-[11px]" style={{ color: OBS.textFaint }}>{timeframe || 'Daily'} · Technical Analysis</span>
        </div>
      </div>

      {indicators && (
        <NoteSection title="Indicators">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(indicators).map(([k, v]: [string, any]) => (
              <div key={k} className="p-3 rounded-lg" style={{ background: OBS.bgSurface, border: `1px solid ${OBS.borderSoft}` }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: OBS.textFaint }}>{k}</div>
                <div className={`text-sm font-mono font-bold mt-0.5 ${getValueColor(v)}`}>
                  {typeof v === 'number' ? v.toFixed(2) : String(v)}
                </div>
              </div>
            ))}
          </div>
        </NoteSection>
      )}

      {signals?.length > 0 && (
        <NoteSection title="Signals">
          <div className="space-y-1.5">
            {signals.map((sig: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: OBS.bgSurface }}>
                {sig.direction === 'bullish' ? <ArrowUpRight className="w-4 h-4" style={{ color: OBS.green }} />
                  : sig.direction === 'bearish' ? <ArrowDownRight className="w-4 h-4" style={{ color: OBS.red }} />
                  : <Minus className="w-4 h-4" style={{ color: OBS.textFaint }} />}
                <span className="text-xs font-medium" style={{ color: OBS.text }}>{sig.name}</span>
                {sig.detail && <span className="text-[11px] ml-auto" style={{ color: OBS.textFaint }}>{sig.detail}</span>}
              </div>
            ))}
          </div>
        </NoteSection>
      )}

      {levels && (
        <NoteSection title="Key Levels">
          {Object.entries(levels).map(([label, price]: [string, any]) => (
            <div key={label} className="flex justify-between items-center px-3 py-2 rounded-md" style={{ background: OBS.bgSurface }}>
              <span className="text-xs" style={{ color: OBS.textMuted }}>{label}</span>
              <span className="text-xs font-mono font-medium" style={{ color: OBS.text }}>{typeof price === 'number' ? price.toFixed(2) : price}</span>
            </div>
          ))}
        </NoteSection>
      )}

      {analysis && (
        <div className="px-4 py-3 rounded-lg" style={{ background: `${OBS.cyan}06`, borderLeft: `3px solid ${OBS.cyan}` }}>
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: OBS.textMuted }}>{analysis}</p>
        </div>
      )}
    </div>
  );
};

/* ─── Relationship Note ─── */
const RelationshipNote: React.FC<{ content: any }> = ({ content }) => {
  const { nodes, connections, summary } = content;
  return (
    <div className="space-y-5">
      {summary && (
        <div className="px-4 py-3 rounded-lg" style={{ background: `${OBS.accent}06`, borderLeft: `3px solid ${OBS.accent}` }}>
          <p className="text-[13px] leading-relaxed" style={{ color: OBS.textMuted }}>{summary}</p>
        </div>
      )}
      {nodes && (
        <div className="flex flex-wrap gap-2">
          {nodes.map((node: any, i: number) => {
            const c = getNodeAccent(node.type);
            return (
              <div key={i} className="px-3 py-2 rounded-lg text-xs" style={{ background: `${c}10`, border: `1px solid ${c}25`, color: c }}>
                <div className="font-medium">{node.label}</div>
                {node.detail && <div className="text-[10px] opacity-60 mt-0.5">{node.detail}</div>}
              </div>
            );
          })}
        </div>
      )}
      {connections?.length > 0 && (
        <NoteSection title="Connections">
          <div className="space-y-1">
            {connections.map((conn: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-md" style={{ background: OBS.bgSurface }}>
                <span style={{ color: OBS.text }}>{conn.from}</span>
                <span style={{ color: conn.type === 'positive' ? OBS.green : conn.type === 'negative' ? OBS.red : OBS.textFaint }}>→</span>
                <span style={{ color: OBS.text }}>{conn.to}</span>
                {conn.label && <span className="ml-auto text-[10px]" style={{ color: OBS.textFaint }}>({conn.label})</span>}
              </div>
            ))}
          </div>
        </NoteSection>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   OBSIDIAN GRAPH VIEW — Force-directed knowledge graph
   ═══════════════════════════════════════════════════════════════ */
const ObsidianGraphView: React.FC<{
  artifact: ArtifactData;
  allArtifacts: ArtifactData[];
  onSelect?: (a: ArtifactData) => void;
}> = ({ artifact, allArtifacts, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  interface GraphNode {
    id: string;
    label: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: string;
    color: string;
    radius: number;
    isCurrent: boolean;
    artifactId?: string;
  }
  interface GraphLink { source: string; target: string; }

  // Build graph data
  useEffect(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const seen = new Set<string>();

    allArtifacts.forEach((a, i) => {
      const id = `note-${a.id}`;
      if (!seen.has(id)) {
        seen.add(id);
        const angle = (i / Math.max(allArtifacts.length, 1)) * Math.PI * 2;
        const r = 120 + Math.random() * 60;
        nodes.push({
          id, label: a.title.slice(0, 20), x: 300 + Math.cos(angle) * r, y: 200 + Math.sin(angle) * r,
          vx: 0, vy: 0, type: a.type, color: TYPE_ICON[a.type]?.color || OBS.textMuted,
          radius: a.id === artifact.id ? 8 : 5, isCurrent: a.id === artifact.id, artifactId: a.id,
        });
      }

      // Extract tags/linked notes
      a.linkedNotes?.forEach(tag => {
        const tagId = `tag-${tag}`;
        if (!seen.has(tagId)) {
          seen.add(tagId);
          nodes.push({
            id: tagId, label: `#${tag}`, x: 300 + (Math.random() - 0.5) * 250, y: 200 + (Math.random() - 0.5) * 180,
            vx: 0, vy: 0, type: 'tag', color: OBS.tag, radius: 4, isCurrent: false,
          });
        }
        links.push({ source: id, target: tagId });
      });
    });

    // Connect sequential notes
    for (let i = 1; i < allArtifacts.length; i++) {
      links.push({ source: `note-${allArtifacts[i - 1].id}`, target: `note-${allArtifacts[i].id}` });
    }

    nodesRef.current = nodes;
    linksRef.current = links;
  }, [allArtifacts, artifact.id]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Simple force simulation
      const centerX = W / 2, centerY = H / 2;
      for (const n of nodes) {
        // Center gravity
        n.vx += (centerX - n.x) * 0.001;
        n.vy += (centerY - n.y) * 0.001;
        // Repulsion
        for (const m of nodes) {
          if (m.id === n.id) continue;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 150) {
            const force = 2 / (dist * dist);
            n.vx += dx * force;
            n.vy += dy * force;
          }
        }
      }
      // Attraction along links
      for (const l of links) {
        const s = nodes.find(n => n.id === l.source);
        const t = nodes.find(n => n.id === l.target);
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * 0.003;
        s.vx += dx / dist * force;
        s.vy += dy / dist * force;
        t.vx -= dx / dist * force;
        t.vy -= dy / dist * force;
      }
      // Apply velocity
      for (const n of nodes) {
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Dot grid
      ctx.fillStyle = 'hsla(254, 30%, 40%, 0.08)';
      for (let x = 0; x < W; x += 20) {
        for (let y = 0; y < H; y += 20) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Links
      for (const l of links) {
        const s = nodes.find(n => n.id === l.source);
        const t = nodes.find(n => n.id === l.target);
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'hsla(254, 30%, 50%, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const isHov = hoveredNode === n.id;

        // Glow for current
        if (n.isCurrent) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = `${OBS.accent}18`;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, isHov ? n.radius + 2 : n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.isCurrent ? OBS.accent : n.color;
        ctx.fill();

        // Label
        if (n.isCurrent || isHov || n.radius > 5) {
          ctx.font = `${n.isCurrent ? '600 11px' : '400 10px'} system-ui, sans-serif`;
          ctx.fillStyle = n.isCurrent ? OBS.text : OBS.textMuted;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + n.radius + 14);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [hoveredNode]);

  // Mouse hover detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const nodes = nodesRef.current;
    let found: string | null = null;
    for (const n of nodes) {
      const dx = mx - n.x, dy = my - n.y;
      if (dx * dx + dy * dy < (n.radius + 5) * (n.radius + 5)) {
        found = n.id;
        break;
      }
    }
    setHoveredNode(found);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const n of nodesRef.current) {
      const dx = mx - n.x, dy = my - n.y;
      if (dx * dx + dy * dy < (n.radius + 5) * (n.radius + 5) && n.artifactId) {
        const a = allArtifacts.find(a => a.id === n.artifactId);
        if (a && onSelect) onSelect(a);
        break;
      }
    }
  }, [allArtifacts, onSelect]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Network className="w-4 h-4" style={{ color: OBS.accent }} />
        <span className="text-sm font-semibold" style={{ color: OBS.text }}>Graph View</span>
        <span className="text-[10px] ml-auto" style={{ color: OBS.textFaint }}>
          {nodesRef.current.length} nodes · {linksRef.current.length} links
        </span>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${OBS.borderSoft}`, background: OBS.bgDeep }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full cursor-crosshair"
          style={{ height: 400 }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px]" style={{ color: OBS.textFaint }}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: OBS.accent }} /> Current</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: OBS.tag }} /> Tag</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: OBS.cyan }} /> Note</span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SOURCE VIEW — Raw JSON
   ═══════════════════════════════════════════════════════════════ */
const SourceView: React.FC<{ artifact: ArtifactData }> = ({ artifact }) => (
  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${OBS.borderSoft}` }}>
    <div className="flex items-center gap-2 px-4 py-2" style={{ background: OBS.bgSurface, borderBottom: `1px solid ${OBS.borderSoft}` }}>
      <Code className="w-3.5 h-3.5" style={{ color: OBS.orange }} />
      <span className="text-[11px]" style={{ color: OBS.textFaint }}>artifact.json</span>
    </div>
    <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap" style={{ color: OBS.textMuted, background: OBS.bgDeep }}>
      {JSON.stringify(artifact.content, null, 2)}
    </pre>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   BACKLINKS FOOTER — Obsidian's signature feature
   ═══════════════════════════════════════════════════════════════ */
const BacklinksFooter: React.FC<{
  artifact: ArtifactData;
  allArtifacts: ArtifactData[];
  onSelect?: (a: ArtifactData) => void;
}> = ({ artifact, allArtifacts, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  // Find backlinks: other artifacts that share tags/linked notes
  const backlinks = useMemo(() => {
    if (!artifact.linkedNotes?.length) return allArtifacts.filter(a => a.id !== artifact.id).slice(-3);
    return allArtifacts.filter(a => a.id !== artifact.id && a.linkedNotes?.some(t => artifact.linkedNotes?.includes(t)));
  }, [artifact, allArtifacts]);

  if (backlinks.length === 0 && allArtifacts.length <= 1) return null;

  return (
    <div className="border-t" style={{ background: OBS.bg, borderColor: OBS.borderSoft }}>
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors"
        style={{ color: OBS.textFaint }}>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronR className="w-3 h-3" />}
        <Link2 className="w-3 h-3" style={{ color: OBS.accent }} />
        <span className="text-[11px] font-medium">Backlinks</span>
        <span className="text-[10px] ml-1">({backlinks.length})</span>
      </button>
      {expanded && backlinks.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          {backlinks.map(bl => {
            const info = TYPE_ICON[bl.type] || TYPE_ICON.text;
            return (
              <button key={bl.id} onClick={() => onSelect?.(bl)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors text-xs"
                style={{ color: OBS.textMuted }}
                onMouseEnter={e => (e.currentTarget.style.background = OBS.bgHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <info.icon className="w-3 h-3 flex-shrink-0" style={{ color: info.color }} />
                <span className="truncate flex-1">{bl.title}</span>
                <span className="text-[9px]" style={{ color: OBS.textFaint }}>
                  {new Date(bl.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */
const NoteSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-[10px] uppercase tracking-widest font-semibold mb-2.5" style={{ color: OBS.textFaint }}>{title}</h4>
    {children}
  </div>
);

const ConfBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full rounded-full h-1 mt-1 overflow-hidden" style={{ background: `${OBS.textFaint}20` }}>
    <div className="h-1 rounded-full transition-all duration-500"
      style={{ width: `${Math.min(100, value)}%`, background: value > 65 ? OBS.green : value > 40 ? OBS.orange : OBS.red }} />
  </div>
);

const SmallStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="p-2.5 rounded-lg text-center" style={{ background: OBS.bgSurface, border: `1px solid ${OBS.borderSoft}` }}>
    <div className="text-[9px] uppercase tracking-wider" style={{ color: OBS.textFaint }}>{label}</div>
    <div className="text-xs font-mono font-bold mt-0.5" style={{ color: color || OBS.text }}>{value}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */
function getNodeAccent(type: string): string {
  const map: Record<string, string> = {
    asset: OBS.cyan, indicator: OBS.accent, event: OBS.orange,
    condition: OBS.yellow, source: OBS.pink, outcome: OBS.cyan, decision: OBS.green,
  };
  return map[type] || OBS.textMuted;
}

function getCellColor(val: any): string {
  if (typeof val === 'number') {
    if (val > 0) return `text-[hsl(150,55%,48%)]`;
    if (val < 0) return `text-[hsl(0,55%,55%)]`;
  }
  if (typeof val === 'string') {
    if (val.includes('Strong Buy') || val.includes('🟢')) return 'text-[hsl(150,55%,48%)] font-medium';
    if (val.includes('Strong Sell') || val.includes('🔴')) return 'text-[hsl(0,55%,55%)] font-medium';
    if (val.includes('Buy') || val.includes('Bullish')) return 'text-[hsl(150,45%,48%)]';
    if (val.includes('Sell') || val.includes('Bearish')) return 'text-[hsl(0,45%,55%)]';
  }
  return `text-[hsl(220,8%,55%)]`;
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
  if (typeof val !== 'number') return '';
  if (val > 70) return 'text-[hsl(0,55%,55%)]';
  if (val < 30) return 'text-[hsl(150,55%,48%)]';
  return '';
}

export default ArtifactPanel;
