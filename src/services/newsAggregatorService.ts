import { EnhancedNewsItem, ImpactScoreBreakdown, AIAnalysisResult } from '@/types/news';
import { NEWS_SOURCES, SOURCE_CREDIBILITY, AI_MODELS, AI_PROMPTS } from '@/config/newsSources';

// ============ SENTIMENT ANALYSIS ============
const SENTIMENT_WEIGHTS = {
  bullish: {
    strong: ['moon', 'rocket', 'parabolic', 'explosive', 'soaring', 'skyrocket', 'breakthrough', 'all-time high', 'ath', '🚀', '💎', '🔥'],
    medium: ['bull', 'bullish', 'surge', 'rally', 'gain', 'profit', 'green', 'pump', 'breakout', 'uptrend', 'buy', 'long', '📈'],
    weak: ['up', 'rise', 'positive', 'growth', 'increase', 'higher', 'support', 'recovery']
  },
  bearish: {
    strong: ['crash', 'collapse', 'plunge', 'dump', 'disaster', 'bankrupt', 'fraud', 'scam', 'rug', '💀', '🔴'],
    medium: ['bear', 'bearish', 'fall', 'drop', 'loss', 'red', 'sell', 'short', 'decline', 'correction', '📉'],
    weak: ['down', 'lower', 'decrease', 'weakness', 'resistance', 'concern', 'risk', 'warning']
  }
};

export function analyzeSentiment(text: string): { sentiment: 'bullish' | 'bearish' | 'neutral', score: number, confidence: number } {
  const lower = text.toLowerCase();
  let score = 0;
  
  SENTIMENT_WEIGHTS.bullish.strong.forEach(w => { if (lower.includes(w)) score += 15; });
  SENTIMENT_WEIGHTS.bearish.strong.forEach(w => { if (lower.includes(w)) score -= 15; });
  SENTIMENT_WEIGHTS.bullish.medium.forEach(w => { if (lower.includes(w)) score += 8; });
  SENTIMENT_WEIGHTS.bearish.medium.forEach(w => { if (lower.includes(w)) score -= 8; });
  SENTIMENT_WEIGHTS.bullish.weak.forEach(w => { if (lower.includes(w)) score += 3; });
  SENTIMENT_WEIGHTS.bearish.weak.forEach(w => { if (lower.includes(w)) score -= 3; });
  
  score = Math.max(-100, Math.min(100, score));
  const sentiment = score > 15 ? 'bullish' : score < -15 ? 'bearish' : 'neutral';
  const confidence = Math.min(Math.abs(score) / 100, 1);
  
  return { sentiment, score, confidence };
}

export function extractTickers(text: string): string[] {
  const tickers: string[] = [];
  const matches = text.match(/\$[A-Z]{2,5}/g) || [];
  matches.forEach(m => tickers.push(m.replace('$', '')));
  
  const assets = [
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK',
    'XAUUSD', 'XAGUSD', 'XAU', 'XAG', 'EURUSD', 'GBPUSD', 'USDJPY', 'DXY',
    'SPX', 'NDX', 'DJI', 'VIX'
  ];
  assets.forEach(c => { if (text.toUpperCase().includes(c)) tickers.push(c); });
  
  return [...new Set(tickers)].slice(0, 5);
}

// ============ IMPACT SCORING ============
export function calculateImpactScore(
  news: Partial<EnhancedNewsItem>,
  sourceCredibility: number,
  aiAnalysis?: Partial<EnhancedNewsItem>
): ImpactScoreBreakdown {
  // 1. Source Credibility (0-20)
  const sourceScore = sourceCredibility;
  
  // 2. Content Relevance (0-25)
  const highImpactKeywords = [
    'fed', 'fomc', 'rate', 'inflation', 'cpi', 'nfp', 'gdp', 'recession',
    'crash', 'surge', 'plunge', 'record', 'breaking', 'urgent', 'emergency',
    'war', 'crisis', 'default', 'bankruptcy', 'hack', 'regulation', 'ban'
  ];
  const mediumImpactKeywords = [
    'earnings', 'profit', 'revenue', 'forecast', 'outlook', 'guidance',
    'upgrade', 'downgrade', 'buy', 'sell', 'target', 'analysis'
  ];
  
  const titleLower = (news.title || '').toLowerCase();
  let relevanceScore = 10;
  highImpactKeywords.forEach(kw => { if (titleLower.includes(kw)) relevanceScore += 3; });
  mediumImpactKeywords.forEach(kw => { if (titleLower.includes(kw)) relevanceScore += 1.5; });
  relevanceScore = Math.min(25, relevanceScore);
  
  // 3. Timing Urgency (0-15)
  const ageMinutes = (Date.now() - (news.timestamp || Date.now())) / 60000;
  let timingScore = 15;
  if (ageMinutes > 5) timingScore = 12;
  if (ageMinutes > 30) timingScore = 9;
  if (ageMinutes > 60) timingScore = 6;
  if (ageMinutes > 180) timingScore = 3;
  if (ageMinutes > 1440) timingScore = 1;
  
  // 4. Market Context (0-20)
  const hour = new Date().getUTCHours();
  let marketScore = 10;
  if ((hour >= 13 && hour <= 21) || (hour >= 0 && hour <= 4)) {
    marketScore = 15;
  }
  if (news.isBreaking) marketScore = 20;
  
  // 5. AI Confidence (0-20)
  let aiScore = 0;
  if (aiAnalysis?.aiConfidence) {
    aiScore = Math.round(aiAnalysis.aiConfidence * 20);
  }
  
  const total = sourceScore + relevanceScore + timingScore + marketScore + aiScore;
  
  return {
    total: Math.min(100, total),
    sourceCredibility: sourceScore,
    contentRelevance: relevanceScore,
    timingUrgency: timingScore,
    marketContext: marketScore,
    aiConfidence: aiScore
  };
}

export function getImpactCategory(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ============ NEWS FETCHERS ============
export async function fetchRedditNews(subreddit: string, query: string): Promise<EnhancedNewsItem[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`
    );
    if (!res.ok) throw new Error('Reddit API error');
    
    const data = await res.json();
    return data.data.children.map((p: any) => {
      const { sentiment, score: sentScore, confidence } = analyzeSentiment(p.data.title);
      const tickers = extractTickers(p.data.title);
      const sourceCredibility = SOURCE_CREDIBILITY[`reddit-${subreddit.toLowerCase()}`] || 10;
      
      const item: Partial<EnhancedNewsItem> = {
        id: `reddit-${p.data.id}`,
        title: p.data.title,
        source: `r/${subreddit}`,
        sourceId: `reddit-${subreddit.toLowerCase()}`,
        url: `https://reddit.com${p.data.permalink}`,
        timestamp: p.data.created_utc * 1000,
        publishedAt: new Date(p.data.created_utc * 1000).toISOString(),
        fetchedAt: Date.now(),
        upvotes: p.data.ups,
        comments: p.data.num_comments,
        category: subreddit,
        tags: [],
        relatedTickers: tickers,
        algoSentiment: sentiment,
        algoConfidence: confidence,
        algoRelevance: 50,
        algoScore: sentScore,
        isAIAnalyzed: false,
        isBreaking: false,
        isRead: false,
        isBookmarked: false,
        isHidden: false
      };
      
      const impactBreakdown = calculateImpactScore(item, sourceCredibility);
      
      return {
        ...item,
        impactScore: impactBreakdown.total,
        impactCategory: getImpactCategory(impactBreakdown.total)
      } as EnhancedNewsItem;
    });
  } catch (e) {
    console.error('Reddit error:', e);
    return [];
  }
}

export async function fetchHackerNews(query: string): Promise<EnhancedNewsItem[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`
    );
    if (!res.ok) throw new Error('HN API error');
    
    const data = await res.json();
    return data.hits.map((h: any) => {
      const { sentiment, score: sentScore, confidence } = analyzeSentiment(h.title || '');
      const tickers = extractTickers(h.title || '');
      const sourceCredibility = SOURCE_CREDIBILITY['hackernews'] || 10;
      
      const item: Partial<EnhancedNewsItem> = {
        id: `hn-${h.objectID}`,
        title: h.title || 'No title',
        source: 'Hacker News',
        sourceId: 'hackernews',
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        timestamp: new Date(h.created_at).getTime(),
        publishedAt: h.created_at,
        fetchedAt: Date.now(),
        author: h.author,
        comments: h.num_comments,
        category: 'Tech',
        tags: [],
        relatedTickers: tickers,
        algoSentiment: sentiment,
        algoConfidence: confidence,
        algoRelevance: 40,
        algoScore: sentScore,
        isAIAnalyzed: false,
        isBreaking: false,
        isRead: false,
        isBookmarked: false,
        isHidden: false
      };
      
      const impactBreakdown = calculateImpactScore(item, sourceCredibility);
      
      return {
        ...item,
        impactScore: impactBreakdown.total,
        impactCategory: getImpactCategory(impactBreakdown.total)
      } as EnhancedNewsItem;
    });
  } catch (e) {
    console.error('HN error:', e);
    return [];
  }
}

export async function fetchCryptoCompareNews(): Promise<EnhancedNewsItem[]> {
  try {
    const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular');
    if (!res.ok) throw new Error('CryptoCompare error');
    
    const data = await res.json();
    return (data.Data || []).slice(0, 25).map((n: any) => {
      const { sentiment, score: sentScore, confidence } = analyzeSentiment(n.title + ' ' + (n.body || ''));
      const tickers = extractTickers(n.title + ' ' + (n.body || ''));
      const sourceCredibility = SOURCE_CREDIBILITY['cryptocompare'] || 14;
      
      const item: Partial<EnhancedNewsItem> = {
        id: `cc-${n.id}`,
        title: n.title,
        description: n.body?.substring(0, 200),
        source: n.source,
        sourceId: 'cryptocompare',
        url: n.url,
        imageUrl: n.imageurl,
        timestamp: n.published_on * 1000,
        publishedAt: new Date(n.published_on * 1000).toISOString(),
        fetchedAt: Date.now(),
        category: n.categories || 'Crypto',
        tags: (n.tags || '').split('|').filter(Boolean),
        relatedTickers: tickers,
        algoSentiment: sentiment,
        algoConfidence: confidence,
        algoRelevance: 60,
        algoScore: sentScore,
        isAIAnalyzed: false,
        isBreaking: false,
        isRead: false,
        isBookmarked: false,
        isHidden: false
      };
      
      const impactBreakdown = calculateImpactScore(item, sourceCredibility);
      
      return {
        ...item,
        impactScore: impactBreakdown.total,
        impactCategory: getImpactCategory(impactBreakdown.total)
      } as EnhancedNewsItem;
    });
  } catch (e) {
    console.error('CryptoCompare error:', e);
    return [];
  }
}

// ============ AGGREGATE NEWS ============
export async function aggregateAllNews(
  query: string,
  category: 'all' | 'gold' | 'crypto' | 'forex' | 'stocks' = 'all'
): Promise<EnhancedNewsItem[]> {
  const results: EnhancedNewsItem[] = [];
  
  const subreddits = category === 'gold' 
    ? ['Gold', 'Silverbugs', 'wallstreetsilver']
    : category === 'crypto'
    ? ['cryptocurrency', 'bitcoin', 'CryptoMarkets']
    : category === 'forex'
    ? ['Forex', 'ForexTrading']
    : ['cryptocurrency', 'stocks', 'wallstreetbets', 'Forex', 'Gold'];

  const fetchers = await Promise.allSettled([
    ...subreddits.map(sub => fetchRedditNews(sub, query)),
    fetchHackerNews(query),
    fetchCryptoCompareNews()
  ]);

  fetchers.forEach(r => {
    if (r.status === 'fulfilled') results.push(...r.value);
  });

  // Deduplicate
  const seen = new Set<string>();
  const unique = results.filter(n => {
    const key = n.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by impact score
  unique.sort((a, b) => b.impactScore - a.impactScore);

  return unique;
}

// ============ AI ANALYSIS ============
export async function analyzeNewsWithAI(
  news: EnhancedNewsItem[],
  apiKey: string,
  modelId: string = 'groq-llama'
): Promise<AIAnalysisResult[]> {
  const model = AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
  const headlines = news.slice(0, 15).map(n => `ID: ${n.id}\nTitle: ${n.title}`).join('\n\n');
  
  const prompt = AI_PROMPTS.tradingAnalysis.replace('{headlines}', headlines);
  
  try {
    let response;
    
    if (model.provider === 'groq') {
      response = await fetch(model.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: model.maxTokens,
          temperature: model.temperature
        })
      });
    } else if (model.provider === 'lovable') {
      // Use Lovable AI endpoint
      response = await fetch(model.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.model,
          messages: [
            { role: 'system', content: 'You are a professional financial analyst.' },
            { role: 'user', content: prompt }
          ]
        })
      });
    } else {
      throw new Error('Unsupported AI provider');
    }
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.analyses || [];
    }
    
    return [];
  } catch (e) {
    console.error('AI analysis error:', e);
    return [];
  }
}

export function applyAIAnalysis(
  news: EnhancedNewsItem[],
  analyses: AIAnalysisResult[]
): EnhancedNewsItem[] {
  const analysisMap = new Map(analyses.map(a => [a.id, a]));
  
  return news.map(item => {
    const analysis = analysisMap.get(item.id);
    if (!analysis) return item;
    
    const sourceCredibility = SOURCE_CREDIBILITY[item.sourceId] || 10;
    const impactBreakdown = calculateImpactScore(item, sourceCredibility, {
      aiConfidence: analysis.confidence
    });
    
    return {
      ...item,
      isAIAnalyzed: true,
      aiSentiment: analysis.sentiment,
      aiConfidence: analysis.confidence,
      aiImpact: analysis.impact,
      aiTimeHorizon: analysis.timeHorizon,
      aiSummary: analysis.summary,
      aiKeyPoints: analysis.keyPoints,
      aiTradingSignal: analysis.tradingSignal,
      relatedTickers: [...new Set([...item.relatedTickers, ...analysis.relatedTickers])],
      impactScore: impactBreakdown.total,
      impactCategory: getImpactCategory(impactBreakdown.total)
    };
  });
}
