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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create structured prompt for financial analysis
    const prompt = `คุณเป็น ABLE-HF 3.0 AI นักวิเคราะห์การเงินระดับ Hedge Fund

📊 **วิเคราะห์สินทรัพย์**: ${symbol}
${currentPrice ? `💰 ราคาปัจจุบัน: ${currentPrice.toLocaleString()}` : ''}
${priceChange ? `📈 เปลี่ยนแปลง 24h: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}

📰 **ข่าวล่าสุด** (${headlines.length} ข่าว):
${headlines.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n')}

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

กรุณาวิเคราะห์ทีละขั้นตอนแบบละเอียด`

    console.log(`📤 Sending streaming request to Gemini Direct API...`)

    // Make streaming request to Google Gemini directly
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      }
    )

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Gemini API Error:', errorText)
      
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${aiResponse.status}`, details: errorText }),
        { status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Gemini streaming response started`)

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
