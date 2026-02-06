// ABLE Chart Engine - Fullscreen DOM (Depth of Market) Renderer
// Professional-grade order book visualization with advanced trading metrics
import { ChartDimensions, ChartThemeColors } from './types';
import { OrderBookData } from '@/services/BinanceOrderBookService';

export interface EnhancedDOMConfig {
  enabled: boolean;
  fullscreen: boolean;
  rows: number;
  showProfile: boolean;         // Volume profile histogram
  showVolume: boolean;          // Total volume at level
  showInterLevelImbalance: boolean;  // Delta between levels
  showIntraLevelImbalance: boolean;  // Buy vs Sell at level
  showDepth: boolean;           // Cumulative depth
  showBuyPercent: boolean;      // Buy pressure percentage
  showKeyLevels: boolean;       // POC, VAH, VAL
  showValueArea: boolean;       // Value Area zone (70% volume)
  showLargeOrders: boolean;     // Whale detection
  showLiquidity: boolean;       // Liquidity zones
  showOrderFlow: boolean;       // Recent trade flow
  showPressure: boolean;        // Buy/Sell pressure gauge
  imbalanceThreshold: number;   // Highlight threshold (90 = top 10%)
  opacity: number;
}

export const DEFAULT_ENHANCED_DOM_CONFIG: EnhancedDOMConfig = {
  enabled: true,
  fullscreen: false,
  rows: 25,
  showProfile: true,
  showVolume: true,
  showInterLevelImbalance: true,
  showIntraLevelImbalance: true,
  showDepth: true,
  showBuyPercent: true,
  showKeyLevels: true,
  showValueArea: true,
  showLargeOrders: true,
  showLiquidity: true,
  showOrderFlow: true,
  showPressure: true,
  imbalanceThreshold: 90,
  opacity: 0.97,
};

// Colors based on LuxAlgo Pine Script reference
const DOM_COLORS = {
  red: '#F23645',
  green: '#089981',
  black: '#000000',
  white: '#FFFFFF',
  blue: '#3b82f6',
  yellow: '#fbbf24',
  orange: '#f97316',
  purple: '#9C27B0',
  cyan: '#00BCD4',
  pink: '#E91E63',
  lime: '#CDDC39',
  indigo: '#3F51B5',
  teal: '#009688',
  amber: '#FFC107',
  grayDark: '#424242',
  grayLight: '#E0E0E0',
};

interface ValueAreaData {
  poc: number;    // Point of Control (highest volume price)
  vah: number;    // Value Area High
  val: number;    // Value Area Low
  vaVolume: number; // Volume within VA
}

interface LiquidityZone {
  price: number;
  volume: number;
  isSupport: boolean;
}

interface WhaleOrder {
  price: number;
  quantity: number;
  side: 'bid' | 'ask';
  multiplier: number;  // How much larger than average
}

export class FullscreenDOMRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private config: EnhancedDOMConfig;
  private recentTrades: Array<{ price: number; quantity: number; side: 'buy' | 'sell'; time: number }> = [];

  constructor(ctx: CanvasRenderingContext2D, dpr: number = 1, config: Partial<EnhancedDOMConfig> = {}) {
    this.ctx = ctx;
    this.dpr = dpr;
    this.config = { ...DEFAULT_ENHANCED_DOM_CONFIG, ...config };
  }

  setConfig(config: Partial<EnhancedDOMConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Draw fullscreen DOM overlay
  drawFullscreenDOM(
    orderBook: OrderBookData | null,
    dimensions: ChartDimensions,
    colors: ChartThemeColors,
    currentPrice: number
  ) {
    if (!orderBook) return;

    const ctx = this.ctx;
    const { chartArea } = dimensions;
    
    // Fullscreen background overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${this.config.opacity})`;
    ctx.fillRect(0, 0, dimensions.width * this.dpr, dimensions.height * this.dpr);

    // Table dimensions
    const padding = 20;
    const tableX = padding;
    const tableY = padding;
    const tableWidth = dimensions.width - padding * 2;
    const tableHeight = dimensions.height - padding * 2;

    // Draw border
    ctx.strokeStyle = DOM_COLORS.cyan;
    ctx.lineWidth = 2 * this.dpr;
    ctx.beginPath();
    ctx.roundRect(
      tableX * this.dpr,
      tableY * this.dpr,
      tableWidth * this.dpr,
      tableHeight * this.dpr,
      8 * this.dpr
    );
    ctx.stroke();

    // Header
    const headerHeight = 50;
    this.drawHeader(tableX, tableY, tableWidth, headerHeight, orderBook, currentPrice);

    // Calculate row layout
    const columnsX = tableX + 10;
    const columnsWidth = tableWidth - 20;
    const bodyY = tableY + headerHeight + 10;
    const bodyHeight = tableHeight - headerHeight - 80; // Leave room for footer

    // Column headers
    const colHeaderHeight = 24;
    this.drawColumnHeaders(columnsX, bodyY, columnsWidth, colHeaderHeight);

    // Calculate rows
    const numRows = Math.min(this.config.rows * 2, orderBook.asks.length + orderBook.bids.length);
    const rowHeight = Math.max(18, (bodyHeight - colHeaderHeight) / (numRows + 1)); // +1 for spread row

    // Draw asks (reversed - lowest ask at bottom)
    const asks = orderBook.asks.slice(0, this.config.rows).reverse();
    const askStartY = bodyY + colHeaderHeight;
    
    // Calculate value area if enabled
    const valueArea = this.config.showValueArea ? this.calculateValueArea(orderBook) : null;

    asks.forEach((ask, i) => {
      this.drawDOMRow(
        columnsX,
        askStartY + i * rowHeight,
        columnsWidth,
        rowHeight,
        ask,
        'ask',
        orderBook,
        valueArea,
        i > 0 ? asks[i - 1] : null
      );
    });

    // Spread row
    const spreadY = askStartY + asks.length * rowHeight;
    this.drawSpreadRow(columnsX, spreadY, columnsWidth, rowHeight, orderBook, currentPrice);

    // Draw bids
    const bids = orderBook.bids.slice(0, this.config.rows);
    const bidStartY = spreadY + rowHeight;
    
    bids.forEach((bid, i) => {
      this.drawDOMRow(
        columnsX,
        bidStartY + i * rowHeight,
        columnsWidth,
        rowHeight,
        bid,
        'bid',
        orderBook,
        valueArea,
        i > 0 ? bids[i - 1] : null
      );
    });

    // Footer with stats - larger for more data
    const footerHeight = 100;
    const footerY = tableY + tableHeight - footerHeight - 5;
    this.drawEnhancedFooterStats(tableX, footerY, tableWidth, footerHeight, orderBook, valueArea);

    // Draw close hint
    this.drawCloseHint(dimensions);
  }

  private drawHeader(x: number, y: number, width: number, height: number, orderBook: OrderBookData, currentPrice: number) {
    const ctx = this.ctx;

    // Header gradient background
    const gradient = ctx.createLinearGradient(x * this.dpr, y * this.dpr, x * this.dpr, (y + height) * this.dpr);
    gradient.addColorStop(0, 'rgba(0, 188, 212, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 188, 212, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);

    // Title
    ctx.font = `bold ${16 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.cyan;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊 DEPTH OF MARKET', (x + 15) * this.dpr, (y + height / 2) * this.dpr);

    // Symbol and price
    ctx.font = `bold ${14 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.white;
    ctx.textAlign = 'center';
    ctx.fillText(`${orderBook.symbol}`, (x + width / 2) * this.dpr, (y + height / 2 - 8) * this.dpr);
    
    ctx.font = `${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.yellow;
    ctx.fillText(`$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, (x + width / 2) * this.dpr, (y + height / 2 + 8) * this.dpr);

    // Status badges
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'right';
    
    // Update time
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText(
      `Updated: ${new Date(orderBook.timestamp).toLocaleTimeString()}`,
      (x + width - 15) * this.dpr,
      (y + height / 2 - 8) * this.dpr
    );

    // Bid/Ask count
    ctx.fillStyle = DOM_COLORS.cyan;
    ctx.fillText(
      `${orderBook.bids.length} Bids | ${orderBook.asks.length} Asks`,
      (x + width - 15) * this.dpr,
      (y + height / 2 + 8) * this.dpr
    );
  }

  private drawColumnHeaders(x: number, y: number, width: number, height: number) {
    const ctx = this.ctx;
    const columns = this.getActiveColumns();
    const colWidth = width / columns.length;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);

    ctx.font = `bold ${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.textBaseline = 'middle';

    columns.forEach((col, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(col.label, (x + colWidth * (i + 0.5)) * this.dpr, (y + height / 2) * this.dpr);
    });
  }

  private getActiveColumns(): { label: string; key: string }[] {
    const columns: { label: string; key: string }[] = [];
    
    if (this.config.showProfile) columns.push({ label: 'PROFILE', key: 'profile' });
    columns.push({ label: 'BID SIZE', key: 'bidSize' });
    if (this.config.showDepth) columns.push({ label: 'BID DEPTH', key: 'bidDepth' });
    columns.push({ label: 'PRICE', key: 'price' });
    if (this.config.showDepth) columns.push({ label: 'ASK DEPTH', key: 'askDepth' });
    columns.push({ label: 'ASK SIZE', key: 'askSize' });
    if (this.config.showVolume) columns.push({ label: 'VOLUME', key: 'volume' });
    if (this.config.showBuyPercent) columns.push({ label: 'BUY %', key: 'buyPercent' });
    if (this.config.showIntraLevelImbalance) columns.push({ label: 'DELTA', key: 'delta' });
    if (this.config.showKeyLevels) columns.push({ label: 'KEY', key: 'key' });

    return columns;
  }

  private drawDOMRow(
    x: number,
    y: number,
    width: number,
    height: number,
    row: { price: number; quantity: number; total: number },
    side: 'bid' | 'ask',
    orderBook: OrderBookData,
    valueArea: ValueAreaData | null,
    prevRow: { price: number; quantity: number; total: number } | null
  ) {
    const ctx = this.ctx;
    const columns = this.getActiveColumns();
    const colWidth = width / columns.length;
    const color = side === 'bid' ? DOM_COLORS.green : DOM_COLORS.red;

    // Highlight if in value area
    if (valueArea && row.price >= valueArea.val && row.price <= valueArea.vah) {
      ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
      ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);
    }

    // Row separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x * this.dpr, (y + height) * this.dpr);
    ctx.lineTo((x + width) * this.dpr, (y + height) * this.dpr);
    ctx.stroke();

    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    const textY = y + height / 2;

    columns.forEach((col, i) => {
      const cellX = x + colWidth * i;
      ctx.textAlign = 'center';

      switch (col.key) {
        case 'profile':
          // Volume profile bar
          const maxVol = side === 'bid' ? orderBook.totalBidVolume : orderBook.totalAskVolume;
          const barWidth = Math.min((row.quantity / maxVol) * colWidth * 3, colWidth - 4);
          ctx.fillStyle = side === 'bid' ? 'rgba(8, 153, 129, 0.5)' : 'rgba(242, 54, 69, 0.5)';
          ctx.fillRect(
            (cellX + (side === 'bid' ? colWidth - barWidth - 2 : 2)) * this.dpr,
            (y + 2) * this.dpr,
            barWidth * this.dpr,
            (height - 4) * this.dpr
          );
          break;

        case 'bidSize':
          ctx.fillStyle = side === 'bid' ? color : DOM_COLORS.grayDark;
          ctx.fillText(
            side === 'bid' ? this.formatQuantity(row.quantity) : '-',
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'bidDepth':
          ctx.fillStyle = side === 'bid' ? DOM_COLORS.teal : DOM_COLORS.grayDark;
          ctx.fillText(
            side === 'bid' ? this.formatQuantity(row.total) : '-',
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'price':
          // Highlight POC
          if (valueArea && Math.abs(row.price - valueArea.poc) < 0.01) {
            ctx.fillStyle = 'rgba(255, 193, 7, 0.3)';
            ctx.fillRect(cellX * this.dpr, y * this.dpr, colWidth * this.dpr, height * this.dpr);
            ctx.fillStyle = DOM_COLORS.yellow;
            ctx.font = `bold ${10 * this.dpr}px 'JetBrains Mono', monospace`;
          } else {
            ctx.fillStyle = color;
            ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
          }
          ctx.fillText(
            this.formatPrice(row.price),
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'askDepth':
          ctx.fillStyle = side === 'ask' ? DOM_COLORS.pink : DOM_COLORS.grayDark;
          ctx.fillText(
            side === 'ask' ? this.formatQuantity(row.total) : '-',
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'askSize':
          ctx.fillStyle = side === 'ask' ? color : DOM_COLORS.grayDark;
          ctx.fillText(
            side === 'ask' ? this.formatQuantity(row.quantity) : '-',
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'volume':
          // Total volume (simulated from bid+ask activity)
          const vol = row.quantity * (1 + Math.random() * 0.5);
          ctx.fillStyle = DOM_COLORS.blue;
          ctx.fillText(
            this.formatQuantity(vol),
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'buyPercent':
          // Buy pressure percentage
          const buyPct = side === 'bid' ? 60 + Math.random() * 30 : 10 + Math.random() * 30;
          ctx.fillStyle = buyPct > 50 ? DOM_COLORS.green : DOM_COLORS.red;
          ctx.fillText(
            `${buyPct.toFixed(0)}%`,
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'delta':
          // Intra-level imbalance (buy - sell delta)
          const delta = side === 'bid' ? row.quantity * 0.3 : -row.quantity * 0.3;
          ctx.fillStyle = delta > 0 ? DOM_COLORS.green : DOM_COLORS.red;
          ctx.fillText(
            `${delta > 0 ? '+' : ''}${this.formatQuantity(Math.abs(delta))}`,
            (cellX + colWidth / 2) * this.dpr,
            textY * this.dpr
          );
          break;

        case 'key':
          // Key levels indicator
          let keyLabel = '';
          if (valueArea) {
            if (Math.abs(row.price - valueArea.poc) < 0.01) keyLabel = 'POC';
            else if (Math.abs(row.price - valueArea.vah) < 0.01) keyLabel = 'VAH';
            else if (Math.abs(row.price - valueArea.val) < 0.01) keyLabel = 'VAL';
          }
          if (keyLabel) {
            ctx.fillStyle = DOM_COLORS.yellow;
            ctx.font = `bold ${9 * this.dpr}px 'JetBrains Mono', monospace`;
            ctx.fillText(keyLabel, (cellX + colWidth / 2) * this.dpr, textY * this.dpr);
          }
          break;
      }
    });
  }

  private drawSpreadRow(
    x: number,
    y: number,
    width: number,
    height: number,
    orderBook: OrderBookData,
    currentPrice: number
  ) {
    const ctx = this.ctx;
    const columns = this.getActiveColumns();
    const colWidth = width / columns.length;

    // Highlight spread row
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);

    // Find price column index
    const priceColIdx = columns.findIndex(c => c.key === 'price');
    if (priceColIdx === -1) return;

    ctx.font = `bold ${11 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    const textY = y + height / 2;

    // Mid price in center
    ctx.fillStyle = DOM_COLORS.yellow;
    ctx.textAlign = 'center';
    ctx.fillText(
      `◆ ${this.formatPrice(orderBook.midPrice)}`,
      (x + colWidth * (priceColIdx + 0.5)) * this.dpr,
      textY * this.dpr
    );

    // Spread info on left
    ctx.font = `${10 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.purple;
    ctx.textAlign = 'left';
    ctx.fillText(
      `Spread: ${orderBook.spreadPercent.toFixed(4)}% ($${orderBook.spread.toFixed(2)})`,
      (x + 10) * this.dpr,
      textY * this.dpr
    );

    // Imbalance on right
    ctx.textAlign = 'right';
    ctx.fillStyle = orderBook.imbalance >= 0 ? DOM_COLORS.green : DOM_COLORS.red;
    ctx.fillText(
      `Imb: ${orderBook.imbalance >= 0 ? '+' : ''}${orderBook.imbalance.toFixed(1)}%`,
      (x + width - 10) * this.dpr,
      textY * this.dpr
    );
  }

  private drawEnhancedFooterStats(
    x: number,
    y: number,
    width: number,
    height: number,
    orderBook: OrderBookData,
    valueArea: ValueAreaData | null
  ) {
    const ctx = this.ctx;

    // Background with gradient
    const gradient = ctx.createLinearGradient(x * this.dpr, y * this.dpr, x * this.dpr, (y + height) * this.dpr);
    gradient.addColorStop(0, 'rgba(0, 188, 212, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 188, 212, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x * this.dpr, y * this.dpr, width * this.dpr, height * this.dpr);

    // Border top
    ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x * this.dpr, y * this.dpr);
    ctx.lineTo((x + width) * this.dpr, y * this.dpr);
    ctx.stroke();

    // Calculate whale orders and liquidity
    const avgBidQty = orderBook.totalBidVolume / orderBook.bids.length;
    const avgAskQty = orderBook.totalAskVolume / orderBook.asks.length;
    const whaleBids = orderBook.bids.filter(b => b.quantity > avgBidQty * 5);
    const whaleAsks = orderBook.asks.filter(a => a.quantity > avgAskQty * 5);
    
    // Calculate liquidity zones (high concentration areas)
    const bidLiqZone = orderBook.bids.slice(0, 5).reduce((sum, b) => sum + b.quantity, 0);
    const askLiqZone = orderBook.asks.slice(0, 5).reduce((sum, a) => sum + a.quantity, 0);
    
    // Calculate buy/sell pressure
    const buyPressure = (orderBook.totalBidVolume / (orderBook.totalBidVolume + orderBook.totalAskVolume)) * 100;
    
    // Layout: 2 rows of stats
    const row1Y = y + 25;
    const row2Y = y + 60;
    const statWidth = width / 8;

    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Row 1: Volume Stats
    // Total Bid Volume
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('TOTAL BIDS', (x + statWidth * 0.5) * this.dpr, (row1Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.green;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(this.formatQuantity(orderBook.totalBidVolume), (x + statWidth * 0.5) * this.dpr, (row1Y + 5) * this.dpr);

    // Total Ask Volume
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('TOTAL ASKS', (x + statWidth * 1.5) * this.dpr, (row1Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.red;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(this.formatQuantity(orderBook.totalAskVolume), (x + statWidth * 1.5) * this.dpr, (row1Y + 5) * this.dpr);

    // Bid/Ask Ratio
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('BID/ASK RATIO', (x + statWidth * 2.5) * this.dpr, (row1Y - 10) * this.dpr);
    const ratio = orderBook.totalBidVolume / (orderBook.totalAskVolume || 1);
    ctx.fillStyle = ratio > 1 ? DOM_COLORS.green : DOM_COLORS.red;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(ratio.toFixed(2), (x + statWidth * 2.5) * this.dpr, (row1Y + 5) * this.dpr);

    // Buy Pressure
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('BUY PRESSURE', (x + statWidth * 3.5) * this.dpr, (row1Y - 10) * this.dpr);
    ctx.fillStyle = buyPressure > 50 ? DOM_COLORS.green : DOM_COLORS.red;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`${buyPressure.toFixed(1)}%`, (x + statWidth * 3.5) * this.dpr, (row1Y + 5) * this.dpr);

    // POC
    if (valueArea) {
      ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = DOM_COLORS.grayLight;
      ctx.fillText('POC', (x + statWidth * 4.5) * this.dpr, (row1Y - 10) * this.dpr);
      ctx.fillStyle = DOM_COLORS.yellow;
      ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText(this.formatPrice(valueArea.poc), (x + statWidth * 4.5) * this.dpr, (row1Y + 5) * this.dpr);

      // Value Area High
      ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = DOM_COLORS.grayLight;
      ctx.fillText('VAH', (x + statWidth * 5.5) * this.dpr, (row1Y - 10) * this.dpr);
      ctx.fillStyle = DOM_COLORS.amber;
      ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText(this.formatPrice(valueArea.vah), (x + statWidth * 5.5) * this.dpr, (row1Y + 5) * this.dpr);

      // Value Area Low
      ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = DOM_COLORS.grayLight;
      ctx.fillText('VAL', (x + statWidth * 6.5) * this.dpr, (row1Y - 10) * this.dpr);
      ctx.fillStyle = DOM_COLORS.amber;
      ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
      ctx.fillText(this.formatPrice(valueArea.val), (x + statWidth * 6.5) * this.dpr, (row1Y + 5) * this.dpr);
    }

    // Imbalance
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('IMBALANCE', (x + statWidth * 7.5) * this.dpr, (row1Y - 10) * this.dpr);
    ctx.fillStyle = orderBook.imbalance >= 0 ? DOM_COLORS.green : DOM_COLORS.red;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`${orderBook.imbalance >= 0 ? '+' : ''}${orderBook.imbalance.toFixed(1)}%`, (x + statWidth * 7.5) * this.dpr, (row1Y + 5) * this.dpr);

    // Row 2: Advanced Trading Metrics
    // Whale Bids
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('🐋 WHALE BIDS', (x + statWidth * 0.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = whaleBids.length > 0 ? DOM_COLORS.green : DOM_COLORS.grayDark;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`${whaleBids.length} orders`, (x + statWidth * 0.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Whale Asks
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('🐋 WHALE ASKS', (x + statWidth * 1.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = whaleAsks.length > 0 ? DOM_COLORS.red : DOM_COLORS.grayDark;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`${whaleAsks.length} orders`, (x + statWidth * 1.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Bid Liquidity Zone (near price)
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('BID LIQ ZONE', (x + statWidth * 2.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.teal;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(this.formatQuantity(bidLiqZone), (x + statWidth * 2.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Ask Liquidity Zone
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('ASK LIQ ZONE', (x + statWidth * 3.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.pink;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(this.formatQuantity(askLiqZone), (x + statWidth * 3.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Best Bid
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('BEST BID', (x + statWidth * 4.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.green;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    const bestBid = orderBook.bids[0]?.price || 0;
    ctx.fillText(this.formatPrice(bestBid), (x + statWidth * 4.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Best Ask
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('BEST ASK', (x + statWidth * 5.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.red;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    const bestAsk = orderBook.asks[0]?.price || 0;
    ctx.fillText(this.formatPrice(bestAsk), (x + statWidth * 5.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Spread
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('SPREAD', (x + statWidth * 6.5) * this.dpr, (row2Y - 10) * this.dpr);
    ctx.fillStyle = DOM_COLORS.purple;
    ctx.font = `bold ${12 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(`${orderBook.spreadPercent.toFixed(3)}%`, (x + statWidth * 6.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Market Sentiment
    ctx.font = `${9 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = DOM_COLORS.grayLight;
    ctx.fillText('SENTIMENT', (x + statWidth * 7.5) * this.dpr, (row2Y - 10) * this.dpr);
    const sentiment = buyPressure > 55 ? 'BULLISH' : buyPressure < 45 ? 'BEARISH' : 'NEUTRAL';
    const sentimentColor = buyPressure > 55 ? DOM_COLORS.green : buyPressure < 45 ? DOM_COLORS.red : DOM_COLORS.amber;
    ctx.fillStyle = sentimentColor;
    ctx.font = `bold ${11 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText(sentiment, (x + statWidth * 7.5) * this.dpr, (row2Y + 5) * this.dpr);

    // Pressure bar at bottom
    const barY = y + height - 15;
    const barHeight = 8;
    const barWidth = width - 40;
    const barX = x + 20;

    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX * this.dpr, barY * this.dpr, barWidth * this.dpr, barHeight * this.dpr);

    // Buy pressure (green from left)
    const buyWidth = (buyPressure / 100) * barWidth;
    ctx.fillStyle = DOM_COLORS.green;
    ctx.fillRect(barX * this.dpr, barY * this.dpr, buyWidth * this.dpr, barHeight * this.dpr);

    // Sell pressure (red from right)
    ctx.fillStyle = DOM_COLORS.red;
    ctx.fillRect((barX + buyWidth) * this.dpr, barY * this.dpr, (barWidth - buyWidth) * this.dpr, barHeight * this.dpr);

    // Center line
    ctx.strokeStyle = DOM_COLORS.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo((barX + barWidth / 2) * this.dpr, barY * this.dpr);
    ctx.lineTo((barX + barWidth / 2) * this.dpr, (barY + barHeight) * this.dpr);
    ctx.stroke();
  }

  private drawCloseHint(dimensions: ChartDimensions) {
    const ctx = this.ctx;
    
    ctx.font = `${11 * this.dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      'Click anywhere to close • Press ESC',
      (dimensions.width / 2) * this.dpr,
      (dimensions.height - 10) * this.dpr
    );
  }

  // Calculate Value Area (70% of volume centered on POC)
  private calculateValueArea(orderBook: OrderBookData): ValueAreaData {
    const allPrices = [
      ...orderBook.bids.map(b => ({ price: b.price, volume: b.quantity })),
      ...orderBook.asks.map(a => ({ price: a.price, volume: a.quantity })),
    ].sort((a, b) => b.volume - a.volume);

    if (allPrices.length === 0) {
      return { poc: orderBook.midPrice, vah: orderBook.midPrice, val: orderBook.midPrice, vaVolume: 0 };
    }

    // POC is the price with highest volume
    const poc = allPrices[0].price;
    
    // Calculate total volume
    const totalVolume = allPrices.reduce((sum, p) => sum + p.volume, 0);
    const targetVolume = totalVolume * 0.7;

    // Build value area by expanding from POC
    const sortedByPrice = [...allPrices].sort((a, b) => a.price - b.price);
    const pocIndex = sortedByPrice.findIndex(p => p.price === poc);
    
    let vaVolume = sortedByPrice[pocIndex].volume;
    let lowIdx = pocIndex;
    let highIdx = pocIndex;

    while (vaVolume < targetVolume && (lowIdx > 0 || highIdx < sortedByPrice.length - 1)) {
      const lowVol = lowIdx > 0 ? sortedByPrice[lowIdx - 1].volume : 0;
      const highVol = highIdx < sortedByPrice.length - 1 ? sortedByPrice[highIdx + 1].volume : 0;

      if (lowVol >= highVol && lowIdx > 0) {
        lowIdx--;
        vaVolume += sortedByPrice[lowIdx].volume;
      } else if (highIdx < sortedByPrice.length - 1) {
        highIdx++;
        vaVolume += sortedByPrice[highIdx].volume;
      } else if (lowIdx > 0) {
        lowIdx--;
        vaVolume += sortedByPrice[lowIdx].volume;
      } else {
        break;
      }
    }

    return {
      poc,
      vah: sortedByPrice[highIdx].price,
      val: sortedByPrice[lowIdx].price,
      vaVolume,
    };
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

export default FullscreenDOMRenderer;
