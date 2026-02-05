// Binance WebSocket Service for Real-time Crypto Data
import { OHLCVData, Timeframe } from './ChartDataService';

interface PriceUpdate {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume: number;
}

interface KlineUpdate {
  symbol: string;
  kline: OHLCVData;
  isFinal: boolean;
}

type PriceCallback = (update: PriceUpdate) => void;
type KlineCallback = (update: KlineUpdate) => void;
type StatusCallback = (connected: boolean) => void;

class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private priceSubscribers: Map<string, Set<PriceCallback>> = new Map();
  private klineSubscribers: Map<string, Set<KlineCallback>> = new Map();
  private statusSubscribers: Set<StatusCallback> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private subscribedKlines: Map<string, string> = new Map(); // symbol -> interval
  private isConnected = false;
  private prices: Map<string, PriceUpdate> = new Map();
  
  // All available crypto symbols from Binance (loaded dynamically)
  private allSymbols: string[] = [];
  
  constructor() {
    this.loadAllSymbols();
  }
  
  // Load all available symbols from Binance
  async loadAllSymbols(): Promise<string[]> {
    if (this.allSymbols.length > 0) return this.allSymbols;
    
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) throw new Error('Failed to fetch symbols');
      
      const data = await response.json();
      this.allSymbols = data
        .filter((t: any) => t.symbol.endsWith('USDT') || t.symbol.endsWith('BUSD'))
        .map((t: any) => t.symbol)
        .sort();
      
      console.log(`[Binance] Loaded ${this.allSymbols.length} crypto symbols`);
      return this.allSymbols;
    } catch (error) {
      console.error('[Binance] Failed to load symbols:', error);
      // Fallback to popular symbols
      this.allSymbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 
        'ADAUSDT', 'DOTUSDT', 'DOGEUSDT', 'SHIBUSDT', 'AVAXUSDT',
        'MATICUSDT', 'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT',
        'XLMUSDT', 'ETCUSDT', 'FILUSDT', 'TRXUSDT', 'NEARUSDT',
        'ICPUSDT', 'VETUSDT', 'ALGOUSDT', 'FTMUSDT', 'SANDUSDT',
        'MANAUSDT', 'AXSUSDT', 'AAVEUSDT', 'EGLDUSDT', 'THETAUSDT',
        'XTZUSDT', 'EOSUSDT', 'FLOWUSDT', 'CHZUSDT', 'GALAUSDT'
      ];
      return this.allSymbols;
    }
  }
  
  // Search symbols
  async searchSymbols(query: string): Promise<string[]> {
    const symbols = await this.loadAllSymbols();
    const q = query.toUpperCase();
    return symbols.filter(s => s.includes(q)).slice(0, 50);
  }
  
  // Connect to Binance WebSocket stream
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    // Build streams array
    const streams: string[] = [];
    
    // Add ticker streams for subscribed symbols
    this.subscribedSymbols.forEach(symbol => {
      streams.push(`${symbol.toLowerCase()}@ticker`);
    });
    
    // Add kline streams
    this.subscribedKlines.forEach((interval, symbol) => {
      streams.push(`${symbol.toLowerCase()}@kline_${interval}`);
    });
    
    if (streams.length === 0) {
      // Default: subscribe to top cryptos
      ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt'].forEach(s => {
        streams.push(`${s}@ticker`);
      });
    }
    
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[Binance WS] Connected');
        this.isConnected = true;
        this.notifyStatus(true);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.error('[Binance WS] Parse error:', e);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[Binance WS] Error:', error);
        this.isConnected = false;
        this.notifyStatus(false);
      };
      
      this.ws.onclose = () => {
        console.log('[Binance WS] Disconnected');
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[Binance WS] Connection error:', error);
      this.scheduleReconnect();
    }
  }
  
  private handleMessage(data: any) {
    if (!data.stream || !data.data) return;
    
    const stream = data.stream;
    const payload = data.data;
    
    if (stream.endsWith('@ticker')) {
      // Ticker update
      const update: PriceUpdate = {
        symbol: payload.s,
        price: parseFloat(payload.c),
        priceChange: parseFloat(payload.p),
        priceChangePercent: parseFloat(payload.P),
        high24h: parseFloat(payload.h),
        low24h: parseFloat(payload.l),
        volume24h: parseFloat(payload.v),
        quoteVolume: parseFloat(payload.q),
      };
      
      this.prices.set(payload.s, update);
      this.notifyPriceSubscribers(payload.s, update);
    } else if (stream.includes('@kline_')) {
      // Kline update
      const k = payload.k;
      const kline: OHLCVData = {
        timestamp: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };
      
      this.notifyKlineSubscribers(payload.s, {
        symbol: payload.s,
        kline,
        isFinal: k.x,
      });
    }
  }
  
  private notifyPriceSubscribers(symbol: string, update: PriceUpdate) {
    const subscribers = this.priceSubscribers.get(symbol);
    if (subscribers) {
      subscribers.forEach(callback => callback(update));
    }
    
    // Also notify 'ALL' subscribers
    const allSubs = this.priceSubscribers.get('ALL');
    if (allSubs) {
      allSubs.forEach(callback => callback(update));
    }
  }
  
  private notifyKlineSubscribers(symbol: string, update: KlineUpdate) {
    const subscribers = this.klineSubscribers.get(symbol);
    if (subscribers) {
      subscribers.forEach(callback => callback(update));
    }
  }
  
  private notifyStatus(connected: boolean) {
    this.statusSubscribers.forEach(callback => callback(connected));
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.subscribedSymbols.size > 0 || this.subscribedKlines.size > 0) {
        this.connect();
      }
    }, 5000);
  }
  
  // Subscribe to price updates
  subscribeToPrice(symbol: string, callback: PriceCallback): () => void {
    if (!this.priceSubscribers.has(symbol)) {
      this.priceSubscribers.set(symbol, new Set());
    }
    this.priceSubscribers.get(symbol)!.add(callback);
    
    if (symbol !== 'ALL') {
      this.subscribedSymbols.add(symbol);
      this.reconnectWithNewStreams();
    }
    
    // Send cached price immediately if available
    const cached = this.prices.get(symbol);
    if (cached) {
      setTimeout(() => callback(cached), 0);
    }
    
    return () => {
      const subs = this.priceSubscribers.get(symbol);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0 && symbol !== 'ALL') {
          this.priceSubscribers.delete(symbol);
          this.subscribedSymbols.delete(symbol);
        }
      }
    };
  }
  
  // Subscribe to kline updates
  subscribeToKline(symbol: string, interval: string, callback: KlineCallback): () => void {
    if (!this.klineSubscribers.has(symbol)) {
      this.klineSubscribers.set(symbol, new Set());
    }
    this.klineSubscribers.get(symbol)!.add(callback);
    this.subscribedKlines.set(symbol, interval);
    
    this.reconnectWithNewStreams();
    
    return () => {
      const subs = this.klineSubscribers.get(symbol);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.klineSubscribers.delete(symbol);
          this.subscribedKlines.delete(symbol);
        }
      }
    };
  }
  
  // Subscribe to connection status
  subscribeToStatus(callback: StatusCallback): () => void {
    this.statusSubscribers.add(callback);
    callback(this.isConnected);
    
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }
  
  // Get all cached prices
  getAllPrices(): Map<string, PriceUpdate> {
    return this.prices;
  }
  
  // Get single price
  getPrice(symbol: string): PriceUpdate | undefined {
    return this.prices.get(symbol);
  }
  
  private reconnectWithNewStreams() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connect();
  }
  
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyStatus(false);
  }
  
  // Convert timeframe to Binance interval
  static timeframeToBinanceInterval(tf: Timeframe): string {
    const map: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1M'
    };
    return map[tf];
  }
}

export const binanceWS = new BinanceWebSocketService();
export type { PriceUpdate, KlineUpdate };
