import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ComponentOption {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface MobilePanelSelectorProps {
  availableComponents: ComponentOption[];
  onSelect: (component: ComponentOption) => void;
  onClose: () => void;
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'tools', label: 'Tools' },
  { id: 'charts', label: 'Charts' },
  { id: 'data', label: 'Data' },
  { id: 'other', label: 'Other' },
];

const getCategoryForComponent = (id: string): string => {
  if (['messenger', 'notes', 'journal', 'canvas', 'code'].includes(id)) return 'tools';
  if (['stockdio', 'investing', 'crypto', 'scatter', 'pie', 'heatmap', 'depth', 'volume'].includes(id)) return 'charts';
  if (['forex', 'calendar', 'news', 'indicators', 'cot', 'gold', 'realmarket', 'bitcoin', 'fedwatch', 'currency'].includes(id)) return 'data';
  return 'other';
};

export function MobilePanelSelector({ availableComponents, onSelect, onClose }: MobilePanelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredComponents = availableComponents.filter((comp) => {
    const matchesSearch = comp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || getCategoryForComponent(comp.id) === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-terminal-green">Add Panel</h2>
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
      <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "whitespace-nowrap",
              activeCategory === cat.id 
                ? "bg-terminal-green text-background" 
                : "border-terminal-green/30 text-terminal-green"
            )}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Components Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-3 p-4">
          {filteredComponents.map((comp) => (
            <button
              key={comp.id}
              onClick={() => onSelect(comp)}
              className="p-4 bg-card border border-border rounded-lg text-left active:bg-accent/50 transition-colors touch-target"
            >
              <span className="text-sm font-medium text-terminal-green line-clamp-2">
                {comp.title}
              </span>
            </button>
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No components found
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
