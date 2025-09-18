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

import USDebtClock from './USDebtClock';
import NoteTaking from './NoteTaking';
import TradingJournal from './TradingJournal';
import FedWatch from './FedWatch';

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
    { id: 'fedwatch', title: 'FEDWATCH TOOL', component: <FedWatch /> },
    { id: 'calendar', title: 'ECONOMIC CALENDAR', component: <EconomicCalendar /> },
    { id: 'tradingview', title: 'TRADING VIEW CHART', component: <TradingViewChart /> },
    { id: 'scatter', title: 'SCATTER ANALYSIS', component: <ScatterAnalysis /> },
    { id: 'piechart', title: 'MARKET PIE CHART', component: <MarketPieChart /> },
    { id: 'news', title: 'BLOOMBERG NEWS', component: <BloombergNews /> },
    { id: 'depth', title: 'MARKET DEPTH', component: <MarketDepth /> },
    { id: 'volume', title: 'TRADING VOLUME', component: <TradingVolume /> },
    { id: 'heatmap', title: 'HEAT MAP', component: <HeatMap /> },
    { id: 'currency', title: 'CURRENCY TABLE', component: <CurrencyTable /> },
    { id: 'indicators', title: 'ECONOMIC INDICATORS', component: <EconomicIndicators /> },
    { id: 'cot', title: 'COT DATA', component: <COTData /> },
    { id: 'gold', title: 'SPDR GOLD DATA', component: <SPDRGoldData /> },
    { id: 'realmarket', title: 'REAL MARKET DATA', component: <RealMarketData /> },
    { id: 'able3ai', title: 'ABLE3 AI', component: <ABLE3AI /> },
    { id: 'bitcoin', title: 'BITCOIN MEMPOOL', component: <BitcoinMempool /> },
    { id: 'uamap', title: 'LIVE UA MAP', component: <LiveUAMap /> },
    { id: 'debtclock', title: 'US DEBT CLOCK', component: <USDebtClock /> },
    { id: 'notes', title: 'NOTE TAKING', component: <NoteTaking /> },
    { id: 'journal', title: 'TRADING JOURNAL', component: <TradingJournal /> }
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