// Conflict Data Service - Monitor global conflict zones
export interface ConflictEvent {
  id: string;
  type: 'battle' | 'airstrike' | 'artillery' | 'capture' | 'movement' | 'explosion';
  location: string;
  coordinates: [number, number];
  description: string;
  time: number;
  severity: 'high' | 'medium' | 'low';
  source: string;
}

// Known conflict zones with approximate coordinates
const CONFLICT_ZONES = [
  { region: 'Eastern Europe', lat: 48.5, lon: 38.5, active: true },
  { region: 'Middle East', lat: 33.0, lon: 44.0, active: true },
  { region: 'Horn of Africa', lat: 9.0, lon: 42.0, active: true },
  { region: 'West Africa', lat: 14.0, lon: 2.0, active: true },
  { region: 'Myanmar', lat: 22.0, lon: 96.0, active: true },
  { region: 'South Asia', lat: 34.0, lon: 70.0, active: true }
];

export class ConflictService {
  static async getConflictData(): Promise<ConflictEvent[]> {
    // Simulate conflict data - in production, use news APIs or specialized feeds
    const events: ConflictEvent[] = [];
    
    CONFLICT_ZONES.filter(z => z.active).forEach((zone, index) => {
      const types: ConflictEvent['type'][] = ['battle', 'airstrike', 'artillery', 'explosion'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Add some randomness to coordinates
      const lat = zone.lat + (Math.random() - 0.5) * 2;
      const lon = zone.lon + (Math.random() - 0.5) * 2;
      
      events.push({
        id: `conflict-${index}-${Date.now()}`,
        type,
        location: zone.region,
        coordinates: [lon, lat],
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} reported in ${zone.region}`,
        time: Date.now() - Math.random() * 3600000 * 6, // Within last 6 hours
        severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        source: 'Conflict Monitor'
      });
    });
    
    return events;
  }
}
