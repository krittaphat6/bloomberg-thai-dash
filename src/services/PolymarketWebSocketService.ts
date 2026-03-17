// Real-time Polymarket CLOB WebSocket — connects directly from browser
// Pattern: same as BinanceWebSocketService.ts

export interface PolymarketBookUpdate {
  event_type: 'book';
  asset_id: string;
  market: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
  timestamp: string;
  hash: string;
}

export interface PolymarketPriceChange {
  event_type: 'price_change';
  asset_id: string;
  market: string;
  price_changes: {
    best_bid: string;
    best_ask: string;
    last_trade_price: string;
  }[];
  timestamp: string;
}

export interface PolymarketLastTrade {
  event_type: 'last_trade_price';
  asset_id: string;
  market: string;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  timestamp: string;
}

export type PolymarketWSEvent = PolymarketBookUpdate | PolymarketPriceChange | PolymarketLastTrade;

type BookCallback = (data: PolymarketBookUpdate) => void;
type PriceCallback = (data: PolymarketPriceChange) => void;
type TradeCallback = (data: PolymarketLastTrade) => void;
type StatusCallback = (connected: boolean) => void;

class PolymarketWebSocketService {
  private readonly WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnected = false;

  private subscribedAssets: Set<string> = new Set();

  private bookSubscribers: Map<string, Set<BookCallback>> = new Map();
  private priceSubscribers: Map<string, Set<PriceCallback>> = new Map();
  private tradeSubscribers: Map<string, Set<TradeCallback>> = new Map();
  private statusSubscribers: Set<StatusCallback> = new Set();

  private latestBooks: Map<string, PolymarketBookUpdate> = new Map();
  private latestPrices: Map<string, PolymarketPriceChange> = new Map();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('[Polymarket WS] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus(true);

        if (this.subscribedAssets.size > 0) {
          this.sendSubscription();
        }
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const events = Array.isArray(raw) ? raw : [raw];
          for (const data of events) {
            this.handleMessage(data);
          }
        } catch {
          // Ignore parse errors (ping/pong)
        }
      };

      this.ws.onerror = () => {
        console.warn('[Polymarket WS] Connection error');
        this.isConnected = false;
        this.notifyStatus(false);
      };

      this.ws.onclose = () => {
        console.log('[Polymarket WS] Disconnected');
        this.isConnected = false;
        this.stopPing();
        this.notifyStatus(false);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[Polymarket WS] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyStatus(false);
  }

  subscribeToAssets(assetIds: string[]) {
    let changed = false;
    for (const id of assetIds) {
      if (id && !this.subscribedAssets.has(id)) {
        this.subscribedAssets.add(id);
        changed = true;
      }
    }

    if (changed && this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription();
    } else if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
  }

  unsubscribeFromAssets(assetIds: string[]) {
    for (const id of assetIds) {
      this.subscribedAssets.delete(id);
      this.bookSubscribers.delete(id);
      this.priceSubscribers.delete(id);
      this.tradeSubscribers.delete(id);
      this.latestBooks.delete(id);
      this.latestPrices.delete(id);
    }
  }

  private sendSubscription() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      assets_ids: Array.from(this.subscribedAssets),
      type: 'market',
    };
    this.ws.send(JSON.stringify(msg));
    console.log(`[Polymarket WS] Subscribed to ${this.subscribedAssets.size} assets`);
  }

  private handleMessage(data: any) {
    const eventType = data.event_type;
    const assetId = data.asset_id;
    if (!eventType || !assetId) return;

    switch (eventType) {
      case 'book': {
        const bookData = data as PolymarketBookUpdate;
        this.latestBooks.set(assetId, bookData);
        this.bookSubscribers.get(assetId)?.forEach(cb => cb(bookData));
        this.bookSubscribers.get('ALL')?.forEach(cb => cb(bookData));
        break;
      }
      case 'price_change': {
        const priceData = data as PolymarketPriceChange;
        this.latestPrices.set(assetId, priceData);
        this.priceSubscribers.get(assetId)?.forEach(cb => cb(priceData));
        this.priceSubscribers.get('ALL')?.forEach(cb => cb(priceData));
        break;
      }
      case 'last_trade_price': {
        const tradeData = data as PolymarketLastTrade;
        this.tradeSubscribers.get(assetId)?.forEach(cb => cb(tradeData));
        this.tradeSubscribers.get('ALL')?.forEach(cb => cb(tradeData));
        break;
      }
    }
  }

  onBook(assetId: string, callback: BookCallback): () => void {
    if (!this.bookSubscribers.has(assetId)) {
      this.bookSubscribers.set(assetId, new Set());
    }
    this.bookSubscribers.get(assetId)!.add(callback);

    const cached = this.latestBooks.get(assetId);
    if (cached) setTimeout(() => callback(cached), 0);

    return () => { this.bookSubscribers.get(assetId)?.delete(callback); };
  }

  onPriceChange(assetId: string, callback: PriceCallback): () => void {
    if (!this.priceSubscribers.has(assetId)) {
      this.priceSubscribers.set(assetId, new Set());
    }
    this.priceSubscribers.get(assetId)!.add(callback);

    const cached = this.latestPrices.get(assetId);
    if (cached) setTimeout(() => callback(cached), 0);

    return () => { this.priceSubscribers.get(assetId)?.delete(callback); };
  }

  onTrade(assetId: string, callback: TradeCallback): () => void {
    if (!this.tradeSubscribers.has(assetId)) {
      this.tradeSubscribers.set(assetId, new Set());
    }
    this.tradeSubscribers.get(assetId)!.add(callback);

    return () => { this.tradeSubscribers.get(assetId)?.delete(callback); };
  }

  onStatus(callback: StatusCallback): () => void {
    this.statusSubscribers.add(callback);
    callback(this.isConnected);
    return () => { this.statusSubscribers.delete(callback); };
  }

  getConnectionStatus(): boolean { return this.isConnected; }
  getSubscribedCount(): number { return this.subscribedAssets.size; }
  getLatestBook(assetId: string): PolymarketBookUpdate | undefined { return this.latestBooks.get(assetId); }
  getLatestPrice(assetId: string): PolymarketPriceChange | undefined { return this.latestPrices.get(assetId); }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
      }
    }, 10000);
  }

  private stopPing() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Polymarket WS] Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[Polymarket WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.subscribedAssets.size > 0) this.connect();
    }, delay);
  }

  private notifyStatus(connected: boolean) {
    this.statusSubscribers.forEach(cb => cb(connected));
  }
}

export const polymarketWS = new PolymarketWebSocketService();
