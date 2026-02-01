// src/services/sentimentFeatureService.ts
// Advanced Sentiment Feature Engineering
// Based on: https://github.com/yukepenn/macro-news-sentiment-trading
// Research paper: https://arxiv.org/html/2505.16136v1

export interface SentimentFeatures {
  // Basic sentiment
  sentiment_mean: number;
  sentiment_std: number;
  sentiment_count: number;
  
  // Momentum features
  sentiment_momentum: number;      // Change from previous period
  sentiment_ma5: number;           // 5-period moving average
  sentiment_ema: number;           // Exponential moving average
  
  // Goldstein-style impact score
  goldstein_mean: number;          // Average impact of events
  goldstein_max: number;           // Max impact event
  
  // Spike detection
  article_spike: boolean;          // Abnormal article count
  spike_magnitude: number;         // How much above normal (Z-score)
  
  // Dispersion
  bullish_ratio: number;           // % bullish news
  bearish_ratio: number;           // % bearish news
  neutral_ratio: number;           // % neutral news
  
  // Time-based
  recency_weighted_sentiment: number;  // Recent news weighted more
  
  // FinBERT specific
  avg_confidence: number;
  high_confidence_count: number;   // Items with >80% confidence
}

export interface HistoricalSentiment {
  date: string;
  sentiment_mean: number;
  article_count: number;
}

export interface BacktestStats {
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  total_signals: number;
  cagr?: number;
}

// ============ GOLDSTEIN IMPACT SCORING ============
// Based on GDELT Goldstein scale adapted for financial news

const HIGH_IMPACT_KEYWORDS = [
  // Extreme events
  'war', 'crash', 'crisis', 'collapse', 'bankruptcy', 'default', 'recession',
  'shutdown', 'emergency', 'disaster', 'panic', 'catastrophe',
  // Strong positive
  'surge', 'soar', 'rocket', 'skyrocket', 'explode', 'moon', 'breakthrough',
  // Strong negative
  'plunge', 'plummet', 'tumble', 'nosedive', 'freefall', 'tank',
  // Central bank actions
  'rate hike', 'rate cut', 'pivot', 'hawkish', 'dovish', 'tightening', 'easing',
  // Geopolitical
  'sanctions', 'tariff', 'trade war', 'invasion', 'coup', 'election'
];

const MEDIUM_IMPACT_KEYWORDS = [
  // Directional
  'rise', 'fall', 'gain', 'loss', 'up', 'down', 'increase', 'decrease',
  'growth', 'decline', 'rally', 'drop', 'climb', 'sink',
  // Market terms
  'breakout', 'breakdown', 'support', 'resistance', 'volatile', 'momentum',
  // Economic
  'inflation', 'gdp', 'employment', 'jobless', 'cpi', 'ppi', 'pce',
  // Central bank
  'fed', 'fomc', 'ecb', 'boj', 'powell', 'lagarde'
];

const LOW_IMPACT_KEYWORDS = [
  'stable', 'steady', 'unchanged', 'flat', 'hold', 'maintain', 'neutral',
  'mixed', 'cautious', 'moderate'
];

export function calculateGoldsteinScore(title: string): number {
  const lowerTitle = title.toLowerCase();
  let score = 0;
  
  // High impact keywords: +3 each
  HIGH_IMPACT_KEYWORDS.forEach(kw => {
    if (lowerTitle.includes(kw)) score += 3;
  });
  
  // Medium impact keywords: +1.5 each
  MEDIUM_IMPACT_KEYWORDS.forEach(kw => {
    if (lowerTitle.includes(kw)) score += 1.5;
  });
  
  // Low impact keywords: +0.5 each
  LOW_IMPACT_KEYWORDS.forEach(kw => {
    if (lowerTitle.includes(kw)) score += 0.5;
  });

  // Normalize to 0-10 scale
  return Math.min(10, score);
}

// ============ SPIKE DETECTION ============
// Detects abnormal news volume using Z-score

export function detectSpike(
  currentCount: number,
  historicalCounts: number[],
  threshold: number = 2
): { isSpike: boolean; magnitude: number } {
  if (historicalCounts.length === 0) {
    return { isSpike: false, magnitude: 0 };
  }

  const mean = historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length;
  const variance = historicalCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalCounts.length;
  const stdDev = Math.sqrt(variance);

  const zScore = stdDev > 0 ? (currentCount - mean) / stdDev : 0;
  
  return {
    isSpike: zScore > threshold,
    magnitude: parseFloat(zScore.toFixed(2))
  };
}

// ============ MOVING AVERAGES ============

export function calculateSMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const multiplier = 2 / (period + 1);
  let ema = values[0];

  for (let i = 1; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

// ============ RECENCY WEIGHTED SENTIMENT ============
// Recent news matters more - exponential decay with 6-hour half-life

export function calculateRecencyWeightedSentiment(
  news: Array<{ sentiment: number; timestamp: number }>
): number {
  if (news.length === 0) return 0;

  const now = Date.now();
  const halfLife = 6 * 60 * 60 * 1000; // 6 hours in ms

  let weightedSum = 0;
  let totalWeight = 0;

  news.forEach(item => {
    const age = now - item.timestamp;
    const weight = Math.exp(-age / halfLife);
    weightedSum += item.sentiment * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ============ STANDARD DEVIATION ============

function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// ============ MAIN FEATURE COMPUTATION ============

export interface NewsItemForFeatures {
  id: string;
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'bullish' | 'bearish';
  confidence: number;
  timestamp: number;
}

export function computeSentimentFeatures(
  news: NewsItemForFeatures[],
  historicalData?: HistoricalSentiment[]
): SentimentFeatures {
  
  // Convert sentiment to numeric (-1, 0, +1)
  const sentimentToNumber = (s: string): number => {
    if (s === 'positive' || s === 'bullish') return 1;
    if (s === 'negative' || s === 'bearish') return -1;
    return 0;
  };

  const sentimentValues = news.map(n => sentimentToNumber(n.sentiment));
  const confidenceValues = news.map(n => n.confidence);
  const goldsteinScores = news.map(n => calculateGoldsteinScore(n.title));

  // ========== Basic Stats ==========
  const sentiment_mean = sentimentValues.length > 0
    ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
    : 0;

  const sentiment_std = calculateStdDev(sentimentValues, sentiment_mean);
  
  // ========== Ratios ==========
  const bullishCount = sentimentValues.filter(s => s > 0).length;
  const bearishCount = sentimentValues.filter(s => s < 0).length;
  const neutralCount = sentimentValues.filter(s => s === 0).length;
  const total = sentimentValues.length || 1;

  // ========== Goldstein Scores ==========
  const goldstein_mean = goldsteinScores.length > 0
    ? goldsteinScores.reduce((a, b) => a + b, 0) / goldsteinScores.length
    : 0;
  const goldstein_max = goldsteinScores.length > 0
    ? Math.max(...goldsteinScores)
    : 0;

  // ========== Spike Detection ==========
  const historicalCounts = historicalData?.map(h => h.article_count) || [20, 25, 30, 22, 28]; // default baseline
  const spikeResult = detectSpike(news.length, historicalCounts);

  // ========== Momentum ==========
  const historicalSentiments = historicalData?.map(h => h.sentiment_mean) || [];
  const sentiment_momentum = historicalSentiments.length > 0
    ? sentiment_mean - historicalSentiments[historicalSentiments.length - 1]
    : 0;

  // ========== Moving Averages ==========
  const allSentiments = [...historicalSentiments, sentiment_mean];
  const sentiment_ma5 = calculateSMA(allSentiments, 5);
  const sentiment_ema = calculateEMA(allSentiments, 5);

  // ========== Recency Weighted ==========
  const recency_weighted_sentiment = calculateRecencyWeightedSentiment(
    news.map(n => ({
      sentiment: sentimentToNumber(n.sentiment),
      timestamp: n.timestamp
    }))
  );

  // ========== Confidence Stats ==========
  const avg_confidence = confidenceValues.length > 0
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    : 50;
  const high_confidence_count = confidenceValues.filter(c => c >= 80).length;

  return {
    sentiment_mean: parseFloat(sentiment_mean.toFixed(4)),
    sentiment_std: parseFloat(sentiment_std.toFixed(4)),
    sentiment_count: news.length,
    sentiment_momentum: parseFloat(sentiment_momentum.toFixed(4)),
    sentiment_ma5: parseFloat(sentiment_ma5.toFixed(4)),
    sentiment_ema: parseFloat(sentiment_ema.toFixed(4)),
    goldstein_mean: parseFloat(goldstein_mean.toFixed(2)),
    goldstein_max: parseFloat(goldstein_max.toFixed(2)),
    article_spike: spikeResult.isSpike,
    spike_magnitude: spikeResult.magnitude,
    bullish_ratio: parseFloat((bullishCount / total).toFixed(4)),
    bearish_ratio: parseFloat((bearishCount / total).toFixed(4)),
    neutral_ratio: parseFloat((neutralCount / total).toFixed(4)),
    recency_weighted_sentiment: parseFloat(recency_weighted_sentiment.toFixed(4)),
    avg_confidence: Math.round(avg_confidence),
    high_confidence_count,
  };
}

// ============ BACKTEST SIMULATION ============
// Simple backtest metrics based on sentiment signals

export function calculateBacktestStats(
  signals: Array<{ sentiment: number; timestamp: number; priceChange?: number }>
): BacktestStats {
  if (signals.length === 0) {
    return {
      sharpe_ratio: 0,
      max_drawdown: 0,
      win_rate: 0,
      total_signals: 0
    };
  }

  const returns: number[] = [];
  let wins = 0;
  let peak = 1;
  let maxDrawdown = 0;
  let equity = 1;

  signals.forEach(signal => {
    // Simulate return based on sentiment direction
    const expectedReturn = signal.sentiment * (signal.priceChange || Math.random() * 0.02 - 0.01);
    returns.push(expectedReturn);
    
    if (expectedReturn > 0) wins++;
    
    equity *= (1 + expectedReturn);
    if (equity > peak) peak = equity;
    const drawdown = (peak - equity) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  // Calculate Sharpe Ratio (assuming risk-free rate = 0)
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const returnStd = calculateStdDev(returns, meanReturn);
  const sharpeRatio = returnStd > 0 ? (meanReturn / returnStd) * Math.sqrt(252) : 0; // Annualized

  return {
    sharpe_ratio: parseFloat(sharpeRatio.toFixed(2)),
    max_drawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
    win_rate: parseFloat(((wins / signals.length) * 100).toFixed(1)),
    total_signals: signals.length
  };
}

// ============ SIGNAL GENERATION ============
// Generate trading signals based on features

export type TradingSignal = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export function generateSignal(features: SentimentFeatures): {
  signal: TradingSignal;
  strength: number;
  reasoning: string[];
} {
  let score = 0;
  const reasoning: string[] = [];

  // Sentiment mean contribution (-50 to +50 points)
  score += features.sentiment_mean * 50;
  if (Math.abs(features.sentiment_mean) > 0.3) {
    reasoning.push(`Strong sentiment ${features.sentiment_mean > 0 ? 'bullish' : 'bearish'}: ${(features.sentiment_mean * 100).toFixed(0)}%`);
  }

  // Momentum contribution (-20 to +20 points)
  score += features.sentiment_momentum * 20;
  if (Math.abs(features.sentiment_momentum) > 0.1) {
    reasoning.push(`Momentum ${features.sentiment_momentum > 0 ? '↑' : '↓'}: ${(features.sentiment_momentum * 100).toFixed(1)}%`);
  }

  // Spike detection (add urgency)
  if (features.article_spike) {
    score *= 1.3; // Amplify signal during high volume
    reasoning.push(`🚨 News spike detected (+${features.spike_magnitude.toFixed(1)}σ)`);
  }

  // Goldstein impact (high impact = stronger signal)
  if (features.goldstein_mean > 5) {
    score *= 1.2;
    reasoning.push(`High impact news: ${features.goldstein_mean.toFixed(1)}/10`);
  }

  // Confidence adjustment
  if (features.avg_confidence > 75) {
    score *= 1.1;
    reasoning.push(`High confidence: ${features.avg_confidence}%`);
  } else if (features.avg_confidence < 50) {
    score *= 0.8;
    reasoning.push(`Low confidence: ${features.avg_confidence}%`);
  }

  // Normalize to -100 to +100
  score = Math.max(-100, Math.min(100, score));

  // Determine signal
  let signal: TradingSignal;
  if (score > 60) signal = 'STRONG_BUY';
  else if (score > 25) signal = 'BUY';
  else if (score < -60) signal = 'STRONG_SELL';
  else if (score < -25) signal = 'SELL';
  else signal = 'HOLD';

  return {
    signal,
    strength: Math.abs(Math.round(score)),
    reasoning
  };
}

export default {
  calculateGoldsteinScore,
  detectSpike,
  calculateEMA,
  calculateSMA,
  calculateRecencyWeightedSentiment,
  computeSentimentFeatures,
  calculateBacktestStats,
  generateSignal
};
