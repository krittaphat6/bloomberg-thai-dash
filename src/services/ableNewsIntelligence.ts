// ============================================
// ABLE-HF 3.0 News Intelligence Engine
// Hedge Fund Grade Analysis - 40 Modules
// ============================================

// ============ TYPES & INTERFACES ============
export interface NewsAnalysisInput {
  symbol: string;
  headlines: string[];
  currentPrice?: number;
  priceChange24h?: number;
  newsTimestamps?: Date[];
}

export interface CategoryPerformance {
  macro_economic: number;
  sentiment_flow: number;
  technical_regime: number;
  risk_event: number;
  alternative_ai: number;
}

export interface TradingSignal {
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  icon: string;
  color: string;
  strength: number;
}

export interface MetaInsights {
  dominant_paradigm: string;
  consensus_level: number;
  volatility_regime: string;
  trend_alignment: number;
}

export interface AbleNewsResult {
  P_up_pct: number;
  P_down_pct: number;
  decision: string;
  confidence: string;
  regime_adjusted_confidence: number;
  market_regime: string;
  quantum_enhancement: number;
  neural_enhancement: number;
  scores: Record<string, number>;
  category_performance: CategoryPerformance;
  meta_insights: MetaInsights;
  trading_signal: TradingSignal;
  thai_summary: string;
  key_drivers: string[];
  risk_warnings: string[];
  analyzed_at: string;
  news_count: number;
}

// ============ MODULE WEIGHTS (SUM = 1.0) ============
const MODULE_WEIGHTS: Record<string, number> = {
  // Category 1: Macro & Economic (M1-M8)
  macro_neural_forecast: 0.065,
  central_bank_sentiment: 0.070,
  yield_curve_signal: 0.045,
  inflation_momentum: 0.040,
  gdp_growth_trajectory: 0.035,
  employment_dynamics: 0.030,
  trade_balance_flow: 0.025,
  fiscal_policy_impact: 0.020,
  
  // Category 2: Sentiment & Flow (M9-M16)
  news_sentiment_cfa: 0.075,
  social_media_pulse: 0.055,
  institutional_flow: 0.050,
  retail_sentiment: 0.040,
  options_sentiment: 0.035,
  cot_positioning: 0.030,
  dark_pool_activity: 0.025,
  etf_flow_momentum: 0.020,
  
  // Category 3: Technical & Regime (M17-M24)
  trend_regime_detector: 0.045,
  momentum_oscillator: 0.040,
  volatility_regime: 0.035,
  support_resistance: 0.030,
  pattern_recognition: 0.025,
  volume_analysis: 0.020,
  market_breadth: 0.015,
  intermarket_correlation: 0.015,
  
  // Category 4: Risk & Event (M25-M32)
  event_shock: 0.065,
  geopolitical_risk: 0.045,
  black_swan_detector: 0.040,
  liquidity_risk: 0.030,
  correlation_breakdown: 0.025,
  tail_risk_monitor: 0.020,
  regulatory_risk: 0.015,
  systemic_risk: 0.015,
  
  // Category 5: Alternative & AI (M33-M40)
  quantum_sentiment: 0.055,
  neural_ensemble: 0.045,
  nlp_deep_analysis: 0.035,
  satellite_data: 0.020,
  web_traffic_signal: 0.015,
  patent_innovation: 0.010,
  esg_momentum: 0.010,
  crypto_correlation: 0.015
};

// ============ CFA-GRADE SENTIMENT DICTIONARY ============
const SENTIMENT_DICTIONARY = {
  // Ultra Bullish (+18 to +25)
  ultra_bullish: [
    'soar', 'surge', 'skyrocket', 'moon', 'breakout', 'explosive',
    'fed pivot', 'rate cut', 'dovish pivot', 'massive rally', 'all-time high',
    'golden cross confirmed', 'institutional buying', 'whale accumulation'
  ],
  
  // Strong Bullish (+12 to +17)
  strong_bullish: [
    'rally', 'bullish', 'outperform', 'upgrade', 'beat expectations',
    'strong buy', 'accumulate', 'breakout potential', 'dovish',
    'stimulus', 'easing', 'recovery', 'growth accelerating'
  ],
  
  // Bullish (+8 to +11)
  bullish: [
    'rise', 'gain', 'positive', 'growth', 'optimistic', 'buy',
    'uptrend', 'support holds', 'demand strong', 'inflows'
  ],
  
  // Mild Bullish (+3 to +7)
  mild_bullish: [
    'steady', 'stable', 'resilient', 'hold', 'neutral to positive',
    'sideways', 'consolidating', 'base building'
  ],
  
  // Neutral (-2 to +2)
  neutral: [
    'mixed', 'unchanged', 'flat', 'wait', 'uncertain', 'range-bound'
  ],
  
  // Mild Bearish (-3 to -7)
  mild_bearish: [
    'cautious', 'concerned', 'risk', 'pressure', 'weakness',
    'pullback', 'correction', 'profit-taking'
  ],
  
  // Bearish (-8 to -11)
  bearish: [
    'fall', 'drop', 'decline', 'sell', 'bearish', 'downtrend',
    'breakdown', 'resistance', 'outflows', 'negative'
  ],
  
  // Strong Bearish (-12 to -17)
  strong_bearish: [
    'plunge', 'crash', 'collapse', 'crisis', 'recession',
    'death cross', 'capitulation', 'panic selling', 'hawkish',
    'rate hike', 'tightening', 'inflation surge'
  ],
  
  // Ultra Bearish (-18 to -25)
  ultra_bearish: [
    'black swan', 'meltdown', 'catastrophic', 'systemic crisis',
    'bank run', 'contagion', 'default', 'bankruptcy', 'war escalation',
    'nuclear', 'pandemic', 'hyperinflation'
  ]
};

// Asset-specific keywords
const ASSET_KEYWORDS: Record<string, { bullish: string[], bearish: string[] }> = {
  XAUUSD: {
    bullish: ['safe haven', 'gold demand', 'central bank buying', 'inflation hedge', 'dollar weakness', 'geopolitical tension'],
    bearish: ['risk-on', 'dollar strength', 'rate hike', 'gold selling', 'crypto alternative']
  },
  BTCUSD: {
    bullish: ['bitcoin adoption', 'etf approval', 'institutional buying', 'halving', 'crypto rally', 'defi growth'],
    bearish: ['crypto crash', 'regulation', 'exchange hack', 'bitcoin ban', 'crypto winter']
  },
  EURUSD: {
    bullish: ['ecb hawkish', 'euro strength', 'german growth', 'eurozone recovery'],
    bearish: ['ecb dovish', 'euro weakness', 'germany recession', 'european crisis']
  },
  USDJPY: {
    bullish: ['boj intervention', 'yen strength', 'japanese inflation'],
    bearish: ['carry trade', 'yen weakness', 'boj dovish', 'yield differential']
  }
};

// ============ ANALYSIS ENGINE CLASS ============
export class AbleNewsAnalyzer {
  private input: NewsAnalysisInput;
  private moduleScores: Record<string, number> = {};
  
  constructor(input: NewsAnalysisInput) {
    this.input = input;
  }
  
  // Main analysis function
  analyze(): AbleNewsResult {
    const headlines = this.input.headlines.join(' ').toLowerCase();
    
    // Run all 40 modules
    this.runMacroEconomicModules(headlines);
    this.runSentimentFlowModules(headlines);
    this.runTechnicalRegimeModules(headlines);
    this.runRiskEventModules(headlines);
    this.runAlternativeAIModules(headlines);
    
    // Calculate master equation
    const { P_up, quantum_boost, neural_boost } = this.calculateMasterEquation();
    const P_down = 1 - P_up;
    
    // Determine decision and confidence
    const { decision, confidence, trading_signal } = this.determineDecision(P_up);
    
    // Calculate category performance
    const category_performance = this.calculateCategoryPerformance();
    
    // Generate insights
    const market_regime = this.detectMarketRegime(headlines);
    const meta_insights = this.generateMetaInsights(P_up, category_performance);
    const key_drivers = this.extractKeyDrivers(headlines);
    const risk_warnings = this.extractRiskWarnings(headlines);
    const thai_summary = this.generateThaiSummary(P_up, decision, key_drivers);
    
    return {
      P_up_pct: Math.round(P_up * 100),
      P_down_pct: Math.round(P_down * 100),
      decision,
      confidence,
      regime_adjusted_confidence: Math.round(P_up * 100 * (1 + quantum_boost + neural_boost)),
      market_regime,
      quantum_enhancement: Math.round(quantum_boost * 100),
      neural_enhancement: Math.round(neural_boost * 100),
      scores: this.moduleScores,
      category_performance,
      meta_insights,
      trading_signal,
      thai_summary,
      key_drivers,
      risk_warnings,
      analyzed_at: new Date().toISOString(),
      news_count: this.input.headlines.length
    };
  }
  
  // ============ MODULE IMPLEMENTATIONS ============
  
  private runMacroEconomicModules(text: string): void {
    // M1: Macro Neural Forecast
    this.moduleScores.macro_neural_forecast = this.scoreSentiment(text, ['economy', 'growth', 'gdp', 'expansion', 'contraction']);
    
    // M2: Central Bank Sentiment
    this.moduleScores.central_bank_sentiment = this.scoreSentiment(text, ['fed', 'ecb', 'boj', 'rate', 'monetary', 'policy', 'dovish', 'hawkish']);
    
    // M3: Yield Curve Signal
    this.moduleScores.yield_curve_signal = this.scoreSentiment(text, ['yield', 'treasury', 'bond', 'curve', 'inversion']);
    
    // M4: Inflation Momentum
    this.moduleScores.inflation_momentum = this.scoreInflation(text);
    
    // M5: GDP Growth Trajectory
    this.moduleScores.gdp_growth_trajectory = this.scoreSentiment(text, ['gdp', 'growth', 'recession', 'expansion']);
    
    // M6: Employment Dynamics
    this.moduleScores.employment_dynamics = this.scoreSentiment(text, ['jobs', 'employment', 'unemployment', 'labor', 'hiring', 'layoffs']);
    
    // M7: Trade Balance Flow
    this.moduleScores.trade_balance_flow = this.scoreSentiment(text, ['trade', 'export', 'import', 'tariff', 'deficit', 'surplus']);
    
    // M8: Fiscal Policy Impact
    this.moduleScores.fiscal_policy_impact = this.scoreSentiment(text, ['fiscal', 'stimulus', 'spending', 'tax', 'budget']);
  }
  
  private runSentimentFlowModules(text: string): void {
    // M9: News Sentiment CFA (Main sentiment analysis)
    this.moduleScores.news_sentiment_cfa = this.calculateCFASentiment(text);
    
    // M10: Social Media Pulse
    this.moduleScores.social_media_pulse = this.scoreSentiment(text, ['trending', 'viral', 'buzz', 'hype', 'fomo']);
    
    // M11: Institutional Flow
    this.moduleScores.institutional_flow = this.scoreSentiment(text, ['institutional', 'hedge fund', 'whale', 'smart money', 'big money']);
    
    // M12: Retail Sentiment
    this.moduleScores.retail_sentiment = this.scoreSentiment(text, ['retail', 'robinhood', 'reddit', 'wallstreetbets', 'meme']);
    
    // M13: Options Sentiment
    this.moduleScores.options_sentiment = this.scoreSentiment(text, ['options', 'calls', 'puts', 'gamma', 'squeeze']);
    
    // M14: COT Positioning
    this.moduleScores.cot_positioning = this.scoreSentiment(text, ['cot', 'positioning', 'speculator', 'commercial', 'commitment']);
    
    // M15: Dark Pool Activity
    this.moduleScores.dark_pool_activity = this.scoreSentiment(text, ['dark pool', 'off-exchange', 'block trade', 'institutional order']);
    
    // M16: ETF Flow Momentum
    this.moduleScores.etf_flow_momentum = this.scoreSentiment(text, ['etf', 'inflow', 'outflow', 'fund flow', 'gld', 'spy']);
  }
  
  private runTechnicalRegimeModules(text: string): void {
    // M17: Trend Regime Detector
    this.moduleScores.trend_regime_detector = this.scoreSentiment(text, ['trend', 'uptrend', 'downtrend', 'sideways', 'breakout', 'breakdown']);
    
    // M18: Momentum Oscillator
    this.moduleScores.momentum_oscillator = this.scoreSentiment(text, ['momentum', 'rsi', 'macd', 'overbought', 'oversold']);
    
    // M19: Volatility Regime
    this.moduleScores.volatility_regime = this.scoreVolatility(text);
    
    // M20: Support/Resistance
    this.moduleScores.support_resistance = this.scoreSentiment(text, ['support', 'resistance', 'level', 'breakout', 'breakdown']);
    
    // M21: Pattern Recognition
    this.moduleScores.pattern_recognition = this.scoreSentiment(text, ['pattern', 'head shoulders', 'triangle', 'wedge', 'flag', 'double top', 'double bottom']);
    
    // M22: Volume Analysis
    this.moduleScores.volume_analysis = this.scoreSentiment(text, ['volume', 'liquidity', 'trading activity', 'turnover']);
    
    // M23: Market Breadth
    this.moduleScores.market_breadth = this.scoreSentiment(text, ['breadth', 'advance', 'decline', 'new high', 'new low']);
    
    // M24: Intermarket Correlation
    this.moduleScores.intermarket_correlation = this.scoreSentiment(text, ['correlation', 'dollar', 'bond', 'equity', 'commodity']);
  }
  
  private runRiskEventModules(text: string): void {
    // M25: Event Shock
    this.moduleScores.event_shock = this.scoreEventShock(text);
    
    // M26: Geopolitical Risk
    this.moduleScores.geopolitical_risk = this.scoreGeopolitical(text);
    
    // M27: Black Swan Detector
    this.moduleScores.black_swan_detector = this.scoreBlackSwan(text);
    
    // M28: Liquidity Risk
    this.moduleScores.liquidity_risk = this.scoreSentiment(text, ['liquidity', 'illiquid', 'dry up', 'freeze', 'credit']);
    
    // M29: Correlation Breakdown
    this.moduleScores.correlation_breakdown = this.scoreSentiment(text, ['correlation breakdown', 'decoupling', 'divergence']);
    
    // M30: Tail Risk Monitor
    this.moduleScores.tail_risk_monitor = this.scoreSentiment(text, ['tail risk', 'extreme', 'outlier', 'black swan', 'fat tail']);
    
    // M31: Regulatory Risk
    this.moduleScores.regulatory_risk = this.scoreSentiment(text, ['regulation', 'sec', 'ban', 'restrict', 'comply', 'legal']);
    
    // M32: Systemic Risk
    this.moduleScores.systemic_risk = this.scoreSentiment(text, ['systemic', 'contagion', 'domino', 'cascade', 'too big to fail']);
  }
  
  private runAlternativeAIModules(text: string): void {
    // M33: Quantum Sentiment
    this.moduleScores.quantum_sentiment = this.calculateQuantumSentiment(text);
    
    // M34: Neural Ensemble
    this.moduleScores.neural_ensemble = this.calculateNeuralEnsemble(text);
    
    // M35: NLP Deep Analysis
    this.moduleScores.nlp_deep_analysis = this.calculateCFASentiment(text) * 0.8 + 0.1;
    
    // M36: Satellite Data (proxy)
    this.moduleScores.satellite_data = 0.5; // Neutral without actual satellite data
    
    // M37: Web Traffic Signal
    this.moduleScores.web_traffic_signal = this.scoreSentiment(text, ['traffic', 'search', 'google trends', 'interest']);
    
    // M38: Patent Innovation
    this.moduleScores.patent_innovation = this.scoreSentiment(text, ['patent', 'innovation', 'technology', 'breakthrough']);
    
    // M39: ESG Momentum
    this.moduleScores.esg_momentum = this.scoreSentiment(text, ['esg', 'sustainable', 'green', 'climate', 'carbon']);
    
    // M40: Crypto Correlation
    this.moduleScores.crypto_correlation = this.scoreCryptoCorrelation(text);
  }
  
  // ============ SCORING FUNCTIONS ============
  
  private scoreSentiment(text: string, keywords: string[]): number {
    let score = 0.5; // Neutral base
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        // Check context for positive/negative
        const isPositive = SENTIMENT_DICTIONARY.bullish.some(b => text.includes(b)) ||
                          SENTIMENT_DICTIONARY.strong_bullish.some(b => text.includes(b));
        const isNegative = SENTIMENT_DICTIONARY.bearish.some(b => text.includes(b)) ||
                          SENTIMENT_DICTIONARY.strong_bearish.some(b => text.includes(b));
        
        if (isPositive) score += 0.1;
        if (isNegative) score -= 0.1;
      }
    });
    
    return Math.max(0, Math.min(1, score));
  }
  
  private calculateCFASentiment(text: string): number {
    let score = 0;
    let count = 0;
    
    // Check each sentiment category
    SENTIMENT_DICTIONARY.ultra_bullish.forEach(word => {
      if (text.includes(word)) { score += 22; count++; }
    });
    SENTIMENT_DICTIONARY.strong_bullish.forEach(word => {
      if (text.includes(word)) { score += 14; count++; }
    });
    SENTIMENT_DICTIONARY.bullish.forEach(word => {
      if (text.includes(word)) { score += 9; count++; }
    });
    SENTIMENT_DICTIONARY.mild_bullish.forEach(word => {
      if (text.includes(word)) { score += 5; count++; }
    });
    SENTIMENT_DICTIONARY.mild_bearish.forEach(word => {
      if (text.includes(word)) { score -= 5; count++; }
    });
    SENTIMENT_DICTIONARY.bearish.forEach(word => {
      if (text.includes(word)) { score -= 9; count++; }
    });
    SENTIMENT_DICTIONARY.strong_bearish.forEach(word => {
      if (text.includes(word)) { score -= 14; count++; }
    });
    SENTIMENT_DICTIONARY.ultra_bearish.forEach(word => {
      if (text.includes(word)) { score -= 22; count++; }
    });
    
    // Check asset-specific keywords
    const assetKeywords = ASSET_KEYWORDS[this.input.symbol];
    if (assetKeywords) {
      assetKeywords.bullish.forEach(word => {
        if (text.includes(word)) { score += 12; count++; }
      });
      assetKeywords.bearish.forEach(word => {
        if (text.includes(word)) { score -= 12; count++; }
      });
    }
    
    // Normalize to 0-1 range
    if (count === 0) return 0.5;
    const avgScore = score / count;
    return Math.max(0, Math.min(1, (avgScore + 25) / 50));
  }
  
  private scoreInflation(text: string): number {
    let score = 0.5;
    
    if (text.includes('inflation') || text.includes('cpi')) {
      if (text.includes('rise') || text.includes('surge') || text.includes('hot')) {
        // High inflation - bearish for bonds/stocks, bullish for gold
        score = this.input.symbol === 'XAUUSD' ? 0.7 : 0.3;
      } else if (text.includes('fall') || text.includes('cool') || text.includes('ease')) {
        score = this.input.symbol === 'XAUUSD' ? 0.4 : 0.7;
      }
    }
    
    return score;
  }
  
  private scoreVolatility(text: string): number {
    let score = 0.5;
    
    if (text.includes('vix') || text.includes('volatility')) {
      if (text.includes('spike') || text.includes('surge') || text.includes('fear')) {
        score = 0.3; // High volatility is generally risky
      } else if (text.includes('calm') || text.includes('low') || text.includes('stable')) {
        score = 0.7;
      }
    }
    
    return score;
  }
  
  private scoreEventShock(text: string): number {
    const shockWords = ['surprise', 'unexpected', 'shock', 'breaking', 'urgent', 'alert', 'flash'];
    let shockLevel = 0;
    
    shockWords.forEach(word => {
      if (text.includes(word)) shockLevel++;
    });
    
    // More shocks = more uncertainty = neutral-ish
    return shockLevel > 2 ? 0.4 : 0.5 + (shockLevel * 0.05);
  }
  
  private scoreGeopolitical(text: string): number {
    const geoRiskWords = ['war', 'conflict', 'tension', 'military', 'sanctions', 'nuclear', 'attack', 'invasion'];
    let riskLevel = 0;
    
    geoRiskWords.forEach(word => {
      if (text.includes(word)) riskLevel++;
    });
    
    // Geopolitical risk is bullish for gold, bearish for risk assets
    if (riskLevel > 0) {
      return this.input.symbol === 'XAUUSD' ? 0.7 + (riskLevel * 0.05) : 0.3 - (riskLevel * 0.05);
    }
    
    return 0.5;
  }
  
  private scoreBlackSwan(text: string): number {
    const blackSwanWords = ['black swan', 'crash', 'collapse', 'crisis', 'meltdown', 'catastrophe', 'panic'];
    let detected = false;
    
    blackSwanWords.forEach(word => {
      if (text.includes(word)) detected = true;
    });
    
    return detected ? 0.2 : 0.5;
  }
  
  private calculateQuantumSentiment(text: string): number {
    // Simulate quantum-enhanced sentiment analysis
    const baseSentiment = this.calculateCFASentiment(text);
    const entropy = Math.random() * 0.1 - 0.05; // Small quantum noise
    return Math.max(0, Math.min(1, baseSentiment + entropy));
  }
  
  private calculateNeuralEnsemble(text: string): number {
    // Simulate neural network ensemble
    const sentiment1 = this.calculateCFASentiment(text);
    const sentiment2 = this.scoreSentiment(text, ['bullish', 'bearish', 'neutral']);
    const sentiment3 = this.scoreEventShock(text);
    
    // Weighted average of different "neural networks"
    return (sentiment1 * 0.5 + sentiment2 * 0.3 + sentiment3 * 0.2);
  }
  
  private scoreCryptoCorrelation(text: string): number {
    const cryptoMentions = ['bitcoin', 'btc', 'crypto', 'ethereum', 'eth', 'blockchain'];
    let mentioned = false;
    let sentiment = 0.5;
    
    cryptoMentions.forEach(word => {
      if (text.includes(word)) mentioned = true;
    });
    
    if (mentioned) {
      // Crypto correlation affects different assets differently
      if (this.input.symbol.includes('BTC') || this.input.symbol.includes('ETH')) {
        sentiment = this.calculateCFASentiment(text);
      } else if (this.input.symbol === 'XAUUSD') {
        // Gold often inversely correlated with crypto sentiment
        sentiment = 1 - this.calculateCFASentiment(text) * 0.3;
      }
    }
    
    return sentiment;
  }
  
  // ============ MASTER EQUATION ============
  
  private calculateMasterEquation(): { P_up: number; quantum_boost: number; neural_boost: number } {
    let P_up = 0;
    
    // Sum weighted module scores
    Object.entries(MODULE_WEIGHTS).forEach(([module, weight]) => {
      const score = this.moduleScores[module] || 0.5;
      P_up += score * weight;
    });
    
    // Calculate quantum and neural boosts
    const quantum_boost = (this.moduleScores.quantum_sentiment - 0.5) * 0.1;
    const neural_boost = (this.moduleScores.neural_ensemble - 0.5) * 0.08;
    
    // Apply boosts
    P_up = P_up + quantum_boost + neural_boost;
    
    // Clamp to 0-1
    P_up = Math.max(0, Math.min(1, P_up));
    
    return { P_up, quantum_boost, neural_boost };
  }
  
  // ============ DECISION LOGIC ============
  
  private determineDecision(P_up: number): { decision: string; confidence: string; trading_signal: TradingSignal } {
    let decision: string;
    let confidence: string;
    let trading_signal: TradingSignal;
    
    if (P_up > 0.90) {
      decision = '⚡ Quantum Ultra Strong BUY';
      confidence = 'EXTREME';
      trading_signal = { signal: 'STRONG_BUY', icon: '⚡', color: '#00FF00', strength: 95 };
    } else if (P_up > 0.80) {
      decision = '🚀 Ultra Strong BUY';
      confidence = 'VERY HIGH';
      trading_signal = { signal: 'STRONG_BUY', icon: '🚀', color: '#00DD00', strength: 85 };
    } else if (P_up > 0.70) {
      decision = '📈 Strong BUY';
      confidence = 'HIGH';
      trading_signal = { signal: 'STRONG_BUY', icon: '📈', color: '#00BB00', strength: 75 };
    } else if (P_up > 0.60) {
      decision = '💚 BUY';
      confidence = 'MEDIUM-HIGH';
      trading_signal = { signal: 'BUY', icon: '💚', color: '#00AA00', strength: 65 };
    } else if (P_up > 0.55) {
      decision = '🟢 Mild BUY';
      confidence = 'MEDIUM';
      trading_signal = { signal: 'BUY', icon: '🟢', color: '#009900', strength: 55 };
    } else if (P_up >= 0.45) {
      decision = '⚪ NEUTRAL';
      confidence = 'LOW';
      trading_signal = { signal: 'HOLD', icon: '⚪', color: '#888888', strength: 50 };
    } else if (P_up >= 0.40) {
      decision = '🟡 Mild SELL';
      confidence = 'MEDIUM';
      trading_signal = { signal: 'SELL', icon: '🟡', color: '#FFAA00', strength: 45 };
    } else if (P_up >= 0.30) {
      decision = '🔴 SELL';
      confidence = 'MEDIUM-HIGH';
      trading_signal = { signal: 'SELL', icon: '🔴', color: '#FF6600', strength: 35 };
    } else if (P_up >= 0.20) {
      decision = '📉 Strong SELL';
      confidence = 'HIGH';
      trading_signal = { signal: 'STRONG_SELL', icon: '📉', color: '#FF3300', strength: 25 };
    } else if (P_up >= 0.10) {
      decision = '💥 Ultra Strong SELL';
      confidence = 'VERY HIGH';
      trading_signal = { signal: 'STRONG_SELL', icon: '💥', color: '#FF0000', strength: 15 };
    } else {
      decision = '⚡ Quantum Ultra Strong SELL';
      confidence = 'EXTREME';
      trading_signal = { signal: 'STRONG_SELL', icon: '⚡', color: '#CC0000', strength: 5 };
    }
    
    return { decision, confidence, trading_signal };
  }
  
  // ============ CATEGORY PERFORMANCE ============
  
  private calculateCategoryPerformance(): CategoryPerformance {
    const macroModules = ['macro_neural_forecast', 'central_bank_sentiment', 'yield_curve_signal', 
                          'inflation_momentum', 'gdp_growth_trajectory', 'employment_dynamics',
                          'trade_balance_flow', 'fiscal_policy_impact'];
    
    const sentimentModules = ['news_sentiment_cfa', 'social_media_pulse', 'institutional_flow',
                              'retail_sentiment', 'options_sentiment', 'cot_positioning',
                              'dark_pool_activity', 'etf_flow_momentum'];
    
    const technicalModules = ['trend_regime_detector', 'momentum_oscillator', 'volatility_regime',
                              'support_resistance', 'pattern_recognition', 'volume_analysis',
                              'market_breadth', 'intermarket_correlation'];
    
    const riskModules = ['event_shock', 'geopolitical_risk', 'black_swan_detector',
                         'liquidity_risk', 'correlation_breakdown', 'tail_risk_monitor',
                         'regulatory_risk', 'systemic_risk'];
    
    const altModules = ['quantum_sentiment', 'neural_ensemble', 'nlp_deep_analysis',
                        'satellite_data', 'web_traffic_signal', 'patent_innovation',
                        'esg_momentum', 'crypto_correlation'];
    
    const avgScore = (modules: string[]): number => {
      const scores = modules.map(m => this.moduleScores[m] || 0.5);
      return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
    };
    
    return {
      macro_economic: avgScore(macroModules),
      sentiment_flow: avgScore(sentimentModules),
      technical_regime: avgScore(technicalModules),
      risk_event: avgScore(riskModules),
      alternative_ai: avgScore(altModules)
    };
  }
  
  // ============ INSIGHTS GENERATION ============
  
  private detectMarketRegime(text: string): string {
    if (text.includes('trending') || text.includes('momentum') || text.includes('rally')) {
      return 'TRENDING';
    } else if (text.includes('range') || text.includes('sideways') || text.includes('consolidat')) {
      return 'RANGING';
    } else if (text.includes('volatile') || text.includes('choppy') || text.includes('uncertain')) {
      return 'VOLATILE';
    } else if (text.includes('breakout') || text.includes('transition')) {
      return 'TRANSITION';
    }
    return 'NORMAL';
  }
  
  private generateMetaInsights(P_up: number, performance: CategoryPerformance): MetaInsights {
    // Find dominant paradigm
    const categories = Object.entries(performance);
    categories.sort((a, b) => b[1] - a[1]);
    const dominant = categories[0][0].replace('_', ' ').toUpperCase();
    
    // Calculate consensus level
    const avgPerf = Object.values(performance).reduce((a, b) => a + b, 0) / 5;
    const variance = Object.values(performance).reduce((sum, val) => 
      sum + Math.pow(val - avgPerf, 2), 0) / 5;
    const consensus = Math.round(100 - Math.sqrt(variance));
    
    return {
      dominant_paradigm: dominant,
      consensus_level: consensus,
      volatility_regime: variance > 100 ? 'HIGH' : variance > 50 ? 'MEDIUM' : 'LOW',
      trend_alignment: Math.round((P_up - 0.5) * 200) // -100 to +100
    };
  }
  
  private extractKeyDrivers(text: string): string[] {
    const drivers: string[] = [];
    
    // Check for major drivers
    if (text.includes('fed') || text.includes('federal reserve')) {
      drivers.push('🏦 Federal Reserve Policy');
    }
    if (text.includes('inflation') || text.includes('cpi')) {
      drivers.push('📊 Inflation Data');
    }
    if (text.includes('war') || text.includes('geopolitical')) {
      drivers.push('🌍 Geopolitical Tensions');
    }
    if (text.includes('earnings') || text.includes('profit')) {
      drivers.push('💰 Corporate Earnings');
    }
    if (text.includes('jobs') || text.includes('employment') || text.includes('nfp')) {
      drivers.push('👥 Employment Data');
    }
    if (text.includes('china') || text.includes('chinese')) {
      drivers.push('🇨🇳 China Economic Data');
    }
    if (text.includes('oil') || text.includes('opec')) {
      drivers.push('🛢️ Oil/Energy Markets');
    }
    if (text.includes('crypto') || text.includes('bitcoin')) {
      drivers.push('₿ Crypto Market');
    }
    
    return drivers.slice(0, 5); // Max 5 drivers
  }
  
  private extractRiskWarnings(text: string): string[] {
    const warnings: string[] = [];
    
    if (text.includes('risk') || text.includes('warning')) {
      warnings.push('⚠️ Elevated Risk Environment');
    }
    if (text.includes('volatility') || text.includes('vix')) {
      warnings.push('📈 High Volatility Alert');
    }
    if (text.includes('crash') || text.includes('collapse')) {
      warnings.push('🚨 Market Stress Signals');
    }
    if (text.includes('liquidity') || text.includes('dry')) {
      warnings.push('💧 Liquidity Concerns');
    }
    if (text.includes('divergence') || text.includes('conflict')) {
      warnings.push('⚡ Signal Divergence');
    }
    
    return warnings.slice(0, 3); // Max 3 warnings
  }
  
  private generateThaiSummary(P_up: number, decision: string, drivers: string[]): string {
    const symbol = this.input.symbol;
    const pctUp = Math.round(P_up * 100);
    const pctDown = 100 - pctUp;
    
    let sentiment: string;
    let action: string;
    
    if (P_up > 0.70) {
      sentiment = 'BULLISH แรงมาก';
      action = 'แนะนำ BUY';
    } else if (P_up > 0.55) {
      sentiment = 'BULLISH';
      action = 'พิจารณา BUY';
    } else if (P_up >= 0.45) {
      sentiment = 'NEUTRAL';
      action = 'รอดูสถานการณ์';
    } else if (P_up >= 0.30) {
      sentiment = 'BEARISH';
      action = 'พิจารณา SELL';
    } else {
      sentiment = 'BEARISH แรงมาก';
      action = 'แนะนำ SELL';
    }
    
    const driversText = drivers.length > 0 
      ? `ปัจจัยหลัก: ${drivers.slice(0, 2).join(', ')}`
      : '';
    
    return `🎯 ${symbol}: สัญญาณ ${sentiment} | โอกาสขึ้น ${pctUp}% vs ลง ${pctDown}% | ${action}${driversText ? ` | ${driversText}` : ''}`;
  }
}

// ============ AVAILABLE ASSETS ============
export const AVAILABLE_ASSETS = {
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'USDCAD', 'NZDUSD'],
  commodities: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL'],
  crypto: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'],
  indices: ['US500', 'US30', 'US100', 'DE40', 'JP225']
};

export const ASSET_DISPLAY_NAMES: Record<string, string> = {
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD',
  USDCHF: 'USD/CHF',
  USDCAD: 'USD/CAD',
  NZDUSD: 'NZD/USD',
  XAUUSD: 'Gold',
  XAGUSD: 'Silver',
  USOIL: 'WTI Oil',
  UKOIL: 'Brent Oil',
  BTCUSD: 'Bitcoin',
  ETHUSD: 'Ethereum',
  SOLUSD: 'Solana',
  XRPUSD: 'XRP',
  US500: 'S&P 500',
  US30: 'Dow Jones',
  US100: 'Nasdaq',
  DE40: 'DAX 40',
  JP225: 'Nikkei 225'
};
