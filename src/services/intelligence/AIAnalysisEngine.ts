import { PredictionData } from '@/stores/IntelligenceStore';

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  upperBollinger: number;
  lowerBollinger: number;
  middleBollinger: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  changePercent: number;
  historicalPrices?: number[];
}

class AIAnalysisEngine {
  private static instance: AIAnalysisEngine;

  private constructor() {}

  static getInstance(): AIAnalysisEngine {
    if (!AIAnalysisEngine.instance) {
      AIAnalysisEngine.instance = new AIAnalysisEngine();
    }
    return AIAnalysisEngine.instance;
  }

  analyzePriceData(priceData: PriceData): PredictionData {
    const indicators = this.calculateTechnicalIndicators(priceData);
    const direction = this.predictDirection(priceData, indicators);
    const confidence = this.calculateConfidence(priceData, indicators);
    const targetPrice = this.calculateTargetPrice(priceData, direction, indicators);
    const timeframe = this.estimateTimeframe(priceData, indicators);
    const reasoning = this.generateReasoning(priceData, indicators, direction);

    return {
      symbol: priceData.symbol,
      direction,
      confidence,
      targetPrice,
      timeframe,
      reasoning,
      timestamp: new Date()
    };
  }

  calculateTechnicalIndicators(priceData: PriceData): TechnicalIndicators {
    const prices = priceData.historicalPrices || [priceData.price];
    const currentPrice = priceData.price;

    // Simple Moving Averages
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);

    // Exponential Moving Averages
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    // RSI (Relative Strength Index)
    const rsi = this.calculateRSI(prices, 14);

    // MACD
    const macd = ema12 - ema26;
    const macdSignal = this.calculateEMA([macd], 9);
    const macdHistogram = macd - macdSignal;

    // Bollinger Bands
    const middleBollinger = sma20;
    const stdDev = this.calculateStdDev(prices, 20);
    const upperBollinger = middleBollinger + (2 * stdDev);
    const lowerBollinger = middleBollinger - (2 * stdDev);

    return {
      sma20,
      sma50,
      ema12,
      ema26,
      rsi,
      macd,
      macdSignal,
      macdHistogram,
      upperBollinger,
      lowerBollinger,
      middleBollinger
    };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, p) => sum + p, 0) / prices.length;
    }
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((sum, p) => sum + p, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length < period) return this.calculateSMA(prices, prices.length);

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  private calculateStdDev(prices: number[], period: number): number {
    const relevantPrices = prices.slice(-period);
    const mean = relevantPrices.reduce((sum, p) => sum + p, 0) / relevantPrices.length;
    const squaredDiffs = relevantPrices.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / relevantPrices.length;
    return Math.sqrt(variance);
  }

  private predictDirection(
    priceData: PriceData,
    indicators: TechnicalIndicators
  ): 'up' | 'down' | 'neutral' {
    let score = 0;

    // Price vs Moving Averages
    if (priceData.price > indicators.sma20) score += 1;
    if (priceData.price > indicators.sma50) score += 1;
    if (indicators.sma20 > indicators.sma50) score += 1;

    // RSI
    if (indicators.rsi < 30) score += 2; // Oversold - potential up
    if (indicators.rsi > 70) score -= 2; // Overbought - potential down

    // MACD
    if (indicators.macd > indicators.macdSignal) score += 1;
    if (indicators.macdHistogram > 0) score += 1;

    // Bollinger Bands
    if (priceData.price < indicators.lowerBollinger) score += 1; // Near lower band
    if (priceData.price > indicators.upperBollinger) score -= 1; // Near upper band

    // Current momentum
    if (priceData.changePercent > 0) score += 1;

    if (score > 2) return 'up';
    if (score < -2) return 'down';
    return 'neutral';
  }

  private calculateConfidence(
    priceData: PriceData,
    indicators: TechnicalIndicators
  ): number {
    let confidence = 0.5;

    // Strong trend indicators increase confidence
    const priceMASeparation = Math.abs(priceData.price - indicators.sma20) / priceData.price;
    confidence += Math.min(priceMASeparation * 2, 0.2);

    // RSI extremes increase confidence
    if (indicators.rsi < 25 || indicators.rsi > 75) {
      confidence += 0.15;
    }

    // MACD histogram strength
    const macdStrength = Math.abs(indicators.macdHistogram) / priceData.price;
    confidence += Math.min(macdStrength * 10, 0.15);

    // Volume factor (higher volume = higher confidence)
    if (priceData.volume > 0) {
      confidence += 0.05;
    }

    return Math.min(Math.max(confidence, 0.3), 0.95);
  }

  private calculateTargetPrice(
    priceData: PriceData,
    direction: 'up' | 'down' | 'neutral',
    indicators: TechnicalIndicators
  ): number {
    if (direction === 'neutral') {
      return priceData.price;
    }

    // Use Bollinger Bands and moving averages for target
    let target = priceData.price;

    if (direction === 'up') {
      // Target near upper Bollinger or above SMA50
      target = Math.max(indicators.upperBollinger, indicators.sma50 * 1.05);
    } else {
      // Target near lower Bollinger or below SMA50
      target = Math.min(indicators.lowerBollinger, indicators.sma50 * 0.95);
    }

    return target;
  }

  private estimateTimeframe(
    priceData: PriceData,
    indicators: TechnicalIndicators
  ): string {
    const volatility = Math.abs(priceData.changePercent);

    if (volatility > 5) return '1-3 days';
    if (volatility > 2) return '3-7 days';
    if (indicators.rsi < 30 || indicators.rsi > 70) return '1-2 weeks';
    return '2-4 weeks';
  }

  private generateReasoning(
    priceData: PriceData,
    indicators: TechnicalIndicators,
    direction: 'up' | 'down' | 'neutral'
  ): string {
    const reasons: string[] = [];

    // Price trend
    if (priceData.price > indicators.sma20 && priceData.price > indicators.sma50) {
      reasons.push('Strong upward trend (above SMA20 and SMA50)');
    } else if (priceData.price < indicators.sma20 && priceData.price < indicators.sma50) {
      reasons.push('Weak trend (below SMA20 and SMA50)');
    }

    // RSI
    if (indicators.rsi < 30) {
      reasons.push(`Oversold conditions (RSI: ${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 70) {
      reasons.push(`Overbought conditions (RSI: ${indicators.rsi.toFixed(1)})`);
    }

    // MACD
    if (indicators.macdHistogram > 0) {
      reasons.push('Positive MACD momentum');
    } else {
      reasons.push('Negative MACD momentum');
    }

    // Bollinger Bands
    if (priceData.price < indicators.lowerBollinger) {
      reasons.push('Price near lower Bollinger Band (potential bounce)');
    } else if (priceData.price > indicators.upperBollinger) {
      reasons.push('Price near upper Bollinger Band (potential pullback)');
    }

    // Volume
    if (Math.abs(priceData.changePercent) > 3) {
      reasons.push(`Significant price movement (${priceData.changePercent.toFixed(2)}%)`);
    }

    return reasons.join('. ');
  }

  analyzeVolume(currentVolume: number, avgVolume: number): {
    isAnomalous: boolean;
    severity: 'low' | 'medium' | 'high';
    ratio: number;
  } {
    const ratio = currentVolume / avgVolume;
    
    return {
      isAnomalous: ratio > 2,
      severity: ratio > 3 ? 'high' : ratio > 2 ? 'medium' : 'low',
      ratio
    };
  }

  detectSupportResistance(prices: number[]): {
    support: number[];
    resistance: number[];
  } {
    if (prices.length < 20) {
      return { support: [], resistance: [] };
    }

    const support: number[] = [];
    const resistance: number[] = [];

    // Simple peak and trough detection
    for (let i = 2; i < prices.length - 2; i++) {
      const price = prices[i];
      const prev2 = prices[i - 2];
      const prev1 = prices[i - 1];
      const next1 = prices[i + 1];
      const next2 = prices[i + 2];

      // Local minimum (support)
      if (price < prev1 && price < prev2 && price < next1 && price < next2) {
        support.push(price);
      }

      // Local maximum (resistance)
      if (price > prev1 && price > prev2 && price > next1 && price > next2) {
        resistance.push(price);
      }
    }

    return { support, resistance };
  }
}

export const aiAnalysisEngine = AIAnalysisEngine.getInstance();
