// supabase/functions/news-aggregator/index.ts
// ✅ FIXED VERSION - กรองข่าว 24 ชม. + newsMetadata + cache busting
// ABLE-HF 3.0 Full Analysis via Direct Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ✅ NEW: Constants for fresh news filtering
const FRESH_NEWS_HOURS = 24; // วิเคราะห์เฉพาะข่าว 24 ชม. ล่าสุด
const MIN_FRESH_NEWS_COUNT = 5; // ขั้นต่ำ 5 ข่าวใหม่

interface RawNewsItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  timestamp: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  importance?: 'high' | 'medium' | 'low';
  upvotes?: number;
  comments?: number;
  relatedAssets?: string[];
  ageText?: string; // ✅ NEW
}

interface MacroAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: string;
  change?: string;
  changeValue?: number;
  ableAnalysis?: any;
}

// ============================================
// ✅ NEW: HELPER FUNCTIONS FOR FRESH NEWS
// ============================================

function isNewsFresh(timestamp: number): boolean {
  const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
  return ageHours <= FRESH_NEWS_HOURS;
}

function getNewsAgeText(timestamp: number): string {
  const ageMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h ago`;
  return `${Math.floor(ageHours / 24)}d ago`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  const bullishWords = ['rise', 'gain', 'surge', 'rally', 'bull', 'up', 'high', 'breakthrough', 'positive', 'record', 'soar', 'jump'];
  const bearishWords = ['fall', 'drop', 'crash', 'bear', 'down', 'low', 'collapse', 'negative', 'decline', 'plunge', 'sell-off'];
  
  let score = 0;
  bullishWords.forEach(w => { if (lower.includes(w)) score += 1; });
  bearishWords.forEach(w => { if (lower.includes(w)) score -= 1; });
  
  return score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral';
}

function matchAssets(text: string): string[] {
  const lower = text.toLowerCase();
  const assets: string[] = [];
  
  if (lower.includes('gold') || lower.includes('xau')) assets.push('XAUUSD');
  if (lower.includes('silver') || lower.includes('xag')) assets.push('XAGUSD');
  if (lower.includes('bitcoin') || lower.includes('btc')) assets.push('BTCUSD');
  if (lower.includes('ethereum') || lower.includes('eth')) assets.push('ETHUSD');
  if (lower.includes('eur') || lower.includes('euro')) assets.push('EURUSD');
  if (lower.includes('gbp') || lower.includes('pound')) assets.push('GBPUSD');
  if (lower.includes('jpy') || lower.includes('yen')) assets.push('USDJPY');
  if (lower.includes('oil') || lower.includes('crude')) assets.push('USOIL');
  if (lower.includes('s&p') || lower.includes('sp500')) assets.push('US500');
  if (lower.includes('nasdaq') || lower.includes('tech stock')) assets.push('US100');
  
  return assets;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ============================================
// NEWS FETCHING (Multiple Sources)
// ============================================

async function fetchReddit(subreddit: string, displayName: string): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=100&_=${Date.now()}`, // ✅ cache busting
      { headers: { 'User-Agent': 'AbleTerminal/1.0' } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const posts = (data.data?.children || []).map((post: any) => {
      const title = post.data.title;
      const timestamp = post.data.created_utc * 1000;
      return {
        id: `r-${subreddit}-${post.data.id}`,
        title,
        description: post.data.selftext?.substring(0, 200) || '',
        url: `https://reddit.com${post.data.permalink}`,
        source: `r/${subreddit}`,
        category: displayName,
        publishedAt: new Date(timestamp).toISOString(),
        timestamp,
        ageText: getNewsAgeText(timestamp), // ✅ NEW
        sentiment: analyzeSentiment(title),
        importance: post.data.score > 500 ? 'high' : post.data.score > 100 ? 'medium' : 'low',
        upvotes: post.data.ups,
        comments: post.data.num_comments,
        relatedAssets: matchAssets(title)
      };
    });
    
    // ✅ NEW: กรองเฉพาะข่าวใหม่ 24 ชม.
    const freshPosts = posts.filter((p: RawNewsItem) => isNewsFresh(p.timestamp));
    console.log(`📰 r/${subreddit}: ${freshPosts.length}/${posts.length} fresh news`);
    
    return freshPosts;
  } catch (error) {
    console.error(`Reddit ${subreddit} error:`, error);
    return [];
  }
}

async function fetchHackerNews(query: string): Promise<RawNewsItem[]> {
  try {
    // ✅ NEW: เพิ่ม timestamp filter + cache busting
    const minTimestamp = Math.floor((Date.now() - (FRESH_NEWS_HOURS * 60 * 60 * 1000)) / 1000);
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=100&numericFilters=created_at_i>${minTimestamp}&_=${Date.now()}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const allHits = (data.hits || []);
    
    // ✅ NEW: กรองเฉพาะข่าวใหม่อีกรอบ
    const freshHits = allHits.filter((hit: any) => {
      const timestamp = new Date(hit.created_at).getTime();
      return isNewsFresh(timestamp);
    });
    
    console.log(`📰 HackerNews (${query}): ${freshHits.length}/${allHits.length} fresh news`);
    
    return freshHits.map((hit: any) => {
      const title = hit.title || '';
      const timestamp = new Date(hit.created_at).getTime();
      return {
        id: `hn-${hit.objectID}`,
        title,
        description: '',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'Hacker News',
        category: 'Tech',
        publishedAt: hit.created_at,
        timestamp,
        ageText: getNewsAgeText(timestamp), // ✅ NEW
        sentiment: analyzeSentiment(title),
        importance: (hit.points || 0) > 100 ? 'high' : 'medium',
        upvotes: hit.points || 0,
        comments: hit.num_comments || 0,
        relatedAssets: matchAssets(title)
      };
    });
  } catch (error) {
    console.error('HackerNews error:', error);
    return [];
  }
}

async function fetchCryptoCompare(): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,Trading,Market&_=${Date.now()}` // ✅ cache busting
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const allArticles = data.Data || [];
    
    // ✅ NEW: กรองเฉพาะข่าวใหม่ 24 ชม.
    const freshNews = allArticles.filter((item: any) => {
      const timestamp = item.published_on * 1000;
      return isNewsFresh(timestamp);
    });
    
    console.log(`📰 CryptoCompare: ${freshNews.length}/${allArticles.length} fresh news`);
    
    return freshNews.map((item: any) => {
      const title = item.title;
      const timestamp = item.published_on * 1000;
      return {
        id: `cc-${item.id}`,
        title,
        description: item.body?.substring(0, 200) || '',
        url: item.url,
        source: item.source || 'CryptoCompare',
        category: 'Crypto',
        publishedAt: new Date(timestamp).toISOString(),
        timestamp,
        ageText: getNewsAgeText(timestamp), // ✅ NEW
        sentiment: analyzeSentiment(title),
        importance: 'medium',
        upvotes: 0,
        comments: 0,
        relatedAssets: matchAssets(title)
      };
    });
  } catch (error) {
    console.error('CryptoCompare error:', error);
    return [];
  }
}

async function fetchNewsDataIO(): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      `https://saurav.tech/NewsAPI/top-headlines/category/business/us.json?_=${Date.now()}` // ✅ cache busting
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const allArticles = data.articles || [];
    
    // ✅ NEW: กรองเฉพาะข่าวใหม่
    const freshArticles = allArticles.filter((item: any) => {
      const timestamp = new Date(item.publishedAt || Date.now()).getTime();
      return isNewsFresh(timestamp);
    });
    
    console.log(`📰 NewsData: ${freshArticles.length}/${allArticles.length} fresh articles`);
    
    return freshArticles.map((item: any, i: number) => {
      const title = item.title || '';
      const timestamp = new Date(item.publishedAt || Date.now()).getTime();
      return {
        id: `news-${i}-${Date.now()}`,
        title,
        description: item.description?.substring(0, 200) || '',
        url: item.url || '#',
        source: item.source?.name || 'News',
        category: 'Business',
        publishedAt: item.publishedAt || new Date().toISOString(),
        timestamp,
        ageText: getNewsAgeText(timestamp), // ✅ NEW
        sentiment: analyzeSentiment(title),
        importance: 'medium',
        upvotes: 0,
        comments: 0,
        relatedAssets: matchAssets(title)
      };
    });
  } catch (error) {
    console.error('NewsData error:', error);
    return [];
  }
}

async function fetchFinancialNews(): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',
      { headers: { 'User-Agent': 'AbleTerminal/1.0' } }
    );
    
    if (!response.ok) return [];
    
    const text = await response.text();
    const items: RawNewsItem[] = [];
    
    const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    for (let i = 0; i < Math.min(itemMatches.length, 30); i++) {
      const item = itemMatches[i];
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      if (titleMatch) {
        const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const timestamp = dateMatch ? new Date(dateMatch[1].trim()).getTime() : Date.now();
        
        // ✅ NEW: กรองเฉพาะข่าวใหม่
        if (isNewsFresh(timestamp)) {
          items.push({
            id: `mw-${i}-${Date.now()}`,
            title,
            description: '',
            url: linkMatch ? linkMatch[1].trim() : '#',
            source: 'MarketWatch',
            category: 'Markets',
            publishedAt: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
            timestamp,
            ageText: getNewsAgeText(timestamp), // ✅ NEW
            sentiment: analyzeSentiment(title),
            importance: 'high',
            upvotes: 0,
            comments: 0,
            relatedAssets: matchAssets(title)
          });
        }
      }
    }
    
    console.log(`📰 MarketWatch: ${items.length} fresh news`);
    return items;
  } catch (error) {
    console.error('Financial news error:', error);
    return [];
  }
}

// ============================================
// ABLE-HF 3.0 PROMPT BUILDER (40 Modules)
// ============================================

function buildFullAnalysisPrompt(news: any[], symbol: string): string {
  return `# ABLE-HF 3.0 HEDGE FUND ANALYST

## ROLE
คุณคือนักวิเคราะห์ระดับ Hedge Fund ที่ใช้ระบบ 40 modules

## TASK
วิเคราะห์สินทรัพย์: **${symbol}**

## INPUT (${news.length} news items - LAST 24 HOURS ONLY)
${JSON.stringify(news.slice(0, 30), null, 2)}

## 40 MODULES SYSTEM

### CATEGORY 1: MACRO & ECONOMIC (33%)
1. macro_neural_forecast (6.5%)
2. central_bank_sentiment (7.0%) ⭐
3. yield_curve_signal (4.5%)
4. inflation_momentum (4.0%)
5. gdp_growth_trajectory (3.5%)
6. employment_dynamics (3.0%)
7. trade_balance_flow (2.5%)
8. fiscal_policy_impact (2.0%)

### CATEGORY 2: SENTIMENT & FLOW (29%)
9. news_sentiment_cfa (7.5%) ⭐
10. social_media_pulse (5.5%)
11. institutional_flow (5.0%)
12. retail_sentiment (4.0%)
13. options_sentiment (3.5%)
14. cot_positioning (3.0%)
15. dark_pool_activity (2.5%)
16. etf_flow_momentum (2.0%)

### CATEGORY 3: TECHNICAL & REGIME (20%)
17. trend_regime_detector (4.5%)
18. momentum_oscillator (4.0%)
19. volatility_regime (3.5%)
20. support_resistance (3.0%)
21. pattern_recognition (2.5%)
22. volume_analysis (2.0%)
23. market_breadth (1.5%)
24. intermarket_correlation (1.5%)

### CATEGORY 4: RISK & EVENT (23.5%)
25. event_shock (6.5%) ⭐
26. geopolitical_risk (4.5%)
27. black_swan_detector (4.0%)
28. liquidity_risk (3.0%)
29. correlation_breakdown (2.5%)
30. tail_risk_monitor (2.0%)
31. regulatory_risk (1.5%)
32. systemic_risk (1.5%)

### CATEGORY 5: ALTERNATIVE & AI (14.5%)
33. quantum_sentiment (5.5%)
34. neural_ensemble (4.5%)
35. nlp_deep_analysis (3.5%)
36. satellite_data (2.0%)
37. alternative_data (2.0%)
38. machine_learning_signal (1.5%)
39. sentiment_network (1.5%)
40. predictive_analytics (1.0%)

## ANALYSIS PROCESS
1. กรองข่าวที่เกี่ยวกับ ${symbol}
2. ให้คะแนนแต่ละ module: -100 ถึง +100
3. คำนวณ weighted_sum = Σ(score_i × weight_i)
4. Apply sigmoid: P_up = 1/(1+exp(-weighted_sum/10))
5. Final P_up adjusted with regime

## OUTPUT FORMAT (JSON ONLY - NO MARKDOWN, NO BACKTICKS)
{
  "P_up_pct": 78.5,
  "P_down_pct": 21.5,
  "decision": "🟢 BUY",
  "confidence": 76,
  "regime_adjusted_confidence": 76.3,
  "market_regime": "MODERATE_VOLATILITY",
  "trading_signal": {
    "signal": "BUY",
    "icon": "🟢",
    "color": "#22C55E",
    "strength": 75
  },
  "thai_summary": "สรุปภาษาไทย 2-3 ประโยค",
  "key_drivers": ["driver1", "driver2", "driver3"],
  "risk_warnings": ["risk1", "risk2"],
  "analyzed_at": "${new Date().toISOString()}",
  "news_count": ${news.length},
  "relevant_news_count": 0
}`;
}

// ============================================
// GEMINI API DIRECT CALL
// ============================================

async function analyzeWithGemini(news: RawNewsItem[], pinnedAssets: string[]): Promise<MacroAnalysis[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const symbols = pinnedAssets.length > 0 ? pinnedAssets : ['EURUSD', 'USDJPY', 'XAUUSD', 'GBPUSD'];
  
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in secrets');
    return generateFallbackAnalysis(news, symbols);
  }
  
  if (news.length === 0) {
    console.log('⚠️ No news to analyze, using fallback');
    return generateFallbackAnalysis(news, symbols);
  }

  console.log(`🔑 Using Gemini API Direct (gemini-2.0-flash-exp)`);
  const results: MacroAnalysis[] = [];

  for (const symbol of symbols) {
    try {
      console.log(`🧠 Analyzing ${symbol} with Gemini API Direct...`);
      
      const allNewsDetailed = news.slice(0, 60).map(n => ({
        title: n.title,
        source: n.source,
        timestamp: new Date(n.timestamp).toISOString(),
        category: n.category,
        ageText: n.ageText,
        relatedAssets: n.relatedAssets || []
      }));

      const prompt = buildFullAnalysisPrompt(allNewsDetailed, symbol);

      // 🔴 DIRECT GEMINI API CALL
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4000,
              topP: 0.8,
              topK: 40
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini API error for ${symbol}: ${response.status}`, errorText);
        
        // Handle rate limits
        if (response.status === 429) {
          console.log('⚠️ Rate limit hit, waiting 2s...');
          await new Promise(r => setTimeout(r, 2000));
        }
        continue;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!content) {
        console.error(`❌ No content from Gemini for ${symbol}`);
        continue;
      }

      let analysisResult;
      try {
        // Clean response (remove markdown if present)
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
          console.log(`✅ ${symbol}: ${analysisResult.decision} (P_up: ${analysisResult.P_up_pct}%)`);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error(`❌ Parse error for ${symbol}:`, parseError);
        console.log('Raw content:', content.substring(0, 300));
        continue;
      }

      results.push({
        symbol,
        sentiment: analysisResult.P_up_pct > 60 ? 'bullish' : analysisResult.P_up_pct < 40 ? 'bearish' : 'neutral',
        confidence: Math.round(analysisResult.regime_adjusted_confidence || analysisResult.confidence || analysisResult.P_up_pct),
        analysis: analysisResult.thai_summary || `${symbol}: Analysis complete`,
        change: `${analysisResult.P_up_pct > 50 ? '+' : ''}${(analysisResult.P_up_pct - 50).toFixed(1)}%`,
        changeValue: (analysisResult.P_up_pct - 50) / 100,
        ableAnalysis: analysisResult
      });

    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error);
    }
  }

  return results.length > 0 ? results : generateFallbackAnalysis(news, symbols);
}

function generateFallbackAnalysis(news: RawNewsItem[], symbols: string[]): MacroAnalysis[] {
  const bullishCount = news.filter(n => n.sentiment === 'bullish').length;
  const bearishCount = news.filter(n => n.sentiment === 'bearish').length;
  const marketBias = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';
  
  return symbols.map(symbol => {
    const relevantNews = news.filter(n => n.relatedAssets?.includes(symbol));
    const symbolSentiment = relevantNews.length > 0 
      ? (relevantNews.filter(n => n.sentiment === 'bullish').length > relevantNews.filter(n => n.sentiment === 'bearish').length ? 'bullish' : 'bearish')
      : marketBias;
    
    const confidence = 55 + Math.floor(Math.random() * 30);
    const change = (Math.random() * 2 - 1);
    const P_up = symbolSentiment === 'bullish' ? 60 + Math.random() * 20 : symbolSentiment === 'bearish' ? 30 + Math.random() * 15 : 45 + Math.random() * 10;
    
    return {
      symbol,
      sentiment: symbolSentiment as any,
      confidence,
      analysis: `${symbol}: ${symbolSentiment.toUpperCase()} | ${confidence}% (Fallback - Gemini unavailable)`,
      change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      changeValue: change,
      ableAnalysis: {
        P_up_pct: Math.round(P_up * 10) / 10,
        P_down_pct: Math.round((100 - P_up) * 10) / 10,
        decision: symbolSentiment === 'bullish' ? '🟢 BUY' : symbolSentiment === 'bearish' ? '🔴 SELL' : '🟡 HOLD',
        confidence,
        market_regime: 'FALLBACK_MODE',
        thai_summary: `${symbol}: ใช้ Fallback Analysis (Gemini API unavailable)`,
        risk_warnings: ['Using fallback analysis - Gemini API unavailable'],
        analyzed_at: new Date().toISOString(),
        news_count: news.length,
        relevant_news_count: relevantNews.length
      }
    };
  });
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting ABLE-HF 3.0 with Fresh News Filter (24h)...');
    const startTime = Date.now();
    
    let pinnedAssets: string[] = [];
    try {
      const body = await req.json();
      pinnedAssets = body.pinnedAssets || [];
    } catch {}
    
    console.log(`📌 Pinned assets: ${pinnedAssets.join(', ') || 'default'}`);
    console.log('📡 Fetching 13 news sources...');
    
    const [
      forexReddit, goldReddit, cryptoReddit, wsbReddit, stocksReddit,
      economicsReddit, investingReddit, hackerNewsFinance, hackerNewsCrypto,
      hackerNewsStock, cryptoNews, businessNews, marketNews
    ] = await Promise.all([
      fetchReddit('forex', 'Forex'),
      fetchReddit('Gold', 'Commodities'),
      fetchReddit('cryptocurrency', 'Crypto'),
      fetchReddit('wallstreetbets', 'Stocks'),
      fetchReddit('stocks', 'Stocks'),
      fetchReddit('Economics', 'Economics'),
      fetchReddit('investing', 'Investing'),
      fetchHackerNews('finance trading forex currency'),
      fetchHackerNews('bitcoin crypto ethereum blockchain'),
      fetchHackerNews('stock market nasdaq dow'),
      fetchCryptoCompare(),
      fetchNewsDataIO(),
      fetchFinancialNews()
    ]);

    let allNews = [
      ...forexReddit, ...goldReddit, ...cryptoReddit, ...wsbReddit, ...stocksReddit,
      ...economicsReddit, ...investingReddit, ...hackerNewsFinance, ...hackerNewsCrypto,
      ...hackerNewsStock, ...cryptoNews, ...businessNews, ...marketNews
    ];

    // ✅ NEW: กรองเฉพาะข่าวใหม่อีกรอบ (double check)
    const freshNews = allNews.filter(item => isNewsFresh(item.timestamp));

    console.log(`
📊 News Filter Report:
   Total fetched: ${allNews.length}
   Fresh (24h): ${freshNews.length}
   Oldest: ${allNews.length > 0 ? getNewsAgeText(Math.min(...allNews.map(n => n.timestamp))) : 'N/A'}
   Newest: ${allNews.length > 0 ? getNewsAgeText(Math.max(...allNews.map(n => n.timestamp))) : 'N/A'}
    `);

    // ถ้าข่าวใหม่น้อยเกินไป ให้แจ้งเตือน
    if (freshNews.length < MIN_FRESH_NEWS_COUNT) {
      console.warn(`⚠️ Only ${freshNews.length} fresh news found!`);
    }

    // ใช้ freshNews หรือ allNews (ถ้าข่าวใหม่น้อยเกินไป)
    const newsToAnalyze = freshNews.length >= MIN_FRESH_NEWS_COUNT ? freshNews : allNews;

    // Deduplicate
    const seen = new Set<string>();
    const uniqueNews = newsToAnalyze.filter(n => {
      const key = n.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by timestamp
    uniqueNews.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`✅ ${uniqueNews.length} unique news items ready for analysis`);

    // Gemini Analysis
    const macroAnalysis = await analyzeWithGemini(uniqueNews, pinnedAssets);
    console.log(`✅ Gemini analysis complete: ${macroAnalysis.length} assets analyzed`);

    // Build forYou items
    const forYouItems: any[] = [];
    if (pinnedAssets.length > 0) {
      for (const asset of pinnedAssets) {
        uniqueNews.filter(item => item.relatedAssets?.includes(asset)).slice(0, 3)
          .forEach(item => {
            forYouItems.push({
              id: item.id,
              symbol: asset,
              type: `${item.sentiment?.toUpperCase() || 'NEUTRAL'} (${item.importance?.toUpperCase() || 'MEDIUM'})`,
              title: item.title,
              source: item.source,
              timestamp: item.timestamp,
              url: item.url,
              isNew: Date.now() - item.timestamp < 3600000
            });
          });
      }
    }
    
    uniqueNews.filter(item => item.importance === 'high').slice(0, 5)
      .forEach(item => {
        const symbol = item.relatedAssets?.[0] || item.category;
        if (!forYouItems.find(f => f.id === item.id)) {
          forYouItems.push({
            id: item.id,
            symbol,
            type: `${item.sentiment?.toUpperCase() || 'NEUTRAL'} (HIGH)`,
            title: item.title,
            source: item.source,
            timestamp: item.timestamp,
            url: item.url,
            isNew: Date.now() - item.timestamp < 3600000
          });
        }
      });

    forYouItems.sort((a, b) => b.timestamp - a.timestamp);

    // Daily Reports
    const dailyReports = uniqueNews.filter(item => item.importance === 'high').slice(0, 5)
      .map((item, i) => {
        const date = new Date(item.timestamp);
        return {
          id: item.id,
          date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
          title: item.title,
          description: item.description || item.title.substring(0, 150),
          time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          assetsAnalyzed: Math.floor(Math.random() * 4) + 3,
          isHighlighted: i === 0,
          url: item.url,
          source: item.source
        };
      });

    // X Notifications
    const xNotifications = uniqueNews.filter(item => item.upvotes && item.upvotes > 50).slice(0, 6)
      .map(item => ({
        id: item.id,
        source: item.source.replace('r/', ''),
        time: formatTimeAgo(item.timestamp),
        content: item.title.substring(0, 100),
        url: item.url
      }));

    const processingTime = Date.now() - startTime;
    console.log(`✅ Total processing time: ${processingTime}ms`);

    // ✅ NEW: สร้าง newsMetadata
    const newsMetadata = {
      totalFetched: allNews.length,
      freshNewsCount: freshNews.length,
      analyzedCount: uniqueNews.length,
      freshNewsHours: FRESH_NEWS_HOURS,
      oldestNewsAge: uniqueNews.length > 0 ? getNewsAgeText(Math.min(...uniqueNews.map(n => n.timestamp))) : 'N/A',
      newestNewsAge: uniqueNews.length > 0 ? getNewsAgeText(Math.max(...uniqueNews.map(n => n.timestamp))) : 'N/A',
      sources: ['Reddit', 'HN', 'CryptoCompare', 'Business', 'MarketWatch'],
      sourcesCount: 13
    };

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: Date.now(),
        processingTime,
        newsMetadata, // ✅ NEW
        macro: macroAnalysis,
        forYou: forYouItems.slice(0, 15),
        dailyReports,
        xNotifications,
        rawNews: uniqueNews.slice(0, 60),
        sourcesCount: 13,
        sources: ['Reddit', 'HN', 'CryptoCompare', 'Business', 'MarketWatch'],
        gemini_api: 'direct'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
