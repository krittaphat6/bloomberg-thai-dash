import { 
  BarChart2, 
  MessageCircle, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Globe, 
  Bell,
  TrendingUp,
  ChevronRight,
  Zap
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileHomeScreenProps {
  currentTime: Date;
  onNavigate?: (tab: string, panelId?: string) => void;
}

export function MobileHomeScreen({ currentTime, onNavigate }: MobileHomeScreenProps) {
  
  const handleNavigate = (tab: string, panelId?: string) => {
    if (onNavigate) {
      onNavigate(tab, panelId);
    }
  };

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const mainFeatures = [
    { 
      id: 'charts', 
      label: 'Trading Chart', 
      description: 'Live markets',
      icon: BarChart2, 
      tab: 'panels',
      panelId: 'trading-chart',
      color: 'bg-blue-500/10 text-blue-500'
    },
    { 
      id: 'messenger', 
      label: 'Messenger', 
      description: 'Team chat',
      icon: MessageCircle, 
      tab: 'chat',
      color: 'bg-green-500/10 text-green-500'
    },
    { 
      id: 'journal', 
      label: 'Journal', 
      description: 'Trade logs',
      icon: BookOpen, 
      tab: 'panels',
      panelId: 'journal',
      color: 'bg-amber-500/10 text-amber-500'
    },
    { 
      id: 'ai', 
      label: 'ABLE AI', 
      description: 'AI analysis',
      icon: Sparkles, 
      tab: 'panels',
      panelId: 'able-ai',
      color: 'bg-purple-500/10 text-purple-500'
    },
  ];

  const quickActions = [
    { id: 'news', label: 'News', icon: Globe, tab: 'panels', panelId: 'news' },
    { id: 'alerts', label: 'Alerts', icon: Bell, tab: 'panels', panelId: 'alerts' },
    { id: 'notes', label: 'Notes', icon: FileText, tab: 'panels', panelId: 'notes' },
    { id: 'markets', label: 'Markets', icon: TrendingUp, tab: 'panels', panelId: 'world-markets' },
  ];

  return (
    <ScrollArea className="flex-1">
      <div className="min-h-full flex flex-col px-5 py-6 pb-10">
        
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">{greeting()}</p>
          <h1 className="text-2xl font-bold text-foreground">ABLE Terminal</h1>
        </div>

        {/* Main Features - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => handleNavigate(feature.tab, feature.panelId)}
                className="bg-card border border-border/50 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{feature.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Access</h2>
          <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/30">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleNavigate(action.tab, action.panelId)}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:bg-accent/30 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Footer */}
        <div className="mt-auto">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <Zap className="w-3 h-3" />
            <span>All systems operational</span>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
