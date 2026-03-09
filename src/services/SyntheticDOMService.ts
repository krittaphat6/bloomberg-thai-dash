// Synthetic DOM (Depth of Market) Generator
// Creates order book data from candle volume for non-crypto assets
// This allows DeepCharts to work with indices, forex, stocks, etc.

import { OrderBookData, OrderBookLevel } from './BinanceOrderBookService';
import { OHLCVData } from './ChartDataService';

type SyntheticDOMCallback = (data: OrderBookData) => void;
type ConnectionCallback = (connected: boolean) => void;

class SyntheticDOMService {
  private subscribers: Set<SyntheticDOMCallback> = new Set();
  private connectionSubscribers: Set<ConnectionCallback> = new Set();
  private orderBook: OrderBookData | null = null;
  private isConnected = false;
  private currentSymbol: string | null = null;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private candles: OHLCVData[] = [];

  /**
   * Generate synthetic order book from candle data
   * Uses volume distribution and price action to simulate bid/ask levels
   */
  updateFromCandles(symbol: string, candles: OHLCVData[], depth: number = 20) {
    this.currentSymbol = symbol;
    this.candles = candles;

    if (candles.length < 5) return;

    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const currentPrice = lastCandle.close;
    const volume = lastCandle.volume;

    // Calculate ATR from recent candles for tick sizing
    const lookback = Math.min(20, candles.length);
    let atrSum = 0;
    for (let i = candles.length - lookback; i < candles.length; i++) {
      const c = candles[i];
      const prev = i > 0 ? candles[i - 1] : c;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
      atrSum += tr;
    }
    const atr = atrSum / lookback;
    const tickSize = atr / depth; // Each level = ATR / depth

    // Calculate buy/sell pressure from recent candles
    const recentCandles = candles.slice(-10);
    let totalBuyPressure = 0;
    let totalSellPressure = 0;
    for (const c of recentCandles) {
      const range = c.high - c.low || 0.0001;
      totalBuyPressure += (c.close - c.low) / range;
      totalSellPressure += (c.high - c.close) / range;
    }
    const buyRatio = totalBuyPressure / (totalBuyPressure + totalSellPressure);

    // Generate bid levels (below current price)
    const bids: OrderBookLevel[] = [];
    let bidCumTotal = 0;
    for (let i = 0; i < depth; i++) {
      const price = currentPrice - (i + 1) * tickSize;
      // Volume decreases further from price, with randomization from recent volume
      const distanceFactor = Math.exp(-i * 0.15);
      const baseQty = (volume * buyRatio / depth) * distanceFactor;
      // Add variation based on historical volume at this price level
      const priceVariation = this.getHistoricalVolumeAt(price, tickSize, candles);
      const quantity = baseQty * (1 + priceVariation * 0.5);
      bidCumTotal += quantity;
      bids.push({ price, quantity, total: bidCumTotal });
    }

    // Generate ask levels (above current price)
    const asks: OrderBookLevel[] = [];
    let askCumTotal = 0;
    for (let i = 0; i < depth; i++) {
      const price = currentPrice + (i + 1) * tickSize;
      const distanceFactor = Math.exp(-i * 0.15);
      const baseQty = (volume * (1 - buyRatio) / depth) * distanceFactor;
      const priceVariation = this.getHistoricalVolumeAt(price, tickSize, candles);
      const quantity = baseQty * (1 + priceVariation * 0.5);
      askCumTotal += quantity;
      asks.push({ price, quantity, total: askCumTotal });
    }

    const totalBidVolume = bids.reduce((s, b) => s + b.quantity, 0);
    const totalAskVolume = asks.reduce((s, a) => s + a.quantity, 0);
    const totalVolume = totalBidVolume + totalAskVolume;
    const bestBid = bids[0]?.price || currentPrice;
    const bestAsk = asks[0]?.price || currentPrice;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
    const imbalance = totalVolume > 0 ? ((totalBidVolume - totalAskVolume) / totalVolume) * 100 : 0;

    this.orderBook = {
      symbol,
      lastUpdateId: Date.now(),
      bids,
      asks,
      timestamp: Date.now(),
      midPrice,
      spread,
      spreadPercent,
      totalBidVolume,
      totalAskVolume,
      imbalance,
    };

    this.isConnected = true;
    this.notifySubscribers();
    this.notifyConnectionStatus(true);
  }

  /**
   * Look at historical candles to find volume concentration at a price level
   */
  private getHistoricalVolumeAt(price: number, tickSize: number, candles: OHLCVData[]): number {
    const lookback = Math.min(50, candles.length);
    let volumeAtLevel = 0;
    let totalVolume = 0;

    for (let i = candles.length - lookback; i < candles.length; i++) {
      const c = candles[i];
      totalVolume += c.volume;
      // Check if this candle's range includes the price level
      if (price >= c.low - tickSize && price <= c.high + tickSize) {
        volumeAtLevel += c.volume;
      }
    }

    return totalVolume > 0 ? volumeAtLevel / totalVolume : 0;
  }

  connect(symbol: string) {
    this.currentSymbol = symbol;
    // Synthetic DOM doesn't need a connection - it's generated from candle data
    this.isConnected = true;
    this.notifyConnectionStatus(true);
  }

  disconnect() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.currentSymbol = null;
    this.orderBook = null;
    this.isConnected = false;
    this.notifyConnectionStatus(false);
  }

  subscribe(callback: SyntheticDOMCallback): () => void {
    this.subscribers.add(callback);
    if (this.orderBook) callback(this.orderBook);
    return () => { this.subscribers.delete(callback); };
  }

  subscribeToConnection(callback: ConnectionCallback): () => void {
    this.connectionSubscribers.add(callback);
    callback(this.isConnected);
    return () => { this.connectionSubscribers.delete(callback); };
  }

  getOrderBook(): OrderBookData | null {
    return this.orderBook;
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  private notifySubscribers() {
    if (!this.orderBook) return;
    this.subscribers.forEach(cb => cb(this.orderBook!));
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionSubscribers.forEach(cb => cb(connected));
  }
}

export const syntheticDOM = new SyntheticDOMService();
