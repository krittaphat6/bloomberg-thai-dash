// Gemini Daily Report Analysis - Reads 1 month of news and generates comprehensive report
// Plus Flowchart data for visualization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  sentiment?: string;
  url: string;
}

interface FlowchartNode {
  id: string;
  type: 'start' | 'decision' | 'process' | 'action' | 'result' | 'condition';
  label: string;
  details?: string;
  color?: 'emerald' | 'red' | 'orange' | 'blue' | 'purple' | 'yellow';
}

interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  type?: 'yes' | 'no' | 'default';
}

interface DailyReportResult {
  report: {
    title: string;
    dateRange: string;
    summary: string;
    keyFindings: string[];
    marketThemes: { theme: string; description: string; impact: string }[];
    riskFactors: string[];
    opportunities: string[];
    outlook: string;
    recommendation: string;
  };
  flowchart: {
    nodes: FlowchartNode[];
    edges: FlowchartEdge[];
  };
  thinking: string;
  newsAnalyzed: number;
  generatedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { news } = await req.json() as { news: NewsItem[] };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Filter news from last 30 days
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const monthlyNews = news.filter(n => n.timestamp > oneMonthAgo);
    
    console.log(`📊 Analyzing ${monthlyNews.length} news from last 30 days`);

    // Create news summary for AI
    const newsSummary = monthlyNews.slice(0, 200).map(n => 
      `[${n.source}] ${n.title} (${n.sentiment || 'neutral'})`
    ).join('\n');

    const systemPrompt = `คุณคือ ABLE-HF 3.0 AI Analyst ผู้เชี่ยวชาญด้านการวิเคราะห์ตลาดการเงินระดับโลก

## หน้าที่
วิเคราะห์ข่าวสาร 1 เดือนที่ผ่านมาและสร้าง:
1. **Comprehensive Report** - รายงานวิเคราะห์ตลาดแบบละเอียด
2. **Flowchart** - แผนภูมิกระบวนการตัดสินใจลงทุน

## รูปแบบ Flowchart ที่ต้องการ
สร้าง flowchart ที่แสดง:
- จุดเริ่มต้น (สถานการณ์ตลาดปัจจุบัน)
- เงื่อนไข/คำถามตัดสินใจ (decision nodes)
- กระบวนการวิเคราะห์ (process nodes)  
- การกระทำ/Action (action nodes)
- ผลลัพธ์ที่คาดหวัง (result nodes)

ตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้:

{
  "thinking": "การคิดวิเคราะห์ของ AI (ภาษาไทย 200-300 คำ)",
  "report": {
    "title": "ชื่อรายงาน",
    "dateRange": "ช่วงเวลา",
    "summary": "สรุปภาพรวมตลาด 3-5 ประโยค",
    "keyFindings": ["ข้อค้นพบสำคัญ 5-7 ข้อ"],
    "marketThemes": [
      {"theme": "ธีม", "description": "รายละเอียด", "impact": "high/medium/low"}
    ],
    "riskFactors": ["ปัจจัยเสี่ยง 3-5 ข้อ"],
    "opportunities": ["โอกาสการลงทุน 3-5 ข้อ"],
    "outlook": "มุมมองตลาด 2-3 ประโยค",
    "recommendation": "คำแนะนำโดยรวม"
  },
  "flowchart": {
    "nodes": [
      {"id": "start", "type": "start", "label": "สถานการณ์ตลาด", "color": "blue"},
      {"id": "d1", "type": "decision", "label": "Fed ลดดอกเบี้ย?", "color": "orange"},
      {"id": "p1", "type": "process", "label": "วิเคราะห์ผลกระทบ", "color": "purple"},
      {"id": "a1", "type": "action", "label": "Buy Gold", "color": "emerald"},
      {"id": "a2", "type": "action", "label": "Sell USD", "color": "red"},
      {"id": "r1", "type": "result", "label": "Target +5%", "color": "emerald"}
    ],
    "edges": [
      {"from": "start", "to": "d1", "label": "เริ่มวิเคราะห์"},
      {"from": "d1", "to": "p1", "label": "Yes", "type": "yes"},
      {"from": "d1", "to": "a2", "label": "No", "type": "no"},
      {"from": "p1", "to": "a1"},
      {"from": "a1", "to": "r1"}
    ]
  }
}`;

    const userPrompt = `จำนวนข่าว: ${monthlyNews.length} ข่าว
ช่วงเวลา: 30 วันที่ผ่านมา

## ข่าวสารที่ต้องวิเคราะห์:
${newsSummary}

กรุณาวิเคราะห์และสร้าง:
1. รายงานตลาดแบบละเอียด
2. Flowchart กระบวนการตัดสินใจลงทุน (อย่างน้อย 8-12 nodes)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded - กรุณารอสักครู่แล้วลองใหม่" 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Credits หมด - กรุณาเติม Credits ที่ Settings → Workspace → Usage" 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let result: DailyReportResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          ...parsed,
          newsAnalyzed: monthlyNews.length,
          generatedAt: new Date().toISOString(),
        };
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      // Fallback response
      result = {
        thinking: "ระบบกำลังวิเคราะห์ข่าวสารจากหลากหลายแหล่ง...",
        report: {
          title: "ABLE-HF 3.0 Monthly Market Report",
          dateRange: "30 Days",
          summary: `วิเคราะห์จาก ${monthlyNews.length} ข่าว ในช่วง 30 วันที่ผ่านมา`,
          keyFindings: ["กำลังวิเคราะห์ข้อมูล..."],
          marketThemes: [{ theme: "Market Analysis", description: "Processing...", impact: "medium" }],
          riskFactors: ["Please wait..."],
          opportunities: ["Processing..."],
          outlook: "กำลังประมวลผล...",
          recommendation: "รอการวิเคราะห์"
        },
        flowchart: {
          nodes: [
            { id: "start", type: "start", label: "เริ่มวิเคราะห์", color: "blue" },
            { id: "process", type: "process", label: "Processing...", color: "purple" }
          ],
          edges: [{ from: "start", to: "process" }]
        },
        newsAnalyzed: monthlyNews.length,
        generatedAt: new Date().toISOString(),
      };
    }

    console.log("✅ Daily report generated successfully");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
