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
// Complete 40 Modules with Real-time + News + Proxy Data

export function calculateModuleScores(
  data: ModuleRealTimeData,
  newsText: string,
  symbol: string
): Record<string, number> {
  const scores: Record<string, number> = {};
  const lowerNews = newsText.toLowerCase();
  
  // Asset type detection
  const isGoldOrSafeHaven = ['XAUUSD', 'XAGUSD'].includes(symbol);
  const isCrypto = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'ADAUSD', 'XRPUSD'].includes(symbol);
  const isIndex = ['US500', 'US100', 'US30', 'DE40', 'UK100', 'JP225'].includes(symbol);
  const isForex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'].includes(symbol);
  const isOil = ['USOIL', 'UKOIL', 'NATGAS'].includes(symbol);

  // ================== CATEGORY 1: MACRO & ECONOMIC (M1-M8) ==================

  // M1: Macro Neural Forecast (GDP + Inflation combo)
  if (data.gdpGrowth !== null && data.inflationRate !== null) {
    const gdpScore = Math.min(1, Math.max(0, (data.gdpGrowth + 5) / 10));
    const inflationScore = Math.min(1, Math.max(0, 1 - (data.inflationRate - 2) / 8));
    scores.macro_neural_forecast = (gdpScore * 0.6 + inflationScore * 0.4);
  }

  // M2: Central Bank Sentiment (keyword-based)
  const cbKeywords = {
    hawkish: ['rate hike', 'tighten', 'inflation concern', 'restrictive', 'hawkish', 'quantitative tightening'],
    dovish: ['rate cut', 'easing', 'accommodate', 'dovish', 'stimulus', 'quantitative easing', 'pivot'],
    neutral: ['data dependent', 'patient', 'gradual', 'wait and see']
  };
  let cbScore = 0.5;
  cbKeywords.hawkish.forEach(kw => { if (lowerNews.includes(kw)) cbScore -= 0.08; });
  cbKeywords.dovish.forEach(kw => { if (lowerNews.includes(kw)) cbScore += 0.08; });
  scores.central_bank_sentiment = Math.min(1, Math.max(0, cbScore));

  // M3: Yield Curve Signal
  if (data.yieldCurveSpread !== null) {
    if (data.yieldCurveSpread < 0) {
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

  // M7: Trade Balance Flow (keyword-based + DXY proxy)
  let tradeScore = 0.5;
  const tradeKeywords = {
    positive: ['trade surplus', 'export growth', 'trade deal', 'tariff reduction'],
    negative: ['trade deficit', 'tariff', 'trade war', 'import ban', 'sanction']
  };
  tradeKeywords.positive.forEach(kw => { if (lowerNews.includes(kw)) tradeScore += 0.1; });
  tradeKeywords.negative.forEach(kw => { if (lowerNews.includes(kw)) tradeScore -= 0.1; });
  if (data.dxyChange !== null) {
    tradeScore += data.dxyChange > 0 ? 0.1 : -0.1; // Strong USD = trade deficit pressure
  }
  scores.trade_balance_flow = Math.min(1, Math.max(0, tradeScore));

  // M8: Fiscal Policy Impact (keyword-based)
  let fiscalScore = 0.5;
  const fiscalKeywords = {
    expansive: ['stimulus', 'spending bill', 'infrastructure', 'fiscal package', 'tax cut'],
    contractive: ['austerity', 'budget cut', 'deficit reduction', 'spending freeze', 'tax hike']
  };
  fiscalKeywords.expansive.forEach(kw => { if (lowerNews.includes(kw)) fiscalScore += 0.1; });
  fiscalKeywords.contractive.forEach(kw => { if (lowerNews.includes(kw)) fiscalScore -= 0.1; });
  scores.fiscal_policy_impact = Math.min(1, Math.max(0, fiscalScore));

  // ================== CATEGORY 2: SENTIMENT & FLOW (M9-M16) ==================

  // M9: News Sentiment CFA (keyword-based with CFA dictionary)
  const cfaPositive = ['bullish', 'outperform', 'buy rating', 'upgrade', 'beat expectations', 'record high', 'strong earnings'];
  const cfaNegative = ['bearish', 'underperform', 'sell rating', 'downgrade', 'miss expectations', 'decline', 'weak'];
  let cfaScore = 0.5;
  cfaPositive.forEach(kw => { if (lowerNews.includes(kw)) cfaScore += 0.06; });
  cfaNegative.forEach(kw => { if (lowerNews.includes(kw)) cfaScore -= 0.06; });
  scores.news_sentiment_cfa = Math.min(1, Math.max(0, cfaScore));

  // M10: Social Media Pulse (keyword-based)
  const socialKeywords = {
    positive: ['trending', 'viral', 'moon', 'bullish', 'fomo', 'to the moon', 'pump'],
    negative: ['crash', 'dump', 'fud', 'scam', 'bearish', 'rug pull']
  };
  let socialScore = 0.5;
  socialKeywords.positive.forEach(kw => { if (lowerNews.includes(kw)) socialScore += 0.08; });
  socialKeywords.negative.forEach(kw => { if (lowerNews.includes(kw)) socialScore -= 0.08; });
  scores.social_media_pulse = Math.min(1, Math.max(0, socialScore));

  // M11: Institutional Flow (ETF volume vs average)
  if (data.etfFlows) {
    const gldFlowRatio = data.etfFlows.gldAvgVolume > 0 
      ? data.etfFlows.gldVolume / data.etfFlows.gldAvgVolume : 1;
    const spyFlowRatio = data.etfFlows.spyAvgVolume > 0
      ? data.etfFlows.spyVolume / data.etfFlows.spyAvgVolume : 1;
    
    if (isGoldOrSafeHaven) {
      scores.institutional_flow = Math.min(1, 0.3 + gldFlowRatio * 0.3);
    } else {
      scores.institutional_flow = Math.min(1, 0.3 + spyFlowRatio * 0.3);
    }
  }

  // M12: Retail Sentiment (keyword-based)
  const retailKeywords = {
    bullish: ['retail buying', 'small investor', 'retail surge', 'meme stock', 'wallstreetbets'],
    bearish: ['retail selling', 'retail exodus', 'panic selling', 'capitulation']
  };
  let retailScore = 0.5;
  retailKeywords.bullish.forEach(kw => { if (lowerNews.includes(kw)) retailScore += 0.1; });
  retailKeywords.bearish.forEach(kw => { if (lowerNews.includes(kw)) retailScore -= 0.1; });
  scores.retail_sentiment = Math.min(1, Math.max(0, retailScore));

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

  // M14: COT Positioning (proxy from volume + news)
  let cotScore = 0.5;
  const cotKeywords = {
    bullish: ['long position', 'net long', 'speculator buying', 'commercial buying'],
    bearish: ['short position', 'net short', 'speculator selling', 'commercial selling']
  };
  cotKeywords.bullish.forEach(kw => { if (lowerNews.includes(kw)) cotScore += 0.1; });
  cotKeywords.bearish.forEach(kw => { if (lowerNews.includes(kw)) cotScore -= 0.1; });
  if (data.priceData) {
    const volRatio = data.priceData.avgVolume > 0 ? data.priceData.volume / data.priceData.avgVolume : 1;
    cotScore += (volRatio - 1) * 0.1;
  }
  scores.cot_positioning = Math.min(1, Math.max(0, cotScore));

  // M15: Dark Pool Activity (proxy from volume anomaly)
  if (data.priceData) {
    const volRatio = data.priceData.avgVolume > 0 ? data.priceData.volume / data.priceData.avgVolume : 1;
    // High volume with small price change = dark pool accumulation
    const priceChange = Math.abs(data.priceData.change24h);
    if (volRatio > 1.5 && priceChange < 1) {
      scores.dark_pool_activity = 0.7; // Accumulation
    } else if (volRatio < 0.7) {
      scores.dark_pool_activity = 0.3; // Low activity
    } else {
      scores.dark_pool_activity = 0.5;
    }
  }

  // M16: ETF Flow Momentum
  if (data.etfFlows) {
    const flowRatio = data.etfFlows.gldAvgVolume > 0 
      ? data.etfFlows.gldVolume / data.etfFlows.gldAvgVolume : 1;
    scores.etf_flow_momentum = Math.min(1, Math.max(0, 0.2 + flowRatio * 0.4));
  }

  // ================== CATEGORY 3: TECHNICAL & REGIME (M17-M24) ==================

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
      scores.momentum_oscillator = 0.3;
    } else if (rsi < 30) {
      scores.momentum_oscillator = 0.7;
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

  // M20: Support/Resistance (using MA levels + ATR)
  if (data.priceData) {
    const { current, ma50, ma200, atr14 } = data.priceData;
    const nearSupport = current > ma200 && current < ma200 + atr14;
    const nearResistance = current < ma50 + atr14 && current > ma50;
    
    if (nearSupport) scores.support_resistance = 0.7;
    else if (nearResistance) scores.support_resistance = 0.3;
    else scores.support_resistance = 0.5;
  }

  // M21: Pattern Recognition (keyword-based)
  const patternKeywords = {
    bullish: ['breakout', 'golden cross', 'cup and handle', 'bull flag', 'ascending triangle', 'double bottom'],
    bearish: ['breakdown', 'death cross', 'head and shoulders', 'bear flag', 'descending triangle', 'double top']
  };
  let patternScore = 0.5;
  patternKeywords.bullish.forEach(kw => { if (lowerNews.includes(kw)) patternScore += 0.1; });
  patternKeywords.bearish.forEach(kw => { if (lowerNews.includes(kw)) patternScore -= 0.1; });
  scores.pattern_recognition = Math.min(1, Math.max(0, patternScore));

  // M22: Volume Analysis
  if (data.priceData) {
    const volRatio = data.priceData.avgVolume > 0 
      ? data.priceData.volume / data.priceData.avgVolume : 1;
    scores.volume_analysis = Math.min(1, 0.3 + volRatio * 0.3);
  }

  // M23: Market Breadth (proxy from index vs VIX)
  if (data.vixLevel !== null && data.priceData) {
    // Low VIX + positive price = broad strength
    const breadthScore = data.priceData.change24h > 0 && data.vixLevel < 20 ? 0.7 :
                         data.priceData.change24h < 0 && data.vixLevel > 25 ? 0.3 : 0.5;
    scores.market_breadth = breadthScore;
  }

  // M24: Intermarket Correlation (DXY vs Gold inverse)
  if (data.dxyChange !== null) {
    if (isGoldOrSafeHaven) {
      scores.intermarket_correlation = data.dxyChange > 0 ? 0.35 : data.dxyChange < 0 ? 0.65 : 0.5;
    } else if (isForex) {
      scores.intermarket_correlation = data.dxyChange > 0 ? 0.4 : 0.6;
    } else {
      scores.intermarket_correlation = 0.5;
    }
  }

  // ================== CATEGORY 4: RISK & EVENT (M25-M32) ==================

  // M25: Event Shock (keyword-based)
  const eventKeywords = {
    positive: ['peace', 'deal signed', 'agreement reached', 'crisis averted', 'resolution'],
    negative: ['war', 'invasion', 'attack', 'crisis', 'emergency', 'disaster', 'explosion', 'assassination']
  };
  let eventScore = 0.5;
  eventKeywords.positive.forEach(kw => { if (lowerNews.includes(kw)) eventScore += 0.12; });
  eventKeywords.negative.forEach(kw => { if (lowerNews.includes(kw)) eventScore -= 0.12; });
  scores.event_shock = Math.min(1, Math.max(0, eventScore));

  // M26: Geopolitical Risk (keyword-based)
  const geoKeywords = {
    high_risk: ['war', 'conflict', 'tension', 'sanction', 'military', 'missile', 'nuclear', 'invasion', 'attack'],
    low_risk: ['peace', 'diplomacy', 'treaty', 'agreement', 'ceasefire', 'de-escalation']
  };
  let geoScore = 0.5;
  geoKeywords.high_risk.forEach(kw => { if (lowerNews.includes(kw)) geoScore -= 0.08; });
  geoKeywords.low_risk.forEach(kw => { if (lowerNews.includes(kw)) geoScore += 0.08; });
  // High geo risk = bullish for gold
  if (isGoldOrSafeHaven) {
    scores.geopolitical_risk = 1 - Math.min(1, Math.max(0, geoScore));
  } else {
    scores.geopolitical_risk = Math.min(1, Math.max(0, geoScore));
  }

  // M27: Black Swan Detector (extreme events)
  const blackSwanKeywords = ['crash', 'collapse', 'meltdown', 'panic', 'crisis', 'unprecedented', 'historic drop', 'circuit breaker'];
  let blackSwanScore = 0.6;
  blackSwanKeywords.forEach(kw => { if (lowerNews.includes(kw)) blackSwanScore -= 0.1; });
  scores.black_swan_detector = Math.min(1, Math.max(0, blackSwanScore));

  // M28: Liquidity Risk (using ATR as proxy)
  if (data.priceData && data.priceData.current > 0) {
    const atrPercent = (data.priceData.atr14 / data.priceData.current) * 100;
    scores.liquidity_risk = Math.max(0, 0.8 - atrPercent / 5);
  }

  // M29: Correlation Breakdown
  if (data.dxyChange !== null && data.priceData && isGoldOrSafeHaven) {
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

  // M31: Regulatory Risk (keyword-based)
  const regKeywords = {
    negative: ['ban', 'regulation', 'crackdown', 'lawsuit', 'fine', 'sec investigation', 'compliance'],
    positive: ['approval', 'deregulation', 'legal clarity', 'regulatory approval', 'green light']
  };
  let regScore = 0.5;
  regKeywords.negative.forEach(kw => { if (lowerNews.includes(kw)) regScore -= 0.1; });
  regKeywords.positive.forEach(kw => { if (lowerNews.includes(kw)) regScore += 0.1; });
  scores.regulatory_risk = Math.min(1, Math.max(0, regScore));

  // M32: Systemic Risk (keyword-based + VIX)
  const systemicKeywords = ['contagion', 'systemic', 'bank failure', 'credit crisis', 'liquidity crisis', 'default', 'bailout'];
  let systemicScore = 0.6;
  systemicKeywords.forEach(kw => { if (lowerNews.includes(kw)) systemicScore -= 0.1; });
  if (data.vixLevel !== null && data.vixLevel > 30) {
    systemicScore -= 0.1;
  }
  scores.systemic_risk = Math.min(1, Math.max(0, systemicScore));

  // ================== CATEGORY 5: ALTERNATIVE & AI (M33-M40) ==================

  // M33: Quantum Sentiment (enhanced multi-factor)
  const baseScores = [
    scores.news_sentiment_cfa || 0.5,
    scores.social_media_pulse || 0.5,
    scores.options_sentiment || 0.5,
    scores.event_shock || 0.5
  ];
  const quantumBase = baseScores.reduce((a, b) => a + b, 0) / baseScores.length;
  // Add "quantum" noise factor based on volatility
  const quantumNoise = data.vixLevel ? (Math.sin(data.vixLevel * 0.1) * 0.1) : 0;
  scores.quantum_sentiment = Math.min(1, Math.max(0, quantumBase + quantumNoise));

  // M34: Neural Ensemble (weighted average of key modules)
  const ensembleModules = [
    scores.trend_regime_detector || 0.5,
    scores.momentum_oscillator || 0.5,
    scores.volume_analysis || 0.5,
    scores.institutional_flow || 0.5,
    scores.news_sentiment_cfa || 0.5
  ];
  scores.neural_ensemble = ensembleModules.reduce((a, b) => a + b, 0) / ensembleModules.length;

  // M35: NLP Deep Analysis (CFA + sentiment combination)
  scores.nlp_deep_analysis = (
    (scores.news_sentiment_cfa || 0.5) * 0.4 +
    (scores.social_media_pulse || 0.5) * 0.3 +
    (scores.event_shock || 0.5) * 0.3
  );

  // M36: Satellite Data (using GDP as economic activity proxy)
  if (data.gdpGrowth !== null) {
    scores.satellite_data = Math.min(1, Math.max(0, 0.4 + data.gdpGrowth / 10));
  }

  // M37: Web Traffic Signal (proxy from news volume + keywords)
  const webKeywords = ['trending', 'viral', 'surge in search', 'google trends', 'social buzz'];
  let webScore = 0.5;
  webKeywords.forEach(kw => { if (lowerNews.includes(kw)) webScore += 0.1; });
  scores.web_traffic_signal = Math.min(1, Math.max(0, webScore));

  // M38: Patent Innovation (keyword-based)
  const patentKeywords = {
    positive: ['patent', 'innovation', 'breakthrough', 'new technology', 'r&d', 'ai development'],
    negative: ['patent dispute', 'lawsuit', 'infringement']
  };
  let patentScore = 0.5;
  patentKeywords.positive.forEach(kw => { if (lowerNews.includes(kw)) patentScore += 0.08; });
  patentKeywords.negative.forEach(kw => { if (lowerNews.includes(kw)) patentScore -= 0.08; });
  scores.patent_innovation = Math.min(1, Math.max(0, patentScore));

  // M39: ESG Momentum (keyword-based)
  const esgKeywords = {
    positive: ['sustainability', 'esg', 'green energy', 'carbon neutral', 'renewable', 'ethical investing'],
    negative: ['pollution', 'environmental damage', 'esg violation', 'carbon emission', 'greenwashing']
  };
  let esgScore = 0.5;
  esgKeywords.positive.forEach(kw => { if (lowerNews.includes(kw)) esgScore += 0.08; });
  esgKeywords.negative.forEach(kw => { if (lowerNews.includes(kw)) esgScore -= 0.08; });
  scores.esg_momentum = Math.min(1, Math.max(0, esgScore));

  // M40: Crypto Correlation
  if (data.btcChange24h !== null) {
    if (isCrypto) {
      scores.crypto_correlation = 0.5 + data.btcChange24h / 20;
    } else if (isGoldOrSafeHaven) {
      scores.crypto_correlation = 0.5 - data.btcChange24h / 40;
    } else if (isIndex) {
      scores.crypto_correlation = 0.5 + data.btcChange24h / 50;
    } else {
      scores.crypto_correlation = 0.5;
    }
    scores.crypto_correlation = Math.min(1, Math.max(0, scores.crypto_correlation));
  }

  return scores;
}

// ============ MODULE DATA SOURCE MAPPING ============
// Complete 40 modules categorization

export const MODULE_DATA_SOURCES: Record<string, 'real-time' | 'keyword' | 'proxy'> = {
  // ===== Real-time data (16 modules) =====
  macro_neural_forecast: 'real-time',      // M1: GDP + Inflation
  yield_curve_signal: 'real-time',         // M3: Treasury yields
  inflation_momentum: 'real-time',         // M4: CPI data
  gdp_growth_trajectory: 'real-time',      // M5: GDP growth
  employment_dynamics: 'real-time',        // M6: Unemployment
  institutional_flow: 'real-time',         // M11: ETF volumes
  options_sentiment: 'real-time',          // M13: VIX level
  etf_flow_momentum: 'real-time',          // M16: ETF flows
  trend_regime_detector: 'real-time',      // M17: Price vs MAs
  momentum_oscillator: 'real-time',        // M18: RSI
  volatility_regime: 'real-time',          // M19: VIX regime
  support_resistance: 'real-time',         // M20: MA levels
  volume_analysis: 'real-time',            // M22: Volume
  liquidity_risk: 'real-time',             // M28: ATR-based
  tail_risk_monitor: 'real-time',          // M30: VIX spikes
  crypto_correlation: 'real-time',         // M40: BTC price
  
  // ===== Keyword-based from news (17 modules) =====
  central_bank_sentiment: 'keyword',       // M2: Fed/ECB keywords
  trade_balance_flow: 'keyword',           // M7: Trade keywords
  fiscal_policy_impact: 'keyword',         // M8: Fiscal keywords
  news_sentiment_cfa: 'keyword',           // M9: CFA dictionary
  social_media_pulse: 'keyword',           // M10: Social keywords
  retail_sentiment: 'keyword',             // M12: Retail keywords
  pattern_recognition: 'keyword',          // M21: Chart patterns
  event_shock: 'keyword',                  // M25: Event keywords
  geopolitical_risk: 'keyword',            // M26: Geo keywords
  black_swan_detector: 'keyword',          // M27: Crisis keywords
  regulatory_risk: 'keyword',              // M31: Regulation
  systemic_risk: 'keyword',                // M32: Systemic keywords
  quantum_sentiment: 'keyword',            // M33: Multi-factor
  neural_ensemble: 'keyword',              // M34: Ensemble
  nlp_deep_analysis: 'keyword',            // M35: NLP combination
  patent_innovation: 'keyword',            // M38: Patent keywords
  esg_momentum: 'keyword',                 // M39: ESG keywords
  
  // ===== Proxy/Approximated (7 modules) =====
  cot_positioning: 'proxy',                // M14: Volume proxy
  dark_pool_activity: 'proxy',             // M15: Volume anomaly
  market_breadth: 'proxy',                 // M23: VIX + price
  intermarket_correlation: 'proxy',        // M24: DXY correlation
  correlation_breakdown: 'proxy',          // M29: Correlation check
  satellite_data: 'proxy',                 // M36: GDP proxy
  web_traffic_signal: 'proxy',             // M37: News proxy
};

// All 40 module IDs for reference
export const ALL_MODULE_IDS = [
  // Category 1: Macro & Economic (M1-M8)
  'macro_neural_forecast', 'central_bank_sentiment', 'yield_curve_signal', 
  'inflation_momentum', 'gdp_growth_trajectory', 'employment_dynamics',
  'trade_balance_flow', 'fiscal_policy_impact',
  // Category 2: Sentiment & Flow (M9-M16)
  'news_sentiment_cfa', 'social_media_pulse', 'institutional_flow',
  'retail_sentiment', 'options_sentiment', 'cot_positioning',
  'dark_pool_activity', 'etf_flow_momentum',
  // Category 3: Technical & Regime (M17-M24)
  'trend_regime_detector', 'momentum_oscillator', 'volatility_regime',
  'support_resistance', 'pattern_recognition', 'volume_analysis',
  'market_breadth', 'intermarket_correlation',
  // Category 4: Risk & Event (M25-M32)
  'event_shock', 'geopolitical_risk', 'black_swan_detector',
  'liquidity_risk', 'correlation_breakdown', 'tail_risk_monitor',
  'regulatory_risk', 'systemic_risk',
  // Category 5: Alternative & AI (M33-M40)
  'quantum_sentiment', 'neural_ensemble', 'nlp_deep_analysis',
  'satellite_data', 'web_traffic_signal', 'patent_innovation',
  'esg_momentum', 'crypto_correlation',
];

// Get data source counts
export function getDataSourceCounts(): { realTime: number; keyword: number; proxy: number; total: number } {
  let realTime = 0, keyword = 0, proxy = 0;
  Object.values(MODULE_DATA_SOURCES).forEach(source => {
    if (source === 'real-time') realTime++;
    else if (source === 'keyword') keyword++;
    else if (source === 'proxy') proxy++;
  });
  return { realTime, keyword, proxy, total: realTime + keyword + proxy };
}
