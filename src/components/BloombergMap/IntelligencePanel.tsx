import { useState, useEffect, useCallback } from 'react';
import { worldMonitorService, type WorldIntelligenceData, type CountryInstabilityScore, type TheaterPosture } from '@/services/WorldMonitorService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, Shield, Globe, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Crosshair, Zap, Radio, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface IntelligencePanelProps {
  className?: string;
}

export const IntelligencePanel = ({ className }: IntelligencePanelProps) => {
  const [intelligence, setIntelligence] = useState<WorldIntelligenceData | null>(null);
  const [ciiScores, setCiiScores] = useState<CountryInstabilityScore[]>([]);
  const [theaters, setTheaters] = useState<TheaterPosture[]>([]);
  const [convergences, setConvergences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(true);
  const [ciiExpanded, setCiiExpanded] = useState(true);
  const [theaterExpanded, setTheaterExpanded] = useState(true);
  const [convergenceExpanded, setConvergenceExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worldMonitorService.fetchIntelligence();
      setIntelligence(data);
      setCiiScores(worldMonitorService.computeCII(data));
      setTheaters(worldMonitorService.computeTheaterPosture(data));
      setConvergences(worldMonitorService.detectConvergence(data));
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลข่าวกรองได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') return <TrendingUp className="w-3 h-3 text-red-400" />;
    if (trend === 'falling') return <TrendingDown className="w-3 h-3 text-green-400" />;
    return <Minus className="w-3 h-3 text-yellow-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-500/20';
    if (score >= 60) return 'text-orange-400 bg-orange-500/20';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-green-400 bg-green-500/20';
  };

  const getScoreBar = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTheaterColor = (level: string) => {
    if (level === 'CRITICAL') return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
    if (level === 'ELEVATED') return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
  };

  return (
    <div className={cn("flex flex-col bg-[#0a1628] text-white overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1421] border-b border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-bold text-xs font-mono">ABLE INTELLIGENCE</span>
        </div>
        <div className="flex items-center gap-1">
          {loading && <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />}
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-6 px-2 text-white/60 hover:text-white">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Data Sources Status - Compact */}
          {intelligence && (
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'GDACS', value: intelligence.sources.gdacs, color: 'text-red-400' },
                { label: 'USGS', value: intelligence.sources.usgs, color: 'text-orange-400' },
                { label: 'NASA', value: intelligence.sources.eonet, color: 'text-blue-400' },
                { label: 'GDELT', value: intelligence.sources.gdelt, color: 'text-purple-400' },
                { label: 'FIRMS', value: intelligence.sources.firms, color: 'text-amber-400' },
                { label: 'OUTAGE', value: intelligence.sources.outages, color: 'text-cyan-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#1a2744]/80 rounded p-1.5 text-center">
                  <div className="text-[8px] text-white/50">{s.label}</div>
                  <div className={cn("text-sm font-bold font-mono", s.color)}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* AI World Brief */}
          <CollapsibleSection
            icon={<Globe className="w-3.5 h-3.5 text-cyan-400" />}
            title="🌐 WORLD BRIEF (AI)"
            titleColor="text-cyan-400"
            expanded={briefExpanded}
            onToggle={() => setBriefExpanded(!briefExpanded)}
          >
            {intelligence?.worldBrief ? (
              <div className="text-[10px] text-white/80 leading-relaxed prose prose-invert prose-xs max-w-none">
                <ReactMarkdown>{intelligence.worldBrief}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-[10px] text-white/40 animate-pulse">กำลังวิเคราะห์สถานการณ์โลก...</div>
            )}
          </CollapsibleSection>

          {/* Theater Posture Assessment */}
          <CollapsibleSection
            icon={<Crosshair className="w-3.5 h-3.5 text-amber-400" />}
            title="🎖️ THEATER POSTURE"
            titleColor="text-amber-400"
            expanded={theaterExpanded}
            onToggle={() => setTheaterExpanded(!theaterExpanded)}
          >
            <div className="space-y-1.5">
              {theaters.map((t, i) => {
                const colors = getTheaterColor(t.level);
                return (
                  <div key={i} className={cn("rounded p-2 border", colors.border, colors.bg)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-white/90">{t.name}</span>
                      <Badge className={cn("text-[8px] px-1.5 py-0 h-4 font-mono font-bold", colors.text, colors.bg)}>
                        {t.level}
                      </Badge>
                    </div>
                    <div className="w-full h-1 bg-[#1e3a5f] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", getScoreBar(t.score))} style={{ width: `${t.score}%` }} />
                    </div>
                    <div className="text-[8px] text-white/40 mt-1">{t.triggers[0]}</div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Geographic Convergence */}
          {convergences.length > 0 && (
            <CollapsibleSection
              icon={<Zap className="w-3.5 h-3.5 text-red-400" />}
              title={`⚡ CONVERGENCE (${convergences.length})`}
              titleColor="text-red-400"
              expanded={convergenceExpanded}
              onToggle={() => setConvergenceExpanded(!convergenceExpanded)}
            >
              <div className="space-y-1.5">
                {convergences.slice(0, 5).map((c, i) => (
                  <div key={i} className="bg-red-500/10 rounded p-2 border border-red-500/20">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] font-medium text-white/90">{c.name}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {c.types.map((t: string) => (
                        <Badge key={t} className="text-[7px] px-1 py-0 h-3 bg-red-500/20 text-red-300">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-[8px] text-white/40 mt-1">
                      {c.lat.toFixed(1)}°, {c.lng.toFixed(1)}° • {c.count} events
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Country Instability Index */}
          <CollapsibleSection
            icon={<Shield className="w-3.5 h-3.5 text-red-400" />}
            title="🛡️ COUNTRY INSTABILITY INDEX"
            titleColor="text-red-400"
            expanded={ciiExpanded}
            onToggle={() => setCiiExpanded(!ciiExpanded)}
          >
            <div className="space-y-1.5">
              {ciiScores.slice(0, 15).map(({ country, score, trend, factors }) => (
                <div key={country.code} className="bg-[#0d1421]/60 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{country.flag}</span>
                      <span className="text-[10px] font-medium text-white/90">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getTrendIcon(trend)}
                      <Badge className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", getScoreColor(score))}>
                        {score}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-[#1e3a5f] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", getScoreBar(score))} style={{ width: `${score}%` }} />
                  </div>
                  <div className="text-[8px] text-white/50 mt-1">{factors[0]}</div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Strategic Chokepoints */}
          <CollapsibleSection
            icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
            title="⚠️ จุดยุทธศาสตร์"
            titleColor="text-orange-400"
            expanded={false}
            onToggle={() => {}}
          >
            <div className="space-y-1.5">
              {worldMonitorService.getChokepoints().map(cp => (
                <div key={cp.id} className="flex items-center justify-between bg-[#0d1421]/60 rounded p-1.5">
                  <div>
                    <div className="text-[10px] font-medium text-white/90">{cp.name}</div>
                    <div className="text-[8px] text-white/50">น้ำมัน {cp.oilTransitPercent}% | การค้า {cp.tradeTransitPercent}%</div>
                  </div>
                  <Badge className={cn("text-[8px] px-1 py-0 h-3.5",
                    cp.currentThreat === 'high' ? 'bg-red-500/20 text-red-400' :
                    cp.currentThreat === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                  )}>
                    {cp.currentThreat === 'high' ? '🔴' : cp.currentThreat === 'medium' ? '🟡' : '🟢'}
                  </Badge>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Data Sources Detail */}
          <CollapsibleSection
            icon={<Radio className="w-3.5 h-3.5 text-white/60" />}
            title="📊 ข้อมูลในระบบ"
            titleColor="text-white/70"
            expanded={sourcesExpanded}
            onToggle={() => setSourcesExpanded(!sourcesExpanded)}
          >
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              {[
                { icon: '🎖️', label: 'ฐานทหาร', value: worldMonitorService.getMilitaryBases().length, color: 'text-blue-400' },
                { icon: '☢️', label: 'นิวเคลียร์', value: worldMonitorService.getNuclearFacilities().length, color: 'text-yellow-400' },
                { icon: '🔌', label: 'สายเคเบิล', value: worldMonitorService.getUnderseaCables().length, color: 'text-cyan-400' },
                { icon: '🛢️', label: 'ท่อส่ง', value: worldMonitorService.getPipelines().length, color: 'text-amber-400' },
                { icon: '🖥️', label: 'ดาต้าเซ็นเตอร์', value: worldMonitorService.getDatacenters().length, color: 'text-purple-400' },
                { icon: '⚔️', label: 'ความขัดแย้ง', value: worldMonitorService.getConflictZones().length, color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                  <span className="text-white/60">{item.icon} {item.label}</span>
                  <span className={item.color}>{item.value}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Timestamp */}
          {intelligence && (
            <div className="text-[8px] text-white/30 text-center">
              อัปเดตล่าสุด: {new Date(intelligence.timestamp).toLocaleString('th-TH')}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Reusable collapsible section
function CollapsibleSection({ icon, title, titleColor, expanded: defaultExpanded, onToggle, children }: {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-[#1a2744]/60 rounded-lg border border-[#1e3a5f]">
      <button 
        onClick={() => { setIsExpanded(!isExpanded); onToggle(); }} 
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={cn("text-[11px] font-bold", titleColor)}>{title}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3 text-white/40" /> : <ChevronDown className="w-3 h-3 text-white/40" />}
      </button>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
