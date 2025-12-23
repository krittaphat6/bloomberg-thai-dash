import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Palette } from 'lucide-react';

const themes = [
  { id: 'cot', name: '🟢 COT Data (Dark)', class: 'theme-cot' },
  { id: 'dark', name: '🌙 Dark Terminal', class: 'theme-dark' },
  { id: 'gray', name: '⬛ Claude Gray', class: 'theme-gray' },
  { id: 'light-gray', name: '🔲 Light Gray', class: 'theme-light-gray' },
  { id: 'bright', name: '☀️ Bright Mode', class: 'theme-bright' }
];

const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState('cot');
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('able-theme') || 'cot';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    // Remove all theme classes
    document.documentElement.classList.remove('theme-dark', 'theme-gray', 'theme-light-gray', 'theme-bright', 'theme-cot');
    
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
        className="flex items-center gap-2 bg-terminal-panel border-terminal-green/30 hover:bg-terminal-green/20 hover:border-terminal-green/50"
      >
        <Palette className="h-4 w-4 text-terminal-green" />
        <span className="hidden sm:inline text-xs text-terminal-green">Theme</span>
      </Button>

      {showThemes && (
        <div className="absolute right-0 top-full mt-2 bg-card border border-terminal-green/30 rounded shadow-lg min-w-[200px] z-50">
          <div className="p-2 border-b border-terminal-green/20">
            <span className="text-xs text-terminal-green font-bold">SELECT THEME</span>
          </div>
          <div className="p-1">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                  currentTheme === theme.id 
                    ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30' 
                    : 'text-foreground hover:bg-muted/50 border border-transparent'
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
