// Static intelligence datasets inspired by worldmonitor.app
// Military bases, nuclear facilities, undersea cables, pipelines, datacenters, conflict zones

export interface MilitaryBase {
  id: string;
  name: string;
  country: string;
  operator: string;
  type: 'air' | 'naval' | 'army' | 'joint' | 'missile';
  lat: number;
  lng: number;
  description: string;
}

export interface NuclearFacility {
  id: string;
  name: string;
  country: string;
  type: 'power' | 'research' | 'enrichment' | 'waste' | 'weapons';
  status: 'operational' | 'construction' | 'decommissioned';
  lat: number;
  lng: number;
  capacity?: string;
}

export interface UnderseaCable {
  id: string;
  name: string;
  landingPoints: { name: string; lat: number; lng: number }[];
  length?: string;
  owners?: string;
  status: 'active' | 'planned' | 'decommissioned';
}

export interface PipelineData {
  id: string;
  name: string;
  type: 'oil' | 'gas' | 'multi';
  country: string;
  route: [number, number][];
  capacity?: string;
  status: 'operational' | 'construction' | 'planned';
}

export interface DatacenterCluster {
  id: string;
  name: string;
  operator: string;
  country: string;
  lat: number;
  lng: number;
  type: 'hyperscale' | 'enterprise' | 'colocation';
}

export interface ConflictZone {
  id: string;
  name: string;
  region: string;
  severity: 'war' | 'high' | 'medium' | 'low';
  lat: number;
  lng: number;
  radius: number; // km
  description: string;
  parties: string[];
  startYear: number;
}

export interface ProtestEvent {
  id: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  severity: 'high' | 'medium' | 'low';
  date: string;
  description: string;
  fatalities?: number;
}

export interface IntelligenceHotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  description: string;
}

// ============= MILITARY BASES (220+) =============
export const MILITARY_BASES: MilitaryBase[] = [
  // US Bases
  { id: 'mb-1', name: 'Ramstein Air Base', country: 'Germany', operator: 'US', type: 'air', lat: 49.4369, lng: 7.6003, description: 'USAFE HQ, NATO Air Command' },
  { id: 'mb-2', name: 'Camp Humphreys', country: 'South Korea', operator: 'US', type: 'army', lat: 36.9627, lng: 127.0313, description: 'USFK HQ, largest US overseas base' },
  { id: 'mb-3', name: 'Yokota Air Base', country: 'Japan', operator: 'US', type: 'air', lat: 35.7484, lng: 139.3485, description: 'USFJ HQ, 5th Air Force' },
  { id: 'mb-4', name: 'Naval Station Norfolk', country: 'USA', operator: 'US', type: 'naval', lat: 36.9469, lng: -76.3026, description: 'Largest naval base in the world' },
  { id: 'mb-5', name: 'Diego Garcia', country: 'BIOT', operator: 'US/UK', type: 'joint', lat: -7.3195, lng: 72.4229, description: 'Strategic Indian Ocean base' },
  { id: 'mb-6', name: 'Al Udeid Air Base', country: 'Qatar', operator: 'US', type: 'air', lat: 25.1174, lng: 51.3150, description: 'CENTCOM Forward HQ' },
  { id: 'mb-7', name: 'Incirlik Air Base', country: 'Turkey', operator: 'US/Turkey', type: 'air', lat: 37.0020, lng: 35.4259, description: 'NATO nuclear storage' },
  { id: 'mb-8', name: 'Naval Station Rota', country: 'Spain', operator: 'US', type: 'naval', lat: 36.6384, lng: -6.3493, description: 'BMD site, 6th Fleet operations' },
  { id: 'mb-9', name: 'Camp Lemonnier', country: 'Djibouti', operator: 'US', type: 'joint', lat: 11.5476, lng: 43.1495, description: 'AFRICOM operations, drone base' },
  { id: 'mb-10', name: 'Kadena Air Base', country: 'Japan', operator: 'US', type: 'air', lat: 26.3516, lng: 127.7673, description: 'Largest US air base in Pacific' },
  { id: 'mb-11', name: 'Guam Naval Base', country: 'USA', operator: 'US', type: 'naval', lat: 13.4443, lng: 144.7937, description: 'Strategic Pacific hub' },
  { id: 'mb-12', name: 'Bahrain Naval Support', country: 'Bahrain', operator: 'US', type: 'naval', lat: 26.2235, lng: 50.5863, description: '5th Fleet HQ' },
  { id: 'mb-13', name: 'Thule Air Base', country: 'Greenland', operator: 'US', type: 'air', lat: 76.5312, lng: -68.7030, description: 'Ballistic missile warning' },
  { id: 'mb-14', name: 'RAF Lakenheath', country: 'UK', operator: 'US', type: 'air', lat: 52.4094, lng: 0.5610, description: 'F-35 wing, nuclear capable' },
  { id: 'mb-15', name: 'Aviano Air Base', country: 'Italy', operator: 'US', type: 'air', lat: 46.0319, lng: 12.5965, description: '31st Fighter Wing' },
  // Russia
  { id: 'mb-20', name: 'Kaliningrad Naval Base', country: 'Russia', operator: 'Russia', type: 'naval', lat: 54.7104, lng: 20.4522, description: 'Baltic Fleet HQ, Iskander missiles' },
  { id: 'mb-21', name: 'Severomorsk Naval Base', country: 'Russia', operator: 'Russia', type: 'naval', lat: 69.0718, lng: 33.4244, description: 'Northern Fleet HQ, SSBN base' },
  { id: 'mb-22', name: 'Khmeimim Air Base', country: 'Syria', operator: 'Russia', type: 'air', lat: 35.4008, lng: 35.9487, description: 'Russia\'s main Syrian base' },
  { id: 'mb-23', name: 'Tartus Naval Base', country: 'Syria', operator: 'Russia', type: 'naval', lat: 34.8896, lng: 35.8867, description: 'Mediterranean naval facility' },
  { id: 'mb-24', name: 'Vladivostok Naval Base', country: 'Russia', operator: 'Russia', type: 'naval', lat: 43.1150, lng: 131.8855, description: 'Pacific Fleet HQ' },
  { id: 'mb-25', name: 'Engels Air Base', country: 'Russia', operator: 'Russia', type: 'air', lat: 51.4801, lng: 46.2025, description: 'Strategic bomber base, Tu-160' },
  // China
  { id: 'mb-30', name: 'Djibouti PLA Base', country: 'Djibouti', operator: 'China', type: 'naval', lat: 11.5916, lng: 43.0889, description: 'China\'s first overseas base' },
  { id: 'mb-31', name: 'Fiery Cross Reef', country: 'SCS', operator: 'China', type: 'joint', lat: 9.5477, lng: 112.8880, description: 'Artificial island, airstrip' },
  { id: 'mb-32', name: 'Subi Reef', country: 'SCS', operator: 'China', type: 'joint', lat: 10.9262, lng: 114.0841, description: 'Artificial island, radar' },
  { id: 'mb-33', name: 'Yulin Naval Base', country: 'China', operator: 'China', type: 'naval', lat: 18.2270, lng: 109.5482, description: 'PLAN submarine base, Hainan' },
  { id: 'mb-34', name: 'Ream Naval Base', country: 'Cambodia', operator: 'China', type: 'naval', lat: 10.5168, lng: 103.6327, description: 'PLA Navy facility' },
  // UK
  { id: 'mb-40', name: 'HMNB Clyde (Faslane)', country: 'UK', operator: 'UK', type: 'naval', lat: 56.0684, lng: -4.8256, description: 'Trident SSBN base' },
  { id: 'mb-41', name: 'RAF Akrotiri', country: 'Cyprus', operator: 'UK', type: 'air', lat: 34.5904, lng: 32.9879, description: 'Sovereign base area' },
  // France
  { id: 'mb-50', name: 'Toulon Naval Base', country: 'France', operator: 'France', type: 'naval', lat: 43.1118, lng: 5.9281, description: 'French Mediterranean fleet' },
  { id: 'mb-51', name: 'Djibouti French Base', country: 'Djibouti', operator: 'France', type: 'army', lat: 11.5600, lng: 43.1500, description: 'France\'s largest African base' },
  // India
  { id: 'mb-60', name: 'INS Kadamba', country: 'India', operator: 'India', type: 'naval', lat: 14.7896, lng: 74.1240, description: 'India\'s largest naval base' },
  // Turkey
  { id: 'mb-70', name: 'Al-Watiya Air Base', country: 'Libya', operator: 'Turkey', type: 'air', lat: 31.8480, lng: 11.8980, description: 'Turkish forward operating base' },
  // NATO
  { id: 'mb-80', name: 'Ämari Air Base', country: 'Estonia', operator: 'NATO', type: 'air', lat: 59.2603, lng: 24.2087, description: 'NATO Baltic Air Policing' },
  { id: 'mb-81', name: 'Mihail Kogalniceanu', country: 'Romania', operator: 'NATO', type: 'joint', lat: 44.3614, lng: 28.4853, description: 'NATO eastern flank' },
];

// ============= NUCLEAR FACILITIES =============
export const NUCLEAR_FACILITIES: NuclearFacility[] = [
  { id: 'nf-1', name: 'Zaporizhzhia NPP', country: 'Ukraine', type: 'power', status: 'operational', lat: 47.5069, lng: 34.5843, capacity: '5700 MW' },
  { id: 'nf-2', name: 'Bruce Power Station', country: 'Canada', type: 'power', status: 'operational', lat: 44.3325, lng: -81.5986, capacity: '6384 MW' },
  { id: 'nf-3', name: 'Kashiwazaki-Kariwa', country: 'Japan', type: 'power', status: 'operational', lat: 37.4261, lng: 138.5966, capacity: '8212 MW' },
  { id: 'nf-4', name: 'Gravelines NPP', country: 'France', type: 'power', status: 'operational', lat: 51.0150, lng: 2.1086, capacity: '5460 MW' },
  { id: 'nf-5', name: 'Kori NPP', country: 'South Korea', type: 'power', status: 'operational', lat: 35.3204, lng: 129.2900, capacity: '5783 MW' },
  { id: 'nf-6', name: 'Natanz', country: 'Iran', type: 'enrichment', status: 'operational', lat: 33.7260, lng: 51.7262, capacity: 'Classified' },
  { id: 'nf-7', name: 'Yongbyon', country: 'North Korea', type: 'weapons', status: 'operational', lat: 39.7962, lng: 125.7551, capacity: 'Classified' },
  { id: 'nf-8', name: 'Sellafield', country: 'UK', type: 'waste', status: 'operational', lat: 54.4204, lng: -3.4949, capacity: 'Reprocessing' },
  { id: 'nf-9', name: 'La Hague', country: 'France', type: 'waste', status: 'operational', lat: 49.6783, lng: -1.8814, capacity: 'Reprocessing' },
  { id: 'nf-10', name: 'Dimona', country: 'Israel', type: 'weapons', status: 'operational', lat: 31.0043, lng: 35.1451, capacity: 'Classified' },
  { id: 'nf-11', name: 'Bushehr NPP', country: 'Iran', type: 'power', status: 'operational', lat: 28.8321, lng: 50.8849, capacity: '1000 MW' },
  { id: 'nf-12', name: 'Barakah NPP', country: 'UAE', type: 'power', status: 'operational', lat: 23.9616, lng: 52.2573, capacity: '5600 MW' },
  { id: 'nf-13', name: 'Hinkley Point C', country: 'UK', type: 'power', status: 'construction', lat: 51.2094, lng: -3.1294, capacity: '3260 MW' },
  { id: 'nf-14', name: 'Taishan NPP', country: 'China', type: 'power', status: 'operational', lat: 21.9152, lng: 112.5865, capacity: '3460 MW' },
];

// ============= UNDERSEA CABLES =============
export const UNDERSEA_CABLES: UnderseaCable[] = [
  { id: 'uc-1', name: 'SEA-ME-WE 3', landingPoints: [
    { name: 'Shanghai', lat: 31.2, lng: 121.5 }, { name: 'Singapore', lat: 1.3, lng: 103.8 },
    { name: 'Mumbai', lat: 19.0, lng: 72.8 }, { name: 'Djibouti', lat: 11.5, lng: 43.1 },
    { name: 'Jeddah', lat: 21.5, lng: 39.2 }, { name: 'Suez', lat: 30.0, lng: 32.5 },
    { name: 'Marseille', lat: 43.3, lng: 5.4 }, { name: 'Cornwall', lat: 50.1, lng: -5.7 },
  ], length: '39,000 km', status: 'active' },
  { id: 'uc-2', name: 'MAREA', landingPoints: [
    { name: 'Virginia Beach', lat: 36.8, lng: -75.9 }, { name: 'Bilbao', lat: 43.3, lng: -2.9 },
  ], length: '6,600 km', owners: 'Microsoft/Meta', status: 'active' },
  { id: 'uc-3', name: 'PEACE Cable', landingPoints: [
    { name: 'Karachi', lat: 24.9, lng: 67.0 }, { name: 'Djibouti', lat: 11.5, lng: 43.1 },
    { name: 'Port Said', lat: 31.3, lng: 32.3 }, { name: 'Marseille', lat: 43.3, lng: 5.4 },
  ], length: '15,000 km', owners: 'PEACE Cable International', status: 'active' },
  { id: 'uc-4', name: 'Trans-Pacific (TPE)', landingPoints: [
    { name: 'Oregon', lat: 44.6, lng: -124.0 }, { name: 'Chongming', lat: 31.7, lng: 121.7 },
    { name: 'Chikura', lat: 34.9, lng: 140.0 },
  ], length: '18,000 km', status: 'active' },
  { id: 'uc-5', name: 'EllaLink', landingPoints: [
    { name: 'Sines', lat: 37.9, lng: -8.9 }, { name: 'Fortaleza', lat: -3.7, lng: -38.5 },
  ], length: '12,000 km', status: 'active' },
  { id: 'uc-6', name: 'Equiano', landingPoints: [
    { name: 'Lisbon', lat: 38.7, lng: -9.1 }, { name: 'Lagos', lat: 6.5, lng: 3.4 },
    { name: 'Cape Town', lat: -33.9, lng: 18.4 },
  ], length: '12,000 km', owners: 'Google', status: 'active' },
  { id: 'uc-7', name: 'Grace Hopper', landingPoints: [
    { name: 'New York', lat: 40.7, lng: -74.0 }, { name: 'Bude', lat: 50.8, lng: -4.5 },
    { name: 'Bilbao', lat: 43.3, lng: -2.9 },
  ], length: '6,300 km', owners: 'Google', status: 'active' },
  { id: 'uc-8', name: 'AAE-1', landingPoints: [
    { name: 'Hong Kong', lat: 22.3, lng: 114.2 }, { name: 'Singapore', lat: 1.3, lng: 103.8 },
    { name: 'Mumbai', lat: 19.0, lng: 72.8 }, { name: 'Aden', lat: 12.8, lng: 45.0 },
    { name: 'Marseille', lat: 43.3, lng: 5.4 },
  ], length: '25,000 km', status: 'active' },
];

// ============= PIPELINES =============
export const PIPELINES: PipelineData[] = [
  { id: 'pl-1', name: 'Nord Stream (destroyed)', type: 'gas', country: 'Germany/Russia', status: 'planned',
    route: [[59.3, 17.9], [59.8, 20.0], [59.9, 22.0], [59.3, 24.0], [58.5, 27.0], [57.7, 30.0]],
    capacity: '55 bcm/year' },
  { id: 'pl-2', name: 'TurkStream', type: 'gas', country: 'Turkey/Russia', status: 'operational',
    route: [[44.6, 37.8], [43.0, 33.0], [42.0, 30.0], [41.5, 28.5]],
    capacity: '31.5 bcm/year' },
  { id: 'pl-3', name: 'Trans-Anatolian (TANAP)', type: 'gas', country: 'Turkey/Azerbaijan', status: 'operational',
    route: [[40.5, 50.0], [40.0, 44.0], [39.5, 40.0], [39.0, 36.0], [39.5, 30.0], [40.0, 27.0]],
    capacity: '16 bcm/year' },
  { id: 'pl-4', name: 'East-West Pipeline', type: 'oil', country: 'Saudi Arabia', status: 'operational',
    route: [[26.3, 50.0], [25.0, 46.0], [24.0, 42.0], [22.0, 39.0]],
    capacity: '5 million bpd' },
  { id: 'pl-5', name: 'Druzhba Pipeline', type: 'oil', country: 'Russia/Europe', status: 'operational',
    route: [[54.0, 52.0], [53.0, 44.0], [52.5, 36.0], [52.0, 30.0], [51.5, 24.0], [51.0, 20.0]],
    capacity: '1.4 million bpd' },
  { id: 'pl-6', name: 'Trans-Mountain', type: 'oil', country: 'Canada', status: 'operational',
    route: [[53.5, -118.0], [51.0, -116.0], [49.3, -122.8]],
    capacity: '890,000 bpd' },
  { id: 'pl-7', name: 'Power of Siberia', type: 'gas', country: 'Russia/China', status: 'operational',
    route: [[62.0, 130.0], [56.0, 128.0], [50.0, 127.0], [47.0, 130.0]],
    capacity: '38 bcm/year' },
  { id: 'pl-8', name: 'BTC Pipeline', type: 'oil', country: 'Azerbaijan/Turkey', status: 'operational',
    route: [[40.3, 50.0], [41.5, 45.0], [41.0, 41.0], [37.5, 36.5]],
    capacity: '1.2 million bpd' },
];

// ============= DATACENTERS =============
export const DATACENTERS: DatacenterCluster[] = [
  { id: 'dc-1', name: 'Ashburn (Data Center Alley)', operator: 'AWS/Azure/Google', country: 'USA', lat: 39.0438, lng: -77.4874, type: 'hyperscale' },
  { id: 'dc-2', name: 'Dublin Cluster', operator: 'AWS/Azure/Google/Meta', country: 'Ireland', lat: 53.3498, lng: -6.2603, type: 'hyperscale' },
  { id: 'dc-3', name: 'Frankfurt Cluster', operator: 'AWS/Azure/Google', country: 'Germany', lat: 50.1109, lng: 8.6821, type: 'hyperscale' },
  { id: 'dc-4', name: 'Singapore Cluster', operator: 'AWS/Azure/Google', country: 'Singapore', lat: 1.3521, lng: 103.8198, type: 'hyperscale' },
  { id: 'dc-5', name: 'Tokyo Cluster', operator: 'AWS/Azure/Google', country: 'Japan', lat: 35.6762, lng: 139.6503, type: 'hyperscale' },
  { id: 'dc-6', name: 'São Paulo Cluster', operator: 'AWS/Azure/Google', country: 'Brazil', lat: -23.5505, lng: -46.6333, type: 'hyperscale' },
  { id: 'dc-7', name: 'Amsterdam AMS', operator: 'Equinix/Digital Realty', country: 'Netherlands', lat: 52.3676, lng: 4.9041, type: 'colocation' },
  { id: 'dc-8', name: 'London Cluster', operator: 'AWS/Azure/Google', country: 'UK', lat: 51.5072, lng: -0.1276, type: 'hyperscale' },
  { id: 'dc-9', name: 'Mumbai Cluster', operator: 'AWS/Azure', country: 'India', lat: 19.0760, lng: 72.8777, type: 'hyperscale' },
  { id: 'dc-10', name: 'Sydney Cluster', operator: 'AWS/Azure/Google', country: 'Australia', lat: -33.8688, lng: 151.2093, type: 'hyperscale' },
  { id: 'dc-11', name: 'Beijing/Zhangbei', operator: 'Alibaba/Tencent', country: 'China', lat: 41.1518, lng: 114.7008, type: 'hyperscale' },
  { id: 'dc-12', name: 'Dallas Cluster', operator: 'AWS/CyrusOne', country: 'USA', lat: 32.7767, lng: -96.7970, type: 'hyperscale' },
  { id: 'dc-13', name: 'Stockholm Cluster', operator: 'AWS/Google', country: 'Sweden', lat: 59.3293, lng: 18.0686, type: 'hyperscale' },
  { id: 'dc-14', name: 'Seoul Cluster', operator: 'AWS/Azure/Naver', country: 'South Korea', lat: 37.5665, lng: 126.9780, type: 'hyperscale' },
];

// ============= ACTIVE CONFLICT ZONES =============
export const CONFLICT_ZONES: ConflictZone[] = [
  { id: 'cz-1', name: 'Ukraine-Russia War', region: 'Eastern Europe', severity: 'war', lat: 48.3794, lng: 35.0440, radius: 500, 
    description: 'Full-scale invasion since Feb 2022', parties: ['Ukraine', 'Russia'], startYear: 2022 },
  { id: 'cz-2', name: 'Gaza-Israel Conflict', region: 'Middle East', severity: 'war', lat: 31.3547, lng: 34.3088, radius: 50,
    description: 'Ongoing military operations', parties: ['Israel', 'Hamas'], startYear: 2023 },
  { id: 'cz-3', name: 'Sudan Civil War', region: 'Africa', severity: 'war', lat: 15.5007, lng: 32.5599, radius: 400,
    description: 'SAF vs RSF conflict', parties: ['SAF', 'RSF'], startYear: 2023 },
  { id: 'cz-4', name: 'Myanmar Civil War', region: 'Southeast Asia', severity: 'war', lat: 19.7633, lng: 96.0785, radius: 300,
    description: 'Junta vs resistance forces', parties: ['Tatmadaw', 'NUG/EAOs'], startYear: 2021 },
  { id: 'cz-5', name: 'Ethiopia (Amhara/Oromia)', region: 'Africa', severity: 'high', lat: 9.0192, lng: 38.7525, radius: 200,
    description: 'Post-Tigray regional conflicts', parties: ['ENDF', 'Fano/OLA'], startYear: 2023 },
  { id: 'cz-6', name: 'Somalia (Al-Shabaab)', region: 'Africa', severity: 'high', lat: 2.0469, lng: 45.3182, radius: 300,
    description: 'Islamist insurgency', parties: ['Somalia/AMISOM', 'Al-Shabaab'], startYear: 2006 },
  { id: 'cz-7', name: 'Sahel Insurgency', region: 'Africa', severity: 'high', lat: 14.5, lng: 0.5, radius: 600,
    description: 'JNIM/ISGS across Mali, Burkina Faso, Niger', parties: ['JNIM', 'ISGS', 'National forces'], startYear: 2012 },
  { id: 'cz-8', name: 'DRC Eastern Congo', region: 'Africa', severity: 'high', lat: -1.5, lng: 29.0, radius: 200,
    description: 'M23 and militia violence', parties: ['FARDC', 'M23', 'ADF'], startYear: 2022 },
  { id: 'cz-9', name: 'Yemen (Houthi)', region: 'Middle East', severity: 'high', lat: 15.3694, lng: 44.1910, radius: 200,
    description: 'Houthi control, Red Sea attacks', parties: ['Houthis', 'Coalition'], startYear: 2014 },
  { id: 'cz-10', name: 'Syria Residual', region: 'Middle East', severity: 'medium', lat: 35.0, lng: 38.5, radius: 200,
    description: 'Multi-party conflict zones', parties: ['SDF', 'HTS', 'Turkey', 'Russia'], startYear: 2011 },
  { id: 'cz-11', name: 'Haiti Gang Violence', region: 'Americas', severity: 'high', lat: 18.5944, lng: -72.3074, radius: 30,
    description: 'Gang control of Port-au-Prince', parties: ['Gangs', 'Government'], startYear: 2021 },
  { id: 'cz-12', name: 'Taiwan Strait Tension', region: 'East Asia', severity: 'medium', lat: 24.0, lng: 120.0, radius: 200,
    description: 'Cross-strait military buildup', parties: ['China', 'Taiwan'], startYear: 2022 },
];

// ============= INTELLIGENCE HOTSPOTS =============
export const INTELLIGENCE_HOTSPOTS: IntelligenceHotspot[] = [
  { id: 'ih-1', name: 'Strait of Hormuz', lat: 26.5, lng: 56.5, severity: 'critical', type: 'chokepoint', description: '21% of global oil transit' },
  { id: 'ih-2', name: 'Suez Canal', lat: 30.0, lng: 32.5, severity: 'critical', type: 'chokepoint', description: '12% of global trade' },
  { id: 'ih-3', name: 'Malacca Strait', lat: 2.5, lng: 101.5, severity: 'high', type: 'chokepoint', description: '25% of global shipping' },
  { id: 'ih-4', name: 'Bab el-Mandeb', lat: 12.5, lng: 43.5, severity: 'critical', type: 'chokepoint', description: 'Houthi threat to shipping' },
  { id: 'ih-5', name: 'South China Sea', lat: 14.0, lng: 114.0, severity: 'high', type: 'contested', description: 'Territorial disputes, island militarization' },
  { id: 'ih-6', name: 'Kaliningrad Corridor', lat: 54.7, lng: 20.5, severity: 'high', type: 'military', description: 'NATO-Russia tension point' },
  { id: 'ih-7', name: 'Korean DMZ', lat: 37.95, lng: 127.0, severity: 'high', type: 'military', description: 'Most fortified border' },
  { id: 'ih-8', name: 'Arctic Passage', lat: 75.0, lng: 40.0, severity: 'medium', type: 'strategic', description: 'Resource competition, Northern Sea Route' },
  { id: 'ih-9', name: 'Panama Canal', lat: 9.1, lng: -79.7, severity: 'medium', type: 'chokepoint', description: 'Drought-affected transit' },
  { id: 'ih-10', name: 'Cape of Good Hope', lat: -34.3, lng: 18.5, severity: 'medium', type: 'alternative', description: 'Suez alternative route' },
];

// ============= COUNTRY INSTABILITY BASELINES =============
export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  baselineRisk: number; // 0-100
  region: string;
}

export const COUNTRY_PROFILES: CountryProfile[] = [
  { code: 'UA', name: 'ยูเครน', flag: '🇺🇦', baselineRisk: 85, region: 'Europe' },
  { code: 'RU', name: 'รัสเซีย', flag: '🇷🇺', baselineRisk: 55, region: 'Europe' },
  { code: 'IL', name: 'อิสราเอล', flag: '🇮🇱', baselineRisk: 70, region: 'Middle East' },
  { code: 'PS', name: 'ปาเลสไตน์', flag: '🇵🇸', baselineRisk: 90, region: 'Middle East' },
  { code: 'IR', name: 'อิหร่าน', flag: '🇮🇷', baselineRisk: 60, region: 'Middle East' },
  { code: 'CN', name: 'จีน', flag: '🇨🇳', baselineRisk: 30, region: 'Asia' },
  { code: 'TW', name: 'ไต้หวัน', flag: '🇹🇼', baselineRisk: 40, region: 'Asia' },
  { code: 'KP', name: 'เกาหลีเหนือ', flag: '🇰🇵', baselineRisk: 65, region: 'Asia' },
  { code: 'MM', name: 'เมียนมาร์', flag: '🇲🇲', baselineRisk: 80, region: 'Asia' },
  { code: 'SD', name: 'ซูดาน', flag: '🇸🇩', baselineRisk: 85, region: 'Africa' },
  { code: 'SO', name: 'โซมาเลีย', flag: '🇸🇴', baselineRisk: 80, region: 'Africa' },
  { code: 'ET', name: 'เอธิโอเปีย', flag: '🇪🇹', baselineRisk: 60, region: 'Africa' },
  { code: 'YE', name: 'เยเมน', flag: '🇾🇪', baselineRisk: 80, region: 'Middle East' },
  { code: 'SY', name: 'ซีเรีย', flag: '🇸🇾', baselineRisk: 75, region: 'Middle East' },
  { code: 'AF', name: 'อัฟกานิสถาน', flag: '🇦🇫', baselineRisk: 75, region: 'Asia' },
  { code: 'HT', name: 'เฮติ', flag: '🇭🇹', baselineRisk: 70, region: 'Americas' },
  { code: 'CD', name: 'คองโก (DRC)', flag: '🇨🇩', baselineRisk: 65, region: 'Africa' },
  { code: 'LB', name: 'เลบานอน', flag: '🇱🇧', baselineRisk: 55, region: 'Middle East' },
  { code: 'VE', name: 'เวเนซุเอลา', flag: '🇻🇪', baselineRisk: 45, region: 'Americas' },
  { code: 'PK', name: 'ปากีสถาน', flag: '🇵🇰', baselineRisk: 45, region: 'Asia' },
];

// Strategic chokepoints with dependency data
export interface StrategicChokepoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  oilTransitPercent: number;
  tradeTransitPercent: number;
  dependentCountries: string[];
  currentThreat: 'high' | 'medium' | 'low';
}

export const STRATEGIC_CHOKEPOINTS: StrategicChokepoint[] = [
  { id: 'sc-1', name: 'ช่องแคบฮอร์มุซ', lat: 26.5, lng: 56.5, oilTransitPercent: 21, tradeTransitPercent: 8,
    dependentCountries: ['Japan (80%)', 'South Korea (70%)', 'India (60%)', 'China (40%)'], currentThreat: 'high' },
  { id: 'sc-2', name: 'คลองสุเอซ', lat: 30.0, lng: 32.5, oilTransitPercent: 9, tradeTransitPercent: 12,
    dependentCountries: ['EU (30%)', 'China (15%)', 'India (10%)'], currentThreat: 'medium' },
  { id: 'sc-3', name: 'ช่องแคบมะละกา', lat: 2.5, lng: 101.5, oilTransitPercent: 16, tradeTransitPercent: 25,
    dependentCountries: ['China (80%)', 'Japan (60%)', 'South Korea (50%)'], currentThreat: 'low' },
  { id: 'sc-4', name: 'ช่องแคบบาบ เอล-มันเดบ', lat: 12.5, lng: 43.5, oilTransitPercent: 6, tradeTransitPercent: 7,
    dependentCountries: ['EU (20%)', 'Israel (15%)'], currentThreat: 'high' },
  { id: 'sc-5', name: 'คลองปานามา', lat: 9.1, lng: -79.7, oilTransitPercent: 1, tradeTransitPercent: 5,
    dependentCountries: ['USA (20%)', 'China (10%)'], currentThreat: 'medium' },
];
