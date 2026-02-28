import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Network, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────
type NodeType = 'page' | 'service' | 'api' | 'database' | 'context' | 'component' | 'edge-fn' | 'hook' | 'store';

interface MapNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  x: number;
  y: number;
  reqPerSec: number;
  errPct: number;
  avgLatency: string;
}

interface MapEdge {
  from: string;
  to: string;
  label: string;
}

// ── Color palette ──────────────────────────────────────────────────────
const TYPE_COLORS: Record<NodeType, string> = {
  page: '#4B9EFF',
  service: '#9B59B6',
  api: '#1DB954',
  database: '#E67E22',
  context: '#F1C40F',
  component: '#00BCD4',
  'edge-fn': '#FF6B6B',
  hook: '#A78BFA',
  store: '#F97316',
};

const TYPE_LABELS: Record<NodeType, string> = {
  page: 'Pages',
  service: 'Services',
  api: 'External APIs',
  database: 'Database',
  context: 'Contexts',
  component: 'Components',
  'edge-fn': 'Edge Functions',
  hook: 'Hooks',
  store: 'Stores',
};

// ── Comprehensive Node Data ────────────────────────────────────────────
const NODES: MapNode[] = [
  // ═══ Row 0: Pages ═══
  { id: 'index', label: 'Index /', type: 'page', description: 'Main dashboard with 44+ panels, tab manager, trading tools', x: 60, y: 40, reqPerSec: 0.12, errPct: 0, avgLatency: '92ms' },
  { id: 'intelligence', label: 'IntelligencePlatform', type: 'page', description: 'Palantir-style intelligence dashboard at /intelligence', x: 300, y: 40, reqPerSec: 0.04, errPct: 0, avgLatency: '130ms' },
  { id: 'globalmap', label: 'GlobalMap', type: 'page', description: 'World monitor with flights, earthquakes, storms at /map', x: 540, y: 40, reqPerSec: 0.03, errPct: 0, avgLatency: '210ms' },
  { id: 'notes', label: 'Notes & Viz', type: 'page', description: 'Notes, canvas, graph visualization at /notes', x: 780, y: 40, reqPerSec: 0.02, errPct: 0, avgLatency: '105ms' },
  { id: 'relationships', label: 'RelationshipDash', type: 'page', description: 'Relationship network dashboard at /relationship-dashboard', x: 1020, y: 40, reqPerSec: 0.01, errPct: 0, avgLatency: '88ms' },
  { id: 'options', label: 'OptionsSurface', type: 'page', description: 'Options 3D surface plot at /options', x: 1260, y: 40, reqPerSec: 0.01, errPct: 0, avgLatency: '150ms' },
  { id: 'servicemap', label: 'ServiceMap', type: 'page', description: 'This page — architecture visualization at /service-map', x: 1500, y: 40, reqPerSec: 0.005, errPct: 0, avgLatency: '50ms' },

  // ═══ Row 1: Contexts ═══
  { id: 'authctx', label: 'AuthContext', type: 'context', description: 'Auth state, login/logout, user session management', x: 60, y: 200, reqPerSec: 0.5, errPct: 0, avgLatency: '12ms' },
  { id: 'agentctx', label: 'AgentContext', type: 'context', description: 'AI Agent state, goal tracking, action queue', x: 300, y: 200, reqPerSec: 0.3, errPct: 0, avgLatency: '18ms' },
  { id: 'mcpctx', label: 'MCPContext', type: 'context', description: 'Model Context Protocol orchestration', x: 540, y: 200, reqPerSec: 0.2, errPct: 0, avgLatency: '15ms' },
  { id: 'panelctx', label: 'PanelCommander', type: 'context', description: 'Panel layout, open/close, AI-driven panel control', x: 780, y: 200, reqPerSec: 0.1, errPct: 0, avgLatency: '8ms' },
  { id: 'responsivectx', label: 'ResponsiveContext', type: 'context', description: 'Device type detection, mobile/tablet/desktop', x: 1020, y: 200, reqPerSec: 0.05, errPct: 0, avgLatency: '3ms' },
  { id: 'gatewayctx', label: 'GatewayContext', type: 'context', description: 'WebSocket gateway for realtime pub/sub', x: 1260, y: 200, reqPerSec: 0.15, errPct: 0, avgLatency: '10ms' },

  // ═══ Row 2: Core Components ═══
  { id: 'comp-marketdata', label: 'MarketData', type: 'component', description: 'Main panel manager with 44+ available components', x: 60, y: 360, reqPerSec: 0.1, errPct: 0, avgLatency: '80ms' },
  { id: 'comp-tradingchart', label: 'TradingChartMain', type: 'component', description: 'Advanced charting with Pine Script, indicators, multi-layout', x: 300, y: 360, reqPerSec: 0.8, errPct: 0.2, avgLatency: '120ms' },
  { id: 'comp-topnews', label: 'TopNews', type: 'component', description: 'Multi-source news aggregator with AI sentiment analysis', x: 540, y: 360, reqPerSec: 0.3, errPct: 0, avgLatency: '200ms' },
  { id: 'comp-tradingjournal', label: 'TradingJournal', type: 'component', description: 'Trade tracking, P&L, folders, webhook import', x: 780, y: 360, reqPerSec: 0.05, errPct: 0, avgLatency: '60ms' },
  { id: 'comp-livechat', label: 'LiveChatReal', type: 'component', description: 'Real-time chat, video calls, TradingView webhooks', x: 1020, y: 360, reqPerSec: 0.2, errPct: 0, avgLatency: '45ms' },
  { id: 'comp-able3ai', label: 'ABLE3AI', type: 'component', description: 'AI assistant powered by Ollama/Gemini', x: 1260, y: 360, reqPerSec: 0.15, errPct: 1.5, avgLatency: '350ms' },
  { id: 'comp-worldmonitor', label: 'WorldMonitor', type: 'component', description: 'Global threat dashboard: quakes, storms, flights, conflicts', x: 1500, y: 360, reqPerSec: 0.08, errPct: 0.5, avgLatency: '300ms' },

  // ═══ Row 2b: More Components ═══
  { id: 'comp-screener', label: 'ScreenerMain', type: 'component', description: 'Multi-market screener with presets and fluent API', x: 60, y: 500, reqPerSec: 0.4, errPct: 0, avgLatency: '180ms' },
  { id: 'comp-excel', label: 'ExcelClone', type: 'component', description: 'Spreadsheet with Bloomberg OCR, HyperFormula engine', x: 300, y: 500, reqPerSec: 0.02, errPct: 0, avgLatency: '70ms' },
  { id: 'comp-canvas', label: 'AbleCanvasV2', type: 'component', description: 'Infinite canvas with nodes, edges, auto-save (ReactFlow)', x: 540, y: 500, reqPerSec: 0.03, errPct: 0, avgLatency: '40ms' },
  { id: 'comp-montecarlo', label: 'MonteCarloSim', type: 'component', description: 'Monte Carlo simulation for strategy backtesting', x: 780, y: 500, reqPerSec: 0.01, errPct: 0, avgLatency: '250ms' },
  { id: 'comp-superclaw', label: 'SuperClawPanel', type: 'component', description: 'OpenClaw autonomous AI agent with vision & skills', x: 1020, y: 500, reqPerSec: 0.05, errPct: 2.0, avgLatency: '500ms' },
  { id: 'comp-facesearch', label: 'FaceSearch', type: 'component', description: 'AI face recognition to find social profiles', x: 1260, y: 500, reqPerSec: 0.01, errPct: 0, avgLatency: '600ms' },
  { id: 'comp-hf40', label: 'AbleHF40Modules', type: 'component', description: 'Hedge Fund 40-module analysis with Gemini AI scoring', x: 1500, y: 500, reqPerSec: 0.02, errPct: 0, avgLatency: '400ms' },

  // ═══ Row 3: Internal Services ═══
  { id: 'gemini-svc', label: 'GeminiService', type: 'service', description: 'Gemini AI wrapper: streaming, analysis, daily reports', x: 60, y: 660, reqPerSec: 1.2, errPct: 9.3, avgLatency: '320ms' },
  { id: 'mempool-svc', label: 'MempoolService', type: 'service', description: 'Bitcoin mempool stats, fee estimates, block data', x: 300, y: 660, reqPerSec: 0.5, errPct: 0, avgLatency: '180ms' },
  { id: 'chart-svc', label: 'ChartDataService', type: 'service', description: 'OHLCV data provider with multi-source aggregation', x: 540, y: 660, reqPerSec: 2.0, errPct: 0.5, avgLatency: '95ms' },
  { id: 'screener-svc', label: 'MarketScreener', type: 'service', description: 'TradingView screener API with fluent query builder', x: 780, y: 660, reqPerSec: 0.8, errPct: 0, avgLatency: '250ms' },
  { id: 'agent-svc', label: 'AgentService', type: 'service', description: 'AI agent execution: plan→act→observe loop', x: 1020, y: 660, reqPerSec: 0.3, errPct: 1.2, avgLatency: '450ms' },
  { id: 'openclaw-svc', label: 'OpenClawAgent', type: 'service', description: 'Autonomous agent: skills, memory, browser control', x: 1260, y: 660, reqPerSec: 0.1, errPct: 0, avgLatency: '380ms' },
  { id: 'news-svc', label: 'NewsAnalyzer', type: 'service', description: 'Comprehensive news analysis: scraping + AI sentiment', x: 1500, y: 660, reqPerSec: 0.4, errPct: 0, avgLatency: '290ms' },

  // ═══ Row 3b: More Services ═══
  { id: 'weather-svc', label: 'WeatherService', type: 'service', description: 'Global weather, tsunami alerts, extreme conditions', x: 60, y: 800, reqPerSec: 0.15, errPct: 0, avgLatency: '200ms' },
  { id: 'cyclone-svc', label: 'CycloneService', type: 'service', description: 'Tropical cyclone tracking (JTWC/NHC)', x: 300, y: 800, reqPerSec: 0.1, errPct: 0, avgLatency: '350ms' },
  { id: 'conflict-svc', label: 'ConflictService', type: 'service', description: 'Global conflict zone monitoring', x: 540, y: 800, reqPerSec: 0.1, errPct: 0, avgLatency: '150ms' },
  { id: 'econ-svc', label: 'EconomicDataService', type: 'service', description: 'Economic indicators, GDP, CPI, employment data', x: 780, y: 800, reqPerSec: 0.2, errPct: 0, avgLatency: '180ms' },
  { id: 'forex-svc', label: 'ForexDataService', type: 'service', description: 'Forex rates, currency pairs, cross rates', x: 1020, y: 800, reqPerSec: 0.3, errPct: 0, avgLatency: '120ms' },
  { id: 'gold-svc', label: 'GoldDataService', type: 'service', description: 'SPDR Gold ETF data, holdings, premium', x: 1260, y: 800, reqPerSec: 0.05, errPct: 0, avgLatency: '140ms' },
  { id: 'cot-svc', label: 'COTDataService', type: 'service', description: 'Commitment of Traders positioning data', x: 1500, y: 800, reqPerSec: 0.03, errPct: 0, avgLatency: '200ms' },

  // ═══ Row 3c: Even More Services ═══
  { id: 'realtime-price', label: 'RealTimePriceService', type: 'service', description: 'WebSocket price streaming via Binance', x: 60, y: 940, reqPerSec: 5.0, errPct: 0.1, avgLatency: '15ms' },
  { id: 'binance-ws', label: 'BinanceWebSocket', type: 'service', description: 'Binance WebSocket for orderbook & trades', x: 300, y: 940, reqPerSec: 8.0, errPct: 0.2, avgLatency: '10ms' },
  { id: 'binance-ob', label: 'BinanceOrderBook', type: 'service', description: 'Order book depth data service', x: 540, y: 940, reqPerSec: 3.0, errPct: 0, avgLatency: '20ms' },
  { id: 'flight-svc', label: 'FlightTracking', type: 'service', description: 'Live flight positions via OpenSky ADS-B', x: 780, y: 940, reqPerSec: 0.05, errPct: 5.0, avgLatency: '800ms' },
  { id: 'geodata-svc', label: 'GeoDataService', type: 'service', description: 'Geocoding, reverse geocoding via Nominatim', x: 1020, y: 940, reqPerSec: 0.02, errPct: 0, avgLatency: '300ms' },
  { id: 'vision-svc', label: 'VisionService', type: 'service', description: 'AI vision for OCR, screenshot analysis', x: 1260, y: 940, reqPerSec: 0.01, errPct: 0, avgLatency: '700ms' },
  { id: 'datapipeline', label: 'DataPipeline', type: 'service', description: 'Universal data pipeline & transformation service', x: 1500, y: 940, reqPerSec: 0.3, errPct: 0, avgLatency: '100ms' },

  // ═══ Row 4: Edge Functions ═══
  { id: 'ef-macro', label: 'macro-ai-analysis', type: 'edge-fn', description: 'Gemini macro analysis edge function', x: 60, y: 1100, reqPerSec: 0.1, errPct: 2.0, avgLatency: '3000ms' },
  { id: 'ef-news', label: 'news-aggregator', type: 'edge-fn', description: 'Multi-source news aggregation edge function', x: 300, y: 1100, reqPerSec: 0.2, errPct: 0, avgLatency: '1500ms' },
  { id: 'ef-screener', label: 'tv-screener', type: 'edge-fn', description: 'TradingView screener proxy edge function', x: 540, y: 1100, reqPerSec: 0.5, errPct: 0, avgLatency: '800ms' },
  { id: 'ef-webhook', label: 'tradingview-webhook', type: 'edge-fn', description: 'TradingView alert webhook receiver', x: 780, y: 1100, reqPerSec: 0.1, errPct: 0, avgLatency: '200ms' },
  { id: 'ef-broker', label: 'broker-connect', type: 'edge-fn', description: 'Broker connection & order execution', x: 1020, y: 1100, reqPerSec: 0.05, errPct: 0, avgLatency: '500ms' },
  { id: 'ef-gemini', label: 'gemini-deep-analysis', type: 'edge-fn', description: 'Deep Gemini analysis for markets', x: 1260, y: 1100, reqPerSec: 0.08, errPct: 3.0, avgLatency: '5000ms' },
  { id: 'ef-twitter', label: 'twitter-scraper', type: 'edge-fn', description: 'Twitter/X intelligence scraper', x: 1500, y: 1100, reqPerSec: 0.03, errPct: 5.0, avgLatency: '2000ms' },

  // ═══ Row 4b: More Edge Functions ═══
  { id: 'ef-face', label: 'face-search', type: 'edge-fn', description: 'Face recognition search edge function', x: 60, y: 1240, reqPerSec: 0.01, errPct: 0, avgLatency: '4000ms' },
  { id: 'ef-calendar', label: 'economic-calendar', type: 'edge-fn', description: 'Economic calendar data provider', x: 300, y: 1240, reqPerSec: 0.1, errPct: 0, avgLatency: '600ms' },
  { id: 'ef-weather', label: 'global-weather', type: 'edge-fn', description: 'Global weather data edge function', x: 540, y: 1240, reqPerSec: 0.05, errPct: 0, avgLatency: '1000ms' },
  { id: 'ef-agent', label: 'agent-execute', type: 'edge-fn', description: 'Agent task execution runtime', x: 780, y: 1240, reqPerSec: 0.02, errPct: 1.0, avgLatency: '3000ms' },
  { id: 'ef-mt5', label: 'mt5-poll', type: 'edge-fn', description: 'MetaTrader 5 polling bridge', x: 1020, y: 1240, reqPerSec: 0.1, errPct: 0.5, avgLatency: '400ms' },
  { id: 'ef-world-intel', label: 'world-intelligence', type: 'edge-fn', description: 'Global intelligence aggregation', x: 1260, y: 1240, reqPerSec: 0.03, errPct: 0, avgLatency: '2500ms' },

  // ═══ Row 5: External APIs ═══
  { id: 'gemini-api', label: 'Gemini AI', type: 'api', description: 'generativelanguage.googleapis.com', x: 60, y: 1400, reqPerSec: 1.0, errPct: 2.1, avgLatency: '500ms' },
  { id: 'binance-api', label: 'Binance API', type: 'api', description: 'api.binance.com (REST + WebSocket)', x: 300, y: 1400, reqPerSec: 8.0, errPct: 0, avgLatency: '30ms' },
  { id: 'mempool-api', label: 'Mempool.space', type: 'api', description: 'mempool.space/api', x: 540, y: 1400, reqPerSec: 0.5, errPct: 0, avgLatency: '120ms' },
  { id: 'opensky-api', label: 'OpenSky Network', type: 'api', description: 'opensky-network.org/api', x: 780, y: 1400, reqPerSec: 0.07, errPct: 5.0, avgLatency: '800ms' },
  { id: 'usgs-api', label: 'USGS Earthquakes', type: 'api', description: 'earthquake.usgs.gov/fdsnws', x: 1020, y: 1400, reqPerSec: 0.03, errPct: 0, avgLatency: '300ms' },
  { id: 'worldbank-api', label: 'WorldBank API', type: 'api', description: 'api.worldbank.org/v2', x: 1260, y: 1400, reqPerSec: 0.02, errPct: 0, avgLatency: '400ms' },
  { id: 'gnews-api', label: 'GNews / NewsAPI', type: 'api', description: 'gnews.io/api', x: 1500, y: 1400, reqPerSec: 0.3, errPct: 0, avgLatency: '220ms' },

  // ═══ Row 5b: More APIs ═══
  { id: 'nominatim-api', label: 'Nominatim OSM', type: 'api', description: 'nominatim.openstreetmap.org', x: 60, y: 1540, reqPerSec: 0.05, errPct: 0, avgLatency: '350ms' },
  { id: 'tv-api', label: 'TradingView', type: 'api', description: 'TradingView scanner/screener API', x: 300, y: 1540, reqPerSec: 0.8, errPct: 0, avgLatency: '180ms' },
  { id: 'ais-api', label: 'AIS Stream', type: 'api', description: 'AIS vessel tracking stream', x: 540, y: 1540, reqPerSec: 0.02, errPct: 0, avgLatency: '500ms' },
  { id: 'peerjs-api', label: 'PeerJS (WebRTC)', type: 'api', description: 'PeerJS signaling for video calls', x: 780, y: 1540, reqPerSec: 0.01, errPct: 0, avgLatency: '60ms' },
  { id: 'leaflet-api', label: 'OpenStreetMap Tiles', type: 'api', description: 'OSM tile server for Leaflet maps', x: 1020, y: 1540, reqPerSec: 2.0, errPct: 0, avgLatency: '80ms' },

  // ═══ Row 6: Database ═══
  { id: 'supabase', label: 'Lovable Cloud DB', type: 'database', description: 'PostgreSQL: users, messages, alerts, trades, webhooks, broker_connections', x: 700, y: 1700, reqPerSec: 3.5, errPct: 0, avgLatency: '45ms' },

  // ═══ Row 7: Hooks & Stores ═══
  { id: 'hook-mobile', label: 'useIsMobile', type: 'hook', description: 'Responsive breakpoint hook', x: 60, y: 1850, reqPerSec: 0, errPct: 0, avgLatency: '0ms' },
  { id: 'hook-toast', label: 'useToast', type: 'hook', description: 'Toast notification system', x: 300, y: 1850, reqPerSec: 0, errPct: 0, avgLatency: '0ms' },
  { id: 'hook-earthquake', label: 'useEarthquakeData', type: 'hook', description: 'USGS earthquake data hook', x: 540, y: 1850, reqPerSec: 0.03, errPct: 0, avgLatency: '300ms' },
  { id: 'hook-sentiment', label: 'useSentimentHistory', type: 'hook', description: 'Sentiment trend history hook', x: 780, y: 1850, reqPerSec: 0.05, errPct: 0, avgLatency: '150ms' },
  { id: 'hook-marketmap', label: 'useMarketMapData', type: 'hook', description: 'Crypto market map data hook', x: 1020, y: 1850, reqPerSec: 0.1, errPct: 0, avgLatency: '200ms' },
  { id: 'store-intel', label: 'IntelligenceStore', type: 'store', description: 'Zustand store for intelligence data', x: 1260, y: 1850, reqPerSec: 0.2, errPct: 0, avgLatency: '5ms' },
];

// ── Comprehensive Edge Data ────────────────────────────────────────────
const EDGES: MapEdge[] = [
  // Pages → Contexts
  { from: 'index', to: 'authctx', label: '∞' },
  { from: 'index', to: 'agentctx', label: '50' },
  { from: 'index', to: 'mcpctx', label: '51' },
  { from: 'index', to: 'panelctx', label: '120' },
  { from: 'index', to: 'responsivectx', label: '∞' },
  { from: 'index', to: 'gatewayctx', label: '30' },
  { from: 'intelligence', to: 'authctx', label: '∞' },
  { from: 'globalmap', to: 'authctx', label: '∞' },

  // Pages → Components
  { from: 'index', to: 'comp-marketdata', label: '1' },
  { from: 'index', to: 'comp-tradingchart', label: '1.6k' },
  { from: 'intelligence', to: 'store-intel', label: '200' },

  // Components → Services
  { from: 'comp-tradingchart', to: 'chart-svc', label: '1.6k' },
  { from: 'comp-tradingchart', to: 'realtime-price', label: '800' },
  { from: 'comp-tradingchart', to: 'binance-ws', label: '500' },
  { from: 'comp-topnews', to: 'news-svc', label: '200' },
  { from: 'comp-topnews', to: 'gemini-svc', label: '50' },
  { from: 'comp-tradingjournal', to: 'supabase', label: '150' },
  { from: 'comp-livechat', to: 'supabase', label: '300' },
  { from: 'comp-livechat', to: 'peerjs-api', label: '10' },
  { from: 'comp-able3ai', to: 'gemini-svc', label: '100' },
  { from: 'comp-able3ai', to: 'agent-svc', label: '40' },
  { from: 'comp-worldmonitor', to: 'weather-svc', label: '25' },
  { from: 'comp-worldmonitor', to: 'cyclone-svc', label: '18' },
  { from: 'comp-worldmonitor', to: 'conflict-svc', label: '15' },
  { from: 'comp-worldmonitor', to: 'flight-svc', label: '10' },
  { from: 'comp-worldmonitor', to: 'hook-earthquake', label: '20' },
  { from: 'comp-screener', to: 'screener-svc', label: '400' },
  { from: 'comp-excel', to: 'vision-svc', label: '5' },
  { from: 'comp-canvas', to: 'supabase', label: '30' },
  { from: 'comp-montecarlo', to: 'chart-svc', label: '20' },
  { from: 'comp-superclaw', to: 'openclaw-svc', label: '40' },
  { from: 'comp-superclaw', to: 'vision-svc', label: '10' },
  { from: 'comp-facesearch', to: 'ef-face', label: '5' },
  { from: 'comp-hf40', to: 'gemini-svc', label: '80' },

  // GlobalMap → Services
  { from: 'globalmap', to: 'comp-worldmonitor', label: '1' },
  { from: 'globalmap', to: 'geodata-svc', label: '10' },

  // Notes page
  { from: 'notes', to: 'supabase', label: '80' },
  { from: 'notes', to: 'gemini-svc', label: '30' },

  // Relationships
  { from: 'relationships', to: 'supabase', label: '55' },

  // Options
  { from: 'options', to: 'chart-svc', label: '40' },
  { from: 'options', to: 'binance-api', label: '35' },

  // Services → External APIs
  { from: 'gemini-svc', to: 'gemini-api', label: '1.2k' },
  { from: 'gemini-svc', to: 'ef-macro', label: '100' },
  { from: 'mempool-svc', to: 'mempool-api', label: '300' },
  { from: 'chart-svc', to: 'binance-api', label: '1.6k' },
  { from: 'screener-svc', to: 'ef-screener', label: '400' },
  { from: 'agent-svc', to: 'gemini-svc', label: '80' },
  { from: 'agent-svc', to: 'openclaw-svc', label: '40' },
  { from: 'agent-svc', to: 'ef-agent', label: '20' },
  { from: 'openclaw-svc', to: 'supabase', label: '100' },
  { from: 'news-svc', to: 'gnews-api', label: '200' },
  { from: 'news-svc', to: 'gemini-api', label: '60' },
  { from: 'news-svc', to: 'ef-news', label: '90' },
  { from: 'weather-svc', to: 'worldbank-api', label: '50' },
  { from: 'weather-svc', to: 'ef-weather', label: '25' },
  { from: 'cyclone-svc', to: 'ef-world-intel', label: '18' },
  { from: 'conflict-svc', to: 'ef-world-intel', label: '15' },
  { from: 'flight-svc', to: 'opensky-api', label: '30' },
  { from: 'geodata-svc', to: 'nominatim-api', label: '20' },
  { from: 'realtime-price', to: 'binance-api', label: '5k' },
  { from: 'binance-ws', to: 'binance-api', label: '8k' },
  { from: 'binance-ob', to: 'binance-api', label: '3k' },
  { from: 'forex-svc', to: 'binance-api', label: '200' },
  { from: 'econ-svc', to: 'worldbank-api', label: '80' },
  { from: 'econ-svc', to: 'ef-calendar', label: '50' },
  { from: 'gold-svc', to: 'binance-api', label: '30' },
  { from: 'cot-svc', to: 'ef-news', label: '20' },
  { from: 'datapipeline', to: 'supabase', label: '300' },

  // Edge Functions → APIs / DB
  { from: 'ef-macro', to: 'gemini-api', label: '100' },
  { from: 'ef-macro', to: 'supabase', label: '50' },
  { from: 'ef-screener', to: 'tv-api', label: '400' },
  { from: 'ef-webhook', to: 'supabase', label: '100' },
  { from: 'ef-broker', to: 'supabase', label: '50' },
  { from: 'ef-gemini', to: 'gemini-api', label: '80' },
  { from: 'ef-twitter', to: 'supabase', label: '30' },
  { from: 'ef-face', to: 'gemini-api', label: '5' },
  { from: 'ef-calendar', to: 'supabase', label: '50' },
  { from: 'ef-weather', to: 'supabase', label: '25' },
  { from: 'ef-agent', to: 'gemini-api', label: '20' },
  { from: 'ef-agent', to: 'supabase', label: '20' },
  { from: 'ef-mt5', to: 'supabase', label: '100' },
  { from: 'ef-world-intel', to: 'supabase', label: '30' },
  { from: 'ef-news', to: 'gnews-api', label: '200' },

  // Contexts → Services / DB
  { from: 'agentctx', to: 'agent-svc', label: '70' },
  { from: 'agentctx', to: 'supabase', label: '45' },
  { from: 'mcpctx', to: 'supabase', label: '30' },
  { from: 'authctx', to: 'supabase', label: '200' },
  { from: 'gatewayctx', to: 'supabase', label: '150' },
  { from: 'panelctx', to: 'comp-marketdata', label: '∞' },

  // Hooks → APIs
  { from: 'hook-earthquake', to: 'usgs-api', label: '20' },
  { from: 'hook-marketmap', to: 'binance-api', label: '100' },
  { from: 'hook-sentiment', to: 'supabase', label: '50' },

  // World Monitor map tiles
  { from: 'comp-worldmonitor', to: 'leaflet-api', label: '2k' },
  { from: 'globalmap', to: 'leaflet-api', label: '1k' },
];

// ── Helpers ────────────────────────────────────────────────────────────
const NODE_W = 180;
const NODE_H = 90;

const getNodeCenter = (n: MapNode) => ({ cx: n.x + NODE_W / 2, cy: n.y + NODE_H / 2 });

function cubicPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = (x2 - x1) * 0.4;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

// ── Component ──────────────────────────────────────────────────────────
const ServiceMap: React.FC = () => {
  const [filter, setFilter] = useState<NodeType | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);

  // pan & zoom
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.65 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform(t => {
      const ds = e.deltaY > 0 ? 0.92 : 1.08;
      const ns = Math.max(0.15, Math.min(3, t.scale * ds));
      return { ...t, scale: ns };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [transform]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setTransform(t => ({
      ...t,
      x: panStart.current.tx + (e.clientX - panStart.current.x),
      y: panStart.current.ty + (e.clientY - panStart.current.y),
    }));
  }, []);

  const onPointerUp = useCallback(() => { isPanning.current = false; }, []);

  // derived
  const nodeMap = useMemo(() => {
    const m = new Map<string, MapNode>();
    NODES.forEach(n => m.set(n.id, n));
    return m;
  }, []);

  const connectedIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    const s = new Set<string>();
    s.add(hovered);
    EDGES.forEach(e => {
      if (e.from === hovered) s.add(e.to);
      if (e.to === hovered) s.add(e.from);
    });
    return s;
  }, [hovered]);

  const filteredNodes = useMemo(() =>
    filter === 'all' ? NODES : NODES.filter(n => n.type === filter),
    [filter]
  );
  const filteredIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);
  const filteredEdges = useMemo(() =>
    EDGES.filter(e => filteredIds.has(e.from) && filteredIds.has(e.to)),
    [filteredIds]
  );

  const selectedNode = selected ? nodeMap.get(selected) : null;
  const selectedEdges = useMemo(() => {
    if (!selected) return [];
    return EDGES.filter(e => e.from === selected || e.to === selected);
  }, [selected]);

  const filterOptions = ['all', 'page', 'service', 'api', 'database', 'context', 'component', 'edge-fn', 'hook', 'store'] as const;

  return (
    <div className="w-full flex flex-col overflow-hidden" style={{ background: '#0b0e14', height: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1e2330' }}>
        <div className="flex items-center gap-3">
          <Network size={18} style={{ color: '#9B59B6' }} />
          <div>
            <h1 className="text-base font-bold text-foreground font-mono">Service Map</h1>
            <p className="text-[11px] text-muted-foreground font-mono">Visualize service-to-service dependencies and data flow.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono border rounded px-2 py-0.5" style={{ borderColor: '#1e2330' }}>
            {NODES.length} nodes · {EDGES.length} edges
          </span>
          <Button variant="ghost" size="icon" onClick={() => setAnimKey(k => k + 1)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid #1e2330' }}>
        {filterOptions.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-2.5 py-1 rounded text-[10px] font-mono transition-colors whitespace-nowrap"
            style={{
              background: filter === f ? (f === 'all' ? '#2a2f3e' : TYPE_COLORS[f as NodeType] + '30') : 'transparent',
              color: filter === f ? (f === 'all' ? '#e1e5ee' : TYPE_COLORS[f as NodeType]) : '#6b7280',
              border: `1px solid ${filter === f ? (f === 'all' ? '#3a4050' : TYPE_COLORS[f as NodeType] + '60') : '#1e233060'}`,
            }}
          >
            {f === 'all' ? 'All' : TYPE_LABELS[f as NodeType]}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e233044 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ touchAction: 'none' }}
        >
          <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', willChange: 'transform', position: 'relative', width: 1900, height: 2100 }}>
            {/* SVG edges */}
            <svg
              key={animKey}
              width="1900" height="2100"
              className="absolute top-0 left-0 pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#3a4050" />
                </marker>
              </defs>
              {filteredEdges.map((edge, i) => {
                const fromN = nodeMap.get(edge.from);
                const toN = nodeMap.get(edge.to);
                if (!fromN || !toN) return null;
                const { cx: x1, cy: y1 } = getNodeCenter(fromN);
                const { cx: x2, cy: y2 } = getNodeCenter(toN);
                const d = cubicPath(x1, y1, x2, y2);
                const dimmed = hovered && (!connectedIds.has(edge.from) || !connectedIds.has(edge.to));
                const highlighted = hovered && connectedIds.has(edge.from) && connectedIds.has(edge.to);
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                return (
                  <g key={i} style={{ opacity: dimmed ? 0.05 : 1, transition: 'opacity 0.2s' }}>
                    <path d={d} fill="none" stroke={highlighted ? '#6b8aff' : '#222838'} strokeWidth={highlighted ? 2 : 1} markerEnd="url(#arrowhead)" />
                    <circle r="2.5" fill={highlighted ? '#6b8aff' : '#4B9EFF'} opacity={0.8}>
                      <animateMotion dur={`${2 + Math.random() * 2}s`} repeatCount="indefinite" path={d} />
                    </circle>
                    <rect x={mx - 14} y={my - 8} width={28} height={16} rx={3} fill="#13171f" stroke="#222838" strokeWidth={0.5} />
                    <text x={mx} y={my + 3.5} textAnchor="middle" fill="#6b7890" fontSize={8} fontFamily="monospace">{edge.label}</text>
                  </g>
                );
              })}
            </svg>

            {/* Node cards */}
            {filteredNodes.map(node => {
              const dimmed = hovered && !connectedIds.has(node.id);
              const color = TYPE_COLORS[node.type];
              return (
                <div
                  key={node.id}
                  className="absolute select-none"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_W,
                    height: NODE_H,
                    opacity: dimmed ? 0.1 : 1,
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
                >
                  <div
                    className="h-full rounded"
                    style={{
                      background: '#111520',
                      border: `1px solid ${hovered === node.id ? color : '#1a1f2d'}`,
                      boxShadow: hovered === node.id ? `0 0 16px ${color}18` : 'none',
                    }}
                  >
                    <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ background: color + '18', borderBottom: `1px solid ${color}20` }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: node.errPct > 5 ? '#ef4444' : node.errPct > 1 ? '#f59e0b' : '#22c55e', boxShadow: `0 0 4px ${node.errPct > 5 ? '#ef4444' : node.errPct > 1 ? '#f59e0b' : '#22c55e'}60` }} />
                      <span className="text-[10px] font-mono font-bold truncate" style={{ color }}>{node.label}</span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <div className="text-center">
                        <div className="text-[8px] text-muted-foreground font-mono">req/s</div>
                        <div className="text-[10px] font-mono text-foreground font-bold">{node.reqPerSec < 0.01 ? '—' : node.reqPerSec.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] text-muted-foreground font-mono">err%</div>
                        <div className="text-[10px] font-mono font-bold" style={{ color: node.errPct > 5 ? '#ef4444' : node.errPct > 1 ? '#f59e0b' : node.errPct > 0 ? '#f59e0b' : '#4b5563' }}>{node.errPct.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] text-muted-foreground font-mono">avg</div>
                        <div className="text-[10px] font-mono text-foreground font-bold">{node.avgLatency}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-8 right-3 flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-lg max-w-[600px]" style={{ background: '#111520e0', border: '1px solid #1a1f2d' }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
              <span className="text-[9px] font-mono text-muted-foreground">{TYPE_LABELS[type as NodeType]}</span>
            </div>
          ))}
          <span className="w-px h-3" style={{ background: '#2a3040' }} />
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 3px #22c55e80' }} />
            <span className="text-[9px] font-mono text-muted-foreground">OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
            <span className="text-[9px] font-mono text-muted-foreground">Warn</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
            <span className="text-[9px] font-mono text-muted-foreground">Err</span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-8 left-3 flex flex-col gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" style={{ background: '#111520', border: '1px solid #1a1f2d' }}
            onClick={() => setTransform(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))}>
            <span className="text-xs font-mono">+</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" style={{ background: '#111520', border: '1px solid #1a1f2d' }}
            onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.15, t.scale * 0.8) }))}>
            <span className="text-xs font-mono">−</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" style={{ background: '#111520', border: '1px solid #1a1f2d' }}
            onClick={() => setTransform({ x: 0, y: 0, scale: 0.65 })}>
            <span className="text-[9px] font-mono">⟲</span>
          </Button>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-1 text-[9px] font-mono text-muted-foreground" style={{ background: '#0b0e14e0', borderTop: '1px solid #1a1f2d' }}>
          <span>Drag to pan</span>
          <span>·</span>
          <span>Scroll to zoom</span>
          <span>·</span>
          <span>{filteredNodes.length} nodes</span>
          <span>·</span>
          <span>{filteredEdges.length} edges</span>
          <span>·</span>
          <span>Scale: {(transform.scale * 100).toFixed(0)}%</span>
        </div>

        {/* Side panel */}
        {selectedNode && (
          <div className="absolute top-0 right-0 h-full w-72 overflow-y-auto" style={{ background: '#0d1018', borderLeft: '1px solid #1a1f2d' }}>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_COLORS[selectedNode.type] }} />
                  <span className="text-xs font-mono font-bold text-foreground">{selectedNode.label}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => setSelected(null)}>
                  <X size={12} />
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] uppercase text-muted-foreground font-mono mb-1">Type</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: TYPE_COLORS[selectedNode.type] + '20', color: TYPE_COLORS[selectedNode.type] }}>
                    {TYPE_LABELS[selectedNode.type]}
                  </span>
                </div>
                <div>
                  <div className="text-[9px] uppercase text-muted-foreground font-mono mb-1">Description</div>
                  <p className="text-[10px] text-foreground font-mono leading-relaxed">{selectedNode.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Uptime', value: selectedNode.errPct > 5 ? '98.2%' : selectedNode.errPct > 1 ? '99.5%' : '99.9%', color: selectedNode.errPct > 5 ? '#f59e0b' : '#22c55e' },
                    { label: 'Latency', value: selectedNode.avgLatency, color: '#4B9EFF' },
                    { label: 'Errors', value: `${selectedNode.errPct.toFixed(1)}%`, color: selectedNode.errPct > 0 ? '#ef4444' : '#22c55e' },
                  ].map(m => (
                    <div key={m.label} className="rounded p-1.5 text-center" style={{ background: '#111520', border: '1px solid #1a1f2d' }}>
                      <div className="text-[8px] text-muted-foreground font-mono">{m.label}</div>
                      <div className="text-[10px] font-mono font-bold" style={{ color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[9px] uppercase text-muted-foreground font-mono mb-1.5">Connections ({selectedEdges.length})</div>
                  <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                    {selectedEdges.map((edge, i) => {
                      const otherId = edge.from === selected ? edge.to : edge.from;
                      const other = nodeMap.get(otherId);
                      if (!other) return null;
                      const dir = edge.from === selected ? '→' : '←';
                      return (
                        <div key={i} className="flex items-center justify-between px-1.5 py-1 rounded text-[10px] font-mono cursor-pointer hover:bg-white/5" style={{ border: '1px solid #1a1f2d' }}
                          onClick={() => setSelected(otherId)}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: TYPE_COLORS[other.type] }} />
                            <span className="text-foreground truncate">{dir} {other.label}</span>
                          </div>
                          <span className="text-muted-foreground flex-shrink-0 ml-1">{edge.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceMap;
