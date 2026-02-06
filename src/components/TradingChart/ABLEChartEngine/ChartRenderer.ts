// ABLE Chart Engine - Canvas Renderer
import { Candle, ChartViewport, ChartThemeColors, ChartDimensions, DrawingObject, CrosshairState, IndicatorData } from './types';

export class ChartRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  
  constructor(ctx: CanvasRenderingContext2D, dpr: number = 1) {
    this.ctx = ctx;
    this.dpr = dpr;
  }

  setDPR(dpr: number) {
    this.dpr = dpr;
  }

  clear(dimensions: ChartDimensions, colors: ChartThemeColors) {
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, dimensions.width * this.dpr, dimensions.height * this.dpr);
  }

  drawGrid(dimensions: ChartDimensions, viewport: ChartViewport, colors: ChartThemeColors) {
    const { chartArea, priceAxisWidth } = dimensions;
    const ctx = this.ctx;
    
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    // Horizontal grid lines (price levels)
    const priceRange = viewport.priceMax - viewport.priceMin;
    const priceStep = this.calculatePriceStep(priceRange, chartArea.height / 50);
    
    for (let price = Math.ceil(viewport.priceMin / priceStep) * priceStep; price <= viewport.priceMax; price += priceStep) {
      const y = this.priceToY(price, viewport, chartArea);
      ctx.beginPath();
      ctx.moveTo(chartArea.x * this.dpr, y * this.dpr);
      ctx.lineTo((chartArea.x + chartArea.width) * this.dpr, y * this.dpr);
      ctx.stroke();
    }

    // Vertical grid lines (time)
    const candleWidth = chartArea.width / (viewport.endIndex - viewport.startIndex);
    const timeStep = Math.max(1, Math.floor(50 / candleWidth));
    
    for (let i = viewport.startIndex; i <= viewport.endIndex; i += timeStep) {
      const x = this.indexToX(i, viewport, chartArea);
      ctx.beginPath();
      ctx.moveTo(x * this.dpr, chartArea.y * this.dpr);
      ctx.lineTo(x * this.dpr, (chartArea.y + chartArea.height) * this.dpr);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  drawCandles(candles: Candle[], viewport: ChartViewport, dimensions: ChartDimensions, colors: ChartThemeColors) {
    const { chartArea } = dimensions;
    const ctx = this.ctx;
    
    const startIdx = Math.max(0, viewport.startIndex);
    const endIdx = Math.min(candles.length - 1, viewport.endIndex);
    const candleCount = endIdx - startIdx + 1;
    
    if (candleCount <= 0) return;
    
    const candleWidth = Math.max(1, (chartArea.width / candleCount) * 0.8);
    const candleGap = (chartArea.width / candleCount) * 0.1;

    for (let i = startIdx; i <= endIdx; i++) {
      const candle = candles[i];
      if (!candle) continue;

      const x = this.indexToX(i, viewport, chartArea);
      const isBullish = candle.close >= candle.open;
      
      const candleColor = isBullish ? colors.bullCandle : colors.bearCandle;
      
      // Draw wick
      const wickX = x;
      const highY = this.priceToY(candle.high, viewport, chartArea);
      const lowY = this.priceToY(candle.low, viewport, chartArea);
      
      ctx.strokeStyle = candleColor.border;
      ctx.lineWidth = Math.max(1, candleWidth * 0.1);
      ctx.beginPath();
      ctx.moveTo(wickX * this.dpr, highY * this.dpr);
      ctx.lineTo(wickX * this.dpr, lowY * this.dpr);
      ctx.stroke();
      
      // Draw body
      const openY = this.priceToY(candle.open, viewport, chartArea);
      const closeY = this.priceToY(candle.close, viewport, chartArea);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      
      ctx.fillStyle = candleColor.fill;
      ctx.fillRect(
        (x - candleWidth / 2) * this.dpr,
        bodyTop * this.dpr,
        candleWidth * this.dpr,
        bodyHeight * this.dpr
      );
      
      // Border for candle body
      ctx.strokeStyle = candleColor.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        (x - candleWidth / 2) * this.dpr,
        bodyTop * this.dpr,
        candleWidth * this.dpr,
        bodyHeight * this.dpr
      );
    }
  }

  drawVolume(candles: Candle[], viewport: ChartViewport, dimensions: ChartDimensions, colors: ChartThemeColors) {
    const { chartArea, volumeHeight } = dimensions;
    const ctx = this.ctx;
    
    if (volumeHeight <= 0) return;
    
    const startIdx = Math.max(0, viewport.startIndex);
    const endIdx = Math.min(candles.length - 1, viewport.endIndex);
    const candleCount = endIdx - startIdx + 1;
    
    if (candleCount <= 0) return;

    // Find max volume for scaling
    let maxVolume = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      if (candles[i]) {
        maxVolume = Math.max(maxVolume, candles[i].volume);
      }
    }
    
    if (maxVolume === 0) return;

    const candleWidth = Math.max(1, (chartArea.width / candleCount) * 0.8);
    const volumeY = chartArea.y + chartArea.height;

    for (let i = startIdx; i <= endIdx; i++) {
      const candle = candles[i];
      if (!candle) continue;

      const x = this.indexToX(i, viewport, chartArea);
      const isBullish = candle.close >= candle.open;
      const barHeight = (candle.volume / maxVolume) * volumeHeight;
      
      ctx.fillStyle = isBullish ? colors.volumeUp : colors.volumeDown;
      ctx.fillRect(
        (x - candleWidth / 2) * this.dpr,
        (volumeY + volumeHeight - barHeight) * this.dpr,
        candleWidth * this.dpr,
        barHeight * this.dpr
      );
    }
  }

  drawPriceAxis(viewport: ChartViewport, dimensions: ChartDimensions, colors: ChartThemeColors) {
    const { chartArea, priceAxisWidth, width } = dimensions;
    const ctx = this.ctx;
    
    // Background
    ctx.fillStyle = colors.background;
    ctx.fillRect(
      (width - priceAxisWidth) * this.dpr,
      0,
      priceAxisWidth * this.dpr,
      chartArea.height * this.dpr
    );

    // Price labels
    ctx.fillStyle = colors.text;
    ctx.font = `${11 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const priceRange = viewport.priceMax - viewport.priceMin;
    const priceStep = this.calculatePriceStep(priceRange, chartArea.height / 50);
    
    for (let price = Math.ceil(viewport.priceMin / priceStep) * priceStep; price <= viewport.priceMax; price += priceStep) {
      const y = this.priceToY(price, viewport, chartArea);
      const formattedPrice = this.formatPrice(price);
      ctx.fillText(
        formattedPrice,
        (width - 5) * this.dpr,
        y * this.dpr
      );
    }
  }

  drawTimeAxis(candles: Candle[], viewport: ChartViewport, dimensions: ChartDimensions, colors: ChartThemeColors) {
    const { chartArea, timeAxisHeight, height, volumeHeight } = dimensions;
    const ctx = this.ctx;
    
    // Background
    ctx.fillStyle = colors.background;
    ctx.fillRect(
      0,
      (height - timeAxisHeight) * this.dpr,
      chartArea.width * this.dpr,
      timeAxisHeight * this.dpr
    );

    // Time labels
    ctx.fillStyle = colors.text;
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const candleWidth = chartArea.width / (viewport.endIndex - viewport.startIndex);
    const labelStep = Math.max(1, Math.floor(80 / candleWidth));
    
    const startIdx = Math.max(0, viewport.startIndex);
    const endIdx = Math.min(candles.length - 1, viewport.endIndex);

    for (let i = startIdx; i <= endIdx; i += labelStep) {
      if (!candles[i]) continue;
      
      const x = this.indexToX(i, viewport, chartArea);
      const date = new Date(candles[i].timestamp);
      const label = this.formatTime(date);
      
      ctx.fillText(
        label,
        x * this.dpr,
        (chartArea.y + chartArea.height + volumeHeight + 5) * this.dpr
      );
    }
  }

  drawCrosshair(crosshair: CrosshairState, dimensions: ChartDimensions, colors: ChartThemeColors) {
    if (!crosshair.visible) return;
    
    const { chartArea, priceAxisWidth, width, height, timeAxisHeight, volumeHeight } = dimensions;
    const ctx = this.ctx;
    
    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(crosshair.x * this.dpr, chartArea.y * this.dpr);
    ctx.lineTo(crosshair.x * this.dpr, (height - timeAxisHeight) * this.dpr);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(chartArea.x * this.dpr, crosshair.y * this.dpr);
    ctx.lineTo((width - priceAxisWidth) * this.dpr, crosshair.y * this.dpr);
    ctx.stroke();

    ctx.setLineDash([]);

    // Price label
    if (crosshair.y >= chartArea.y && crosshair.y <= chartArea.y + chartArea.height) {
      ctx.fillStyle = colors.crosshair;
      ctx.fillRect(
        (width - priceAxisWidth) * this.dpr,
        (crosshair.y - 10) * this.dpr,
        priceAxisWidth * this.dpr,
        20 * this.dpr
      );
      
      ctx.fillStyle = colors.background;
      ctx.font = `${11 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.formatPrice(crosshair.price),
        (width - 5) * this.dpr,
        crosshair.y * this.dpr
      );
    }

    // Time label
    if (crosshair.time > 0) {
      const date = new Date(crosshair.time);
      const timeLabel = this.formatTime(date);
      const labelWidth = 80;
      
      ctx.fillStyle = colors.crosshair;
      ctx.fillRect(
        (crosshair.x - labelWidth / 2) * this.dpr,
        (height - timeAxisHeight) * this.dpr,
        labelWidth * this.dpr,
        18 * this.dpr
      );
      
      ctx.fillStyle = colors.background;
      ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        timeLabel,
        crosshair.x * this.dpr,
        (height - timeAxisHeight + 4) * this.dpr
      );
    }
  }

  drawTooltip(crosshair: CrosshairState, dimensions: ChartDimensions, colors: ChartThemeColors) {
    if (!crosshair.visible || !crosshair.candle) return;
    
    const { chartArea } = dimensions;
    const ctx = this.ctx;
    const candle = crosshair.candle;
    
    const tooltipWidth = 150;
    const tooltipHeight = 100;
    const padding = 10;
    
    // Position tooltip
    let tooltipX = crosshair.x + 15;
    let tooltipY = crosshair.y - tooltipHeight / 2;
    
    // Keep tooltip within chart area
    if (tooltipX + tooltipWidth > chartArea.x + chartArea.width) {
      tooltipX = crosshair.x - tooltipWidth - 15;
    }
    tooltipY = Math.max(chartArea.y, Math.min(tooltipY, chartArea.y + chartArea.height - tooltipHeight));

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(
      tooltipX * this.dpr,
      tooltipY * this.dpr,
      tooltipWidth * this.dpr,
      tooltipHeight * this.dpr,
      4 * this.dpr
    );
    ctx.fill();

    // Border
    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Content
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const isBullish = candle.close >= candle.open;
    const changePercent = ((candle.close - candle.open) / candle.open * 100).toFixed(2);
    
    const lines = [
      { label: 'O', value: this.formatPrice(candle.open), color: colors.text },
      { label: 'H', value: this.formatPrice(candle.high), color: colors.bullCandle.fill },
      { label: 'L', value: this.formatPrice(candle.low), color: colors.bearCandle.fill },
      { label: 'C', value: this.formatPrice(candle.close), color: isBullish ? colors.bullCandle.fill : colors.bearCandle.fill },
      { label: 'V', value: this.formatVolume(candle.volume), color: colors.text },
      { label: '%', value: `${isBullish ? '+' : ''}${changePercent}%`, color: isBullish ? colors.bullCandle.fill : colors.bearCandle.fill },
    ];

    lines.forEach((line, index) => {
      const y = tooltipY + padding + index * 14;
      
      ctx.fillStyle = colors.text;
      ctx.fillText(line.label + ':', (tooltipX + padding) * this.dpr, y * this.dpr);
      
      ctx.fillStyle = line.color;
      ctx.fillText(line.value, (tooltipX + padding + 25) * this.dpr, y * this.dpr);
    });
  }

  drawIndicators(indicators: IndicatorData[], candles: Candle[], viewport: ChartViewport, dimensions: ChartDimensions) {
    const { chartArea } = dimensions;
    const ctx = this.ctx;
    
    const startIdx = Math.max(0, viewport.startIndex);
    const endIdx = Math.min(candles.length - 1, viewport.endIndex);

    indicators.filter(ind => ind.visible && ind.type === 'overlay').forEach(indicator => {
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      let started = false;
      for (let i = startIdx; i <= endIdx; i++) {
        const value = indicator.values[i];
        if (value === undefined || value === 0 || !isFinite(value)) continue;

        const x = this.indexToX(i, viewport, chartArea);
        const y = this.priceToY(value, viewport, chartArea);

        if (!started) {
          ctx.moveTo(x * this.dpr, y * this.dpr);
          started = true;
        } else {
          ctx.lineTo(x * this.dpr, y * this.dpr);
        }
      }

      ctx.stroke();
    });
  }

  drawDrawings(drawings: DrawingObject[], viewport: ChartViewport, dimensions: ChartDimensions, colors: ChartThemeColors) {
    const { chartArea } = dimensions;
    const ctx = this.ctx;

    drawings.forEach(drawing => {
      if (drawing.points.length === 0) return;

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.lineWidth;
      ctx.beginPath();

      switch (drawing.type) {
        case 'horizontal': {
          const y = this.priceToY(drawing.points[0].price, viewport, chartArea);
          ctx.setLineDash([5, 5]);
          ctx.moveTo(chartArea.x * this.dpr, y * this.dpr);
          ctx.lineTo((chartArea.x + chartArea.width) * this.dpr, y * this.dpr);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'vertical': {
          const x = drawing.points[0].x;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(x * this.dpr, chartArea.y * this.dpr);
          ctx.lineTo(x * this.dpr, (chartArea.y + chartArea.height) * this.dpr);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'trendline': {
          if (drawing.points.length >= 2) {
            const x1 = drawing.points[0].x;
            const y1 = this.priceToY(drawing.points[0].price, viewport, chartArea);
            const x2 = drawing.points[1].x;
            const y2 = this.priceToY(drawing.points[1].price, viewport, chartArea);
            
            ctx.moveTo(x1 * this.dpr, y1 * this.dpr);
            ctx.lineTo(x2 * this.dpr, y2 * this.dpr);
            ctx.stroke();
          }
          break;
        }
        case 'rectangle': {
          if (drawing.points.length >= 2) {
            const x1 = drawing.points[0].x;
            const y1 = this.priceToY(drawing.points[0].price, viewport, chartArea);
            const x2 = drawing.points[1].x;
            const y2 = this.priceToY(drawing.points[1].price, viewport, chartArea);
            
            ctx.strokeRect(
              Math.min(x1, x2) * this.dpr,
              Math.min(y1, y2) * this.dpr,
              Math.abs(x2 - x1) * this.dpr,
              Math.abs(y2 - y1) * this.dpr
            );
          }
          break;
        }
        case 'fibonacci': {
          if (drawing.points.length >= 2) {
            const y1 = this.priceToY(drawing.points[0].price, viewport, chartArea);
            const y2 = this.priceToY(drawing.points[1].price, viewport, chartArea);
            const range = y2 - y1;
            const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            
            ctx.setLineDash([3, 3]);
            levels.forEach((level, i) => {
              const y = y1 + range * level;
              ctx.beginPath();
              ctx.moveTo(chartArea.x * this.dpr, y * this.dpr);
              ctx.lineTo((chartArea.x + chartArea.width) * this.dpr, y * this.dpr);
              ctx.stroke();
              
              ctx.fillStyle = drawing.color;
              ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
              ctx.fillText(
                `${(level * 100).toFixed(1)}%`,
                (chartArea.x + 5) * this.dpr,
                (y - 3) * this.dpr
              );
            });
            ctx.setLineDash([]);
          }
          break;
        }
      }
    });
  }

  drawWatermark(dimensions: ChartDimensions, text: string = 'ABLE') {
    const ctx = this.ctx;
    
    ctx.font = `bold ${48 * this.dpr}px 'JetBrains Mono', sans-serif`;
    ctx.fillStyle = 'rgba(255, 176, 0, 0.08)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(
      text,
      (dimensions.width / 2) * this.dpr,
      (dimensions.height / 2) * this.dpr
    );
  }

  // Utility methods
  private priceToY(price: number, viewport: ChartViewport, chartArea: ChartDimensions['chartArea']): number {
    const priceRange = viewport.priceMax - viewport.priceMin;
    if (priceRange === 0) return chartArea.y + chartArea.height / 2;
    return chartArea.y + chartArea.height * (1 - (price - viewport.priceMin) / priceRange);
  }

  private indexToX(index: number, viewport: ChartViewport, chartArea: ChartDimensions['chartArea']): number {
    const indexRange = viewport.endIndex - viewport.startIndex;
    if (indexRange === 0) return chartArea.x + chartArea.width / 2;
    return chartArea.x + chartArea.width * ((index - viewport.startIndex) / indexRange) + (chartArea.width / indexRange / 2);
  }

  yToPrice(y: number, viewport: ChartViewport, chartArea: ChartDimensions['chartArea']): number {
    const priceRange = viewport.priceMax - viewport.priceMin;
    return viewport.priceMax - (y - chartArea.y) / chartArea.height * priceRange;
  }

  xToIndex(x: number, viewport: ChartViewport, chartArea: ChartDimensions['chartArea']): number {
    const indexRange = viewport.endIndex - viewport.startIndex;
    return Math.floor(viewport.startIndex + (x - chartArea.x) / chartArea.width * indexRange);
  }

  private calculatePriceStep(range: number, targetSteps: number): number {
    const rawStep = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    
    let step: number;
    if (normalized <= 1) step = 1;
    else if (normalized <= 2) step = 2;
    else if (normalized <= 5) step = 5;
    else step = 10;
    
    return step * magnitude;
  }

  private formatPrice(price: number): string {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  }

  private formatVolume(volume: number): string {
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
    return volume.toFixed(2);
  }

  private formatTime(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  }
}
