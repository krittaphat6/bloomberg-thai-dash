import { useState, useMemo } from 'react';
import { X, Search, TrendingUp, BarChart3, Brain, Wrench, MessageSquare, Gamepad2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TabOption {
  id: string;
  title: string;
  component: React.ReactNode;
  category: string;
  icon?: React.ReactNode;
  description?: string;
  tags?: string[];
}

interface EnhancedTabSelectorProps {
  onSelect: (tab: TabOption) => void;
  onClose: () => void;
  availableComponents: TabOption[];
}

const CATEGORIES: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  trading: {
    label: 'Trading Tools',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  analysis: {
    label: 'Market Analysis',
    icon: BarChart3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  intelligence: {
    label: 'Intelligence & AI',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  utilities: {
    label: 'Utilities',
    icon: Wrench,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  communication: {
    label: 'Communication',
    icon: MessageSquare,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  entertainment: {
    label: 'Entertainment',
    icon: Gamepad2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
  global: {
    label: 'Global Markets',
    icon: Globe,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10'
  }
};

const EnhancedTabSelector = ({ onSelect, onClose, availableComponents }: EnhancedTabSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter components based on search and category
  const filteredComponents = useMemo(() => {
    let filtered = availableComponents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [availableComponents, searchQuery, selectedCategory]);

  // Group by category
  const componentsByCategory = useMemo(() => {
    const grouped: Record<string, TabOption[]> = {};
    filteredComponents.forEach(comp => {
      if (!grouped[comp.category]) {
        grouped[comp.category] = [];
      }
      grouped[comp.category].push(comp);
    });
    return grouped;
  }, [filteredComponents]);

  // Get unique categories from available components
  const availableCategories = useMemo(() => {
    const cats = new Set(availableComponents.map(c => c.category));
    return Object.entries(CATEGORIES).filter(([key]) => cats.has(key));
  }, [availableComponents]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-background/95 border border-terminal-amber/30 rounded-lg shadow-2xl w-[90vw] max-w-6xl h-[85vh] flex flex-col backdrop-blur-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-terminal-amber/20">
          <div>
            <h2 className="text-2xl font-bold text-terminal-amber tracking-wide">
              ⚡ COMPONENT SELECTOR
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a component to add to your workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-destructive/20 hover:text-destructive transition-all duration-200 text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-terminal-amber/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search components, features, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-black/40 border-terminal-amber/30 text-foreground placeholder:text-muted-foreground focus:border-terminal-amber/60"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b border-terminal-amber/20">
            <TabsList className="w-full bg-black/40 p-1 flex flex-wrap gap-1 h-auto">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-terminal-amber data-[state=active]:text-black text-xs"
              >
                All
              </TabsTrigger>
              {availableCategories.map(([key, cat]) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key}
                    className="data-[state=active]:bg-terminal-amber data-[state=active]:text-black text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {cat.label.split(' ')[0]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            {selectedCategory === 'all' ? (
              // Show all categories
              <div className="space-y-8">
                {Object.entries(componentsByCategory).map(([category, components]) => {
                  const catInfo = CATEGORIES[category as keyof typeof CATEGORIES];
                  const Icon = catInfo?.icon || BarChart3;
                  
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`p-2 rounded-lg ${catInfo?.bgColor}`}>
                          <Icon className={`w-5 h-5 ${catInfo?.color}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {catInfo?.label || category}
                        </h3>
                        <Badge variant="outline" className="ml-2">
                          {components.length}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {components.map((component) => (
                          <ComponentCard 
                            key={component.id} 
                            component={component} 
                            onSelect={() => onSelect(component)} 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Show single category
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredComponents.map((component) => (
                  <ComponentCard 
                    key={component.id} 
                    component={component} 
                    onSelect={() => onSelect(component)} 
                  />
                ))}
              </div>
            )}

            {filteredComponents.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No components found</h3>
                <p className="text-muted-foreground/60">Try adjusting your search or category filter</p>
              </div>
            )}
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-terminal-amber/20 text-center text-sm text-muted-foreground">
          <span className="text-terminal-amber font-mono">{filteredComponents.length}</span> components available
        </div>
      </div>
    </div>
  );
};

// Component Card
const ComponentCard = ({ component, onSelect }: { component: TabOption; onSelect: () => void }) => {
  return (
    <button
      onClick={onSelect}
      className="group relative p-4 text-left border border-terminal-amber/20 rounded-lg hover:border-terminal-amber/60 hover:bg-terminal-amber/5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-terminal-amber/10"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground group-hover:text-terminal-amber transition-colors">
            {component.title}
          </h4>
          {component.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {component.description}
            </p>
          )}
        </div>
        {component.icon && (
          <div className="ml-2 text-terminal-amber/60 group-hover:text-terminal-amber transition-colors">
            {component.icon}
          </div>
        )}
      </div>
      
      {component.tags && component.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {component.tags.slice(0, 3).map((tag, i) => (
            <span 
              key={i} 
              className="text-[10px] px-2 py-0.5 bg-terminal-amber/10 text-terminal-amber/80 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-terminal-amber/0 to-terminal-amber/0 group-hover:from-terminal-amber/5 group-hover:to-transparent transition-all duration-200" />
    </button>
  );
};

export default EnhancedTabSelector;
