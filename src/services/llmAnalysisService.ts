// LLM Analysis Service - Hybrid Algorithm + Groq API Integration

export interface LLMAnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  summary: string;
  keyPoints: string[];
}

export interface NewsForAnalysis {
  id: string;
  title: string;
}

export interface HybridAnalyzedNews {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: number;
  // Algorithm results
  algoSentiment: 'bullish' | 'bearish' | 'neutral';
  algoRelevance: number;
  algoScore: number;
  // LLM results (optional - only for top items)
  llmSentiment?: 'bullish' | 'bearish' | 'neutral';
  llmConfidence?: number;
  llmImpact?: 'high' | 'medium' | 'low';
  llmSummary?: string;
  llmKeyPoints?: string[];
  // Combined
  finalScore: number;
  isLLMAnalyzed: boolean;
  // Original fields
  author?: string;
  category?: string;
  comments?: number;
  upvotes?: number;
  relatedTickers?: string[];
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Get API key from localStorage (user can configure it)
const getGroqApiKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('groq_api_key');
  }
  return null;
};

export const setGroqApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('groq_api_key', key);
  }
};

export const hasGroqApiKey = (): boolean => {
  return !!getGroqApiKey();
};

export const clearGroqApiKey = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('groq_api_key');
  }
};

// Batch analyze multiple news items in one API call
export const analyzeNewsWithLLM = async (
  newsItems: NewsForAnalysis[]
): Promise<Map<string, LLMAnalysisResult>> => {
  const results = new Map<string, LLMAnalysisResult>();
  const apiKey = getGroqApiKey();

  if (!apiKey || newsItems.length === 0) {
    return results;
  }

  // Create prompt for batch analysis
  const prompt = `
You are a financial news analyst specializing in gold, forex, and crypto markets. Analyze the following news headlines for trading relevance.

For EACH headline, provide:
1. sentiment: "bullish", "bearish", or "neutral" (market direction implication)
2. confidence: 0.0-1.0 (how confident in the sentiment)
3. impact: "high", "medium", or "low" (market impact potential)
4. summary: Brief Thai summary (1 sentence, max 50 chars)
5. keyPoints: 1-2 key trading insights in Thai (each max 30 chars)

Headlines to analyze:
${newsItems.map((n, i) => `[${i + 1}] ID:${n.id} - "${n.title}"`).join('\n')}

IMPORTANT: Respond ONLY with valid JSON, no markdown formatting:
{
  "analyses": [
    {
      "id": "news-id-here",
      "sentiment": "bullish",
      "confidence": 0.85,
      "impact": "high",
      "summary": "สรุปข่าวเป็นภาษาไทย",
      "keyPoints": ["จุดสำคัญ 1", "จุดสำคัญ 2"]
    }
  ]
}
`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a professional financial analyst. Always respond in valid JSON format only. No markdown, no code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status}`, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    // Clean content (remove markdown code blocks if present)
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    // Parse JSON response
    const parsed = JSON.parse(cleanContent);

    for (const analysis of parsed.analyses || []) {
      results.set(analysis.id, {
        sentiment: analysis.sentiment || 'neutral',
        confidence: analysis.confidence || 0.5,
        impact: analysis.impact || 'medium',
        summary: analysis.summary || '',
        keyPoints: analysis.keyPoints || []
      });
    }

  } catch (error) {
    console.error('LLM Analysis error:', error);
    // Return empty results, caller will use algorithm results only
  }

  return results;
};

// Fast algorithm-based analysis for all news
export const algorithmAnalyze = (
  title: string,
  query: string = ''
): { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number; relevance: number } => {
  const lower = title.toLowerCase();
  let score = 0;
  let relevance = 0;

  // Sentiment scoring
  const bullishStrong = ['moon', 'rocket', 'surge', 'breakout', 'rally', 'soar', 'bullish', 'buy', 'long', '🚀', '📈'];
  const bullishMedium = ['up', 'rise', 'gain', 'growth', 'positive', 'support', 'higher', 'strong'];
  const bearishStrong = ['crash', 'collapse', 'plunge', 'dump', 'bearish', 'sell', 'short', '📉', '🔴'];
  const bearishMedium = ['down', 'fall', 'drop', 'decline', 'weak', 'lower', 'concern', 'risk'];

  bullishStrong.forEach(w => { if (lower.includes(w)) score += 15; });
  bullishMedium.forEach(w => { if (lower.includes(w)) score += 5; });
  bearishStrong.forEach(w => { if (lower.includes(w)) score -= 15; });
  bearishMedium.forEach(w => { if (lower.includes(w)) score -= 5; });

  score = Math.max(-100, Math.min(100, score));
  const sentiment: 'bullish' | 'bearish' | 'neutral' = 
    score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral';

  // Relevance scoring
  if (query) {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    queryWords.forEach(w => { if (lower.includes(w)) relevance += 20; });
  }

  if (lower.includes('breaking') || lower.includes('just in')) relevance += 25;
  if (lower.includes('update') || lower.includes('alert')) relevance += 15;
  if (lower.includes('gold') || lower.includes('xau')) relevance += 20;
  if (lower.includes('bitcoin') || lower.includes('btc') || lower.includes('crypto')) relevance += 15;

  relevance = Math.min(100, relevance);

  return { sentiment, score, relevance };
};

// Main hybrid analysis function
export const hybridAnalyzeNews = async <T extends { id: string; title: string }>(
  rawNews: T[],
  searchQuery: string = '',
  enableLLM: boolean = true
): Promise<(T & Partial<HybridAnalyzedNews>)[]> => {
  if (rawNews.length === 0) return [];

  // Step 1: Algorithm Analysis (all items)
  const algoAnalyzed = rawNews.map(news => {
    const { sentiment, score, relevance } = algorithmAnalyze(news.title, searchQuery);
    return {
      ...news,
      algoSentiment: sentiment,
      algoScore: score,
      algoRelevance: relevance,
      finalScore: relevance,
      isLLMAnalyzed: false
    };
  });

  // Sort by algorithm relevance
  algoAnalyzed.sort((a, b) => b.algoRelevance - a.algoRelevance);

  // Step 2: LLM Analysis (only top 15-20 items if enabled and API key exists)
  if (enableLLM && hasGroqApiKey()) {
    const topNews = algoAnalyzed.slice(0, 15);
    const llmInput = topNews.map(n => ({ id: n.id, title: n.title }));

    try {
      const llmResults = await analyzeNewsWithLLM(llmInput);

      // Merge LLM results
      for (const news of algoAnalyzed) {
        const llmResult = llmResults.get(news.id);
        if (llmResult) {
          (news as any).llmSentiment = llmResult.sentiment;
          (news as any).llmConfidence = llmResult.confidence;
          (news as any).llmImpact = llmResult.impact;
          (news as any).llmSummary = llmResult.summary;
          (news as any).llmKeyPoints = llmResult.keyPoints;
          (news as any).isLLMAnalyzed = true;
        }
      }
    } catch (error) {
      console.error('LLM analysis failed, using algorithm only:', error);
    }
  }

  // Step 3: Calculate Final Score
  const finalResults = algoAnalyzed.map(news => {
    let score = news.algoRelevance;

    if ((news as any).isLLMAnalyzed && (news as any).llmConfidence) {
      // Weight: 40% algorithm, 60% LLM
      score = (news.algoRelevance * 0.4) + ((news as any).llmConfidence * 100 * 0.6);

      // Boost for high impact
      if ((news as any).llmImpact === 'high') score *= 1.3;
      else if ((news as any).llmImpact === 'medium') score *= 1.1;
    }

    return { ...news, finalScore: Math.round(score) };
  });

  // Final sort by combined score
  finalResults.sort((a, b) => b.finalScore - a.finalScore);

  return finalResults;
};

export default {
  analyzeNewsWithLLM,
  algorithmAnalyze,
  hybridAnalyzeNews,
  setGroqApiKey,
  hasGroqApiKey,
  clearGroqApiKey
};
