export interface PineScriptTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  category: 'indicator' | 'strategy' | 'oscillator';
}

export const pineScriptTemplates: PineScriptTemplate[] = [
  {
    id: 'sma-crossover',
    name: 'SMA Crossover',
    description: 'Simple Moving Average crossover indicator with buy/sell signals',
    category: 'indicator',
    code: `//@version=5
indicator("SMA Crossover", overlay=true)

// Input parameters
fast_length = input(10, title="Fast SMA Length")
slow_length = input(20, title="Slow SMA Length")

// Calculate SMAs
fast_sma = ta.sma(close, fast_length)
slow_sma = ta.sma(close, slow_length)

// Plot SMAs
plot(fast_sma, color=color.blue, title="Fast SMA", linewidth=2)
plot(slow_sma, color=color.red, title="Slow SMA", linewidth=2)

// Detect crossovers
bullish = ta.crossover(fast_sma, slow_sma)
bearish = ta.crossunder(fast_sma, slow_sma)

// Plot signals (would show as arrows in real TradingView)
// In our implementation, these become data points`
  },
  {
    id: 'rsi-strategy',
    name: 'RSI Strategy',
    description: 'Relative Strength Index with overbought/oversold levels',
    category: 'oscillator',
    code: `//@version=5
indicator("RSI Strategy", overlay=false)

// Input parameters
rsi_length = input(14, title="RSI Length")
overbought = input(70, title="Overbought Level")
oversold = input(30, title="Oversold Level")

// Calculate RSI
rsi_value = ta.rsi(close, rsi_length)

// Plot RSI
plot(rsi_value, color=color.purple, title="RSI", linewidth=2)

// Plot levels
hline(overbought, "Overbought", color=color.red)
hline(oversold, "Oversold", color=color.green)
hline(50, "Midline", color=color.gray)`
  },
  {
    id: 'macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence indicator',
    category: 'indicator',
    code: `//@version=5
indicator("MACD", overlay=false)

// Input parameters
fast = input(12, title="Fast Length")
slow = input(26, title="Slow Length")
signal_length = input(9, title="Signal Length")

// Calculate MACD
fast_ma = ta.ema(close, fast)
slow_ma = ta.ema(close, slow)
macd = fast_ma - slow_ma
signal = ta.ema(macd, signal_length)
histogram = macd - signal

// Plot
plot(macd, color=color.blue, title="MACD")
plot(signal, color=color.red, title="Signal")
plot(histogram, color=color.gray, title="Histogram")`
  },
  {
    id: 'bollinger-bands',
    name: 'Bollinger Bands',
    description: 'Bollinger Bands with standard deviation bands',
    category: 'indicator',
    code: `//@version=5
indicator("Bollinger Bands", overlay=true)

// Input parameters
length = input(20, title="Length")
mult = input(2, title="Standard Deviation")

// Calculate Bollinger Bands
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev

// Plot bands
plot(basis, color=color.blue, title="Basis")
plot(upper, color=color.red, title="Upper Band")
plot(lower, color=color.green, title="Lower Band")`
  },
  {
    id: 'ema-ribbon',
    name: 'EMA Ribbon',
    description: 'Multiple Exponential Moving Averages',
    category: 'indicator',
    code: `//@version=5
indicator("EMA Ribbon", overlay=true)

// Input
ema_length_1 = input(8, title="EMA 1")
ema_length_2 = input(13, title="EMA 2")
ema_length_3 = input(21, title="EMA 3")
ema_length_4 = input(34, title="EMA 4")

// Calculate EMAs
ema1 = ta.ema(close, ema_length_1)
ema2 = ta.ema(close, ema_length_2)
ema3 = ta.ema(close, ema_length_3)
ema4 = ta.ema(close, ema_length_4)

// Plot EMAs
plot(ema1, color=color.blue, title="EMA 8")
plot(ema2, color=color.green, title="EMA 13")
plot(ema3, color=color.orange, title="EMA 21")
plot(ema4, color=color.red, title="EMA 34")`
  },
  {
    id: 'stochastic',
    name: 'Stochastic Oscillator',
    description: 'Stochastic %K and %D lines',
    category: 'oscillator',
    code: `//@version=5
indicator("Stochastic Oscillator", overlay=false)

// Input
k_length = input(14, title="%K Length")
k_smooth = input(3, title="%K Smoothing")
d_smooth = input(3, title="%D Smoothing")

// Calculate Stochastic
k = ta.sma(ta.stoch(close, high, low, k_length), k_smooth)
d = ta.sma(k, d_smooth)

// Plot
plot(k, color=color.blue, title="%K")
plot(d, color=color.red, title="%D")

// Plot levels
hline(80, "Overbought", color=color.red)
hline(20, "Oversold", color=color.green)
hline(50, "Midline", color=color.gray)`
  },
  {
    id: 'volume-profile',
    name: 'Volume Analysis',
    description: 'Volume-based price analysis',
    category: 'indicator',
    code: `//@version=5
indicator("Volume Analysis", overlay=false)

// Input
sma_length = input(20, title="Volume SMA Length")

// Calculate volume indicators
volume_sma = ta.sma(volume, sma_length)
volume_ratio = volume / volume_sma

// Plot
plot(volume, color=color.blue, title="Volume")
plot(volume_sma, color=color.red, title="Volume SMA")
plot(volume_ratio, color=color.purple, title="Volume Ratio")`
  },
  {
    id: 'atr',
    name: 'Average True Range',
    description: 'Volatility indicator using Average True Range',
    category: 'indicator',
    code: `//@version=5
indicator("Average True Range", overlay=false)

// Input
atr_length = input(14, title="ATR Length")

// Calculate ATR
atr_value = ta.atr(atr_length)

// Plot
plot(atr_value, color=color.orange, title="ATR", linewidth=2)`
  }
];

export function getPineScriptTemplate(id: string): PineScriptTemplate | undefined {
  return pineScriptTemplates.find(t => t.id === id);
}

export function getPineScriptTemplatesByCategory(category: 'indicator' | 'strategy' | 'oscillator'): PineScriptTemplate[] {
  return pineScriptTemplates.filter(t => t.category === category);
}
