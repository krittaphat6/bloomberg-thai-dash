import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TabManager from './TabManager';
import TabSelector from './TabSelector';
import ThemeSwitcher from './ThemeSwitcher';
import DesignSwitcher from './DesignSwitcher';
import { Button } from '@/components/ui/button';
import { Expand, Minimize, LogOut, TrendingUp, BarChart3, Brain, Wrench, MessageSquare, Gamepad2, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveContext } from '@/contexts/ResponsiveContext';
import { MobileLayout } from './mobile/MobileLayout';
import { TabletLayout } from './tablet/TabletLayout';
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
import TradingJournal from './TradingJournal';
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

const MarketData = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsiveContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [nextPanelId, setNextPanelId] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearInterval(timeInterval);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handlePanelClose = (id: string) => {
    const newPanels = panels.filter(p => p.id !== id);
    setPanels(newPanels);
  };

  const handlePanelMaximize = (id: string) => {
    const newPanels = panels.map(p => ({
      ...p,
      isMaximized: p.id === id,
      isMinimized: false
    }));
    setPanels(newPanels);
  };

  const handlePanelMinimize = (id: string) => {
    const newPanels = panels.map(p => 
      p.id === id ? { ...p, isMinimized: true, isMaximized: false } : p
    );
    setPanels(newPanels);
  };

  const handlePanelRestore = (id: string) => {
    const newPanels = panels.map(p => 
      p.id === id ? { ...p, isMinimized: false, isMaximized: false } : p
    );
    setPanels(newPanels);
  };

  const handlePanelReorder = (newPanels: PanelData[]) => {
    setPanels(newPanels);
  };

  const availableComponents: TabOption[] = [
    // Trading Tools
    { 
      id: 'trading-chart', 
      title: '📊 TRADING CHART', 
      component: <TradingChartMain />,
      category: 'trading',
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Advanced charting with Pine Script support and real-time data',
      tags: ['chart', 'technical', 'indicators', 'pine-script']
    },
    { 
      id: 'options-3d', 
      title: '📈 OPTIONS-3D', 
      component: <div className="h-full w-full overflow-auto"><iframe src="/options" className="w-full h-[800px] border-0" title="Options 3D" /></div>,
      category: 'trading',
      description: '3D options visualization and analysis',
      tags: ['options', '3d', 'visualization', 'greeks']
    },
    { 
      id: 'stockdio', 
      title: 'STOCKDIO CHARTS', 
      component: <StockdioCharts />,
      category: 'trading',
      description: 'Professional stock charts with real-time updates',
      tags: ['stocks', 'charts', 'real-time']
    },
    { 
      id: 'forex', 
      title: '💱 FOREX & ECONOMICS', 
      component: <ForexEconomicData />,
      category: 'trading',
      description: 'Forex pairs and economic indicators',
      tags: ['forex', 'economics', 'currencies', 'fx']
    },
    { 
      id: 'fedwatch', 
      title: '🏦 FED WATCH', 
      component: <FedWatch />,
      category: 'trading',
      description: 'Federal Reserve policy monitoring',
      tags: ['fed', 'interest-rates', 'monetary-policy']
    },
    
    // Market Analysis
    { 
      id: 'crypto', 
      title: '₿ CRYPTO LIVE', 
      component: <CryptoLiveCharts />,
      category: 'analysis',
      description: 'Live cryptocurrency prices and charts',
      tags: ['crypto', 'bitcoin', 'ethereum', 'live']
    },
    { 
      id: 'crypto-map', 
      title: '🗺️ CRYPTO MARKET MAP', 
      component: <CryptoMarketMap />,
      category: 'analysis',
      description: 'Visual heatmap of cryptocurrency market by market cap',
      tags: ['crypto', 'heatmap', 'market-cap', 'visualization']
    },
    { 
      id: 'scatter', 
      title: 'SCATTER ANALYSIS', 
      component: <ScatterAnalysis />,
      category: 'analysis',
      description: 'RS-Ratio vs RS-Momentum scatter plot',
      tags: ['scatter', 'correlation', 'relative-strength']
    },
    { 
      id: 'scatter-point', 
      title: '📍 SCATTER POINT', 
      component: <ScatterPointChart />,
      category: 'analysis',
      description: 'Advanced scatter plot with quadrant analysis (Leading/Lagging)',
      tags: ['scatter', 'rs-ratio', 'momentum', 'quadrants', 'rrg']
    },
    { 
      id: 'correlation-matrix', 
      title: '🔢 CORRELATION MATRIX', 
      component: <CorrelationMatrixTable />,
      category: 'analysis',
      description: 'Multi-asset correlation analysis (Pearson/Spearman/Kendall)',
      tags: ['correlation', 'matrix', 'pearson', 'spearman', 'portfolio']
    },
    { 
      id: 'cvd', 
      title: '📊 CVD CHART', 
      component: <CVDChart />,
      category: 'analysis',
      description: 'Cumulative Volume Delta with multi-exchange weighted average',
      tags: ['cvd', 'volume', 'delta', 'orderflow']
    },
    { 
      id: 'topnews', 
      title: '🔥 TOP NEWS', 
      component: <TopNews />,
      category: 'communication',
      description: 'Multi-source news aggregator with sentiment analysis',
      tags: ['news', 'reddit', 'twitter', 'sentiment']
    },
    { 
      id: 'pie', 
      title: '🥧 MARKET PIE', 
      component: <MarketPieChart />,
      category: 'analysis',
      description: 'Market sector allocation pie chart',
      tags: ['pie-chart', 'sectors', 'allocation']
    },
    { 
      id: 'heatmap', 
      title: '🔥 HEAT MAP', 
      component: <HeatMap />,
      category: 'analysis',
      description: 'Market performance heatmap',
      tags: ['heatmap', 'performance', 'sectors']
    },
    { 
      id: 'depth', 
      title: '📊 MARKET DEPTH', 
      component: <MarketDepth />,
      category: 'analysis',
      description: 'Order book depth visualization',
      tags: ['depth', 'order-book', 'liquidity']
    },
    { 
      id: 'volume', 
      title: '📉 TRADING VOLUME', 
      component: <TradingVolume />,
      category: 'analysis',
      description: 'Volume analysis and profile',
      tags: ['volume', 'trading', 'liquidity']
    },
    { 
      id: 'currency', 
      title: '💵 CURRENCY TABLE', 
      component: <CurrencyTable />,
      category: 'analysis',
      description: 'Currency exchange rates table',
      tags: ['currency', 'forex', 'exchange-rates']
    },
    { 
      id: 'indicators', 
      title: '📈 ECONOMIC INDICATORS', 
      component: <EconomicIndicators />,
      category: 'analysis',
      description: 'Key economic indicators dashboard',
      tags: ['economics', 'gdp', 'inflation', 'indicators']
    },
    { 
      id: 'cot', 
      title: '📋 COT DATA', 
      component: <COTData />,
      category: 'analysis',
      description: 'Commitment of Traders report data',
      tags: ['cot', 'futures', 'positioning']
    },
    { 
      id: 'gold', 
      title: '🥇 SPDR GOLD DATA', 
      component: <SPDRGoldData />,
      category: 'analysis',
      description: 'SPDR Gold Trust ETF data',
      tags: ['gold', 'gld', 'commodities', 'precious-metals']
    },
    { 
      id: 'realmarket', 
      title: '📡 REAL MARKET DATA', 
      component: <RealMarketData />,
      category: 'analysis',
      description: 'Real-time market data feed',
      tags: ['real-time', 'market-data', 'live']
    },
    { 
      id: 'bitcoin', 
      title: '⛏️ BITCOIN MEMPOOL', 
      component: <BitcoinMempool />,
      category: 'analysis',
      description: 'Bitcoin mempool and transaction data',
      tags: ['bitcoin', 'mempool', 'blockchain', 'transactions']
    },
    
    // Intelligence & AI
    { 
      id: 'able-focus', 
      title: '🔍 ABLE-FOCUS', 
      component: <div className="h-full w-full overflow-auto"><iframe src="/relationship-dashboard" className="w-full h-[800px] border-0" title="ABLE Focus" /></div>,
      category: 'intelligence',
      icon: <Brain className="w-5 h-5" />,
      description: 'AI-powered relationship and network analysis',
      tags: ['ai', 'analysis', 'relationships', 'network']
    },
    { 
      id: 'intelligence', 
      title: '🧠 INTELLIGENCE PLATFORM', 
      component: <div className="h-full w-full overflow-auto"><iframe src="/intelligence" className="w-full h-[800px] border-0" title="Intelligence Platform" /></div>,
      category: 'intelligence',
      description: 'Comprehensive intelligence dashboard (Palantir-style)',
      tags: ['intelligence', 'dashboard', 'analytics', 'palantir']
    },
    { 
      id: 'able3ai', 
      title: '🤖 ABLE AI', 
      component: <ABLE3AI />,
      category: 'intelligence',
      icon: <Brain className="w-5 h-5" />,
      description: 'Local AI powered by Ollama - Full access to all app data',
      tags: ['ai', 'ollama', 'local', 'mcp', 'trading']
    },
    
    // Utilities
    { 
      id: 'code', 
      title: '💻 PYTHON CODE EDITOR', 
      component: <PythonCodeEditor />,
      category: 'utilities',
      icon: <Wrench className="w-5 h-5" />,
      description: 'Integrated Python and Pine Script editor with live execution',
      tags: ['python', 'code', 'editor', 'pine-script', 'programming']
    },
    { 
      id: 'notes', 
      title: '📝 NOTES', 
      component: <NoteTaking />,
      category: 'utilities',
      description: 'Quick note-taking and canvas tool',
      tags: ['notes', 'memo', 'text', 'canvas']
    },
    { 
      id: 'journal', 
      title: '📔 TRADING JOURNAL', 
      component: <TradingJournal />,
      category: 'utilities',
      description: 'Track and analyze your trades',
      tags: ['journal', 'trades', 'tracking', 'analytics', 'performance']
    },
    { 
      id: 'calendar', 
      title: '📅 ECONOMIC CALENDAR', 
      component: <EconomicCalendar />,
      category: 'utilities',
      description: 'Economic events and releases calendar',
      tags: ['calendar', 'events', 'economics', 'schedule']
    },
    { 
      id: 'investing', 
      title: '📰 INVESTING.COM', 
      component: <InvestingCharts />,
      category: 'utilities',
      description: 'Investing.com charts and data',
      tags: ['investing', 'charts', 'news']
    },
    
    // Communication
    { 
      id: 'messenger', 
      title: '💬 MESSENGER', 
      component: <LiveChatReal />,
      category: 'communication',
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Real-time chat with video calls and TradingView webhooks',
      tags: ['chat', 'messenger', 'video-call', 'webhooks']
    },
    { 
      id: 'news', 
      title: '📰 BLOOMBERG NEWS', 
      component: <BloombergNews />,
      category: 'communication',
      description: 'Latest financial news from Bloomberg',
      tags: ['news', 'bloomberg', 'financial', 'headlines']
    },
    { 
      id: 'tv', 
      title: '📺 BLOOMBERG LIVE TV', 
      component: <BloombergLiveTV />,
      category: 'communication',
      description: 'Live Bloomberg TV stream',
      tags: ['tv', 'live', 'bloomberg', 'streaming']
    },
    
    // Global Markets
    { 
      id: 'wol', 
      title: '🌍 WORLD MARKETS', 
      component: <WorldStockMarkets />,
      category: 'global',
      icon: <Globe className="w-5 h-5" />,
      description: '3D globe visualization of world stock markets status',
      tags: ['world', 'markets', 'global', 'exchanges', 'timezones']
    },
    { 
      id: 'uamap', 
      title: '🗺️ LIVE UA MAP', 
      component: <LiveUAMap />,
      category: 'global',
      description: 'Live geopolitical situation map',
      tags: ['map', 'geopolitics', 'live', 'situation']
    },
    { 
      id: 'debtclock', 
      title: '💸 US DEBT CLOCK', 
      component: <USDebtClock />,
      category: 'global',
      description: 'Real-time US national debt tracker',
      tags: ['debt', 'us', 'government', 'fiscal']
    },
    { 
      id: 'bloomberg-map', 
      title: '🌐 GLOBAL MAP', 
      component: <BloombergMap />,
      category: 'global',
      icon: <Globe className="w-5 h-5" />,
      description: 'Bloomberg-style interactive world map with real-time earthquakes, markets, and more',
      tags: ['map', 'global', 'earthquake', 'markets', 'bloomberg', 'world']
    },
    
    // Entertainment
    { 
      id: 'pacman', 
      title: '🎮 PAC-MAN', 
      component: <div className="h-full w-full overflow-auto"><iframe src="/pacman" className="w-full h-[800px] border-0" title="Pac-Man Game" /></div>,
      category: 'entertainment',
      icon: <Gamepad2 className="w-5 h-5" />,
      description: 'Classic Pac-Man arcade game',
      tags: ['game', 'arcade', 'fun', 'break']
    },
    { 
      id: 'chess', 
      title: '♟️ CHESS PUZZLE', 
      component: <ChessGame />,
      category: 'entertainment',
      description: 'Chess puzzles and challenges',
      tags: ['chess', 'puzzle', 'game', 'strategy']
    },
  ];

  const handleTabAdd = () => {
    setShowTabSelector(true);
  };

  const handleTabSelect = (selectedComponent: TabOption) => {
    const newPanel: PanelData = {
      id: `${selectedComponent.id}-${nextPanelId}`,
      title: selectedComponent.title,
      component: selectedComponent.component
    };
    setPanels([...panels, newPanel]);
    setNextPanelId(nextPanelId + 1);
    setShowTabSelector(false);
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileLayout
        panels={panels}
        availableComponents={availableComponents}
        onPanelAdd={handleTabSelect}
        onPanelClose={handlePanelClose}
        currentTime={currentTime}
        onSignOut={signOut}
      />
    );
  }

  // Tablet Layout
  if (isTablet) {
    return (
      <TabletLayout
        panels={panels}
        availableComponents={availableComponents}
        onPanelAdd={handleTabSelect}
        onPanelClose={handlePanelClose}
        currentTime={currentTime}
        onSignOut={signOut}
      />
    );
  }

  // Desktop Layout (existing)
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <PenguinSticker />
      <DesignSwitcher />
      <div className="bg-background border-b border-border p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <span className="text-lg sm:text-2xl font-bold text-terminal-green">ABLE TERMINAL</span>
            <span className="text-sm sm:text-base text-terminal-amber">PROFESSIONAL TRADING PLATFORM</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-terminal-green hover:bg-terminal-green/10"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
            <ThemeSwitcher />
            <div className="text-sm sm:text-base text-terminal-green font-mono">
              {currentTime.toLocaleTimeString()} EST | LIVE
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-terminal-red hover:bg-terminal-red/10 font-mono text-xs"
            >
              <LogOut className="h-4 w-4 mr-1" />
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
        <TabSelector
          onSelect={handleTabSelect}
          onClose={() => setShowTabSelector(false)}
          availableComponents={availableComponents}
        />
      )}
    </div>
  );
};

export default MarketData;
