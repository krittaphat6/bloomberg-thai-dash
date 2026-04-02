import { X, Search, Star, StarOff } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface TabOption {
  id: string;
  title: string;
  component: React.ReactNode;
  category?: string;
  icon?: React.ReactNode;
  description?: string;
  tags?: string[];
}

interface TabSelectorProps {
  onSelect: (tab: TabOption) => void;
  onClose: () => void;
  availableComponents: TabOption[];
}

const CATEGORIES = [
  { id: 'all', label: '🔥 All', color: 'text-terminal-green' },
  { id: 'trading', label: '📈 Trading', color: 'text-terminal-green' },
  { id: 'analysis', label: '📊 Analysis', color: 'text-terminal-cyan' },
  { id: 'intelligence', label: '🧠 AI & Intel', color: 'text-terminal-amber' },
  { id: 'global', label: '🌍 Global', color: 'text-terminal-blue' },
  { id: 'communication', label: '💬 Comms', color: 'text-terminal-cyan' },
  { id: 'utilities', label: '🔧 Utils', color: 'text-muted-foreground' },
  { id: 'entertainment', label: '🎮 Fun', color: 'text-terminal-amber' },
  { id: 'favorites', label: '⭐ Favorites', color: 'text-terminal-amber' },
];

const TabSelector = ({ onSelect, onClose, availableComponents }: TabSelectorProps) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('panel-favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [recentlyUsed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('panel-recent');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('panel-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleSelect = useCallback((tab: TabOption) => {
    // Track recently used
    const recent = [...recentlyUsed];
    recent.unshift(tab.id);
    localStorage.setItem('panel-recent', JSON.stringify(recent.slice(0, 10)));
    onSelect(tab);
  }, [onSelect, recentlyUsed]);

  const filtered = availableComponents.filter(c => {
    if (activeCategory === 'favorites') return favorites.has(c.id);
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    const matchesSearch = search === '' ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter' && filtered.length > 0) {
        handleSelect(filtered[selectedIndex]);
        return;
      }
      const cols = 3;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + cols, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - cols, 0)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onClose, handleSelect]);

  useEffect(() => { setSelectedIndex(0); }, [search, activeCategory]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background/95 border border-border rounded-lg w-full max-w-4xl max-h-[80vh] flex shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Left Sidebar - Categories */}
        <div className="w-44 border-r border-border shrink-0 flex flex-col py-2">
          <div className="px-3 mb-2">
            <h3 className="text-[10px] font-mono font-bold text-terminal-green tracking-wider">CATEGORIES</h3>
          </div>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                activeCategory === cat.id
                  ? 'bg-terminal-green/10 text-terminal-green border-r-2 border-terminal-green'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {cat.label}
              {cat.id !== 'all' && cat.id !== 'favorites' && (
                <span className="ml-1 text-[9px] text-muted-foreground">
                  ({availableComponents.filter(c => c.category === cat.id).length})
                </span>
              )}
              {cat.id === 'favorites' && (
                <span className="ml-1 text-[9px] text-muted-foreground">({favorites.size})</span>
              )}
            </button>
          ))}
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <h3 className="text-xs font-mono font-bold text-terminal-green">ADD COMPONENT</h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-muted-foreground">{filtered.length} available</span>
              <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search panels... (↑↓ navigate, Enter to open, Esc to close)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 pl-10 text-sm bg-card border-border text-foreground font-mono"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4" ref={gridRef}>
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((component, idx) => (
                <button
                  key={component.id}
                  onClick={() => handleSelect(component)}
                  className={`p-3 text-left border rounded-lg transition-all group relative ${
                    idx === selectedIndex
                      ? 'border-terminal-green bg-terminal-green/10 shadow-[0_0_12px_hsl(var(--terminal-green)/0.15)]'
                      : 'border-border hover:border-terminal-green/50 hover:bg-terminal-green/5'
                  }`}
                >
                  {/* Favorite star */}
                  <button
                    onClick={e => toggleFavorite(component.id, e)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-terminal-amber"
                  >
                    {favorites.has(component.id) ? <Star className="w-3 h-3 fill-terminal-amber text-terminal-amber" /> : <StarOff className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-foreground group-hover:text-terminal-green transition-colors line-clamp-1 pr-4">
                      {component.title}
                    </span>
                  </div>
                  {component.description && (
                    <p className="text-[9px] font-mono text-muted-foreground line-clamp-2 mb-1.5">
                      {component.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {recentlyUsed.has(component.id) && (
                      <span className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-terminal-amber/15 text-terminal-amber border border-terminal-amber/20">RECENT</span>
                    )}
                    {component.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm font-mono">No components found</p>
                <p className="text-[10px] font-mono mt-1">Try a different search term or category</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabSelector;
