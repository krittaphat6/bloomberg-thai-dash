import { useState, useEffect, useCallback } from 'react';
import { worldMonitorService, type WorldIntelligenceData, type CountryInstabilityScore } from '@/services/WorldMonitorService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, Shield, Globe, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface IntelligencePanelProps {
  className?: string;
}

export const IntelligencePanel = ({ className }: IntelligencePanelProps) => {
  const [intelligence, setIntelligence] = useState<WorldIntelligenceData | null>(null);
  const [ciiScores, setCiiScores] = useState<CountryInstabilityScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(true);
  const [ciiExpanded, setCiiExpanded] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await worldMonitorService.fetchIntelligence();
      setIntelligence(data);
      const scores = worldMonitorService.computeCII(data);
      setCiiScores(scores);
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

  return (
    <div className={cn("flex flex-col bg-[#0a1628] text-white overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1421] border-b border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-bold text-xs font-mono">ABLE INTELLIGENCE</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-6 px-2 text-white/60 hover:text-white">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Data Sources Status */}
          {intelligence && (
            <div className="grid grid-cols-3 gap-1">
              <div className="bg-[#1a2744]/80 rounded p-1.5 text-center">
                <div className="text-[9px] text-white/50">GDACS</div>
                <div className="text-sm font-bold text-red-400">{intelligence.sources.gdacs}</div>
              </div>
              <div className="bg-[#1a2744]/80 rounded p-1.5 text-center">
                <div className="text-[9px] text-white/50">USGS</div>
                <div className="text-sm font-bold text-orange-400">{intelligence.sources.usgs}</div>
              </div>
              <div className="bg-[#1a2744]/80 rounded p-1.5 text-center">
                <div className="text-[9px] text-white/50">NASA</div>
                <div className="text-sm font-bold text-blue-400">{intelligence.sources.eonet}</div>
              </div>
            </div>
          )}

          {/* AI World Brief */}
          <div className="bg-[#1a2744]/60 rounded-lg border border-[#1e3a5f]">
            <button onClick={() => setBriefExpanded(!briefExpanded)} className="w-full flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold text-cyan-400">🌐 WORLD BRIEF (AI)</span>
              </div>
              {briefExpanded ? <ChevronUp className="w-3 h-3 text-white/40" /> : <ChevronDown className="w-3 h-3 text-white/40" />}
            </button>
            {briefExpanded && (
              <div className="px-3 pb-3">
                {intelligence?.worldBrief ? (
                  <div className="text-[10px] text-white/80 leading-relaxed prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{intelligence.worldBrief}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-[10px] text-white/40 animate-pulse">กำลังวิเคราะห์สถานการณ์โลก...</div>
                )}
              </div>
            )}
          </div>

          {/* Country Instability Index */}
          <div className="bg-[#1a2744]/60 rounded-lg border border-[#1e3a5f]">
            <button onClick={() => setCiiExpanded(!ciiExpanded)} className="w-full flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-bold text-red-400">🛡️ COUNTRY INSTABILITY INDEX</span>
              </div>
              {ciiExpanded ? <ChevronUp className="w-3 h-3 text-white/40" /> : <ChevronDown className="w-3 h-3 text-white/40" />}
            </button>
            {ciiExpanded && (
              <div className="px-3 pb-3 space-y-1.5">
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
            )}
          </div>

          {/* Strategic Chokepoints */}
          <div className="bg-[#1a2744]/60 rounded-lg border border-[#1e3a5f] p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] font-bold text-orange-400">⚠️ จุดยุทธศาสตร์</span>
            </div>
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
          </div>

          {/* Layer Stats */}
          <div className="bg-[#1a2744]/60 rounded-lg border border-[#1e3a5f] p-3">
            <div className="text-[11px] font-bold text-white/70 mb-2">📊 ข้อมูลในระบบ</div>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              <div className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                <span className="text-white/60">🎖️ ฐานทหาร</span>
                <span className="text-blue-400">{worldMonitorService.getMilitaryBases().length}</span>
              </div>
              <div className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                <span className="text-white/60">☢️ นิวเคลียร์</span>
                <span className="text-yellow-400">{worldMonitorService.getNuclearFacilities().length}</span>
              </div>
              <div className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                <span className="text-white/60">🔌 สายเคเบิล</span>
                <span className="text-cyan-400">{worldMonitorService.getUnderseaCables().length}</span>
              </div>
              <div className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                <span className="text-white/60">🛢️ ท่อส่ง</span>
                <span className="text-amber-400">{worldMonitorService.getPipelines().length}</span>
              </div>
              <div className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                <span className="text-white/60">🖥️ ดาต้าเซ็นเตอร์</span>
                <span className="text-purple-400">{worldMonitorService.getDatacenters().length}</span>
              </div>
              <div className="flex justify-between p-1 bg-[#0d1421]/60 rounded">
                <span className="text-white/60">⚔️ ความขัดแย้ง</span>
                <span className="text-red-400">{worldMonitorService.getConflictZones().length}</span>
              </div>
            </div>
          </div>

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
