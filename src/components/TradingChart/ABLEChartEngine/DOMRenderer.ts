// ABLE Chart Engine - DOM (Depth of Market) Renderer
import { ChartDimensions, ChartThemeColors, ChartViewport } from './types';
import { OrderBookData, DOMRow } from '@/services/BinanceOrderBookService';

export interface DOMRenderConfig {
  rows: number;
  showVolumeBars: boolean;
  showImbalance: boolean;
  showDelta: boolean;
  compactMode: boolean;
  position: 'left' | 'right';
  opacity: number;
}

const DEFAULT_CONFIG: DOMRenderConfig = {
  rows: 15,
  showVolumeBars: true,
  showImbalance: true,
  showDelta: true,
  compactMode: false,
  position: 'right',
  opacity: 0.95,
};

export class DOMRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private config: DOMRenderConfig;

  constructor(ctx: CanvasRenderingContext2D, dpr: number = 1, config: Partial<DOMRenderConfig> = {}) {
    this.ctx = ctx;
    this.dpr = dpr;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<DOMRenderConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Main render function for DOM table
  drawDOM(
    orderBook: OrderBookData | null,
    dimensions: ChartDimensions,
    colors: ChartThemeColors,
    currentPrice: number
  ) {
    if (!orderBook) return;

    const ctx = this.ctx;
    const { chartArea, priceAxisWidth } = dimensions;
    
    // DOM table dimensions
    const tableWidth = 280;
    const rowHeight = this.config.compactMode ? 18 : 22;
    const headerHeight = 28;
    const padding = 8;
    
    // Calculate table position
    const numRows = Math.min(this.config.rows, orderBook.bids.length + orderBook.asks.length);
    const tableHeight = headerHeight + (numRows * 2 + 1) * rowHeight + padding * 2; // +1 for spread row
    
    const tableX = this.config.position === 'right' 
      ? chartArea.x + chartArea.width - tableWidth - 10
      : chartArea.x + 10;
    const tableY = chartArea.y + 10;

    // Draw background with opacity
    ctx.fillStyle = `rgba(0, 0, 0, ${this.config.opacity})`;
    ctx.beginPath();
    ctx.roundRect(
      tableX * this.dpr,
      tableY * this.dpr,
      tableWidth * this.dpr,
      tableHeight * this.dpr,
      6 * this.dpr
    );
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw header
    this.drawHeader(tableX, tableY, tableWidth, headerHeight, orderBook);

    // Draw ask levels (top half - red)
    const asks = orderBook.asks.slice(0, this.config.rows).reverse();
    const asksY = tableY + headerHeight + padding;
    
    asks.forEach((ask, i) => {
      this.drawAskRow(
        tableX + padding,
        asksY + i * rowHeight,
        tableWidth - padding * 2,
        rowHeight,
        ask,
        orderBook.totalAskVolume,
        colors
      );
    });

    // Draw spread row
    const spreadY = asksY + asks.length * rowHeight;
    this.drawSpreadRow(
      tableX + padding,
      spreadY,
      tableWidth - padding * 2,
      rowHeight,
      orderBook
    );

    // Draw bid levels (bottom half - green)
    const bids = orderBook.bids.slice(0, this.config.rows);
    const bidsY = spreadY + rowHeight;
    
    bids.forEach((bid, i) => {
      this.drawBidRow(
        tableX + padding,
        bidsY + i * rowHeight,
        tableWidth - padding * 2,
        rowHeight,
        bid,
        orderBook.totalBidVolume,
        colors
      );
    });

    // Draw footer stats
    this.drawFooter(
      tableX,
      tableY + tableHeight - 25,
      tableWidth,
      25,
      orderBook
    );
  }

  private drawHeader(x: number, y: number, width: number, height: number, orderBook: OrderBookData) {
    const ctx = this.ctx;
    
    // Header background
    ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);

    // Title
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊 DOM', (x + 10) * this.dpr, (y + height / 2) * this.dpr);

    // Symbol
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(orderBook.symbol, (x + width - 10) * this.dpr, (y + height / 2) * this.dpr);

    // Column headers
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';

    const colWidth = (width - 20) / 4;
    const headerY = y + height - 8;
    
    ctx.fillText('SIZE', (x + 10 + colWidth * 0.5) * this.dpr, headerY * this.dpr);
    ctx.fillText('PRICE', (x + 10 + colWidth * 1.5) * this.dpr, headerY * this.dpr);
    ctx.fillText('SIZE', (x + 10 + colWidth * 2.5) * this.dpr, headerY * this.dpr);
    ctx.fillText('TOTAL', (x + 10 + colWidth * 3.5) * this.dpr, headerY * this.dpr);
  }

  private drawAskRow(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    ask: { price: number; quantity: number; total: number },
    maxVolume: number,
    colors: ChartThemeColors
  ) {
    const ctx = this.ctx;
    const colWidth = width / 4;

    // Volume bar background
    if (this.config.showVolumeBars) {
      const barWidth = Math.min((ask.quantity / maxVolume) * colWidth * 2, colWidth * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(
        (x + colWidth * 2) * this.dpr,
        y * this.dpr,
        barWidth * this.dpr,
        height * this.dpr
      );
    }

    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    const textY = y + height / 2;

    // Empty bid size column
    ctx.fillStyle = '#444444';
    ctx.textAlign = 'center';
    ctx.fillText('-', (x + colWidth * 0.5) * this.dpr, textY * this.dpr);

    // Price
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.formatPrice(ask.price),
      (x + colWidth * 1.5) * this.dpr,
      textY * this.dpr
    );

    // Ask size
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.formatQuantity(ask.quantity),
      (x + colWidth * 2.5) * this.dpr,
      textY * this.dpr
    );

    // Cumulative total
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.formatQuantity(ask.total),
      (x + colWidth * 3.5) * this.dpr,
      textY * this.dpr
    );
  }

  private drawBidRow(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    bid: { price: number; quantity: number; total: number },
    maxVolume: number,
    colors: ChartThemeColors
  ) {
    const ctx = this.ctx;
    const colWidth = width / 4;

    // Volume bar background
    if (this.config.showVolumeBars) {
      const barWidth = Math.min((bid.quantity / maxVolume) * colWidth * 2, colWidth * 2);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fillRect(
        (x + colWidth * 2 - barWidth) * this.dpr,
        y * this.dpr,
        barWidth * this.dpr,
        height * this.dpr
      );
    }

    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    const textY = y + height / 2;

    // Bid size
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.formatQuantity(bid.quantity),
      (x + colWidth * 0.5) * this.dpr,
      textY * this.dpr
    );

    // Price
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.formatPrice(bid.price),
      (x + colWidth * 1.5) * this.dpr,
      textY * this.dpr
    );

    // Empty ask size column
    ctx.fillStyle = '#444444';
    ctx.textAlign = 'center';
    ctx.fillText('-', (x + colWidth * 2.5) * this.dpr, textY * this.dpr);

    // Cumulative total
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText(
      this.formatQuantity(bid.total),
      (x + colWidth * 3.5) * this.dpr,
      textY * this.dpr
    );
  }

  private drawSpreadRow(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    orderBook: OrderBookData
  ) {
    const ctx = this.ctx;

    // Highlight spread row
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);

    // Spread info
    ctx.font = `bold ${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    const textY = y + height / 2;

    // Mid price
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText(
      `↕ ${this.formatPrice(orderBook.midPrice)}`,
      (x + width * 0.25) * this.dpr,
      textY * this.dpr
    );

    // Spread
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Δ ${orderBook.spreadPercent.toFixed(3)}%`,
      (x + width * 0.75) * this.dpr,
      textY * this.dpr
    );
  }

  private drawFooter(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    orderBook: OrderBookData
  ) {
    const ctx = this.ctx;
    const padding = 10;

    // Imbalance bar
    if (this.config.showImbalance) {
      const barWidth = width - padding * 2;
      const barHeight = 6;
      const barY = y + (height - barHeight) / 2;
      
      // Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(
        (x + padding) * this.dpr,
        barY * this.dpr,
        barWidth * this.dpr,
        barHeight * this.dpr
      );

      // Imbalance indicator
      const imbalance = orderBook.imbalance; // -100 to +100
      const centerX = x + padding + barWidth / 2;
      const indicatorWidth = Math.abs(imbalance) / 100 * barWidth / 2;
      
      if (imbalance >= 0) {
        // More bids (bullish)
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(
          centerX * this.dpr,
          barY * this.dpr,
          indicatorWidth * this.dpr,
          barHeight * this.dpr
        );
      } else {
        // More asks (bearish)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(
          (centerX - indicatorWidth) * this.dpr,
          barY * this.dpr,
          indicatorWidth * this.dpr,
          barHeight * this.dpr
        );
      }

      // Center line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX * this.dpr, barY * this.dpr);
      ctx.lineTo(centerX * this.dpr, (barY + barHeight) * this.dpr);
      ctx.stroke();

      // Imbalance text
      ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = imbalance >= 0 ? '#22c55e' : '#ef4444';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${imbalance >= 0 ? '+' : ''}${imbalance.toFixed(1)}%`,
        (x + width - padding) * this.dpr,
        (y + height / 2) * this.dpr
      );
    }
  }

  // Format price based on value
  private formatPrice(price: number): string {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 1 });
    if (price >= 1000) return price.toFixed(2);
    if (price >= 100) return price.toFixed(2);
    if (price >= 10) return price.toFixed(3);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }

  // Format quantity
  private formatQuantity(qty: number): string {
    if (qty >= 1000000) return (qty / 1000000).toFixed(2) + 'M';
    if (qty >= 1000) return (qty / 1000).toFixed(2) + 'K';
    if (qty >= 1) return qty.toFixed(2);
    return qty.toFixed(4);
  }
}

export default DOMRenderer;
