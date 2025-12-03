import { Home, Plus, MessageSquare, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddPanel: () => void;
  hasPanels: boolean;
}

const tabs = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'panels', icon: BarChart3, label: 'Panels' },
  { id: 'add', icon: Plus, label: 'Add', isAction: true },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'settings', icon: Settings, label: 'More' },
];

export function MobileTabBar({ activeTab, onTabChange, onAddPanel, hasPanels }: MobileTabBarProps) {
  return (
    <nav className="mobile-nav flex items-center justify-around bg-background/95 backdrop-blur-sm">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.id}
            onClick={() => tab.isAction ? onAddPanel() : onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full touch-target transition-colors",
              tab.isAction 
                ? "text-terminal-green" 
                : isActive 
                  ? "text-terminal-green" 
                  : "text-muted-foreground"
            )}
          >
            {tab.isAction ? (
              <div className="w-10 h-10 rounded-full bg-terminal-green/20 flex items-center justify-center border border-terminal-green/50">
                <Icon className="w-5 h-5" />
              </div>
            ) : (
              <>
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {tab.id === 'panels' && hasPanels && (
                  <div className="absolute top-2 right-1/4 w-2 h-2 bg-terminal-amber rounded-full" />
                )}
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
