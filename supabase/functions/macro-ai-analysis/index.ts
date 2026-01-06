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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LOVABLE_API_KEY not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create structured prompt for financial analysis
    const systemPrompt = `คุณเป็น ABLE-HF 3.0 AI นักวิเคราะห์การเงินระดับ Hedge Fund ที่มีความเชี่ยวชาญสูง
    
คุณต้องวิเคราะห์ข่าวและให้ผลลัพธ์เป็น JSON ที่มี:
1. sentiment: "bullish" หรือ "bearish" หรือ "neutral"
2. P_up_pct: ความน่าจะเป็นที่ราคาจะขึ้น (0-100)
3. P_down_pct: ความน่าจะเป็นที่ราคาจะลง (0-100)  
4. confidence: ระดับความมั่นใจ (0-100)
5. decision: "STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"
6. thai_summary: สรุปการวิเคราะห์เป็นภาษาไทย (2-3 ประโยค)
7. key_drivers: ปัจจัยหลักที่ขับเคลื่อนราคา (array 3 items)
8. risk_warnings: คำเตือนความเสี่ยง (array 2 items)
9. market_regime: "trending_up", "trending_down", "ranging", "volatile"

วิเคราะห์อย่างละเอียดโดยพิจารณา:
- Sentiment ของข่าว
- ผลกระทบต่อสินทรัพย์
- สภาพตลาดปัจจุบัน
- ความเสี่ยงและโอกาส

ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น`

    const userPrompt = `
วิเคราะห์สินทรัพย์: ${symbol}
${currentPrice ? `ราคาปัจจุบัน: ${currentPrice}` : ''}
${priceChange ? `การเปลี่ยนแปลง 24h: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}

ข่าวล่าสุด (${headlines.length} ข่าว):
${headlines.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n')}

วิเคราะห์และตอบเป็น JSON`

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
        max_tokens: 1500,
        temperature: 0.3
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('AI API Error:', errorText)
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()
    const content = aiResult.choices?.[0]?.message?.content

    // Parse JSON from response
    let analysis
    try {
      // Clean markdown code blocks if present
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      analysis = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content)
      // Fallback analysis
      analysis = {
        sentiment: 'neutral',
        P_up_pct: 50,
        P_down_pct: 50,
        confidence: 50,
        decision: 'HOLD',
        thai_summary: `วิเคราะห์ ${symbol}: ตลาดมีความไม่แน่นอน แนะนำรอสัญญาณชัดเจน`,
        key_drivers: ['Market sentiment', 'Technical levels', 'Risk appetite'],
        risk_warnings: ['High volatility', 'Uncertain direction'],
        market_regime: 'ranging'
      }
    }

    // Ensure all required fields exist
    const result = {
      symbol,
      sentiment: analysis.sentiment || 'neutral',
      P_up_pct: Math.min(100, Math.max(0, analysis.P_up_pct || 50)),
      P_down_pct: Math.min(100, Math.max(0, analysis.P_down_pct || 50)),
      confidence: Math.min(100, Math.max(0, analysis.confidence || 50)),
      decision: analysis.decision || 'HOLD',
      thai_summary: analysis.thai_summary || `กำลังวิเคราะห์ ${symbol}...`,
      key_drivers: Array.isArray(analysis.key_drivers) ? analysis.key_drivers.slice(0, 3) : [],
      risk_warnings: Array.isArray(analysis.risk_warnings) ? analysis.risk_warnings.slice(0, 2) : [],
      market_regime: analysis.market_regime || 'ranging',
      analyzed_at: new Date().toISOString(),
      model: 'gemini-2.5-flash',
      news_count: headlines.length
    }

    return new Response(
      JSON.stringify({ success: true, analysis: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Macro AI Analysis Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
