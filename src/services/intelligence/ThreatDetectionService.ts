import { ThreatData } from '@/stores/IntelligenceStore';

export interface MarketConditions {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume?: number;
  volatility?: number;
}

class ThreatDetectionService {
  private static instance: ThreatDetectionService;
  private threatHistory: Map<string, ThreatData[]> = new Map();

  private constructor() {}

  static getInstance(): ThreatDetectionService {
    if (!ThreatDetectionService.instance) {
      ThreatDetectionService.instance = new ThreatDetectionService();
    }
    return ThreatDetectionService.instance;
  }

  detectThreats(conditions: MarketConditions[]): ThreatData[] {
    const threats: ThreatData[] = [];

    conditions.forEach(condition => {
      // Price drop threat
      const priceThreat = this.detectPriceDropThreat(condition);
      if (priceThreat) threats.push(priceThreat);

      // Volume spike threat
      const volumeThreat = this.detectVolumeThreat(condition);
      if (volumeThreat) threats.push(volumeThreat);

      // Volatility threat
      const volatilityThreat = this.detectVolatilityThreat(condition);
      if (volatilityThreat) threats.push(volatilityThreat);
    });

    // Market-wide correlation threat
    const correlationThreat = this.detectMarketWideThreat(conditions);
    if (correlationThreat) threats.push(correlationThreat);

    // Store in history
    threats.forEach(threat => {
      const history = this.threatHistory.get(threat.type) || [];
      history.push(threat);
      this.threatHistory.set(threat.type, history.slice(-100)); // Keep last 100
    });

    return threats;
  }

  private detectPriceDropThreat(condition: MarketConditions): ThreatData | null {
    const { symbol, changePercent } = condition;

    if (changePercent <= -5) {
      const severity = this.calculatePriceDropSeverity(changePercent);
      const probability = this.calculateProbability(Math.abs(changePercent), 5, 15);
      const impact = this.calculateImpact(Math.abs(changePercent), 5, 20);

      return {
        id: `threat_price_${symbol}_${Date.now()}`,
        type: 'market',
        severity,
        title: `Significant Price Drop: ${symbol}`,
        description: `${symbol} has dropped ${Math.abs(changePercent).toFixed(2)}% in the current session. This represents a significant market movement that may indicate selling pressure or negative market sentiment.`,
        symbols: [symbol],
        probability,
        impact,
        timestamp: new Date()
      };
    }

    return null;
  }

  private detectVolumeThreat(condition: MarketConditions): ThreatData | null {
    const { symbol, volume, avgVolume } = condition;

    if (!avgVolume || avgVolume === 0) return null;

    const volumeRatio = volume / avgVolume;

    if (volumeRatio > 2) {
      const severity = volumeRatio > 3 ? 'high' : 'medium';
      const probability = this.calculateProbability(volumeRatio, 2, 5);
      const impact = this.calculateImpact(volumeRatio, 2, 4);

      return {
        id: `threat_volume_${symbol}_${Date.now()}`,
        type: 'market',
        severity,
        title: `Unusual Volume Activity: ${symbol}`,
        description: `${symbol} is experiencing ${volumeRatio.toFixed(1)}x normal volume. This unusual activity may indicate significant news, institutional trading, or potential manipulation.`,
        symbols: [symbol],
        probability,
        impact,
        timestamp: new Date()
      };
    }

    return null;
  }

  private detectVolatilityThreat(condition: MarketConditions): ThreatData | null {
    const { symbol, changePercent, volatility } = condition;

    const absChange = Math.abs(changePercent);

    // High intraday volatility
    if (absChange > 8 || (volatility && volatility > 0.05)) {
      const severity = absChange > 10 ? 'critical' : 'high';
      const probability = this.calculateProbability(absChange, 8, 15);
      const impact = this.calculateImpact(absChange, 8, 20);

      return {
        id: `threat_volatility_${symbol}_${Date.now()}`,
        type: 'market',
        severity,
        title: `High Volatility Alert: ${symbol}`,
        description: `${symbol} is experiencing extreme volatility with ${absChange.toFixed(2)}% movement. High volatility indicates increased risk and uncertainty.`,
        symbols: [symbol],
        probability,
        impact,
        timestamp: new Date()
      };
    }

    return null;
  }

  private detectMarketWideThreat(conditions: MarketConditions[]): ThreatData | null {
    if (conditions.length < 5) return null;

    // Check if multiple stocks are dropping
    const droppingStocks = conditions.filter(c => c.changePercent < -3);
    const droppingRatio = droppingStocks.length / conditions.length;

    if (droppingRatio > 0.6) {
      const avgDrop = droppingStocks.reduce((sum, c) => sum + c.changePercent, 0) / droppingStocks.length;
      const severity = avgDrop < -7 ? 'critical' : avgDrop < -5 ? 'high' : 'medium';
      const probability = this.calculateProbability(droppingRatio * 100, 60, 90);
      const impact = this.calculateImpact(Math.abs(avgDrop), 3, 10);

      return {
        id: `threat_market_wide_${Date.now()}`,
        type: 'systemic',
        severity,
        title: 'Market-Wide Correction Detected',
        description: `${Math.round(droppingRatio * 100)}% of monitored stocks are declining with an average drop of ${Math.abs(avgDrop).toFixed(2)}%. This suggests a broader market correction or systemic risk event.`,
        symbols: droppingStocks.map(c => c.symbol),
        probability,
        impact,
        timestamp: new Date()
      };
    }

    return null;
  }

  private calculatePriceDropSeverity(changePercent: number): 'low' | 'medium' | 'high' | 'critical' {
    const absChange = Math.abs(changePercent);
    if (absChange >= 10) return 'critical';
    if (absChange >= 7) return 'high';
    if (absChange >= 5) return 'medium';
    return 'low';
  }

  private calculateProbability(value: number, minThreshold: number, maxThreshold: number): number {
    // Linear interpolation between min and max thresholds
    const normalized = (value - minThreshold) / (maxThreshold - minThreshold);
    return Math.min(Math.max(normalized * 0.5 + 0.5, 0.5), 0.99);
  }

  private calculateImpact(value: number, minThreshold: number, maxThreshold: number): number {
    // Impact score from 0 to 1
    const normalized = (value - minThreshold) / (maxThreshold - minThreshold);
    return Math.min(Math.max(normalized, 0.3), 1.0);
  }

  getThreatHistory(type?: string): ThreatData[] {
    if (type) {
      return this.threatHistory.get(type) || [];
    }
    
    const allThreats: ThreatData[] = [];
    this.threatHistory.forEach(threats => allThreats.push(...threats));
    return allThreats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clearThreatHistory(): void {
    this.threatHistory.clear();
  }

  assessCircuitBreaker(condition: MarketConditions): boolean {
    // Circuit breaker: 7%, 13%, 20% drops
    const absChange = Math.abs(condition.changePercent);
    return absChange >= 7;
  }
}

export const threatDetectionService = ThreatDetectionService.getInstance();
