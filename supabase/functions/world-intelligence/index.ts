import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= DATA FETCHERS =============

async function fetchGDACS(): Promise<any[]> {
  try {
    const res = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,WF,DR&alertlevel=Orange;Red&limit=50', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      id: f.properties?.eventid || f.id,
      type: f.properties?.eventtype,
      name: f.properties?.name || f.properties?.eventtype,
      severity: f.properties?.alertlevel,
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0],
      date: f.properties?.fromdate,
      country: f.properties?.country,
      description: f.properties?.description || f.properties?.htmldescription,
    })).filter((e: any) => e.lat && e.lng);
  } catch { return []; }
}

async function fetchEONET(): Promise<any[]> {
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50&days=30', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || []).map((e: any) => {
      const geo = e.geometry?.[e.geometry.length - 1];
      return {
        id: e.id,
        type: e.categories?.[0]?.title || 'Unknown',
        name: e.title,
        lat: geo?.coordinates?.[1],
        lng: geo?.coordinates?.[0],
        date: geo?.date,
        source: 'NASA EONET',
      };
    }).filter((e: any) => e.lat && e.lng);
  } catch { return []; }
}

async function fetchUSGS(): Promise<any[]> {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      id: f.id,
      type: 'earthquake',
      name: f.properties?.place,
      magnitude: f.properties?.mag,
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0],
      date: new Date(f.properties?.time).toISOString(),
      depth: f.geometry?.coordinates?.[2],
      tsunami: f.properties?.tsunami,
    }));
  } catch { return []; }
}

// NASA FIRMS satellite fire detection (last 24h)
async function fetchFIRMS(): Promise<any[]> {
  try {
    const res = await fetch('https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/world/1/2024-01-01', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split('\n').slice(1, 201); // Max 200 fires
    return lines.map((line, i) => {
      const parts = line.split(',');
      return {
        id: `fire-${i}`,
        lat: parseFloat(parts[0]),
        lng: parseFloat(parts[1]),
        brightness: parseFloat(parts[2]),
        confidence: parts[8],
        date: parts[5],
      };
    }).filter(f => !isNaN(f.lat) && !isNaN(f.lng));
  } catch { return []; }
}

// GDELT geo-events (protests, unrest) 
async function fetchGDELTProtests(): Promise<any[]> {
  try {
    const res = await fetch('https://api.gdeltproject.org/api/v2/geo/geo?query=protest%20OR%20riot%20OR%20unrest&mode=PointData&format=GeoJSON&maxpoints=100&timespan=7d', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features || []).slice(0, 100).map((f: any) => ({
      id: f.properties?.url_mobile || `gdelt-${Math.random().toString(36).slice(2)}`,
      name: f.properties?.name || 'Protest/Unrest',
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0],
      count: f.properties?.count || 1,
      url: f.properties?.url,
      source: 'GDELT',
    })).filter((e: any) => e.lat && e.lng);
  } catch { return []; }
}

// Internet outages via Cloudflare Radar
async function fetchOutages(): Promise<any[]> {
  try {
    // Use IODA as a free alternative
    const res = await fetch('https://api.ioda.inetintel.cc.gatech.edu/v2/alerts/ongoing?limit=20', {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).slice(0, 20).map((a: any) => ({
      id: a.entity?.code || `outage-${Math.random().toString(36).slice(2)}`,
      name: a.entity?.name || 'Unknown',
      type: a.entity?.type,
      level: a.level,
      score: a.score,
      startTime: a.time?.begin,
    }));
  } catch { return []; }
}

// Generate AI World Brief
async function generateWorldBrief(disasters: any[], earthquakes: any[], eonet: any[], protests: any[], fires: any[]): Promise<string> {
  try {
    const context = [
      `ภัยพิบัติ GDACS: ${disasters.length} เหตุการณ์`,
      ...disasters.slice(0, 5).map((d: any) => `- ${d.name} (${d.severity}) ที่ ${d.country || 'ไม่ระบุ'}`),
      `แผ่นดินไหว USGS: ${earthquakes.length} ครั้ง (24 ชม.)`,
      ...earthquakes.slice(0, 5).map((e: any) => `- M${e.magnitude} ${e.name}`),
      `เหตุการณ์ธรรมชาติ NASA: ${eonet.length} เหตุการณ์`,
      ...eonet.slice(0, 3).map((e: any) => `- ${e.name} (${e.type})`),
      `การประท้วง/ความไม่สงบ GDELT: ${protests.length} จุด`,
      ...protests.slice(0, 3).map((p: any) => `- ${p.name} (mentions: ${p.count})`),
      `ไฟป่า NASA FIRMS: ${fires.length} จุดความร้อน`,
    ].join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return generateFallbackBrief(disasters, earthquakes, eonet, protests, fires);
    }

    const res = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `คุณคือ ABLE Intelligence Analyst — นักวิเคราะห์ข่าวกรองระดับโลก ให้สรุปสถานการณ์โลกเป็นภาษาไทย แบบกระชับ ชัดเจน เน้นข้อมูลสำคัญ ใช้อิโมจิ ระบุระดับภัยคุกคาม (🔴 วิกฤต / 🟠 สูง / 🟡 ปานกลาง / 🟢 ปกติ) สรุปไม่เกิน 600 คำ แบ่งเป็นหมวดหมู่ชัดเจน ให้ข้อมูลเชิงลึกเหมือนนักวิเคราะห์มืออาชีพ`
          },
          {
            role: 'user',
            content: `วิเคราะห์สถานการณ์โลกล่าสุดจากข้อมูลเรียลไทม์:\n\n${context}\n\nกรุณาสรุปสถานการณ์โลกวันนี้ แบ่งเป็น:\n1. ⚔️ ความขัดแย้งและความมั่นคง\n2. 🌍 ภัยพิบัติและภัยธรรมชาติ\n3. 🔥 ไฟป่าและจุดความร้อน\n4. 📊 ความเสี่ยงเชิงภูมิรัฐศาสตร์\n5. 🎯 จุดเฝ้าระวังพิเศษและคำแนะนำ`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return generateFallbackBrief(disasters, earthquakes, eonet, protests, fires);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || generateFallbackBrief(disasters, earthquakes, eonet, protests, fires);
  } catch {
    return generateFallbackBrief(disasters, earthquakes, eonet, protests, fires);
  }
}

function generateFallbackBrief(disasters: any[], earthquakes: any[], eonet: any[], protests: any[], fires: any[]): string {
  const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  let brief = `🌐 **ABLE WORLD BRIEF** — ${now}\n\n`;
  brief += `📊 **สรุปภาพรวม**: `;
  brief += `ภัยพิบัติ ${disasters.length} | แผ่นดินไหว ${earthquakes.length} | `;
  brief += `ธรรมชาติ ${eonet.length} | ประท้วง ${protests.length} | ไฟป่า ${fires.length} จุด\n\n`;

  if (disasters.length > 0) {
    brief += `⚠️ **ภัยพิบัติ (${disasters.length})**\n`;
    disasters.slice(0, 5).forEach(d => {
      brief += `${d.severity === 'Red' ? '🔴' : '🟠'} ${d.name} — ${d.country || 'ไม่ระบุ'}\n`;
    });
    brief += '\n';
  }

  if (earthquakes.length > 0) {
    brief += `🌋 **แผ่นดินไหว 24 ชม. (${earthquakes.length})**\n`;
    earthquakes.slice(0, 3).forEach(e => {
      brief += `📍 M${e.magnitude} — ${e.name}\n`;
    });
    brief += '\n';
  }

  if (fires.length > 0) {
    brief += `🔥 **จุดความร้อนดาวเทียม: ${fires.length} จุด**\n\n`;
  }

  brief += '🎯 **จุดเฝ้าระวัง**: ช่องแคบฮอร์มุซ, ทะเลจีนใต้, ยูเครน, กาซา, ทะเลแดง';
  return brief;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'all' } = await req.json().catch(() => ({}));

    // Fetch all data in parallel
    const [disasters, earthquakes, eonet, protests, fires, outages] = await Promise.all([
      fetchGDACS(),
      fetchUSGS(),
      fetchEONET(),
      fetchGDELTProtests(),
      fetchFIRMS(),
      fetchOutages(),
    ]);

    let worldBrief = '';
    if (action === 'all' || action === 'brief') {
      worldBrief = await generateWorldBrief(disasters, earthquakes, eonet, protests, fires);
    }

    return new Response(JSON.stringify({
      disasters,
      earthquakes,
      eonet,
      protests,
      fires,
      outages,
      worldBrief,
      timestamp: new Date().toISOString(),
      sources: {
        gdacs: disasters.length,
        usgs: earthquakes.length,
        eonet: eonet.length,
        gdelt: protests.length,
        firms: fires.length,
        outages: outages.length,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
