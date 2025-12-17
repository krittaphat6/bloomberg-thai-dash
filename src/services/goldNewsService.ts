// Gold News Service - Fetches gold-specific news from multiple sources

export interface GoldNewsItem {
  id: string;
  title: string;
  source: 'reddit' | 'news' | 'twitter';
  url: string;
  timestamp: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relevance: number;
  author?: string;
  category: 'gold' | 'silver' | 'commodities' | 'forex';
}

// Gold-specific keywords for better relevance and sentiment
export const goldKeywords = {
  bullish: [
    'gold rally', 'gold surge', 'gold breakout', 'safe haven', 'inflation hedge',
    'central bank buying', 'gold demand', 'gold hits high', 'bullish gold',
    'gold support', 'accumulate gold', 'long gold', 'xau up', 'gold bullion',
    'gold etf inflows', 'precious metals rally', 'gold price target', 'gold resistance break'
  ],
  bearish: [
    'gold drop', 'gold falls', 'gold decline', 'sell gold', 'gold crash',
    'gold weakness', 'bearish gold', 'gold resistance', 'short gold',
    'xau down', 'gold selling pressure', 'gold etf outflows', 'gold support break',
    'gold correction', 'take profit gold', 'gold overbought'
  ],
  neutral: [
    'gold price', 'gold trading', 'gold analysis', 'xauusd', 'gold forecast',
    'gold market', 'gold news', 'precious metals', 'bullion', 'gold report'
  ]
};

const determineCategory = (title: string): 'gold' | 'silver' | 'commodities' | 'forex' => {
  const lower = title.toLowerCase();
  if (lower.includes('silver') || lower.includes('xag')) return 'silver';
  if (lower.includes('usd') || lower.includes('forex') || lower.includes('dollar') || lower.includes('dxy')) return 'forex';
  if (lower.includes('oil') || lower.includes('copper') || lower.includes('commodity') || lower.includes('crude')) return 'commodities';
  return 'gold';
};

const analyzeGoldSentiment = (text: string): 'bullish' | 'bearish' | 'neutral' => {
  const lower = text.toLowerCase();
  let bullishScore = 0;
  let bearishScore = 0;

  goldKeywords.bullish.forEach(keyword => {
    if (lower.includes(keyword)) bullishScore++;
  });

  goldKeywords.bearish.forEach(keyword => {
    if (lower.includes(keyword)) bearishScore++;
  });

  if (bullishScore > bearishScore + 1) return 'bullish';
  if (bearishScore > bullishScore + 1) return 'bearish';
  return 'neutral';
};

const calculateGoldRelevance = (title: string): number => {
  const lower = title.toLowerCase();
  let score = 0;

  // High relevance keywords
  if (lower.includes('gold') || lower.includes('xauusd') || lower.includes('xau')) score += 30;
  if (lower.includes('bullion')) score += 20;
  if (lower.includes('precious metals')) score += 15;
  if (lower.includes('central bank')) score += 15;
  if (lower.includes('federal reserve') || lower.includes('fed')) score += 10;
  if (lower.includes('inflation')) score += 10;
  if (lower.includes('safe haven')) score += 15;
  if (lower.includes('etf')) score += 10;
  if (lower.includes('spot gold')) score += 20;

  // Medium relevance
  if (lower.includes('silver') || lower.includes('platinum') || lower.includes('palladium')) score += 10;

  // Breaking/urgent news boost
  if (lower.includes('breaking') || lower.includes('just in')) score += 20;
  if (lower.includes('update') || lower.includes('alert')) score += 10;

  return Math.min(100, score);
};

// Fetch gold news from Reddit
const fetchGoldReddit = async (): Promise<GoldNewsItem[]> => {
  const allNews: GoldNewsItem[] = [];
  const subreddits = ['Gold', 'Silverbugs', 'wallstreetsilver', 'commodities', 'investing', 'wallstreetbets'];

  // Search in specific subreddits
  for (const sub of subreddits) {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${sub}/search.json?q=gold+XAU+price+bullion&sort=new&t=day&limit=10`
      );

      if (response.ok) {
        const data = await response.json();
        const posts = data.data.children.map((post: any) => ({
          id: `reddit-gold-${post.data.id}`,
          title: post.data.title,
          source: 'reddit' as const,
          url: `https://reddit.com${post.data.permalink}`,
          timestamp: post.data.created_utc * 1000,
          sentiment: analyzeGoldSentiment(post.data.title),
          relevance: calculateGoldRelevance(post.data.title),
          author: post.data.author,
          category: determineCategory(post.data.title)
        }));
        allNews.push(...posts);
      }
    } catch (error) {
      console.error(`Reddit ${sub} fetch error:`, error);
    }
  }

  // General gold search across Reddit
  try {
    const response = await fetch(
      `https://www.reddit.com/search.json?q=gold+price+XAUUSD+bullion+precious+metals&sort=relevance&t=day&limit=25`
    );

    if (response.ok) {
      const data = await response.json();
      const posts = data.data.children.map((post: any) => ({
        id: `reddit-search-${post.data.id}`,
        title: post.data.title,
        source: 'reddit' as const,
        url: `https://reddit.com${post.data.permalink}`,
        timestamp: post.data.created_utc * 1000,
        sentiment: analyzeGoldSentiment(post.data.title),
        relevance: calculateGoldRelevance(post.data.title),
        author: post.data.author,
        category: determineCategory(post.data.title)
      }));
      allNews.push(...posts);
    }
  } catch (error) {
    console.error('Reddit gold search error:', error);
  }

  return allNews;
};

// Generate mock Twitter gold news (since Twitter API requires auth)
const generateMockGoldTwitter = (): GoldNewsItem[] => {
  const accounts = [
    { name: 'Kitco News', handle: 'KitcoNewsNOW' },
    { name: 'Gold Telegraph', handle: 'GoldTelegraph_' },
    { name: 'Peter Schiff', handle: 'PeterSchiff' },
    { name: 'GoldSilver', handle: 'goldaborado' },
    { name: 'World Gold Council', handle: 'ABORADOGOLD' },
    { name: 'SPDR Gold', handle: 'SPDRGold' }
  ];

  const templates = [
    'Gold prices surge as investors seek safe haven assets amid market uncertainty',
    'Central banks continue gold buying spree, reserves at historic highs',
    'XAU/USD breaks above key resistance level, targets $2,400',
    'Gold demand from Asia remains strong as inflation concerns persist',
    'Fed rate cut expectations boost gold prices',
    'Gold ETF inflows reach monthly high as portfolio hedging increases'
  ];

  return accounts.map((acc, i) => {
    const title = templates[i % templates.length];
    return {
      id: `tw-gold-${i}-${Date.now()}`,
      title: `@${acc.handle}: ${title}`,
      source: 'twitter' as const,
      url: `https://twitter.com/${acc.handle}`,
      timestamp: Date.now() - Math.random() * 3600000 * 6,
      sentiment: analyzeGoldSentiment(title),
      relevance: calculateGoldRelevance(title),
      author: acc.name,
      category: 'gold' as const
    };
  });
};

// Main function to fetch all gold news
export const fetchGoldNews = async (): Promise<GoldNewsItem[]> => {
  try {
    const [redditNews, twitterNews] = await Promise.all([
      fetchGoldReddit(),
      Promise.resolve(generateMockGoldTwitter())
    ]);

    const allNews = [...redditNews, ...twitterNews];

    // Remove duplicates by title
    const uniqueNews = Array.from(
      new Map(allNews.map(item => [item.title.toLowerCase().substring(0, 50), item])).values()
    );

    // Filter to only items with high gold relevance
    const goldRelevantNews = uniqueNews.filter(item => item.relevance >= 20);

    // Sort by relevance and recency
    goldRelevantNews.sort((a, b) => {
      const recencyWeight = (Date.now() - a.timestamp) / 3600000; // hours old
      const aScore = a.relevance - recencyWeight * 2;
      const bRecencyWeight = (Date.now() - b.timestamp) / 3600000;
      const bScore = b.relevance - bRecencyWeight * 2;
      return bScore - aScore;
    });

    return goldRelevantNews;
  } catch (error) {
    console.error('Error fetching gold news:', error);
    return [];
  }
};

export default fetchGoldNews;
