// ============================================
// ModuleDataService.ts
// Real-time market data fetcher for 40 ABLE-HF Modules
// Uses free APIs: Yahoo Finance, World Bank, Binance
// ============================================

// ============ INTERFACES ============
export interface ModuleRealTimeData {
  // Macro & Economic
  yieldCurveSpread: number | null;      // 10Y-2Y spread
  vixLevel: number | null;              // VIX index
  gdpGrowth: number | null;             // GDP YoY %
  inflationRate: number | null;         // CPI YoY %
  unemploymentRate: number | null;      // Unemployment %
  
  // Technical
  priceData: {
    current: number;
    ma20: number;
    ma50: number;
    ma200: number;
    rsi14: number;
    atr14: number;
    volume: number;
    avgVolume: number;
    change24h: number;
  } | null;
  
  // Flow Data
  etfFlows: {
    gldVolume: number;
    gldAvgVolume: number;
    spyVolume: number;
    spyAvgVolume: number;
  } | null;
  
  // Crypto
  btcChange24h: number | null;
  btcVolume: number | null;
  
  // Market Breadth
  advanceDecline: number | null;
  
  // DXY (Dollar Index)
  dxyLevel: number | null;
  dxyChange: number | null;
  
  // Timestamps
  lastUpdated: Date;
}

// Cache for API calls
const dataCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ECON_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for economic data

// ============ YAHOO FINANCE HELPERS ============

async function fetchYahooQuote(symbol: string): Promise<any> {
  const cacheKey = `yahoo_${symbol}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`,
      { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (!response.ok) throw new Error(`Yahoo API error: ${response.status}`);
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (result) {
      dataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }
    
    return result;
  } catch (error) {
    console.warn(`Yahoo fetch error for ${symbol}:`, error);
    return null;
  }
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate ATR
function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0;
  
  let atr = 0;
  for (let i = highs.length - period; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atr += tr;
  }
  return atr / period;
}

// Get Yahoo symbol mapping
function getYahooSymbol(symbol: string): string {
  const mapping: Record<string, string> = {
    'XAUUSD': 'GC=F',
    'XAGUSD': 'SI=F',
    'BTCUSD': 'BTC-USD',
    'ETHUSD': 'ETH-USD',
    'SOLUSD': 'SOL-USD',
    'BNBUSD': 'BNB-USD',
    'ADAUSD': 'ADA-USD',
    'XRPUSD': 'XRP-USD',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDJPY': 'USDJPY=X',
    'AUDUSD': 'AUDUSD=X',
    'USDCAD': 'USDCAD=X',
    'NZDUSD': 'NZDUSD=X',
    'USDCHF': 'USDCHF=X',
    'USOIL': 'CL=F',
    'UKOIL': 'BZ=F',
    'NATGAS': 'NG=F',
    'US500': 'ES=F',
    'US100': 'NQ=F',
    'US30': 'YM=F',
    'DE40': '^GDAXI',
    'UK100': '^FTSE',
    'JP225': '^N225',
  };
  return mapping[symbol] || symbol;
}

// Fetch Binance ticker
async function fetchBinanceTicker(symbol: string): Promise<any> {
  const cacheKey = `binance_${symbol}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    
    const result = {
      price: parseFloat(data.lastPrice),
      priceChangePercent: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.volume),
    };
    
    dataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    return null;
  }
}

// Fetch economic indicators from World Bank API
async function fetchEconomicIndicators(): Promise<{
  gdpGrowth: number | null;
  inflationRate: number | null;
  unemploymentRate: number | null;
} | null> {
  const cacheKey = 'economic_indicators';
  const cached = dataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ECON_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const [gdpRes, inflationRes, unemploymentRes] = await Promise.all([
      fetch('https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=1', { signal: AbortSignal.timeout(10000) }),
      fetch('https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&per_page=1', { signal: AbortSignal.timeout(10000) }),
      fetch('https://api.worldbank.org/v2/country/USA/indicator/SL.UEM.TOTL.ZS?format=json&per_page=1', { signal: AbortSignal.timeout(10000) }),
    ]);

    const gdpData = await gdpRes.json();
    const inflationData = await inflationRes.json();
    const unemploymentData = await unemploymentRes.json();

    const result = {
      gdpGrowth: gdpData[1]?.[0]?.value || null,
      inflationRate: inflationData[1]?.[0]?.value || null,
      unemploymentRate: unemploymentData[1]?.[0]?.value || null,
    };

    dataCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.warn('Economic indicators fetch error:', error);
    return null;
  }
}

// ============ MAIN DATA FETCHER ============

export async function fetchModuleData(symbol: string): Promise<ModuleRealTimeData> {
  const results: ModuleRealTimeData = {
    yieldCurveSpread: null,
    vixLevel: null,
    gdpGrowth: null,
    inflationRate: null,
    unemploymentRate: null,
    priceData: null,
    etfFlows: null,
    btcChange24h: null,
    btcVolume: null,
    advanceDecline: null,
    dxyLevel: null,
    dxyChange: null,
    lastUpdated: new Date(),
  };

  try {
    // Parallel fetch for speed
    const [
      tnxData,      // 10-Year Treasury
      irxData,      // 13-Week Treasury (3-month proxy)
      vixData,      // VIX
      assetData,    // Target asset
      gldData,      // GLD ETF
      spyData,      // SPY ETF
      btcData,      // Bitcoin
      dxyData,      // Dollar Index
    ] = await Promise.all([
      fetchYahooQuote('^TNX'),
      fetchYahooQuote('^IRX'),
      fetchYahooQuote('^VIX'),
      fetchYahooQuote(getYahooSymbol(symbol)),
      fetchYahooQuote('GLD'),
      fetchYahooQuote('SPY'),
      fetchBinanceTicker('BTCUSDT'),
      fetchYahooQuote('DX-Y.NYB'),
    ]);

    // 1. Yield Curve Spread (10Y - 3M)
    if (tnxData && irxData) {
      const tnx = tnxData.meta?.regularMarketPrice || 0;
      const irx = irxData.meta?.regularMarketPrice || 0;
      results.yieldCurveSpread = tnx - irx;
    }

    // 2. VIX Level
    if (vixData) {
      results.vixLevel = vixData.meta?.regularMarketPrice || null;
    }

    // 3. DXY Level
    if (dxyData) {
      results.dxyLevel = dxyData.meta?.regularMarketPrice || null;
      const dxyCloses = dxyData.indicators?.quote?.[0]?.close?.filter((c: number) => c != null) || [];
      if (dxyCloses.length >= 2) {
        results.dxyChange = ((dxyCloses[dxyCloses.length - 1] - dxyCloses[dxyCloses.length - 2]) / dxyCloses[dxyCloses.length - 2]) * 100;
      }
    }

    // 4. Price Data for target asset
    if (assetData) {
      const quotes = assetData.indicators?.quote?.[0];
      const closes = quotes?.close?.filter((c: number) => c != null) || [];
      const highs = quotes?.high?.filter((h: number) => h != null) || [];
      const lows = quotes?.low?.filter((l: number) => l != null) || [];
      const volumes = quotes?.volume?.filter((v: number) => v != null) || [];

      if (closes.length > 0) {
        const current = assetData.meta?.regularMarketPrice || closes[closes.length - 1];
        const previous = closes.length >= 2 ? closes[closes.length - 2] : current;
        const change24h = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        
        results.priceData = {
          current,
          ma20: calculateSMA(closes, 20),
          ma50: calculateSMA(closes, 50),
          ma200: closes.length >= 200 ? calculateSMA(closes, 200) : calculateSMA(closes, Math.min(closes.length, 60)),
          rsi14: calculateRSI(closes, 14),
          atr14: calculateATR(highs, lows, closes, 14),
          volume: volumes[volumes.length - 1] || 0,
          avgVolume: volumes.length > 0 ? volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length : 0,
          change24h,
        };
      }
    }

    // 5. ETF Flow Data
    if (gldData && spyData) {
      const gldQuotes = gldData.indicators?.quote?.[0];
      const spyQuotes = spyData.indicators?.quote?.[0];
      
      const gldVolumes = gldQuotes?.volume?.filter((v: number) => v != null) || [];
      const spyVolumes = spyQuotes?.volume?.filter((v: number) => v != null) || [];

      results.etfFlows = {
        gldVolume: gldVolumes[gldVolumes.length - 1] || 0,
        gldAvgVolume: gldVolumes.length > 0 ? gldVolumes.reduce((a: number, b: number) => a + b, 0) / gldVolumes.length : 0,
        spyVolume: spyVolumes[spyVolumes.length - 1] || 0,
        spyAvgVolume: spyVolumes.length > 0 ? spyVolumes.reduce((a: number, b: number) => a + b, 0) / spyVolumes.length : 0,
      };
    }

    // 6. Bitcoin Data
    if (btcData) {
      results.btcChange24h = btcData.priceChangePercent;
      results.btcVolume = btcData.volume;
    }

    // 7. Economic Data from World Bank (cached heavily)
    const economicData = await fetchEconomicIndicators();
    if (economicData) {
      results.gdpGrowth = economicData.gdpGrowth;
      results.inflationRate = economicData.inflationRate;
      results.unemploymentRate = economicData.unemploymentRate;
    }

  } catch (error) {
    console.error('ModuleDataService error:', error);
  }

  return results;
}

// ============ MODULE SCORE CALCULATORS ============

export function calculateModuleScores(
  data: ModuleRealTimeData,
  newsText: string,
  symbol: string
): Record<string, number> {
  const scores: Record<string, number> = {};
  const isGoldOrSafeHaven = ['XAUUSD', 'XAGUSD'].includes(symbol);
  const isCrypto = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'ADAUSD', 'XRPUSD'].includes(symbol);
  const isIndex = ['US500', 'US100', 'US30', 'DE40', 'UK100', 'JP225'].includes(symbol);

  // M1: Macro Neural Forecast (based on GDP + Inflation combo)
  if (data.gdpGrowth !== null && data.inflationRate !== null) {
    const gdpScore = Math.min(1, Math.max(0, (data.gdpGrowth + 5) / 10));
    const inflationScore = Math.min(1, Math.max(0, 1 - (data.inflationRate - 2) / 8));
    scores.macro_neural_forecast = (gdpScore * 0.6 + inflationScore * 0.4);
  }

  // M3: Yield Curve Signal
  if (data.yieldCurveSpread !== null) {
    if (data.yieldCurveSpread < 0) {
      // Inverted = recession signal = bullish for gold, bearish for stocks
      scores.yield_curve_signal = isGoldOrSafeHaven ? 0.7 : 0.25;
    } else if (data.yieldCurveSpread > 2) {
      scores.yield_curve_signal = isGoldOrSafeHaven ? 0.4 : 0.75;
    } else {
      scores.yield_curve_signal = 0.3 + (data.yieldCurveSpread / 4);
    }
  }

  // M4: Inflation Momentum
  if (data.inflationRate !== null) {
    if (isGoldOrSafeHaven) {
      scores.inflation_momentum = Math.min(1, 0.3 + data.inflationRate / 15);
    } else if (isIndex) {
      scores.inflation_momentum = Math.max(0, 0.7 - data.inflationRate / 15);
    } else {
      scores.inflation_momentum = 0.5;
    }
  }

  // M5: GDP Growth Trajectory
  if (data.gdpGrowth !== null) {
    scores.gdp_growth_trajectory = Math.min(1, Math.max(0, (data.gdpGrowth + 5) / 10));
  }

  // M6: Employment Dynamics
  if (data.unemploymentRate !== null) {
    scores.employment_dynamics = Math.min(1, Math.max(0, 1 - (data.unemploymentRate - 3) / 10));
  }

  // M11: Institutional Flow (ETF volume vs average)
  if (data.etfFlows) {
    const gldFlowRatio = data.etfFlows.gldAvgVolume > 0 
      ? data.etfFlows.gldVolume / data.etfFlows.gldAvgVolume 
      : 1;
    const spyFlowRatio = data.etfFlows.spyAvgVolume > 0
      ? data.etfFlows.spyVolume / data.etfFlows.spyAvgVolume
      : 1;
    
    if (isGoldOrSafeHaven) {
      scores.institutional_flow = Math.min(1, 0.3 + gldFlowRatio * 0.3);
    } else {
      scores.institutional_flow = Math.min(1, 0.3 + spyFlowRatio * 0.3);
    }
  }

  // M13: Options Sentiment (VIX as proxy)
  if (data.vixLevel !== null) {
    if (isGoldOrSafeHaven) {
      scores.options_sentiment = Math.min(1, 0.3 + data.vixLevel / 50);
    } else if (isIndex) {
      scores.options_sentiment = Math.max(0, 0.8 - data.vixLevel / 50);
    } else {
      scores.options_sentiment = data.vixLevel < 20 ? 0.6 : data.vixLevel < 30 ? 0.4 : 0.3;
    }
  }

  // M16: ETF Flow Momentum
  if (data.etfFlows) {
    const flowRatio = data.etfFlows.gldAvgVolume > 0 
      ? data.etfFlows.gldVolume / data.etfFlows.gldAvgVolume 
      : 1;
    scores.etf_flow_momentum = Math.min(1, Math.max(0, 0.2 + flowRatio * 0.4));
  }

  // M17: Trend Regime Detector (Price vs MAs)
  if (data.priceData) {
    const { current, ma20, ma50, ma200 } = data.priceData;
    let trendScore = 0.5;
    if (current > ma20) trendScore += 0.15;
    if (current > ma50) trendScore += 0.15;
    if (current > ma200) trendScore += 0.15;
    if (ma20 > ma50) trendScore += 0.05;
    scores.trend_regime_detector = Math.min(1, trendScore);
  }

  // M18: Momentum Oscillator (RSI)
  if (data.priceData) {
    const rsi = data.priceData.rsi14;
    if (rsi > 70) {
      scores.momentum_oscillator = 0.3; // Overbought
    } else if (rsi < 30) {
      scores.momentum_oscillator = 0.7; // Oversold
    } else {
      scores.momentum_oscillator = 0.4 + (rsi - 30) / 100;
    }
  }

  // M19: Volatility Regime
  if (data.vixLevel !== null) {
    if (data.vixLevel < 15) {
      scores.volatility_regime = 0.7;
    } else if (data.vixLevel > 30) {
      scores.volatility_regime = 0.3;
    } else {
      scores.volatility_regime = 0.7 - (data.vixLevel - 15) / 30;
    }
  }

  // M20: Support/Resistance (using MA levels)
  if (data.priceData) {
    const { current, ma50, ma200 } = data.priceData;
    const nearSupport = current > ma200 && current < ma200 * 1.02;
    const nearResistance = current < ma50 * 1.02 && current > ma50;
    
    if (nearSupport) scores.support_resistance = 0.7;
    else if (nearResistance) scores.support_resistance = 0.3;
    else scores.support_resistance = 0.5;
  }

  // M22: Volume Analysis
  if (data.priceData) {
    const volRatio = data.priceData.avgVolume > 0 
      ? data.priceData.volume / data.priceData.avgVolume 
      : 1;
    scores.volume_analysis = Math.min(1, 0.3 + volRatio * 0.3);
  }

  // M24: Intermarket Correlation (DXY vs Gold inverse)
  if (data.dxyChange !== null && isGoldOrSafeHaven) {
    // DXY up = Gold down (inverse correlation)
    scores.intermarket_correlation = data.dxyChange > 0 ? 0.35 : data.dxyChange < 0 ? 0.65 : 0.5;
  }

  // M28: Liquidity Risk (using ATR as proxy)
  if (data.priceData && data.priceData.current > 0) {
    const atrPercent = (data.priceData.atr14 / data.priceData.current) * 100;
    scores.liquidity_risk = Math.max(0, 0.8 - atrPercent / 5);
  }

  // M29: Correlation Breakdown
  if (data.dxyChange !== null && data.priceData && isGoldOrSafeHaven) {
    // Check if gold and DXY are moving together (unusual = breakdown)
    const bothUp = data.dxyChange > 0 && data.priceData.change24h > 0;
    const bothDown = data.dxyChange < 0 && data.priceData.change24h < 0;
    scores.correlation_breakdown = (bothUp || bothDown) ? 0.3 : 0.6;
  }

  // M30: Tail Risk Monitor (VIX spikes)
  if (data.vixLevel !== null) {
    if (data.vixLevel > 35) {
      scores.tail_risk_monitor = 0.2;
    } else if (data.vixLevel > 25) {
      scores.tail_risk_monitor = 0.4;
    } else {
      scores.tail_risk_monitor = 0.6;
    }
  }

  // M36: Satellite Data (using GDP as economic activity proxy)
  if (data.gdpGrowth !== null) {
    scores.satellite_data = Math.min(1, Math.max(0, 0.4 + data.gdpGrowth / 10));
  }

  // M40: Crypto Correlation
  if (data.btcChange24h !== null) {
    if (isCrypto) {
      scores.crypto_correlation = 0.5 + data.btcChange24h / 20;
    } else if (isGoldOrSafeHaven) {
      scores.crypto_correlation = 0.5 - data.btcChange24h / 40;
    } else {
      scores.crypto_correlation = 0.5 + data.btcChange24h / 100;
    }
    scores.crypto_correlation = Math.min(1, Math.max(0, scores.crypto_correlation));
  }

  return scores;
}

// ============ MODULE DATA SOURCE MAPPING ============

export const MODULE_DATA_SOURCES: Record<string, 'real-time' | 'keyword' | 'proxy'> = {
  // Real-time data (16 modules)
  yield_curve_signal: 'real-time',
  volatility_regime: 'real-time',
  momentum_oscillator: 'real-time',
  trend_regime_detector: 'real-time',
  volume_analysis: 'real-time',
  options_sentiment: 'real-time',
  etf_flow_momentum: 'real-time',
  institutional_flow: 'real-time',
  liquidity_risk: 'real-time',
  tail_risk_monitor: 'real-time',
  crypto_correlation: 'real-time',
  macro_neural_forecast: 'real-time',
  inflation_momentum: 'real-time',
  gdp_growth_trajectory: 'real-time',
  employment_dynamics: 'real-time',
  satellite_data: 'real-time',
  
  // Keyword-based (17 modules)
  central_bank_sentiment: 'keyword',
  news_sentiment_cfa: 'keyword',
  social_media_pulse: 'keyword',
  retail_sentiment: 'keyword',
  event_shock: 'keyword',
  geopolitical_risk: 'keyword',
  black_swan_detector: 'keyword',
  regulatory_risk: 'keyword',
  systemic_risk: 'keyword',
  fiscal_policy_impact: 'keyword',
  trade_balance_flow: 'keyword',
  pattern_recognition: 'keyword',
  quantum_sentiment: 'keyword',
  neural_ensemble: 'keyword',
  nlp_deep_analysis: 'keyword',
  patent_innovation: 'keyword',
  esg_momentum: 'keyword',
  
  // Proxy (7 modules)
  cot_positioning: 'proxy',
  dark_pool_activity: 'proxy',
  support_resistance: 'proxy',
  market_breadth: 'proxy',
  intermarket_correlation: 'proxy',
  correlation_breakdown: 'proxy',
  web_traffic_signal: 'proxy',
};

// Get data source counts
export function getDataSourceCounts(): { realTime: number; keyword: number; proxy: number } {
  let realTime = 0, keyword = 0, proxy = 0;
  Object.values(MODULE_DATA_SOURCES).forEach(source => {
    if (source === 'real-time') realTime++;
    else if (source === 'keyword') keyword++;
    else if (source === 'proxy') proxy++;
  });
  return { realTime, keyword, proxy };
}
