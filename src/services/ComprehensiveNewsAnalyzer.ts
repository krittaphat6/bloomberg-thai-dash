/**
 * Comprehensive News Analyzer - รวมข่าวทุกข่าวมาวิเคราะห์รวมกันทีเดียว
 * ฉลาดกว่าเดิม - aggregate all news and analyze together
 */

import { supabase } from '@/integrations/supabase/client';

export interface AggregatedNewsAnalysis {
  timestamp: string;
  total_news: number;
  
  // Overall Market Sentiment
  overall_sentiment: 'bullish' | 'bearish' | 'neutral';
  overall_confidence: number;
  market_bias: string;
  
  // Per-Asset Analysis
  asset_analysis: AssetAnalysis[];
  
  // Key Themes
  key_themes: string[];
  
  // Risk Warnings
  global_risk_warnings: string[];
  
  // Market Regime
  market_regime: 'trending' | 'ranging' | 'volatile' | 'calm';
  
  // Trading Recommendations
  top_opportunities: TradingOpportunity[];
  
  // AI Summary
  thai_summary: string;
  english_summary: string;
}

export interface AssetAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  P_up_pct: number;
  P_down_pct: number;
  confidence: number;
  news_count: number;
  key_drivers: string[];
  decision: string;
}

export interface TradingOpportunity {
  symbol: string;
  direction: 'long' | 'short' | 'wait';
  strength: number;
  reasoning: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  category?: string;
  timestamp?: number;
}

export interface AIProviderConfig {
  provider: 'gemini' | 'ollama';
  model?: string;
  ollamaUrl?: string;
}

/**
 * Comprehensive News Analyzer Service
 */
export const ComprehensiveNewsAnalyzer = {
  /**
   * Analyze all news together with AI
   */
  async analyzeAllNews(
    news: NewsItem[],
    assets: string[],
    config: AIProviderConfig = { provider: 'gemini' }
  ): Promise<AggregatedNewsAnalysis | null> {
    if (news.length === 0) return null;

    try {
      // Group news by category
      const categorizedNews = this.categorizeNews(news);
      
      // Call the appropriate AI provider
      if (config.provider === 'gemini') {
        return await this.analyzeWithGemini(news, assets, categorizedNews);
      } else {
        return await this.analyzeWithOllama(news, assets, categorizedNews, config.ollamaUrl);
      }
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      return this.generateFallbackAnalysis(news, assets);
    }
  },

  /**
   * Categorize news by topic
   */
  categorizeNews(news: NewsItem[]): Record<string, NewsItem[]> {
    const categories: Record<string, NewsItem[]> = {
      forex: [],
      commodities: [],
      crypto: [],
      indices: [],
      macro: [],
      geopolitical: [],
      central_banks: [],
      other: []
    };

    const keywords = {
      forex: ['dollar', 'eur', 'gbp', 'jpy', 'usd', 'forex', 'currency', 'exchange rate'],
      commodities: ['gold', 'silver', 'oil', 'crude', 'xau', 'xag', 'commodity', 'metal'],
      crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'blockchain', 'defi'],
      indices: ['s&p', 'nasdaq', 'dow', 'dax', 'nikkei', 'stock market', 'equities'],
      macro: ['gdp', 'inflation', 'employment', 'cpi', 'pmi', 'economic', 'growth'],
      geopolitical: ['war', 'conflict', 'sanction', 'tariff', 'trade war', 'political'],
      central_banks: ['fed', 'ecb', 'boj', 'boe', 'rate', 'hawkish', 'dovish', 'fomc']
    };

    for (const item of news) {
      const titleLower = item.title.toLowerCase();
      let categorized = false;
      
      for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => titleLower.includes(word))) {
          categories[category].push(item);
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        categories.other.push(item);
      }
    }

    return categories;
  },

  /**
   * Analyze with Gemini AI (via Lovable AI gateway)
   */
  async analyzeWithGemini(
    news: NewsItem[],
    assets: string[],
    categorizedNews: Record<string, NewsItem[]>
  ): Promise<AggregatedNewsAnalysis | null> {
    const { data, error } = await supabase.functions.invoke('comprehensive-news-analyzer', {
      body: {
        news: news.slice(0, 50).map(n => n.title),
        assets,
        categories: Object.fromEntries(
          Object.entries(categorizedNews).map(([k, v]) => [k, v.slice(0, 10).map(n => n.title)])
        ),
        provider: 'gemini'
      }
    });

    if (error) throw error;
    return data?.analysis || null;
  },

  /**
   * Analyze with Ollama (local)
   */
  async analyzeWithOllama(
    news: NewsItem[],
    assets: string[],
    categorizedNews: Record<string, NewsItem[]>,
    ollamaUrl?: string
  ): Promise<AggregatedNewsAnalysis | null> {
    if (!ollamaUrl) {
      console.warn('Ollama URL not provided');
      return this.generateFallbackAnalysis(news, assets);
    }

    try {
      const prompt = this.buildAnalysisPrompt(news, assets, categorizedNews);
      
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt,
          stream: false
        })
      });

      if (!response.ok) throw new Error('Ollama request failed');
      
      const data = await response.json();
      return this.parseOllamaResponse(data.response, news, assets);
    } catch (error) {
      console.error('Ollama analysis error:', error);
      return this.generateFallbackAnalysis(news, assets);
    }
  },

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(
    news: NewsItem[],
    assets: string[],
    categorizedNews: Record<string, NewsItem[]>
  ): string {
    return `You are a professional financial analyst. Analyze the following news headlines and provide trading insights.

NEWS HEADLINES (${news.length} total):
${news.slice(0, 30).map((n, i) => `${i + 1}. ${n.title}`).join('\n')}

CATEGORIES BREAKDOWN:
- Forex: ${categorizedNews.forex.length} news
- Commodities: ${categorizedNews.commodities.length} news  
- Crypto: ${categorizedNews.crypto.length} news
- Indices: ${categorizedNews.indices.length} news
- Macro: ${categorizedNews.macro.length} news
- Central Banks: ${categorizedNews.central_banks.length} news
- Geopolitical: ${categorizedNews.geopolitical.length} news

ASSETS TO ANALYZE: ${assets.join(', ')}

Provide analysis in JSON format:
{
  "overall_sentiment": "bullish/bearish/neutral",
  "overall_confidence": 0-100,
  "market_bias": "description of overall market direction",
  "asset_analysis": [
    {
      "symbol": "XAUUSD",
      "sentiment": "bullish/bearish/neutral",
      "P_up_pct": 0-100,
      "P_down_pct": 0-100,
      "confidence": 0-100,
      "news_count": number,
      "key_drivers": ["driver1", "driver2"],
      "decision": "STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL"
    }
  ],
  "key_themes": ["theme1", "theme2"],
  "global_risk_warnings": ["warning1", "warning2"],
  "market_regime": "trending/ranging/volatile/calm",
  "top_opportunities": [
    {
      "symbol": "XAUUSD",
      "direction": "long/short/wait",
      "strength": 0-100,
      "reasoning": "why this is a good opportunity"
    }
  ],
  "thai_summary": "สรุปภาพรวมตลาดภาษาไทย",
  "english_summary": "Market overview summary in English"
}`;
  },

  /**
   * Parse Ollama response
   */
  parseOllamaResponse(
    response: string,
    news: NewsItem[],
    assets: string[]
  ): AggregatedNewsAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          timestamp: new Date().toISOString(),
          total_news: news.length,
          ...parsed
        };
      }
    } catch (e) {
      console.warn('Failed to parse Ollama response:', e);
    }
    
    return this.generateFallbackAnalysis(news, assets);
  },

  /**
   * Generate fallback analysis when AI fails
   */
  generateFallbackAnalysis(news: NewsItem[], assets: string[]): AggregatedNewsAnalysis {
    const bullishKeywords = ['rise', 'surge', 'rally', 'bullish', 'gain', 'up', 'high', 'buy'];
    const bearishKeywords = ['fall', 'drop', 'crash', 'bearish', 'loss', 'down', 'low', 'sell'];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    for (const item of news) {
      const titleLower = item.title.toLowerCase();
      if (bullishKeywords.some(k => titleLower.includes(k))) bullishCount++;
      if (bearishKeywords.some(k => titleLower.includes(k))) bearishCount++;
    }
    
    const sentiment = bullishCount > bearishCount ? 'bullish' : 
                     bearishCount > bullishCount ? 'bearish' : 'neutral';
    const confidence = Math.min(75, 50 + Math.abs(bullishCount - bearishCount) * 3);
    
    return {
      timestamp: new Date().toISOString(),
      total_news: news.length,
      overall_sentiment: sentiment,
      overall_confidence: confidence,
      market_bias: `Market shows ${sentiment} bias based on ${news.length} news items`,
      asset_analysis: assets.map(symbol => ({
        symbol,
        sentiment,
        P_up_pct: sentiment === 'bullish' ? 55 + Math.random() * 15 : 35 + Math.random() * 15,
        P_down_pct: sentiment === 'bearish' ? 55 + Math.random() * 15 : 35 + Math.random() * 15,
        confidence,
        news_count: Math.floor(news.length / assets.length),
        key_drivers: ['Market sentiment', 'News flow'],
        decision: sentiment === 'bullish' ? 'BUY' : sentiment === 'bearish' ? 'SELL' : 'HOLD'
      })),
      key_themes: ['Market uncertainty', 'Economic data', 'Central bank policy'],
      global_risk_warnings: ['Markets remain volatile', 'Use proper risk management'],
      market_regime: 'ranging',
      top_opportunities: assets.slice(0, 3).map(symbol => ({
        symbol,
        direction: sentiment === 'bullish' ? 'long' : sentiment === 'bearish' ? 'short' : 'wait',
        strength: confidence,
        reasoning: `Based on current ${sentiment} sentiment`
      })),
      thai_summary: `ตลาดแสดง ${sentiment === 'bullish' ? 'แนวโน้มขาขึ้น' : sentiment === 'bearish' ? 'แนวโน้มขาลง' : 'แนวโน้มกลางๆ'} จากข่าว ${news.length} ข่าว`,
      english_summary: `Market shows ${sentiment} bias based on ${news.length} news items analyzed.`
    };
  }
};

export default ComprehensiveNewsAnalyzer;
