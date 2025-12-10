// Pine Script Storage System - v5/v6 Support

export interface SavedScript {
  id: string;
  name: string;
  description: string;
  code: string;
  category: 'indicator' | 'oscillator' | 'strategy' | 'library';
  tags: string[];
  version: 5 | 6;
  createdAt: number;
  updatedAt: number;
  author?: string;
  isPublic?: boolean;
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
    id: generateScriptId(),
    name: `${original.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
        script.id = generateScriptId();
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
      library: scripts.filter(s => s.category === 'library').map(s => s.id),
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

// Generate unique ID
export const generateScriptId = (): string => {
  return `pine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Built-in Pine Script v6 Templates
export const PINE_TEMPLATES: Omit<SavedScript, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'template-sma-crossover',
    name: 'SMA Crossover',
    description: 'Simple moving average crossover strategy with buy/sell signals',
    category: 'strategy',
    version: 6,
    tags: ['moving average', 'trend', 'crossover'],
    code: `//@version=6
indicator("SMA Crossover", overlay=true)

// Input parameters
fast_length = input.int(10, "Fast SMA", minval=1)
slow_length = input.int(20, "Slow SMA", minval=1)

// Calculate SMAs
fast_sma = ta.sma(close, fast_length)
slow_sma = ta.sma(close, slow_length)

// Plot SMAs
plot(fast_sma, "Fast SMA", color.blue, 2)
plot(slow_sma, "Slow SMA", color.red, 2)`,
  },
  {
    id: 'template-ema',
    name: 'EMA Ribbon',
    description: 'Exponential moving average ribbon with multiple periods',
    category: 'indicator',
    version: 6,
    tags: ['moving average', 'trend', 'ema'],
    code: `//@version=6
indicator("EMA Ribbon", overlay=true)

// Input
length1 = input.int(8, "EMA 1")
length2 = input.int(13, "EMA 2")
length3 = input.int(21, "EMA 3")

// Calculate EMAs
ema1 = ta.ema(close, length1)
ema2 = ta.ema(close, length2)
ema3 = ta.ema(close, length3)

// Plot
plot(ema1, "EMA 8", color.green, 1)
plot(ema2, "EMA 13", color.orange, 1)
plot(ema3, "EMA 21", color.red, 2)`,
  },
  {
    id: 'template-rsi',
    name: 'RSI Oscillator',
    description: 'Relative Strength Index with overbought/oversold levels',
    category: 'oscillator',
    version: 6,
    tags: ['momentum', 'overbought', 'oversold', 'rsi'],
    code: `//@version=6
indicator("RSI", overlay=false)

// Inputs
length = input.int(14, "RSI Length", minval=1)
overbought = input.int(70, "Overbought")
oversold = input.int(30, "Oversold")

// Calculate RSI
rsi_value = ta.rsi(close, length)

// Plot
plot(rsi_value, "RSI", color.purple, 2)
hline(overbought, "Overbought", color.red)
hline(oversold, "Oversold", color.green)
hline(50, "Midline", color.gray)`,
  },
  {
    id: 'template-macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence indicator',
    category: 'oscillator',
    version: 6,
    tags: ['momentum', 'trend', 'macd'],
    code: `//@version=6
indicator("MACD", overlay=false)

// Inputs
fast = input.int(12, "Fast EMA")
slow = input.int(26, "Slow EMA")
signal_len = input.int(9, "Signal")

// Calculate
fast_ema = ta.ema(close, fast)
slow_ema = ta.ema(close, slow)
macd_line = fast_ema - slow_ema
signal_line = ta.sma(macd_line, signal_len)

// Plot
plot(macd_line, "MACD", color.blue, 2)
plot(signal_line, "Signal", color.orange, 2)
hline(0, "Zero", color.gray)`,
  },
  {
    id: 'template-bb',
    name: 'Bollinger Bands',
    description: 'Volatility bands with standard deviation',
    category: 'indicator',
    version: 6,
    tags: ['volatility', 'bands', 'bollinger'],
    code: `//@version=6
indicator("Bollinger Bands", overlay=true)

// Inputs
length = input.int(20, "Length")
mult = input.float(2.0, "Multiplier")

// Calculate
basis = ta.sma(close, length)
dev = ta.stdev(close, length)
upper = basis + mult * dev
lower = basis - mult * dev

// Plot
plot(basis, "Basis", color.blue, 2)
plot(upper, "Upper", color.red)
plot(lower, "Lower", color.green)`,
  },
  {
    id: 'template-stoch',
    name: 'Stochastic',
    description: 'Stochastic oscillator with %K and %D lines',
    category: 'oscillator',
    version: 6,
    tags: ['momentum', 'overbought', 'oversold', 'stochastic'],
    code: `//@version=6
indicator("Stochastic", overlay=false)

// Inputs
k_period = input.int(14, "K Period")
d_period = input.int(3, "D Period")

// Calculate
k = ta.stoch(close, high, low, k_period)
d = ta.sma(k, d_period)

// Plot
plot(k, "K", color.blue, 2)
plot(d, "D", color.orange, 2)
hline(80, "Overbought", color.red)
hline(20, "Oversold", color.green)`,
  },
  {
    id: 'template-atr',
    name: 'ATR',
    description: 'Average True Range volatility indicator',
    category: 'oscillator',
    version: 6,
    tags: ['volatility', 'atr'],
    code: `//@version=6
indicator("ATR", overlay=false)

// Inputs
length = input.int(14, "Length")

// Calculate
atr_value = ta.atr(length)

// Plot
plot(atr_value, "ATR", color.teal, 2)`,
  },
  {
    id: 'template-vwap',
    name: 'VWAP',
    description: 'Volume Weighted Average Price',
    category: 'indicator',
    version: 6,
    tags: ['volume', 'vwap', 'average'],
    code: `//@version=6
indicator("VWAP", overlay=true)

// Calculate VWAP
vwap_value = ta.vwap(close)

// Plot
plot(vwap_value, "VWAP", color.purple, 2)`,
  },
  {
    id: 'template-supertrend',
    name: 'Supertrend',
    description: 'Trend-following indicator using ATR',
    category: 'indicator',
    version: 6,
    tags: ['trend', 'supertrend', 'atr'],
    code: `//@version=6
indicator("Supertrend", overlay=true)

// Inputs
atr_len = input.int(10, "ATR Length")
mult = input.float(3.0, "Multiplier")

// Calculate
atr_value = ta.atr(atr_len)
upper = hl2 + mult * atr_value
lower = hl2 - mult * atr_value

// Plot bands
plot(upper, "Upper", color.red)
plot(lower, "Lower", color.green)`,
  },
  {
    id: 'template-ichimoku',
    name: 'Ichimoku Cloud',
    description: 'Ichimoku Kinko Hyo indicator',
    category: 'indicator',
    version: 6,
    tags: ['trend', 'ichimoku', 'cloud'],
    code: `//@version=6
indicator("Ichimoku Cloud", overlay=true)

// Inputs
tenkan_len = input.int(9, "Tenkan-sen")
kijun_len = input.int(26, "Kijun-sen")
senkou_b_len = input.int(52, "Senkou B")

// Calculate
tenkan = (ta.highest(high, tenkan_len) + ta.lowest(low, tenkan_len)) / 2
kijun = (ta.highest(high, kijun_len) + ta.lowest(low, kijun_len)) / 2
senkou_a = (tenkan + kijun) / 2
senkou_b = (ta.highest(high, senkou_b_len) + ta.lowest(low, senkou_b_len)) / 2

// Plot
plot(tenkan, "Tenkan", color.blue, 1)
plot(kijun, "Kijun", color.red, 2)
plot(senkou_a, "Senkou A", color.green)
plot(senkou_b, "Senkou B", color.red)`,
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
      } as SavedScript);
    });
  }
};
