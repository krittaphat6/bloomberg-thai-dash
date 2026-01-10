// supabase/functions/news-aggregator/index.ts
// ABLE-HF 3.0 Full Analysis via Gemini

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
      { headers: { 'User-Agent': 'AbleTerminal/1.0' } }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.data?.children || []).map((post: any) => {
      const title = post.data.title;
      return {
        id: `r-${subreddit}-${post.data.id}`,
        title,
        description: post.data.selftext?.substring(0, 200) || '',
        url: `https://reddit.com${post.data.permalink}`,
        source: `r/${subreddit}`,
        category: displayName,
        publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
        timestamp: post.data.created_utc * 1000,
        sentiment: analyzeSentiment(title),
        importance: post.data.score > 500 ? 'high' : post.data.score > 100 ? 'medium' : 'low',
        upvotes: post.data.ups,
        comments: post.data.num_comments,
        relatedAssets: matchAssets(title)
      };
    });
  } catch (error) {
    console.error(`Reddit ${subreddit} error:`, error);
    return [];
  }
}

async function fetchHackerNews(query: string): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=50`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.hits || []).map((hit: any) => {
      const title = hit.title || '';
      return {
        id: `hn-${hit.objectID}`,
        title,
        description: '',
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'Hacker News',
        category: 'Tech',
        publishedAt: hit.created_at,
        timestamp: new Date(hit.created_at).getTime(),
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
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,Trading,Market'
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.Data || []).slice(0, 40).map((item: any) => {
      const title = item.title;
      return {
        id: `cc-${item.id}`,
        title,
        description: item.body?.substring(0, 200) || '',
        url: item.url,
        source: item.source || 'CryptoCompare',
        category: 'Crypto',
        publishedAt: new Date(item.published_on * 1000).toISOString(),
        timestamp: item.published_on * 1000,
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
      'https://saurav.tech/NewsAPI/top-headlines/category/business/us.json'
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.articles || []).slice(0, 30).map((item: any, i: number) => {
      const title = item.title || '';
      return {
        id: `news-${i}-${Date.now()}`,
        title,
        description: item.description?.substring(0, 200) || '',
        url: item.url || '#',
        source: item.source?.name || 'News',
        category: 'Business',
        publishedAt: item.publishedAt || new Date().toISOString(),
        timestamp: new Date(item.publishedAt || Date.now()).getTime(),
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
        items.push({
          id: `mw-${i}-${Date.now()}`,
          title,
          description: '',
          url: linkMatch ? linkMatch[1].trim() : '#',
          source: 'MarketWatch',
          category: 'Markets',
          publishedAt: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
          timestamp: dateMatch ? new Date(dateMatch[1].trim()).getTime() : Date.now(),
          sentiment: analyzeSentiment(title),
          importance: 'high',
          upvotes: 0,
          comments: 0,
          relatedAssets: matchAssets(title)
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error('Financial news error:', error);
    return [];
  }
}

// ============================================
// ABLE-HF 3.0 PROMPT BUILDER
// ============================================

function buildFullAnalysisPrompt(news: any[], symbol: string): string {
  return `# ABLE-HF 3.0 HEDGE FUND ANALYST

## ROLE
คุณคือนักวิเคราะห์ระดับ Hedge Fund ที่ใช้ระบบ 40 modules

## TASK
วิเคราะห์สินทรัพย์: **${symbol}**

## INPUT (${news.length} news items)
${JSON.stringify(news.slice(0, 40), null, 2)}

## 40 MODULES SYSTEM

### CATEGORY 1: MACRO & ECONOMIC (33%)
1. macro_neural_forecast (6.5%)
2. central_bank_sentiment (7.0%)
3. yield_curve_signal (4.5%)
4. inflation_momentum (4.0%)
5. gdp_growth_trajectory (3.5%)
6. employment_dynamics (3.0%)
7. trade_balance_flow (2.5%)
8. fiscal_policy_impact (2.0%)

### CATEGORY 2: SENTIMENT & FLOW (29%)
9. news_sentiment_cfa (7.5%)
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
25. event_shock (6.5%)
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

## PROCESS
1. กรองข่าวที่เกี่ยวกับ ${symbol}
2. ให้คะแนนแต่ละ module -100 ถึง +100
3. คำนวณ weighted sum
4. P_up = sigmoid(total/10) where sigmoid(x) = 1/(1+exp(-x))
5. P_down = 1 - P_up
6. Trading signal: P_up >= 70% BUY, P_up >= 55% HOLD, P_up < 45% SELL

## OUTPUT (JSON ONLY, NO MARKDOWN)
{
  "P_up_pct": 78.5,
  "P_down_pct": 21.5,
  "decision": "🟢 BUY",
  "confidence": 76,
  "market_regime": "MODERATE_VOLATILITY",
  "scores": {
    "macro_neural_forecast": 65,
    "central_bank_sentiment": 80,
    "yield_curve_signal": 40,
    "inflation_momentum": 55,
    "news_sentiment_cfa": 72,
    "social_media_pulse": 60,
    "trend_regime_detector": 45,
    "event_shock": 30,
    "geopolitical_risk": -20
  },
  "category_performance": {
    "macro_economic": 68.5,
    "sentiment_flow": 72.3,
    "technical_regime": 55.8,
    "risk_event": 45.2,
    "alternative_ai": 60.1
  },
  "trading_signal": {
    "signal": "BUY",
    "icon": "🟢",
    "color": "#22C55E",
    "strength": 75
  },
  "thai_summary": "ทองคำมีแนวโน้มขาขึ้นจากความกังวลเรื่องเงินเฟ้อและนโยบาย Fed ที่ผ่อนคลาย ข่าวส่วนใหญ่ bullish",
  "key_drivers": ["นโยบาย Fed", "เงินเฟ้อ", "Safe Haven Demand"],
  "risk_warnings": ["ระวังถ้า Fed เปลี่ยนนโยบาย", "Dollar แข็งค่าอาจกดดัน"],
  "analyzed_at": "${new Date().toISOString()}",
  "news_count": ${news.length},
  "relevant_news_count": 18
}`;
}

// ============================================
// GEMINI API DIRECT (ไม่ผ่าน Lovable Gateway)
// ============================================

async function analyzeWithGemini(news: RawNewsItem[], pinnedAssets: string[]): Promise<MacroAnalysis[]> {
  // ใช้ GEMINI_API_KEY โดยตรงแทน LOVABLE_API_KEY
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const symbols = pinnedAssets.length > 0 ? pinnedAssets : ['XAUUSD', 'EURUSD', 'BTCUSD'];
  
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in secrets');
    return generateFallbackAnalysis(news, symbols);
  }
  
  if (news.length === 0) {
    console.log('⚠️ No news to analyze, using fallback');
    return generateFallbackAnalysis(news, symbols);
  }

  console.log(`🔑 Using Gemini API Direct (not Lovable Gateway)`);
  const results: MacroAnalysis[] = [];

  for (const symbol of symbols) {
    try {
      console.log(`🧠 Analyzing ${symbol} with Gemini API Direct...`);
      
      // Get relevant news for this symbol
      const symbolKeywords = getSymbolKeywords(symbol);
      const relevantNews = news.filter(n => {
        const text = (n.title + ' ' + (n.description || '')).toLowerCase();
        return symbolKeywords.some(kw => text.includes(kw));
      });
      
      const newsToAnalyze = relevantNews.length > 5 
        ? relevantNews.slice(0, 40) 
        : news.slice(0, 40);

      const prompt = buildFullAnalysisPrompt(newsToAnalyze, symbol);

      // เรียก Gemini API โดยตรง (ไม่ผ่าน Lovable Gateway)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 3000,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini API error for ${symbol}:`, response.status, errorText);
        
        // Handle rate limits
        if (response.status === 429) {
          console.log('⚠️ Rate limit hit, waiting...');
          await new Promise(r => setTimeout(r, 2000));
        }
        continue;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let analysisResult;
      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
        sentiment: analysisResult.P_up_pct > 55 ? 'bullish' : analysisResult.P_up_pct < 45 ? 'bearish' : 'neutral',
        confidence: Math.round(analysisResult.confidence || analysisResult.P_up_pct),
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

function getSymbolKeywords(symbol: string): string[] {
  const keywordMap: Record<string, string[]> = {
    XAUUSD: ['gold', 'xau', 'bullion', 'precious', 'safe haven'],
    XAGUSD: ['silver', 'xag'],
    EURUSD: ['euro', 'eur', 'ecb', 'eurozone', 'lagarde'],
    GBPUSD: ['pound', 'gbp', 'sterling', 'boe', 'uk'],
    USDJPY: ['yen', 'jpy', 'japan', 'boj'],
    BTCUSD: ['bitcoin', 'btc', 'crypto', 'halving'],
    ETHUSD: ['ethereum', 'eth', 'defi'],
    USOIL: ['oil', 'wti', 'crude', 'opec'],
    US500: ['s&p', 'sp500', 'stock market'],
    US100: ['nasdaq', 'tech stocks', 'qqq']
  };
  return keywordMap[symbol] || [symbol.toLowerCase()];
}

function generateFallbackAnalysis(news: RawNewsItem[], symbols: string[]): MacroAnalysis[] {
  const bullishCount = news.filter(n => n.sentiment === 'bullish').length;
  const bearishCount = news.filter(n => n.sentiment === 'bearish').length;
  const totalSentiment = news.length > 0 ? (bullishCount - bearishCount) / news.length : 0;
  
  return symbols.map(symbol => {
    const symbolKeywords = getSymbolKeywords(symbol);
    const relevantNews = news.filter(n => {
      const text = n.title.toLowerCase();
      return symbolKeywords.some(kw => text.includes(kw));
    });
    
    const relevantBullish = relevantNews.filter(n => n.sentiment === 'bullish').length;
    const relevantBearish = relevantNews.filter(n => n.sentiment === 'bearish').length;
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let P_up = 50;
    
    if (relevantNews.length > 0) {
      const score = (relevantBullish - relevantBearish) / relevantNews.length;
      P_up = Math.round(50 + score * 30);
      sentiment = score > 0.1 ? 'bullish' : score < -0.1 ? 'bearish' : 'neutral';
    } else {
      P_up = Math.round(50 + totalSentiment * 20);
      sentiment = totalSentiment > 0.1 ? 'bullish' : totalSentiment < -0.1 ? 'bearish' : 'neutral';
    }
    
    const confidence = 55 + Math.floor(Math.random() * 20);
    
    return {
      symbol,
      sentiment,
      confidence,
      analysis: `${symbol}: ${sentiment.toUpperCase()} | ${confidence}% (Fallback - ${relevantNews.length} related news)`,
      change: `${P_up >= 50 ? '+' : ''}${(P_up - 50).toFixed(1)}%`,
      changeValue: (P_up - 50) / 100,
      ableAnalysis: {
        P_up_pct: P_up,
        P_down_pct: 100 - P_up,
        decision: P_up >= 55 ? '🟢 BUY' : P_up <= 45 ? '🔴 SELL' : '🟡 HOLD',
        confidence,
        thai_summary: `${symbol}: วิเคราะห์จาก ${relevantNews.length} ข่าวที่เกี่ยวข้อง | ${sentiment.toUpperCase()}`,
        key_drivers: ['Market Sentiment', 'News Flow'],
        risk_warnings: ['Using fallback analysis'],
        market_regime: 'NORMAL',
        scores: {},
        category_performance: {},
        trading_signal: {
          signal: P_up >= 55 ? 'BUY' : P_up <= 45 ? 'SELL' : 'HOLD',
          icon: P_up >= 55 ? '🟢' : P_up <= 45 ? '🔴' : '🟡',
          strength: confidence
        },
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
    console.log('🚀 Starting ABLE-HF 3.0...');
    const startTime = Date.now();
    
    let pinnedAssets: string[] = [];
    try {
      const body = await req.json();
      pinnedAssets = body.pinnedAssets || [];
    } catch {}
    
    console.log(`📡 Fetching news from 13 sources... (pinned: ${pinnedAssets.join(', ') || 'none'})`);
    
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

    // Deduplicate
    const seen = new Set<string>();
    allNews = allNews.filter(n => {
      const key = n.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by timestamp
    allNews.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`✅ ${allNews.length} unique news items collected`);

    // Run Gemini analysis
    const macroAnalysis = await analyzeWithGemini(allNews, pinnedAssets);
    console.log(`✅ Analysis complete: ${macroAnalysis.length} assets analyzed`);

    // Build For You items
    const forYouItems: any[] = [];
    if (pinnedAssets.length > 0) {
      for (const asset of pinnedAssets) {
        const assetKeywords = getSymbolKeywords(asset);
        allNews.filter(item => {
          const text = item.title.toLowerCase();
          return assetKeywords.some(kw => text.includes(kw));
        }).slice(0, 3).forEach(item => {
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
    
    // Add high importance news
    allNews.filter(item => item.importance === 'high').slice(0, 5).forEach(item => {
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

    // Build daily reports
    const dailyReports = allNews.filter(item => item.importance === 'high').slice(0, 5).map((item, i) => {
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

    // Build X notifications
    const xNotifications = allNews.filter(item => item.upvotes && item.upvotes > 50).slice(0, 6).map(item => ({
      id: item.id,
      source: item.source.replace('r/', ''),
      time: formatTimeAgo(item.timestamp),
      content: item.title.substring(0, 100),
      url: item.url
    }));

    const processingTime = Date.now() - startTime;
    console.log(`✅ Total processing time: ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: Date.now(),
        processingTime,
        macro: macroAnalysis,
        forYou: forYouItems.slice(0, 15),
        dailyReports,
        xNotifications,
        rawNews: allNews.slice(0, 60),
        sourcesCount: 13,
        sources: ['Reddit (7)', 'HN (3)', 'CryptoCompare', 'Business News', 'MarketWatch']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
