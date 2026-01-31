import { TacticalUnit, TacticalZone, TacticalOrder } from './types';

export interface CombatResult {
  attackerLosses: number;
  defenderLosses: number;
  victory: 'attacker' | 'defender' | 'draw';
  description: string;
}

export interface SimulationStep {
  timestamp: Date;
  description: string;
  units: TacticalUnit[];
  combatResults?: CombatResult[];
  phase: 'preparation' | 'movement' | 'combat' | 'resolution';
}

// Combat power calculation based on unit type and strength
export const calculateCombatPower = (unit: TacticalUnit): number => {
  const basePower: Record<string, number> = {
    infantry: 10,
    armor: 25,
    artillery: 30,
    air_defense: 15,
    logistics: 2,
    command: 5,
    recon: 8,
    comms_jammer: 12,
    comms_relay: 3,
    satcom: 2,
  };
  
  const base = basePower[unit.type] || 10;
  const strengthMultiplier = unit.strength / 100;
  const statusMultiplier = unit.status === 'damaged' ? 0.5 : unit.status === 'destroyed' ? 0 : 1;
  
  return Math.round(base * strengthMultiplier * statusMultiplier);
};

// Calculate distance between two positions in km
export const calculateDistance = (pos1: [number, number], pos2: [number, number]): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
  const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if unit can engage target
export const canEngage = (attacker: TacticalUnit, target: TacticalUnit): boolean => {
  if (attacker.status === 'destroyed' || target.status === 'destroyed') return false;
  const distance = calculateDistance(attacker.position, target.position);
  const range = attacker.effectiveRange || 10;
  return distance <= range;
};

// Simulate combat between two units
export const simulateCombat = (attacker: TacticalUnit, defender: TacticalUnit): CombatResult => {
  const attackPower = calculateCombatPower(attacker);
  const defensePower = calculateCombatPower(defender);
  
  // Add randomness
  const attackRoll = attackPower * (0.7 + Math.random() * 0.6);
  const defenseRoll = defensePower * (0.7 + Math.random() * 0.6);
  
  // Calculate losses
  const attackerLosses = Math.min(100, Math.round((defenseRoll / attackPower) * 15));
  const defenderLosses = Math.min(100, Math.round((attackRoll / defensePower) * 20));
  
  const victory = attackRoll > defenseRoll * 1.2 
    ? 'attacker' 
    : defenseRoll > attackRoll * 1.2 
      ? 'defender' 
      : 'draw';
  
  return {
    attackerLosses,
    defenderLosses,
    victory,
    description: `${attacker.callsign} ปะทะ ${defender.callsign}: ${
      victory === 'attacker' ? 'ฝ่ายโจมตีชนะ' : 
      victory === 'defender' ? 'ฝ่ายป้องกันชนะ' : 'ผลเสมอ'
    }`,
  };
};

// Apply combat results to units
export const applyCombatResults = (
  units: TacticalUnit[], 
  attackerId: string, 
  defenderId: string, 
  result: CombatResult
): TacticalUnit[] => {
  return units.map(unit => {
    if (unit.id === attackerId) {
      const newStrength = Math.max(0, unit.strength - result.attackerLosses);
      return {
        ...unit,
        strength: newStrength,
        status: newStrength <= 0 ? 'destroyed' : newStrength < 30 ? 'damaged' : unit.status,
      };
    }
    if (unit.id === defenderId) {
      const newStrength = Math.max(0, unit.strength - result.defenderLosses);
      return {
        ...unit,
        strength: newStrength,
        status: newStrength <= 0 ? 'destroyed' : newStrength < 30 ? 'damaged' : unit.status,
      };
    }
    return unit;
  });
};

// Move unit towards target position
export const moveUnit = (
  unit: TacticalUnit, 
  targetPosition: [number, number], 
  speedKmPerStep: number = 2
): TacticalUnit => {
  const distance = calculateDistance(unit.position, targetPosition);
  if (distance <= speedKmPerStep) {
    return { ...unit, position: targetPosition, status: 'active' };
  }
  
  const ratio = speedKmPerStep / distance;
  const newLat = unit.position[0] + (targetPosition[0] - unit.position[0]) * ratio;
  const newLng = unit.position[1] + (targetPosition[1] - unit.position[1]) * ratio;
  
  // Calculate heading
  const heading = Math.atan2(
    targetPosition[1] - unit.position[1],
    targetPosition[0] - unit.position[0]
  ) * 180 / Math.PI;
  
  return {
    ...unit,
    position: [newLat, newLng] as [number, number],
    heading: (heading + 360) % 360,
    status: 'moving',
    speed: speedKmPerStep * 10, // km/h approximation
  };
};

// Execute jamming effect
export const applyJammingEffect = (
  units: TacticalUnit[], 
  jammer: TacticalUnit
): { units: TacticalUnit[]; jammed: string[] } => {
  const jammedUnits: string[] = [];
  
  const updatedUnits = units.map(unit => {
    if (unit.affiliation === 'hostile' && unit.type.includes('comms')) {
      const distance = calculateDistance(jammer.position, unit.position);
      if (distance <= (jammer.effectiveRange || 20)) {
        jammedUnits.push(unit.callsign);
        return {
          ...unit,
          status: 'damaged' as const,
          strength: Math.max(0, unit.strength - 15),
        };
      }
    }
    return unit;
  });
  
  return { units: updatedUnits, jammed: jammedUnits };
};

// Generate AI tactical suggestion based on battlefield state
export const generateTacticalSuggestion = (
  units: TacticalUnit[],
  zones: TacticalZone[]
): string => {
  const friendly = units.filter(u => u.affiliation === 'friendly' && u.status !== 'destroyed');
  const hostile = units.filter(u => u.affiliation === 'hostile' && u.status !== 'destroyed');
  
  const friendlyPower = friendly.reduce((sum, u) => sum + calculateCombatPower(u), 0);
  const hostilePower = hostile.reduce((sum, u) => sum + calculateCombatPower(u), 0);
  
  const ratio = friendlyPower / Math.max(1, hostilePower);
  
  if (ratio > 1.5) {
    return 'แนะนำ: โจมตีเชิงรุก - กำลังพลเหนือกว่าศัตรู';
  } else if (ratio > 1) {
    return 'แนะนำ: ปฏิบัติการจำกัด - กำลังพลใกล้เคียงกัน';
  } else {
    return 'แนะนำ: ตั้งรับ - กำลังพลศัตรูเหนือกว่า';
  }
};
