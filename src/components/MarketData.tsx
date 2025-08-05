import { useEffect, useState } from 'react';
import DraggableTab from './DraggableTab';
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

interface TabData {
  id: string;
  title: string;
  component: React.ReactNode;
  closable: boolean;
}

const MarketData = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('markets');
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  useEffect(() => {
    const MarketsComponent = () => (
      <div className="flex-1 p-2">
        <div className="h-full grid grid-rows-3 gap-2">
          <div className="grid grid-cols-6 gap-2">
            <div className="terminal-panel">
              <div className="panel-header">MAJOR INDICES</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">SPX</div>
                  <div className="price">5829.76</div>
                  <div className="change-negative">-12.64</div>
                  <div className="change-negative">-0.22%</div>
                </div>
              </div>
            </div>
            <div className="terminal-panel">
              <div className="panel-header">FUTURES</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">ES=F</div>
                  <div className="price">5832.25</div>
                  <div className="change-positive">+2.49</div>
                  <div className="change-positive">+0.04%</div>
                </div>
              </div>
            </div>
            <div className="terminal-panel">
              <div className="panel-header">COMMODITIES</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">GOLD</div>
                  <div className="price">2650.45</div>
                  <div className="change-negative">-8.12</div>
                  <div className="change-negative">-0.31%</div>
                </div>
              </div>
            </div>
            <CurrencyTable />
            <div className="terminal-panel">
              <div className="panel-header">VOLATILITY</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">VIX</div>
                  <div className="price">18.45</div>
                  <div className="change-negative">-1.23</div>
                  <div className="change-negative">-6.25%</div>
                </div>
              </div>
            </div>
            <div className="terminal-panel">
              <div className="panel-header">CRYPTO</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">BTC</div>
                  <div className="price">96,847</div>
                  <div className="change-positive">+1,234</div>
                  <div className="change-positive">+1.29%</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <EconomicIndicators />
            <HeatMap />
            <MarketDepth />
            <TradingVolume />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MarketPieChart />
            <ScatterAnalysis />
            <EconomicCalendar />
          </div>
        </div>
      </div>
    );

    const initialTabs: TabData[] = [
      { id: 'markets', title: 'MARKETS', component: <MarketsComponent />, closable: false },
      { id: 'economic', title: 'ECONOMIC', component: <EconomicIndicators />, closable: true },
      { id: 'cot', title: 'COT REPORT', component: <COTData />, closable: true },
      { id: 'gold', title: 'GOLD/SPDR', component: <SPDRGoldData />, closable: true },
      { id: 'news', title: 'NEWS', component: <BloombergNews />, closable: true },
      { id: 'analysis', title: 'ANALYSIS', component: <ScatterAnalysis />, closable: true }
    ];
    setTabs(initialTabs);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const handleTabDragStart = (id: string, e: React.DragEvent) => {
    setDraggedTab(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== id) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleTabDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== targetId) {
      const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
      const targetIndex = tabs.findIndex(t => t.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newTabs = [...tabs];
        const draggedTabData = newTabs[draggedIndex];
        newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, draggedTabData);
        setTabs(newTabs);
      }
    }
    setDraggedTab(null);
  };

  const handleTabClose = (id: string) => {
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id && newTabs.length > 0) {
      setActiveTab(newTabs[0].id);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="bg-background border-b border-border p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="text-2xl font-bold text-terminal-green">ABLE TERMINAL</span>
            <span className="text-terminal-amber">PROFESSIONAL TRADING PLATFORM</span>
          </div>
          <div className="text-terminal-green font-mono">
            {currentTime.toLocaleTimeString()} EST | LIVE
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex bg-background/50 border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <DraggableTab
              key={tab.id}
              id={tab.id}
              title={tab.title}
              isActive={activeTab === tab.id}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => handleTabClose(tab.id)}
              onDragStart={handleTabDragStart}
              onDragOver={handleTabDragOver}
              onDrop={handleTabDrop}
              isDragging={draggedTab === tab.id}
            />
          ))}
        </div>

        <div className="flex-1 bg-background">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
};

export default MarketData;