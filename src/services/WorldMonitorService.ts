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
  worldBrief: string;
  timestamp: string;
  sources: { gdacs: number; usgs: number; eonet: number };
}

export interface CountryInstabilityScore {
  country: CountryProfile;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  factors: string[];
}

class WorldMonitorService {
  private cache: WorldIntelligenceData | null = null;
  private cacheTime = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 min

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
        disasters: [], earthquakes: [], eonet: [],
        worldBrief: '⚠️ ไม่สามารถโหลดข้อมูลข่าวกรองได้ กรุณาลองใหม่',
        timestamp: new Date().toISOString(),
        sources: { gdacs: 0, usgs: 0, eonet: 0 },
      };
    }
  }

  computeCII(intelligence: WorldIntelligenceData): CountryInstabilityScore[] {
    return COUNTRY_PROFILES.map(country => {
      let score = country.baselineRisk * 0.4; // 40% baseline
      const factors: string[] = [];

      // Conflict zone boost
      const conflicts = CONFLICT_ZONES.filter(cz => {
        const matchName = country.name.includes(cz.name) || cz.parties.some(p => 
          p.toLowerCase().includes(country.code.toLowerCase())
        );
        return matchName;
      });
      if (conflicts.length > 0) {
        const conflictBoost = conflicts[0].severity === 'war' ? 30 : conflicts[0].severity === 'high' ? 20 : 10;
        score += conflictBoost;
        factors.push(`⚔️ ความขัดแย้ง: ${conflicts[0].name}`);
      }

      // Disaster proximity boost
      const nearDisasters = intelligence.disasters.filter(d => {
        if (!d.country) return false;
        return d.country.toLowerCase().includes(country.code.toLowerCase());
      });
      if (nearDisasters.length > 0) {
        score += Math.min(nearDisasters.length * 5, 15);
        factors.push(`🌍 ภัยพิบัติ: ${nearDisasters.length} เหตุการณ์`);
      }

      // Earthquake boost
      const nearQuakes = intelligence.earthquakes.filter(e => {
        if (!e.lat || !e.lng) return false;
        // Rough proximity check
        return false; // Simplified - would need country boundaries
      });

      // Clamp 0-100
      score = Math.min(100, Math.max(0, Math.round(score)));
      
      if (factors.length === 0) {
        factors.push(score > 60 ? '📊 ความเสี่ยงโครงสร้างสูง' : '📊 ระดับความเสี่ยงพื้นฐาน');
      }

      const trend: 'rising' | 'stable' | 'falling' = score > 70 ? 'rising' : score > 40 ? 'stable' : 'falling';

      return {
        country,
        score,
        trend,
        factors,
      };
    }).sort((a, b) => b.score - a.score);
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
