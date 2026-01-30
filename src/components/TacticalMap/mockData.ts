import { TacticalUnit, TacticalZone, UnitAffiliation, UnitType, UnitStatus } from './types';

// Generate realistic tactical units for demonstration
export const generateMockUnits = (): TacticalUnit[] => {
  const units: TacticalUnit[] = [];
  
  // Friendly forces - Blue team
  const friendlyUnits: Partial<TacticalUnit>[] = [
    { name: 'Military Command', callsign: 'ALPHA-6', type: 'command', position: [15.05, 102.95], heading: 0 },
    { name: 'Comms Facility', callsign: 'SIGNAL-1', type: 'comms_relay', position: [14.92, 102.88], heading: 45 },
    { name: '159th Artillery BN', callsign: 'THUNDER-1', type: 'artillery', position: [14.78, 102.55], heading: 90 },
    { name: 'Team Foxtrot', callsign: 'FOXTROT-6', type: 'infantry', position: [14.72, 102.68], heading: 45 },
    { name: '72nd Armor Brigade', callsign: 'STEEL-6', type: 'armor', position: [14.65, 102.75], heading: 60 },
    { name: 'Team Omega', callsign: 'OMEGA-1', type: 'infantry', position: [14.90, 103.05], heading: 270 },
    { name: 'Comms Jammer 2521-PN', callsign: 'SHADOW-1', type: 'comms_jammer', position: [15.10, 102.70], heading: 180 },
    { name: 'Comms Jammer 1150-FQ', callsign: 'SHADOW-2', type: 'comms_jammer', position: [15.00, 102.60], heading: 135 },
    { name: 'Air Defense Battery', callsign: 'AEGIS-1', type: 'air_defense', position: [14.88, 102.98], heading: 0 },
    { name: 'Recon Team Delta', callsign: 'DELTA-1', type: 'recon', position: [14.95, 102.40], heading: 90 },
  ];

  friendlyUnits.forEach((unit, idx) => {
    units.push({
      id: `friendly-${idx}`,
      name: unit.name!,
      callsign: unit.callsign!,
      type: unit.type!,
      affiliation: 'friendly',
      status: 'active',
      position: unit.position!,
      heading: unit.heading!,
      speed: 0,
      strength: 85 + Math.random() * 15,
      lastUpdate: new Date(),
      effectiveRange: unit.type === 'artillery' ? 30 : unit.type === 'air_defense' ? 50 : 10,
    });
  });

  // Hostile forces - Red team
  const hostileUnits: Partial<TacticalUnit>[] = [
    { name: 'Confirmed Armor Attack BN', callsign: 'RED-ARMOR-1', type: 'armor', position: [15.02, 103.08], heading: 225 },
    { name: '#2593 / Comms Relay Device', callsign: 'RED-COMMS-1', type: 'comms_relay', position: [15.15, 103.00], heading: 180 },
    { name: '#2593 / SATCOM Unit RP905', callsign: 'RED-SAT-1', type: 'satcom', position: [15.20, 102.95], heading: 0 },
    { name: '#2593 / Communications Equip', callsign: 'RED-COMMS-2', type: 'comms_relay', position: [15.25, 102.90], heading: 270 },
    { name: 'Hostile Jammer', callsign: 'RED-JAM-1', type: 'comms_jammer', position: [14.98, 102.85], heading: 135 },
    { name: 'Power Plant', callsign: 'RED-INFRA-1', type: 'logistics', position: [14.92, 103.10], heading: 0 },
    { name: 'Streltsyk', callsign: 'RED-INF-1', type: 'infantry', position: [14.88, 103.02], heading: 180 },
  ];

  hostileUnits.forEach((unit, idx) => {
    units.push({
      id: `hostile-${idx}`,
      name: unit.name!,
      callsign: unit.callsign!,
      type: unit.type!,
      affiliation: 'hostile',
      status: Math.random() > 0.3 ? 'active' : 'moving',
      position: unit.position!,
      heading: unit.heading!,
      speed: Math.random() > 0.5 ? Math.random() * 20 : 0,
      strength: 60 + Math.random() * 40,
      lastUpdate: new Date(),
      effectiveRange: unit.type === 'artillery' ? 25 : 8,
    });
  });

  return units;
};

export const generateMockZones = (): TacticalZone[] => {
  return [
    {
      id: 'zone-1',
      name: 'Alpha Control Zone',
      type: 'control',
      polygon: [
        [14.60, 102.50],
        [14.80, 102.50],
        [14.80, 102.80],
        [14.60, 102.80],
      ],
      color: '#3b82f6',
      opacity: 0.2,
    },
    {
      id: 'zone-2',
      name: 'Contested Area',
      type: 'contested',
      polygon: [
        [14.80, 102.70],
        [15.10, 102.70],
        [15.10, 103.00],
        [14.80, 103.00],
      ],
      color: '#f59e0b',
      opacity: 0.25,
    },
    {
      id: 'zone-3',
      name: 'Hostile Territory',
      type: 'hostile',
      polygon: [
        [14.85, 102.95],
        [15.30, 102.85],
        [15.30, 103.20],
        [14.85, 103.15],
      ],
      color: '#ef4444',
      opacity: 0.2,
    },
    {
      id: 'zone-4',
      name: 'Primary Objective',
      type: 'objective',
      polygon: [
        [15.10, 102.90],
        [15.20, 102.90],
        [15.20, 103.05],
        [15.10, 103.05],
      ],
      color: '#8b5cf6',
      opacity: 0.4,
    },
  ];
};

// Initial AI greeting message
export const getInitialMessages = () => [
  {
    id: 'msg-1',
    role: 'system' as const,
    content: 'ABLE Tactical AI พร้อมปฏิบัติการ กำลังวิเคราะห์สถานการณ์สนามรบ...',
    timestamp: new Date(),
  },
  {
    id: 'msg-2',
    role: 'ai' as const,
    content: `สถานการณ์ปัจจุบัน:

📊 **Battlefield Overview**
- กำลังพลฝ่ายเรา: 10 หน่วย (Active)
- กำลังพลศัตรู: 7 หน่วย (Detected)
- พื้นที่ควบคุม: 2 โซน
- พื้นที่ขัดแย้ง: 1 โซน

⚠️ **Threat Assessment**
- ตรวจพบ Armor Attack BN ของศัตรูเคลื่อนที่เข้ามาจากทิศตะวันออกเฉียงเหนือ
- ระบบสื่อสารของศัตรู (#2593) กำลังใช้งานอยู่
- แนะนำให้ใช้ Comms Jammer เพื่อทำลายการสื่อสารของศัตรู

พิมพ์คำสั่งหรือถามคำถามเพื่อดำเนินการ`,
    timestamp: new Date(),
  },
];
