import { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, BarChart3, Table, Brain, TrendingUp, TrendingDown, Minus, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { fetchModuleData, calculateModuleScores, MODULE_DATA_SOURCES, ALL_MODULE_IDS, ModuleRealTimeData } from '@/services/ModuleDataService';

// ============================================
// TYPES
// ============================================

interface ModuleScore {
  id: string;
  name: string;
  category: string;
  weight: number;
  score: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  dataSource: string;
  lastUpdated: string;
  isAvailable: boolean;
}

interface ModuleCategory {
  name: string;
  color: string;
  bgColor: string;
  totalWeight: number;
  avgScore: number;
}

interface AbleAnalysisResult {
  P_up_pct: number;
  P_down_pct: number;
  decision: string;
  confidence: string;
  scores: Record<string, number>;
  category_performance: Record<string, number>;
  meta_insights: {
    dominant_paradigm: string;
    consensus_level: number;
    volatility_regime: string;
    trend_alignment: number;
  };
  thai_summary: string;
  key_drivers: string[];
  risk_warnings: string[];
  analyzed_at: string;
}

// ============================================
// 40 MODULES DEFINITION
// ============================================

const MODULES_CONFIG: Omit<ModuleScore, 'score' | 'signal' | 'lastUpdated'>[] = [
  // CATEGORY 1: MACRO & ECONOMIC (33%)
  { id: 'macro_neural_forecast', name: 'Macro Neural Forecast', category: 'Macro & Economic', weight: 6.5, description: 'Neural network prediction for macroeconomic trends based on GDP, inflation, and central bank policies', dataSource: 'Economic Indicators API', isAvailable: true },
  { id: 'central_bank_sentiment', name: 'Central Bank Sentiment', category: 'Macro & Economic', weight: 7.0, description: 'Analysis of Fed, ECB, BOJ statements and policy direction using NLP', dataSource: 'Central Bank Speeches', isAvailable: true },
  { id: 'yield_curve_signal', name: 'Yield Curve Signal', category: 'Macro & Economic', weight: 4.5, description: 'Treasury yield curve analysis for recession/expansion signals', dataSource: 'Treasury Rates API', isAvailable: true },
  { id: 'inflation_momentum', name: 'Inflation Momentum', category: 'Macro & Economic', weight: 4.0, description: 'CPI, PPI, PCE momentum and trend analysis', dataSource: 'BLS Economic Data', isAvailable: true },
  { id: 'gdp_growth_trajectory', name: 'GDP Growth Trajectory', category: 'Macro & Economic', weight: 3.5, description: 'Real GDP growth rate and nowcasting', dataSource: 'BEA/Fed Data', isAvailable: true },
  { id: 'employment_dynamics', name: 'Employment Dynamics', category: 'Macro & Economic', weight: 3.0, description: 'NFP, unemployment rate, job openings analysis', dataSource: 'BLS Employment', isAvailable: true },
  { id: 'trade_balance_flow', name: 'Trade Balance Flow', category: 'Macro & Economic', weight: 2.5, description: 'International trade flows and current account', dataSource: 'Census Trade Data', isAvailable: true },
  { id: 'fiscal_policy_impact', name: 'Fiscal Policy Impact', category: 'Macro & Economic', weight: 2.0, description: 'Government spending and tax policy analysis', dataSource: 'Treasury/CBO', isAvailable: true },

  // CATEGORY 2: SENTIMENT & FLOW (29%)
  { id: 'news_sentiment_cfa', name: 'News Sentiment (CFA)', category: 'Sentiment & Flow', weight: 7.5, description: 'Comprehensive news sentiment analysis using CFA methodology', dataSource: 'News Aggregator', isAvailable: true },
  { id: 'social_media_pulse', name: 'Social Media Pulse', category: 'Sentiment & Flow', weight: 5.5, description: 'Twitter/Reddit sentiment and volume analysis', dataSource: 'Social APIs', isAvailable: true },
  { id: 'institutional_flow', name: 'Institutional Flow', category: 'Sentiment & Flow', weight: 5.0, description: '13F filings, fund flows, and institutional positioning', dataSource: 'SEC Filings', isAvailable: true },
  { id: 'retail_sentiment', name: 'Retail Sentiment', category: 'Sentiment & Flow', weight: 4.0, description: 'Retail trader positioning and sentiment surveys', dataSource: 'AAII/Retail Brokers', isAvailable: true },
  { id: 'options_sentiment', name: 'Options Sentiment', category: 'Sentiment & Flow', weight: 3.5, description: 'Put/Call ratio, options flow, and implied volatility', dataSource: 'Options Data', isAvailable: true },
  { id: 'cot_positioning', name: 'COT Positioning', category: 'Sentiment & Flow', weight: 3.0, description: 'CFTC Commitment of Traders positioning data', dataSource: 'CFTC COT', isAvailable: true },
  { id: 'dark_pool_activity', name: 'Dark Pool Activity', category: 'Sentiment & Flow', weight: 2.5, description: 'Dark pool and off-exchange trading volume', dataSource: 'FINRA ATS', isAvailable: true },
  { id: 'etf_flow_momentum', name: 'ETF Flow Momentum', category: 'Sentiment & Flow', weight: 2.0, description: 'ETF creation/redemption and flow analysis', dataSource: 'ETF Providers', isAvailable: true },

  // CATEGORY 3: TECHNICAL & REGIME (20%)
  { id: 'trend_regime_detector', name: 'Trend Regime Detector', category: 'Technical & Regime', weight: 4.5, description: 'Market regime classification (trending/ranging/volatile)', dataSource: 'Price Data', isAvailable: true },
  { id: 'momentum_oscillator', name: 'Momentum Oscillator', category: 'Technical & Regime', weight: 4.0, description: 'RSI, MACD, Stochastic momentum signals', dataSource: 'Price Data', isAvailable: true },
  { id: 'volatility_regime', name: 'Volatility Regime', category: 'Technical & Regime', weight: 3.5, description: 'VIX, ATR, and volatility regime detection', dataSource: 'Market Data', isAvailable: true },
  { id: 'support_resistance', name: 'Support & Resistance', category: 'Technical & Regime', weight: 3.0, description: 'Key price levels and breakout detection', dataSource: 'Price Data', isAvailable: true },
  { id: 'pattern_recognition', name: 'Pattern Recognition', category: 'Technical & Regime', weight: 2.5, description: 'Chart pattern detection (H&S, triangles, etc.)', dataSource: 'Price Data', isAvailable: true },
  { id: 'volume_analysis', name: 'Volume Analysis', category: 'Technical & Regime', weight: 2.0, description: 'Volume profile and accumulation/distribution', dataSource: 'Market Data', isAvailable: true },
  { id: 'market_breadth', name: 'Market Breadth', category: 'Technical & Regime', weight: 1.5, description: 'Advance/decline, new highs/lows analysis', dataSource: 'Market Data', isAvailable: true },
  { id: 'intermarket_correlation', name: 'Intermarket Correlation', category: 'Technical & Regime', weight: 1.5, description: 'Cross-asset correlation and divergence', dataSource: 'Multiple Sources', isAvailable: true },

  // CATEGORY 4: RISK & EVENT (23.5%)
  { id: 'event_shock', name: 'Event Shock Detector', category: 'Risk & Event', weight: 6.5, description: 'Breaking news and event impact assessment', dataSource: 'News/Events API', isAvailable: true },
  { id: 'geopolitical_risk', name: 'Geopolitical Risk', category: 'Risk & Event', weight: 4.5, description: 'Global conflict and political risk analysis', dataSource: 'News/GPR Index', isAvailable: true },
  { id: 'black_swan_detector', name: 'Black Swan Detector', category: 'Risk & Event', weight: 4.0, description: 'Tail risk and extreme event probability', dataSource: 'Multiple Sources', isAvailable: true },
  { id: 'liquidity_risk', name: 'Liquidity Risk', category: 'Risk & Event', weight: 3.0, description: 'Market liquidity and spread analysis', dataSource: 'Market Microstructure', isAvailable: true },
  { id: 'correlation_breakdown', name: 'Correlation Breakdown', category: 'Risk & Event', weight: 2.5, description: 'Detection of correlation regime changes', dataSource: 'Price Data', isAvailable: true },
  { id: 'tail_risk_monitor', name: 'Tail Risk Monitor', category: 'Risk & Event', weight: 2.0, description: 'VaR, CVaR, and tail risk metrics', dataSource: 'Risk Models', isAvailable: true },
  { id: 'regulatory_risk', name: 'Regulatory Risk', category: 'Risk & Event', weight: 1.5, description: 'Policy and regulatory change risk', dataSource: 'News/Gov Sources', isAvailable: true },
  { id: 'systemic_risk', name: 'Systemic Risk', category: 'Risk & Event', weight: 1.5, description: 'Financial system stress indicators', dataSource: 'Fed FRED', isAvailable: true },

  // CATEGORY 5: ALTERNATIVE & AI (14.5%)
  { id: 'quantum_sentiment', name: 'Quantum Sentiment', category: 'Alternative & AI', weight: 5.5, description: 'Advanced quantum-inspired sentiment patterns', dataSource: 'Proprietary AI', isAvailable: true },
  { id: 'neural_ensemble', name: 'Neural Ensemble', category: 'Alternative & AI', weight: 4.5, description: 'Ensemble of deep learning models', dataSource: 'AI Models', isAvailable: true },
  { id: 'nlp_deep_analysis', name: 'NLP Deep Analysis', category: 'Alternative & AI', weight: 3.5, description: 'Transformer-based text analysis', dataSource: 'NLP Engine', isAvailable: true },
  { id: 'satellite_data', name: 'Satellite Data', category: 'Alternative & AI', weight: 2.0, description: 'Satellite imagery for economic activity', dataSource: 'Satellite Providers', isAvailable: true },
  { id: 'web_traffic_signal', name: 'Web Traffic Signal', category: 'Alternative & AI', weight: 2.0, description: 'Web search & traffic patterns', dataSource: 'Web Analytics', isAvailable: true },
  { id: 'patent_innovation', name: 'Patent Innovation', category: 'Alternative & AI', weight: 1.5, description: 'Innovation and patent analysis', dataSource: 'Patent DB', isAvailable: true },
  { id: 'esg_momentum', name: 'ESG Momentum', category: 'Alternative & AI', weight: 1.5, description: 'ESG scoring momentum', dataSource: 'ESG Providers', isAvailable: true },
  { id: 'crypto_correlation', name: 'Crypto Correlation', category: 'Alternative & AI', weight: 1.5, description: 'Crypto market correlation analysis', dataSource: 'Binance API', isAvailable: true },
];

const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  'Macro & Economic': { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'Sentiment & Flow': { color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'Technical & Regime': { color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  'Risk & Event': { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'Alternative & AI': { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
};

const CHART_COLORS = ['#3b82f6', '#a855f7', '#06b6d4', '#ef4444', '#10b981'];

// MODULE_WEIGHTS for weighted scoring
const MODULE_WEIGHTS: Record<string, number> = {
  macro_neural_forecast: 0.065, central_bank_sentiment: 0.070, yield_curve_signal: 0.045,
  inflation_momentum: 0.040, gdp_growth_trajectory: 0.035, employment_dynamics: 0.030,
  trade_balance_flow: 0.025, fiscal_policy_impact: 0.020,
  news_sentiment_cfa: 0.075, social_media_pulse: 0.055, institutional_flow: 0.050,
  retail_sentiment: 0.040, options_sentiment: 0.035, cot_positioning: 0.030,
  dark_pool_activity: 0.025, etf_flow_momentum: 0.020,
  trend_regime_detector: 0.045, momentum_oscillator: 0.040, volatility_regime: 0.035,
  support_resistance: 0.030, pattern_recognition: 0.025, volume_analysis: 0.020,
  market_breadth: 0.015, intermarket_correlation: 0.015,
  event_shock: 0.065, geopolitical_risk: 0.045, black_swan_detector: 0.040,
  liquidity_risk: 0.030, correlation_breakdown: 0.025, tail_risk_monitor: 0.020,
  regulatory_risk: 0.015, systemic_risk: 0.015,
  quantum_sentiment: 0.025, neural_ensemble: 0.045, nlp_deep_analysis: 0.035,
  satellite_data: 0.020, web_traffic_signal: 0.020, patent_innovation: 0.015,
  esg_momentum: 0.015, crypto_correlation: 0.015,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getNewsTextForAnalysis(): Promise<string> {
  try {
    const { data } = await supabase
      .from('news_history')
      .select('title, description, sentiment')
      .order('timestamp', { ascending: false })
      .limit(100);
    if (data && data.length > 0) {
      return data.map(n => `${n.title} ${n.description || ''}`).join(' ');
    }
    return '';
  } catch {
    return '';
  }
}

function calculateCategoryPerformance(scores: Record<string, number>): Record<string, number> {
  const categories: Record<string, { keys: string[] }> = {
    macro_economic: { keys: ['macro_neural_forecast', 'central_bank_sentiment', 'yield_curve_signal', 'inflation_momentum', 'gdp_growth_trajectory', 'employment_dynamics', 'trade_balance_flow', 'fiscal_policy_impact'] },
    sentiment_flow: { keys: ['news_sentiment_cfa', 'social_media_pulse', 'institutional_flow', 'retail_sentiment', 'options_sentiment', 'cot_positioning', 'dark_pool_activity', 'etf_flow_momentum'] },
    technical_regime: { keys: ['trend_regime_detector', 'momentum_oscillator', 'volatility_regime', 'support_resistance', 'pattern_recognition', 'volume_analysis', 'market_breadth', 'intermarket_correlation'] },
    risk_event: { keys: ['event_shock', 'geopolitical_risk', 'black_swan_detector', 'liquidity_risk', 'correlation_breakdown', 'tail_risk_monitor', 'regulatory_risk', 'systemic_risk'] },
    alternative_ai: { keys: ['quantum_sentiment', 'neural_ensemble', 'nlp_deep_analysis', 'satellite_data', 'web_traffic_signal', 'patent_innovation', 'esg_momentum', 'crypto_correlation'] },
  };
  const result: Record<string, number> = {};
  Object.entries(categories).forEach(([catKey, cat]) => {
    const catScores = cat.keys.map(k => scores[k]).filter(s => s !== undefined);
    result[catKey] = catScores.length > 0 ? Math.round((catScores.reduce((a, b) => a + b, 0) / catScores.length) * 100) : 50;
  });
  return result;
}

function generateThaiSummary(symbol: string, pUp: number, scores: Record<string, number>, data: ModuleRealTimeData): string {
  const direction = pUp > 60 ? 'ขาขึ้น' : pUp < 40 ? 'ขาลง' : 'ไซด์เวย์';
  const vixText = data.vixLevel ? (data.vixLevel > 25 ? 'ความผันผวนสูง' : data.vixLevel < 15 ? 'ความผันผวนต่ำ' : 'ความผันผวนปกติ') : '';
  const topBullish = Object.entries(scores).filter(([_, v]) => v > 0.65).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k.replace(/_/g, ' '));
  const topBearish = Object.entries(scores).filter(([_, v]) => v < 0.35).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => k.replace(/_/g, ' '));
  let summary = `${symbol}: แนวโน้ม${direction} P(Up)=${pUp.toFixed(1)}%`;
  if (vixText) summary += ` | ${vixText}`;
  if (topBullish.length > 0) summary += ` | ปัจจัยบวก: ${topBullish.join(', ')}`;
  if (topBearish.length > 0) summary += ` | ปัจจัยลบ: ${topBearish.join(', ')}`;
  return summary;
}

function getTopDrivers(scores: Record<string, number>, count: number): string[] {
  return Object.entries(scores)
    .sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5))
    .slice(0, count)
    .map(([key, val]) => {
      const direction = val > 0.5 ? '↑' : '↓';
      const displayScore = Math.round((val - 0.5) * 200);
      return `${direction} ${key.replace(/_/g, ' ')}: ${displayScore > 0 ? '+' : ''}${displayScore}`;
    });
}

function getRiskWarnings(scores: Record<string, number>, data: ModuleRealTimeData): string[] {
  const warnings: string[] = [];
  if (data.vixLevel && data.vixLevel > 25) warnings.push(`⚠️ VIX สูง (${data.vixLevel.toFixed(1)}) - ตลาดผันผวนสูง`);
  if (data.yieldCurveSpread !== null && data.yieldCurveSpread < 0) warnings.push(`⚠️ Yield Curve Inverted (${data.yieldCurveSpread.toFixed(2)}%) - สัญญาณถดถอย`);
  if (scores.geopolitical_risk !== undefined && scores.geopolitical_risk < 0.3) warnings.push('⚠️ ความเสี่ยงภูมิรัฐศาสตร์สูง');
  if (scores.liquidity_risk !== undefined && scores.liquidity_risk < 0.3) warnings.push('⚠️ สภาพคล่องต่ำ');
  if (scores.black_swan_detector !== undefined && scores.black_swan_detector < 0.25) warnings.push('🚨 ตรวจพบข่าวผิดปกติ (Black Swan Signal)');
  return warnings;
}

// ============================================
// COMPONENT
// ============================================

const AbleHF40Modules = () => {
  const [modules, setModules] = useState<ModuleScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('table');
  const [selectedModule, setSelectedModule] = useState<ModuleScore | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AbleAnalysisResult | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('XAUUSD');

  const availableAssets = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'USOIL', 'SPX500'];

  // Fetch analysis from real-time market data (NO Gemini API)
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📡 Loading 40 Modules from Real-Time Market Data...');

      // Step 1: Fetch market data via market-data-proxy
      const moduleData = await fetchModuleData(selectedAsset);

      // Step 2: Get news text from news_history table
      const newsText = await getNewsTextForAnalysis();

      // Step 3: Calculate all 40 module scores locally
      const rawScores = calculateModuleScores(moduleData, newsText, selectedAsset);

      // Step 4: Convert scores from 0-1 to -100 to +100 for UI
      const displayScores: Record<string, number> = {};
      Object.entries(rawScores).forEach(([key, value]) => {
        displayScores[key] = Math.round((value - 0.5) * 200);
      });

      // Step 5: Map scores to modules
      const updatedModules = MODULES_CONFIG.map(config => {
        const score = displayScores[config.id] ?? 0;
        const hasData = rawScores[config.id] !== undefined;
        return {
          ...config,
          score: hasData ? score : 0,
          signal: hasData
            ? (score > 20 ? 'bullish' : score < -20 ? 'bearish' : 'neutral') as 'bullish' | 'bearish' | 'neutral'
            : 'neutral' as const,
          lastUpdated: hasData ? new Date().toISOString() : 'N/A',
          isAvailable: hasData,
        };
      });

      // Step 6: Calculate P_up, decision, confidence from weighted average
      const totalWeight = Object.entries(rawScores).reduce((sum, [key]) => sum + (MODULE_WEIGHTS[key] || 0), 0);
      const weightedSum = Object.entries(rawScores).reduce((sum, [key, val]) => sum + (val * (MODULE_WEIGHTS[key] || 0)), 0);
      const P_up = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 50;
      const confidence = Math.min(95, Math.max(30, Math.abs(P_up - 50) * 2 + 40));

      setAnalysisResult({
        P_up_pct: Math.round(P_up * 10) / 10,
        P_down_pct: Math.round((100 - P_up) * 10) / 10,
        decision: P_up > 60 ? '🟢 BUY' : P_up < 40 ? '🔴 SELL' : '🟡 HOLD',
        confidence: `${Math.round(confidence)}%`,
        scores: displayScores,
        category_performance: calculateCategoryPerformance(rawScores),
        meta_insights: {
          dominant_paradigm: P_up > 55 ? 'Risk-On' : P_up < 45 ? 'Risk-Off' : 'Neutral',
          consensus_level: Math.round(confidence),
          volatility_regime: moduleData.vixLevel
            ? (moduleData.vixLevel > 25 ? 'High Volatility' : moduleData.vixLevel < 15 ? 'Low Volatility' : 'Normal')
            : 'Unknown',
          trend_alignment: Math.round((P_up - 50) * 2),
        },
        thai_summary: generateThaiSummary(selectedAsset, P_up, rawScores, moduleData),
        key_drivers: getTopDrivers(rawScores, 5),
        risk_warnings: getRiskWarnings(rawScores, moduleData),
        analyzed_at: new Date().toISOString(),
      });

      setModules(updatedModules);
      setLastUpdate(new Date());
      console.log(`✅ 40 Modules loaded: ${Object.keys(rawScores).length} modules with real data`);

    } catch (err) {
      console.error('ABLE analysis error:', err);
      setError(err instanceof Error ? err.message : 'No market data available. Check market-data-proxy connection.');
      setModules(MODULES_CONFIG.map(config => ({
        ...config,
        score: 0,
        signal: 'neutral' as const,
        lastUpdated: 'N/A',
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [selectedAsset]);

  // Format functions
  const formatScore = (score: number) => score === 0 ? '0' : score > 0 ? `+${score}` : `${score}`;
  const getScoreColor = (score: number) => {
    if (score > 30) return 'text-green-400';
    if (score > 0) return 'text-green-300';
    if (score < -30) return 'text-red-400';
    if (score < 0) return 'text-red-300';
    return 'text-amber-400';
  };
  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-amber-400" />;
    }
  };

  const exportCSV = () => {
    const headers = ['Module ID', 'Module Name', 'Category', 'Weight %', 'Score', 'Signal', 'Available', 'Data Source'];
    const rows = modules.map(m => [m.id, m.name, m.category, m.weight.toFixed(1), m.score, m.signal, m.isAvailable ? 'Yes' : 'No', m.dataSource]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ABLE-HF-40-Modules_${selectedAsset}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Prepare category summary
  const categoryStats = Object.keys(CATEGORY_CONFIG).map(category => {
    const categoryModules = modules.filter(m => m.category === category);
    const availableModules = categoryModules.filter(m => m.isAvailable);
    const totalWeight = categoryModules.reduce((sum, m) => sum + m.weight, 0);
    const avgScore = availableModules.length > 0 ? availableModules.reduce((sum, m) => sum + m.score, 0) / availableModules.length : 0;
    return { name: category, totalWeight, avgScore: Math.round(avgScore), available: availableModules.length, total: categoryModules.length, ...CATEGORY_CONFIG[category] };
  });

  const radarData = categoryStats.map(cat => ({ category: cat.name.split(' ')[0], score: Math.abs(cat.avgScore), fullMark: 100 }));
  const pieData = categoryStats.map((cat, i) => ({ name: cat.name, value: cat.totalWeight, color: CHART_COLORS[i] }));

  return (
    <div className="h-full flex flex-col text-xs bg-background p-2">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-green-500/30">
        <div className="flex flex-col">
          <span className="font-bold text-green-400 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            🧠 ABLE-HF 4.0 - 40 MODULES (Real-Time)
          </span>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdate.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="bg-background border border-border text-green-400 text-xs px-2 py-1 rounded"
            disabled={loading}
          >
            {availableAssets.map(asset => (
              <option key={asset} value={asset}>📊 {asset}</option>
            ))}
          </select>

          <Button size="sm" variant="outline" onClick={fetchAnalysis} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" variant="outline" onClick={exportCSV} disabled={loading || modules.length === 0}>
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analysisResult && (
        <div className="grid grid-cols-5 gap-2 mt-2 mb-2">
          <div className="bg-card/50 p-2 rounded border border-green-500/30 text-center">
            <div className="text-lg font-bold text-green-400">{analysisResult.P_up_pct?.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">P(Up)</div>
          </div>
          <div className="bg-card/50 p-2 rounded border border-red-500/30 text-center">
            <div className="text-lg font-bold text-red-400">{analysisResult.P_down_pct?.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">P(Down)</div>
          </div>
          <div className="bg-card/50 p-2 rounded border border-amber-500/30 text-center">
            <div className="text-lg font-bold">{analysisResult.decision}</div>
            <div className="text-xs text-muted-foreground">Decision</div>
          </div>
          <div className="bg-card/50 p-2 rounded border border-blue-500/30 text-center">
            <div className="text-lg font-bold text-blue-400">{analysisResult.confidence}</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div className="bg-card/50 p-2 rounded border border-purple-500/30 text-center">
            <div className="text-lg font-bold text-purple-400">{analysisResult.meta_insights?.volatility_regime || 'N/A'}</div>
            <div className="text-xs text-muted-foreground">Regime</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-2 mb-2 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="table" className="text-xs gap-1"><Table className="w-3 h-3" /> Table</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs gap-1"><BarChart3 className="w-3 h-3" /> Charts</TabsTrigger>
          <TabsTrigger value="category" className="text-xs gap-1"><Brain className="w-3 h-3" /> By Category</TabsTrigger>
        </TabsList>

        {/* Table Tab */}
        <TabsContent value="table" className="flex-1 overflow-auto mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-green-400" />
              <span className="ml-2 text-green-400">Loading 40 Modules from Real-Time Market Data...</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b border-green-500/30 z-10">
                <tr>
                  <th className="text-left py-2 px-2 text-amber-400">Category</th>
                  <th className="text-left py-2 px-2 text-amber-400">Module</th>
                  <th className="text-right py-2 px-2 text-amber-400">Weight</th>
                  <th className="text-right py-2 px-2 text-amber-400">Score</th>
                  <th className="text-center py-2 px-2 text-amber-400">Signal</th>
                  <th className="text-center py-2 px-2 text-amber-400">Source</th>
                  <th className="text-center py-2 px-2 text-amber-400">Info</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => {
                  const dsType = MODULE_DATA_SOURCES[module.id];
                  const dsLabel = dsType === 'real-time' ? '📡' : dsType === 'keyword' ? '📰' : '≈';
                  const dsColor = dsType === 'real-time' ? 'text-emerald-400' : dsType === 'keyword' ? 'text-blue-400' : 'text-orange-400';
                  return (
                    <tr key={module.id} className="border-b border-border/10 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedModule(module)}>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${CATEGORY_CONFIG[module.category]?.bgColor} ${CATEGORY_CONFIG[module.category]?.color}`}>
                          {module.category.split(' ')[0]}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-foreground font-medium">{module.name}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">{module.weight.toFixed(1)}%</td>
                      <td className={`text-right py-2 px-2 font-bold ${getScoreColor(module.score)}`}>
                        {module.isAvailable ? formatScore(module.score) : '-'}
                      </td>
                      <td className="text-center py-2 px-2">
                        {module.isAvailable ? getSignalIcon(module.signal) : <Minus className="w-4 h-4 text-gray-500 mx-auto" />}
                      </td>
                      <td className={`text-center py-2 px-2 ${dsColor}`}>{dsLabel}</td>
                      <td className="text-center py-2 px-2">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setSelectedModule(module); }}>
                          <Info className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="flex-1 overflow-auto mt-2">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="bg-card/50 p-3 rounded border border-border">
              <h3 className="text-sm font-bold text-green-400 mb-2">Category Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#888', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888', fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card/50 p-3 rounded border border-border">
              <h3 className="text-sm font-bold text-green-400 mb-2">Weight Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name.split(' ')[0]}: ${value.toFixed(1)}%`} labelLine={false}>
                    {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card/50 p-3 rounded border border-border col-span-2">
              <h3 className="text-sm font-bold text-green-400 mb-2">Module Scores</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={modules.filter(m => m.isAvailable).slice(0, 20).map(m => ({ name: m.name.substring(0, 15), score: m.score }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 8 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} domain={[-100, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#22c55e">
                    {modules.filter(m => m.isAvailable).slice(0, 20).map((m, i) => (
                      <Cell key={i} fill={m.score >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Category Tab */}
        <TabsContent value="category" className="flex-1 overflow-auto mt-2">
          <div className="space-y-3">
            {categoryStats.map(category => (
              <div key={category.name} className="bg-card/50 p-3 rounded border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold ${category.color}`}>{category.name}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">Weight: {category.totalWeight.toFixed(1)}%</span>
                    <span className={getScoreColor(category.avgScore)}>Avg: {formatScore(category.avgScore)}</span>
                    <span className="text-muted-foreground">{category.available}/{category.total} Active</span>
                  </div>
                </div>
                <Progress value={50 + category.avgScore / 2} className="h-2" />
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {modules.filter(m => m.category === category.name).map(module => (
                    <div
                      key={module.id}
                      className={`p-2 rounded border cursor-pointer transition-all hover:border-green-500/50 ${module.isAvailable ? 'border-border bg-accent/20' : 'border-gray-700 bg-gray-800/30 opacity-50'}`}
                      onClick={() => setSelectedModule(module)}
                    >
                      <div className="text-xs font-medium truncate">{module.name}</div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{module.weight}%</span>
                        <span className={`text-xs ${getScoreColor(module.score)}`}>{module.isAvailable ? formatScore(module.score) : 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Module Detail Modal */}
      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        <DialogContent className="max-w-lg bg-background border-green-500/30">
          <DialogHeader>
            <DialogTitle className="text-green-400 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {selectedModule?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedModule && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${CATEGORY_CONFIG[selectedModule.category]?.bgColor} ${CATEGORY_CONFIG[selectedModule.category]?.color}`}>
                  {selectedModule.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${selectedModule.isAvailable ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {selectedModule.isAvailable ? '✅ Active' : '⏳ No Data'}
                </span>
                {MODULE_DATA_SOURCES[selectedModule.id] && (
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    MODULE_DATA_SOURCES[selectedModule.id] === 'real-time' ? 'bg-emerald-500/20 text-emerald-400' :
                    MODULE_DATA_SOURCES[selectedModule.id] === 'keyword' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {MODULE_DATA_SOURCES[selectedModule.id] === 'real-time' ? '📡 Real-time' :
                     MODULE_DATA_SOURCES[selectedModule.id] === 'keyword' ? '📰 News-based' : '≈ Proxy'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card/50 p-3 rounded border border-border">
                  <div className="text-xs text-muted-foreground">Weight</div>
                  <div className="text-2xl font-bold text-amber-400">{selectedModule.weight}%</div>
                </div>
                <div className="bg-card/50 p-3 rounded border border-border">
                  <div className="text-xs text-muted-foreground">Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(selectedModule.score)}`}>
                    {selectedModule.isAvailable ? formatScore(selectedModule.score) : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="bg-card/50 p-3 rounded border border-border">
                <div className="text-xs text-muted-foreground mb-1">Signal</div>
                <div className="flex items-center gap-2">
                  {getSignalIcon(selectedModule.signal)}
                  <span className={`font-bold uppercase ${selectedModule.signal === 'bullish' ? 'text-green-400' : selectedModule.signal === 'bearish' ? 'text-red-400' : 'text-amber-400'}`}>
                    {selectedModule.isAvailable ? selectedModule.signal : 'Unavailable'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <p className="text-sm">{selectedModule.description}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Data Source</div>
                <p className="text-sm font-mono text-cyan-400">{selectedModule.dataSource}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Last Updated: {selectedModule.isAvailable ? new Date(selectedModule.lastUpdated).toLocaleString() : 'N/A'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AbleHF40Modules;
