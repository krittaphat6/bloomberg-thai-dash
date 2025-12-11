import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TabOption {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface TabSelectorProps {
  onSelect: (tab: TabOption) => void;
  onClose: () => void;
  availableComponents: TabOption[];
}

const TabSelector = ({ onSelect, onClose, availableComponents }: TabSelectorProps) => {
  const [search, setSearch] = useState('');

  const filtered = availableComponents.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-primary/30 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/20">
          <h3 className="text-lg font-bold text-primary">ADD COMPONENT</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-primary/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/40 border-primary/30"
            />
          </div>
        </div>

        {/* Components Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((component) => (
              <button
                key={component.id}
                onClick={() => onSelect(component)}
                className="p-3 text-center border border-primary/20 rounded hover:border-primary hover:bg-primary/10 transition-all hover:scale-105"
              >
                <span className="text-xs font-medium text-foreground line-clamp-2">
                  {component.title}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No components found</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-primary/20 text-center text-xs text-muted-foreground">
          {filtered.length} component{filtered.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
};

export default TabSelector;
