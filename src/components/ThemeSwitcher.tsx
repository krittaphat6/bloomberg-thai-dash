import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Palette } from 'lucide-react';

const themes = [
  { id: 'dark', name: 'Dark Terminal', class: 'theme-dark' },
  { id: 'gray', name: 'Claude Gray', class: 'theme-gray' },
  { id: 'light-gray', name: 'Light Gray', class: 'theme-light-gray' },
  { id: 'bright', name: 'Bright Mode', class: 'theme-bright' }
];

const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState('gray');
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('able-theme') || 'gray';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    // Remove all theme classes
    document.documentElement.classList.remove('theme-dark', 'theme-gray', 'theme-light-gray', 'theme-bright');
    
    // Add selected theme class
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.classList.add(theme.class);
    }
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('able-theme', themeId);
    setShowThemes(false);
    
    // Dispatch custom event
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowThemes(!showThemes)}
        className="flex items-center gap-2 bg-terminal-panel border-border hover:bg-accent"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Theme</span>
      </Button>

      {showThemes && (
        <div className="absolute right-0 top-full mt-2 bg-terminal-panel border border-border rounded shadow-lg min-w-[180px] z-50">
          <div className="p-1">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-accent transition-colors ${
                  currentTheme === theme.id ? 'bg-accent text-terminal-amber' : 'text-foreground'
                }`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;