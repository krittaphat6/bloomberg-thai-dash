import { useState, useMemo } from 'react';
import { X, Search, TrendingUp, BarChart3, Brain, Wrench, MessageSquare, Gamepad2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ComponentOption {
  id: string;
  title: string;
  component: React.ReactNode;
  category?: string;
  description?: string;
  tags?: string[];
}

interface MobilePanelSelectorProps {
  availableComponents: ComponentOption[];
  onSelect: (component: ComponentOption) => void;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  trading: { label: 'Trading', icon: TrendingUp, color: 'text-green-500' },
  analysis: { label: 'Analysis', icon: BarChart3, color: 'text-blue-500' },
  intelligence: { label: 'Intel & AI', icon: Brain, color: 'text-purple-500' },
  utilities: { label: 'Utilities', icon: Wrench, color: 'text-amber-500' },
  communication: { label: 'Comms', icon: MessageSquare, color: 'text-cyan-500' },
  entertainment: { label: 'Games', icon: Gamepad2, color: 'text-pink-500' },
  global: { label: 'Global', icon: Globe, color: 'text-teal-500' },
};

// Fallback categorization for components without category field
const getCategoryForComponent = (comp: ComponentOption): string => {
  if (comp.category) return comp.category;
  const id = comp.id;
  if (['messenger', 'notes', 'journal', 'canvas', 'code'].includes(id)) return 'utilities';
  if (['stockdio', 'investing', 'crypto', 'scatter', 'pie', 'heatmap', 'depth', 'volume', 'crypto-map', 'scatter-point', 'correlation-matrix'].includes(id)) return 'analysis';
  if (['forex', 'calendar', 'news', 'indicators', 'cot', 'gold', 'realmarket', 'bitcoin', 'fedwatch', 'currency', 'trading-chart', 'options-3d'].includes(id)) return 'trading';
  if (['able-focus', 'intelligence', 'able3ai'].includes(id)) return 'intelligence';
  if (['wol', 'uamap', 'debtclock'].includes(id)) return 'global';
  if (['pacman', 'chess'].includes(id)) return 'entertainment';
  return 'utilities';
};

export function MobilePanelSelector({ availableComponents, onSelect, onClose }: MobilePanelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Get unique categories from components
  const availableCategories = useMemo(() => {
    const cats = new Set(availableComponents.map(comp => getCategoryForComponent(comp)));
    return ['all', ...Array.from(cats)];
  }, [availableComponents]);

  const filteredComponents = useMemo(() => {
    return availableComponents.filter((comp) => {
      const matchesSearch = 
        comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || getCategoryForComponent(comp) === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [availableComponents, searchQuery, activeCategory]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-terminal-green">⚡ Add Panel</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar border-b border-border/50">
        {availableCategories.map((catId) => {
          const config = CATEGORY_CONFIG[catId];
          const Icon = config?.icon;
          return (
            <Button
              key={catId}
              variant={activeCategory === catId ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(catId)}
              className={cn(
                "whitespace-nowrap text-xs",
                activeCategory === catId 
                  ? "bg-terminal-green text-background" 
                  : "border-terminal-green/30 text-terminal-green"
              )}
            >
              {Icon && <Icon className="w-3 h-3 mr-1" />}
              {catId === 'all' ? 'All' : config?.label || catId}
            </Button>
          );
        })}
      </div>

      {/* Components Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-3">
          {filteredComponents.map((comp) => {
            const catConfig = CATEGORY_CONFIG[getCategoryForComponent(comp)];
            return (
              <button
                key={comp.id}
                onClick={() => onSelect(comp)}
                className="p-3 bg-card border border-border rounded-lg text-left active:bg-accent/50 transition-colors touch-target"
              >
                <span className={cn("text-xs font-medium line-clamp-2", catConfig?.color || 'text-terminal-green')}>
                  {comp.title}
                </span>
                {comp.description && (
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                    {comp.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-2">🔍</div>
            No components found
          </div>
        )}
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-3 border-t border-border text-center text-xs text-muted-foreground">
        <span className="text-terminal-amber font-mono">{filteredComponents.length}</span> components
      </div>
    </div>
  );
}
