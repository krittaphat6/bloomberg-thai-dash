// Binance Order Book Service for Real-time DOM (Depth of Market) Data

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number; // Cumulative total
}

export interface OrderBookData {
  symbol: string;
  lastUpdateId: number;
  bids: OrderBookLevel[]; // Buy orders (sorted high to low)
  asks: OrderBookLevel[]; // Sell orders (sorted low to high)
  timestamp: number;
  midPrice: number;
  spread: number;
  spreadPercent: number;
  totalBidVolume: number;
  totalAskVolume: number;
  imbalance: number; // Positive = more bids, Negative = more asks
}

export interface DOMRow {
  price: number;
  bidSize: number;
  askSize: number;
  bidTotal: number;
  askTotal: number;
  isCurrentPrice: boolean;
  delta: number; // bid - ask at this level
  imbalancePercent: number;
}

type OrderBookCallback = (data: OrderBookData) => void;
type ConnectionCallback = (connected: boolean) => void;

class BinanceOrderBookService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSymbol: string | null = null;
  private orderBook: OrderBookData | null = null;
  private subscribers: Set<OrderBookCallback> = new Set();
  private connectionSubscribers: Set<ConnectionCallback> = new Set();
  private isConnected = false;
  private depth = 20; // Number of levels to track

  // Connect to order book stream for a symbol
  connect(symbol: string, depth: number = 20) {
    this.depth = depth;
    
    // Disconnect from current if different symbol
    if (this.currentSymbol && this.currentSymbol !== symbol) {
      this.disconnect();
    }

    this.currentSymbol = symbol.toUpperCase();
    
    // First, fetch initial snapshot
    this.fetchSnapshot().then(() => {
      this.connectWebSocket();
    });
  }

  // Fetch initial order book snapshot via proxy
  private async fetchSnapshot() {
    if (!this.currentSymbol) return;

    try {
      // Use Supabase edge function proxy to avoid CORS
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('market-data-proxy', {
        body: { 
          action: 'depth',
          symbol: this.currentSymbol,
          limit: this.depth * 2 
        }
      });
      
      if (error || !data?.success) {
        throw new Error(error?.message || 'Failed to fetch order book');
      }
      
      // Process the returned data
      this.orderBook = {
        symbol: this.currentSymbol,
        lastUpdateId: data.data.lastUpdateId,
        bids: data.data.bids,
        asks: data.data.asks,
        timestamp: Date.now(),
        midPrice: data.data.midPrice,
        spread: data.data.spread,
        spreadPercent: data.data.spreadPercent,
        totalBidVolume: data.data.totalBidVolume,
        totalAskVolume: data.data.totalAskVolume,
        imbalance: data.data.imbalance,
      };
      
      this.notifySubscribers();
      
      // Start polling for updates (WebSocket blocked by CORS)
      this.startPolling();
    } catch (error) {
      console.error('[OrderBook] Failed to fetch snapshot:', error);
    }
  }

  // Poll for updates instead of WebSocket (CORS workaround)
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  
  private startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    
    this.pollingTimer = setInterval(() => {
      this.fetchSnapshot();
    }, 1000); // Poll every 1 second
    
    this.isConnected = true;
    this.notifyConnectionStatus(true);
  }

  // Parse price/quantity levels
  private parseLevels(levels: [string, string][], side: 'bid' | 'ask'): OrderBookLevel[] {
    let cumTotal = 0;
    const parsed = levels.slice(0, this.depth).map(([price, qty]) => {
      const p = parseFloat(price);
      const q = parseFloat(qty);
      cumTotal += q;
      return { price: p, quantity: q, total: cumTotal };
    });
    
    return parsed;
  }

  // Build complete order book data
  private buildOrderBook(bids: OrderBookLevel[], asks: OrderBookLevel[], lastUpdateId: number): OrderBookData {
    const symbol = this.currentSymbol || '';
    
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
    
    const totalBidVolume = bids.reduce((sum, l) => sum + l.quantity, 0);
    const totalAskVolume = asks.reduce((sum, l) => sum + l.quantity, 0);
    const totalVolume = totalBidVolume + totalAskVolume;
    const imbalance = totalVolume > 0 ? ((totalBidVolume - totalAskVolume) / totalVolume) * 100 : 0;

    return {
      symbol,
      lastUpdateId,
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
  }

  // Connect to WebSocket disabled - using polling instead due to CORS
  private connectWebSocket() {
    // WebSocket connections are blocked by CORS in browser
    // Using polling via edge function proxy instead
    console.log(`[OrderBook] Using polling mode for ${this.currentSymbol}`);
  }

  // Process real-time depth update - not used in polling mode
  private processUpdate(data: any) {
    // Handled by fetchSnapshot polling
  }

  // Disconnect
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentSymbol = null;
    this.orderBook = null;
    this.isConnected = false;
    this.notifyConnectionStatus(false);
  }

  // Subscribe to order book updates
  subscribe(callback: OrderBookCallback): () => void {
    this.subscribers.add(callback);
    
    // Send current data immediately if available
    if (this.orderBook) {
      callback(this.orderBook);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Subscribe to connection status
  subscribeToConnection(callback: ConnectionCallback): () => void {
    this.connectionSubscribers.add(callback);
    callback(this.isConnected);
    
    return () => {
      this.connectionSubscribers.delete(callback);
    };
  }

  // Notify all subscribers
  private notifySubscribers() {
    if (!this.orderBook) return;
    this.subscribers.forEach(cb => cb(this.orderBook!));
  }

  // Notify connection status
  private notifyConnectionStatus(connected: boolean) {
    this.connectionSubscribers.forEach(cb => cb(connected));
  }

  // Get DOM rows for rendering
  getDOMRows(currentPrice: number, numRows: number = 10): DOMRow[] {
    if (!this.orderBook) return [];

    const rows: DOMRow[] = [];
    const bids = this.orderBook.bids.slice(0, numRows);
    const asks = this.orderBook.asks.slice(0, numRows);

    // Calculate tick size based on price
    const tickSize = this.calculateTickSize(currentPrice);

    // Build price levels around current price
    const midPrice = this.orderBook.midPrice;
    const halfRows = Math.floor(numRows / 2);

    for (let i = halfRows - 1; i >= 0; i--) {
      // Ask levels (above mid price)
      const askPrice = midPrice + (i + 1) * tickSize;
      const ask = asks.find(l => Math.abs(l.price - askPrice) < tickSize / 2);
      
      rows.push({
        price: askPrice,
        bidSize: 0,
        askSize: ask?.quantity || 0,
        bidTotal: 0,
        askTotal: ask?.total || 0,
        isCurrentPrice: false,
        delta: -(ask?.quantity || 0),
        imbalancePercent: -100,
      });
    }

    // Current price row
    rows.push({
      price: midPrice,
      bidSize: bids[0]?.quantity || 0,
      askSize: asks[0]?.quantity || 0,
      bidTotal: bids[0]?.total || 0,
      askTotal: asks[0]?.total || 0,
      isCurrentPrice: true,
      delta: (bids[0]?.quantity || 0) - (asks[0]?.quantity || 0),
      imbalancePercent: this.orderBook.imbalance,
    });

    for (let i = 0; i < halfRows; i++) {
      // Bid levels (below mid price)
      const bidPrice = midPrice - (i + 1) * tickSize;
      const bid = bids.find(l => Math.abs(l.price - bidPrice) < tickSize / 2);
      
      rows.push({
        price: bidPrice,
        bidSize: bid?.quantity || 0,
        askSize: 0,
        bidTotal: bid?.total || 0,
        askTotal: 0,
        isCurrentPrice: false,
        delta: bid?.quantity || 0,
        imbalancePercent: 100,
      });
    }

    return rows;
  }

  // Calculate appropriate tick size
  private calculateTickSize(price: number): number {
    if (price >= 10000) return 10;
    if (price >= 1000) return 1;
    if (price >= 100) return 0.1;
    if (price >= 10) return 0.01;
    if (price >= 1) return 0.001;
    return 0.0001;
  }

  // Get current order book data
  getOrderBook(): OrderBookData | null {
    return this.orderBook;
  }

  // Get connection status
  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}

export const binanceOrderBook = new BinanceOrderBookService();
