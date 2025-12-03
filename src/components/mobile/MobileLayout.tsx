import { useState } from 'react';
import { MobileTabBar } from './MobileTabBar';
import { MobilePanelStack } from './MobilePanelStack';
import { MobilePanelSelector } from './MobilePanelSelector';
import { MobileHeader } from './MobileHeader';
import { MobileHomeScreen } from './MobileHomeScreen';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import LiveChatReal from '@/components/LiveChatReal';

interface Panel {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface ComponentOption {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface MobileLayoutProps {
  panels: Panel[];
  availableComponents: ComponentOption[];
  onPanelAdd: (component: ComponentOption) => void;
  onPanelClose: (id: string) => void;
  currentTime: Date;
  onSignOut: () => void;
}

export function MobileLayout({
  panels,
  availableComponents,
  onPanelAdd,
  onPanelClose,
  currentTime,
  onSignOut
}: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [showPanelSelector, setShowPanelSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleTabChange = (tab: string) => {
    if (tab === 'settings') {
      setShowSettings(true);
    } else {
      setActiveTab(tab);
      setActivePanel(null);
    }
  };

  const handlePanelSelect = (panel: Panel) => {
    setActivePanel(panel);
  };

  const handleBack = () => {
    setActivePanel(null);
  };

  const handleAddPanel = () => {
    setShowPanelSelector(true);
  };

  const handleSelectComponent = (component: ComponentOption) => {
    onPanelAdd(component);
    setShowPanelSelector(false);
    setActiveTab('panels');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <MobileHomeScreen currentTime={currentTime} />;
      case 'panels':
        return (
          <MobilePanelStack
            panels={panels}
            activePanel={activePanel}
            onPanelSelect={handlePanelSelect}
            onPanelClose={onPanelClose}
            onBack={handleBack}
          />
        );
      case 'chat':
        return (
          <div className="flex-1 overflow-hidden">
            <LiveChatReal />
          </div>
        );
      default:
        return <MobileHomeScreen currentTime={currentTime} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {!activePanel && <MobileHeader currentTime={currentTime} />}
      
      <main className="flex-1 overflow-hidden pb-[60px]">
        {renderContent()}
      </main>

      {!activePanel && (
        <MobileTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onAddPanel={handleAddPanel}
          hasPanels={panels.length > 0}
        />
      )}

      {showPanelSelector && (
        <MobilePanelSelector
          availableComponents={availableComponents}
          onSelect={handleSelectComponent}
          onClose={() => setShowPanelSelector(false)}
        />
      )}

      <MobileSettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        onSignOut={onSignOut}
      />
    </div>
  );
}
