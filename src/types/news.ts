// ============ NEWS SOURCE CONFIG ============
export interface NewsSourceConfig {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  type: 'api' | 'rss' | 'websocket';
  endpoint: string;
  apiKeyRequired: boolean;
  apiKeyEnvVar?: string;
  rateLimit: number;
  priority: number;
  categories: string[];
  enabled: boolean;
  parseFunction: string;
}

// ============ NEWS ITEM ============
export interface EnhancedNewsItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  url: string;
  imageUrl?: string;
  
  // Source info
  source: string;
  sourceId: string;
  author?: string;
  
  // Timestamps
  timestamp: number;
  publishedAt: string;
  fetchedAt: number;
  
  // Engagement
  upvotes?: number;
  comments?: number;
  shares?: number;
  
  // Categories & Tags
  category: string;
  subcategory?: string;
  tags: string[];
  relatedTickers: string[];
  
  // Algorithm Analysis (fast, local)
  algoSentiment: 'bullish' | 'bearish' | 'neutral';
  algoConfidence: number;
  algoRelevance: number;
  algoScore: number;
  
  // AI Analysis (LLM, optional)
  isAIAnalyzed: boolean;
  aiSentiment?: 'bullish' | 'bearish' | 'neutral';
  aiConfidence?: number;
  aiImpact?: 'critical' | 'high' | 'medium' | 'low';
  aiTimeHorizon?: 'immediate' | 'short' | 'medium' | 'long';
  aiSummary?: string;
  aiKeyPoints?: string[];
  aiTradingSignal?: TradingSignal;
  
  // Final Combined Score
  impactScore: number;
  impactCategory: 'critical' | 'high' | 'medium' | 'low';
  
  // Flags
  isBreaking: boolean;
  isRead: boolean;
  isBookmarked: boolean;
  isHidden: boolean;
}

// ============ TRADING SIGNAL ============
export interface TradingSignal {
  action: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'watch';
  strength: number;
  suggestedAssets: string[];
  direction: 'long' | 'short' | 'neutral';
  timeframe: string;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// ============ AI MODEL CONFIG ============
export interface AIModelConfig {
  id: string;
  provider: 'groq' | 'openai' | 'anthropic' | 'ollama' | 'gemini' | 'lovable';
  name: string;
  model: string;
  endpoint: string;
  maxTokens: number;
  temperature: number;
  costPer1kTokens: number;
  speed: 'fast' | 'medium' | 'slow';
  accuracy: 'high' | 'medium' | 'low';
  supportsStreaming: boolean;
}

// ============ IMPACT SCORE BREAKDOWN ============
export interface ImpactScoreBreakdown {
  total: number;
  sourceCredibility: number;
  contentRelevance: number;
  timingUrgency: number;
  marketContext: number;
  aiConfidence: number;
}

// ============ SENTIMENT STATS ============
export interface SentimentStats {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  bullishPercent: number;
  bearishPercent: number;
  aiAnalyzedCount: number;
  avgImpactScore: number;
  criticalCount: number;
  highCount: number;
}

// ============ FILTER & SORT OPTIONS ============
export interface NewsFilters {
  sources: string[];
  categories: string[];
  sentiments: string[];
  impactLevels: string[];
  timeRange: 'all' | '1h' | '4h' | '24h' | '7d';
  tickers: string[];
  searchQuery: string;
  showAIOnly: boolean;
  showUnreadOnly: boolean;
}

export type NewsSortOption = 'time' | 'impact' | 'sentiment' | 'relevance' | 'engagement';

// ============ AI ANALYSIS RESULT ============
export interface AIAnalysisResult {
  id: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  timeHorizon: 'immediate' | 'short' | 'medium' | 'long';
  tradingSignal?: TradingSignal;
  relatedTickers: string[];
  summary: string;
  keyPoints: string[];
}
