import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CycloneData {
  id: string;
  name: string;
  category: number;
  type: string;
  typeLabel: string;
  lat: number;
  lng: number;
  windSpeed: number;
  windSpeedMph: number;
  windSpeedKmh: number;
  pressure: number;
  movement: { direction: string; directionDeg: number; speed: number };
  forecastTrack: Array<{ lat: number; lng: number; time: string; timeLabel: string; windSpeed: number; category: number }>;
  basin: string;
  basinLabel: string;
  source: string;
  headline?: string;
  lastUpdate: string;
}

// Fetch from NOAA NHC
async function fetchNOAAStorms(): Promise<CycloneData[]> {
  try {
    const response = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.log('NOAA API returned:', response.status);
      return [];
    }

    const data = await response.json();
    const cyclones: CycloneData[] = [];

    if (data.activeStorms && Array.isArray(data.activeStorms)) {
      for (const storm of data.activeStorms) {
        const lat = parseFloat(storm.latitude) || 0;
        const lng = parseFloat(storm.longitude) || 0;
        if (lat === 0 && lng === 0) continue;

        const windSpeed = parseInt(storm.intensity) || 0;
        const category = saffirSimpsonCategory(windSpeed);

        cyclones.push({
          id: `noaa-${storm.id || storm.binNumber}`,
          name: storm.name || 'Unnamed',
          category,
          type: getStormType(storm.classification, category),
          typeLabel: storm.classification || 'Tropical System',
          lat,
          lng,
          windSpeed,
          windSpeedMph: Math.round(windSpeed * 1.151),
          windSpeedKmh: Math.round(windSpeed * 1.852),
          pressure: parseInt(storm.pressure) || 0,
          movement: {
            direction: storm.movementDir || 'N/A',
            directionDeg: parseInt(storm.movementDeg) || 0,
            speed: parseInt(storm.movementSpeed) || 0,
          },
          forecastTrack: generateForecastTrack(lat, lng, windSpeed, storm.movementDeg, storm.movementSpeed),
          basin: getNHCBasin(storm.binNumber),
          basinLabel: getBasinLabel(getNHCBasin(storm.binNumber)),
          source: 'NOAA NHC',
          headline: storm.headline || `${storm.classification} ${storm.name}`,
          lastUpdate: new Date().toISOString(),
        });
      }
    }

    return cyclones;
  } catch (error) {
    console.error('NOAA fetch error:', error);
    return [];
  }
}

// Fetch from JMA
async function fetchJMAStorms(): Promise<CycloneData[]> {
  try {
    const response = await fetch('https://www.jma.go.jp/bosai/typhoon/data/targetTyphoon.json');

    if (!response.ok) return [];

    const data = await response.json();
    const cyclones: CycloneData[] = [];

    if (Array.isArray(data)) {
      for (const typhoon of data) {
        const lat = parseFloat(typhoon.lat);
        const lng = parseFloat(typhoon.lng);
        if (isNaN(lat) || isNaN(lng)) continue;

        const windSpeed = parseInt(typhoon.wind) || 0;
        const category = saffirSimpsonCategory(windSpeed);

        cyclones.push({
          id: `jma-${typhoon.id || typhoon.name}`,
          name: typhoon.name || typhoon.namej || 'Unnamed',
          category,
          type: category >= 4 ? 'super_typhoon' : category >= 1 ? 'typhoon' : 'tropical_storm',
          typeLabel: typhoon.class || (category >= 4 ? 'Super Typhoon' : 'Typhoon'),
          lat,
          lng,
          windSpeed,
          windSpeedMph: Math.round(windSpeed * 1.151),
          windSpeedKmh: parseInt(typhoon.windKmh) || Math.round(windSpeed * 1.852),
          pressure: parseInt(typhoon.pressure) || 0,
          movement: {
            direction: typhoon.moveDir || 'N/A',
            directionDeg: parseInt(typhoon.moveDeg) || 0,
            speed: parseInt(typhoon.moveSpeed) || 0,
          },
          forecastTrack: parseJMAForecast(typhoon.forecast, lat, lng, windSpeed),
          basin: 'west_pacific',
          basinLabel: 'West Pacific',
          source: 'JMA',
          headline: `Typhoon ${typhoon.name || 'Unnamed'}`,
          lastUpdate: new Date().toISOString(),
        });
      }
    }

    return cyclones;
  } catch (error) {
    console.error('JMA fetch error:', error);
    return [];
  }
}

function saffirSimpsonCategory(windKnots: number): number {
  if (windKnots >= 137) return 5;
  if (windKnots >= 113) return 4;
  if (windKnots >= 96) return 3;
  if (windKnots >= 83) return 2;
  if (windKnots >= 64) return 1;
  return 0;
}

function getStormType(classification: string, category: number): string {
  const lower = (classification || '').toLowerCase();
  if (lower.includes('hurricane') || lower.includes('major')) return 'hurricane';
  if (lower.includes('typhoon')) return category >= 4 ? 'super_typhoon' : 'typhoon';
  if (lower.includes('tropical storm')) return 'tropical_storm';
  if (lower.includes('depression')) return 'tropical_depression';
  if (lower.includes('post-tropical')) return 'post_tropical';
  return category >= 1 ? 'hurricane' : 'tropical_storm';
}

function getNHCBasin(binNumber: string): string {
  if (!binNumber) return 'atlantic';
  if (binNumber.startsWith('EP')) return 'east_pacific';
  if (binNumber.startsWith('CP')) return 'central_pacific';
  return 'atlantic';
}

function getBasinLabel(basin: string): string {
  const labels: Record<string, string> = {
    atlantic: 'Atlantic',
    east_pacific: 'East Pacific',
    central_pacific: 'Central Pacific',
    west_pacific: 'West Pacific',
  };
  return labels[basin] || basin;
}

function generateForecastTrack(lat: number, lng: number, windSpeed: number, moveDeg?: string, moveSpeed?: string): CycloneData['forecastTrack'] {
  const track: CycloneData['forecastTrack'] = [];
  
  // Current position
  track.push({
    lat,
    lng,
    time: new Date().toISOString(),
    timeLabel: 'Current',
    windSpeed,
    category: saffirSimpsonCategory(windSpeed),
  });

  // Generate projected points
  const direction = parseInt(moveDeg || '0') || 315;
  const speed = parseInt(moveSpeed || '10') || 10;
  const intervals = [24, 48, 72, 96, 120];

  let currentLat = lat;
  let currentLng = lng;

  for (const hours of intervals) {
    const radians = (direction * Math.PI) / 180;
    const distance = speed * hours / 60 * 0.15;
    currentLat = lat + Math.cos(radians) * distance;
    currentLng = lng + Math.sin(radians) * distance;

    const decayFactor = Math.max(0.7, 1 - hours * 0.002);
    const projectedWind = Math.round(windSpeed * decayFactor);

    track.push({
      lat: currentLat,
      lng: currentLng,
      time: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      timeLabel: `+${hours}h`,
      windSpeed: projectedWind,
      category: saffirSimpsonCategory(projectedWind),
    });
  }

  return track;
}

function parseJMAForecast(forecast: any[], lat: number, lng: number, windSpeed: number): CycloneData['forecastTrack'] {
  const track: CycloneData['forecastTrack'] = [{
    lat,
    lng,
    time: new Date().toISOString(),
    timeLabel: 'Current',
    windSpeed,
    category: saffirSimpsonCategory(windSpeed),
  }];

  if (Array.isArray(forecast)) {
    forecast.forEach(f => {
      const fLat = parseFloat(f.lat);
      const fLng = parseFloat(f.lng);
      if (!isNaN(fLat) && !isNaN(fLng)) {
        const fWind = parseInt(f.wind) || windSpeed;
        track.push({
          lat: fLat,
          lng: fLng,
          time: f.time || '',
          timeLabel: f.validTime || '',
          windSpeed: fWind,
          category: saffirSimpsonCategory(fWind),
        });
      }
    });
  }

  return track;
}

// Demo data for when no active storms
function getDemoData(): CycloneData[] {
  const now = new Date();
  return [
    {
      id: 'demo-ma-on',
      name: 'MA-ON',
      category: 2,
      type: 'typhoon',
      typeLabel: 'Typhoon',
      lat: 18.5,
      lng: 128.0,
      windSpeed: 85,
      windSpeedMph: 98,
      windSpeedKmh: 157,
      pressure: 970,
      movement: { direction: 'NW', directionDeg: 315, speed: 12 },
      forecastTrack: [
        { lat: 18.5, lng: 128.0, time: now.toISOString(), timeLabel: 'Current', windSpeed: 85, category: 2 },
        { lat: 20.0, lng: 126.0, time: new Date(now.getTime() + 24*60*60*1000).toISOString(), timeLabel: '00:00 AM Thu', windSpeed: 90, category: 2 },
        { lat: 21.5, lng: 124.5, time: new Date(now.getTime() + 36*60*60*1000).toISOString(), timeLabel: '12:00 PM Thu', windSpeed: 95, category: 2 },
        { lat: 22.8, lng: 123.0, time: new Date(now.getTime() + 48*60*60*1000).toISOString(), timeLabel: '18:00 PM Thu', windSpeed: 100, category: 3 },
        { lat: 24.0, lng: 121.5, time: new Date(now.getTime() + 60*60*60*1000).toISOString(), timeLabel: '00:00 AM Fri', windSpeed: 95, category: 2 },
        { lat: 25.5, lng: 120.0, time: new Date(now.getTime() + 72*60*60*1000).toISOString(), timeLabel: '12:00 PM Fri', windSpeed: 85, category: 2 },
        { lat: 27.5, lng: 118.5, time: new Date(now.getTime() + 84*60*60*1000).toISOString(), timeLabel: '18:00 PM Fri', windSpeed: 75, category: 1 },
        { lat: 29.5, lng: 117.5, time: new Date(now.getTime() + 96*60*60*1000).toISOString(), timeLabel: '00:00 AM Sat', windSpeed: 60, category: 0 },
      ],
      basin: 'west_pacific',
      basinLabel: 'West Pacific',
      source: 'Demo Data',
      headline: 'Sample Typhoon MA-ON (Demo - No active storms currently)',
      lastUpdate: now.toISOString(),
    }
  ];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'cyclones';

    if (type === 'cyclones') {
      // Fetch from all sources
      const [noaaData, jmaData] = await Promise.all([
        fetchNOAAStorms(),
        fetchJMAStorms(),
      ]);

      let allCyclones = [...noaaData, ...jmaData];
      
      // Deduplicate by name
      const seen = new Map<string, CycloneData>();
      for (const c of allCyclones) {
        const key = c.name.toLowerCase().replace(/\s+/g, '');
        if (!seen.has(key) || c.source === 'NOAA NHC') {
          seen.set(key, c);
        }
      }
      allCyclones = Array.from(seen.values());

      // If no real storms, return demo data
      if (allCyclones.length === 0) {
        allCyclones = getDemoData();
      }

      console.log(`✅ Returning ${allCyclones.length} cyclones`);

      return new Response(JSON.stringify({
        success: true,
        count: allCyclones.length,
        cyclones: allCyclones,
        sources: ['NOAA NHC', 'JMA'],
        lastUpdate: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Weather overlay tiles info
    if (type === 'weather-tiles') {
      return new Response(JSON.stringify({
        success: true,
        tiles: {
          radar: 'https://tilecache.rainviewer.com/v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png',
          satellite: 'https://tilecache.rainviewer.com/v2/satellite/{ts}/256/{z}/{x}/{y}/0/0_0.png',
          temperature: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=',
          clouds: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=',
          wind: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=',
          pressure: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=',
        },
        info: 'Use these tile URLs with Leaflet TileLayer',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown type parameter',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});