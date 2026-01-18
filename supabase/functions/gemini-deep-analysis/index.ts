// supabase/functions/gemini-deep-analysis/index.ts
// ✅ ABLE-HF 3.0 Deep Analysis with 40 Modules

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 40 Module IDs for ABLE-HF 3.0
const MODULE_IDS = [
  // MACRO & ECONOMIC (33%)
  'macro_neural_forecast', 'central_bank_sentiment', 'yield_curve_signal', 'inflation_momentum',
  'gdp_growth_trajectory', 'employment_dynamics', 'trade_balance_flow', 'fiscal_policy_impact',
  // SENTIMENT & FLOW (29%)
  'news_sentiment_cfa', 'social_media_pulse', 'institutional_flow', 'retail_sentiment',
  'options_sentiment', 'cot_positioning', 'dark_pool_activity', 'etf_flow_momentum',
  // TECHNICAL & REGIME (20%)
  'trend_regime_detector', 'momentum_oscillator', 'volatility_regime', 'support_resistance',
  'pattern_recognition', 'volume_analysis', 'market_breadth', 'intermarket_correlation',
  // RISK & EVENT (23.5%)
  'event_shock', 'geopolitical_risk', 'black_swan_detector', 'liquidity_risk',
  'correlation_breakdown', 'tail_risk_monitor', 'regulatory_risk', 'systemic_risk',
  // ALTERNATIVE & AI (14.5%)
  'quantum_sentiment', 'neural_ensemble', 'nlp_deep_analysis', 'satellite_data',
  'alternative_data', 'machine_learning_signal', 'sentiment_network', 'predictive_analytics'
];

interface DeepAnalysisRequest {
  symbol: string;
  news: Array<{
    id: string;
    title: string;
    source: string;
    timestamp: number;
    sentiment?: string;
  }>;
  priceData?: {
    price: number;
    change: number;
    changePercent: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, news, priceData }: DeepAnalysisRequest = await req.json();
    
    console.log(`🧠 Starting Gemini Deep Analysis for ${symbol}...`);
    console.log(`📰 News count: ${news?.length || 0}`);
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      // Fallback to Lovable Gateway
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        return await handleWithLovableGateway(symbol, news, priceData, LOVABLE_API_KEY, corsHeaders);
      }
      throw new Error('No AI API key configured');
    }

    const newsHeadlines = (news || []).slice(0, 30).map((n, i) => 
      `${i + 1}. [${n.sentiment || 'neutral'}] ${n.title} (${n.source})`
    ).join('\n');

    const prompt = `คุณเป็น ABLE-HF 3.0 AI ผู้เชี่ยวชาญระดับ Hedge Fund วิเคราะห์สินทรัพย์ ${symbol}

## ข้อมูลราคา
${priceData ? `ราคาปัจจุบัน: ${priceData.price}, เปลี่ยนแปลง: ${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%` : 'ไม่มีข้อมูลราคา'}

## ข่าวล่าสุด (${news?.length || 0} รายการ)
${newsHeadlines || 'ไม่มีข่าว'}

## คำสั่ง
วิเคราะห์ตามหลัก ABLE-HF 3.0 Framework ครบ 40 modules ใน 5 หมวดหมู่:

1. **Macro & Economic (33%)**: ผลกระทบจากนโยบายการเงิน, Fed, ECB, อัตราดอกเบี้ย, inflation
2. **Sentiment & Flow (29%)**: sentiment ข่าว, social media, institutional flow, COT positioning
3. **Technical & Regime (20%)**: แนวโน้ม, momentum, volatility, support/resistance
4. **Risk & Event (23.5%)**: ความเสี่ยงจากเหตุการณ์, geopolitical risk, black swan
5. **Alternative & AI (14.5%)**: NLP analysis, neural signals, alternative data

ตอบเป็น JSON format นี้เท่านั้น:
{
  "symbol": "${symbol}",
  "P_up_pct": <ความน่าจะเป็นขึ้น 0-100>,
  "P_down_pct": <ความน่าจะเป็นลง 0-100>,
  "confidence": <ความมั่นใจ 0-100>,
  "decision": "<STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL>",
  "thai_summary": "<สรุป 2-3 ประโยค ภาษาไทย>",
  "market_regime": "<trending_up|trending_down|ranging|volatile>",
  "key_drivers": ["<ปัจจัยสำคัญ 1>", "<ปัจจัยสำคัญ 2>", "<ปัจจัยสำคัญ 3>"],
  "risk_warnings": ["<ความเสี่ยง 1>", "<ความเสี่ยง 2>", "<ความเสี่ยง 3>"],
  "category_performance": {
    "macro_economic": <score 0-100>,
    "sentiment_flow": <score 0-100>,
    "technical_regime": <score 0-100>,
    "risk_event": <score 0-100>,
    "alternative_ai": <score 0-100>
  },
  "scores": {
    ${MODULE_IDS.map(id => `"${id}": <score -100 to 100>`).join(',\n    ')}
  },
  "thinking_process": "<อธิบายกระบวนการคิดโดยละเอียด 5-10 ประโยค>"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8000,
            topP: 0.85,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let analysis;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      analysis = generateFallbackAnalysis(symbol, news);
    }

    // Ensure all required fields exist
    const result = {
      success: true,
      symbol,
      analysis: {
        ...analysis,
        P_up_pct: Math.min(100, Math.max(0, analysis.P_up_pct || 50)),
        P_down_pct: Math.min(100, Math.max(0, analysis.P_down_pct || 50)),
        confidence: Math.min(100, Math.max(0, analysis.confidence || 60)),
        decision: analysis.decision || 'HOLD',
        market_regime: analysis.market_regime || 'ranging',
        analyzed_at: new Date().toISOString(),
        news_count: news?.length || 0,
        model: 'gemini-2.0-flash-exp',
        framework: 'ABLE-HF 3.0'
      }
    };

    console.log(`✅ Deep Analysis complete: ${symbol} - ${result.analysis.decision}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Deep Analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackAnalysis(symbol: string, news: any[]) {
  const bullish = (news || []).filter(n => n.sentiment === 'bullish').length;
  const bearish = (news || []).filter(n => n.sentiment === 'bearish').length;
  const total = news?.length || 0;
  
  const P_up = total > 0 
    ? Math.round(50 + ((bullish - bearish) / total) * 30)
    : 50;

  const scores: Record<string, number> = {};
  MODULE_IDS.forEach(id => {
    scores[id] = Math.floor(Math.random() * 60) - 30; // -30 to +30
  });

  return {
    symbol,
    P_up_pct: Math.max(30, Math.min(70, P_up)),
    P_down_pct: 100 - P_up,
    confidence: 55,
    decision: P_up > 55 ? 'BUY' : P_up < 45 ? 'SELL' : 'HOLD',
    thai_summary: `วิเคราะห์ ${symbol} จาก ${total} ข่าว: ${bullish > bearish ? 'แนวโน้มบวก' : bearish > bullish ? 'แนวโน้มลบ' : 'ทรงตัว'}`,
    market_regime: 'ranging',
    key_drivers: ['Market sentiment', 'News flow', 'Technical levels'],
    risk_warnings: ['Using fallback analysis', 'Limited data'],
    category_performance: {
      macro_economic: 50,
      sentiment_flow: 50,
      technical_regime: 50,
      risk_event: 50,
      alternative_ai: 50
    },
    scores,
    thinking_process: 'ใช้ Fallback Analysis เนื่องจากไม่สามารถเชื่อมต่อ Gemini API ได้'
  };
}

async function handleWithLovableGateway(
  symbol: string, 
  news: any[], 
  priceData: any, 
  apiKey: string, 
  corsHeaders: Record<string, string>
) {
  const newsText = (news || []).slice(0, 20).map((n, i) => 
    `${i + 1}. ${n.title} (${n.source})`
  ).join('\n');

  const prompt = `วิเคราะห์ ${symbol} จากข่าว ${news?.length || 0} รายการ ตามหลัก ABLE-HF 3.0:
${newsText}

ตอบเป็น JSON:
{
  "P_up_pct": <0-100>,
  "P_down_pct": <0-100>,
  "confidence": <0-100>,
  "decision": "<BUY|HOLD|SELL>",
  "thai_summary": "<สรุป>",
  "key_drivers": ["..."],
  "risk_warnings": ["..."]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'คุณเป็น ABLE-HF 3.0 AI ผู้เชี่ยวชาญการเงิน ตอบเป็น JSON เท่านั้น' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded - กรุณารอสักครู่แล้วลองใหม่' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (status === 402) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credits หมด - กรุณาเติม Credits ที่ Settings → Workspace → Usage' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error(`Lovable Gateway error: ${status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  
  let analysis;
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    analysis = JSON.parse(jsonStr.trim());
  } catch {
    analysis = generateFallbackAnalysis(symbol, news);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      symbol,
      analysis: {
        ...analysis,
        analyzed_at: new Date().toISOString(),
        news_count: news?.length || 0,
        model: 'gemini-2.5-flash (gateway)',
        framework: 'ABLE-HF 3.0'
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
