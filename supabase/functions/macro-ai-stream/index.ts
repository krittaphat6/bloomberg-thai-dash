import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  symbol: string;
  headlines: string[];
  currentPrice?: number;
  priceChange?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const request: AnalysisRequest = await req.json()
    const { symbol, headlines, currentPrice, priceChange } = request

    console.log(`📊 Starting streaming analysis for ${symbol}`)

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create structured prompt for financial analysis - ask AI to think step by step
    const systemPrompt = `คุณเป็น ABLE-HF 3.0 AI นักวิเคราะห์การเงินระดับ Hedge Fund

**คำสั่ง**: วิเคราะห์ข่าวอย่างละเอียดและแสดงขั้นตอนการคิดทีละขั้นเป็นภาษาไทย

**Format การตอบ**:
1. ขั้นแรก ให้คิดและอธิบายการวิเคราะห์เป็นภาษาไทย (ใน <thinking> tag)
2. จากนั้นให้ผลลัพธ์เป็น JSON (ใน <result> tag)

**ตัวอย่าง**:
<thinking>
🔍 กำลังอ่านข่าวทั้งหมด...
- ข่าว 1: Fed ประกาศขึ้นดอกเบี้ย → ส่งผลลบต่อทอง
- ข่าว 2: เงินเฟ้อสูงกว่าคาด → หนุนทอง
...ประมวลผล sentiment...
📊 Sentiment รวม: Bullish 65% vs Bearish 35%
📈 คำนวณ P(Up): 62%
🎯 Decision: BUY
</thinking>
<result>
{"sentiment":"bullish","P_up_pct":62,"P_down_pct":38,"confidence":75,"decision":"BUY","thai_summary":"ทองมีแนวโน้มขึ้นจากเงินเฟ้อสูง","key_drivers":["Inflation","Fed policy","Safe haven demand"],"risk_warnings":["DXY strength","Rate hikes"],"market_regime":"trending_up"}
</result>

**สิ่งที่ต้องวิเคราะห์**:
- อ่านข่าวแต่ละข่าวและประเมิน sentiment
- นับ bullish vs bearish signals
- คำนวณ probability
- ให้ decision ชัดเจน`

    const userPrompt = `
📊 **วิเคราะห์สินทรัพย์**: ${symbol}
${currentPrice ? `💰 ราคาปัจจุบัน: ${currentPrice.toLocaleString()}` : ''}
${priceChange ? `📈 เปลี่ยนแปลง 24h: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}

📰 **ข่าวล่าสุด** (${headlines.length} ข่าว):
${headlines.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n')}

🧠 กรุณาวิเคราะห์ทีละขั้นตอนแบบละเอียด`

    console.log(`📤 Sending streaming request to Gemini...`)

    // Make streaming request to Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        max_tokens: 2000
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('AI API Error:', errorText)
      
      return new Response(
        JSON.stringify({ error: `AI API error: ${aiResponse.status}` }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the stream directly to client
    return new Response(aiResponse.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error: any) {
    console.error('Macro AI Stream Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
