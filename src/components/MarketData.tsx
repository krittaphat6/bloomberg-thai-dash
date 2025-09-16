import { useEffect, useState } from 'react';
import TabManager from './TabManager';
import TabSelector from './TabSelector';
import ThemeSwitcher from './ThemeSwitcher';
import DesignSwitcher from './DesignSwitcher';
import { Button } from '@/components/ui/button';
import { Expand, Minimize } from 'lucide-react';
import TradingViewChart from './TradingViewChart';
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
import MarineTraffic from './MarineTraffic';
import USDebtClock from './USDebtClock';
import ThaiStockStreaming from './ThaiStockStreaming';
import USDebtData from './USDebtData';

interface PanelData {
  id: string;
  title: string;
  component: React.ReactNode;
}

const MarketData = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [nextPanelId, setNextPanelId] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // ตรวจสอบ fullscreen status
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

  const availableComponents = [
    { id: 'tradingview', title: 'TRADINGVIEW CHART', component: <TradingViewChart /> },
    { id: 'us-debt-clock', title: 'US DEBT CLOCK', component: <USDebtClock /> },
    { id: 'us-debt-data', title: 'US DEBT DATA', component: <USDebtData /> },
    { id: 'thai-stock', title: 'THAI STOCK STREAMING', component: <ThaiStockStreaming /> },
    { id: 'able3-ai', title: 'ABLE 3.0 AI', component: <ABLE3AI /> },
    { id: 'bitcoin-mempool', title: 'BITCOIN MEMPOOL', component: <BitcoinMempool /> },
    { id: 'live-ua-map', title:'LIVE UA MAP', component: <LiveUAMap /> },
    { id: 'marine-traffic', title: 'MARINE TRAFFIC', component: <MarineTraffic /> },
    { id: 'real-market', title: 'REAL MARKET DATA', component: <RealMarketData /> },
    { id: 'economic', title: 'ECONOMIC INDICATORS', component: <EconomicIndicators /> },
    { id: 'cot', title: 'COT REPORT', component: <COTData /> },
    { id: 'gold', title: 'GOLD/SPDR', component: <SPDRGoldData /> },
    { id: 'news', title: 'BLOOMBERG NEWS', component: <BloombergNews /> },
    { id: 'analysis', title: 'SCATTER ANALYSIS', component: <ScatterAnalysis /> },
    { id: 'pie-chart', title: 'MARKET PIE CHART', component: <MarketPieChart /> },
    { id: 'calendar', title: 'ECONOMIC CALENDAR', component: <EconomicCalendar /> },
    { id: 'depth', title: 'MARKET DEPTH', component: <MarketDepth /> },
    { id: 'volume', title: 'TRADING VOLUME', component: <TradingVolume /> },
    { id: 'heatmap', title: 'HEAT MAP', component: <HeatMap /> },
    { id: 'currency', title: 'CURRENCY TABLE', component: <CurrencyTable /> }
  ];

  const handleTabAdd = () => {
    setShowTabSelector(true);
  };

  const handleTabSelect = (selectedComponent: any) => {
    const newPanel: PanelData = {
      id: `${selectedComponent.id}-${nextPanelId}`,
      title: selectedComponent.title,
      component: selectedComponent.component
    };
    setPanels([...panels, newPanel]);
    setNextPanelId(nextPanelId + 1);
    setShowTabSelector(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <DesignSwitcher />
      <div className="bg-background border-b border-border p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <span className="text-lg sm:text-2xl font-bold text-terminal-green">ABLE TERMINAL</span>
            <span className="text-sm sm:text-base text-terminal-amber">PROFESSIONAL TRADING PLATFORM</span>
          </div>
          <div className="flex items-center gap-4">
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