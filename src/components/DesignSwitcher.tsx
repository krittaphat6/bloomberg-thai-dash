import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Palette } from 'lucide-react';

const designStyles = [
  { id: 'terminal', name: 'Terminal', class: 'design-terminal' },
  { id: 'macos', name: 'macOS', class: 'design-macos' },
  { id: 'ios', name: 'iOS', class: 'design-ios' }
];

const DesignSwitcher = () => {
  const [currentDesign, setCurrentDesign] = useState('terminal');
  const [showDesigns, setShowDesigns] = useState(false);

  useEffect(() => {
    const savedDesign = localStorage.getItem('able-design') || 'terminal';
    setCurrentDesign(savedDesign);
    applyDesign(savedDesign);
  }, []);

  const applyDesign = (designId: string) => {
    // Remove all design classes
    document.documentElement.classList.remove('design-terminal', 'design-macos', 'design-ios');
    
    // Add selected design class
    const design = designStyles.find(d => d.id === designId);
    if (design) {
      document.documentElement.classList.add(design.class);
    }
  };

  const handleDesignChange = (designId: string) => {
    setCurrentDesign(designId);
    applyDesign(designId);
    localStorage.setItem('able-design', designId);
    setShowDesigns(false);
  };

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDesigns(!showDesigns)}
        className="flex items-center gap-2 bg-terminal-panel border-border hover:bg-accent"
      >
        <Palette className="h-4 w-4" />
      </Button>

      {showDesigns && (
        <div className="absolute left-full ml-2 top-0 bg-terminal-panel border border-border rounded shadow-lg min-w-[120px] z-50">
          <div className="p-1">
            {designStyles.map((design) => (
              <button
                key={design.id}
                onClick={() => handleDesignChange(design.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-accent transition-colors ${
                  currentDesign === design.id ? 'bg-accent text-terminal-amber' : 'text-foreground'
                }`}
              >
                {design.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignSwitcher;