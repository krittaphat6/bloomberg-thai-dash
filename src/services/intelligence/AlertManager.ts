import { AlertData } from '@/stores/IntelligenceStore';

export interface AlertRule {
  id: string;
  type: 'price' | 'volume' | 'trend' | 'technical' | 'system';
  condition: (data: any) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

class AlertManager {
  private static instance: AlertManager;
  private alertRules: AlertRule[] = [];
  private alertHistory: AlertData[] = [];
  private recentAlerts: Set<string> = new Set();

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        id: 'price_threshold_high',
        type: 'price',
        condition: (data: any) => Math.abs(data.changePercent) > 5,
        severity: 'warning',
        enabled: true
      },
      {
        id: 'price_threshold_critical',
        type: 'price',
        condition: (data: any) => Math.abs(data.changePercent) > 10,
        severity: 'critical',
        enabled: true
      },
      {
        id: 'volume_spike',
        type: 'volume',
        condition: (data: any) => data.volumeRatio > 2,
        severity: 'warning',
        enabled: true
      },
      {
        id: 'trend_reversal',
        type: 'trend',
        condition: (data: any) => data.trendReversal === true,
        severity: 'info',
        enabled: true
      }
    ];
  }

  checkAlerts(marketData: any): AlertData[] {
    const newAlerts: AlertData[] = [];

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      try {
        if (rule.condition(marketData)) {
          const alertKey = `${rule.id}_${marketData.symbol}`;
          
          // Deduplicate - don't create same alert within 5 minutes
          if (this.recentAlerts.has(alertKey)) return;
          
          const alert = this.createAlert(rule, marketData);
          newAlerts.push(alert);
          this.alertHistory.push(alert);
          this.recentAlerts.add(alertKey);
          
          setTimeout(() => this.recentAlerts.delete(alertKey), 300000); // 5 min
        }
      } catch (error) {
        console.error('Alert rule error:', error);
      }
    });

    return newAlerts;
  }

  private createAlert(rule: AlertRule, data: any): AlertData {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.type,
      severity: rule.severity,
      title: this.generateTitle(rule, data),
      message: this.generateMessage(rule, data),
      symbol: data.symbol,
      timestamp: new Date(),
      isRead: false
    };
  }

  private generateTitle(rule: AlertRule, data: any): string {
    switch (rule.type) {
      case 'price':
        return `Price Alert: ${data.symbol}`;
      case 'volume':
        return `Volume Alert: ${data.symbol}`;
      case 'trend':
        return `Trend Change: ${data.symbol}`;
      case 'technical':
        return `Technical Signal: ${data.symbol}`;
      default:
        return `Alert: ${data.symbol}`;
    }
  }

  private generateMessage(rule: AlertRule, data: any): string {
    switch (rule.type) {
      case 'price':
        return `${data.changePercent > 0 ? '📈' : '📉'} Price moved ${Math.abs(data.changePercent).toFixed(2)}%`;
      case 'volume':
        return `📊 Volume spike detected: ${data.volumeRatio?.toFixed(1)}x normal`;
      case 'trend':
        return `🔄 Potential trend reversal detected`;
      case 'technical':
        return `📉 Technical indicator signal triggered`;
      default:
        return `Alert triggered for ${data.symbol}`;
    }
  }

  getAlertHistory(): AlertData[] {
    return this.alertHistory;
  }

  clearAlertHistory(): void {
    this.alertHistory = [];
  }
}

export const alertManager = AlertManager.getInstance();
