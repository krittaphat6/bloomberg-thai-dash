import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnalysisRequest {
  symbol?: string;
  headlines?: string[];
  currentPrice?: number;
  priceChange?: number;
  prompt?: string;
  systemPrompt?: string;
  context?: any;
  history?: ChatMessage[];
}

const ABLE_SYSTEM_PROMPT = `คุณคือ ABLE AI ผู้ช่วย AI สำหรับ Trading Platform ชื่อ ABLE Terminal
บุคลิก: ฉลาด ตรงประเด็น เป็นมิตร มีความเชี่ยวชาญด้านการเงินและการเทรด

กฎสำคัญ:
1. จำทุกสิ่งที่คุยกันในการสนทนานี้ และอ้างอิงถึงได้เสมอ
2. ห้ามพูดซ้ำสิ่งที่บอกไปแล้วในการสนทนาเดียวกัน
3. ถ้าผู้ใช้ถามต่อจากคำถามก่อน ให้เข้าใจ context และตอบต่อได้ทันที
4. ตอบตรงประเด็น กระชับ ไม่วกวน
5. ตอบภาษาเดียวกับผู้ใช้ (ไทย/อังกฤษ)
6. ถ้าไม่รู้ ให้บอกตรงๆ อย่าเดา
7. คุณมีสิทธิ์เข้าถึงข้อมูลทุกอย่างในแอป: ตลาด, ข่าว, COT, กราฟ, Trading Journal, World Monitor`;

function buildGeminiContents(
  history: ChatMessage[],
  currentPrompt: string,
  systemPrompt: string,
  contextInfo: string
) {
  const contents: any[] = [];

  // First message includes system prompt
  if (history.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n${currentPrompt}${contextInfo}` }]
    });
  } else {
    // Add system as first user turn, then history
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'เข้าใจแล้วครับ พร้อมช่วยเหลือ' }]
    });

    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `${currentPrompt}${contextInfo}` }]
    });
  }

  return contents;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const request: AnalysisRequest = await req.json()
    const { symbol, headlines, currentPrice, priceChange, prompt, systemPrompt: customSystemPrompt, context, history } = request

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    
    if (!GEMINI_API_KEY) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'No AI API key configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await handleWithLovableGateway(request, LOVABLE_API_KEY, corsHeaders)
    }

    // Direct prompt mode (chat) — with multi-turn history
    if (prompt) {
      const contextInfo = context ? `\n\n--- App Data Context ---\n${JSON.stringify(context, null, 2)}` : ''
      const sysPrompt = customSystemPrompt || ABLE_SYSTEM_PROMPT;
      const contents = buildGeminiContents(history || [], prompt, sysPrompt, contextInfo);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.9,
            }
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Gemini API error:', response.status, errorText)
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถประมวลผลได้'

      return new Response(
        JSON.stringify({ success: true, analysis: content }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // News analysis mode
    const headlinesList = Array.isArray(headlines) ? headlines : []
    
    const newsSystemPrompt = `คุณเป็น ABLE-HF 3.0 AI นักวิเคราะห์การเงินระดับ Hedge Fund
คุณต้องวิเคราะห์ข่าวและให้ผลลัพธ์เป็น JSON ที่มี:
1. sentiment: "bullish" หรือ "bearish" หรือ "neutral"
2. P_up_pct: ความน่าจะเป็นที่ราคาจะขึ้น (0-100)
3. P_down_pct: ความน่าจะเป็นที่ราคาจะลง (0-100)  
4. confidence: ระดับความมั่นใจ (0-100)
5. decision: "STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"
6. thai_summary: สรุปการวิเคราะห์เป็นภาษาไทย (2-3 ประโยค)
7. key_drivers: ปัจจัยหลัก (array 3 items)
8. risk_warnings: คำเตือนความเสี่ยง (array 2 items)
9. market_regime: "trending_up", "trending_down", "ranging", "volatile"
ตอบเป็น JSON เท่านั้น`

    const userPrompt = `วิเคราะห์สินทรัพย์: ${symbol || 'GENERAL'}
${currentPrice ? `ราคาปัจจุบัน: ${currentPrice}` : ''}
${priceChange ? `การเปลี่ยนแปลง 24h: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%` : ''}
ข่าวล่าสุด (${headlinesList.length} ข่าว):
${headlinesList.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n') || 'ไม่มีข่าว'}
วิเคราะห์และตอบเป็น JSON`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${newsSystemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
            topP: 0.8,
            topK: 40,
            responseMimeType: "application/json"
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API Error:', errorText)
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    let analysis
    try {
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      analysis = JSON.parse(jsonStr.trim())
    } catch {
      analysis = {
        sentiment: 'neutral', P_up_pct: 50, P_down_pct: 50, confidence: 50,
        decision: 'HOLD',
        thai_summary: `วิเคราะห์ ${symbol}: ตลาดมีความไม่แน่นอน แนะนำรอสัญญาณชัดเจน`,
        key_drivers: ['Market sentiment', 'Technical levels', 'Risk appetite'],
        risk_warnings: ['High volatility', 'Uncertain direction'],
        market_regime: 'ranging'
      }
    }

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
      news_count: headlinesList.length
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

async function handleWithLovableGateway(request: AnalysisRequest, apiKey: string, corsHeaders: any) {
  const { prompt, systemPrompt: customSystemPrompt, history } = request
  
  const messages: any[] = [
    { role: 'system', content: customSystemPrompt || ABLE_SYSTEM_PROMPT }
  ];

  // Add history for multi-turn
  if (history && history.length > 0) {
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: prompt || 'Hello' });

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: 2048,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const errorStatus = response.status
    if (errorStatus === 429 || errorStatus === 402) {
      return new Response(
        JSON.stringify({ success: false, error: errorStatus === 429 ? 'Rate limit exceeded' : 'AI credits exhausted' }),
        { status: errorStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    throw new Error(`AI API error: ${errorStatus}`)
  }

  const result = await response.json()
  const content = result.choices?.[0]?.message?.content || 'ไม่สามารถประมวลผลได้'

  return new Response(
    JSON.stringify({ success: true, analysis: content }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
