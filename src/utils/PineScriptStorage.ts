// Pine Script Storage System

export interface SavedScript {
  id: string;
  name: string;
  description: string;
  code: string;
  category: 'indicator' | 'oscillator' | 'strategy';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  version?: number;
  author?: string;
}

const SCRIPTS_STORAGE_KEY = 'pine-scripts-saved';
const SCRIPTS_INDEX_KEY = 'pine-scripts-index';

// Save a single script
export const saveScript = (script: SavedScript): SavedScript => {
  const scripts = loadAllScripts();
  const existing = scripts.findIndex(s => s.id === script.id);
  
  const now = Date.now();
  const savedScript: SavedScript = {
    ...script,
    updatedAt: now,
    createdAt: existing >= 0 ? scripts[existing].createdAt : now,
    version: existing >= 0 ? (scripts[existing].version || 1) + 1 : 1,
  };
  
  if (existing >= 0) {
    scripts[existing] = savedScript;
  } else {
    scripts.push(savedScript);
  }
  
  localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
  updateIndex(scripts);
  
  return savedScript;
};

// Load all scripts
export const loadAllScripts = (): SavedScript[] => {
  try {
    const saved = localStorage.getItem(SCRIPTS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load scripts:', e);
  }
  return [];
};

// Load a single script by ID
export const loadScript = (id: string): SavedScript | null => {
  const scripts = loadAllScripts();
  return scripts.find(s => s.id === id) || null;
};

// Delete a script
export const deleteScript = (id: string): void => {
  const scripts = loadAllScripts().filter(s => s.id !== id);
  localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
  updateIndex(scripts);
};

// Search scripts by query
export const searchScripts = (query: string): SavedScript[] => {
  const scripts = loadAllScripts();
  const lowerQuery = query.toLowerCase();
  return scripts.filter(s => 
    s.name.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    s.code.toLowerCase().includes(lowerQuery)
  );
};

// Get scripts by category
export const getScriptsByCategory = (category: SavedScript['category']): SavedScript[] => {
  return loadAllScripts().filter(s => s.category === category);
};

// Get scripts by tag
export const getScriptsByTag = (tag: string): SavedScript[] => {
  const lowerTag = tag.toLowerCase();
  return loadAllScripts().filter(s => s.tags.some(t => t.toLowerCase() === lowerTag));
};

// Duplicate a script
export const duplicateScript = (id: string): SavedScript | null => {
  const original = loadScript(id);
  if (!original) return null;
  
  const duplicate: SavedScript = {
    ...original,
    id: `pine-${Date.now()}`,
    name: `${original.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
  
  return saveScript(duplicate);
};

// Export scripts to JSON
export const exportScripts = (ids?: string[]): string => {
  const scripts = loadAllScripts();
  const toExport = ids ? scripts.filter(s => ids.includes(s.id)) : scripts;
  return JSON.stringify(toExport, null, 2);
};

// Import scripts from JSON
export const importScripts = (json: string, overwrite: boolean = false): SavedScript[] => {
  try {
    const imported: SavedScript[] = JSON.parse(json);
    const existing = loadAllScripts();
    
    const results: SavedScript[] = [];
    
    imported.forEach(script => {
      const existingIndex = existing.findIndex(s => s.id === script.id);
      
      if (existingIndex >= 0 && !overwrite) {
        // Generate new ID if not overwriting
        script.id = `pine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      results.push(saveScript(script));
    });
    
    return results;
  } catch (e) {
    console.error('Failed to import scripts:', e);
    throw new Error('Invalid JSON format');
  }
};

// Update search index for faster queries
const updateIndex = (scripts: SavedScript[]): void => {
  const index = {
    byCategory: {
      indicator: scripts.filter(s => s.category === 'indicator').map(s => s.id),
      oscillator: scripts.filter(s => s.category === 'oscillator').map(s => s.id),
      strategy: scripts.filter(s => s.category === 'strategy').map(s => s.id),
    },
    tags: [...new Set(scripts.flatMap(s => s.tags))],
    lastUpdated: Date.now(),
  };
  localStorage.setItem(SCRIPTS_INDEX_KEY, JSON.stringify(index));
};

// Get all unique tags
export const getAllTags = (): string[] => {
  try {
    const indexStr = localStorage.getItem(SCRIPTS_INDEX_KEY);
    if (indexStr) {
      const index = JSON.parse(indexStr);
      return index.tags || [];
    }
  } catch (e) {
    console.error('Failed to load tags:', e);
  }
  return [...new Set(loadAllScripts().flatMap(s => s.tags))];
};

// Built-in Pine Script Templates
export const PINE_TEMPLATES: Omit<SavedScript, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'template-sma',
    name: 'Simple Moving Average',
    description: 'Classic SMA indicator with customizable length',
    category: 'indicator',
    tags: ['moving average', 'trend'],
    code: `//@version=5
indicator("SMA", overlay=true)
length = input(20, "Length")
sma_value = ta.sma(close, length)
plot(sma_value, color=color.blue, title="SMA")`,
  },
  {
    id: 'template-ema',
    name: 'Exponential Moving Average',
    description: 'EMA indicator with faster response to price changes',
    category: 'indicator',
    tags: ['moving average', 'trend'],
    code: `//@version=5
indicator("EMA", overlay=true)
length = input(21, "Length")
ema_value = ta.ema(close, length)
plot(ema_value, color=color.orange, title="EMA")`,
  },
  {
    id: 'template-dual-ma',
    name: 'Dual Moving Average',
    description: 'Two moving averages for crossover signals',
    category: 'indicator',
    tags: ['moving average', 'trend', 'crossover'],
    code: `//@version=5
indicator("Dual MA", overlay=true)
fast_len = input(9, "Fast Length")
slow_len = input(21, "Slow Length")
fast_ma = ta.ema(close, fast_len)
slow_ma = ta.ema(close, slow_len)
plot(fast_ma, color=color.green, title="Fast MA")
plot(slow_ma, color=color.red, title="Slow MA")`,
  },
  {
    id: 'template-rsi',
    name: 'Relative Strength Index',
    description: 'Classic RSI oscillator with overbought/oversold levels',
    category: 'oscillator',
    tags: ['momentum', 'overbought', 'oversold'],
    code: `//@version=5
indicator("RSI", overlay=false)
length = input(14, "Length")
rsi_value = ta.rsi(close, length)
plot(rsi_value, color=color.purple, title="RSI")
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)`,
  },
  {
    id: 'template-macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    category: 'oscillator',
    tags: ['momentum', 'trend'],
    code: `//@version=5
indicator("MACD", overlay=false)
fast = input(12, "Fast")
slow = input(26, "Slow")
signal_len = input(9, "Signal")
fast_ema = ta.ema(close, fast)
slow_ema = ta.ema(close, slow)
macd_line = fast_ema - slow_ema
signal_line = ta.sma(macd_line, signal_len)
plot(macd_line, color=color.blue, title="MACD")
plot(signal_line, color=color.orange, title="Signal")`,
  },
  {
    id: 'template-bb',
    name: 'Bollinger Bands',
    description: 'Volatility bands around moving average',
    category: 'indicator',
    tags: ['volatility', 'bands'],
    code: `//@version=5
indicator("Bollinger Bands", overlay=true)
length = input(20, "Length")
mult = input(2.0, "Multiplier")
basis = ta.sma(close, length)
dev = ta.stdev(close, length)
upper = basis + mult * dev
lower = basis - mult * dev
plot(basis, color=color.blue, title="Basis")
plot(upper, color=color.red, title="Upper")
plot(lower, color=color.green, title="Lower")`,
  },
  {
    id: 'template-stoch',
    name: 'Stochastic Oscillator',
    description: 'Momentum indicator comparing close to price range',
    category: 'oscillator',
    tags: ['momentum', 'overbought', 'oversold'],
    code: `//@version=5
indicator("Stochastic", overlay=false)
k_period = input(14, "K Period")
d_period = input(3, "D Period")
k = ta.stoch(close, high, low, k_period)
d = ta.sma(k, d_period)
plot(k, color=color.blue, title="%K")
plot(d, color=color.orange, title="%D")
hline(80, "Overbought", color=color.red)
hline(20, "Oversold", color=color.green)`,
  },
  {
    id: 'template-atr',
    name: 'Average True Range',
    description: 'Volatility indicator measuring price range',
    category: 'oscillator',
    tags: ['volatility'],
    code: `//@version=5
indicator("ATR", overlay=false)
length = input(14, "Length")
atr_value = ta.atr(length)
plot(atr_value, color=color.teal, title="ATR")`,
  },
  {
    id: 'template-vwap',
    name: 'Volume Weighted Average Price',
    description: 'Average price weighted by volume',
    category: 'indicator',
    tags: ['volume', 'average'],
    code: `//@version=5
indicator("VWAP", overlay=true)
vwap_value = ta.vwap(close)
plot(vwap_value, color=color.purple, title="VWAP")`,
  },
  {
    id: 'template-supertrend',
    name: 'Supertrend',
    description: 'Trend following indicator using ATR',
    category: 'indicator',
    tags: ['trend', 'volatility'],
    code: `//@version=5
indicator("Supertrend", overlay=true)
atr_len = input(10, "ATR Length")
mult = input(3.0, "Multiplier")
atr_value = ta.atr(atr_len)
upper = hl2 + mult * atr_value
lower = hl2 - mult * atr_value
plot(upper, color=color.red, title="Upper")
plot(lower, color=color.green, title="Lower")`,
  },
];

// Initialize with default templates if empty
export const initializeDefaultScripts = (): void => {
  const scripts = loadAllScripts();
  if (scripts.length === 0) {
    PINE_TEMPLATES.forEach(template => {
      saveScript({
        ...template,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  }
};

// Generate unique ID
export const generateScriptId = (): string => {
  return `pine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
