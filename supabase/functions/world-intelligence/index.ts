import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch GDACS disasters
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

// Fetch NASA EONET natural events
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

// Fetch USGS earthquakes M4.5+
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

// Generate AI World Brief using Lovable AI
async function generateWorldBrief(disasters: any[], earthquakes: any[], eonet: any[]): Promise<string> {
  try {
    const context = [
      `ภัยพิบัติ GDACS: ${disasters.length} เหตุการณ์`,
      ...disasters.slice(0, 5).map((d: any) => `- ${d.name} (${d.severity}) ที่ ${d.country || 'ไม่ระบุ'}`),
      `แผ่นดินไหว USGS: ${earthquakes.length} ครั้ง (24 ชม.)`,
      ...earthquakes.slice(0, 5).map((e: any) => `- M${e.magnitude} ${e.name}`),
      `เหตุการณ์ธรรมชาติ NASA: ${eonet.length} เหตุการณ์`,
      ...eonet.slice(0, 3).map((e: any) => `- ${e.name} (${e.type})`),
    ].join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return generateFallbackBrief(disasters, earthquakes, eonet);
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
            content: `คุณคือนักวิเคราะห์ข่าวกรองระดับโลก (ABLE Intelligence Analyst) ให้สรุปสถานการณ์โลกเป็นภาษาไทย แบบกระชับ ชัดเจน เน้นข้อมูลสำคัญ ใช้อิโมจิ และระบุระดับภัยคุกคาม (🔴 วิกฤต / 🟠 สูง / 🟡 ปานกลาง / 🟢 ปกติ) สรุปไม่เกิน 500 คำ แบ่งเป็นหมวดหมู่ชัดเจน`
          },
          {
            role: 'user',
            content: `วิเคราะห์สถานการณ์โลกล่าสุดจากข้อมูลเรียลไทม์:\n\n${context}\n\nกรุณาสรุปสถานการณ์โลกวันนี้ แบ่งเป็น:\n1. ⚔️ ความขัดแย้งและความมั่นคง\n2. 🌍 ภัยพิบัติธรรมชาติ\n3. 📊 ความเสี่ยงเชิงภูมิรัฐศาสตร์\n4. 🎯 จุดเฝ้าระวังพิเศษ`
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return generateFallbackBrief(disasters, earthquakes, eonet);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || generateFallbackBrief(disasters, earthquakes, eonet);
  } catch {
    return generateFallbackBrief(disasters, earthquakes, eonet);
  }
}

function generateFallbackBrief(disasters: any[], earthquakes: any[], eonet: any[]): string {
  const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  let brief = `🌐 **ABLE WORLD BRIEF** — ${now}\n\n`;

  if (disasters.length > 0) {
    brief += `⚠️ **ภัยพิบัติกำลังเกิดขึ้น (${disasters.length} เหตุการณ์)**\n`;
    disasters.slice(0, 5).forEach(d => {
      const icon = d.severity === 'Red' ? '🔴' : '🟠';
      brief += `${icon} ${d.name} — ${d.country || 'ไม่ระบุ'}\n`;
    });
    brief += '\n';
  }

  if (earthquakes.length > 0) {
    brief += `🌋 **แผ่นดินไหว 24 ชม. (${earthquakes.length} ครั้ง)**\n`;
    earthquakes.slice(0, 3).forEach(e => {
      brief += `📍 M${e.magnitude} — ${e.name}\n`;
    });
    brief += '\n';
  }

  if (eonet.length > 0) {
    brief += `🛰️ **เหตุการณ์จาก NASA (${eonet.length})**\n`;
    eonet.slice(0, 3).forEach(e => {
      brief += `📡 ${e.name} (${e.type})\n`;
    });
  }

  brief += '\n🎯 **จุดเฝ้าระวัง**: ช่องแคบฮอร์มุซ, ทะเลจีนใต้, ยูเครน-รัสเซีย, กาซา';
  return brief;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'all' } = await req.json().catch(() => ({}));

    // Fetch all data in parallel
    const [disasters, earthquakes, eonet] = await Promise.all([
      fetchGDACS(),
      fetchUSGS(),
      fetchEONET(),
    ]);

    let worldBrief = '';
    if (action === 'all' || action === 'brief') {
      worldBrief = await generateWorldBrief(disasters, earthquakes, eonet);
    }

    return new Response(JSON.stringify({
      disasters,
      earthquakes,
      eonet,
      worldBrief,
      timestamp: new Date().toISOString(),
      sources: {
        gdacs: disasters.length,
        usgs: earthquakes.length,
        eonet: eonet.length,
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
