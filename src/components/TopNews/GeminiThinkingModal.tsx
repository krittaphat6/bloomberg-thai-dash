import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, TrendingUp, TrendingDown, AlertTriangle, Sparkles, BarChart3, Target, Shield, Globe } from 'lucide-react';

interface ModuleScore {
  name: string;
  score: number;
  weight: number;
  category: string;
}

interface GeminiThinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  analysis: {
    P_up_pct: number;
    P_down_pct?: number;
    decision: string;
    confidence: number;
    regime_adjusted_confidence?: number;
    market_regime?: string;
    quantum_enhancement?: number;
    neural_enhancement?: number;
    scores?: Record<string, number>;
    category_performance?: Record<string, number>;
    meta_insights?: {
      dominant_paradigm?: string;
      consensus_level?: number;
      volatility_regime?: string;
      trend_alignment?: number;
    };
    trading_signal?: {
      signal: string;
      icon: string;
      color?: string;
      strength: number;
    };
    thai_summary?: string;
    key_drivers?: string[];
    risk_warnings?: string[];
    analyzed_at?: string;
    news_count?: number;
    relevant_news_count?: number;
  } | null;
}

// Module configurations with weights and categories
const MODULE_CONFIG: Record<string, { label: string; weight: number; category: string; icon: any }> = {
  // MACRO & ECONOMIC (33%)
  macro_neural_forecast: { label: 'Macro Neural Forecast', weight: 6.5, category: 'macro', icon: Brain },
  central_bank_sentiment: { label: 'Central Bank Sentiment', weight: 7.0, category: 'macro', icon: Brain },
  yield_curve_signal: { label: 'Yield Curve Signal', weight: 4.5, category: 'macro', icon: BarChart3 },
  inflation_momentum: { label: 'Inflation Momentum', weight: 4.0, category: 'macro', icon: TrendingUp },
  gdp_growth_trajectory: { label: 'GDP Growth Trajectory', weight: 3.5, category: 'macro', icon: BarChart3 },
  employment_dynamics: { label: 'Employment Dynamics', weight: 3.0, category: 'macro', icon: Target },
  trade_balance_flow: { label: 'Trade Balance Flow', weight: 2.5, category: 'macro', icon: Globe },
  fiscal_policy_impact: { label: 'Fiscal Policy Impact', weight: 2.0, category: 'macro', icon: Shield },
  // SENTIMENT & FLOW (29%)
  news_sentiment_cfa: { label: 'News Sentiment CFA', weight: 7.5, category: 'sentiment', icon: Sparkles },
  social_media_pulse: { label: 'Social Media Pulse', weight: 5.5, category: 'sentiment', icon: Zap },
  institutional_flow: { label: 'Institutional Flow', weight: 5.0, category: 'sentiment', icon: TrendingUp },
  retail_sentiment: { label: 'Retail Sentiment', weight: 4.0, category: 'sentiment', icon: Target },
  options_sentiment: { label: 'Options Sentiment', weight: 3.5, category: 'sentiment', icon: BarChart3 },
  cot_positioning: { label: 'COT Positioning', weight: 3.0, category: 'sentiment', icon: Target },
  dark_pool_activity: { label: 'Dark Pool Activity', weight: 2.5, category: 'sentiment', icon: Shield },
  etf_flow_momentum: { label: 'ETF Flow Momentum', weight: 2.0, category: 'sentiment', icon: TrendingUp },
  // TECHNICAL & REGIME (20%)
  trend_regime_detector: { label: 'Trend Regime Detector', weight: 4.5, category: 'technical', icon: BarChart3 },
  momentum_oscillator: { label: 'Momentum Oscillator', weight: 4.0, category: 'technical', icon: Zap },
  volatility_regime: { label: 'Volatility Regime', weight: 3.5, category: 'technical', icon: AlertTriangle },
  support_resistance: { label: 'Support/Resistance', weight: 3.0, category: 'technical', icon: Target },
  pattern_recognition: { label: 'Pattern Recognition', weight: 2.5, category: 'technical', icon: Brain },
  volume_analysis: { label: 'Volume Analysis', weight: 2.0, category: 'technical', icon: BarChart3 },
  market_breadth: { label: 'Market Breadth', weight: 1.5, category: 'technical', icon: Globe },
  intermarket_correlation: { label: 'Intermarket Correlation', weight: 1.5, category: 'technical', icon: Target },
  // RISK & EVENT (23.5%)
  event_shock: { label: 'Event Shock', weight: 6.5, category: 'risk', icon: AlertTriangle },
  geopolitical_risk: { label: 'Geopolitical Risk', weight: 4.5, category: 'risk', icon: Globe },
  black_swan_detector: { label: 'Black Swan Detector', weight: 4.0, category: 'risk', icon: AlertTriangle },
  liquidity_risk: { label: 'Liquidity Risk', weight: 3.0, category: 'risk', icon: Shield },
  correlation_breakdown: { label: 'Correlation Breakdown', weight: 2.5, category: 'risk', icon: BarChart3 },
  tail_risk_monitor: { label: 'Tail Risk Monitor', weight: 2.0, category: 'risk', icon: AlertTriangle },
  regulatory_risk: { label: 'Regulatory Risk', weight: 1.5, category: 'risk', icon: Shield },
  systemic_risk: { label: 'Systemic Risk', weight: 1.5, category: 'risk', icon: Globe },
  // ALTERNATIVE & AI (14.5%)
  quantum_sentiment: { label: 'Quantum Sentiment', weight: 5.5, category: 'ai', icon: Sparkles },
  neural_ensemble: { label: 'Neural Ensemble', weight: 4.5, category: 'ai', icon: Brain },
  nlp_deep_analysis: { label: 'NLP Deep Analysis', weight: 3.5, category: 'ai', icon: Sparkles },
  satellite_data: { label: 'Satellite Data', weight: 2.0, category: 'ai', icon: Globe },
  alternative_data: { label: 'Alternative Data', weight: 2.0, category: 'ai', icon: Target },
  machine_learning_signal: { label: 'ML Signal', weight: 1.5, category: 'ai', icon: Brain },
  sentiment_network: { label: 'Sentiment Network', weight: 1.5, category: 'ai', icon: Zap },
  predictive_analytics: { label: 'Predictive Analytics', weight: 1.0, category: 'ai', icon: Sparkles },
};

const CATEGORY_CONFIG = {
  macro: { label: '📊 Macro & Economic', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', weight: '33%' },
  sentiment: { label: '💭 Sentiment & Flow', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', weight: '29%' },
  technical: { label: '📈 Technical & Regime', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', weight: '20%' },
  risk: { label: '⚠️ Risk & Event', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', weight: '23.5%' },
  ai: { label: '🤖 Alternative & AI', color: 'text-pink-400', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30', weight: '14.5%' },
};

export const GeminiThinkingModal: React.FC<GeminiThinkingModalProps> = ({
  isOpen,
  onClose,
  symbol,
  analysis
}) => {
  if (!analysis) return null;

  const scores = analysis.scores || {};
  const categoryPerf = analysis.category_performance || {};
  const sentiment = analysis.P_up_pct > 55 ? 'bullish' : analysis.P_up_pct < 45 ? 'bearish' : 'neutral';

  // Group modules by category
  const modulesByCategory = Object.entries(MODULE_CONFIG).reduce((acc, [key, config]) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push({
      key,
      ...config,
      score: scores[key] ?? 0,
    });
    return acc;
  }, {} as Record<string, Array<{ key: string; label: string; weight: number; category: string; icon: any; score: number }>>);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-purple-950/20 to-zinc-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  {symbol}
                  <Badge className={`ml-2 ${
                    sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                    sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    {analysis.decision}
                  </Badge>
                </DialogTitle>
                <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  ABLE-HF 3.0 × Gemini AI Analysis
                </p>
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{analysis.P_up_pct?.toFixed(1)}%</p>
                <p className="text-xs text-zinc-500">P(Up)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{analysis.confidence}%</p>
                <p className="text-xs text-zinc-500">Confidence</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)]">
          <div className="p-4 md:p-6 space-y-6">
            {/* Thai Summary */}
            {analysis.thai_summary && (
              <div className="bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 rounded-xl p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">สรุปการวิเคราะห์</span>
                </div>
                <p className="text-sm md:text-base text-white leading-relaxed">{analysis.thai_summary}</p>
              </div>
            )}

            {/* Probability Bar */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">P↓ {(100 - analysis.P_up_pct).toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-400">P↑ {analysis.P_up_pct.toFixed(1)}%</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 h-full"
                  style={{ width: `${100 - analysis.P_up_pct}%` }}
                />
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full"
                  style={{ width: `${analysis.P_up_pct}%` }}
                />
              </div>
              
              {/* Enhancements */}
              {(analysis.quantum_enhancement || analysis.neural_enhancement) && (
                <div className="flex items-center gap-4 mt-3">
                  {analysis.quantum_enhancement && (
                    <span className="text-xs text-purple-400">
                      ⚛️ Quantum Boost: +{(analysis.quantum_enhancement * 100).toFixed(1)}%
                    </span>
                  )}
                  {analysis.neural_enhancement && (
                    <span className="text-xs text-pink-400">
                      🧠 Neural Boost: +{(analysis.neural_enhancement * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Category Performance Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const perf = categoryPerf[key === 'macro' ? 'macro_economic' : key === 'sentiment' ? 'sentiment_flow' : key === 'technical' ? 'technical_regime' : key === 'risk' ? 'risk_event' : 'alternative_ai'] || 50;
                return (
                  <div 
                    key={key}
                    className={`rounded-lg p-3 border ${config.bgColor} ${config.borderColor}`}
                  >
                    <p className="text-xs text-zinc-500 mb-1">{config.label}</p>
                    <p className={`text-lg font-bold ${config.color}`}>{perf.toFixed(1)}%</p>
                    <p className="text-[10px] text-zinc-600">Weight: {config.weight}</p>
                  </div>
                );
              })}
            </div>

            {/* 40 Modules Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">40 Module Analysis</h3>
              </div>

              {Object.entries(CATEGORY_CONFIG).map(([catKey, catConfig]) => {
                const modules = modulesByCategory[catKey] || [];
                return (
                  <div key={catKey} className={`rounded-xl border ${catConfig.borderColor} ${catConfig.bgColor} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-sm font-medium ${catConfig.color}`}>{catConfig.label}</span>
                      <span className="text-xs text-zinc-500">({catConfig.weight})</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {modules.map((module) => {
                        const Icon = module.icon;
                        return (
                          <div 
                            key={module.key}
                            className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2"
                          >
                            <Icon className={`w-3 h-3 flex-shrink-0 ${catConfig.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400 truncate">{module.label}</span>
                                <span className={`text-xs font-bold ${getScoreColor(module.score)}`}>
                                  {module.score}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${getScoreBarColor(module.score)}`}
                                  style={{ width: `${Math.max(0, Math.min(100, (module.score + 100) / 2))}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-600 flex-shrink-0">{module.weight}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Key Drivers & Risk Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.key_drivers && analysis.key_drivers.length > 0 && (
                <div className="bg-emerald-950/30 rounded-xl p-4 border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Key Drivers</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.key_drivers.map((driver, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.risk_warnings && analysis.risk_warnings.length > 0 && (
                <div className="bg-red-950/30 rounded-xl p-4 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Risk Warnings</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.risk_warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">⚠️</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Meta Insights */}
            {analysis.meta_insights && (
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Meta Insights</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {analysis.meta_insights.dominant_paradigm && (
                    <div>
                      <p className="text-xs text-zinc-500">Paradigm</p>
                      <p className="text-sm font-medium text-white">{analysis.meta_insights.dominant_paradigm}</p>
                    </div>
                  )}
                  {analysis.meta_insights.consensus_level && (
                    <div>
                      <p className="text-xs text-zinc-500">Consensus</p>
                      <p className="text-sm font-medium text-white">{analysis.meta_insights.consensus_level}%</p>
                    </div>
                  )}
                  {analysis.meta_insights.volatility_regime && (
                    <div>
                      <p className="text-xs text-zinc-500">Volatility</p>
                      <p className="text-sm font-medium text-white">{analysis.meta_insights.volatility_regime}</p>
                    </div>
                  )}
                  {analysis.meta_insights.trend_alignment && (
                    <div>
                      <p className="text-xs text-zinc-500">Trend Alignment</p>
                      <p className="text-sm font-medium text-white">{analysis.meta_insights.trend_alignment}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs text-zinc-600">
              <span>Analyzed: {analysis.analyzed_at ? new Date(analysis.analyzed_at).toLocaleString() : 'Just now'}</span>
              <span>{analysis.relevant_news_count || 0}/{analysis.news_count || 0} relevant news analyzed</span>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default GeminiThinkingModal;
