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
}

const SCRIPTS_STORAGE_KEY = 'pine-scripts-saved';

export const saveScript = (script: SavedScript): void => {
  const scripts = loadAllScripts();
  const existing = scripts.findIndex(s => s.id === script.id);
  
  if (existing >= 0) {
    scripts[existing] = { ...script, updatedAt: Date.now() };
  } else {
    scripts.push({ ...script, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
};

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

export const loadScript = (id: string): SavedScript | null => {
  const scripts = loadAllScripts();
  return scripts.find(s => s.id === id) || null;
};

export const deleteScript = (id: string): void => {
  const scripts = loadAllScripts().filter(s => s.id !== id);
  localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(scripts));
};

export const searchScripts = (query: string): SavedScript[] => {
  const scripts = loadAllScripts();
  const lowerQuery = query.toLowerCase();
  return scripts.filter(s => 
    s.name.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
};

export const getScriptsByCategory = (category: SavedScript['category']): SavedScript[] => {
  return loadAllScripts().filter(s => s.category === category);
};

// Built-in Pine Script Templates
export const PINE_TEMPLATES = [
  {
    id: 'template-sma',
    name: 'Simple Moving Average',
    description: 'Classic SMA indicator with customizable length',
    category: 'indicator' as const,
    code: `//@version=5
indicator("SMA", overlay=true)
length = input(20, title="Length")
sma_value = ta.sma(close, length)
plot(sma_value, color=color.blue, title="SMA")`,
  },
  {
    id: 'template-ema',
    name: 'Exponential Moving Average',
    description: 'EMA indicator with faster response to price changes',
    category: 'indicator' as const,
    code: `//@version=5
indicator("EMA", overlay=true)
length = input(21, title="Length")
ema_value = ta.ema(close, length)
plot(ema_value, color=color.orange, title="EMA")`,
  },
  {
    id: 'template-rsi',
    name: 'Relative Strength Index',
    description: 'Classic RSI oscillator with overbought/oversold levels',
    category: 'oscillator' as const,
    code: `//@version=5
indicator("RSI", overlay=false)
length = input(14, title="Length")
rsi_value = ta.rsi(close, length)
plot(rsi_value, color=color.purple, title="RSI")
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)`,
  },
  {
    id: 'template-macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    category: 'oscillator' as const,
    code: `//@version=5
indicator("MACD", overlay=false)
fast = input(12, title="Fast")
slow = input(26, title="Slow")
signal_len = input(9, title="Signal")
macd_line = ta.ema(close, fast) - ta.ema(close, slow)
signal_line = ta.sma(macd_line, signal_len)
hist = macd_line - signal_line
plot(macd_line, color=color.blue, title="MACD")
plot(signal_line, color=color.orange, title="Signal")`,
  },
  {
    id: 'template-bb',
    name: 'Bollinger Bands',
    description: 'Volatility bands around moving average',
    category: 'indicator' as const,
    code: `//@version=5
indicator("Bollinger Bands", overlay=true)
length = input(20, title="Length")
mult = input(2.0, title="Multiplier")
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev
plot(basis, color=color.blue, title="Basis")
plot(upper, color=color.red, title="Upper")
plot(lower, color=color.green, title="Lower")`,
  },
  {
    id: 'template-stoch',
    name: 'Stochastic Oscillator',
    description: 'Momentum indicator comparing close to price range',
    category: 'oscillator' as const,
    code: `//@version=5
indicator("Stochastic", overlay=false)
k_period = input(14, title="K Period")
d_period = input(3, title="D Period")
smooth_k = input(3, title="Smooth K")
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
    category: 'oscillator' as const,
    code: `//@version=5
indicator("ATR", overlay=false)
length = input(14, title="Length")
atr_value = ta.atr(close, high, low, length)
plot(atr_value, color=color.teal, title="ATR")`,
  },
  {
    id: 'template-vwap',
    name: 'Volume Weighted Average Price',
    description: 'Average price weighted by volume',
    category: 'indicator' as const,
    code: `//@version=5
indicator("VWAP", overlay=true)
vwap_value = ta.vwap(close, volume)
plot(vwap_value, color=color.purple, title="VWAP")`,
  },
];

// Initialize with default templates if empty
export const initializeDefaultScripts = (): void => {
  const scripts = loadAllScripts();
  if (scripts.length === 0) {
    // Could add some starter scripts here
  }
};
