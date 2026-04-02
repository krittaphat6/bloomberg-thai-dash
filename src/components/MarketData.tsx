import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TabManager from './TabManager';
import TabSelector from './TabSelector';
import ThemeSwitcher from './ThemeSwitcher';
import DesignSwitcher from './DesignSwitcher';
import { Button } from '@/components/ui/button';
import { Expand, Minimize, LogOut, TrendingUp, Brain, Wrench, MessageSquare, Gamepad2, Globe, Search, Command, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveContext } from '@/contexts/ResponsiveContext';
import { usePanelCommander } from '@/contexts/PanelCommanderContext';
import { MobileLayout } from './mobile/MobileLayout';
import { TabletLayout } from './tablet/TabletLayout';
import { useOpenBB } from '@/lib/openbb';
import StockdioCharts from './StockdioCharts';
import InvestingCharts from './InvestingCharts';
import CryptoLiveCharts from './CryptoLiveCharts';
import ForexEconomicData from './ForexEconomicData';
import ScatterAnalysis from './ScatterChart';
import MarketPieChart from './MarketPieChart';
import BloombergNews from './BloombergNews';
import EconomicCalendar from './EconomicCalendar';
import MarketDepth from './MarketDepth';
import TradingVolume from './TradingVolume';
import HeatMap from './HeatMap';
import CurrencyTable from './CurrencyTable';
import EconomicIndicators from './EconomicIndicators';
import COTData from './COTData';
import SPDRGoldData from './SPDRGoldData';
import RealMarketData from './RealMarketData';
import ABLE3AI from './ABLE3AI';
import BitcoinMempool from './BitcoinMempool';
import LiveUAMap from './LiveUAMap';
import USDebtClock from './USDebtClock';
import NoteTaking from './NoteTaking';
import TradingJournalV2 from './TradingJournalV2';
import FedWatch from './FedWatch';
import PenguinSticker from './PenguinSticker';
import ChessGame from './ChessGame';
import { BloombergLiveTV } from './BloombergLiveTV';
import { PythonCodeEditor } from './PythonCodeEditor';
import LiveChatReal from './LiveChatReal';
import { TradingChartMain } from './TradingChart';
import WorldStockMarkets from './WorldStockMarkets';
import CryptoMarketMap from './CryptoMarketMap';
import ScatterPointChart from './ScatterPointChart';
import CorrelationMatrixTable from './CorrelationMatrixTable';
import CVDChart from './CVDChart';
import TopNews from './TopNews';
import { BloombergMap } from './BloombergMap';
import { WorldMonitorDashboard } from './WorldMonitor/WorldMonitorDashboard';
import AbleHF40Modules from './AbleHF40Modules';
import { FaceSearch } from './FaceSearch';
import { TacticalCommandMap } from './TacticalMap';
import { SuperClawPanel } from './SuperClawPanel';
import ScreenerMain from './Screeners/ScreenerMain';
import { Network } from 'lucide-react';
import PolymarketHub from './PolymarketHub';
import DarkPoolMonitor from './DarkPoolMonitor';
import ShortInterestDashboard from './ShortInterestDashboard';
import AnalystEstimates from './AnalystEstimates';
import ETFScreener from './ETFScreener';
import CommodityDashboard from './CommodityDashboard';

interface PanelData {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface TabOption {
  id: string;
  title: string;
  component: React.ReactNode;
  category: string;
  icon?: React.ReactNode;
  description?: string;
  tags?: string[];
}

// Ticker tape data
const TICKER_ITEMS = [
  { symbol: 'BTC/USD', color: 'text-terminal-amber' },
  { symbol: 'GOLD', color: 'text-terminal-amber' },
  { symbol: 'SPX', color: 'text-terminal-green' },
  { symbol: 'EUR/USD', color: 'text-terminal-cyan' },
  { symbol: 'DXY', color: 'text-terminal-green' },
  { symbol: 'NQ', color: 'text-terminal-cyan' },
  { symbol: 'US10Y', color: 'text-terminal-amber' },
  { symbol: 'VIX', color: 'text-terminal-red' },
];

const TickerTape = () => {
  const [prices, setPrices] = useState<Record<string, { price: string; change: string; positive: boolean }>>({});

  useEffect(() => {
    const update = () => {
      const p: Record<string, { price: string; change: string; positive: boolean }> = {};
      const base: Record<string, number> = {
        'BTC/USD': 67500, GOLD: 2340, SPX: 5250, 'EUR/USD': 1.085, DXY: 104.2, NQ: 18400, US10Y: 4.25, VIX: 14.5
      };
      Object.entries(base).forEach(([s, b]) => {
        const change = (Math.random() - 0.48) * 2;
        const price = b * (1 + change / 100);
        p[s] = {
          price: s === 'EUR/USD' ? price.toFixed(4) : price > 100 ? price.toFixed(1) : price.toFixed(2),
          change: `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
          positive: change > 0
        };
      });
      setPrices(p);
    };
    update();
    const iv = setInterval(update, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="bg-card border-b border-border overflow-hidden h-6 relative">
      <div className="flex items-center h-full animate-marquee whitespace-nowrap gap-6 px-4">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => {
          const p = prices[t.symbol];
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-mono shrink-0">
              <span className={`font-bold ${t.color}`}>{t.symbol}</span>
              <span className="text-foreground">{p?.price || '—'}</span>
              <span className={p?.positive ? 'text-terminal-green' : 'text-terminal-red'}>{p?.change || ''}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// Command Palette
const CommandPalette = ({ components, onSelect, onClose }: { components: TabOption[]; onSelect: (t: TabOption) => void; onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = components.filter(c =>
    query === '' || c.title.toLowerCase().includes(query.toLowerCase()) || c.tags?.some(t => t.includes(query.toLowerCase()))
  ).slice(0, 12);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-terminal-green" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search panels, tools, charts..."
              className="flex-1 bg-transparent text-sm font-mono text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="max-h-[40vh] overflow-y-auto p-1">
          {results.map(r => (
            <button key={r.id} onClick={() => { onSelect(r); onClose(); }} className="w-full text-left px-3 py-2 rounded hover:bg-terminal-green/10 flex items-center gap-2 group transition-colors">
              <span className="text-xs font-mono font-bold text-foreground group-hover:text-terminal-green">{r.title}</span>
              {r.tags?.slice(0, 2).map(t => <span key={t} className="text-[8px] font-mono text-muted-foreground bg-muted px-1 rounded">{t}</span>)}
            </button>
          ))}
          {results.length === 0 && <p className="text-center py-4 text-xs font-mono text-muted-foreground">No results</p>}
        </div>
      </div>
    </div>
  );
};

// Need useRef import
import { useRef } from 'react';

const MarketData = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsiveContext();
  const { registerPanelOpener, registerPanelCloser } = usePanelCommander();
  const { isConnected: obbConnected } = useOpenBB();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [nextPanelId, setNextPanelId] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelIdCounter, setPanelIdCounter] = useState(1);

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // ⌘K shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timeInterval);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) { console.error('Fullscreen error:', error); }
  };

  const handlePanelClose = (id: string) => setPanels(panels.filter(p => p.id !== id));
  const handlePanelMaximize = (id: string) => setPanels(panels.map(p => ({ ...p, isMaximized: p.id === id, isMinimized: false })));
  const handlePanelMinimize = (id: string) => setPanels(panels.map(p => p.id === id ? { ...p, isMinimized: true, isMaximized: false } : p));
  const handlePanelRestore = (id: string) => setPanels(panels.map(p => p.id === id ? { ...p, isMinimized: false, isMaximized: false } : p));
  const handlePanelReorder = (newPanels: PanelData[]) => setPanels(newPanels);

  const availableComponents: TabOption[] = [
    // Trading Tools
    { id: 'trading-chart', title: '📊 TRADING CHART', component: <TradingChartMain />, category: 'trading', icon: <TrendingUp className="w-5 h-5" />, description: 'Advanced charting with Pine Script support and real-time data', tags: ['chart', 'technical', 'indicators', 'pine-script'] },
    { id: 'options-3d', title: '📈 OPTIONS-3D', component: <div className="h-full w-full overflow-auto"><iframe src="/options" className="w-full h-[800px] border-0" title="Options 3D" /></div>, category: 'trading', description: '3D options visualization and analysis', tags: ['options', '3d', 'visualization', 'greeks'] },
    { id: 'stockdio', title: 'STOCKDIO CHARTS', component: <StockdioCharts />, category: 'trading', description: 'Professional stock charts with real-time updates', tags: ['stocks', 'charts', 'real-time'] },
    { id: 'forex', title: '💱 FOREX & ECONOMICS', component: <ForexEconomicData />, category: 'trading', description: 'Forex pairs and economic indicators', tags: ['forex', 'economics', 'currencies', 'fx'] },
    { id: 'fedwatch', title: '🏦 FED WATCH', component: <FedWatch />, category: 'trading', description: 'Federal Reserve policy monitoring', tags: ['fed', 'interest-rates', 'monetary-policy'] },
    { id: 'screeners', title: '🔍 SCREENERS', component: <ScreenerMain />, category: 'trading', icon: <Search className="w-5 h-5" />, description: 'Advanced multi-market screening system with filters', tags: ['screener', 'filter', 'stock', 'crypto', 'forex', 'scanner'] },
    
    // Market Analysis
    { id: 'crypto', title: '₿ CRYPTO LIVE', component: <CryptoLiveCharts />, category: 'analysis', description: 'Live cryptocurrency prices and charts', tags: ['crypto', 'bitcoin', 'ethereum', 'live'] },
    { id: 'crypto-map', title: '🗺️ CRYPTO MARKET MAP', component: <CryptoMarketMap />, category: 'analysis', description: 'Visual heatmap of cryptocurrency market by market cap', tags: ['crypto', 'heatmap', 'market-cap', 'visualization'] },
    { id: 'scatter', title: 'SCATTER ANALYSIS', component: <ScatterAnalysis />, category: 'analysis', description: 'RS-Ratio vs RS-Momentum scatter plot', tags: ['scatter', 'correlation', 'relative-strength'] },
    { id: 'scatter-point', title: '📍 SCATTER POINT', component: <ScatterPointChart />, category: 'analysis', description: 'Advanced scatter plot with quadrant analysis (Leading/Lagging)', tags: ['scatter', 'rs-ratio', 'momentum', 'quadrants', 'rrg'] },
    { id: 'correlation-matrix', title: '🔢 CORRELATION MATRIX', component: <CorrelationMatrixTable />, category: 'analysis', description: 'Multi-asset correlation analysis (Pearson/Spearman/Kendall)', tags: ['correlation', 'matrix', 'pearson', 'spearman', 'portfolio'] },
    { id: 'cvd', title: '📊 CVD CHART', component: <CVDChart />, category: 'analysis', description: 'Cumulative Volume Delta with multi-exchange weighted average', tags: ['cvd', 'volume', 'delta', 'orderflow'] },
    { id: 'topnews', title: '🔥 TOP NEWS', component: <TopNews />, category: 'communication', description: 'Multi-source news aggregator with sentiment analysis', tags: ['news', 'reddit', 'twitter', 'sentiment'] },
    { id: 'pie', title: '🥧 MARKET PIE', component: <MarketPieChart />, category: 'analysis', description: 'Market sector allocation pie chart', tags: ['pie-chart', 'sectors', 'allocation'] },
    { id: 'heatmap', title: '🔥 HEAT MAP', component: <HeatMap />, category: 'analysis', description: 'Market performance heatmap', tags: ['heatmap', 'performance', 'sectors'] },
    { id: 'depth', title: '📊 MARKET DEPTH', component: <MarketDepth />, category: 'analysis', description: 'Order book depth visualization', tags: ['depth', 'order-book', 'liquidity'] },
    { id: 'volume', title: '📉 TRADING VOLUME', component: <TradingVolume />, category: 'analysis', description: 'Volume analysis and profile', tags: ['volume', 'trading', 'liquidity'] },
    { id: 'currency', title: '💵 CURRENCY TABLE', component: <CurrencyTable />, category: 'analysis', description: 'Currency exchange rates table', tags: ['currency', 'forex', 'exchange-rates'] },
    { id: 'indicators', title: '📈 ECONOMIC INDICATORS', component: <EconomicIndicators />, category: 'analysis', description: 'Key economic indicators dashboard', tags: ['economics', 'gdp', 'inflation', 'indicators'] },
    { id: 'cot', title: '📋 COT DATA', component: <COTData />, category: 'analysis', description: 'Commitment of Traders report data', tags: ['cot', 'futures', 'positioning'] },
    { id: 'gold', title: '🥇 SPDR GOLD DATA', component: <SPDRGoldData />, category: 'analysis', description: 'SPDR Gold Trust ETF data', tags: ['gold', 'gld', 'commodities', 'precious-metals'] },
    { id: 'realmarket', title: '📡 REAL MARKET DATA', component: <RealMarketData />, category: 'analysis', description: 'Real-time market data feed', tags: ['real-time', 'market-data', 'live'] },
    { id: 'bitcoin', title: '⛏️ BITCOIN MEMPOOL', component: <BitcoinMempool />, category: 'analysis', description: 'Bitcoin mempool and transaction data', tags: ['bitcoin', 'mempool', 'blockchain', 'transactions'] },
    { id: 'polymarket', title: '🔮 POLYMARKET HUB', component: <PolymarketHub />, category: 'analysis', icon: <TrendingUp className="w-5 h-5" />, description: 'Polymarket Prediction Market - Real-time prediction trading analysis', tags: ['polymarket', 'prediction', 'market', 'probability', 'betting', 'forecast'] },
    
    // NEW OpenBB panels
    { id: 'darkpool', title: '🕳️ DARK POOL', component: <DarkPoolMonitor />, category: 'analysis', description: 'Dark pool volume analysis and unusual activity detection', tags: ['darkpool', 'otc', 'volume', 'finra', 'institutional'] },
    { id: 'shorts', title: '📉 SHORT INTEREST', component: <ShortInterestDashboard />, category: 'analysis', description: 'Short interest, FTD data, and squeeze detection', tags: ['short', 'squeeze', 'ftd', 'short-interest', 'gme'] },
    { id: 'estimates', title: '🎯 ANALYST ESTIMATES', component: <AnalystEstimates />, category: 'analysis', description: 'Consensus ratings, price targets, and EPS estimates', tags: ['analyst', 'estimates', 'eps', 'price-target', 'consensus'] },
    { id: 'etf-screener', title: '🏦 ETF SCREENER', component: <ETFScreener />, category: 'analysis', description: 'Screen ETFs by expense ratio, AUM, asset class, and more', tags: ['etf', 'screener', 'fund', 'index', 'vanguard'] },
    { id: 'commodities', title: '⛏️ COMMODITIES', component: <CommodityDashboard />, category: 'analysis', description: 'Commodity prices, sparklines, and heatmap view', tags: ['commodity', 'oil', 'gold', 'agriculture', 'metals'] },
    
    // Intelligence & AI
    { id: 'able-focus', title: '🔍 ABLE-FOCUS', component: <div className="h-full w-full overflow-auto"><iframe src="/relationship-dashboard" className="w-full h-[800px] border-0" title="ABLE Focus" /></div>, category: 'intelligence', icon: <Brain className="w-5 h-5" />, description: 'AI-powered relationship and network analysis', tags: ['ai', 'analysis', 'relationships', 'network'] },
    { id: 'intelligence', title: '🧠 INTELLIGENCE PLATFORM', component: <div className="h-full w-full overflow-auto"><iframe src="/intelligence" className="w-full h-[800px] border-0" title="Intelligence Platform" /></div>, category: 'intelligence', description: 'Comprehensive intelligence dashboard (Palantir-style)', tags: ['intelligence', 'dashboard', 'analytics', 'palantir'] },
    { id: 'able3ai', title: '🤖 ABLE AI', component: <ABLE3AI />, category: 'intelligence', icon: <Brain className="w-5 h-5" />, description: 'Local AI powered by Ollama - Full access to all app data', tags: ['ai', 'ollama', 'local', 'mcp', 'trading'] },
    { id: 'able-hf-40', title: '🧠 ABLE-HF 40 MODULES', component: <AbleHF40Modules />, category: 'intelligence', icon: <Brain className="w-5 h-5" />, description: 'ABLE-HF 3.0 Hedge Fund Analysis System - 40 Modules with full scoring', tags: ['ai', 'hedge-fund', 'modules', '40-modules', 'analysis', 'gemini'] },
    { id: 'face-search', title: '👤 FACE SEARCH', component: <FaceSearch />, category: 'intelligence', icon: <Brain className="w-5 h-5" />, description: 'AI-powered face recognition to find social media profiles', tags: ['face', 'search', 'recognition', 'instagram', 'social-media', 'ai'] },
    { id: 'superclaw', title: '🦞 SUPERCLAW AGENT', component: <SuperClawPanel />, category: 'intelligence', icon: <Brain className="w-5 h-5" />, description: 'OpenClaw-powered AI agent with vision, skills, and automation', tags: ['ai', 'agent', 'openclaw', 'automation', 'skills', 'superclaw'] },
    
    // Utilities
    { id: 'code', title: '💻 PYTHON CODE EDITOR', component: <PythonCodeEditor />, category: 'utilities', icon: <Wrench className="w-5 h-5" />, description: 'Integrated Python and Pine Script editor with live execution', tags: ['python', 'code', 'editor', 'pine-script', 'programming'] },
    { id: 'notes', title: '📝 NOTES', component: <NoteTaking />, category: 'utilities', description: 'Quick note-taking and canvas tool', tags: ['notes', 'memo', 'text', 'canvas'] },
    { id: 'journal', title: '📔 TRADING JOURNAL', component: <TradingJournalV2 />, category: 'utilities', description: 'Track and analyze your trades', tags: ['journal', 'trades', 'tracking', 'analytics', 'performance'] },
    { id: 'calendar', title: '📅 ECONOMIC CALENDAR', component: <EconomicCalendar />, category: 'utilities', description: 'Economic events and releases calendar', tags: ['calendar', 'events', 'economics', 'schedule'] },
    { id: 'investing', title: '📰 INVESTING.COM', component: <InvestingCharts />, category: 'utilities', description: 'Investing.com charts and data', tags: ['investing', 'charts', 'news'] },
    
    // Communication
    { id: 'messenger', title: '💬 MESSENGER', component: <LiveChatReal />, category: 'communication', icon: <MessageSquare className="w-5 h-5" />, description: 'Real-time chat with video calls and TradingView webhooks', tags: ['chat', 'messenger', 'video-call', 'webhooks'] },
    { id: 'news', title: '📰 BLOOMBERG NEWS', component: <BloombergNews />, category: 'communication', description: 'Latest financial news from Bloomberg', tags: ['news', 'bloomberg', 'financial', 'headlines'] },
    { id: 'tv', title: '📺 BLOOMBERG LIVE TV', component: <BloombergLiveTV />, category: 'communication', description: 'Live Bloomberg TV stream', tags: ['tv', 'live', 'bloomberg', 'streaming'] },
    
    // Global Markets
    { id: 'wol', title: '🌍 WORLD MARKETS', component: <WorldStockMarkets />, category: 'global', icon: <Globe className="w-5 h-5" />, description: '3D globe visualization of world stock markets status', tags: ['world', 'markets', 'global', 'exchanges', 'timezones'] },
    { id: 'uamap', title: '🗺️ LIVE UA MAP', component: <LiveUAMap />, category: 'global', description: 'Live geopolitical situation map', tags: ['map', 'geopolitics', 'live', 'situation'] },
    { id: 'debtclock', title: '💸 US DEBT CLOCK', component: <USDebtClock />, category: 'global', description: 'Real-time US national debt tracker', tags: ['debt', 'us', 'government', 'fiscal'] },
    { id: 'bloomberg-map', title: '🌐 GLOBAL MAP', component: <WorldMonitorDashboard />, category: 'global', icon: <Globe className="w-5 h-5" />, description: 'World Monitor Intelligence Dashboard with real-time global threat analysis', tags: ['map', 'global', 'earthquake', 'markets', 'intelligence', 'world', 'monitor'] },
    
    // Entertainment
    { id: 'pacman', title: '🎮 PAC-MAN', component: <div className="h-full w-full overflow-auto"><iframe src="/pacman" className="w-full h-[800px] border-0" title="Pac-Man Game" /></div>, category: 'entertainment', icon: <Gamepad2 className="w-5 h-5" />, description: 'Classic Pac-Man arcade game', tags: ['game', 'arcade', 'fun', 'break'] },
    { id: 'chess', title: '♟️ CHESS PUZZLE', component: <ChessGame />, category: 'entertainment', description: 'Chess puzzles and challenges', tags: ['chess', 'puzzle', 'game', 'strategy'] },

    // Dev / Architecture
    { id: 'service-map', title: '🗺️ SERVICE MAP', component: <div className="h-full w-full overflow-auto"><iframe src="/service-map" className="w-full h-[800px] border-0" title="Service Map" /></div>, category: 'utilities', icon: <Network className="w-5 h-5" />, description: 'Grafana-style service dependency map showing all connections', tags: ['service', 'map', 'architecture', 'dependencies', 'grafana', 'network'] },
  ];

  const handleTabAdd = () => setShowTabSelector(true);

  const handleTabSelect = (selectedComponent: TabOption) => {
    const newPanel: PanelData = {
      id: `${selectedComponent.id}-${nextPanelId}`,
      title: selectedComponent.title,
      component: selectedComponent.component
    };
    setPanels([...panels, newPanel]);
    setNextPanelId(nextPanelId + 1);
    setShowTabSelector(false);
    setShowCommandPalette(false);
  };

  const openPanelById = useCallback((panelId: string) => {
    const component = availableComponents.find(c => c.id === panelId);
    if (component) {
      const newPanel: PanelData = {
        id: `${component.id}-${panelIdCounter}`,
        title: component.title,
        component: component.component
      };
      setPanels(prev => [...prev, newPanel]);
      setPanelIdCounter(prev => prev + 1);
      console.log(`✅ Panel opened via AI: ${component.title}`);
    }
  }, [availableComponents, panelIdCounter]);

  const closePanelById = useCallback((panelId: string) => {
    setPanels(prev => {
      const panelToClose = prev.find(p => p.id.startsWith(panelId));
      if (panelToClose) {
        console.log(`✅ Panel closed via AI: ${panelToClose.title}`);
        return prev.filter(p => p.id !== panelToClose.id);
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    registerPanelOpener(openPanelById);
    registerPanelCloser(closePanelById);
  }, [registerPanelOpener, registerPanelCloser, openPanelById, closePanelById]);

  // Bangkok time
  const bangkokTime = new Date(currentTime.getTime()).toLocaleTimeString('en-US', { timeZone: 'Asia/Bangkok', hour12: false });
  const nyTime = currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
  const londonTime = currentTime.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour12: false });

  if (isMobile) {
    return (
      <MobileLayout panels={panels} availableComponents={availableComponents} onPanelAdd={handleTabSelect} onPanelClose={handlePanelClose} currentTime={currentTime} onSignOut={signOut} />
    );
  }

  if (isTablet) {
    return (
      <TabletLayout panels={panels} availableComponents={availableComponents} onPanelAdd={handleTabSelect} onPanelClose={handlePanelClose} currentTime={currentTime} onSignOut={signOut} />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <PenguinSticker />
      <DesignSwitcher />

      {/* Ticker Tape */}
      <TickerTape />

      {/* Header */}
      <div className="bg-background border-b border-border px-3 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-terminal-green">ABLE TERMINAL</span>
            {/* OBB Status */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${obbConnected ? 'bg-terminal-green animate-pulse' : 'bg-terminal-red'}`} />
              <span className={`text-[9px] font-mono ${obbConnected ? 'text-terminal-green' : 'text-terminal-red'}`}>
                OBB {obbConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <span className="text-xs text-terminal-amber font-mono">PROFESSIONAL TRADING PLATFORM</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Command Palette Button */}
            <Button variant="ghost" size="sm" onClick={() => setShowCommandPalette(true)} className="h-7 px-2 text-muted-foreground hover:text-terminal-green hover:bg-terminal-green/10 gap-1">
              <Command className="h-3.5 w-3.5" />
              <span className="text-[9px] font-mono">⌘K</span>
            </Button>

            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative h-7 w-7 text-muted-foreground hover:text-terminal-amber hover:bg-terminal-amber/10">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-terminal-red rounded-full text-[7px] font-mono text-white flex items-center justify-center">3</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-7 w-7 text-terminal-green hover:bg-terminal-green/10">
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
            </Button>
            <ThemeSwitcher />
            <div className="text-xs text-terminal-green font-mono cursor-help" title={`NY: ${nyTime} | London: ${londonTime}`}>
              {bangkokTime} BKK | LIVE
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-terminal-red hover:bg-terminal-red/10 font-mono text-[10px] h-7">
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <TabManager
        panels={panels}
        onTabAdd={handleTabAdd}
        onPanelClose={handlePanelClose}
        onPanelMaximize={handlePanelMaximize}
        onPanelMinimize={handlePanelMinimize}
        onPanelRestore={handlePanelRestore}
        onPanelReorder={handlePanelReorder}
      />

      {showTabSelector && (
        <TabSelector onSelect={handleTabSelect} onClose={() => setShowTabSelector(false)} availableComponents={availableComponents} />
      )}

      {showCommandPalette && (
        <CommandPalette components={availableComponents} onSelect={handleTabSelect} onClose={() => setShowCommandPalette(false)} />
      )}
    </div>
  );
};

export default MarketData;
