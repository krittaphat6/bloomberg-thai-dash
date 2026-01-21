// supabase/functions/gemini-deep-analysis/index.ts
// ✅ ABLE-HF 3.0 Deep Analysis with 40 Modules + Smart News Filtering

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

// ✅ NEW: FilteredNews interface
interface FilteredNews {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  sentiment?: string;
  relevanceScore: number;
  impactScore: number;
  keyFactors: string[];
  isMarketMoving: boolean;
}

// ✅ NEW: Filter and rank news using Gemini
async function filterAndRankNews(
  news: any[], 
  symbol: string, 
  apiKey: string
): Promise<{ filteredNews: FilteredNews[]; stats: any }> {
  console.log(`🔍 Filtering ${news.length} news for ${symbol}...`);
  
  const filteredNews: FilteredNews[] = [];
  const batchSize = 10; // Process 10 news at a time for efficiency
  
  // Process news in batches
  for (let i = 0; i < Math.min(news.length, 50); i += batchSize) {
    const batch = news.slice(i, i + batchSize);
    
    const batchPrompt = `คุณเป็น AI ผู้เชี่ยวชาญวิเคราะห์ข่าวการเงิน วิเคราะห์ว่าข่าวแต่ละข่าวมีความเกี่ยวข้องและผลกระทบต่อ ${symbol} มากน้อยเพียงใด

ข่าวที่ต้องวิเคราะห์:
${batch.map((n, idx) => `${idx + 1}. "${n.title}" (${n.source})`).join('\n')}

ตอบเป็น JSON array (ตอบแค่ JSON เท่านั้น ไม่ต้องมี markdown):
[
  {
    "index": 1,
    "relevanceScore": <0-100 ความเกี่ยวข้องกับ ${symbol}>,
    "impactScore": <0-100 ผลกระทบต่อราคา>,
    "keyFactors": ["factor1", "factor2"],
    "isMarketMoving": <true/false เฉพาะข่าวระดับ major event>
  }
]

เกณฑ์การให้คะแนน:
- relevanceScore 90-100: เกี่ยวข้องโดยตรงกับ ${symbol} (เช่น ข่าวราคาทอง, Fed, oil supply)
- relevanceScore 70-89: เกี่ยวข้องทางอ้อม (เช่น USD strength, inflation data)
- relevanceScore 50-69: เกี่ยวข้องบางส่วน
- relevanceScore 0-49: ไม่เกี่ยวข้อง

- impactScore 90-100: game-changer (Fed rate decision, war, major central bank action)
- impactScore 70-89: สำคัญมาก (CPI surprise, employment data)
- impactScore 50-69: สำคัญปานกลาง
- impactScore 0-49: ผลกระทบต่ำ

- isMarketMoving: true เฉพาะข่าวที่จะทำให้ตลาดขยับแรง (Fed, war, major crash)`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: batchPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2000,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        
        let results = [];
        try {
          let jsonStr = content.trim();
          if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
          if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
          if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
          results = JSON.parse(jsonStr.trim());
        } catch {
          console.warn('Failed to parse batch results');
          continue;
        }

        // Map results back to news items
        for (const result of results) {
          const newsItem = batch[result.index - 1];
          if (newsItem && result.relevanceScore >= 40 && result.impactScore >= 30) {
            filteredNews.push({
              id: newsItem.id,
              title: newsItem.title,
              source: newsItem.source,
              timestamp: newsItem.timestamp,
              sentiment: newsItem.sentiment,
              relevanceScore: result.relevanceScore || 50,
              impactScore: result.impactScore || 50,
              keyFactors: result.keyFactors || [],
              isMarketMoving: result.isMarketMoving || false
            });
          }
        }
      }
    } catch (error) {
      console.error('Batch filter error:', error);
    }
  }

  // Sort: Market-moving first, then by impact score
  filteredNews.sort((a, b) => {
    if (a.isMarketMoving && !b.isMarketMoving) return -1;
    if (!a.isMarketMoving && b.isMarketMoving) return 1;
    return b.impactScore - a.impactScore;
  });

  // Filter to keep only high-quality news
  const highQualityNews = filteredNews.filter(n => 
    n.relevanceScore >= 60 && n.impactScore >= 50
  );

  const stats = {
    total_news: news.length,
    filtered_news_count: highQualityNews.length,
    filter_pass_rate: ((highQualityNews.length / news.length) * 100).toFixed(1) + '%',
    market_moving_news: highQualityNews.filter(n => n.isMarketMoving).length,
    top_news: highQualityNews.slice(0, 5).map(n => ({
      title: n.title.substring(0, 80),
      relevance: n.relevanceScore,
      impact: n.impactScore,
      factors: n.keyFactors.slice(0, 3)
    }))
  };

  console.log(`✅ Filtered: ${highQualityNews.length}/${news.length} news (${stats.filter_pass_rate})`);
  console.log(`🚨 Market Moving: ${stats.market_moving_news}`);

  return { filteredNews: highQualityNews, stats };
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

    // ✅ NEW: Filter and rank news first
    let filteredNews: FilteredNews[] = [];
    let filterStats: any = {};
    
    if (news && news.length > 0) {
      const filterResult = await filterAndRankNews(news, symbol, GEMINI_API_KEY);
      filteredNews = filterResult.filteredNews;
      filterStats = filterResult.stats;
    }

    // ✅ If no filtered news, use fallback
    if (filteredNews.length === 0 && news && news.length > 0) {
      console.warn('⚠️ No news passed filter, using top 10 original news');
      filteredNews = news.slice(0, 10).map(n => ({
        id: n.id,
        title: n.title,
        source: n.source,
        timestamp: n.timestamp,
        sentiment: n.sentiment,
        relevanceScore: 50,
        impactScore: 50,
        keyFactors: [],
        isMarketMoving: false
      }));
      filterStats = {
        total_news: news.length,
        filtered_news_count: 10,
        filter_pass_rate: '0% (fallback)',
        market_moving_news: 0,
        top_news: []
      };
    }

    // ✅ NEW: Enhanced news headlines with scores
    const newsHeadlines = filteredNews.slice(0, 20).map((n, i) => {
      const sentiment = n.sentiment || 'neutral';
      const marketMovingTag = n.isMarketMoving ? '🚨 MARKET MOVING' : '';
      return `${i + 1}. [${sentiment.toUpperCase()}] ${n.title} (${n.source})
📊 Relevance: ${n.relevanceScore}/100 | Impact: ${n.impactScore}/100
🔑 ${n.keyFactors.length > 0 ? n.keyFactors.join(', ') : 'General market news'}
${marketMovingTag}`;
    }).join('\n\n');

    const prompt = `คุณเป็น ABLE-HF 3.0 AI ผู้เชี่ยวชาญระดับ Hedge Fund วิเคราะห์สินทรัพย์ ${symbol}

## ข้อมูลราคา
${priceData ? `ราคาปัจจุบัน: ${priceData.price}, เปลี่ยนแปลง: ${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%` : 'ไม่มีข้อมูลราคา'}

## ข่าวสำคัญที่ผ่านการกรองแล้ว (${filteredNews.length}/${news?.length || 0} รายการ)
${newsHeadlines || 'ไม่มีข่าวที่ผ่านเกณฑ์'}

## คำสั่ง
วิเคราะห์ตามหลัก ABLE-HF 3.0 Framework ครบ 40 modules ใน 5 หมวดหมู่:

1. **Macro & Economic (33%)**: ผลกระทบจากนโยบายการเงิน, Fed, ECB, อัตราดอกเบี้ย, inflation
2. **Sentiment & Flow (29%)**: sentiment ข่าว, social media, institutional flow, COT positioning
3. **Technical & Regime (20%)**: แนวโน้ม, momentum, volatility, support/resistance
4. **Risk & Event (23.5%)**: ความเสี่ยงจากเหตุการณ์, geopolitical risk, black swan
5. **Alternative & AI (14.5%)**: NLP analysis, neural signals, alternative data

⚠️ ข่าวที่มี "MARKET MOVING" ควรให้น้ำหนักสูงสุดในการวิเคราะห์

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

    // Ensure all required fields exist + add filter stats
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
        // ✅ NEW: Filter stats
        filtered_news_count: filterStats.filtered_news_count || 0,
        filter_pass_rate: filterStats.filter_pass_rate || '0%',
        market_moving_news: filterStats.market_moving_news || 0,
        top_news: filterStats.top_news || [],
        model: 'gemini-2.0-flash-exp',
        framework: 'ABLE-HF 3.0'
      }
    };

    console.log(`✅ Deep Analysis complete: ${symbol} - ${result.analysis.decision}`);
    console.log(`📊 Filter stats: ${filterStats.filtered_news_count}/${news?.length || 0} news used`);

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
        filtered_news_count: 0,
        filter_pass_rate: 'N/A (Gateway)',
        market_moving_news: 0,
        top_news: [],
        model: 'gemini-2.5-flash (gateway)',
        framework: 'ABLE-HF 3.0'
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
