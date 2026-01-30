// Tactical Command Map Types - Palantir AIP Defense Style

export type UnitType = 
  | 'infantry' 
  | 'armor' 
  | 'artillery' 
  | 'air_defense' 
  | 'logistics' 
  | 'command' 
  | 'recon' 
  | 'comms_jammer' 
  | 'comms_relay' 
  | 'satcom';

export type UnitAffiliation = 'friendly' | 'hostile' | 'neutral' | 'unknown';

export type UnitStatus = 'active' | 'standby' | 'engaging' | 'moving' | 'damaged' | 'destroyed';

export interface TacticalUnit {
  id: string;
  name: string;
  callsign: string;
  type: UnitType;
  affiliation: UnitAffiliation;
  status: UnitStatus;
  position: [number, number]; // [lat, lng]
  heading: number; // 0-360
  speed: number; // km/h
  strength: number; // 0-100%
  equipment?: string[];
  subordinateOf?: string;
  areaOfInterest?: [number, number][]; // polygon
  effectiveRange?: number; // km
  lastUpdate: Date;
}

export interface TacticalZone {
  id: string;
  name: string;
  type: 'control' | 'contested' | 'hostile' | 'restricted' | 'objective';
  polygon: [number, number][];
  color?: string;
  opacity?: number;
}

export interface TacticalOrder {
  id: string;
  type: 'move' | 'attack' | 'defend' | 'support' | 'jam' | 'recon' | 'withdraw';
  targetUnit?: string;
  targetPosition?: [number, number];
  targetZone?: string;
  issuedAt: Date;
  issuedBy: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface TacticalProposal {
  id: string;
  title: string;
  description: string;
  orders: Partial<TacticalOrder>[];
  status: 'pending' | 'approved' | 'rejected' | 'executing';
  createdAt: Date;
  createdBy: string;
  aiConfidence: number; // 0-100
  riskAssessment: 'low' | 'medium' | 'high';
  estimatedCasualties?: number;
  successProbability?: number;
}

export interface TacticalMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  proposal?: TacticalProposal;
  attachedUnits?: string[];
}

export interface BattlefieldState {
  units: TacticalUnit[];
  zones: TacticalZone[];
  orders: TacticalOrder[];
  messages: TacticalMessage[];
  selectedUnitId?: string;
  activeProposal?: TacticalProposal;
  simulationTime: Date;
  isSimulating: boolean;
}

// Unit type configurations
export const UNIT_CONFIGS: Record<UnitType, {
  icon: string;
  color: string;
  defaultRange: number;
  category: string;
}> = {
  infantry: { icon: '👥', color: '#3b82f6', defaultRange: 5, category: 'Ground' },
  armor: { icon: '🛡️', color: '#22c55e', defaultRange: 10, category: 'Ground' },
  artillery: { icon: '💥', color: '#ef4444', defaultRange: 30, category: 'Fire Support' },
  air_defense: { icon: '🛡️', color: '#8b5cf6', defaultRange: 50, category: 'Air Defense' },
  logistics: { icon: '📦', color: '#f59e0b', defaultRange: 0, category: 'Support' },
  command: { icon: '⭐', color: '#fbbf24', defaultRange: 0, category: 'Command' },
  recon: { icon: '👁️', color: '#06b6d4', defaultRange: 15, category: 'Intel' },
  comms_jammer: { icon: '📡', color: '#ec4899', defaultRange: 20, category: 'EW' },
  comms_relay: { icon: '📶', color: '#10b981', defaultRange: 50, category: 'Comms' },
  satcom: { icon: '🛰️', color: '#6366f1', defaultRange: 100, category: 'Comms' },
};

export const AFFILIATION_COLORS: Record<UnitAffiliation, { fill: string; stroke: string }> = {
  friendly: { fill: '#3b82f6', stroke: '#1d4ed8' },
  hostile: { fill: '#ef4444', stroke: '#b91c1c' },
  neutral: { fill: '#22c55e', stroke: '#15803d' },
  unknown: { fill: '#f59e0b', stroke: '#d97706' },
};
