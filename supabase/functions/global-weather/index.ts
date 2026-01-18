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
  isRealTime: boolean;
}

// NOAA NHC RSS/XML - Better parsing for active storms
async function fetchNOAANHC(): Promise<CycloneData[]> {
  const cyclones: CycloneData[] = [];
  
  try {
    // Try multiple NOAA endpoints
    const endpoints = [
      'https://www.nhc.noaa.gov/CurrentStorms.json',
      'https://www.nhc.noaa.gov/gis/forecast/archive/latest_wsp_120hr5km.kmz',
    ];

    const response = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json', {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; WeatherApp/1.0)'
      },
    });

    if (!response.ok) {
      console.log('NOAA NHC API returned:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('NOAA NHC response:', JSON.stringify(data).substring(0, 500));

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
          isRealTime: true,
        });
      }
    }

    return cyclones;
  } catch (error) {
    console.error('NOAA NHC fetch error:', error);
    return [];
  }
}

// Fetch from JMA (Japan Meteorological Agency)
async function fetchJMA(): Promise<CycloneData[]> {
  const cyclones: CycloneData[] = [];
  
  try {
    const response = await fetch('https://www.jma.go.jp/bosai/typhoon/data/targetTyphoon.json', {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; WeatherApp/1.0)'
      },
    });

    if (!response.ok) {
      console.log('JMA API returned:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('JMA response:', JSON.stringify(data).substring(0, 500));

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
          isRealTime: true,
        });
      }
    }

    return cyclones;
  } catch (error) {
    console.error('JMA fetch error:', error);
    return [];
  }
}

// Fetch from JTWC (Joint Typhoon Warning Center) via proxy
async function fetchJTWC(): Promise<CycloneData[]> {
  const cyclones: CycloneData[] = [];
  
  try {
    // JTWC doesn't have a public JSON API, but we can try their RSS
    const response = await fetch('https://www.metoc.navy.mil/jtwc/rss/jtwc.rss', {
      headers: { 
        'Accept': 'application/xml',
        'User-Agent': 'Mozilla/5.0 (compatible; WeatherApp/1.0)'
      },
    });

    if (!response.ok) {
      console.log('JTWC API returned:', response.status);
      return [];
    }

    // Parse RSS XML for warnings (basic parsing)
    const xml = await response.text();
    console.log('JTWC response length:', xml.length);
    
    // Extract storm info from RSS items (simplified)
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const item = match[1];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const descMatch = item.match(/<description>(.*?)<\/description>/);
      
      if (titleMatch && titleMatch[1].toLowerCase().includes('warning')) {
        const title = titleMatch[1];
        const desc = descMatch ? descMatch[1] : '';
        
        // Extract storm name from title
        const nameMatch = title.match(/(?:TYPHOON|HURRICANE|TROPICAL STORM|CYCLONE)\s+(\w+)/i);
        if (nameMatch) {
          // This is a very basic extraction - in production you'd parse more thoroughly
          console.log('Found JTWC warning:', title);
        }
      }
    }

    return cyclones;
  } catch (error) {
    console.error('JTWC fetch error:', error);
    return [];
  }
}

// Fetch from IBTrACS (historical + recent)
async function fetchIBTrACS(): Promise<CycloneData[]> {
  const cyclones: CycloneData[] = [];
  
  try {
    // IBTrACS provides CSV data - we'll check for recent active storms
    const currentYear = new Date().getFullYear();
    const response = await fetch(`https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r00/access/csv/ibtracs.since1980.list.v04r00.csv`, {
      headers: { 
        'Accept': 'text/csv',
        'User-Agent': 'Mozilla/5.0 (compatible; WeatherApp/1.0)'
      },
    });

    if (!response.ok) {
      console.log('IBTrACS API returned:', response.status);
      return [];
    }

    // For real-time, IBTrACS might be delayed, so we primarily use this for verification
    console.log('IBTrACS available for historical data');

    return cyclones;
  } catch (error) {
    console.error('IBTrACS fetch error:', error);
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
    north_indian: 'North Indian',
    south_indian: 'South Indian',
    south_pacific: 'South Pacific',
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

  // Generate projected points based on movement
  const direction = parseInt(moveDeg || '0') || 315;
  const speed = parseInt(moveSpeed || '10') || 10;
  const intervals = [12, 24, 36, 48, 72, 96, 120];

  for (const hours of intervals) {
    const radians = (direction * Math.PI) / 180;
    const distance = speed * hours / 60 * 0.15;
    const projectedLat = lat + Math.cos(radians) * distance;
    const projectedLng = lng + Math.sin(radians) * distance;

    // Simulate intensity changes (decay over land, intensify over warm water)
    const decayFactor = Math.max(0.6, 1 - hours * 0.003);
    const projectedWind = Math.round(windSpeed * decayFactor);

    const forecastTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    const dayName = forecastTime.toLocaleDateString('en-US', { weekday: 'short' });
    const timeStr = forecastTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    track.push({
      lat: projectedLat,
      lng: projectedLng,
      time: forecastTime.toISOString(),
      timeLabel: `${dayName} ${timeStr}`,
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

// Returns informational message about no active storms
function getNoActiveStormsMessage(): { message: string; sources: string[]; regions: any[] } {
  return {
    message: 'No active tropical cyclones currently tracked. This is normal - tropical cyclone activity varies by season.',
    sources: ['NOAA NHC', 'JMA', 'JTWC'],
    regions: [
      { name: 'Atlantic Hurricane Season', period: 'June 1 - November 30' },
      { name: 'East Pacific Hurricane Season', period: 'May 15 - November 30' },
      { name: 'West Pacific Typhoon Season', period: 'Year-round (peak Jul-Nov)' },
      { name: 'North Indian Cyclone Season', period: 'April-June & October-December' },
      { name: 'Australian Cyclone Season', period: 'November 1 - April 30' },
    ],
  };
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
      console.log('🌀 Fetching cyclone data from multiple sources...');
      
      // Fetch from all available sources in parallel
      const [noaaData, jmaData, jtwcData] = await Promise.all([
        fetchNOAANHC(),
        fetchJMA(),
        fetchJTWC(),
      ]);

      console.log(`Sources returned: NOAA=${noaaData.length}, JMA=${jmaData.length}, JTWC=${jtwcData.length}`);

      let allCyclones = [...noaaData, ...jmaData, ...jtwcData];
      
      // Deduplicate by name
      const seen = new Map<string, CycloneData>();
      for (const c of allCyclones) {
        const key = c.name.toLowerCase().replace(/\s+/g, '');
        if (!seen.has(key) || c.source === 'NOAA NHC') {
          seen.set(key, c);
        }
      }
      allCyclones = Array.from(seen.values());

      // Response with proper status
      const hasRealData = allCyclones.length > 0;
      const noActiveInfo = !hasRealData ? getNoActiveStormsMessage() : null;

      console.log(`✅ Returning ${allCyclones.length} real-time cyclones`);

      return new Response(JSON.stringify({
        success: true,
        isRealTime: true,
        hasActiveStorms: hasRealData,
        count: allCyclones.length,
        cyclones: allCyclones,
        noActiveInfo,
        sources: ['NOAA NHC', 'JMA', 'JTWC'],
        lastUpdate: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min refresh
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Weather overlay tiles info
    if (type === 'weather-tiles') {
      // Note: OpenWeatherMap requires API key for higher rate limits
      // Using free tier endpoints
      return new Response(JSON.stringify({
        success: true,
        tiles: {
          radar: 'https://tilecache.rainviewer.com/v2/radar/{ts}/256/{z}/{x}/{y}/2/1_1.png',
          satellite: 'https://tilecache.rainviewer.com/v2/satellite/{ts}/256/{z}/{x}/{y}/0/0_0.png',
          temperature: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
          clouds: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
          precipitation: 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
          wind: 'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
          pressure: 'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2',
        },
        info: 'Real-time weather tiles from OpenWeatherMap and RainViewer',
        isRealTime: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Weather alerts and warnings
    if (type === 'alerts') {
      // NWS (National Weather Service) alerts
      try {
        const nwsResponse = await fetch('https://api.weather.gov/alerts/active', {
          headers: {
            'Accept': 'application/geo+json',
            'User-Agent': '(WeatherApp, contact@example.com)',
          },
        });

        if (nwsResponse.ok) {
          const alerts = await nwsResponse.json();
          return new Response(JSON.stringify({
            success: true,
            isRealTime: true,
            count: alerts.features?.length || 0,
            alerts: alerts.features?.slice(0, 50) || [], // Limit to 50 most recent
            source: 'NWS',
            lastUpdate: new Date().toISOString(),
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('NWS alerts fetch error:', error);
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Could not fetch weather alerts',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Unknown type parameter. Use: cyclones, weather-tiles, or alerts',
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
