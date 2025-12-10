// Chart Theme System

export interface ChartTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    grid: string;
    text: string;
    crosshair: string;
    bullCandle: { fill: string; border: string };
    bearCandle: { fill: string; border: string };
    volumeUp: string;
    volumeDown: string;
  };
}

export const PRESET_THEMES: ChartTheme[] = [
  {
    id: 'dark',
    name: 'Dark (Default)',
    colors: {
      background: '#0f172a',
      grid: '#1e293b',
      text: '#94a3b8',
      crosshair: '#64748b',
      bullCandle: { fill: '#22c55e', border: '#22c55e' },
      bearCandle: { fill: '#ef4444', border: '#ef4444' },
      volumeUp: 'rgba(34, 197, 94, 0.5)',
      volumeDown: 'rgba(239, 68, 68, 0.5)',
    },
  },
  {
    id: 'light',
    name: 'Light',
    colors: {
      background: '#ffffff',
      grid: '#e5e7eb',
      text: '#374151',
      crosshair: '#9ca3af',
      bullCandle: { fill: '#16a34a', border: '#16a34a' },
      bearCandle: { fill: '#dc2626', border: '#dc2626' },
      volumeUp: 'rgba(22, 163, 74, 0.4)',
      volumeDown: 'rgba(220, 38, 38, 0.4)',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Green',
    colors: {
      background: '#0a0a0a',
      grid: '#0f1f0f',
      text: '#00ff00',
      crosshair: '#00aa00',
      bullCandle: { fill: '#00ff00', border: '#00ff00' },
      bearCandle: { fill: '#ff0040', border: '#ff0040' },
      volumeUp: 'rgba(0, 255, 0, 0.4)',
      volumeDown: 'rgba(255, 0, 64, 0.4)',
    },
  },
  {
    id: 'trading-pro',
    name: 'Trading Pro',
    colors: {
      background: '#131722',
      grid: '#1e222d',
      text: '#787b86',
      crosshair: '#434651',
      bullCandle: { fill: '#089981', border: '#089981' },
      bearCandle: { fill: '#f23645', border: '#f23645' },
      volumeUp: 'rgba(8, 153, 129, 0.5)',
      volumeDown: 'rgba(242, 54, 69, 0.5)',
    },
  },
];

const THEME_STORAGE_KEY = 'trading-chart-theme';
const CUSTOM_THEMES_KEY = 'trading-chart-custom-themes';

export const saveTheme = (theme: ChartTheme): void => {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
};

export const loadTheme = (): ChartTheme => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
  }
  return PRESET_THEMES[0]; // Default dark theme
};

export const saveCustomTheme = (theme: ChartTheme): void => {
  const customs = loadCustomThemes();
  const existing = customs.findIndex(t => t.id === theme.id);
  if (existing >= 0) {
    customs[existing] = theme;
  } else {
    customs.push(theme);
  }
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customs));
};

export const loadCustomThemes = (): ChartTheme[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load custom themes:', e);
  }
  return [];
};

export const deleteCustomTheme = (themeId: string): void => {
  const customs = loadCustomThemes().filter(t => t.id !== themeId);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customs));
};

export const exportTheme = (theme: ChartTheme): string => {
  return JSON.stringify(theme, null, 2);
};

export const importTheme = (json: string): ChartTheme | null => {
  try {
    const theme = JSON.parse(json);
    if (theme.id && theme.name && theme.colors) {
      return theme;
    }
  } catch (e) {
    console.error('Failed to import theme:', e);
  }
  return null;
};
