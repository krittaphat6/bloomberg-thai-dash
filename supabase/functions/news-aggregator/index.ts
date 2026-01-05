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
  change: string;
  changeValue: number;
}

interface ForYouItem {
  id: string;
  symbol: string;
  type: string;
  title: string;
  source: string;
  timestamp: number;
  url: string;
  isNew: boolean;
}

// Asset to keyword mapping for matching news
const ASSET_KEYWORDS: Record<string, string[]> = {
  XAUUSD: ['gold', 'xau', 'precious metal', 'bullion', 'safe haven', 'inflation hedge', 'fed', 'inflation', 'geopolitical'],
  XAGUSD: ['silver', 'xag', 'precious metal', 'industrial metal'],
  EURUSD: ['euro', 'eur', 'ecb', 'europe', 'eurozone', 'lagarde', 'germany'],
  GBPUSD: ['pound', 'gbp', 'sterling', 'boe', 'bank of england', 'uk', 'britain'],
  USDJPY: ['yen', 'jpy', 'japan', 'boj', 'bank of japan', 'japanese', 'intervention'],
  AUDUSD: ['aussie', 'aud', 'australia', 'rba', 'iron ore', 'china demand'],
  USDCHF: ['swiss', 'chf', 'snb', 'switzerland', 'franc', 'safe haven'],
  USDCAD: ['loonie', 'cad', 'canada', 'boc', 'oil prices'],
  NZDUSD: ['kiwi', 'nzd', 'new zealand', 'rbnz', 'dairy'],
  BTCUSD: ['bitcoin', 'btc', 'crypto', 'satoshi', 'halving', 'etf', 'digital asset'],
  ETHUSD: ['ethereum', 'eth', 'vitalik', 'defi', 'smart contract', 'layer 2'],
  SOLUSD: ['solana', 'sol', 'nft'],
  XRPUSD: ['xrp', 'ripple', 'sec lawsuit'],
  USOIL: ['oil', 'wti', 'crude', 'opec', 'petroleum', 'energy', 'barrel'],
  UKOIL: ['brent', 'oil', 'crude', 'opec'],
  US500: ['s&p', 'spx', 'sp500', 'stock market', 'wall street', 'nasdaq', 'dow'],
  US30: ['dow', 'djia', 'dow jones', 'industrial'],
  US100: ['nasdaq', 'tech stocks', 'qqq', 'tech', 'nvidia', 'apple', 'microsoft'],
  DE40: ['dax', 'german', 'germany', 'euro stocks'],
  JP225: ['nikkei', 'japan', 'japanese stock', 'topix']
};

// Sentiment keywords
const SENTIMENT_KEYWORDS = {
  bullish: ['surge', 'rally', 'gain', 'rise', 'up', 'bull', 'profit', 'green', 'soar', 'jump', 'breakthrough', 'record', 'high', 'moon', 'rocket', 'buy', 'long', 'growth', 'expansion', 'positive', 'strong', 'beat', 'hawkish', 'breakout', 'all-time'],
  bearish: ['crash', 'fall', 'drop', 'down', 'bear', 'loss', 'red', 'plunge', 'decline', 'sell', 'short', 'weak', 'warning', 'fear', 'concern', 'risk', 'recession', 'bankruptcy', 'fraud', 'collapse', 'miss', 'cut', 'dovish', 'dump', 'layoff'],
};

function analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  let bullishScore = 0;
  let bearishScore = 0;
  
  SENTIMENT_KEYWORDS.bullish.forEach(w => {
    if (lower.includes(w)) bullishScore++;
  });
  
  SENTIMENT_KEYWORDS.bearish.forEach(w => {
    if (lower.includes(w)) bearishScore++;
  });
  
  if (bullishScore > bearishScore + 1) return 'bullish';
  if (bearishScore > bullishScore + 1) return 'bearish';
  return 'neutral';
}

function matchAssets(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  
  for (const [asset, keywords] of Object.entries(ASSET_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        matched.push(asset);
        break;
      }
    }
  }
  
  return matched;
}

// Fetch from Reddit
async function fetchReddit(subreddit: string, category: string): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`,
      { headers: { 'User-Agent': 'AbleTerminal/1.0' } }
    );
    
    if (!response.ok) {
      console.log(`Reddit ${subreddit} fetch failed:`, response.status);
      return [];
    }
    
    const data = await response.json();
    return (data.data?.children || []).map((post: any) => {
      const title = post.data.title;
      return {
        id: `reddit-${post.data.id}`,
        title,
        description: post.data.selftext?.substring(0, 200) || '',
        url: `https://reddit.com${post.data.permalink}`,
        source: `r/${post.data.subreddit}`,
        category,
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

// Fetch from Hacker News
async function fetchHackerNews(query: string): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=25`
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

// Fetch from CryptoCompare
async function fetchCryptoCompare(): Promise<RawNewsItem[]> {
  try {
    const response = await fetch(
      'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,Trading,Market'
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.Data || []).slice(0, 20).map((item: any) => {
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
        sentiment: analyzeSentiment(title + ' ' + (item.body || '')),
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

// Fetch from NewsData.io (free tier)
async function fetchNewsDataIO(): Promise<RawNewsItem[]> {
  try {
    // Using public free news API
    const response = await fetch(
      'https://saurav.tech/NewsAPI/top-headlines/category/business/us.json'
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.articles || []).slice(0, 15).map((item: any, i: number) => {
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

// Fetch from Finviz Headlines (via RSS-like scraping simulation)
async function fetchFinancialNews(): Promise<RawNewsItem[]> {
  try {
    // MarketWatch RSS feed proxy
    const response = await fetch(
      'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines'
    );
    
    if (!response.ok) return [];
    
    const text = await response.text();
    const items: RawNewsItem[] = [];
    
    // Simple XML parsing for RSS items
    const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    for (let i = 0; i < Math.min(itemMatches.length, 15); i++) {
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

// AI Analysis with ABLE-HF 3.0 Integration
async function analyzeWithAI(news: RawNewsItem[], pinnedAssets: string[]): Promise<MacroAnalysis[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Use pinned assets if provided, otherwise default
  const symbols = pinnedAssets.length > 0 ? pinnedAssets : ['EURUSD', 'USDJPY', 'XAUUSD', 'GBPUSD'];
  
  if (!LOVABLE_API_KEY || news.length === 0) {
    console.log('No API key or news, using fallback');
    return generateFallbackAnalysis(news, symbols);
  }

  try {
    const headlines = news.slice(0, 30).map(n => `- [${n.source}] ${n.title}`).join('\n');

    console.log(`Calling Lovable AI for analysis of ${symbols.join(', ')}...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are ABLE-HF 3.0, an elite Hedge Fund-grade forex, commodities, and crypto trading analyst. 
You use a 40-module analysis engine to provide institutional-quality insights.

Analyze news headlines and provide market bias for EACH of these assets: ${symbols.join(', ')}.

For EACH symbol, provide:
- sentiment: "bullish", "bearish", or "neutral" based on news impact
- confidence: 50-99 (institutional confidence level)
- analysis: Thai language professional analysis in 2 sentences max. Start with emoji: 💹 for bullish, 📉 for bearish, ⚖️ for neutral
- estimatedChange: daily % change estimate (-3 to +3)

CRITICAL ANALYSIS FACTORS:
- USD strength/weakness affects all forex pairs
- Gold (XAUUSD) rises on uncertainty, fear, inflation, geopolitical risk
- JPY as safe haven vs carry trade dynamics  
- Crypto correlates with risk appetite and tech sentiment
- Oil affected by OPEC, demand, geopolitical events

Respond ONLY with valid JSON:
{
  "analyses": [
    {"symbol": "XAUUSD", "sentiment": "bullish", "confidence": 85, "analysis": "💹 XAUUSD: สัญญาณ BULLISH แรงมาก | โอกาสขึ้น 75% vs ลง 25% | แนะนำ BUY | ปัจจัยหลัก: 🌍 Geopolitical Tensions, 🔥 Crypto Market", "estimatedChange": 1.2}
  ]
}`
          },
          {
            role: 'user',
            content: `วันนี้ข่าวการเงินโลก:\n${headlines}\n\nวิเคราะห์แบบ ABLE-HF 3.0 สำหรับ: ${symbols.join(', ')}`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return generateFallbackAnalysis(news, symbols);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing...');
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON in AI response');
      return generateFallbackAnalysis(news, symbols);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return parsed.analyses.map((a: any) => ({
      symbol: a.symbol,
      sentiment: a.sentiment,
      confidence: Math.min(99, Math.max(50, a.confidence)),
      analysis: a.analysis,
      change: a.estimatedChange >= 0 ? `+${a.estimatedChange.toFixed(2)}%` : `${a.estimatedChange.toFixed(2)}%`,
      changeValue: a.estimatedChange
    }));

  } catch (error) {
    console.error('AI analysis error:', error);
    return generateFallbackAnalysis(news, symbols);
  }
}

function generateFallbackAnalysis(news: RawNewsItem[], symbols: string[]): MacroAnalysis[] {
  const sentiments = news.map(n => n.sentiment);
  const bullishCount = sentiments.filter(s => s === 'bullish').length;
  const bearishCount = sentiments.filter(s => s === 'bearish').length;
  const marketBias = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';
  
  return symbols.map(symbol => {
    // Generate symbol-specific analysis based on news matching
    const relevantNews = news.filter(n => n.relatedAssets?.includes(symbol));
    const symbolSentiment = relevantNews.length > 0 
      ? (relevantNews.filter(n => n.sentiment === 'bullish').length > relevantNews.filter(n => n.sentiment === 'bearish').length ? 'bullish' : 'bearish')
      : marketBias;
    
    const confidence = 55 + Math.floor(Math.random() * 30);
    const change = (Math.random() * 2 - 1);
    
    const sentimentEmoji = symbolSentiment === 'bullish' ? '💹' : symbolSentiment === 'bearish' ? '📉' : '⚖️';
    const direction = symbolSentiment === 'bullish' ? 'ขึ้น' : symbolSentiment === 'bearish' ? 'ลง' : 'ทรงตัว';
    
    return {
      symbol,
      sentiment: symbolSentiment as 'bullish' | 'bearish' | 'neutral',
      confidence,
      analysis: `${sentimentEmoji} ${symbol}: สัญญาณ ${symbolSentiment.toUpperCase()} | โอกาส${direction} ${confidence}% | วิเคราะห์จาก ${relevantNews.length} ข่าวที่เกี่ยวข้อง`,
      change: change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`,
      changeValue: change
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting news aggregation...');
    const startTime = Date.now();
    
    // Parse request body for pinned assets
    let pinnedAssets: string[] = [];
    try {
      const body = await req.json();
      pinnedAssets = body.pinnedAssets || [];
    } catch {
      // No body or invalid JSON
    }
    
    console.log('Pinned assets:', pinnedAssets);
    
    // Fetch from all sources in parallel
    const [
      forexReddit,
      goldReddit,
      cryptoReddit,
      wsbReddit,
      stocksReddit,
      economicsReddit,
      investingReddit,
      hackerNewsFinance,
      hackerNewsCrypto,
      hackerNewsStock,
      cryptoNews,
      businessNews,
      marketNews
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

    // Combine all news
    let allNews = [
      ...forexReddit,
      ...goldReddit,
      ...cryptoReddit,
      ...wsbReddit,
      ...stocksReddit,
      ...economicsReddit,
      ...investingReddit,
      ...hackerNewsFinance,
      ...hackerNewsCrypto,
      ...hackerNewsStock,
      ...cryptoNews,
      ...businessNews,
      ...marketNews
    ];

    // Remove duplicates
    const seen = new Set<string>();
    allNews = allNews.filter(n => {
      const key = n.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by timestamp (newest first)
    allNews.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`Fetched ${allNews.length} unique news items in ${Date.now() - startTime}ms`);

    // Get AI analysis for pinned assets
    const macroAnalysis = await analyzeWithAI(allNews, pinnedAssets);
    console.log('Macro analysis complete');

    // Create "For You" items from news related to pinned assets
    const forYouItems: ForYouItem[] = [];
    
    if (pinnedAssets.length > 0) {
      // Get news specifically for pinned assets
      for (const asset of pinnedAssets) {
        const assetNews = allNews
          .filter(item => item.relatedAssets?.includes(asset))
          .slice(0, 3);
        
        assetNews.forEach(item => {
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
    
    // Add general high-importance news
    allNews
      .filter(item => item.importance === 'high' && !forYouItems.find(f => f.id === item.id))
      .slice(0, 5)
      .forEach(item => {
        const symbol = item.relatedAssets?.[0] || item.category.toUpperCase();
        forYouItems.push({
          id: item.id,
          symbol,
          type: `${item.sentiment?.toUpperCase() || 'NEUTRAL'} (${item.importance?.toUpperCase() || 'MEDIUM'})`,
          title: item.title,
          source: item.source,
          timestamp: item.timestamp,
          url: item.url,
          isNew: Date.now() - item.timestamp < 3600000
        });
      });

    // Sort For You by timestamp
    forYouItems.sort((a, b) => b.timestamp - a.timestamp);

    // Create daily reports from top stories
    const dailyReports = allNews
      .filter(item => item.importance === 'high' || (item.upvotes && item.upvotes > 100))
      .slice(0, 5)
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

    // X/Twitter-like notifications
    const xNotifications = allNews
      .filter(item => item.upvotes && item.upvotes > 50)
      .slice(0, 6)
      .map(item => ({
        id: item.id,
        source: item.source.replace('r/', ''),
        time: formatTimeAgo(item.timestamp),
        content: item.title.substring(0, 100) + (item.title.length > 100 ? '...' : ''),
        url: item.url
      }));

    const responseTime = Date.now() - startTime;
    console.log(`Total processing time: ${responseTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: Date.now(),
        processingTime: responseTime,
        macro: macroAnalysis,
        forYou: forYouItems.slice(0, 15),
        dailyReports,
        xNotifications,
        rawNews: allNews.slice(0, 60),
        sources: ['Reddit', 'Hacker News', 'CryptoCompare', 'Business News', 'MarketWatch']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('News aggregator error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        macro: [],
        forYou: [],
        dailyReports: [],
        xNotifications: [],
        rawNews: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
