import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  importance?: 'high' | 'medium' | 'low';
  imageUrl?: string;
}

// Multiple free news sources
const NEWS_SOURCES = {
  // Crypto sources
  cryptoCompare: 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN',
  coinGecko: 'https://api.coingecko.com/api/v3/status_updates',
  
  // Reddit
  reddit: {
    crypto: 'https://www.reddit.com/r/cryptocurrency/hot.json?limit=25',
    stocks: 'https://www.reddit.com/r/stocks/hot.json?limit=25', 
    wallstreetbets: 'https://www.reddit.com/r/wallstreetbets/hot.json?limit=25',
    investing: 'https://www.reddit.com/r/investing/hot.json?limit=25',
    forex: 'https://www.reddit.com/r/Forex/hot.json?limit=25',
    gold: 'https://www.reddit.com/r/Gold/hot.json?limit=25',
    economics: 'https://www.reddit.com/r/Economics/hot.json?limit=25',
  },
  
  // Hacker News
  hackerNews: 'https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30',
  
  // Alpha Vantage news
  alphaVantage: 'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=demo',
};

// Sentiment analysis keywords
const SENTIMENT_KEYWORDS = {
  bullish: ['surge', 'rally', 'gain', 'rise', 'up', 'bull', 'profit', 'green', 'soar', 'jump', 'breakthrough', 'record', 'high', 'moon', 'rocket', 'buy', 'long', 'growth', 'expansion', 'positive', 'strong', 'beat'],
  bearish: ['crash', 'fall', 'drop', 'down', 'bear', 'loss', 'red', 'plunge', 'decline', 'sell', 'short', 'weak', 'warning', 'fear', 'concern', 'risk', 'recession', 'bankruptcy', 'fraud', 'collapse', 'miss', 'cut'],
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

// Fetch from CryptoCompare
async function fetchCryptoCompare(): Promise<NewsItem[]> {
  try {
    const response = await fetch(NEWS_SOURCES.cryptoCompare);
    if (!response.ok) throw new Error('CryptoCompare API error');
    
    const data = await response.json();
    return (data.Data || []).slice(0, 20).map((item: any) => ({
      id: `cc-${item.id}`,
      title: item.title,
      description: item.body?.substring(0, 200),
      url: item.url,
      source: item.source || 'CryptoCompare',
      category: 'Crypto',
      publishedAt: new Date(item.published_on * 1000).toISOString(),
      sentiment: analyzeSentiment(item.title + ' ' + (item.body || '')),
      importance: 'medium',
      imageUrl: item.imageurl,
    }));
  } catch (error) {
    console.error('CryptoCompare error:', error);
    return [];
  }
}

// Fetch from Reddit
async function fetchReddit(subreddit: string, category: string): Promise<NewsItem[]> {
  try {
    const url = NEWS_SOURCES.reddit[subreddit as keyof typeof NEWS_SOURCES.reddit];
    if (!url) return [];
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
    });
    
    if (!response.ok) throw new Error(`Reddit API error for ${subreddit}`);
    
    const data = await response.json();
    return (data.data?.children || []).slice(0, 15).map((post: any) => ({
      id: `reddit-${post.data.id}`,
      title: post.data.title,
      description: post.data.selftext?.substring(0, 200) || '',
      url: `https://reddit.com${post.data.permalink}`,
      source: `r/${post.data.subreddit}`,
      category,
      publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
      sentiment: analyzeSentiment(post.data.title),
      importance: post.data.score > 1000 ? 'high' : post.data.score > 100 ? 'medium' : 'low',
    }));
  } catch (error) {
    console.error(`Reddit ${subreddit} error:`, error);
    return [];
  }
}

// Fetch from Hacker News
async function fetchHackerNews(query: string = 'finance OR crypto OR stocks'): Promise<NewsItem[]> {
  try {
    const response = await fetch(`${NEWS_SOURCES.hackerNews}&query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('HN API error');
    
    const data = await response.json();
    return (data.hits || []).slice(0, 20).map((hit: any) => ({
      id: `hn-${hit.objectID}`,
      title: hit.title,
      description: '',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: 'Hacker News',
      category: 'Tech/Finance',
      publishedAt: hit.created_at,
      sentiment: analyzeSentiment(hit.title),
      importance: (hit.points || 0) > 100 ? 'high' : 'medium',
    }));
  } catch (error) {
    console.error('HN error:', error);
    return [];
  }
}

// Use AI to enhance news analysis
async function enhanceWithAI(news: NewsItem[]): Promise<NewsItem[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey || news.length === 0) return news;
  
  try {
    // Take top 10 for AI analysis to save tokens
    const topNews = news.slice(0, 10);
    const titles = topNews.map((n, i) => `${i + 1}. ${n.title}`).join('\n');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a financial news analyst. Analyze headlines and return JSON with market impact ratings.
Return ONLY valid JSON array with objects: { "index": number, "sentiment": "bullish"|"bearish"|"neutral", "importance": "high"|"medium"|"low", "summary": "one line summary" }`
          },
          {
            role: 'user',
            content: `Analyze these financial headlines:\n${titles}\n\nReturn JSON array with analysis for each.`
          }
        ],
        max_tokens: 1000,
      }),
    });
    
    if (!response.ok) {
      console.error('AI analysis failed:', response.status);
      return news;
    }
    
    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    // Parse AI response
    try {
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        analysis.forEach((a: any) => {
          if (a.index >= 1 && a.index <= topNews.length) {
            const idx = a.index - 1;
            topNews[idx].sentiment = a.sentiment || topNews[idx].sentiment;
            topNews[idx].importance = a.importance || topNews[idx].importance;
            if (a.summary) {
              topNews[idx].description = a.summary;
            }
          }
        });
      }
    } catch (parseError) {
      console.error('AI parse error:', parseError);
    }
    
    return [...topNews, ...news.slice(10)];
  } catch (error) {
    console.error('AI enhancement error:', error);
    return news;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { category = 'all', query, useAI = false } = await req.json().catch(() => ({}));
    
    console.log(`Fetching news for category: ${category}, query: ${query}`);
    
    const allNews: NewsItem[] = [];
    
    // Fetch from multiple sources in parallel
    const fetchPromises: Promise<NewsItem[]>[] = [];
    
    if (category === 'all' || category === 'crypto') {
      fetchPromises.push(fetchCryptoCompare());
      fetchPromises.push(fetchReddit('crypto', 'Crypto'));
    }
    
    if (category === 'all' || category === 'stocks') {
      fetchPromises.push(fetchReddit('stocks', 'Stocks'));
      fetchPromises.push(fetchReddit('wallstreetbets', 'Stocks'));
    }
    
    if (category === 'all' || category === 'forex') {
      fetchPromises.push(fetchReddit('forex', 'Forex'));
    }
    
    if (category === 'all' || category === 'gold') {
      fetchPromises.push(fetchReddit('gold', 'Commodities'));
    }
    
    if (category === 'all' || category === 'economics') {
      fetchPromises.push(fetchReddit('economics', 'Economics'));
      fetchPromises.push(fetchReddit('investing', 'Investing'));
    }
    
    if (category === 'all' || category === 'tech') {
      fetchPromises.push(fetchHackerNews(query || 'finance OR crypto OR market'));
    }
    
    // Wait for all fetches
    const results = await Promise.allSettled(fetchPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
      }
    });
    
    // Remove duplicates by title similarity
    const seen = new Set<string>();
    const uniqueNews = allNews.filter(n => {
      const key = n.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by date (newest first) and importance
    uniqueNews.sort((a, b) => {
      // Prioritize high importance
      const impOrder = { high: 3, medium: 2, low: 1 };
      const impDiff = (impOrder[b.importance || 'medium'] || 2) - (impOrder[a.importance || 'medium'] || 2);
      if (impDiff !== 0) return impDiff;
      
      // Then by date
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    // Enhance with AI if requested
    let finalNews = uniqueNews;
    if (useAI) {
      console.log('Enhancing news with AI...');
      finalNews = await enhanceWithAI(uniqueNews);
    }
    
    console.log(`Returning ${finalNews.length} news items`);
    
    return new Response(
      JSON.stringify({
        success: true,
        news: finalNews.slice(0, 100), // Limit to 100 items
        sources: ['CryptoCompare', 'Reddit', 'Hacker News'],
        lastUpdated: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('News aggregator error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
