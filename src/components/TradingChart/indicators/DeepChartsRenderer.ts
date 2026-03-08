// DeepCharts Pro V4.1 - Canvas Renderer
// Draws glow circles, volume profile, anomaly boxes, POC/VAH/VAL lines

import { ChartViewport, ChartDimensions, ChartThemeColors, Candle } from '../ABLEChartEngine/types';
import {
  DeepChartsConfig,
  DeepChartsResult,
  BigTradeSignal,
  AnomalyZone,
  VolumeProfileResult,
} from './DeepChartsEngine';

export class DeepChartsRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(ctx: CanvasRenderingContext2D, dpr: number = 1) {
    this.ctx = ctx;
    this.dpr = dpr;
  }

  drawDeepCharts(
    result: DeepChartsResult,
    config: DeepChartsConfig,
    candles: Candle[],
    viewport: ChartViewport,
    dimensions: ChartDimensions,
    colors: ChartThemeColors
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Draw volume profile first (behind everything)
    if (config.enablePriceMap && result.volumeProfile) {
      this.drawVolumeProfile(result.volumeProfile, config, viewport, dimensions);
    }

    // Draw anomaly zones
    if (config.enableAnomaly) {
      for (const anomaly of result.anomalies) {
        this.drawAnomalyBox(anomaly, config, candles, viewport, dimensions);
      }
    }

    // Draw POC/VAH/VAL lines
    if (config.enablePriceMap && result.volumeProfile) {
      this.drawProfileLines(result.volumeProfile, config, viewport, dimensions);
    }

    // Draw glow circles for signals
    if (config.showGlowCircles) {
      for (const signal of result.signals) {
        this.drawGlowSignal(signal, config, candles, viewport, dimensions);
      }
    }

    // Draw stats panel
    if (config.showStats) {
      this.drawStatsPanel(result, config, dimensions);
    }

    ctx.restore();
  }

  private drawVolumeProfile(
    profile: VolumeProfileResult,
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const { bins, pocPrice } = profile;
    const maxVol = Math.max(...bins.map(b => b.totalVolume));
    if (maxVol === 0) return;

    const chartRight = dimensions.chartArea.x + dimensions.chartArea.width;
    const profileMaxWidth = Math.min(config.profileWidth, dimensions.chartArea.width * 0.25);

    for (const bin of bins) {
      if (bin.totalVolume === 0) continue;

      const y = this.priceToY(bin.priceLevel, viewport, dimensions);
      const binHeight = Math.max(2, dimensions.chartArea.height / config.profileBins);
      const barWidth = (bin.totalVolume / maxVol) * profileMaxWidth;
      
      // Buy portion
      const buyWidth = bin.buyVolume > 0 ? (bin.buyVolume / bin.totalVolume) * barWidth : 0;
      const sellWidth = barWidth - buyWidth;

      const x = chartRight - barWidth - 5;

      // Buy bar
      if (buyWidth > 0) {
        ctx.fillStyle = this.hexToRgba(config.buyColor, bin.priceLevel === pocPrice ? 0.6 : 0.3);
        ctx.fillRect(x + sellWidth, y - binHeight / 2, buyWidth, binHeight);
      }

      // Sell bar
      if (sellWidth > 0) {
        ctx.fillStyle = this.hexToRgba(config.sellColor, bin.priceLevel === pocPrice ? 0.6 : 0.3);
        ctx.fillRect(x, y - binHeight / 2, sellWidth, binHeight);
      }

      // HVN highlight
      if (bin.isHVN) {
        ctx.strokeStyle = this.hexToRgba('#FFFFFF', 0.15);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - binHeight / 2, barWidth, binHeight);
      }
    }
  }

  private drawProfileLines(
    profile: VolumeProfileResult,
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const chartLeft = dimensions.chartArea.x;
    const chartRight = chartLeft + dimensions.chartArea.width;

    // POC Line
    if (config.showPOC) {
      const y = this.priceToY(profile.pocPrice, viewport, dimensions);
      ctx.strokeStyle = config.pocColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = config.pocColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`POC ${profile.pocPrice.toFixed(2)}`, chartLeft + 5, y - 4);
    }

    // VAH Line
    if (config.showVAH) {
      const y = this.priceToY(profile.vahPrice, viewport, dimensions);
      ctx.strokeStyle = config.vahColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();

      ctx.fillStyle = config.vahColor;
      ctx.font = '9px monospace';
      ctx.fillText(`VAH ${profile.vahPrice.toFixed(2)}`, chartLeft + 5, y - 3);
    }

    // VAL Line
    if (config.showVAL) {
      const y = this.priceToY(profile.valPrice, viewport, dimensions);
      ctx.strokeStyle = config.valColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();

      ctx.fillStyle = config.valColor;
      ctx.font = '9px monospace';
      ctx.fillText(`VAL ${profile.valPrice.toFixed(2)}`, chartLeft + 5, y - 3);
    }

    ctx.setLineDash([]);
  }

  private drawGlowSignal(
    signal: BigTradeSignal,
    config: DeepChartsConfig,
    candles: Candle[],
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const x = this.indexToX(signal.barIndex, viewport, dimensions);
    const y = this.priceToY(signal.price, viewport, dimensions);

    if (x < dimensions.chartArea.x || x > dimensions.chartArea.x + dimensions.chartArea.width) return;

    const baseColor = signal.type === 'buy' ? config.buyColor : config.sellColor;
    const isTier3 = signal.tier === 3;

    // Glow layers (outer to inner, more opaque)
    const layers = isTier3
      ? [
          { radius: 18, alpha: 0.08 },
          { radius: 13, alpha: 0.2 },
          { radius: 9, alpha: 0.4 },
          { radius: 5, alpha: 0.9 },
        ]
      : [
          { radius: 12, alpha: 0.1 },
          { radius: 8, alpha: 0.35 },
          { radius: 4, alpha: 0.85 },
        ];

    for (const layer of layers) {
      ctx.beginPath();
      ctx.arc(x, y, layer.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(baseColor, layer.alpha);
      ctx.fill();
    }

    // Label
    const label = `T${signal.tier}`;
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = baseColor;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 3);

    // OI boost indicator
    if (signal.oiBoosted) {
      ctx.font = '7px monospace';
      ctx.fillStyle = config.anomalyColor;
      ctx.fillText('⚡', x + 10, y - 5);
    }
  }

  private drawAnomalyBox(
    anomaly: AnomalyZone,
    config: DeepChartsConfig,
    candles: Candle[],
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const x1 = this.indexToX(anomaly.startIndex, viewport, dimensions);
    const x2 = this.indexToX(anomaly.endIndex, viewport, dimensions);
    const y1 = this.priceToY(anomaly.priceHigh, viewport, dimensions);
    const y2 = this.priceToY(anomaly.priceLow, viewport, dimensions);

    // Yellow box with transparency
    ctx.fillStyle = this.hexToRgba(config.anomalyColor, 0.08);
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

    ctx.strokeStyle = this.hexToRgba(config.anomalyColor, 0.4);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);

    // Label
    if (config.showAnomalyLabel) {
      ctx.font = '8px monospace';
      ctx.fillStyle = this.hexToRgba(config.anomalyColor, 0.8);
      ctx.textAlign = 'left';
      ctx.fillText(`⚠ Z:${anomaly.zScore.toFixed(1)}`, x1 + 3, y1 + 10);
    }
  }

  private drawStatsPanel(
    result: DeepChartsResult,
    config: DeepChartsConfig,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const panelX = dimensions.chartArea.x + 10;
    const panelY = dimensions.chartArea.y + 35;
    const panelW = 160;
    const panelH = 80;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = config.textColor;
    ctx.textAlign = 'left';
    ctx.fillText('🐋 DeepCharts Pro', panelX + 6, panelY + 14);

    // Buy/Sell ratio bar
    const barX = panelX + 6;
    const barY = panelY + 22;
    const barW = panelW - 12;
    const barH = 6;
    const buyW = barW * result.stats.buyRatio;

    ctx.fillStyle = this.hexToRgba(config.buyColor, 0.7);
    ctx.fillRect(barX, barY, buyW, barH);
    ctx.fillStyle = this.hexToRgba(config.sellColor, 0.7);
    ctx.fillRect(barX + buyW, barY, barW - buyW, barH);

    // Stats text
    ctx.font = '8px monospace';
    ctx.fillStyle = config.buyColor;
    ctx.fillText(`BUY: ${this.formatVol(result.stats.totalBuyVol)}`, barX, barY + 16);
    
    ctx.fillStyle = config.sellColor;
    ctx.textAlign = 'right';
    ctx.fillText(`SELL: ${this.formatVol(result.stats.totalSellVol)}`, barX + barW, barY + 16);

    // Signal count
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const buySignals = result.signals.filter(s => s.type === 'buy').length;
    const sellSignals = result.signals.filter(s => s.type === 'sell').length;
    ctx.fillText(`Signals: ${buySignals}B / ${sellSignals}S`, barX, barY + 28);

    // OI info
    if (config.enableOIFilter) {
      const oiText = result.stats.oiImbalance > 0 ? '📈 Bid Heavy' : result.stats.oiImbalance < 0 ? '📉 Ask Heavy' : '— Neutral';
      ctx.fillText(`OI: ${oiText}`, barX, barY + 40);
    }

    ctx.textAlign = 'left';
  }

  // === Utility methods ===
  private priceToY(price: number, viewport: ChartViewport, dimensions: ChartDimensions): number {
    const { priceMin, priceMax } = viewport;
    const ratio = (price - priceMin) / (priceMax - priceMin);
    return dimensions.chartArea.y + dimensions.chartArea.height * (1 - ratio);
  }

  private indexToX(index: number, viewport: ChartViewport, dimensions: ChartDimensions): number {
    const { startIndex, endIndex } = viewport;
    const visibleBars = endIndex - startIndex + 1;
    const barWidth = dimensions.chartArea.width / visibleBars;
    return dimensions.chartArea.x + (index - startIndex) * barWidth + barWidth / 2;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private formatVol(vol: number): string {
    if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toFixed(0);
  }
}
