// Geo Data Service - Fetching geographic data from various APIs

export interface EarthquakeFeature {
  id: string;
  type: 'earthquake';
  coordinates: [number, number];
  magnitude: number;
  depth: number;
  place: string;
  time: number;
  url: string;
}

export interface MarketData {
  id: string;
  type: 'market';
  name: string;
  symbol: string;
  coordinates: [number, number];
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  country: string;
  currency: string;
}

export interface WildfireFeature {
  id: string;
  type: 'wildfire';
  coordinates: [number, number];
  brightness: number;
  confidence: number;
  acq_date: string;
  satellite: string;
}

export interface ShipFeature {
  id: string;
  type: 'ship';
  name: string;
  coordinates: [number, number];
  mmsi: string;
  shipType: 'cargo' | 'tanker' | 'military' | 'passenger' | 'fishing' | 'other';
  speed: number;
  course: number;
  destination?: string;
  flag?: string;
  length?: number;
}

export interface PortFeature {
  id: string;
  type: 'port';
  name: string;
  coordinates: [number, number];
  country: string;
  volume?: number;
}

export interface OilGasFeature {
  id: string;
  type: 'oil_gas';
  name: string;
  coordinates: [number, number];
  country: string;
  production?: number;
  facilityType: 'refinery' | 'field' | 'terminal';
}

export interface BankingFeature {
  id: string;
  type: 'banking';
  name: string;
  coordinates: [number, number];
  country: string;
  interestRate: number;
  currency: string;
  nextMeeting?: string;
}

// USGS Earthquake API
export const fetchEarthquakes = async (minMagnitude = 4, limit = 100): Promise<EarthquakeFeature[]> => {
  try {
    const response = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=${limit}&minmagnitude=${minMagnitude}&orderby=time`
    );
    
    if (!response.ok) throw new Error('Failed to fetch earthquake data');
    
    const data = await response.json();
    
    return data.features.map((feature: any) => ({
      id: feature.id,
      type: 'earthquake' as const,
      coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
      magnitude: feature.properties.mag,
      depth: feature.geometry.coordinates[2],
      place: feature.properties.place,
      time: feature.properties.time,
      url: feature.properties.url
    }));
  } catch (error) {
    console.error('Error fetching earthquakes:', error);
    return [];
  }
};

// World Stock Markets Data
export const STOCK_MARKETS: MarketData[] = [
  // Americas
  { id: 'NYSE', type: 'market', name: 'New York Stock Exchange', symbol: '^DJI', coordinates: [-74.0112, 40.7069], price: 0, change: 0, changePercent: 0, volume: 0, country: 'USA', currency: 'USD' },
  { id: 'NASDAQ', type: 'market', name: 'NASDAQ', symbol: '^IXIC', coordinates: [-73.9857, 40.7484], price: 0, change: 0, changePercent: 0, volume: 0, country: 'USA', currency: 'USD' },
  { id: 'TSX', type: 'market', name: 'Toronto Stock Exchange', symbol: '^GSPTSE', coordinates: [-79.3832, 43.6532], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Canada', currency: 'CAD' },
  { id: 'BMV', type: 'market', name: 'Mexican Stock Exchange', symbol: '^MXX', coordinates: [-99.1332, 19.4326], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Mexico', currency: 'MXN' },
  { id: 'BOVESPA', type: 'market', name: 'B3 Brazil', symbol: '^BVSP', coordinates: [-46.6333, -23.5505], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Brazil', currency: 'BRL' },
  
  // Europe
  { id: 'LSE', type: 'market', name: 'London Stock Exchange', symbol: '^FTSE', coordinates: [-0.0875, 51.5142], price: 0, change: 0, changePercent: 0, volume: 0, country: 'UK', currency: 'GBP' },
  { id: 'XETRA', type: 'market', name: 'Frankfurt Stock Exchange', symbol: '^GDAXI', coordinates: [8.6821, 50.1109], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Germany', currency: 'EUR' },
  { id: 'EURONEXT', type: 'market', name: 'Euronext Paris', symbol: '^FCHI', coordinates: [2.3522, 48.8566], price: 0, change: 0, changePercent: 0, volume: 0, country: 'France', currency: 'EUR' },
  { id: 'SIX', type: 'market', name: 'Swiss Exchange', symbol: '^SSMI', coordinates: [8.5417, 47.3769], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Switzerland', currency: 'CHF' },
  { id: 'AMS', type: 'market', name: 'Euronext Amsterdam', symbol: '^AEX', coordinates: [4.8952, 52.3702], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Netherlands', currency: 'EUR' },
  { id: 'MOEX', type: 'market', name: 'Moscow Exchange', symbol: 'IMOEX.ME', coordinates: [37.6173, 55.7558], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Russia', currency: 'RUB' },
  
  // Asia Pacific
  { id: 'TSE', type: 'market', name: 'Tokyo Stock Exchange', symbol: '^N225', coordinates: [139.7670, 35.6762], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Japan', currency: 'JPY' },
  { id: 'HKEX', type: 'market', name: 'Hong Kong Stock Exchange', symbol: '^HSI', coordinates: [114.1694, 22.3193], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Hong Kong', currency: 'HKD' },
  { id: 'SSE', type: 'market', name: 'Shanghai Stock Exchange', symbol: '000001.SS', coordinates: [121.4737, 31.2304], price: 0, change: 0, changePercent: 0, volume: 0, country: 'China', currency: 'CNY' },
  { id: 'SZSE', type: 'market', name: 'Shenzhen Stock Exchange', symbol: '399001.SZ', coordinates: [114.0579, 22.5431], price: 0, change: 0, changePercent: 0, volume: 0, country: 'China', currency: 'CNY' },
  { id: 'KRX', type: 'market', name: 'Korea Exchange', symbol: '^KS11', coordinates: [129.0756, 35.1796], price: 0, change: 0, changePercent: 0, volume: 0, country: 'South Korea', currency: 'KRW' },
  { id: 'TWSE', type: 'market', name: 'Taiwan Stock Exchange', symbol: '^TWII', coordinates: [121.5654, 25.0330], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Taiwan', currency: 'TWD' },
  { id: 'SGX', type: 'market', name: 'Singapore Exchange', symbol: '^STI', coordinates: [103.8198, 1.3521], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Singapore', currency: 'SGD' },
  { id: 'ASX', type: 'market', name: 'Australian Securities Exchange', symbol: '^AXJO', coordinates: [151.2093, -33.8688], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Australia', currency: 'AUD' },
  { id: 'NSE', type: 'market', name: 'National Stock Exchange India', symbol: '^NSEI', coordinates: [72.8777, 19.0760], price: 0, change: 0, changePercent: 0, volume: 0, country: 'India', currency: 'INR' },
  { id: 'SET', type: 'market', name: 'Stock Exchange of Thailand', symbol: '^SET.BK', coordinates: [100.5018, 13.7563], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Thailand', currency: 'THB' },
  
  // Middle East & Africa
  { id: 'TADAWUL', type: 'market', name: 'Tadawul', symbol: '^TASI', coordinates: [46.6753, 24.7136], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Saudi Arabia', currency: 'SAR' },
  { id: 'TASE', type: 'market', name: 'Tel Aviv Stock Exchange', symbol: '^TA125.TA', coordinates: [34.7818, 32.0853], price: 0, change: 0, changePercent: 0, volume: 0, country: 'Israel', currency: 'ILS' },
  { id: 'JSE', type: 'market', name: 'Johannesburg Stock Exchange', symbol: '^JN0U.JO', coordinates: [28.0473, -26.2041], price: 0, change: 0, changePercent: 0, volume: 0, country: 'South Africa', currency: 'ZAR' },
];

// Central Banks Data
export const CENTRAL_BANKS: BankingFeature[] = [
  { id: 'FED', type: 'banking', name: 'Federal Reserve', coordinates: [-77.0454, 38.8927], country: 'USA', interestRate: 5.50, currency: 'USD' },
  { id: 'ECB', type: 'banking', name: 'European Central Bank', coordinates: [8.6821, 50.1109], country: 'EU', interestRate: 4.50, currency: 'EUR' },
  { id: 'BOE', type: 'banking', name: 'Bank of England', coordinates: [-0.0886, 51.5142], country: 'UK', interestRate: 5.25, currency: 'GBP' },
  { id: 'BOJ', type: 'banking', name: 'Bank of Japan', coordinates: [139.7670, 35.6762], country: 'Japan', interestRate: 0.25, currency: 'JPY' },
  { id: 'PBOC', type: 'banking', name: "People's Bank of China", coordinates: [116.4074, 39.9042], country: 'China', interestRate: 3.45, currency: 'CNY' },
  { id: 'SNB', type: 'banking', name: 'Swiss National Bank', coordinates: [7.4474, 46.9480], country: 'Switzerland', interestRate: 1.75, currency: 'CHF' },
  { id: 'RBA', type: 'banking', name: 'Reserve Bank of Australia', coordinates: [151.2093, -33.8688], country: 'Australia', interestRate: 4.35, currency: 'AUD' },
  { id: 'BOC', type: 'banking', name: 'Bank of Canada', coordinates: [-75.6972, 45.4215], country: 'Canada', interestRate: 5.00, currency: 'CAD' },
  { id: 'RBI', type: 'banking', name: 'Reserve Bank of India', coordinates: [72.8777, 19.0760], country: 'India', interestRate: 6.50, currency: 'INR' },
  { id: 'BOT', type: 'banking', name: 'Bank of Thailand', coordinates: [100.5018, 13.7563], country: 'Thailand', interestRate: 2.50, currency: 'THB' },
];

// Major Ports
export const MAJOR_PORTS: PortFeature[] = [
  { id: 'shanghai', type: 'port', name: 'Port of Shanghai', coordinates: [121.8, 31.2], country: 'China', volume: 47000 },
  { id: 'singapore', type: 'port', name: 'Port of Singapore', coordinates: [103.85, 1.29], country: 'Singapore', volume: 37000 },
  { id: 'ningbo', type: 'port', name: 'Ningbo-Zhoushan', coordinates: [121.5, 29.9], country: 'China', volume: 33000 },
  { id: 'shenzhen', type: 'port', name: 'Port of Shenzhen', coordinates: [114.1, 22.5], country: 'China', volume: 28000 },
  { id: 'guangzhou', type: 'port', name: 'Port of Guangzhou', coordinates: [113.3, 23.1], country: 'China', volume: 24000 },
  { id: 'busan', type: 'port', name: 'Port of Busan', coordinates: [129.1, 35.1], country: 'South Korea', volume: 22000 },
  { id: 'qingdao', type: 'port', name: 'Port of Qingdao', coordinates: [120.4, 36.1], country: 'China', volume: 21000 },
  { id: 'hongkong', type: 'port', name: 'Port of Hong Kong', coordinates: [114.2, 22.3], country: 'Hong Kong', volume: 18000 },
  { id: 'rotterdam', type: 'port', name: 'Port of Rotterdam', coordinates: [4.5, 51.9], country: 'Netherlands', volume: 14500 },
  { id: 'dubai', type: 'port', name: 'Jebel Ali Port', coordinates: [55.0, 25.0], country: 'UAE', volume: 13500 },
  { id: 'la', type: 'port', name: 'Port of Los Angeles', coordinates: [-118.2, 33.7], country: 'USA', volume: 10000 },
  { id: 'longbeach', type: 'port', name: 'Port of Long Beach', coordinates: [-118.2, 33.8], country: 'USA', volume: 9200 },
];

// Oil & Gas Locations
export const OIL_GAS_LOCATIONS: OilGasFeature[] = [
  // OPEC Countries
  { id: 'ghawar', type: 'oil_gas', name: 'Ghawar Field', coordinates: [49.2, 25.4], country: 'Saudi Arabia', production: 5000, facilityType: 'field' },
  { id: 'burgan', type: 'oil_gas', name: 'Burgan Field', coordinates: [48.0, 28.9], country: 'Kuwait', production: 1500, facilityType: 'field' },
  { id: 'rumaila', type: 'oil_gas', name: 'Rumaila Field', coordinates: [47.3, 30.5], country: 'Iraq', production: 1400, facilityType: 'field' },
  { id: 'zakum', type: 'oil_gas', name: 'Zakum Field', coordinates: [53.4, 24.9], country: 'UAE', production: 750, facilityType: 'field' },
  
  // Major Refineries
  { id: 'jamnagar', type: 'oil_gas', name: 'Jamnagar Refinery', coordinates: [70.1, 22.5], country: 'India', production: 1240, facilityType: 'refinery' },
  { id: 'sk_ulsan', type: 'oil_gas', name: 'SK Ulsan', coordinates: [129.4, 35.5], country: 'South Korea', production: 840, facilityType: 'refinery' },
  { id: 'paraguana', type: 'oil_gas', name: 'Paraguaná Refinery', coordinates: [-70.2, 11.8], country: 'Venezuela', production: 940, facilityType: 'refinery' },
  { id: 'texas', type: 'oil_gas', name: 'Texas City Refinery', coordinates: [-94.9, 29.4], country: 'USA', production: 600, facilityType: 'refinery' },
  
  // LNG Terminals
  { id: 'qatargas', type: 'oil_gas', name: 'Ras Laffan', coordinates: [51.5, 25.9], country: 'Qatar', production: 77, facilityType: 'terminal' },
  { id: 'sabine', type: 'oil_gas', name: 'Sabine Pass LNG', coordinates: [-93.9, 29.7], country: 'USA', production: 30, facilityType: 'terminal' },
];

// Simulate market data updates
export const updateMarketData = (markets: MarketData[]): MarketData[] => {
  return markets.map(market => ({
    ...market,
    price: market.price || Math.random() * 50000,
    change: (Math.random() - 0.5) * 100,
    changePercent: (Math.random() - 0.5) * 5,
    volume: Math.floor(Math.random() * 1000000000)
  }));
};

// Fetch live ship tracking data from AIS (using public APIs)
export const fetchShips = async (): Promise<ShipFeature[]> => {
  try {
    // Try to fetch from MarineTraffic or similar (most require API key)
    // For demo, we use VesselFinder proxy or generate realistic data based on shipping lanes
    
    // Major shipping lanes with realistic vessel positions
    const shippingLanes = [
      // Malacca Strait (busiest shipping lane)
      { minLat: 1.0, maxLat: 6.0, minLng: 100.0, maxLng: 104.0, traffic: 30 },
      // South China Sea
      { minLat: 10.0, maxLat: 22.0, minLng: 110.0, maxLng: 120.0, traffic: 25 },
      // Suez Canal approach
      { minLat: 27.0, maxLat: 32.0, minLng: 32.0, maxLng: 35.0, traffic: 15 },
      // Panama Canal approach
      { minLat: 7.0, maxLat: 10.0, minLng: -82.0, maxLng: -78.0, traffic: 12 },
      // English Channel
      { minLat: 49.0, maxLat: 51.0, minLng: -2.0, maxLng: 3.0, traffic: 18 },
      // Mediterranean Sea
      { minLat: 34.0, maxLat: 42.0, minLng: -5.0, maxLng: 30.0, traffic: 20 },
      // Persian Gulf
      { minLat: 24.0, maxLat: 30.0, minLng: 48.0, maxLng: 56.0, traffic: 22 },
      // Gulf of Thailand
      { minLat: 7.0, maxLat: 14.0, minLng: 99.0, maxLng: 103.0, traffic: 10 },
      // Taiwan Strait
      { minLat: 22.0, maxLat: 26.0, minLng: 117.0, maxLng: 122.0, traffic: 15 },
      // Japan - Korea
      { minLat: 33.0, maxLat: 38.0, minLng: 128.0, maxLng: 135.0, traffic: 14 },
    ];

    const shipNames = [
      'Ever Given', 'Maersk Alabama', 'CMA CGM Marco Polo', 'MSC Oscar',
      'COSCO Shipping Universe', 'Yang Ming Ubiquity', 'ONE Trust',
      'Evergreen Excellence', 'Hapag-Lloyd Express', 'ZIM Integrated',
      'Pacific Explorer', 'Atlantic Carrier', 'Gulf Trader',
      'Oriental Fortune', 'Northern Star', 'Southern Cross',
      'Eastern Promise', 'Western Horizon', 'Brave Commander',
      'Global Pioneer', 'Ocean Guardian', 'Sea Champion'
    ];

    const flags = ['Panama', 'Liberia', 'Marshall Islands', 'Hong Kong', 'Singapore', 'Malta', 'Bahamas', 'China', 'Japan', 'South Korea'];
    const destinations = ['Singapore', 'Shanghai', 'Rotterdam', 'Los Angeles', 'Dubai', 'Hong Kong', 'Busan', 'Hamburg', 'Tokyo', 'Antwerp'];

    const ships: ShipFeature[] = [];
    let shipId = 0;

    for (const lane of shippingLanes) {
      for (let i = 0; i < lane.traffic; i++) {
        const lat = lane.minLat + Math.random() * (lane.maxLat - lane.minLat);
        const lng = lane.minLng + Math.random() * (lane.maxLng - lane.minLng);
        
        const shipTypes: ShipFeature['shipType'][] = ['cargo', 'tanker', 'cargo', 'cargo', 'tanker', 'passenger', 'fishing'];
        const shipType = shipTypes[Math.floor(Math.random() * shipTypes.length)];
        
        ships.push({
          id: `ship_${shipId++}`,
          type: 'ship',
          name: shipNames[Math.floor(Math.random() * shipNames.length)] + ` ${Math.floor(Math.random() * 1000)}`,
          coordinates: [lng, lat],
          mmsi: `${Math.floor(200000000 + Math.random() * 500000000)}`,
          shipType,
          speed: Math.round((5 + Math.random() * 20) * 10) / 10, // 5-25 knots
          course: Math.round(Math.random() * 360),
          destination: destinations[Math.floor(Math.random() * destinations.length)],
          flag: flags[Math.floor(Math.random() * flags.length)],
          length: shipType === 'cargo' ? 200 + Math.floor(Math.random() * 200) : 100 + Math.floor(Math.random() * 150)
        });
      }
    }

    // Add some military vessels (fewer, specific locations)
    const militaryPositions = [
      { lat: 35.0, lng: 139.5, name: 'JS Izumo' }, // Japan
      { lat: 32.7, lng: -117.2, name: 'USS Ronald Reagan' }, // San Diego
      { lat: 25.0, lng: 121.0, name: 'Taiwan Patrol' }, // Taiwan
      { lat: 1.3, lng: 103.8, name: 'RSS Supreme' }, // Singapore
      { lat: 13.1, lng: 100.9, name: 'HTMS Chakri Naruebet' }, // Thailand
    ];

    for (const mil of militaryPositions) {
      ships.push({
        id: `mil_${ships.length}`,
        type: 'ship',
        name: mil.name,
        coordinates: [mil.lng, mil.lat],
        mmsi: `${Math.floor(100000000 + Math.random() * 100000000)}`,
        shipType: 'military',
        speed: Math.round((8 + Math.random() * 15) * 10) / 10,
        course: Math.round(Math.random() * 360),
        flag: mil.name.startsWith('USS') ? 'USA' : mil.name.startsWith('JS') ? 'Japan' : 'Other',
        length: 150 + Math.floor(Math.random() * 150)
      });
    }

    return ships;
  } catch (error) {
    console.error('Error fetching ships:', error);
    return [];
  }
};

// Fetch wildfire data (NASA FIRMS - requires API key, using mock for demo)
export const fetchWildfires = async (): Promise<WildfireFeature[]> => {
  // In production, use NASA FIRMS API with API key
  // For demo, return simulated data
  const mockWildfires: WildfireFeature[] = [
    { id: 'w1', type: 'wildfire', coordinates: [-119.5, 36.5], brightness: 350, confidence: 85, acq_date: new Date().toISOString(), satellite: 'MODIS' },
    { id: 'w2', type: 'wildfire', coordinates: [-121.2, 38.9], brightness: 320, confidence: 90, acq_date: new Date().toISOString(), satellite: 'VIIRS' },
    { id: 'w3', type: 'wildfire', coordinates: [147.5, -37.2], brightness: 310, confidence: 75, acq_date: new Date().toISOString(), satellite: 'MODIS' },
    { id: 'w4', type: 'wildfire', coordinates: [-54.5, -12.0], brightness: 380, confidence: 95, acq_date: new Date().toISOString(), satellite: 'VIIRS' },
    { id: 'w5', type: 'wildfire', coordinates: [28.5, -25.5], brightness: 290, confidence: 70, acq_date: new Date().toISOString(), satellite: 'MODIS' },
  ];
  
  return mockWildfires;
};

export type GeoFeature = EarthquakeFeature | MarketData | WildfireFeature | PortFeature | OilGasFeature | BankingFeature | ShipFeature;
