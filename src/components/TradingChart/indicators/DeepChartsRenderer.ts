// DeepCharts Pro V4.1 - Canvas Renderer (Faithful PineScript Port)
// Glow circles, volume profile with zone coloring, anomaly boxes, POC/VAH/VAL,
// volume bubbles, SL/TP zones, dynamic profile lines, projected levels, stats panel

import { ChartViewport, ChartDimensions, ChartThemeColors, Candle } from '../ABLEChartEngine/types';
import {
  DeepChartsConfig,
  DeepChartsResult,
  BigTradeSignal,
  AnomalyZone,
  VolumeProfileResult,
  SLTPResult,
  VolumeBubble,
  DynamicProfilePoint,
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

    // 1. Volume profile (behind everything)
    if (config.enablePriceMap && result.volumeProfile) {
      this.drawVolumeProfile(result.volumeProfile, config, viewport, dimensions, result.sltp);
    }

    // 2. Dynamic profile step-lines
    if (config.enableDynProfile && result.dynProfile.length > 1) {
      this.drawDynamicProfile(result.dynProfile, config, viewport, dimensions);
    }

    // 3. Anomaly zones
    if (config.enableAnomaly) {
      for (const anomaly of result.anomalies) {
        this.drawAnomalyBox(anomaly, config, candles, viewport, dimensions);
      }
    }

    // 4. POC/VAH/VAL lines
    if (config.enablePriceMap && result.volumeProfile) {
      this.drawProfileLines(result.volumeProfile, config, viewport, dimensions);
    }

    // 5. SL/TP lines and labels
    if (config.enableSLTP && result.sltp) {
      this.drawSLTPLines(result.sltp, config, viewport, dimensions);
    }

    // 6. Volume bubbles
    if (config.showMapBubbles) {
      for (const bubble of result.bubbles) {
        this.drawVolumeBubble(bubble, config, viewport, dimensions);
      }
      // Projected levels
      if (config.projectLevels) {
        this.drawProjectedLevels(result.bubbles, config, viewport, dimensions);
      }
    }

    // 7. Glow circles for signals
    if (config.showGlowCircles) {
      for (const signal of result.signals) {
        this.drawGlowSignal(signal, config, candles, viewport, dimensions);
      }
    }

    // 8. Volume bars (small squares)
    if (config.showVolBars) {
      for (const signal of result.signals) {
        this.drawVolBar(signal, config, candles, viewport, dimensions);
      }
    }

    // 9. Stats panel
    if (config.showStats) {
      this.drawStatsPanel(result, config, dimensions);
    }

    ctx.restore();
  }

  // ==================== VOLUME PROFILE ====================
  private drawVolumeProfile(
    profile: VolumeProfileResult,
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions,
    sltp: SLTPResult | null
  ) {
    const ctx = this.ctx;
    const { bins } = profile;
    const maxVol = Math.max(...bins.map(b => b.totalVolume));
    if (maxVol === 0) return;

    const chartRight = dimensions.chartArea.x + dimensions.chartArea.width;
    const profileMaxWidth = Math.min(config.profileWidth, dimensions.chartArea.width * 0.25);

    for (const bin of bins) {
      if (bin.totalVolume === 0) continue;

      const y = this.priceToY(bin.priceLevel, viewport, dimensions);
      const binHeight = Math.max(2, dimensions.chartArea.height / config.profileBins);
      const barWidth = (bin.totalVolume / maxVol) * profileMaxWidth;

      const buyWidth = bin.buyVolume > 0 ? (bin.buyVolume / bin.totalVolume) * barWidth : 0;
      const sellWidth = barWidth - buyWidth;
      const x = chartRight - barWidth - config.profileOffset;

      // Zone-based coloring
      let buyAlpha = 0.3;
      let sellAlpha = 0.3;
      let buyColorOverride = config.buyColor;
      let sellColorOverride = config.sellColor;

      switch (bin.zone) {
        case 'sl':
          buyColorOverride = config.slColor;
          sellColorOverride = config.slColor;
          buyAlpha = 0.5; sellAlpha = 0.5;
          break;
        case 'tp1':
          buyColorOverride = config.tp1Color;
          sellColorOverride = config.tp1Color;
          buyAlpha = 0.4; sellAlpha = 0.4;
          break;
        case 'tp2':
          buyColorOverride = config.tp2Color;
          sellColorOverride = config.tp2Color;
          buyAlpha = 0.35; sellAlpha = 0.35;
          break;
        case 'poc':
          buyAlpha = 0.6; sellAlpha = 0.6;
          break;
        case 'va':
          buyAlpha = 0.4; sellAlpha = 0.4;
          break;
      }

      if (buyWidth > 0) {
        ctx.fillStyle = this.hexToRgba(buyColorOverride, buyAlpha);
        ctx.fillRect(x + sellWidth, y - binHeight / 2, buyWidth, binHeight);
      }
      if (sellWidth > 0) {
        ctx.fillStyle = this.hexToRgba(sellColorOverride, sellAlpha);
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

  // ==================== DYNAMIC PROFILE STEP-LINES ====================
  private drawDynamicProfile(
    dynProfile: DynamicProfilePoint[],
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const drawStepLine = (points: DynamicProfilePoint[], getPriceKey: (p: DynamicProfilePoint) => number, color: string) => {
      if (points.length < 2) return;
      ctx.strokeStyle = this.hexToRgba(color, 0.5);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = this.indexToX(points[i].barIndex, viewport, dimensions);
        const y = this.priceToY(getPriceKey(points[i]), viewport, dimensions);
        if (i === 0) ctx.moveTo(x, y);
        else {
          // Step: horizontal then vertical
          const prevY = this.priceToY(getPriceKey(points[i - 1]), viewport, dimensions);
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawStepLine(dynProfile, p => p.pocPrice, config.pocColor);
    drawStepLine(dynProfile, p => p.vahPrice, config.vahColor);
    drawStepLine(dynProfile, p => p.valPrice, config.valColor);
  }

  // ==================== PROFILE LINES ====================
  private drawProfileLines(
    profile: VolumeProfileResult,
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const chartLeft = dimensions.chartArea.x;
    const chartRight = chartLeft + dimensions.chartArea.width;

    if (config.showPOC) {
      const y = this.priceToY(profile.pocPrice, viewport, dimensions);
      ctx.strokeStyle = config.pocColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
      ctx.fillStyle = config.pocColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`POC ${profile.pocPrice.toFixed(2)}`, chartLeft + 5, y - 4);
    }

    if (config.showVAH) {
      const y = this.priceToY(profile.vahPrice, viewport, dimensions);
      ctx.strokeStyle = config.vahColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
      ctx.fillStyle = config.vahColor;
      ctx.font = '9px monospace';
      ctx.fillText(`VAH ${profile.vahPrice.toFixed(2)}`, chartLeft + 5, y - 3);
    }

    if (config.showVAL) {
      const y = this.priceToY(profile.valPrice, viewport, dimensions);
      ctx.strokeStyle = config.valColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke();
      ctx.fillStyle = config.valColor;
      ctx.font = '9px monospace';
      ctx.fillText(`VAL ${profile.valPrice.toFixed(2)}`, chartLeft + 5, y - 3);
    }

    ctx.setLineDash([]);
  }

  // ==================== SL/TP LINES ====================
  private drawSLTPLines(
    sltp: SLTPResult,
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const chartLeft = dimensions.chartArea.x;
    const chartRight = chartLeft + dimensions.chartArea.width;

    // SL line
    const slY = this.priceToY(sltp.slPrice, viewport, dimensions);
    ctx.strokeStyle = config.slColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(chartLeft, slY); ctx.lineTo(chartRight, slY); ctx.stroke();

    // TP1 line
    const tp1Y = this.priceToY(sltp.tp1Price, viewport, dimensions);
    ctx.strokeStyle = config.tp1Color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(chartLeft, tp1Y); ctx.lineTo(chartRight, tp1Y); ctx.stroke();

    // TP2 line
    if (config.showTP2) {
      const tp2Y = this.priceToY(sltp.tp2Price, viewport, dimensions);
      ctx.strokeStyle = config.tp2Color;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(chartLeft, tp2Y); ctx.lineTo(chartRight, tp2Y); ctx.stroke();
    }

    ctx.setLineDash([]);

    // Labels
    if (config.showSLTPLabels) {
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';

      ctx.fillStyle = config.slColor;
      ctx.fillText(`🛑 SL ${sltp.slPrice.toFixed(2)}`, chartRight - 5, slY - 3);

      ctx.fillStyle = config.tp1Color;
      ctx.fillText(`✅ TP1 ${sltp.tp1Price.toFixed(2)} (R:R ${sltp.rr1.toFixed(1)})`, chartRight - 5, tp1Y - 3);

      if (config.showTP2) {
        ctx.fillStyle = config.tp2Color;
        const tp2Y = this.priceToY(sltp.tp2Price, viewport, dimensions);
        ctx.fillText(`🎯 TP2 ${sltp.tp2Price.toFixed(2)} (R:R ${sltp.rr2.toFixed(1)})`, chartRight - 5, tp2Y - 3);
      }
    }
  }

  // ==================== VOLUME BUBBLES ====================
  private drawVolumeBubble(
    bubble: VolumeBubble,
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const x = this.indexToX(bubble.barIndex, viewport, dimensions);
    const y = this.priceToY(bubble.price, viewport, dimensions);

    if (x < dimensions.chartArea.x || x > dimensions.chartArea.x + dimensions.chartArea.width) return;

    const sizeMap = { huge: 20, large: 14, normal: 9, small: 5 };
    const radius = sizeMap[bubble.sizeCategory];
    const baseColor = bubble.isBull ? config.buyColor : config.sellColor;

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = this.hexToRgba(baseColor, 0.08);
    ctx.fill();

    // Main bubble
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.hexToRgba(baseColor, 0.25);
    ctx.fill();
    ctx.strokeStyle = this.hexToRgba(baseColor, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Z-score label inside
    if (radius >= 9) {
      ctx.font = `bold ${radius > 14 ? 8 : 7}px monospace`;
      ctx.fillStyle = this.hexToRgba(baseColor, 0.9);
      ctx.textAlign = 'center';
      ctx.fillText(`${bubble.zScore.toFixed(1)}`, x, y + 3);
    }
  }

  // ==================== PROJECTED LEVELS ====================
  private drawProjectedLevels(
    bubbles: VolumeBubble[],
    config: DeepChartsConfig,
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const chartRight = dimensions.chartArea.x + dimensions.chartArea.width;

    // Take last N significant bubbles
    const significant = bubbles
      .filter(b => b.sizeCategory === 'huge' || b.sizeCategory === 'large')
      .slice(-config.maxProjectedLevels);

    for (const bubble of significant) {
      const x = this.indexToX(bubble.barIndex, viewport, dimensions);
      const y = this.priceToY(bubble.price, viewport, dimensions);
      const color = bubble.isBull ? config.buyColor : config.sellColor;

      ctx.strokeStyle = this.hexToRgba(color, 0.3);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(chartRight, y);
      ctx.stroke();

      // Tier label at right
      ctx.fillStyle = this.hexToRgba(color, 0.6);
      ctx.font = '7px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${bubble.sizeCategory.toUpperCase()} Z:${bubble.zScore.toFixed(1)}`, chartRight - 5, y - 2);
    }
    ctx.setLineDash([]);
  }

  // ==================== GLOW SIGNALS ====================
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

    const layers = isTier3
      ? [{ radius: 18, alpha: 0.08 }, { radius: 13, alpha: 0.2 }, { radius: 9, alpha: 0.4 }, { radius: 5, alpha: 0.9 }]
      : [{ radius: 12, alpha: 0.1 }, { radius: 8, alpha: 0.35 }, { radius: 4, alpha: 0.85 }];

    for (const layer of layers) {
      ctx.beginPath();
      ctx.arc(x, y, layer.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(baseColor, layer.alpha);
      ctx.fill();
    }

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = baseColor;
    ctx.textAlign = 'center';
    ctx.fillText(`T${signal.tier}`, x, y + 3);

    if (signal.oiBoosted) {
      ctx.font = '7px monospace';
      ctx.fillStyle = config.anomalyColor;
      ctx.fillText('⚡', x + 10, y - 5);
    }
  }

  // ==================== VOLUME BARS (small squares) ====================
  private drawVolBar(
    signal: BigTradeSignal,
    config: DeepChartsConfig,
    candles: Candle[],
    viewport: ChartViewport,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const x = this.indexToX(signal.barIndex, viewport, dimensions);
    if (x < dimensions.chartArea.x || x > dimensions.chartArea.x + dimensions.chartArea.width) return;

    const c = candles[signal.barIndex];
    if (!c) return;

    const baseColor = signal.type === 'buy' ? config.buyColor : config.sellColor;
    const yPos = signal.type === 'buy'
      ? this.priceToY(c.low, viewport, dimensions) + 12
      : this.priceToY(c.high, viewport, dimensions) - 12;

    const size = signal.tier === 3 ? 6 : 4;
    ctx.fillStyle = this.hexToRgba(baseColor, 0.7);
    ctx.fillRect(x - size / 2, yPos - size / 2, size, size);
  }

  // ==================== ANOMALY BOX ====================
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

    // Type-based coloring
    let boxColor = config.anomalyColor;
    let boxAlpha = 0.08;
    let borderAlpha = 0.4;
    if (anomaly.anomalyType === 'OI_SPIKE') {
      boxColor = '#FF6B00';
      boxAlpha = 0.12;
    } else if (anomaly.anomalyType === 'REVERSAL') {
      boxColor = '#9C27B0';
      boxAlpha = 0.1;
    }

    ctx.fillStyle = this.hexToRgba(boxColor, boxAlpha);
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeStyle = this.hexToRgba(boxColor, borderAlpha);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);

    if (config.showAnomalyLabel) {
      ctx.font = '8px monospace';
      ctx.fillStyle = this.hexToRgba(boxColor, 0.8);
      ctx.textAlign = 'left';
      const icon = anomaly.anomalyType === 'OI_SPIKE' ? '📊' : anomaly.anomalyType === 'REVERSAL' ? '🔄' : '⚠';
      ctx.fillText(`${icon} ${anomaly.anomalyType} Z:${anomaly.zScore.toFixed(1)}`, x1 + 3, y1 + 10);
    }
  }

  // ==================== STATS PANEL ====================
  private drawStatsPanel(
    result: DeepChartsResult,
    config: DeepChartsConfig,
    dimensions: ChartDimensions
  ) {
    const ctx = this.ctx;
    const panelX = dimensions.chartArea.x + 10;
    const panelY = dimensions.chartArea.y + 35;
    const panelW = 180;
    let panelH = 95;

    // Extend panel if SL/TP stats or volume profile info
    if (config.enableSLTP && result.sltp && config.showSLTPStats) panelH += 30;
    if (result.volumeProfile) panelH += 20;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    let textY = panelY + 14;
    const textX = panelX + 6;
    const rightX = panelX + panelW - 6;

    // Title
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = config.textColor;
    ctx.textAlign = 'left';
    ctx.fillText('🐋 DeepCharts Pro V4.1', textX, textY);
    textY += 12;

    // Buy/Sell ratio bar
    const barW = panelW - 12;
    const barH = 6;
    const buyW = barW * result.stats.buyRatio;
    ctx.fillStyle = this.hexToRgba(config.buyColor, 0.7);
    ctx.fillRect(textX, textY, buyW, barH);
    ctx.fillStyle = this.hexToRgba(config.sellColor, 0.7);
    ctx.fillRect(textX + buyW, textY, barW - buyW, barH);
    textY += barH + 10;

    // Buy/Sell volumes
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = config.buyColor;
    ctx.fillText(`BUY: ${this.formatVol(result.stats.totalBuyVol)}`, textX, textY);
    ctx.textAlign = 'right';
    ctx.fillStyle = config.sellColor;
    ctx.fillText(`SELL: ${this.formatVol(result.stats.totalSellVol)}`, rightX, textY);
    textY += 12;

    // Signal count
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`Signals: ${result.stats.signalsBuy}B / ${result.stats.signalsSell}S`, textX, textY);
    textY += 12;

    // OI info
    if (config.enableOIFilter) {
      const oiText = result.stats.oiImbalance > 0 ? '📈 Bid Heavy' : result.stats.oiImbalance < 0 ? '📉 Ask Heavy' : '— Neutral';
      ctx.fillText(`OI: ${oiText} (${result.stats.oiDeltaPercent.toFixed(1)}%)`, textX, textY);
      textY += 12;
    }

    // Volume profile info
    if (result.volumeProfile) {
      const vp = result.volumeProfile;
      ctx.fillStyle = config.pocColor;
      ctx.fillText(`POC: ${vp.pocPrice.toFixed(2)}`, textX, textY);
      ctx.fillStyle = config.vahColor;
      ctx.textAlign = 'right';
      ctx.fillText(`VAH: ${vp.vahPrice.toFixed(2)}`, rightX, textY);
      textY += 10;
      ctx.textAlign = 'left';
      ctx.fillStyle = config.valColor;
      ctx.fillText(`VAL: ${vp.valPrice.toFixed(2)}`, textX, textY);
      textY += 12;
    }

    // SL/TP info
    if (config.enableSLTP && result.sltp && config.showSLTPStats) {
      const s = result.sltp;
      ctx.fillStyle = config.slColor;
      ctx.textAlign = 'left';
      ctx.fillText(`🛑 SL: ${s.slPrice.toFixed(2)}`, textX, textY);
      ctx.fillStyle = config.tp1Color;
      ctx.textAlign = 'right';
      ctx.fillText(`✅ TP1: ${s.tp1Price.toFixed(2)}`, rightX, textY);
      textY += 10;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`${s.direction.toUpperCase()} R:R ${s.rr1.toFixed(1)} / ${s.rr2.toFixed(1)}`, textX, textY);
    }

    ctx.textAlign = 'left';
  }

  // ==================== UTILITIES ====================
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
