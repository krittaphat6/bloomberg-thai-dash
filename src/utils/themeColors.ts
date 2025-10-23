export interface ThemeColors {
  background: string;
  foreground: string;
  border: string;
  primary: string;
  accent: string;
  panel: string;
}

export const getThemeColors = (theme: string): ThemeColors => {
  const themes: Record<string, ThemeColors> = {
    'dark': {
      background: '#0a0a0a',
      foreground: '#00ff00',
      border: '#00ff00',
      primary: '#00ff00',
      accent: '#003300',
      panel: '#0d0d0d'
    },
    'gray': {
      background: '#171717',
      foreground: '#e5e5e5',
      border: '#333333',
      primary: '#999999',
      accent: '#262626',
      panel: '#1c1c1c'
    },
    'light-gray': {
      background: '#404040',
      foreground: '#f3f3f3',
      border: '#737373',
      primary: '#666666',
      accent: '#666666',
      panel: '#4d4d4d'
    },
    'bright': {
      background: '#f0f4f9',
      foreground: '#1e3a5f',
      border: '#cbd5e0',
      primary: '#3b82f6',
      accent: '#e0f2fe',
      panel: '#fcfcfc'
    }
  };

  return themes[theme] || themes['gray'];
};
