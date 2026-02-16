import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, Shield, AlertTriangle, TrendingUp, TrendingDown, Activity, 
  Brain, Crosshair, Flame, Radio, BarChart3, Newspaper, MapPin,
  ChevronDown, ChevronUp, RefreshCw, Clock, Zap, Target, 
  Building2, Anchor, Cpu, Wifi, Eye, Layers, Search, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BloombergMap } from '@/components/BloombergMap';
import { useNavigate } from 'react-router-dom';

// Types
interface WorldIntelData {
  disasters: any[];
  earthquakes: any[];
  eonet: any[];
  protests: any[];
  fires: any[];
  outages: any[];
  worldBrief: string;
  timestamp: string;
  sources: Record<string, number>;
}

interface TheaterPosture {
  name: string;
  region: string;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  score: number;
  signals: string[];
}

interface CIIEntry {
  country: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  signals: number;
}

// ============= THEATER POSTURE CALCULATOR =============
const THEATERS: { name: string; region: string; countries: string[]; baseRisk: number }[] = [
  { name: 'Iron Theater', region: 'Middle East', countries: ['Israel', 'Iran', 'Lebanon', 'Syria', 'Iraq'], baseRisk: 35 },
  { name: 'Taiwan Strait', region: 'Asia-Pacific', countries: ['China', 'Taiwan', 'Japan', 'Philippines'], baseRisk: 25 },
  { name: 'Eastern Front', region: 'Europe', countries: ['Ukraine', 'Russia', 'Belarus', 'Poland'], baseRisk: 40 },
  { name: 'Persian Gulf', region: 'MENA', countries: ['Iran', 'Saudi Arabia', 'UAE', 'Qatar', 'Bahrain'], baseRisk: 20 },
  { name: 'Korean DMZ', region: 'Asia', countries: ['North Korea', 'South Korea', 'Japan'], baseRisk: 15 },
  { name: 'Horn of Africa', region: 'Africa', countries: ['Ethiopia', 'Somalia', 'Eritrea', 'Sudan'], baseRisk: 30 },
  { name: 'South China Sea', region: 'SE Asia', countries: ['China', 'Vietnam', 'Philippines', 'Malaysia'], baseRisk: 20 },
  { name: 'Sahel Corridor', region: 'W. Africa', countries: ['Mali', 'Niger', 'Burkina Faso', 'Nigeria'], baseRisk: 25 },
  { name: 'Red Sea / Bab el-Mandeb', region: 'Maritime', countries: ['Yemen', 'Djibouti', 'Eritrea'], baseRisk: 30 },
];

function computeTheaters(data: WorldIntelData): TheaterPosture[] {
  return THEATERS.map(t => {
    let score = t.baseRisk;
    const signals: string[] = [];

    const disasterHits = data.disasters.filter(d => t.countries.some(c => d.country?.includes(c)));
    if (disasterHits.length > 0) { score += disasterHits.length * 5; signals.push(`${disasterHits.length} disasters`); }

    const quakeHits = data.earthquakes.filter(e => {
      const place = e.name || '';
      return t.countries.some(c => place.includes(c));
    });
    if (quakeHits.length > 0) { score += quakeHits.length * 3; signals.push(`${quakeHits.length} quakes`); }

    const protestHits = data.protests.filter(p => {
      const name = p.name || '';
      return t.countries.some(c => name.includes(c));
    });
    if (protestHits.length > 0) { score += protestHits.length * 4; signals.push(`${protestHits.length} protests`); }

    const status: TheaterPosture['status'] = score >= 60 ? 'CRITICAL' : score >= 35 ? 'ELEVATED' : 'NORMAL';
    return { name: t.name, region: t.region, status, score: Math.min(score, 100), signals };
  });
}

// ============= CII CALCULATOR =============
const CII_COUNTRIES: { country: string; baseRisk: number }[] = [
  { country: 'Ukraine', baseRisk: 75 }, { country: 'Russia', baseRisk: 45 },
  { country: 'Israel', baseRisk: 55 }, { country: 'Iran', baseRisk: 50 },
  { country: 'China', baseRisk: 30 }, { country: 'North Korea', baseRisk: 60 },
  { country: 'Saudi Arabia', baseRisk: 25 }, { country: 'Turkey', baseRisk: 35 },
  { country: 'India', baseRisk: 25 }, { country: 'Pakistan', baseRisk: 40 },
  { country: 'Myanmar', baseRisk: 55 }, { country: 'Syria', baseRisk: 70 },
  { country: 'Yemen', baseRisk: 65 }, { country: 'Sudan', baseRisk: 60 },
  { country: 'Somalia', baseRisk: 65 }, { country: 'Libya', baseRisk: 55 },
  { country: 'Iraq', baseRisk: 50 }, { country: 'Afghanistan', baseRisk: 70 },
  { country: 'Nigeria', baseRisk: 40 }, { country: 'Ethiopia', baseRisk: 45 },
  { country: 'Taiwan', baseRisk: 20 }, { country: 'Lebanon', baseRisk: 55 },
];

function computeCII(data: WorldIntelData): CIIEntry[] {
  return CII_COUNTRIES.map(c => {
    let score = c.baseRisk;
    let sigCount = 0;

    data.disasters.forEach(d => { if (d.country?.includes(c.country)) { score += 5; sigCount++; } });
    data.protests.forEach(p => { if (p.name?.includes(c.country)) { score += 3; sigCount++; } });
    data.fires.forEach(f => { sigCount += 0; }); // fires don't have country field easily

    return {
      country: c.country,
      score: Math.min(Math.round(score), 100),
      trend: (sigCount > 2 ? 'up' : sigCount === 0 ? 'down' : 'stable') as CIIEntry['trend'],
      signals: sigCount,
    };
  }).sort((a, b) => b.score - a.score);
}

// ============= STRATEGIC RISK GAUGE =============
function computeStrategicRisk(data: WorldIntelData): number {
  const total = data.disasters.length * 5 + data.earthquakes.length * 3 + 
    data.protests.length * 4 + data.fires.length * 1 + data.outages.length * 6;
  return Math.min(Math.round(total / 3), 100);
}

// ============= PANEL COMPONENT =============
const Panel = ({ title, icon: Icon, badge, badgeColor = 'bg-cyan-500/20 text-cyan-400', live, children, className, compact }: {
  title: string;
  icon?: any;
  badge?: string;
  badgeColor?: string;
  live?: boolean;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) => (
  <div className={cn(
    "bg-[#0c1829] border border-[#1e3a5f]/60 rounded-sm flex flex-col overflow-hidden",
    className
  )}>
    <div className="flex items-center justify-between px-2 py-1 bg-[#0a1420] border-b border-[#1e3a5f]/40 shrink-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-cyan-400" />}
        <span className="text-[10px] font-bold text-white/90 tracking-wider uppercase">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {live && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] text-green-400 font-mono">LIVE</span>
          </div>
        )}
        {badge && (
          <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-mono", badgeColor)}>{badge}</span>
        )}
      </div>
    </div>
    <div className={cn("flex-1 overflow-y-auto overflow-x-hidden", compact ? "p-1" : "p-2")}>
      {children}
    </div>
  </div>
);

// ============= MAIN COMPONENT =============
export const WorldMonitorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<WorldIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [theaters, setTheaters] = useState<TheaterPosture[]>([]);
  const [cii, setCII] = useState<CIIEntry[]>([]);
  const [strategicRisk, setStrategicRisk] = useState(0);
  const [timeFilter, setTimeFilter] = useState<string>('7d');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.functions.invoke('world-intelligence', {
        body: { action: 'all' }
      });
      if (error) throw error;
      setData(result);
      setTheaters(computeTheaters(result));
      setCII(computeCII(result));
      setStrategicRisk(computeStrategicRisk(result));
      setLastUpdate(new Date().toLocaleTimeString('th-TH'));
    } catch (err) {
      console.error('Failed to fetch world intelligence:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalEvents = data ? Object.values(data.sources || {}).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="h-screen flex flex-col bg-[#060d18] text-white overflow-hidden font-mono">
      {/* ====== TOP BAR ====== */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#080f1e] border-b border-[#1e3a5f]/50 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white/50 hover:text-white h-6 px-1.5">
            <ArrowLeft className="w-3 h-3" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-cyan-400 tracking-wider">MONITOR</span>
            <span className="text-[9px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">v4.0</span>
          </div>
          
          {/* Time filter */}
          <div className="flex items-center gap-0.5 bg-[#0a1628] rounded p-0.5 border border-[#1e3a5f]/40 ml-2">
            {['1h', '24h', '48h', '7d', 'ALL'].map(t => (
              <button key={t} onClick={() => setTimeFilter(t)}
                className={cn("px-2 py-0.5 text-[9px] rounded transition-colors",
                  timeFilter === t ? "bg-cyan-500/20 text-cyan-400" : "text-white/40 hover:text-white/60"
                )}>{t}</button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-[9px] font-bold">LIVE</span>
          </div>

          {data && (
            <Badge className="text-[8px] bg-orange-500/20 text-orange-400 border-orange-500/30 ml-1">
              DEFCON: {strategicRisk > 70 ? '2' : strategicRisk > 40 ? '3' : '4'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[9px] text-white/50">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC+7
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}
            className="h-6 px-2 text-[9px] text-white/50 hover:text-white">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
          <span className="text-[9px] text-cyan-400 font-bold tracking-wider">ABLE WORLD MONITOR</span>
        </div>
      </div>

      {/* ====== CONTENT ====== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* MAP SECTION */}
        <div className={cn("relative border-b border-[#1e3a5f]/50 transition-all duration-300 shrink-0",
          mapCollapsed ? "h-8" : "h-[42%]"
        )}>
          {mapCollapsed ? (
            <button onClick={() => setMapCollapsed(false)}
              className="w-full h-full flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0c1c30] transition-colors text-[10px] text-white/60">
              <ChevronDown className="w-3 h-3" /> EXPAND MAP <ChevronDown className="w-3 h-3" />
            </button>
          ) : (
            <>
              <BloombergMap isFullscreen={false} />
              <button onClick={() => setMapCollapsed(true)}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-[#0a1628]/90 border border-[#1e3a5f]/50 rounded px-3 py-0.5 text-[9px] text-white/60 hover:text-white z-[1000] flex items-center gap-1">
                <ChevronUp className="w-3 h-3" /> COLLAPSE MAP
              </button>
            </>
          )}
        </div>

        {/* LEGEND BAR */}
        {data && (
          <div className="flex items-center justify-between px-3 py-1 bg-[#080f1e] border-b border-[#1e3a5f]/30 shrink-0 text-[8px]">
            <div className="flex items-center gap-3">
              <span className="text-white/40">LEGEND:</span>
              {[
                { color: '#ef4444', label: 'High Alert' },
                { color: '#f59e0b', label: 'Elevated' },
                { color: '#22c55e', label: 'Monitoring' },
                { color: '#3b82f6', label: 'Base' },
                { color: '#a855f7', label: 'Nuclear' },
                { color: '#06b6d4', label: 'Submarine' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-white/50">{l.label}</span>
                </div>
              ))}
            </div>
            <div className="text-white/40">
              {totalEvents} events tracked • Updated {lastUpdate}
            </div>
          </div>
        )}

        {/* ====== INTELLIGENCE PANELS GRID ====== */}
        <div className="flex-1 overflow-y-auto p-1.5 bg-[#060d18]">
          {loading && !data ? (
            <div className="flex items-center justify-center h-full gap-2 text-cyan-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">กำลังโหลดข้อมูลข่าวกรอง...</span>
            </div>
          ) : data ? (
            <div className="grid grid-cols-12 gap-1.5 auto-rows-min">
              
              {/* ROW 1: AI INSIGHTS + STRATEGIC POSTURE + CII + RISK GAUGE + INTEL FEED */}
              
              {/* AI INSIGHTS - World Brief */}
              <Panel title="AI Insights" icon={Brain} badge="GPT" live className="col-span-3 h-56">
                <div className="text-[9px] text-white/80 leading-relaxed whitespace-pre-wrap">
                  {data.worldBrief ? (
                    data.worldBrief.split('\n').map((line, i) => (
                      <p key={i} className={cn(
                        "mb-1",
                        line.includes('🔴') && "text-red-400",
                        line.includes('🟠') && "text-orange-400",
                        line.includes('**') && "font-bold text-white",
                      )}>{line.replace(/\*\*/g, '')}</p>
                    ))
                  ) : (
                    <span className="text-white/40">กำลังวิเคราะห์...</span>
                  )}
                </div>
              </Panel>

              {/* AI STRATEGIC POSTURE */}
              <Panel title="AI Strategic Posture" icon={Shield} badge="LIVE" badgeColor="bg-red-500/20 text-red-400" className="col-span-2 h-56">
                <div className="space-y-1">
                  {theaters.slice(0, 6).map(t => (
                    <div key={t.name} className="flex items-center justify-between p-1 rounded bg-[#0a1420]/50">
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold text-white/90 truncate">{t.name}</div>
                        <div className="text-[8px] text-white/40">{t.region}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-white/60">{t.score}</span>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-bold",
                          t.status === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                          t.status === 'ELEVATED' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-green-500/20 text-green-400'
                        )}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* COUNTRY INSTABILITY INDEX */}
              <Panel title="Country Instability Index" icon={AlertTriangle} badge={`${cii.length}`} className="col-span-2 h-56">
                <div className="space-y-0.5">
                  {cii.slice(0, 10).map(c => (
                    <div key={c.country} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full",
                          c.score >= 70 ? "bg-red-500" : c.score >= 40 ? "bg-orange-500" : "bg-green-500"
                        )} />
                        <span className="text-[9px] text-white/80">{c.country}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full",
                            c.score >= 70 ? "bg-red-500" : c.score >= 40 ? "bg-orange-500" : "bg-green-500"
                          )} style={{ width: `${c.score}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-white/60 w-6 text-right">{c.score}</span>
                        <span className="text-[8px]">
                          {c.trend === 'up' ? '🔺' : c.trend === 'down' ? '🔽' : '➡️'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* STRATEGIC RISK OVERVIEW - Gauge */}
              <Panel title="Strategic Risk Overview" icon={Target} className="col-span-2 h-56">
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  {/* Circular gauge */}
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a5f" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none"
                        stroke={strategicRisk >= 70 ? '#ef4444' : strategicRisk >= 40 ? '#f59e0b' : '#22c55e'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${strategicRisk * 2.51} 251`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn("text-2xl font-bold",
                        strategicRisk >= 70 ? "text-red-400" : strategicRisk >= 40 ? "text-orange-400" : "text-green-400"
                      )}>{strategicRisk}</span>
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold",
                    strategicRisk >= 70 ? "text-red-400" : strategicRisk >= 40 ? "text-orange-400" : "text-green-400"
                  )}>
                    {strategicRisk >= 70 ? 'CRITICAL' : strategicRisk >= 40 ? 'MODERATE' : 'Stable'}
                  </span>
                  <div className="text-[8px] text-white/40 text-center">
                    Multi-signal composite score<br/>
                    {data.sources.gdacs + data.sources.usgs + data.sources.gdelt} active signals
                  </div>
                </div>
              </Panel>

              {/* INTEL FEED */}
              <Panel title="Intel Feed" icon={Newspaper} live className="col-span-3 h-56">
                <div className="space-y-1.5">
                  {[
                    ...(data.disasters || []).slice(0, 3).map((d: any) => ({
                      title: d.name, source: 'GDACS', severity: d.severity === 'Red' ? 'critical' : 'high',
                      time: d.date ? new Date(d.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
                    })),
                    ...(data.protests || []).slice(0, 3).map((p: any) => ({
                      title: p.name, source: 'GDELT', severity: p.count > 10 ? 'high' : 'medium',
                      time: '',
                    })),
                    ...(data.eonet || []).slice(0, 2).map((e: any) => ({
                      title: e.name, source: 'NASA', severity: 'medium',
                      time: e.date ? new Date(e.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
                    })),
                  ].slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-1 rounded bg-[#0a1420]/30 hover:bg-[#0a1420]/60 cursor-pointer">
                      <div className={cn("w-1 h-full min-h-[20px] rounded-full shrink-0 mt-0.5",
                        item.severity === 'critical' ? "bg-red-500" :
                        item.severity === 'high' ? "bg-orange-500" : "bg-yellow-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-white/85 leading-tight truncate">{item.title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[7px] text-cyan-400 font-bold">{item.source}</span>
                          {item.time && <span className="text-[7px] text-white/30">{item.time}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* ROW 2: LIVE INTELLIGENCE + INFRASTRUCTURE + REGIONAL */}
              
              {/* LIVE INTELLIGENCE */}
              <Panel title="Live Intelligence" icon={Eye} live className="col-span-2 h-48">
                <div className="space-y-1.5">
                  <div className="text-[9px]">
                    <div className="flex items-center gap-1 mb-1">
                      <Shield className="w-3 h-3 text-red-400" />
                      <span className="text-white/70 font-bold">Military Activity</span>
                    </div>
                    {theaters.filter(t => t.status !== 'NORMAL').slice(0, 3).map(t => (
                      <div key={t.name} className="text-[8px] text-white/50 pl-4 mb-0.5">
                        • {t.name}: {t.signals.join(', ') || 'monitoring'}
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px]">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span className="text-white/70 font-bold">Cyber Threats</span>
                    </div>
                    <div className="text-[8px] text-white/50 pl-4">
                      • {data.outages.length} internet outages detected
                    </div>
                  </div>
                </div>
              </Panel>

              {/* INFRASTRUCTURE CASCADE */}
              <Panel title="Infrastructure Cascade" icon={Cpu} className="col-span-2 h-48">
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[
                      { icon: '🔌', label: 'Cables', count: 15 },
                      { icon: '🛢️', label: 'Pipelines', count: 8 },
                      { icon: '⚠️', label: 'Chokepoints', count: 12 },
                    ].map(item => (
                      <div key={item.label} className="bg-[#0a1420]/50 rounded p-1.5">
                        <div className="text-sm">{item.icon}</div>
                        <div className="text-[8px] text-white/50">{item.label}</div>
                        <div className="text-[10px] font-bold text-cyan-400">{item.count}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[8px] text-white/40">
                    Select cable/pipeline on map to view dependencies
                  </div>
                </div>
              </Panel>

              {/* WORLD / GEOPOLITICAL NEWS */}
              <Panel title="World / Geopolitical" icon={Globe} live className="col-span-2 h-48">
                <div className="space-y-1">
                  {(data.disasters || []).slice(0, 4).map((d: any, i: number) => (
                    <div key={i} className="p-1 rounded bg-[#0a1420]/30">
                      <div className="text-[9px] text-white/80 truncate">{d.name}</div>
                      <div className="text-[7px] text-white/40">{d.country || 'Global'} • {d.severity}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* MIDDLE EAST / MENA */}
              <Panel title="Middle East / MENA" icon={MapPin} live className="col-span-2 h-48">
                <div className="space-y-1">
                  {(() => {
                    const mena = ['Iran', 'Iraq', 'Syria', 'Lebanon', 'Israel', 'Saudi', 'Yemen', 'UAE', 'Qatar'];
                    const items = [
                      ...data.disasters.filter((d: any) => mena.some(c => d.country?.includes(c))),
                      ...data.protests.filter((p: any) => mena.some(c => p.name?.includes(c))),
                    ].slice(0, 4);
                    return items.length > 0 ? items.map((item: any, i: number) => (
                      <div key={i} className="p-1 rounded bg-[#0a1420]/30">
                        <div className="text-[9px] text-white/80 truncate">{item.name}</div>
                        <div className="text-[7px] text-white/40">{item.country || item.source || ''}</div>
                      </div>
                    )) : (
                      <div className="text-[8px] text-white/30 text-center py-4">
                        ไม่มีเหตุการณ์สำคัญในขณะนี้
                      </div>
                    );
                  })()}
                </div>
              </Panel>

              {/* AFRICA */}
              <Panel title="Africa" icon={MapPin} className="col-span-2 h-48">
                <div className="space-y-1">
                  {(() => {
                    const africa = ['Nigeria', 'Ethiopia', 'Somalia', 'Sudan', 'Kenya', 'South Africa', 'Mali', 'Niger', 'Congo', 'Libya'];
                    const items = [
                      ...data.disasters.filter((d: any) => africa.some(c => d.country?.includes(c))),
                      ...data.protests.filter((p: any) => africa.some(c => p.name?.includes(c))),
                    ].slice(0, 4);
                    return items.length > 0 ? items.map((item: any, i: number) => (
                      <div key={i} className="p-1 rounded bg-[#0a1420]/30">
                        <div className="text-[9px] text-white/80 truncate">{item.name}</div>
                        <div className="text-[7px] text-white/40">{item.country || item.source || ''}</div>
                      </div>
                    )) : (
                      <div className="text-[8px] text-white/30 text-center py-4">
                        ไม่มีเหตุการณ์สำคัญในขณะนี้
                      </div>
                    );
                  })()}
                </div>
              </Panel>

              {/* ROW 3: GOVERNMENT + REGIONAL CONTINUED + MARKETS */}

              {/* DISASTERS & NATURAL EVENTS */}
              <Panel title="Disasters & Seismic" icon={Activity} badge={`${data.earthquakes.length}`} className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.earthquakes.slice(0, 5).map((q: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-1 rounded bg-[#0a1420]/30">
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-white/80 truncate">{q.name}</div>
                      </div>
                      <span className={cn("text-[9px] font-bold ml-1",
                        q.magnitude >= 6 ? "text-red-400" : q.magnitude >= 5 ? "text-orange-400" : "text-yellow-400"
                      )}>M{q.magnitude}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* FIRES */}
              <Panel title="Fires & Hotspots" icon={Flame} badge={`${data.fires.length}`} badgeColor="bg-red-500/20 text-red-400" className="col-span-2 h-48">
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Flame className="w-8 h-8 text-orange-500" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{data.fires.length}</div>
                    <div className="text-[9px] text-white/50">จุดความร้อนดาวเทียม</div>
                    <div className="text-[8px] text-white/30">NASA FIRMS (VIIRS)</div>
                  </div>
                </div>
              </Panel>

              {/* PROTESTS & UNREST */}
              <Panel title="Protests & Unrest" icon={AlertTriangle} badge={`${data.protests.length}`} badgeColor="bg-yellow-500/20 text-yellow-400" className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.protests.slice(0, 5).map((p: any, i: number) => (
                    <div key={i} className="p-1 rounded bg-[#0a1420]/30">
                      <div className="text-[9px] text-white/80 truncate">{p.name}</div>
                      <div className="text-[7px] text-white/40">GDELT • mentions: {p.count}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* NASA EONET */}
              <Panel title="NASA Natural Events" icon={Globe} badge={`${data.eonet.length}`} className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.eonet.slice(0, 5).map((e: any, i: number) => (
                    <div key={i} className="p-1 rounded bg-[#0a1420]/30">
                      <div className="text-[9px] text-white/80 truncate">{e.name}</div>
                      <div className="text-[7px] text-white/40">{e.type} • NASA EONET</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* INTERNET OUTAGES */}
              <Panel title="Internet Outages" icon={Wifi} badge={`${data.outages.length}`} className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.outages.length > 0 ? data.outages.slice(0, 5).map((o: any, i: number) => (
                    <div key={i} className="p-1 rounded bg-[#0a1420]/30">
                      <div className="text-[9px] text-white/80 truncate">{o.name}</div>
                      <div className="text-[7px] text-white/40">{o.type} • Level: {o.level}</div>
                    </div>
                  )) : (
                    <div className="text-[8px] text-green-400/60 text-center py-6">
                      ✅ ไม่มี outages ที่ตรวจพบ
                    </div>
                  )}
                </div>
              </Panel>

              {/* DATA SOURCES STATUS */}
              <Panel title="Data Sources" icon={Radio} className="col-span-2 h-48">
                <div className="space-y-1">
                  {[
                    { name: 'GDACS', count: data.sources.gdacs, color: 'text-red-400' },
                    { name: 'USGS', count: data.sources.usgs, color: 'text-orange-400' },
                    { name: 'NASA EONET', count: data.sources.eonet, color: 'text-blue-400' },
                    { name: 'GDELT', count: data.sources.gdelt, color: 'text-yellow-400' },
                    { name: 'NASA FIRMS', count: data.sources.firms, color: 'text-orange-500' },
                    { name: 'IODA', count: data.sources.outages, color: 'text-purple-400' },
                  ].map(src => (
                    <div key={src.name} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[9px] text-white/70">{src.name}</span>
                      </div>
                      <span className={cn("text-[9px] font-mono font-bold", src.color)}>{src.count}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-[#1e3a5f]/30 flex items-center justify-between">
                    <span className="text-[8px] text-white/40">Total events</span>
                    <span className="text-[10px] font-bold text-cyan-400">{totalEvents}</span>
                  </div>
                </div>
              </Panel>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default WorldMonitorDashboard;
