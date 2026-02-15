import { supabase } from '@/integrations/supabase/client';
import { 
  MILITARY_BASES, NUCLEAR_FACILITIES, UNDERSEA_CABLES, PIPELINES, 
  DATACENTERS, CONFLICT_ZONES, INTELLIGENCE_HOTSPOTS, COUNTRY_PROFILES,
  STRATEGIC_CHOKEPOINTS,
  type MilitaryBase, type NuclearFacility, type ConflictZone, type IntelligenceHotspot,
  type CountryProfile, type StrategicChokepoint
} from '@/data/intelligenceData';

export interface WorldIntelligenceData {
  disasters: any[];
  earthquakes: any[];
  eonet: any[];
  protests: any[];
  fires: any[];
  outages: any[];
  worldBrief: string;
  timestamp: string;
  sources: { gdacs: number; usgs: number; eonet: number; gdelt: number; firms: number; outages: number };
}

export interface CountryInstabilityScore {
  country: CountryProfile;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  factors: string[];
}

export interface TheaterPosture {
  name: string;
  region: string;
  level: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  triggers: string[];
  score: number;
}

class WorldMonitorService {
  private cache: WorldIntelligenceData | null = null;
  private cacheTime = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async fetchIntelligence(): Promise<WorldIntelligenceData> {
    if (this.cache && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const { data, error } = await supabase.functions.invoke('world-intelligence', {
        body: { action: 'all' },
      });

      if (error) throw error;
      this.cache = data;
      this.cacheTime = Date.now();
      return data;
    } catch (err) {
      console.error('WorldMonitor fetch failed:', err);
      return {
        disasters: [], earthquakes: [], eonet: [], protests: [], fires: [], outages: [],
        worldBrief: '⚠️ ไม่สามารถโหลดข้อมูลข่าวกรองได้ กรุณาลองใหม่',
        timestamp: new Date().toISOString(),
        sources: { gdacs: 0, usgs: 0, eonet: 0, gdelt: 0, firms: 0, outages: 0 },
      };
    }
  }

  computeCII(intelligence: WorldIntelligenceData): CountryInstabilityScore[] {
    return COUNTRY_PROFILES.map(country => {
      let score = country.baselineRisk * 0.4;
      const factors: string[] = [];

      // Conflict zone boost
      const conflicts = CONFLICT_ZONES.filter(cz => {
        return country.name.includes(cz.name.split(' ')[0]) || cz.parties.some(p => 
          p.toLowerCase().includes(country.code.toLowerCase())
        );
      });
      if (conflicts.length > 0) {
        const conflictBoost = conflicts[0].severity === 'war' ? 30 : conflicts[0].severity === 'high' ? 20 : 10;
        score += conflictBoost;
        factors.push(`⚔️ ความขัดแย้ง: ${conflicts[0].name}`);
      }

      // Disaster proximity
      const nearDisasters = intelligence.disasters.filter(d => {
        if (!d.country) return false;
        return d.country.toLowerCase().includes(country.code.toLowerCase());
      });
      if (nearDisasters.length > 0) {
        score += Math.min(nearDisasters.length * 5, 15);
        factors.push(`🌍 ภัยพิบัติ: ${nearDisasters.length} เหตุการณ์`);
      }

      // Protest/unrest boost
      const nearProtests = intelligence.protests.filter(p => {
        if (!p.name) return false;
        return p.name.toLowerCase().includes(country.name.toLowerCase());
      });
      if (nearProtests.length > 0) {
        score += Math.min(nearProtests.length * 3, 15);
        factors.push(`📢 ประท้วง: ${nearProtests.length} จุด`);
      }

      // Fire hotspots boost
      if (intelligence.fires.length > 50) {
        score += 5;
        factors.push(`🔥 จุดความร้อน: ${intelligence.fires.length} จุดทั่วโลก`);
      }

      score = Math.min(100, Math.max(0, Math.round(score)));
      
      if (factors.length === 0) {
        factors.push(score > 60 ? '📊 ความเสี่ยงโครงสร้างสูง' : '📊 ระดับความเสี่ยงพื้นฐาน');
      }

      const trend: 'rising' | 'stable' | 'falling' = score > 70 ? 'rising' : score > 40 ? 'stable' : 'falling';

      return { country, score, trend, factors };
    }).sort((a, b) => b.score - a.score);
  }

  computeTheaterPosture(intelligence: WorldIntelligenceData): TheaterPosture[] {
    const theaters: TheaterPosture[] = [
      { name: 'อ่าวเปอร์เซีย / อิหร่าน', region: 'middle_east', level: 'ELEVATED', triggers: ['Strait of Hormuz tension', 'Naval presence'], score: 65 },
      { name: 'ช่องแคบไต้หวัน', region: 'west_pacific', level: 'ELEVATED', triggers: ['PLAAF activity', 'USN carrier presence'], score: 60 },
      { name: 'บอลติก / คาลินินกราด', region: 'europe', level: 'NORMAL', triggers: ['NATO Baltic Air Policing'], score: 40 },
      { name: 'คาบสมุทรเกาหลี', region: 'east_asia', level: 'NORMAL', triggers: ['B-52 deployments', 'DPRK missile tests'], score: 45 },
      { name: 'ทะเลเมดิเตอร์เรเนียนตะวันออก', region: 'mediterranean', level: 'ELEVATED', triggers: ['Gaza conflict spillover'], score: 70 },
      { name: 'แหลมแอฟริกา', region: 'horn_africa', level: 'CRITICAL', triggers: ['Houthi Red Sea attacks', 'Piracy'], score: 80 },
      { name: 'ทะเลจีนใต้', region: 'south_china_sea', level: 'ELEVATED', triggers: ['FONOPS', 'Island militarization'], score: 55 },
      { name: 'อาร์กติก', region: 'arctic', level: 'NORMAL', triggers: ['Long-range aviation patrols'], score: 30 },
      { name: 'ทะเลดำ', region: 'black_sea', level: 'ELEVATED', triggers: ['ISR flights', 'Naval restrictions'], score: 65 },
    ];

    // Boost theater scores based on live data
    const disasterCountries = intelligence.disasters.map(d => (d.country || '').toLowerCase());
    
    theaters.forEach(t => {
      if (t.region === 'horn_africa' && disasterCountries.some(c => ['yemen', 'somalia', 'djibouti'].includes(c))) {
        t.score = Math.min(100, t.score + 10);
      }
      if (t.score >= 75) t.level = 'CRITICAL';
      else if (t.score >= 50) t.level = 'ELEVATED';
      else t.level = 'NORMAL';
    });

    return theaters.sort((a, b) => b.score - a.score);
  }

  // Geographic convergence: detect when multiple event types cluster in same area
  detectConvergence(intelligence: WorldIntelligenceData): { lat: number; lng: number; types: string[]; count: number; name: string }[] {
    const GRID_SIZE = 2; // 2-degree grid
    const grid: Record<string, { types: Set<string>; count: number; lat: number; lng: number }> = {};

    const addToGrid = (lat: number, lng: number, type: string) => {
      const key = `${Math.floor(lat / GRID_SIZE)},${Math.floor(lng / GRID_SIZE)}`;
      if (!grid[key]) grid[key] = { types: new Set(), count: 0, lat, lng };
      grid[key].types.add(type);
      grid[key].count++;
    };

    intelligence.earthquakes.forEach(e => addToGrid(e.lat, e.lng, 'earthquake'));
    intelligence.disasters.forEach(d => addToGrid(d.lat, d.lng, 'disaster'));
    intelligence.protests.forEach(p => addToGrid(p.lat, p.lng, 'protest'));
    intelligence.fires.forEach(f => addToGrid(f.lat, f.lng, 'fire'));

    return Object.values(grid)
      .filter(g => g.types.size >= 2)
      .map(g => ({
        lat: g.lat,
        lng: g.lng,
        types: Array.from(g.types),
        count: g.count,
        name: `ตรวจพบ ${g.types.size} สัญญาณซ้อนทับ`,
      }))
      .sort((a, b) => b.types.length - a.types.length)
      .slice(0, 10);
  }

  getMilitaryBases(): MilitaryBase[] { return MILITARY_BASES; }
  getNuclearFacilities(): NuclearFacility[] { return NUCLEAR_FACILITIES; }
  getUnderseaCables() { return UNDERSEA_CABLES; }
  getPipelines() { return PIPELINES; }
  getDatacenters() { return DATACENTERS; }
  getConflictZones(): ConflictZone[] { return CONFLICT_ZONES; }
  getHotspots(): IntelligenceHotspot[] { return INTELLIGENCE_HOTSPOTS; }
  getChokepoints(): StrategicChokepoint[] { return STRATEGIC_CHOKEPOINTS; }
  getCountryProfiles(): CountryProfile[] { return COUNTRY_PROFILES; }
}

export const worldMonitorService = new WorldMonitorService();
