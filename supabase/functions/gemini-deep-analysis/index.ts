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

// ✅ ENHANCED: Multi-step intelligent news filtering with Chain-of-Thought
async function filterAndRankNews(
  news: any[], 
  symbol: string, 
  apiKey: string
): Promise<{ filteredNews: FilteredNews[]; stats: any }> {
  console.log(`🔍 Smart filtering ${news.length} news for ${symbol}...`);
  
  const filteredNews: FilteredNews[] = [];
  
  // ✅ NEW: Asset-specific keyword mappings for better relevance detection
  const assetKeywords: Record<string, string[]> = {
    'XAUUSD': ['gold', 'xau', 'precious metal', 'safe haven', 'fed', 'interest rate', 'inflation', 'dollar', 'treasury', 'yields', 'real rates', 'etf', 'central bank', 'geopolitical', 'war', 'crisis', 'uncertainty'],
    'EURUSD': ['euro', 'eur', 'ecb', 'eurozone', 'germany', 'lagarde', 'eu', 'dollar', 'fed', 'rate differential', 'european'],
    'GBPUSD': ['pound', 'gbp', 'sterling', 'boe', 'uk', 'britain', 'bailey', 'england', 'brexit'],
    'USDJPY': ['yen', 'jpy', 'boj', 'japan', 'ueda', 'kuroda', 'intervention', 'carry trade'],
    'USOIL': ['oil', 'crude', 'wti', 'brent', 'opec', 'saudi', 'energy', 'petroleum', 'gasoline', 'drilling'],
    'BTCUSD': ['bitcoin', 'btc', 'crypto', 'blockchain', 'halving', 'etf', 'sec', 'coinbase', 'binance', 'whale'],
    'ETHUSD': ['ethereum', 'eth', 'crypto', 'defi', 'smart contract', 'layer 2', 'staking'],
    'US500': ['s&p', 'sp500', 'spy', 'stocks', 'equities', 'nasdaq', 'dow', 'earnings', 'tech stocks', 'wall street'],
    'US100': ['nasdaq', 'tech', 'apple', 'microsoft', 'google', 'nvda', 'nvidia', 'ai stocks', 'semiconductor'],
    'XAGUSD': ['silver', 'xag', 'precious metal', 'industrial metal', 'solar'],
  };
  
  const relevantKeywords = assetKeywords[symbol] || [];
  
  // ✅ Step 1: Pre-filter using keywords (fast, no API call)
  const preFilteredNews = news.filter(n => {
    const titleLower = n.title.toLowerCase();
    const hasRelevantKeyword = relevantKeywords.some(kw => titleLower.includes(kw));
    const hasGeneralMarketKeyword = ['market', 'price', 'surge', 'crash', 'rally', 'drop', 'rise', 'fall', 'fed', 'central bank', 'inflation', 'recession', 'gdp', 'employment', 'cpi', 'fomc', 'rate', 'tariff', 'trade war', 'sanction', 'geopolitical', 'war', 'conflict'].some(kw => titleLower.includes(kw));
    return hasRelevantKeyword || hasGeneralMarketKeyword;
  });
  
  console.log(`📊 Pre-filter: ${preFilteredNews.length}/${news.length} news passed keyword check`);
  
  // ✅ Step 2: Use Gemini for deep analysis on pre-filtered news (more efficient)
  const batchSize = 15;
  
  for (let i = 0; i < Math.min(preFilteredNews.length, 45); i += batchSize) {
    const batch = preFilteredNews.slice(i, i + batchSize);
    
    // ✅ ENHANCED: Chain-of-Thought prompt for better reasoning
    const batchPrompt = `คุณเป็น AI วิเคราะห์ข่าวการเงินระดับ Hedge Fund สำหรับ ${symbol}

## ข้อมูลสินทรัพย์ที่กำลังวิเคราะห์:
- Symbol: ${symbol}
- ประเภท: ${getAssetType(symbol)}
- Keywords ที่เกี่ยวข้อง: ${relevantKeywords.slice(0, 5).join(', ')}

## ข่าวที่ต้องวิเคราะห์ (${batch.length} รายการ):
${batch.map((n, idx) => `${idx + 1}. "${n.title}" [${n.source}]`).join('\n')}

## คำสั่งการวิเคราะห์ (Chain-of-Thought):
สำหรับแต่ละข่าว ให้คิดตามขั้นตอนนี้:

1. **ความเกี่ยวข้อง (relevanceScore)**:
   - 90-100: เกี่ยวข้องโดยตรงกับ ${symbol} (เช่น ข่าวราคา${symbol}, นโยบายที่กระทบโดยตรง)
   - 70-89: เกี่ยวข้องทางอ้อมผ่าน correlation (เช่น USD strength กระทบ Gold)
   - 50-69: เกี่ยวข้องบางส่วนกับตลาดโดยรวม
   - 0-49: ไม่เกี่ยวข้องหรือเกี่ยวข้องน้อยมาก

2. **ผลกระทบต่อราคา (impactScore)**:
   - 90-100: Game-changer (Fed rate decision, สงคราม, central bank intervention)
   - 70-89: สำคัญมาก (CPI surprise, major earnings, policy shift)
   - 50-69: สำคัญปานกลาง (economic data, corporate news)
   - 0-49: ผลกระทบต่ำ (routine news, opinion pieces)

3. **ปัจจัยหลัก (keyFactors)**: ระบุ 2-3 ปัจจัยที่ข่าวนี้อาจกระทบ ${symbol}

4. **Market Moving**: true เฉพาะข่าวที่จะทำให้ตลาดขยับแรงทันที

ตอบเป็น JSON array เท่านั้น:
[
  {
    "index": 1,
    "reasoning": "<คิดวิเคราะห์สั้นๆ 1 ประโยคว่าข่าวนี้เกี่ยวกับอะไรและกระทบ ${symbol} อย่างไร>",
    "relevanceScore": <0-100>,
    "impactScore": <0-100>,
    "keyFactors": ["factor1", "factor2"],
    "isMarketMoving": <true/false>,
    "direction": "<bullish/bearish/neutral สำหรับ ${symbol}>"
  }
]`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: batchPrompt }] }],
            generationConfig: {
              temperature: 0.15, // Lower temperature for more consistent analysis
              maxOutputTokens: 3000,
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
          console.warn('Failed to parse batch results, skipping batch');
          continue;
        }

        // Map results back to news items with enhanced filtering
        for (const result of results) {
          const newsItem = batch[result.index - 1];
          if (newsItem && result.relevanceScore >= 35 && result.impactScore >= 25) {
            filteredNews.push({
              id: newsItem.id,
              title: newsItem.title,
              source: newsItem.source,
              timestamp: newsItem.timestamp,
              sentiment: result.direction || newsItem.sentiment,
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

  // Sort: Market-moving first, then by combined score
  filteredNews.sort((a, b) => {
    if (a.isMarketMoving && !b.isMarketMoving) return -1;
    if (!a.isMarketMoving && b.isMarketMoving) return 1;
    const scoreA = (a.relevanceScore * 0.4) + (a.impactScore * 0.6);
    const scoreB = (b.relevanceScore * 0.4) + (b.impactScore * 0.6);
    return scoreB - scoreA;
  });

  // ✅ ENHANCED: More lenient filtering for quality news
  const highQualityNews = filteredNews.filter(n => 
    n.relevanceScore >= 55 && n.impactScore >= 45
  );

  const stats = {
    total_news: news.length,
    pre_filtered_count: preFilteredNews.length,
    filtered_news_count: highQualityNews.length,
    filter_pass_rate: ((highQualityNews.length / news.length) * 100).toFixed(1) + '%',
    market_moving_news: highQualityNews.filter(n => n.isMarketMoving).length,
    top_news: highQualityNews.slice(0, 5).map(n => ({
      title: n.title.substring(0, 100),
      relevance: n.relevanceScore,
      impact: n.impactScore,
      factors: n.keyFactors.slice(0, 3),
      direction: n.sentiment
    }))
  };

  console.log(`✅ Smart Filter: ${highQualityNews.length}/${news.length} news (${stats.filter_pass_rate})`);
  console.log(`🚨 Market Moving: ${stats.market_moving_news}`);

  return { filteredNews: highQualityNews, stats };
}

// Helper to get asset type
function getAssetType(symbol: string): string {
  if (['XAUUSD', 'XAGUSD'].includes(symbol)) return 'Precious Metal / Safe Haven';
  if (['USOIL', 'UKOIL', 'NATGAS'].includes(symbol)) return 'Energy Commodity';
  if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'].includes(symbol)) return 'Forex';
  if (['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD'].includes(symbol)) return 'Cryptocurrency';
  if (['US500', 'US100', 'US30', 'DE40', 'UK100', 'JP225'].includes(symbol)) return 'Stock Index';
  return 'Financial Asset';
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

    // ✅ ENHANCED: Advanced multi-step reasoning prompt
    const assetType = getAssetType(symbol);
    
    const prompt = `คุณเป็น ABLE-HF 3.0 AI - ระบบวิเคราะห์การเงินระดับ Hedge Fund ที่ผ่านการฝึกจาก CFA, CMT และ FRM frameworks

## 🎯 สินทรัพย์ที่วิเคราะห์: ${symbol}
ประเภท: ${assetType}

## 📊 ข้อมูลราคาปัจจุบัน
${priceData ? `- ราคา: ${priceData.price}
- เปลี่ยนแปลง 24h: ${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%
- ทิศทางระยะสั้น: ${priceData.changePercent > 1 ? 'bullish momentum' : priceData.changePercent < -1 ? 'bearish momentum' : 'sideways'}` : 'ไม่มีข้อมูลราคา'}

## 📰 ข่าวสำคัญที่ผ่านการกรองแล้ว (${filteredNews.length}/${news?.length || 0} รายการ)
${newsHeadlines || '⚠️ ไม่มีข่าวที่เกี่ยวข้องโดยตรง'}

## 🧠 คำสั่งการวิเคราะห์ (Chain-of-Thought)

### ขั้นตอนที่ 1: วิเคราะห์ข่าวแต่ละข่าว
- อ่านข่าวแต่ละข่าวและคิดว่าข่าวนั้นกระทบ ${symbol} อย่างไร
- ให้ความสำคัญกับข่าวที่มี "MARKET MOVING" มากที่สุด
- พิจารณา correlation และ causation relationships

### ขั้นตอนที่ 2: สังเคราะห์ภาพรวม
วิเคราะห์ครบ 5 หมวด (ABLE-HF 3.0 Framework):

1. **Macro & Economic (33% weight)**
   - นโยบายการเงิน (Fed, ECB, BOJ, BOE)
   - อัตราดอกเบี้ย, Real yields
   - Inflation expectations
   - GDP, Employment data

2. **Sentiment & Flow (29% weight)**
   - News sentiment score (รวมจากข่าวที่ให้)
   - Institutional positioning
   - COT data implications
   - Retail sentiment indicators

3. **Technical & Regime (20% weight)**
   - Trend direction
   - Momentum indicators
   - Volatility regime
   - Key support/resistance

4. **Risk & Event (23.5% weight)**
   - Geopolitical risk factors
   - Upcoming events
   - Black swan indicators
   - Correlation breakdown risk

5. **Alternative & AI (14.5% weight)**
   - NLP sentiment score
   - Cross-asset signals
   - Alternative data signals

### ขั้นตอนที่ 3: สรุปและให้คำแนะนำ

**เกณฑ์การตัดสินใจ:**
- P_up_pct > 65 AND confidence > 70 → STRONG_BUY
- P_up_pct > 55 AND confidence > 60 → BUY
- P_up_pct < 35 AND confidence > 70 → STRONG_SELL
- P_up_pct < 45 AND confidence > 60 → SELL
- อื่นๆ → HOLD

**⚠️ กฎสำคัญ:**
1. ถ้าไม่มีข่าวที่เกี่ยวข้องโดยตรง ให้ลด confidence ลง
2. ข่าว MARKET MOVING ควรมีผลต่อการตัดสินใจมากที่สุด
3. พิจารณา correlation กับ USD, yields, และ risk sentiment
4. อย่าให้ P_up_pct + P_down_pct > 100

ตอบเป็น JSON format นี้เท่านั้น:
{
  "symbol": "${symbol}",
  "P_up_pct": <ความน่าจะเป็นขึ้น 0-100>,
  "P_down_pct": <ความน่าจะเป็นลง 0-100>,
  "confidence": <ความมั่นใจ 0-100>,
  "decision": "<STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL>",
  "thai_summary": "<สรุป 3-4 ประโยค ภาษาไทย อธิบายว่าทำไมถึงให้คำแนะนำนี้ อ้างอิงข่าวที่สำคัญที่สุด>",
  "market_regime": "<trending_up|trending_down|ranging|volatile>",
  "key_drivers": ["<ปัจจัยสำคัญ 1 - อ้างอิงข่าวจริง>", "<ปัจจัยสำคัญ 2>", "<ปัจจัยสำคัญ 3>"],
  "risk_warnings": ["<ความเสี่ยง 1 - เจาะจง>", "<ความเสี่ยง 2>"],
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
  "thinking_process": "<อธิบายกระบวนการคิดโดยละเอียด 8-15 ประโยค ระบุว่าข่าวไหนสำคัญที่สุด ทำไมถึงให้ decision นี้>"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        model: 'gemini-2.5-flash',
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
