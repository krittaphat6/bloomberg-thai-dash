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
  {
    id: 'template-wol',
    name: 'WOL - World Stock Markets 3D Globe',
    description: '3D Globe visualization showing world stock markets with real-time status, market hours, and index changes',
    category: 'indicator',
    version: 6,
    tags: ['globe', 'world', 'markets', '3d', 'visualization', 'stocks'],
    code: `// This Pine Script® code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/

//@version=6
indicator("3D Globe - World Stock Markets", overlay = true, max_lines_count = 500, max_labels_count = 500, max_polylines_count = 100, max_boxes_count = 50)

// ═══════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────── INPUTS ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const string GRP_GLOBE  = "Globe"
const string GRP_STYLE  = "Style"
const string GRP_TABLE  = "Table"

float globeRadius  = input.float(35, "Globe Size", group = GRP_GLOBE, minval = 15, maxval = 60, step = 5)
bool  showGrid     = input.bool(true, "Show grid", group = GRP_GLOBE)
bool  showFill     = input.bool(true, "Fill continents", group = GRP_GLOBE)

color bgColor      = input.color(color.new(#000814, 0), "Background", group = GRP_STYLE)
color oceanColor   = input.color(color.new(#001d3d, 0), "Ocean", group = GRP_STYLE)
color landColor    = input.color(color.new(#2d6a4f, 40), "Land", group = GRP_STYLE)
color landBorder   = input.color(color.new(#52b788, 20), "Land border", group = GRP_STYLE)
color gridColor    = input.color(color.new(#3d5a80, 80), "Grid", group = GRP_STYLE)
color openColor    = input.color(color.new(#00ff88, 0), "Open market", group = GRP_STYLE)
color closedColor  = input.color(color.new(#ff6b6b, 50), "Closed market", group = GRP_STYLE)
color borderColor  = input.color(color.new(#48cae4, 20), "Globe border", group = GRP_STYLE)

string tablePos    = input.string("Right", "Table position", options = ["Left", "Right"], group = GRP_TABLE)
bool   showTable   = input.bool(true, "Show market table", group = GRP_TABLE)

float rotationX    = 18.0

// ═══════════════════════════════════════════════════════════════════════════════
// ──────────────────────────── HIDE CHART BACKGROUND ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

bgcolor(bgColor)
plotcandle(open, high, low, close, color = bgColor, wickcolor = bgColor, bordercolor = bgColor)

// ═══════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────── TYPES ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

type Point3D
    float x
    float y
    float z

type GeoPoint
    float lat
    float lon

type StockMarket
    string name
    string flag
    string fullName
    float lat
    float lon
    int utcOffset
    int openHour
    int openMin
    int closeHour
    int closeMin
    string indexSymbol
    bool isOpen
    int localHour
    int localMin
    int localSec

// ═══════════════════════════════════════════════════════════════════════════════
// ────────────────────────────── MATH FUNCTIONS ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

f_rad(float deg) => deg * math.pi / 180.0

f_geoTo3D(float lat, float lon) =>
    float latRad = f_rad(lat)
    float lonRad = f_rad(lon)
    Point3D.new(math.cos(latRad) * math.sin(lonRad), math.sin(latRad), math.cos(latRad) * math.cos(lonRad))

f_rotateX(Point3D p, float angleDeg) =>
    float rad = f_rad(angleDeg)
    float c = math.cos(rad), float s = math.sin(rad)
    Point3D.new(p.x, p.y * c - p.z * s, p.y * s + p.z * c)

f_rotateY(Point3D p, float angleDeg) =>
    float rad = f_rad(angleDeg)
    float c = math.cos(rad), float s = math.sin(rad)
    Point3D.new(p.x * c + p.z * s, p.y, -p.x * s + p.z * c)

f_project(Point3D p, float rotX, float rotY, int centerX, float centerY, float radius) =>
    Point3D r1 = f_rotateY(p, rotY)
    Point3D r2 = f_rotateX(r1, rotX)
    float screenX = r2.x * radius
    float screenY = r2.y * radius
    bool visible = r2.z > -0.05
    [chart.point.from_index(centerX + int(screenX), centerY + screenY), visible, r2.z]

// ═══════════════════════════════════════════════════════════════════════════════
// ────────────────────────────── MARKET DATA ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

f_getLocalTime(int utcOffset) =>
    int utcHour = hour(timenow, "UTC")
    int utcMin = minute(timenow, "UTC")
    int utcSec = second(timenow, "UTC")
    int totalMin = utcHour * 60 + utcMin + utcOffset * 60
    if totalMin < 0
        totalMin += 1440
    if totalMin >= 1440
        totalMin -= 1440
    [int(totalMin / 60), totalMin % 60, utcSec]

f_isMarketOpen(int openH, int openM, int closeH, int closeM, int utcOffset) =>
    [localH, localM, localS] = f_getLocalTime(utcOffset)
    int currentDay = dayofweek(timenow, "UTC")
    bool isWeekday = currentDay >= dayofweek.monday and currentDay <= dayofweek.friday
    int currentMins = localH * 60 + localM
    int openMins = openH * 60 + openM
    int closeMins = closeH * 60 + closeM
    bool isInHours = currentMins >= openMins and currentMins < closeMins
    isWeekday and isInHours

f_formatTime(int h, int m) =>
    str.format("{0}:{1}", str.format("{0,number,00}", h), str.format("{0,number,00}", m))

f_formatTimeWithSec(int h, int m, int s) =>
    str.format("{0}:{1}:{2}", str.format("{0,number,00}", h), str.format("{0,number,00}", m), str.format("{0,number,00}", s))

f_formatDuration(int totalMins) =>
    int h = int(math.abs(totalMins) / 60)
    int m = int(math.abs(totalMins)) % 60
    str.format("{0}h {1}m", h, str.format("{0,number,00}", m))

f_formatDurationWithSec(int totalSecs) =>
    int h = int(math.abs(totalSecs) / 3600)
    int m = int(math.abs(totalSecs) / 60) % 60
    int s = int(math.abs(totalSecs)) % 60
    str.format("{0}h {1}m {2}s", h, str.format("{0,number,00}", m), str.format("{0,number,00}", s))

f_buildMarkets() =>
    array<StockMarket> m = array.new<StockMarket>()
    m.push(StockMarket.new("NYSE", "🇺🇸", "New York", 40.7, -74.0, -5, 9, 30, 16, 0, "TVC:SPX", false, 0, 0, 0))
    m.push(StockMarket.new("NASDAQ", "🇺🇸", "New York", 40.75, -73.9, -5, 9, 30, 16, 0, "TVC:IXIC", false, 0, 0, 0))
    m.push(StockMarket.new("TSX", "🇨🇦", "Toronto", 43.65, -79.4, -5, 9, 30, 16, 0, "TVC:TSX", false, 0, 0, 0))
    m.push(StockMarket.new("BMV", "🇲🇽", "Mexico", 19.4, -99.1, -6, 8, 30, 15, 0, "TVC:MXX", false, 0, 0, 0))
    m.push(StockMarket.new("B3", "🇧🇷", "São Paulo", -23.5, -46.6, -3, 10, 0, 17, 0, "TVC:IBOV", false, 0, 0, 0))
    m.push(StockMarket.new("LSE", "🇬🇧", "London", 51.5, -0.1, 0, 8, 0, 16, 30, "TVC:UKX", false, 0, 0, 0))
    m.push(StockMarket.new("EURONEXT", "🇫🇷", "Paris", 48.9, 2.3, 1, 9, 0, 17, 30, "TVC:CAC40", false, 0, 0, 0))
    m.push(StockMarket.new("XETRA", "🇩🇪", "Frankfurt", 50.1, 8.7, 1, 9, 0, 17, 30, "TVC:DEU40", false, 0, 0, 0))
    m.push(StockMarket.new("SIX", "🇨🇭", "Zurich", 47.4, 8.5, 1, 9, 0, 17, 30, "TVC:SSMI", false, 0, 0, 0))
    m.push(StockMarket.new("MOEX", "🇷🇺", "Moscow", 55.8, 37.6, 3, 10, 0, 18, 50, "MOEX:IMOEX", false, 0, 0, 0))
    m.push(StockMarket.new("TADAWUL", "🇸🇦", "Riyadh", 24.7, 46.7, 3, 10, 0, 15, 0, "TADAWUL:TASI", false, 0, 0, 0))
    m.push(StockMarket.new("JSE", "🇿🇦", "Johannesburg", -26.2, 28.0, 2, 9, 0, 17, 0, "TVC:SA40", false, 0, 0, 0))
    m.push(StockMarket.new("NSE", "🇮🇳", "Mumbai", 19.1, 72.9, 5, 9, 15, 15, 30, "NSE:NIFTY", false, 0, 0, 0))
    m.push(StockMarket.new("SSE", "🇨🇳", "Shanghai", 31.2, 121.5, 8, 9, 30, 15, 0, "SSE:000001", false, 0, 0, 0))
    m.push(StockMarket.new("HKEX", "🇭🇰", "Hong Kong", 22.3, 114.2, 8, 9, 30, 16, 0, "TVC:HSI", false, 0, 0, 0))
    m.push(StockMarket.new("TSE", "🇯🇵", "Tokyo", 35.7, 139.8, 9, 9, 0, 15, 0, "TVC:NI225", false, 0, 0, 0))
    m.push(StockMarket.new("KRX", "🇰🇷", "Seoul", 37.5, 127.0, 9, 9, 0, 15, 30, "TVC:KOSPI", false, 0, 0, 0))
    m.push(StockMarket.new("SGX", "🇸🇬", "Singapore", 1.3, 103.8, 8, 9, 0, 17, 0, "TVC:STI", false, 0, 0, 0))
    m.push(StockMarket.new("ASX", "🇦🇺", "Sydney", -33.9, 151.2, 11, 10, 0, 16, 0, "ASX:XJO", false, 0, 0, 0))
    
    for i = 0 to m.size() - 1
        StockMarket mkt = m.get(i)
        mkt.isOpen := f_isMarketOpen(mkt.openHour, mkt.openMin, mkt.closeHour, mkt.closeMin, mkt.utcOffset)
        [lh, lm, ls] = f_getLocalTime(mkt.utcOffset)
        mkt.localHour := lh
        mkt.localMin := lm
        mkt.localSec := ls
        m.set(i, mkt)
    m

// ═══════════════════════════════════════════════════════════════════════════════
// ──────────────────── COUNTRY DATA (Natural Earth derived) ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

f_canada() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(83.0, -70.0)), p.push(GeoPoint.new(83.0, -62.0)), p.push(GeoPoint.new(72.0, -56.0))
    p.push(GeoPoint.new(67.0, -62.0)), p.push(GeoPoint.new(62.0, -74.0)), p.push(GeoPoint.new(60.0, -78.0))
    p.push(GeoPoint.new(52.0, -80.0)), p.push(GeoPoint.new(51.0, -82.0)), p.push(GeoPoint.new(46.0, -84.0))
    p.push(GeoPoint.new(45.0, -82.0)), p.push(GeoPoint.new(43.0, -79.0)), p.push(GeoPoint.new(42.0, -83.0))
    p.push(GeoPoint.new(46.0, -89.0)), p.push(GeoPoint.new(49.0, -95.0)), p.push(GeoPoint.new(49.0, -123.0))
    p.push(GeoPoint.new(54.0, -130.0)), p.push(GeoPoint.new(60.0, -141.0)), p.push(GeoPoint.new(69.0, -141.0))
    p.push(GeoPoint.new(71.0, -156.0)), p.push(GeoPoint.new(71.0, -168.0)), p.push(GeoPoint.new(66.0, -168.0))
    p.push(GeoPoint.new(65.0, -141.0)), p.push(GeoPoint.new(60.0, -141.0)), p.push(GeoPoint.new(60.0, -139.0))
    p.push(GeoPoint.new(56.0, -130.0)), p.push(GeoPoint.new(52.0, -128.0)), p.push(GeoPoint.new(49.0, -125.0))
    p.push(GeoPoint.new(49.0, -94.0)), p.push(GeoPoint.new(52.0, -89.0)), p.push(GeoPoint.new(52.0, -80.0))
    p.push(GeoPoint.new(54.0, -80.0)), p.push(GeoPoint.new(56.0, -77.0)), p.push(GeoPoint.new(58.0, -68.0))
    p.push(GeoPoint.new(61.0, -64.0)), p.push(GeoPoint.new(64.0, -64.0)), p.push(GeoPoint.new(67.0, -75.0))
    p.push(GeoPoint.new(73.0, -80.0)), p.push(GeoPoint.new(76.0, -90.0)), p.push(GeoPoint.new(76.0, -119.0))
    p.push(GeoPoint.new(83.0, -70.0))
    p

f_usa() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(49.0, -123.0)), p.push(GeoPoint.new(49.0, -95.0)), p.push(GeoPoint.new(46.0, -89.0))
    p.push(GeoPoint.new(45.0, -82.0)), p.push(GeoPoint.new(42.0, -83.0)), p.push(GeoPoint.new(41.0, -74.0))
    p.push(GeoPoint.new(39.0, -75.0)), p.push(GeoPoint.new(35.0, -76.0)), p.push(GeoPoint.new(33.0, -79.0))
    p.push(GeoPoint.new(30.0, -81.0)), p.push(GeoPoint.new(25.0, -80.0)), p.push(GeoPoint.new(25.0, -81.0))
    p.push(GeoPoint.new(28.0, -83.0)), p.push(GeoPoint.new(30.0, -85.0)), p.push(GeoPoint.new(30.0, -88.0))
    p.push(GeoPoint.new(29.0, -89.0)), p.push(GeoPoint.new(29.0, -94.0)), p.push(GeoPoint.new(26.0, -97.0))
    p.push(GeoPoint.new(26.0, -99.0)), p.push(GeoPoint.new(32.0, -117.0)), p.push(GeoPoint.new(34.0, -120.0))
    p.push(GeoPoint.new(38.0, -123.0)), p.push(GeoPoint.new(42.0, -124.0)), p.push(GeoPoint.new(46.0, -124.0))
    p.push(GeoPoint.new(49.0, -123.0))
    p

f_alaska() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(70.0, -141.0)), p.push(GeoPoint.new(71.0, -156.0)), p.push(GeoPoint.new(66.0, -162.0))
    p.push(GeoPoint.new(60.0, -166.0)), p.push(GeoPoint.new(56.0, -165.0)), p.push(GeoPoint.new(55.0, -162.0))
    p.push(GeoPoint.new(55.0, -155.0)), p.push(GeoPoint.new(58.0, -152.0)), p.push(GeoPoint.new(59.0, -141.0))
    p.push(GeoPoint.new(60.0, -141.0)), p.push(GeoPoint.new(70.0, -141.0))
    p

f_mexico() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(32.0, -117.0)), p.push(GeoPoint.new(26.0, -99.0)), p.push(GeoPoint.new(26.0, -97.0))
    p.push(GeoPoint.new(22.0, -98.0)), p.push(GeoPoint.new(19.0, -96.0)), p.push(GeoPoint.new(16.0, -94.0))
    p.push(GeoPoint.new(15.0, -92.0)), p.push(GeoPoint.new(16.0, -90.0)), p.push(GeoPoint.new(21.0, -87.0))
    p.push(GeoPoint.new(21.0, -90.0)), p.push(GeoPoint.new(20.0, -92.0)), p.push(GeoPoint.new(18.0, -93.0))
    p.push(GeoPoint.new(19.0, -105.0)), p.push(GeoPoint.new(23.0, -110.0)), p.push(GeoPoint.new(28.0, -114.0))
    p.push(GeoPoint.new(32.0, -117.0))
    p

f_south_america() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(12.0, -72.0)), p.push(GeoPoint.new(10.0, -61.0)), p.push(GeoPoint.new(7.0, -60.0))
    p.push(GeoPoint.new(4.0, -52.0)), p.push(GeoPoint.new(0.0, -50.0)), p.push(GeoPoint.new(-5.0, -35.0))
    p.push(GeoPoint.new(-10.0, -37.0)), p.push(GeoPoint.new(-23.0, -44.0)), p.push(GeoPoint.new(-33.0, -53.0))
    p.push(GeoPoint.new(-42.0, -64.0)), p.push(GeoPoint.new(-55.0, -68.0)), p.push(GeoPoint.new(-56.0, -66.0))
    p.push(GeoPoint.new(-53.0, -70.0)), p.push(GeoPoint.new(-47.0, -74.0)), p.push(GeoPoint.new(-38.0, -73.0))
    p.push(GeoPoint.new(-33.0, -72.0)), p.push(GeoPoint.new(-23.0, -70.0)), p.push(GeoPoint.new(-18.0, -70.0))
    p.push(GeoPoint.new(-5.0, -81.0)), p.push(GeoPoint.new(1.0, -79.0)), p.push(GeoPoint.new(7.0, -77.0))
    p.push(GeoPoint.new(11.0, -74.0)), p.push(GeoPoint.new(12.0, -72.0))
    p

f_europe() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(71.0, 28.0)), p.push(GeoPoint.new(70.0, 32.0)), p.push(GeoPoint.new(60.0, 30.0))
    p.push(GeoPoint.new(60.0, 28.0)), p.push(GeoPoint.new(55.0, 22.0)), p.push(GeoPoint.new(54.0, 14.0))
    p.push(GeoPoint.new(54.0, 10.0)), p.push(GeoPoint.new(56.0, 8.0)), p.push(GeoPoint.new(58.0, 6.0))
    p.push(GeoPoint.new(62.0, 5.0)), p.push(GeoPoint.new(66.0, 13.0)), p.push(GeoPoint.new(71.0, 28.0))
    p

f_spain_portugal() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(43.0, -9.0)), p.push(GeoPoint.new(44.0, -1.0)), p.push(GeoPoint.new(43.0, 3.0))
    p.push(GeoPoint.new(42.0, 3.0)), p.push(GeoPoint.new(37.0, -6.0)), p.push(GeoPoint.new(37.0, -9.0))
    p.push(GeoPoint.new(40.0, -9.0)), p.push(GeoPoint.new(43.0, -9.0))
    p

f_italy() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(46.0, 7.0)), p.push(GeoPoint.new(46.0, 14.0)), p.push(GeoPoint.new(44.0, 12.0))
    p.push(GeoPoint.new(40.0, 18.0)), p.push(GeoPoint.new(38.0, 16.0)), p.push(GeoPoint.new(37.0, 15.0))
    p.push(GeoPoint.new(38.0, 12.0)), p.push(GeoPoint.new(42.0, 11.0)), p.push(GeoPoint.new(44.0, 8.0))
    p.push(GeoPoint.new(46.0, 7.0))
    p

f_uk() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(50.0, -5.0)), p.push(GeoPoint.new(51.0, 1.0)), p.push(GeoPoint.new(53.0, 0.0))
    p.push(GeoPoint.new(55.0, -2.0)), p.push(GeoPoint.new(59.0, -3.0)), p.push(GeoPoint.new(58.0, -7.0))
    p.push(GeoPoint.new(56.0, -6.0)), p.push(GeoPoint.new(53.0, -5.0)), p.push(GeoPoint.new(51.0, -5.0))
    p.push(GeoPoint.new(50.0, -5.0))
    p

f_france() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(51.0, 2.0)), p.push(GeoPoint.new(49.0, 8.0)), p.push(GeoPoint.new(46.0, 7.0))
    p.push(GeoPoint.new(43.0, 7.0)), p.push(GeoPoint.new(43.0, 3.0)), p.push(GeoPoint.new(44.0, -1.0))
    p.push(GeoPoint.new(47.0, -2.0)), p.push(GeoPoint.new(49.0, -1.0)), p.push(GeoPoint.new(51.0, 2.0))
    p

f_germany_poland() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(55.0, 8.0)), p.push(GeoPoint.new(54.0, 14.0)), p.push(GeoPoint.new(54.0, 19.0))
    p.push(GeoPoint.new(52.0, 24.0)), p.push(GeoPoint.new(49.0, 22.0)), p.push(GeoPoint.new(48.0, 10.0))
    p.push(GeoPoint.new(49.0, 8.0)), p.push(GeoPoint.new(53.0, 8.0)), p.push(GeoPoint.new(55.0, 8.0))
    p

f_africa() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(37.0, -6.0)), p.push(GeoPoint.new(37.0, 10.0)), p.push(GeoPoint.new(32.0, 32.0))
    p.push(GeoPoint.new(22.0, 37.0)), p.push(GeoPoint.new(12.0, 44.0)), p.push(GeoPoint.new(12.0, 51.0))
    p.push(GeoPoint.new(2.0, 45.0)), p.push(GeoPoint.new(-5.0, 40.0)), p.push(GeoPoint.new(-12.0, 40.0))
    p.push(GeoPoint.new(-26.0, 33.0)), p.push(GeoPoint.new(-35.0, 20.0)), p.push(GeoPoint.new(-34.0, 18.0))
    p.push(GeoPoint.new(-22.0, 14.0)), p.push(GeoPoint.new(-5.0, 12.0)), p.push(GeoPoint.new(5.0, 1.0))
    p.push(GeoPoint.new(5.0, -4.0)), p.push(GeoPoint.new(10.0, -15.0)), p.push(GeoPoint.new(15.0, -17.0))
    p.push(GeoPoint.new(21.0, -17.0)), p.push(GeoPoint.new(27.0, -13.0)), p.push(GeoPoint.new(35.0, -6.0))
    p.push(GeoPoint.new(37.0, -6.0))
    p

f_madagascar() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(-12.0, 49.0)), p.push(GeoPoint.new(-16.0, 50.0)), p.push(GeoPoint.new(-25.0, 47.0))
    p.push(GeoPoint.new(-26.0, 44.0)), p.push(GeoPoint.new(-22.0, 44.0)), p.push(GeoPoint.new(-16.0, 46.0))
    p.push(GeoPoint.new(-12.0, 49.0))
    p

f_russia() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(77.0, 70.0)), p.push(GeoPoint.new(77.0, 100.0)), p.push(GeoPoint.new(73.0, 140.0))
    p.push(GeoPoint.new(67.0, 180.0)), p.push(GeoPoint.new(65.0, 180.0)), p.push(GeoPoint.new(55.0, 137.0))
    p.push(GeoPoint.new(43.0, 132.0)), p.push(GeoPoint.new(45.0, 85.0)), p.push(GeoPoint.new(50.0, 55.0))
    p.push(GeoPoint.new(55.0, 60.0)), p.push(GeoPoint.new(60.0, 55.0)), p.push(GeoPoint.new(65.0, 70.0))
    p.push(GeoPoint.new(70.0, 70.0)), p.push(GeoPoint.new(77.0, 70.0))
    p

f_middle_east() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(42.0, 26.0)), p.push(GeoPoint.new(39.0, 44.0)), p.push(GeoPoint.new(30.0, 48.0))
    p.push(GeoPoint.new(26.0, 56.0)), p.push(GeoPoint.new(12.0, 44.0)), p.push(GeoPoint.new(14.0, 42.0))
    p.push(GeoPoint.new(28.0, 35.0)), p.push(GeoPoint.new(32.0, 35.0)), p.push(GeoPoint.new(36.0, 36.0))
    p.push(GeoPoint.new(37.0, 36.0)), p.push(GeoPoint.new(38.0, 41.0)), p.push(GeoPoint.new(41.0, 41.0))
    p.push(GeoPoint.new(42.0, 35.0)), p.push(GeoPoint.new(42.0, 26.0))
    p

f_india() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(35.0, 74.0)), p.push(GeoPoint.new(28.0, 70.0)), p.push(GeoPoint.new(24.0, 69.0))
    p.push(GeoPoint.new(20.0, 73.0)), p.push(GeoPoint.new(15.0, 74.0)), p.push(GeoPoint.new(8.0, 77.0))
    p.push(GeoPoint.new(8.0, 78.0)), p.push(GeoPoint.new(13.0, 80.0)), p.push(GeoPoint.new(16.0, 82.0))
    p.push(GeoPoint.new(22.0, 89.0)), p.push(GeoPoint.new(27.0, 88.0)), p.push(GeoPoint.new(28.0, 84.0))
    p.push(GeoPoint.new(30.0, 81.0)), p.push(GeoPoint.new(35.0, 74.0))
    p

f_china() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(54.0, 122.0)), p.push(GeoPoint.new(48.0, 135.0)), p.push(GeoPoint.new(42.0, 130.0))
    p.push(GeoPoint.new(39.0, 118.0)), p.push(GeoPoint.new(35.0, 119.0)), p.push(GeoPoint.new(30.0, 122.0))
    p.push(GeoPoint.new(25.0, 119.0)), p.push(GeoPoint.new(22.0, 114.0)), p.push(GeoPoint.new(21.0, 110.0))
    p.push(GeoPoint.new(22.0, 106.0)), p.push(GeoPoint.new(18.0, 109.0)), p.push(GeoPoint.new(21.0, 100.0))
    p.push(GeoPoint.new(28.0, 97.0)), p.push(GeoPoint.new(30.0, 81.0)), p.push(GeoPoint.new(35.0, 74.0))
    p.push(GeoPoint.new(37.0, 75.0)), p.push(GeoPoint.new(45.0, 80.0)), p.push(GeoPoint.new(49.0, 87.0))
    p.push(GeoPoint.new(54.0, 122.0))
    p

f_southeast_asia() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(21.0, 100.0)), p.push(GeoPoint.new(18.0, 109.0)), p.push(GeoPoint.new(10.0, 109.0))
    p.push(GeoPoint.new(8.0, 103.0)), p.push(GeoPoint.new(1.0, 104.0)), p.push(GeoPoint.new(6.0, 100.0))
    p.push(GeoPoint.new(10.0, 99.0)), p.push(GeoPoint.new(14.0, 99.0)), p.push(GeoPoint.new(18.0, 97.0))
    p.push(GeoPoint.new(21.0, 100.0))
    p

f_korea() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(43.0, 130.0)), p.push(GeoPoint.new(38.0, 132.0)), p.push(GeoPoint.new(35.0, 129.0))
    p.push(GeoPoint.new(34.0, 126.0)), p.push(GeoPoint.new(38.0, 125.0)), p.push(GeoPoint.new(43.0, 130.0))
    p

f_japan() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(46.0, 142.0)), p.push(GeoPoint.new(44.0, 145.0)), p.push(GeoPoint.new(43.0, 146.0))
    p.push(GeoPoint.new(35.0, 140.0)), p.push(GeoPoint.new(33.0, 130.0)), p.push(GeoPoint.new(34.0, 129.0))
    p.push(GeoPoint.new(35.0, 136.0)), p.push(GeoPoint.new(38.0, 139.0)), p.push(GeoPoint.new(41.0, 140.0))
    p.push(GeoPoint.new(46.0, 142.0))
    p

f_australia() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(-11.0, 142.0)), p.push(GeoPoint.new(-17.0, 146.0)), p.push(GeoPoint.new(-24.0, 153.0))
    p.push(GeoPoint.new(-34.0, 151.0)), p.push(GeoPoint.new(-39.0, 147.0)), p.push(GeoPoint.new(-39.0, 143.0))
    p.push(GeoPoint.new(-35.0, 137.0)), p.push(GeoPoint.new(-32.0, 134.0)), p.push(GeoPoint.new(-32.0, 127.0))
    p.push(GeoPoint.new(-34.0, 116.0)), p.push(GeoPoint.new(-29.0, 114.0)), p.push(GeoPoint.new(-21.0, 114.0))
    p.push(GeoPoint.new(-12.0, 131.0)), p.push(GeoPoint.new(-11.0, 142.0))
    p

f_new_zealand() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(-34.0, 173.0)), p.push(GeoPoint.new(-37.0, 178.0)), p.push(GeoPoint.new(-42.0, 174.0))
    p.push(GeoPoint.new(-47.0, 167.0)), p.push(GeoPoint.new(-44.0, 169.0)), p.push(GeoPoint.new(-41.0, 175.0))
    p.push(GeoPoint.new(-34.0, 173.0))
    p

f_indonesia() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(6.0, 95.0)), p.push(GeoPoint.new(0.0, 104.0)), p.push(GeoPoint.new(-3.0, 106.0))
    p.push(GeoPoint.new(-8.0, 115.0)), p.push(GeoPoint.new(-9.0, 120.0)), p.push(GeoPoint.new(-5.0, 120.0))
    p.push(GeoPoint.new(1.0, 118.0)), p.push(GeoPoint.new(5.0, 117.0)), p.push(GeoPoint.new(7.0, 117.0))
    p.push(GeoPoint.new(6.0, 100.0)), p.push(GeoPoint.new(6.0, 95.0))
    p

f_greenland() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(84.0, -30.0)), p.push(GeoPoint.new(84.0, -68.0)), p.push(GeoPoint.new(76.0, -73.0))
    p.push(GeoPoint.new(70.0, -54.0)), p.push(GeoPoint.new(60.0, -43.0)), p.push(GeoPoint.new(66.0, -37.0))
    p.push(GeoPoint.new(77.0, -18.0)), p.push(GeoPoint.new(84.0, -30.0))
    p

f_iceland() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(66.0, -24.0)), p.push(GeoPoint.new(66.0, -14.0)), p.push(GeoPoint.new(64.0, -14.0))
    p.push(GeoPoint.new(64.0, -24.0)), p.push(GeoPoint.new(66.0, -24.0))
    p

f_philippines() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(19.0, 120.0)), p.push(GeoPoint.new(14.0, 120.0)), p.push(GeoPoint.new(7.0, 126.0))
    p.push(GeoPoint.new(13.0, 124.0)), p.push(GeoPoint.new(18.0, 122.0)), p.push(GeoPoint.new(19.0, 120.0))
    p

f_papua() =>
    array<GeoPoint> p = array.new<GeoPoint>()
    p.push(GeoPoint.new(-2.0, 141.0)), p.push(GeoPoint.new(-6.0, 147.0)), p.push(GeoPoint.new(-10.0, 150.0))
    p.push(GeoPoint.new(-10.0, 142.0)), p.push(GeoPoint.new(-6.0, 141.0)), p.push(GeoPoint.new(-2.0, 141.0))
    p

// ═══════════════════════════════════════════════════════════════════════════════
// ───────────────────────────── DRAWING FUNCTIONS ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

f_drawOcean(int cx, float cy, float radius, color col) =>
    array<chart.point> pts = array.new<chart.point>()
    for i = 0 to 60
        float ang = f_rad(float(i * 6))
        pts.push(chart.point.from_index(cx + int(math.cos(ang) * radius), cy + math.sin(ang) * radius))
    polyline.new(pts, closed = true, line_color = borderColor, line_width = 3, fill_color = col)

f_drawGridArc(array<GeoPoint> geoPoints, float rotX, float rotY, int cx, float cy, float radius, color col) =>
    array<chart.point> segment = array.new<chart.point>()
    for i = 0 to geoPoints.size() - 1
        GeoPoint g = geoPoints.get(i)
        Point3D p3d = f_geoTo3D(g.lat, g.lon)
        [pt2d, visible, depth] = f_project(p3d, rotX, rotY, cx, cy, radius)
        if visible
            segment.push(pt2d)
        else if segment.size() > 1
            polyline.new(segment, line_color = col, line_width = 1)
            segment := array.new<chart.point>()
    if segment.size() > 1
        polyline.new(segment, line_color = col, line_width = 1)

f_drawMeridian(float lon, float rotX, float rotY, int cx, float cy, float radius, color col) =>
    array<GeoPoint> pts = array.new<GeoPoint>()
    for lat = -80 to 80 by 10
        pts.push(GeoPoint.new(float(lat), lon))
    f_drawGridArc(pts, rotX, rotY, cx, cy, radius, col)

f_drawParallel(float lat, float rotX, float rotY, int cx, float cy, float radius, color col) =>
    array<GeoPoint> pts = array.new<GeoPoint>()
    for lon = -180 to 180 by 12
        pts.push(GeoPoint.new(lat, float(lon)))
    f_drawGridArc(pts, rotX, rotY, cx, cy, radius, col)

f_drawContinent(array<GeoPoint> geo, float rotX, float rotY, int cx, float cy, float radius, color fillCol, color lineCol, bool doFill) =>
    array<chart.point> visiblePts = array.new<chart.point>()
    array<chart.point> segment = array.new<chart.point>()
    for i = 0 to geo.size() - 1
        GeoPoint g = geo.get(i)
        Point3D p3d = f_geoTo3D(g.lat, g.lon)
        [pt2d, visible, depth] = f_project(p3d, rotX, rotY, cx, cy, radius)
        if visible
            segment.push(pt2d)
            visiblePts.push(pt2d)
        else if segment.size() > 1
            polyline.new(segment, line_color = lineCol, line_width = 2)
            segment := array.new<chart.point>()
    if segment.size() > 1
        polyline.new(segment, line_color = lineCol, line_width = 2)
    if doFill and visiblePts.size() > 3
        polyline.new(visiblePts, closed = true, line_color = color.new(lineCol, 100), fill_color = fillCol)

f_drawMarket(StockMarket mkt, float rotX, float rotY, int cx, float cy, float radius) =>
    Point3D p3d = f_geoTo3D(mkt.lat, mkt.lon)
    [pt2d, visible, depth] = f_project(p3d, rotX, rotY, cx, cy, radius)
    if visible
        color dotCol = mkt.isOpen ? openColor : closedColor
        string symbol = mkt.isOpen ? "◉" : "○"
        if mkt.isOpen
            label.new(pt2d.index, pt2d.price, "●", style = label.style_none, textcolor = color.new(openColor, 50), size = size.large)
        label.new(pt2d.index, pt2d.price, symbol, style = label.style_none, textcolor = dotCol, size = size.normal)

f_clearAll() =>
    for l in line.all
        l.delete()
    for p in polyline.all
        p.delete()
    for lb in label.all
        lb.delete()
    for t in table.all
        t.delete()

// ═══════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────── MAIN ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Get index data
float spxClose = request.security("TVC:SPX", "D", close, lookahead = barmerge.lookahead_on)
float spxOpen = request.security("TVC:SPX", "D", open, lookahead = barmerge.lookahead_on)
float ftseClose = request.security("TVC:UKX", "D", close, lookahead = barmerge.lookahead_on)
float ftseOpen = request.security("TVC:UKX", "D", open, lookahead = barmerge.lookahead_on)
float daxClose = request.security("TVC:DEU40", "D", close, lookahead = barmerge.lookahead_on)
float daxOpen = request.security("TVC:DEU40", "D", open, lookahead = barmerge.lookahead_on)
float cac40Close = request.security("TVC:CAC40", "D", close, lookahead = barmerge.lookahead_on)
float cac40Open = request.security("TVC:CAC40", "D", open, lookahead = barmerge.lookahead_on)
float nikkeiClose = request.security("TVC:NI225", "D", close, lookahead = barmerge.lookahead_on)
float nikkeiOpen = request.security("TVC:NI225", "D", open, lookahead = barmerge.lookahead_on)
float hsiClose = request.security("TVC:HSI", "D", close, lookahead = barmerge.lookahead_on)
float hsiOpen = request.security("TVC:HSI", "D", open, lookahead = barmerge.lookahead_on)
float kospiClose = request.security("TVC:KOSPI", "D", close, lookahead = barmerge.lookahead_on)
float kospiOpen = request.security("TVC:KOSPI", "D", open, lookahead = barmerge.lookahead_on)
float stiClose = request.security("TVC:STI", "D", close, lookahead = barmerge.lookahead_on)
float stiOpen = request.security("TVC:STI", "D", open, lookahead = barmerge.lookahead_on)
float sa40Close = request.security("TVC:SA40", "D", close, lookahead = barmerge.lookahead_on)
float sa40Open = request.security("TVC:SA40", "D", open, lookahead = barmerge.lookahead_on)

f_getIndexChange(string name) =>
    float pct = 0.0
    if name == "NYSE" or name == "NASDAQ"
        pct := spxOpen != 0 ? ((spxClose - spxOpen) / spxOpen) * 100 : 0
    else if name == "LSE"
        pct := ftseOpen != 0 ? ((ftseClose - ftseOpen) / ftseOpen) * 100 : 0
    else if name == "XETRA"
        pct := daxOpen != 0 ? ((daxClose - daxOpen) / daxOpen) * 100 : 0
    else if name == "EURONEXT"
        pct := cac40Open != 0 ? ((cac40Close - cac40Open) / cac40Open) * 100 : 0
    else if name == "TSE"
        pct := nikkeiOpen != 0 ? ((nikkeiClose - nikkeiOpen) / nikkeiOpen) * 100 : 0
    else if name == "HKEX"
        pct := hsiOpen != 0 ? ((hsiClose - hsiOpen) / hsiOpen) * 100 : 0
    else if name == "KRX"
        pct := kospiOpen != 0 ? ((kospiClose - kospiOpen) / kospiOpen) * 100 : 0
    else if name == "SGX"
        pct := stiOpen != 0 ? ((stiClose - stiOpen) / stiOpen) * 100 : 0
    else if name == "JSE"
        pct := sa40Open != 0 ? ((sa40Close - sa40Open) / sa40Open) * 100 : 0
    pct

if barstate.islast
    array<StockMarket> markets = f_buildMarkets()
    var int lastMinute = -1
    int currentMinute = minute(timenow, "UTC")
    bool minuteChanged = currentMinute != lastMinute
    
    if minuteChanged
        lastMinute := currentMinute
        f_clearAll()
        
        int utcH = hour(timenow, "UTC")
        int utcM = minute(timenow, "UTC")
        float hourDecimal = utcH + utcM / 60.0
        float finalRotY = (hourDecimal - 12.0) * 15.0
        
        int centerX = bar_index - 80
        float centerY = hl2
        float radius = globeRadius
        
        f_drawOcean(centerX, centerY, radius, oceanColor)
        
        if showGrid
            for i = 0 to 17
                f_drawMeridian(-180.0 + i * 20.0, rotationX, finalRotY, centerX, centerY, radius, gridColor)
            for i = 1 to 8
                f_drawParallel(-80.0 + i * 20.0, rotationX, finalRotY, centerX, centerY, radius, gridColor)
        
        f_drawContinent(f_canada(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_usa(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_alaska(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_mexico(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_south_america(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_greenland(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_iceland(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_europe(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_uk(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_france(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_spain_portugal(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_italy(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_germany_poland(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_africa(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_madagascar(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_russia(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_middle_east(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_india(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_china(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_southeast_asia(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_korea(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_japan(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_indonesia(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_philippines(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_australia(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_new_zealand(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        f_drawContinent(f_papua(), rotationX, finalRotY, centerX, centerY, radius, landColor, landBorder, showFill)
        
        int openCount = 0
        
        for i = 0 to markets.size() - 1
            StockMarket mkt = markets.get(i)
            if mkt.isOpen
                openCount += 1
            f_drawMarket(mkt, rotationX, finalRotY, centerX, centerY, radius)
        
        int centerXLabel = bar_index - 80
        label.new(centerXLabel, centerY + radius + 8, "WORLD STOCK MARKETS", style = label.style_none, textcolor = color.white, size = size.large)
        
        string statusTxt = openCount > 0 ? str.format("{0} MARKET{1} OPEN", openCount, openCount > 1 ? "S" : "") : "ALL MARKETS CLOSED"
        color statusCol = openCount > 0 ? openColor : closedColor
        label.new(centerXLabel, centerY - radius - 5, statusTxt, style = label.style_none, textcolor = statusCol, size = size.normal)
        
        string utcTime = str.format("UTC {0}:{1}", str.format("{0,number,00}", hour(timenow, "UTC")), str.format("{0,number,00}", minute(timenow, "UTC")))
        label.new(centerXLabel, centerY - radius - 10, utcTime, style = label.style_none, textcolor = color.new(color.white, 50), size = size.small)
    
    var tblPos = tablePos == "Left" ? position.middle_left : position.middle_right
    var tbl = table.new(tblPos, 10, 25, bgcolor = color.new(#0a1628, 10), border_color = color.new(#3d5a80, 50), border_width = 1)
    
    table.cell(tbl, 0, 0, "", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 1, 0, "Exchange", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 2, 0, "Country", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 3, 0, "Local", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 4, 0, "Opens", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 5, 0, "To Open", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 6, 0, "Since Open", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 7, 0, "To Close", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 8, 0, "Index", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    table.cell(tbl, 9, 0, "Chg%", bgcolor = color.new(#1a365d, 0), text_color = color.white, text_size = size.small)
    
    for col = 0 to 9
        table.cell(tbl, col, 1, "", bgcolor = color.new(#3d5a80, 70), text_size = size.tiny)
    
    array<StockMarket> sortedMarkets = array.new<StockMarket>()
    for i = 0 to markets.size() - 1
        if markets.get(i).isOpen
            sortedMarkets.push(markets.get(i))
    for i = 0 to markets.size() - 1
        if not markets.get(i).isOpen
            sortedMarkets.push(markets.get(i))
    
    int tblRow = 2
    for i = 0 to sortedMarkets.size() - 1
        StockMarket mkt = sortedMarkets.get(i)
        
        int currentSecs = mkt.localHour * 3600 + mkt.localMin * 60 + mkt.localSec
        int openSecs = mkt.openHour * 3600 + mkt.openMin * 60
        int closeSecs = mkt.closeHour * 3600 + mkt.closeMin * 60
        int sinceOpenSecs = currentSecs - openSecs
        int toCloseSecs = closeSecs - currentSecs
        int toOpenSecs = openSecs - currentSecs
        if toOpenSecs < 0
            toOpenSecs += 86400
        
        color rowBg = mkt.isOpen ? color.new(#0d3320, 20) : color.new(#1a1a2e, 30)
        
        string statusIcon = mkt.isOpen ? "●" : "○"
        color statusClr = mkt.isOpen ? color.new(#00ff88, 0) : color.new(#555555, 0)
        table.cell(tbl, 0, tblRow, statusIcon, bgcolor = rowBg, text_color = statusClr, text_size = size.small)
        table.cell(tbl, 1, tblRow, mkt.name, bgcolor = rowBg, text_color = mkt.isOpen ? color.white : color.gray, text_size = size.small, text_halign = text.align_left)
        table.cell(tbl, 2, tblRow, mkt.flag + " " + mkt.fullName, bgcolor = rowBg, text_color = mkt.isOpen ? color.white : color.gray, text_size = size.small, text_halign = text.align_left)
        table.cell(tbl, 3, tblRow, f_formatTimeWithSec(mkt.localHour, mkt.localMin, mkt.localSec), bgcolor = rowBg, text_color = mkt.isOpen ? color.new(#00ff88, 0) : color.gray, text_size = size.small)
        table.cell(tbl, 4, tblRow, f_formatTime(mkt.openHour, mkt.openMin), bgcolor = rowBg, text_color = color.new(color.white, 40), text_size = size.small)
        
        if mkt.isOpen
            table.cell(tbl, 5, tblRow, "—", bgcolor = rowBg, text_color = color.gray, text_size = size.small)
            table.cell(tbl, 6, tblRow, f_formatDurationWithSec(sinceOpenSecs), bgcolor = rowBg, text_color = color.new(#00ff88, 20), text_size = size.small)
            table.cell(tbl, 7, tblRow, f_formatDurationWithSec(toCloseSecs), bgcolor = rowBg, text_color = toCloseSecs < 3600 ? color.new(#ff6b6b, 0) : color.new(#ffd93d, 20), text_size = size.small)
        else
            table.cell(tbl, 5, tblRow, f_formatDurationWithSec(toOpenSecs), bgcolor = rowBg, text_color = toOpenSecs < 3600 ? color.new(#ffd93d, 0) : color.new(color.white, 40), text_size = size.small)
            table.cell(tbl, 6, tblRow, "—", bgcolor = rowBg, text_color = color.gray, text_size = size.small)
            table.cell(tbl, 7, tblRow, "—", bgcolor = rowBg, text_color = color.gray, text_size = size.small)
        
        float indexChg = f_getIndexChange(mkt.name)
        string indexName = mkt.name == "NYSE" or mkt.name == "NASDAQ" ? "S&P500" : mkt.name == "LSE" ? "FTSE" : mkt.name == "XETRA" ? "DAX" : mkt.name == "EURONEXT" ? "CAC40" : mkt.name == "TSE" ? "N225" : mkt.name == "HKEX" ? "HSI" : mkt.name == "KRX" ? "KOSPI" : mkt.name == "SGX" ? "STI" : mkt.name == "JSE" ? "SA40" : "—"
        
        table.cell(tbl, 8, tblRow, indexName, bgcolor = rowBg, text_color = color.new(color.white, 40), text_size = size.small)
        
        if indexName != "—"
            color chgColor = indexChg >= 0 ? color.new(#00ff88, 0) : color.new(#ff6b6b, 0)
            string chgStr = (indexChg >= 0 ? "+" : "") + str.tostring(indexChg, "#.##") + "%"
            table.cell(tbl, 9, tblRow, chgStr, bgcolor = rowBg, text_color = chgColor, text_size = size.small)
        else
            table.cell(tbl, 9, tblRow, "—", bgcolor = rowBg, text_color = color.gray, text_size = size.small)
        
        tblRow += 1`,
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
