import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, Shield, AlertTriangle, Activity, 
  Brain, Flame, Radio, Target, 
  ChevronDown, ChevronUp, RefreshCw, Clock, Zap,
  Wifi, Eye, ArrowLeft, Newspaper, MapPin, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BloombergMap } from '@/components/BloombergMap';
import { useNavigate } from 'react-router-dom';

// ============= TYPES =============
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

// ============= THEATER POSTURE =============
const THEATERS = [
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
    const dHits = data.disasters.filter(d => t.countries.some(c => d.country?.includes(c)));
    if (dHits.length) { score += dHits.length * 5; signals.push(`${dHits.length} disasters`); }
    const qHits = data.earthquakes.filter(e => t.countries.some(c => (e.name || '').includes(c)));
    if (qHits.length) { score += qHits.length * 3; signals.push(`${qHits.length} quakes`); }
    const pHits = data.protests.filter(p => t.countries.some(c => (p.name || '').includes(c)));
    if (pHits.length) { score += pHits.length * 4; signals.push(`${pHits.length} protests`); }
    const status: TheaterPosture['status'] = score >= 60 ? 'CRITICAL' : score >= 35 ? 'ELEVATED' : 'NORMAL';
    return { name: t.name, region: t.region, status, score: Math.min(score, 100), signals };
  });
}

// ============= CII =============
const CII_COUNTRIES = [
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
    return {
      country: c.country,
      score: Math.min(Math.round(score), 100),
      trend: (sigCount > 2 ? 'up' : sigCount === 0 ? 'down' : 'stable') as CIIEntry['trend'],
      signals: sigCount,
    };
  }).sort((a, b) => b.score - a.score);
}

function computeStrategicRisk(data: WorldIntelData): number {
  const total = data.disasters.length * 5 + data.earthquakes.length * 3 +
    data.protests.length * 4 + data.fires.length * 1 + data.outages.length * 6;
  return Math.min(Math.round(total / 3), 100);
}

// ============= PANEL COMPONENT =============
const Panel = ({ title, icon: Icon, badge, badgeVariant = 'cyan', live, children, className }: {
  title: string;
  icon?: any;
  badge?: string;
  badgeVariant?: 'cyan' | 'red' | 'amber' | 'green';
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  const badgeColors = {
    cyan: 'bg-terminal-cyan/10 text-terminal-cyan border-terminal-cyan/30',
    red: 'bg-terminal-red/10 text-terminal-red border-terminal-red/30',
    amber: 'bg-terminal-amber/10 text-terminal-amber border-terminal-amber/30',
    green: 'bg-terminal-green/10 text-terminal-green border-terminal-green/30',
  };
  return (
    <div className={cn("bg-card border border-border rounded-sm flex flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between px-2 py-1 bg-secondary border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3 text-terminal-cyan" />}
          <span className="text-[10px] font-bold text-foreground tracking-wider uppercase font-mono">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {live && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
              <span className="text-[8px] text-terminal-green font-mono">LIVE</span>
            </div>
          )}
          {badge && (
            <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-mono border", badgeColors[badgeVariant])}>{badge}</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {children}
      </div>
    </div>
  );
};

// ============= MAIN COMPONENT =============
export const WorldMonitorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<WorldIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [theaters, setTheaters] = useState<TheaterPosture[]>([]);
  const [cii, setCII] = useState<CIIEntry[]>([]);
  const [strategicRisk, setStrategicRisk] = useState(0);
  const [timeFilter, setTimeFilter] = useState('7d');

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
  const defconLevel = strategicRisk > 70 ? '2' : strategicRisk > 40 ? '3' : '4';
  const riskLabel = strategicRisk > 70 ? 'SEVERE' : strategicRisk > 40 ? 'ELEVATED' : 'MODERATE';
  const riskColor = strategicRisk > 70 ? 'text-terminal-red' : strategicRisk > 40 ? 'text-terminal-amber' : 'text-terminal-green';

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-mono">
      {/* ====== TOP BAR ====== */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-secondary border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground h-6 px-1.5">
            <ArrowLeft className="w-3 h-3" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-terminal-cyan" />
            <span className="text-sm font-bold text-terminal-cyan tracking-wider">WORLD MONITOR</span>
            <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">v4.0</span>
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-0.5 bg-card rounded p-0.5 border border-border ml-2">
            {['1h', '24h', '48h', '7d', 'ALL'].map(t => (
              <button key={t} onClick={() => setTimeFilter(t)}
                className={cn("px-2 py-0.5 text-[9px] rounded transition-colors",
                  timeFilter === t ? "bg-terminal-cyan/20 text-terminal-cyan" : "text-muted-foreground hover:text-foreground"
                )}>{t}</button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
            <span className="text-terminal-green text-[9px] font-bold">LIVE</span>
          </div>

          {data && (
            <Badge className={cn("text-[8px] border ml-1",
              defconLevel === '2' ? 'bg-terminal-red/10 text-terminal-red border-terminal-red/30' :
              defconLevel === '3' ? 'bg-terminal-amber/10 text-terminal-amber border-terminal-amber/30' :
              'bg-terminal-green/10 text-terminal-green border-terminal-green/30'
            )}>
              DEFCON: {defconLevel}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC+7
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}
            className="h-6 px-2 text-[9px] text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
          <span className="text-[9px] text-terminal-green font-bold tracking-wider">ABLE INTELLIGENCE</span>
        </div>
      </div>

      {/* ====== CONTENT ====== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* MAP SECTION */}
        <div className={cn("relative border-b border-border transition-all duration-300 shrink-0",
          mapCollapsed ? "h-8" : "h-[42%]"
        )}>
          {mapCollapsed ? (
            <button onClick={() => setMapCollapsed(false)}
              className="w-full h-full flex items-center justify-center gap-2 bg-secondary hover:bg-muted transition-colors text-[10px] text-muted-foreground font-mono">
              <ChevronDown className="w-3 h-3" /> EXPAND MAP <ChevronDown className="w-3 h-3" />
            </button>
          ) : (
            <>
              <BloombergMap isFullscreen={false} />
              <button onClick={() => setMapCollapsed(true)}
                className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-card/90 border border-border rounded px-3 py-0.5 text-[9px] text-muted-foreground hover:text-foreground z-[1000] flex items-center gap-1 font-mono backdrop-blur-sm">
                <ChevronUp className="w-3 h-3" /> COLLAPSE MAP
              </button>
            </>
          )}
        </div>

        {/* LEGEND BAR */}
        {data && (
          <div className="flex items-center justify-between px-3 py-1 bg-secondary border-b border-border shrink-0 text-[8px] font-mono">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">LEGEND:</span>
              {[
                { color: 'hsl(var(--terminal-red))', label: 'High Alert' },
                { color: 'hsl(var(--terminal-amber))', label: 'Elevated' },
                { color: 'hsl(var(--terminal-green))', label: 'Monitoring' },
                { color: 'hsl(var(--terminal-cyan))', label: 'Base' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground">
              {totalEvents} events tracked • Updated {lastUpdate}
            </div>
          </div>
        )}

        {/* ====== INTELLIGENCE PANELS GRID ====== */}
        <div className="flex-1 overflow-y-auto p-1.5 bg-background">
          {loading && !data ? (
            <div className="flex items-center justify-center h-full gap-2 text-terminal-cyan">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">กำลังโหลดข้อมูลข่าวกรอง...</span>
            </div>
          ) : data ? (
            <div className="grid grid-cols-12 gap-1.5 auto-rows-min">

              {/* ROW 1: AI INSIGHTS + STRATEGIC POSTURE + CII + RISK GAUGE */}

              {/* AI INSIGHTS */}
              <Panel title="AI Insights" icon={Brain} badge="GEMINI" badgeVariant="green" live className="col-span-3 h-56">
                <div className="text-[9px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {data.worldBrief ? (
                    data.worldBrief.split('\n').map((line, i) => (
                      <p key={i} className={cn(
                        "mb-1",
                        line.includes('🔴') && "text-terminal-red",
                        line.includes('🟠') && "text-terminal-amber",
                        line.includes('**') && "font-bold text-foreground",
                      )}>{line.replace(/\*\*/g, '')}</p>
                    ))
                  ) : (
                    <span className="text-muted-foreground">กำลังวิเคราะห์...</span>
                  )}
                </div>
              </Panel>

              {/* STRATEGIC POSTURE */}
              <Panel title="Strategic Posture" icon={Shield} badge="LIVE" badgeVariant="red" className="col-span-2 h-56">
                <div className="space-y-1">
                  {theaters.slice(0, 7).map(t => (
                    <div key={t.name} className="flex items-center justify-between p-1 rounded bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold text-foreground truncate">{t.name}</div>
                        <div className="text-[8px] text-muted-foreground">{t.region}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-muted-foreground">{t.score}</span>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-bold font-mono",
                          t.status === 'CRITICAL' ? 'bg-terminal-red/15 text-terminal-red' :
                          t.status === 'ELEVATED' ? 'bg-terminal-amber/15 text-terminal-amber' :
                          'bg-terminal-green/15 text-terminal-green'
                        )}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* COUNTRY INSTABILITY INDEX */}
              <Panel title="Country Instability Index" icon={AlertTriangle} badge={`${cii.length}`} badgeVariant="amber" className="col-span-2 h-56">
                <div className="space-y-0.5">
                  {cii.slice(0, 10).map(c => (
                    <div key={c.country} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full",
                          c.score >= 70 ? "bg-terminal-red" : c.score >= 40 ? "bg-terminal-amber" : "bg-terminal-green"
                        )} />
                        <span className="text-[9px] text-foreground/80">{c.country}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full",
                            c.score >= 70 ? "bg-terminal-red" : c.score >= 40 ? "bg-terminal-amber" : "bg-terminal-green"
                          )} style={{ width: `${c.score}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground w-6 text-right">{c.score}</span>
                        <span className="text-[8px]">
                          {c.trend === 'up' ? '🔺' : c.trend === 'down' ? '🔽' : '➡️'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* STRATEGIC RISK GAUGE */}
              <Panel title="Strategic Risk" icon={Target} className="col-span-2 h-56">
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={strategicRisk > 70 ? 'hsl(var(--terminal-red))' : strategicRisk > 40 ? 'hsl(var(--terminal-amber))' : 'hsl(var(--terminal-green))'}
                        strokeWidth="6" strokeDasharray={`${strategicRisk * 2.64} 264`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cn("text-2xl font-bold font-mono", riskColor)}>{strategicRisk}</span>
                      <span className="text-[7px] text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={cn("text-xs font-bold font-mono", riskColor)}>{riskLabel}</div>
                    <div className="text-[8px] text-muted-foreground">DEFCON {defconLevel}</div>
                  </div>
                </div>
              </Panel>

              {/* INTEL FEED */}
              <Panel title="Intel Feed" icon={Radio} badge={`${totalEvents}`} badgeVariant="cyan" live className="col-span-3 h-56">
                <div className="space-y-1">
                  {[
                    ...data.disasters.slice(0, 3).map(d => ({
                      icon: '⚠️', text: `${d.name} — ${d.country || 'Unknown'}`, severity: d.severity, source: 'GDACS'
                    })),
                    ...data.earthquakes.slice(0, 3).map(e => ({
                      icon: '🌋', text: `M${e.magnitude} ${e.name}`, severity: e.magnitude >= 6 ? 'Red' : 'Orange', source: 'USGS'
                    })),
                    ...data.protests.slice(0, 2).map(p => ({
                      icon: '✊', text: p.name, severity: 'Orange', source: 'GDELT'
                    })),
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-1 rounded bg-muted/30 text-[9px]">
                      <span>{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground/80 truncate">{item.text}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("px-1 py-0 rounded text-[7px] font-mono",
                            item.severity === 'Red' ? 'bg-terminal-red/15 text-terminal-red' : 'bg-terminal-amber/15 text-terminal-amber'
                          )}>{item.severity}</span>
                          <span className="text-muted-foreground text-[7px]">{item.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* ROW 2: DATA SOURCE PANELS */}

              {/* DISASTERS */}
              <Panel title="Disasters" icon={AlertTriangle} badge={`${data.disasters.length}`} badgeVariant="red" live className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.disasters.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] py-0.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span>{d.severity === 'Red' ? '🔴' : '🟠'}</span>
                        <span className="text-foreground/80 truncate">{d.name}</span>
                      </div>
                      <span className="text-muted-foreground text-[8px] ml-1">{d.country || ''}</span>
                    </div>
                  ))}
                  {data.disasters.length === 0 && <span className="text-muted-foreground text-[9px]">ไม่มีข้อมูล</span>}
                </div>
              </Panel>

              {/* EARTHQUAKES */}
              <Panel title="Earthquakes 24h" icon={Activity} badge={`${data.earthquakes.length}`} badgeVariant="amber" live className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.earthquakes.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] py-0.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className={cn("font-mono font-bold w-8",
                          e.magnitude >= 6 ? "text-terminal-red" : e.magnitude >= 5 ? "text-terminal-amber" : "text-terminal-green"
                        )}>M{e.magnitude}</span>
                        <span className="text-foreground/80 truncate">{e.name}</span>
                      </div>
                      {e.tsunami === 1 && <span className="text-terminal-red text-[7px]">🌊 TSUNAMI</span>}
                    </div>
                  ))}
                </div>
              </Panel>

              {/* NASA EONET */}
              <Panel title="NASA EONET" icon={Eye} badge={`${data.eonet.length}`} badgeVariant="cyan" className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.eonet.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px] py-0.5">
                      <MapPin className="w-2.5 h-2.5 text-terminal-cyan shrink-0" />
                      <span className="text-foreground/80 truncate">{e.name}</span>
                      <span className="text-muted-foreground text-[7px] ml-auto shrink-0">{e.type}</span>
                    </div>
                  ))}
                  {data.eonet.length === 0 && <span className="text-muted-foreground text-[9px]">ไม่มีเหตุการณ์</span>}
                </div>
              </Panel>

              {/* SATELLITE FIRES */}
              <Panel title="Satellite Fires" icon={Flame} badge={`${data.fires.length}`} badgeVariant="red" live className="col-span-2 h-48">
                <div className="text-center py-2">
                  <div className="text-3xl font-bold text-terminal-amber font-mono">{data.fires.length}</div>
                  <div className="text-[9px] text-muted-foreground mt-1">Active Hotspots</div>
                  <div className="text-[8px] text-muted-foreground">NASA FIRMS VIIRS</div>
                  {data.fires.length > 100 && (
                    <div className="mt-2 text-[8px] text-terminal-red">⚠️ สูงกว่าค่าเฉลี่ย</div>
                  )}
                </div>
              </Panel>

              {/* PROTESTS */}
              <Panel title="Protests & Unrest" icon={Zap} badge={`${data.protests.length}`} badgeVariant="amber" className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.protests.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px] py-0.5">
                      <span>✊</span>
                      <span className="text-foreground/80 truncate flex-1">{p.name}</span>
                      <span className="text-muted-foreground text-[7px]">{p.count}x</span>
                    </div>
                  ))}
                  {data.protests.length === 0 && <span className="text-muted-foreground text-[9px]">ไม่มีข้อมูล</span>}
                </div>
              </Panel>

              {/* INTERNET OUTAGES */}
              <Panel title="Internet Outages" icon={Wifi} badge={`${data.outages.length}`} badgeVariant="cyan" className="col-span-2 h-48">
                <div className="space-y-1">
                  {data.outages.slice(0, 6).map((o, i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] py-0.5">
                      <span className="text-foreground/80 truncate">{o.name}</span>
                      <span className={cn("text-[7px] font-mono px-1 rounded",
                        o.level === 'critical' ? 'bg-terminal-red/15 text-terminal-red' : 'bg-terminal-amber/15 text-terminal-amber'
                      )}>{o.level || 'alert'}</span>
                    </div>
                  ))}
                  {data.outages.length === 0 && <span className="text-muted-foreground text-[9px]">ไม่มี outage</span>}
                </div>
              </Panel>

              {/* DATA SOURCES SUMMARY */}
              <Panel title="Data Sources" icon={BarChart3} className="col-span-12 h-12">
                <div className="flex items-center justify-center gap-6 h-full text-[9px] font-mono">
                  {Object.entries(data.sources || {}).map(([key, count]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-terminal-cyan" />
                      <span className="text-muted-foreground uppercase">{key}</span>
                      <span className="text-terminal-green font-bold">{count}</span>
                    </div>
                  ))}
                  <span className="text-muted-foreground">|</span>
                  <span className="text-terminal-amber">TOTAL: {totalEvents}</span>
                </div>
              </Panel>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
              ไม่สามารถโหลดข้อมูลได้ — กดรีเฟรชเพื่อลองอีกครั้ง
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldMonitorDashboard;
