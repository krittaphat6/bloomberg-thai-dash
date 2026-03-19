// Real-time Polymarket CLOB WebSocket — connects directly from browser

export interface PolymarketBookUpdate {
  event_type: 'book';
  asset_id: string;
  market: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
  timestamp: string;
  hash: string;
}

export interface PolymarketPriceChangeLevel {
  price?: string;
  size?: string;
  side?: 'BUY' | 'SELL';
  best_bid?: string;
  best_ask?: string;
  last_trade_price?: string;
}

export interface PolymarketPriceChange {
  event_type: 'price_change';
  asset_id: string;
  market: string;
  price_changes: PolymarketPriceChangeLevel[];
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

interface MutableOrderbook {
  bids: Map<string, string>;
  asks: Map<string, string>;
  timestamp: string;
  hash: string;
  market: string;
}

class PolymarketWebSocketService {
  private readonly WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnected = false;
  private manualDisconnect = false;

  private subscribedAssets: Set<string> = new Set();

  private bookSubscribers: Map<string, Set<BookCallback>> = new Map();
  private priceSubscribers: Map<string, Set<PriceCallback>> = new Map();
  private tradeSubscribers: Map<string, Set<TradeCallback>> = new Map();
  private statusSubscribers: Set<StatusCallback> = new Set();

  private latestBooks: Map<string, PolymarketBookUpdate> = new Map();
  private latestPrices: Map<string, PolymarketPriceChange> = new Map();
  private liveOrderbooks: Map<string, MutableOrderbook> = new Map();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    this.manualDisconnect = false;

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
          // Ignore non-JSON messages (ping/pong)
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
        this.ws = null;

        if (!this.manualDisconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[Polymarket WS] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.manualDisconnect = true;

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

    if (this.ws?.readyState === WebSocket.OPEN && this.subscribedAssets.size > 0) {
      this.sendSubscription();
      return;
    }

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect();
      return;
    }

    if (changed && this.ws?.readyState === WebSocket.CONNECTING) {
      // assets are already stored and will be sent on open
      return;
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
      this.liveOrderbooks.delete(id);
    }
  }

  forceResubscribe() {
    if (this.ws?.readyState === WebSocket.OPEN && this.subscribedAssets.size > 0) {
      this.sendSubscription();
    }
  }

  private sendSubscription() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = {
      assets_ids: Array.from(this.subscribedAssets),
      type: 'market',
      custom_feature_enabled: true,
    };

    this.ws.send(JSON.stringify(msg));
    console.log(`[Polymarket WS] Subscribed to ${this.subscribedAssets.size} assets`);
  }

  private buildMutableOrderbookFromSnapshot(bookData: PolymarketBookUpdate): MutableOrderbook {
    const bidMap = new Map<string, string>();
    const askMap = new Map<string, string>();

    for (const bid of bookData.bids || []) {
      bidMap.set(bid.price, bid.size);
    }

    for (const ask of bookData.asks || []) {
      askMap.set(ask.price, ask.size);
    }

    return {
      bids: bidMap,
      asks: askMap,
      timestamp: bookData.timestamp,
      hash: bookData.hash,
      market: bookData.market,
    };
  }

  private updateBookLevel(sideMap: Map<string, string>, price?: string, size?: string) {
    if (!price || size === undefined) return;

    const numericSize = parseFloat(size);
    if (Number.isFinite(numericSize) && numericSize > 0) {
      sideMap.set(price, size);
    } else {
      sideMap.delete(price);
    }
  }

  private applyPriceChange(orderbook: MutableOrderbook, change: PolymarketPriceChangeLevel) {
    if (change.side === 'BUY') {
      this.updateBookLevel(orderbook.bids, change.price, change.size);
    }

    if (change.side === 'SELL') {
      this.updateBookLevel(orderbook.asks, change.price, change.size);
    }

    if (change.best_bid && !orderbook.bids.has(change.best_bid)) {
      orderbook.bids.set(change.best_bid, orderbook.bids.get(change.best_bid) || '1');
    }

    if (change.best_ask && !orderbook.asks.has(change.best_ask)) {
      orderbook.asks.set(change.best_ask, orderbook.asks.get(change.best_ask) || '1');
    }
  }

  private handleMessage(data: any) {
    const eventType = data.event_type;
    const assetId = data.asset_id;
    if (!eventType || !assetId) return;

    switch (eventType) {
      case 'book': {
        const bookData = data as PolymarketBookUpdate;
        this.latestBooks.set(assetId, bookData);
        this.liveOrderbooks.set(assetId, this.buildMutableOrderbookFromSnapshot(bookData));

        this.bookSubscribers.get(assetId)?.forEach((cb) => cb(bookData));
        this.bookSubscribers.get('ALL')?.forEach((cb) => cb(bookData));
        break;
      }

      case 'price_change': {
        const priceData = data as PolymarketPriceChange;
        this.latestPrices.set(assetId, priceData);
        this.priceSubscribers.get(assetId)?.forEach((cb) => cb(priceData));
        this.priceSubscribers.get('ALL')?.forEach((cb) => cb(priceData));

        let orderbook = this.liveOrderbooks.get(assetId);

        if (!orderbook) {
          const existingSnapshot = this.latestBooks.get(assetId);
          if (existingSnapshot) {
            orderbook = this.buildMutableOrderbookFromSnapshot(existingSnapshot);
          } else {
            orderbook = {
              bids: new Map<string, string>(),
              asks: new Map<string, string>(),
              timestamp: priceData.timestamp,
              hash: '',
              market: priceData.market,
            };
          }
          this.liveOrderbooks.set(assetId, orderbook);
        }

        for (const change of priceData.price_changes || []) {
          this.applyPriceChange(orderbook, change);
        }

        orderbook.timestamp = priceData.timestamp;
        orderbook.market = priceData.market || orderbook.market;

        const reconstructed = this.reconstructBook(assetId, orderbook);
        this.latestBooks.set(assetId, reconstructed);
        this.bookSubscribers.get(assetId)?.forEach((cb) => cb(reconstructed));
        this.bookSubscribers.get('ALL')?.forEach((cb) => cb(reconstructed));
        break;
      }

      case 'last_trade_price': {
        const tradeData = data as PolymarketLastTrade;
        this.tradeSubscribers.get(assetId)?.forEach((cb) => cb(tradeData));
        this.tradeSubscribers.get('ALL')?.forEach((cb) => cb(tradeData));
        break;
      }
    }
  }

  private reconstructBook(assetId: string, orderbook: MutableOrderbook): PolymarketBookUpdate {
    const bids = Array.from(orderbook.bids.entries())
      .filter(([, size]) => parseFloat(size) > 0)
      .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
      .map(([price, size]) => ({ price, size }));

    const asks = Array.from(orderbook.asks.entries())
      .filter(([, size]) => parseFloat(size) > 0)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([price, size]) => ({ price, size }));

    return {
      event_type: 'book',
      asset_id: assetId,
      market: orderbook.market,
      bids,
      asks,
      timestamp: orderbook.timestamp,
      hash: orderbook.hash,
    };
  }

  onBook(assetId: string, callback: BookCallback): () => void {
    if (!this.bookSubscribers.has(assetId)) {
      this.bookSubscribers.set(assetId, new Set());
    }

    this.bookSubscribers.get(assetId)!.add(callback);

    const cached = this.latestBooks.get(assetId);
    if (cached) {
      setTimeout(() => callback(cached), 0);
    }

    return () => {
      this.bookSubscribers.get(assetId)?.delete(callback);
    };
  }

  onPriceChange(assetId: string, callback: PriceCallback): () => void {
    if (!this.priceSubscribers.has(assetId)) {
      this.priceSubscribers.set(assetId, new Set());
    }

    this.priceSubscribers.get(assetId)!.add(callback);

    const cached = this.latestPrices.get(assetId);
    if (cached) {
      setTimeout(() => callback(cached), 0);
    }

    return () => {
      this.priceSubscribers.get(assetId)?.delete(callback);
    };
  }

  onTrade(assetId: string, callback: TradeCallback): () => void {
    if (!this.tradeSubscribers.has(assetId)) {
      this.tradeSubscribers.set(assetId, new Set());
    }

    this.tradeSubscribers.get(assetId)!.add(callback);

    return () => {
      this.tradeSubscribers.get(assetId)?.delete(callback);
    };
  }

  onStatus(callback: StatusCallback): () => void {
    this.statusSubscribers.add(callback);
    callback(this.isConnected);

    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSubscribedCount(): number {
    return this.subscribedAssets.size;
  }

  getLatestBook(assetId: string): PolymarketBookUpdate | undefined {
    return this.latestBooks.get(assetId);
  }

  getLatestPrice(assetId: string): PolymarketPriceChange | undefined {
    return this.latestPrices.get(assetId);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
      }
    }, 10000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.manualDisconnect) return;

    this.reconnectAttempts++;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Polymarket WS] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[Polymarket WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.subscribedAssets.size > 0) {
        this.connect();
      }
    }, delay);
  }

  private notifyStatus(connected: boolean) {
    this.statusSubscribers.forEach((cb) => cb(connected));
  }
}

export const polymarketWS = new PolymarketWebSocketService();