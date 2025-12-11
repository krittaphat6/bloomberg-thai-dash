import { X, Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-primary/40 rounded w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20">
          <h3 className="text-sm font-bold text-primary">ADD COMPONENT</h3>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-primary/20">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs bg-black/40 border-primary/30 text-foreground"
            />
          </div>
        </div>

        {/* Grid - 6 columns */}
        <div className="p-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-6 gap-1.5">
            {filtered.map((component) => (
              <button
                key={component.id}
                onClick={() => onSelect(component)}
                className="p-2 text-center border border-primary/20 rounded hover:border-primary hover:bg-primary/10 transition-all group"
                title={component.title}
              >
                <span className="text-[10px] font-medium text-foreground line-clamp-2 group-hover:text-primary">
                  {component.title}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs">No components found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-primary/20 text-center">
          <span className="text-[10px] text-muted-foreground">{filtered.length} available</span>
        </div>
      </div>
    </div>
  );
};

export default TabSelector;
