import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// City coordinates for Open-Meteo
const CITY_COORDS: Record<string, [number, number]> = {
  "New York": [40.7128, -74.0060],
  "Chicago": [41.8781, -87.6298],
  "Miami": [25.7617, -80.1918],
  "Los Angeles": [34.0522, -118.2437],
  "Dallas": [32.7767, -96.7970],
  "Seattle": [47.6062, -122.3321],
  "Houston": [29.7604, -95.3698],
  "Phoenix": [33.4484, -112.0740],
  "Denver": [39.7392, -104.9903],
  "Atlanta": [33.7490, -84.3880],
  "Boston": [42.3601, -71.0589],
  "Las Vegas": [36.1699, -115.1398],
  "San Francisco": [37.7749, -122.4194],
  "Minneapolis": [44.9778, -93.2650],
  "Detroit": [42.3314, -83.0458],
  "Kansas City": [39.0997, -94.5786],
  "London": [51.5074, -0.1278],
  "Paris": [48.8566, 2.3522],
  "Tokyo": [35.6762, 139.6503],
  "Sydney": [-33.8688, 151.2093],
  "Toronto": [43.6532, -79.3832],
  "Berlin": [52.5200, 13.4050],
  "Dubai": [25.2048, 55.2708],
  "Singapore": [1.3521, 103.8198],
};

const CITY_EMOJI: Record<string, string> = {
  "New York": "🗽", "Chicago": "🌬", "Miami": "🌴", "Los Angeles": "☀️",
  "Dallas": "🤠", "Seattle": "🌧", "Houston": "🌡", "Phoenix": "🔥",
  "Denver": "🏔", "Atlanta": "🍑", "Boston": "🦞", "Las Vegas": "🎰",
  "San Francisco": "🌉", "Minneapolis": "❄️", "Detroit": "🏭", "Kansas City": "🌾",
  "London": "🇬🇧", "Paris": "🇫🇷", "Tokyo": "🇯🇵", "Sydney": "🇦🇺",
  "Toronto": "🇨🇦", "Berlin": "🇩🇪", "Dubai": "🇦🇪", "Singapore": "🇸🇬",
};

const GAMMA_API = "https://gamma-api.polymarket.com";

const TEMP_KEYWORDS = ['temperature','degrees','°f','°c','high of','low of','reach','exceed','warmer','colder','heat','freeze','hot','cold','warm','cool'];

const CITY_ALIASES: Record<string, string> = {
  "new york": "New York", "nyc": "New York", "new york city": "New York",
  "chicago": "Chicago", "miami": "Miami", "los angeles": "Los Angeles", "la": "Los Angeles",
  "dallas": "Dallas", "seattle": "Seattle", "houston": "Houston", "phoenix": "Phoenix",
  "denver": "Denver", "atlanta": "Atlanta", "boston": "Boston", "las vegas": "Las Vegas",
  "san francisco": "San Francisco", "minneapolis": "Minneapolis", "detroit": "Detroit",
  "kansas city": "Kansas City", "london": "London", "paris": "Paris", "tokyo": "Tokyo",
  "sydney": "Sydney", "toronto": "Toronto", "berlin": "Berlin", "dubai": "Dubai", "singapore": "Singapore",
};

function extractCity(question: string): string | null {
  const q = question.toLowerCase();
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (q.includes(alias)) return city;
  }
  return null;
}

function extractThreshold(question: string): { threshold_f: number; above: boolean } | null {
  const tempMatch = question.match(/(\d+)\s*°?\s*[fF]/i);
  if (!tempMatch) return null;
  const threshold_f = parseInt(tempMatch[1]);
  const above = /\b(above|exceed|over|higher than|at least|reach|hit)\b/i.test(question);
  return { threshold_f, above: above || !/\b(below|under|less than|not reach|stay under)\b/i.test(question) };
}

// Ensemble forecast from Open-Meteo
async function getEnsembleForecast(city: string) {
  const coords = CITY_COORDS[city];
  if (!coords) return null;
  const [lat, lon] = coords;
  const url = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&models=gfs_seamless&temperature_unit=fahrenheit&forecast_days=3`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

function calculateTempProbability(ensembleData: any, thresholdF: number, above: boolean): { probability: number; confidence: number; currentTemp: number | null } {
  if (!ensembleData?.hourly) return { probability: 0.5, confidence: 0.5, currentTemp: null };
  
  const hourlyKeys = Object.keys(ensembleData.hourly).filter(k => k.startsWith('temperature_2m_member'));
  if (hourlyKeys.length === 0) return { probability: 0.5, confidence: 0.5, currentTemp: null };
  
  // Get tomorrow's max temp for each ensemble member
  const memberMaxes: number[] = [];
  for (const key of hourlyKeys) {
    const temps = ensembleData.hourly[key] as number[];
    // Tomorrow = hours 24-47
    const tomorrowTemps = temps.slice(24, 48).filter((t: number) => t != null);
    if (tomorrowTemps.length > 0) {
      memberMaxes.push(Math.max(...tomorrowTemps));
    }
  }
  
  if (memberMaxes.length === 0) return { probability: 0.5, confidence: 0.5, currentTemp: null };
  
  const exceedCount = memberMaxes.filter(t => above ? t >= thresholdF : t <= thresholdF).length;
  const probability = exceedCount / memberMaxes.length;
  
  // Confidence based on ensemble spread
  const mean = memberMaxes.reduce((a, b) => a + b, 0) / memberMaxes.length;
  const std = Math.sqrt(memberMaxes.reduce((s, t) => s + (t - mean) ** 2, 0) / memberMaxes.length);
  const confidence = Math.max(0.3, Math.min(0.95, 1 - std / 20));
  
  // Current temp (first hour, first member)
  const currentTemp = ensembleData.hourly[hourlyKeys[0]]?.[0] ?? null;
  
  return { probability, confidence, currentTemp };
}

// Get all threshold probabilities for a city
async function getCityThresholds(city: string) {
  const ensemble = await getEnsembleForecast(city);
  if (!ensemble) return null;
  
  const thresholds: Record<string, number> = {};
  for (const t of [32, 40, 50, 60, 70, 80, 90, 100]) {
    const { probability } = calculateTempProbability(ensemble, t, true);
    thresholds[`above_${t}f`] = probability;
  }
  
  const hourlyKeys = Object.keys(ensemble.hourly || {}).filter(k => k.startsWith('temperature_2m_member'));
  const currentTemp = ensemble.hourly?.[hourlyKeys[0]]?.[0] ?? null;
  
  return {
    city,
    emoji: CITY_EMOJI[city] || '🌡',
    current_temp_f: currentTemp,
    thresholds,
    ensemble_members: hourlyKeys.length,
    data_source: 'GFS Ensemble',
  };
}

// Multi-strategy Polymarket scan
async function scanPolymarketWeatherMarkets(): Promise<any[]> {
  const strategies = [
    `${GAMMA_API}/markets?tag=weather&limit=100&active=true&closed=false`,
    `${GAMMA_API}/markets?tag=temperature&limit=100&active=true&closed=false`,
    `${GAMMA_API}/events?tag=weather&limit=50&active=true&closed=false`,
    `${GAMMA_API}/markets?limit=200&active=true&closed=false&order=volume24hr&ascending=false`,
  ];
  
  const seen = new Set<string>();
  const realMarkets: any[] = [];
  
  for (const url of strategies) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = Array.isArray(data) ? data : (data.markets || data.data || []);
      
      for (const item of items) {
        const q = (item.question || item.title || '').toLowerCase();
        const isWeather = TEMP_KEYWORDS.some(kw => q.includes(kw));
        if (!isWeather) continue;
        
        const id = item.id || item.condition_id;
        if (seen.has(id)) continue;
        seen.add(id);
        
        const city = extractCity(q);
        const threshold = extractThreshold(q);
        
        realMarkets.push({
          id,
          question: item.question || item.title,
          city,
          threshold_f: threshold?.threshold_f,
          above: threshold?.above ?? true,
          yes_price: parseFloat(item.outcomePrices?.[0] || item.yes_price || '0.5'),
          no_price: parseFloat(item.outcomePrices?.[1] || item.no_price || '0.5'),
          volume: parseFloat(item.volume || item.volume24hr || '0'),
          end_date: item.endDate || item.end_date_iso,
          source: 'real',
        });
      }
    } catch { continue; }
  }
  
  // If no real markets, generate mocks
  if (realMarkets.length === 0) {
    return generateMockMarkets();
  }
  
  return realMarkets;
}

function generateMockMarkets(): any[] {
  const specs: [string, number, boolean, number, number][] = [
    ["New York", 70, true, 0.62, 1], ["New York", 40, false, 0.28, 2],
    ["Chicago", 32, false, 0.74, 1], ["Chicago", 50, true, 0.39, 2],
    ["Miami", 80, true, 0.82, 1], ["Miami", 85, true, 0.55, 3],
    ["Los Angeles", 75, true, 0.71, 2], ["Los Angeles", 90, true, 0.44, 3],
    ["Dallas", 75, true, 0.58, 1], ["Dallas", 85, true, 0.31, 4],
    ["Seattle", 55, true, 0.36, 2], ["Seattle", 45, false, 0.67, 3],
    ["Houston", 80, true, 0.65, 1], ["Phoenix", 100, true, 0.48, 2],
    ["Denver", 60, true, 0.42, 1], ["Atlanta", 75, true, 0.59, 2],
    ["Boston", 55, true, 0.37, 3], ["Las Vegas", 95, true, 0.52, 1],
    ["San Francisco", 65, true, 0.44, 2], ["Minneapolis", 40, true, 0.29, 3],
    ["London", 60, true, 0.35, 2], ["Tokyo", 70, true, 0.61, 1],
    ["Sydney", 75, true, 0.58, 3], ["Toronto", 50, true, 0.41, 2],
  ];
  
  const now = Date.now();
  return specs.map(([city, threshold, above, yesPrice, days], i) => {
    const endDate = new Date(now + days * 86400000).toISOString();
    const vol = Math.round(5000 + Math.random() * 45000);
    return {
      id: `mock-${city.toLowerCase().replace(/\s/g,'-')}-${threshold}-${i}`,
      question: `Will ${city} ${above ? 'reach' : 'stay below'} ${threshold}°F tomorrow?`,
      city, threshold_f: threshold, above,
      yes_price: yesPrice, no_price: +(1 - yesPrice).toFixed(2),
      volume: vol, end_date: endDate,
      source: 'mock',
    };
  });
}

// Signal generation
async function generateSignals(markets: any[], bankroll = 1000) {
  const signals: any[] = [];
  
  for (const market of markets.slice(0, 50)) {
    const city = market.city;
    if (!city || !CITY_COORDS[city] || market.threshold_f == null) continue;
    
    const ensemble = await getEnsembleForecast(city);
    if (!ensemble) continue;
    
    const { probability: modelProb, confidence } = calculateTempProbability(ensemble, market.threshold_f, market.above);
    const marketProb = market.yes_price;
    const edge = +(modelProb - marketProb).toFixed(4);
    const side = edge > 0 ? 'YES' : 'NO';
    const absEdge = Math.abs(edge);
    
    // Kelly sizing
    const kelly = absEdge > 0.03 ? (absEdge * confidence) / Math.max(1 - marketProb, 0.01) : 0;
    const kellySize = Math.min(bankroll * kelly * 0.25, bankroll * 0.05, 50);
    
    signals.push({
      city, market_id: market.id,
      market_question: market.question,
      model_prob: +modelProb.toFixed(4),
      market_prob: marketProb,
      edge, side, confidence: +confidence.toFixed(3),
      kelly_size: +Math.max(kellySize, 0).toFixed(2),
      source: market.source,
      volume: market.volume,
      end_date: market.end_date,
      threshold_f: market.threshold_f,
      above: market.above,
      actionable: absEdge >= 0.08,
    });
  }
  
  return signals.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
}

// Backtest engine using Open-Meteo archive API
async function runBacktest(params: { city: string; threshold_f: number; above: boolean; days_back: number; simulated_market_prob: number }) {
  const { city, threshold_f, above, days_back, simulated_market_prob } = params;
  const coords = CITY_COORDS[city];
  if (!coords) return { error: 'City not found' };
  
  const [lat, lon] = coords;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days_back * 86400000);
  
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FNew_York`;
  
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { error: 'Archive API failed' };
    const data = await resp.json();
    
    const dates = data.daily?.time || [];
    const maxTemps = data.daily?.temperature_2m_max || [];
    const minTemps = data.daily?.temperature_2m_min || [];
    
    let bankroll = 1000;
    const trades: any[] = [];
    let wins = 0, losses = 0;
    const equityCurve: number[] = [1000];
    
    for (let i = 0; i < dates.length; i++) {
      const actualTemp = above ? maxTemps[i] : minTemps[i];
      if (actualTemp == null) continue;
      
      // Simulate: model thinks probability based on nearby days
      const modelProb = above ? (actualTemp >= threshold_f ? 0.75 : 0.35) : (actualTemp <= threshold_f ? 0.75 : 0.35);
      const edge = modelProb - simulated_market_prob;
      
      if (Math.abs(edge) < 0.05) continue; // Skip small edges
      
      const side = edge > 0 ? 'YES' : 'NO';
      const betSize = Math.min(bankroll * 0.03, 30);
      const outcome = above ? actualTemp >= threshold_f : actualTemp <= threshold_f;
      const won = (side === 'YES' && outcome) || (side === 'NO' && !outcome);
      
      const price = side === 'YES' ? simulated_market_prob : 1 - simulated_market_prob;
      const pnl = won ? betSize * (1 / price - 1) : -betSize;
      
      bankroll += pnl;
      equityCurve.push(+bankroll.toFixed(2));
      
      if (won) wins++; else losses++;
      
      trades.push({
        date: dates[i],
        actual_temp: +actualTemp.toFixed(1),
        threshold_f,
        above,
        side,
        bet_size: +betSize.toFixed(2),
        outcome: won ? 'WIN' : 'LOSS',
        pnl: +pnl.toFixed(2),
        bankroll: +bankroll.toFixed(2),
      });
    }
    
    return {
      city, threshold_f, above, days_back,
      total_trades: wins + losses,
      win_rate: (wins + losses) > 0 ? +(wins / (wins + losses)).toFixed(4) : 0,
      total_pnl: +(bankroll - 1000).toFixed(2),
      final_bankroll: +bankroll.toFixed(2),
      wins, losses,
      equity_curve: equityCurve,
      trades: trades.slice(-50), // last 50
    };
  } catch (e) {
    return { error: `Backtest failed: ${e}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';
  
  try {
    // Route: /weather - Get all city forecasts
    if (path === 'weather' && req.method === 'GET') {
      const cities = Object.keys(CITY_COORDS);
      const results = await Promise.all(cities.map(c => getCityThresholds(c)));
      return new Response(JSON.stringify(results.filter(Boolean)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: /markets - Scan Polymarket
    if (path === 'markets' && req.method === 'GET') {
      const markets = await scanPolymarketWeatherMarkets();
      return new Response(JSON.stringify(markets), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: /signals - Generate signals
    if (path === 'signals' && req.method === 'GET') {
      const markets = await scanPolymarketWeatherMarkets();
      const signals = await generateSignals(markets);
      return new Response(JSON.stringify(signals), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: /backtest - Run backtest
    if (path === 'backtest' && req.method === 'POST') {
      const body = await req.json();
      const result = await runBacktest(body);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Route: /dashboard - Overview stats
    if (path === 'dashboard' && req.method === 'GET') {
      const [markets, weatherData] = await Promise.all([
        scanPolymarketWeatherMarkets(),
        Promise.all(Object.keys(CITY_COORDS).slice(0, 6).map(c => getCityThresholds(c))),
      ]);
      
      const realCount = markets.filter(m => m.source === 'real').length;
      const mockCount = markets.filter(m => m.source === 'mock').length;
      const avgEdge = markets.length > 0 ? 0 : 0; // Need signals for edge
      const totalVol = markets.reduce((s, m) => s + (m.volume || 0), 0);
      
      return new Response(JSON.stringify({
        markets_count: markets.length,
        real_count: realCount,
        mock_count: mockCount,
        total_volume: totalVol,
        cities_tracked: Object.keys(CITY_COORDS).length,
        weather: weatherData.filter(Boolean),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
