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
  { id: 'trade_balance_flow', name: 'Trade Balance Flow', category: 'Macro & Economic', weight: 2.5, description: 'International trade flows and current account', dataSource: 'Census Trade Data', isAvailable: false },
  { id: 'fiscal_policy_impact', name: 'Fiscal Policy Impact', category: 'Macro & Economic', weight: 2.0, description: 'Government spending and tax policy analysis', dataSource: 'Treasury/CBO', isAvailable: false },

  // CATEGORY 2: SENTIMENT & FLOW (29%)
  { id: 'news_sentiment_cfa', name: 'News Sentiment (CFA)', category: 'Sentiment & Flow', weight: 7.5, description: 'Comprehensive news sentiment analysis using CFA methodology', dataSource: 'News Aggregator', isAvailable: true },
  { id: 'social_media_pulse', name: 'Social Media Pulse', category: 'Sentiment & Flow', weight: 5.5, description: 'Twitter/Reddit sentiment and volume analysis', dataSource: 'Social APIs', isAvailable: true },
  { id: 'institutional_flow', name: 'Institutional Flow', category: 'Sentiment & Flow', weight: 5.0, description: '13F filings, fund flows, and institutional positioning', dataSource: 'SEC Filings', isAvailable: true },
  { id: 'retail_sentiment', name: 'Retail Sentiment', category: 'Sentiment & Flow', weight: 4.0, description: 'Retail trader positioning and sentiment surveys', dataSource: 'AAII/Retail Brokers', isAvailable: true },
  { id: 'options_sentiment', name: 'Options Sentiment', category: 'Sentiment & Flow', weight: 3.5, description: 'Put/Call ratio, options flow, and implied volatility', dataSource: 'Options Data', isAvailable: true },
  { id: 'cot_positioning', name: 'COT Positioning', category: 'Sentiment & Flow', weight: 3.0, description: 'CFTC Commitment of Traders positioning data', dataSource: 'CFTC COT', isAvailable: true },
  { id: 'dark_pool_activity', name: 'Dark Pool Activity', category: 'Sentiment & Flow', weight: 2.5, description: 'Dark pool and off-exchange trading volume', dataSource: 'FINRA ATS', isAvailable: false },
  { id: 'etf_flow_momentum', name: 'ETF Flow Momentum', category: 'Sentiment & Flow', weight: 2.0, description: 'ETF creation/redemption and flow analysis', dataSource: 'ETF Providers', isAvailable: false },

  // CATEGORY 3: TECHNICAL & REGIME (20%)
  { id: 'trend_regime_detector', name: 'Trend Regime Detector', category: 'Technical & Regime', weight: 4.5, description: 'Market regime classification (trending/ranging/volatile)', dataSource: 'Price Data', isAvailable: true },
  { id: 'momentum_oscillator', name: 'Momentum Oscillator', category: 'Technical & Regime', weight: 4.0, description: 'RSI, MACD, Stochastic momentum signals', dataSource: 'Price Data', isAvailable: true },
  { id: 'volatility_regime', name: 'Volatility Regime', category: 'Technical & Regime', weight: 3.5, description: 'VIX, ATR, and volatility regime detection', dataSource: 'Market Data', isAvailable: true },
  { id: 'support_resistance', name: 'Support & Resistance', category: 'Technical & Regime', weight: 3.0, description: 'Key price levels and breakout detection', dataSource: 'Price Data', isAvailable: true },
  { id: 'pattern_recognition', name: 'Pattern Recognition', category: 'Technical & Regime', weight: 2.5, description: 'Chart pattern detection (H&S, triangles, etc.)', dataSource: 'Price Data', isAvailable: true },
  { id: 'volume_analysis', name: 'Volume Analysis', category: 'Technical & Regime', weight: 2.0, description: 'Volume profile and accumulation/distribution', dataSource: 'Market Data', isAvailable: true },
  { id: 'market_breadth', name: 'Market Breadth', category: 'Technical & Regime', weight: 1.5, description: 'Advance/decline, new highs/lows analysis', dataSource: 'Market Data', isAvailable: false },
  { id: 'intermarket_correlation', name: 'Intermarket Correlation', category: 'Technical & Regime', weight: 1.5, description: 'Cross-asset correlation and divergence', dataSource: 'Multiple Sources', isAvailable: false },

  // CATEGORY 4: RISK & EVENT (23.5%)
  { id: 'event_shock', name: 'Event Shock Detector', category: 'Risk & Event', weight: 6.5, description: 'Breaking news and event impact assessment', dataSource: 'News/Events API', isAvailable: true },
  { id: 'geopolitical_risk', name: 'Geopolitical Risk', category: 'Risk & Event', weight: 4.5, description: 'Global conflict and political risk analysis', dataSource: 'News/GPR Index', isAvailable: true },
  { id: 'black_swan_detector', name: 'Black Swan Detector', category: 'Risk & Event', weight: 4.0, description: 'Tail risk and extreme event probability', dataSource: 'Multiple Sources', isAvailable: true },
  { id: 'liquidity_risk', name: 'Liquidity Risk', category: 'Risk & Event', weight: 3.0, description: 'Market liquidity and spread analysis', dataSource: 'Market Microstructure', isAvailable: true },
  { id: 'correlation_breakdown', name: 'Correlation Breakdown', category: 'Risk & Event', weight: 2.5, description: 'Detection of correlation regime changes', dataSource: 'Price Data', isAvailable: false },
  { id: 'tail_risk_monitor', name: 'Tail Risk Monitor', category: 'Risk & Event', weight: 2.0, description: 'VaR, CVaR, and tail risk metrics', dataSource: 'Risk Models', isAvailable: false },
  { id: 'regulatory_risk', name: 'Regulatory Risk', category: 'Risk & Event', weight: 1.5, description: 'Policy and regulatory change risk', dataSource: 'News/Gov Sources', isAvailable: false },
  { id: 'systemic_risk', name: 'Systemic Risk', category: 'Risk & Event', weight: 1.5, description: 'Financial system stress indicators', dataSource: 'Fed FRED', isAvailable: false },

  // CATEGORY 5: ALTERNATIVE & AI (14.5%)
  { id: 'quantum_sentiment', name: 'Quantum Sentiment', category: 'Alternative & AI', weight: 5.5, description: 'Advanced quantum-inspired sentiment patterns', dataSource: 'Proprietary AI', isAvailable: true },
  { id: 'neural_ensemble', name: 'Neural Ensemble', category: 'Alternative & AI', weight: 4.5, description: 'Ensemble of deep learning models', dataSource: 'AI Models', isAvailable: true },
  { id: 'nlp_deep_analysis', name: 'NLP Deep Analysis', category: 'Alternative & AI', weight: 3.5, description: 'Transformer-based text analysis', dataSource: 'Gemini/GPT', isAvailable: true },
  { id: 'satellite_data', name: 'Satellite Data', category: 'Alternative & AI', weight: 2.0, description: 'Satellite imagery for economic activity', dataSource: 'Satellite Providers', isAvailable: false },
  { id: 'alternative_data', name: 'Alternative Data', category: 'Alternative & AI', weight: 2.0, description: 'Credit cards, foot traffic, web scraping', dataSource: 'Alt Data Providers', isAvailable: false },
  { id: 'machine_learning_signal', name: 'ML Signal Generator', category: 'Alternative & AI', weight: 1.5, description: 'Traditional ML models (XGBoost, RF)', dataSource: 'ML Pipeline', isAvailable: false },
  { id: 'sentiment_network', name: 'Sentiment Network', category: 'Alternative & AI', weight: 1.5, description: 'Graph-based sentiment propagation', dataSource: 'Network Analysis', isAvailable: false },
  { id: 'predictive_analytics', name: 'Predictive Analytics', category: 'Alternative & AI', weight: 1.0, description: 'Time series forecasting models', dataSource: 'Statistical Models', isAvailable: false },
];

const CATEGORY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  'Macro & Economic': { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'Sentiment & Flow': { color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'Technical & Regime': { color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  'Risk & Event': { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'Alternative & AI': { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
};

const CHART_COLORS = ['#3b82f6', '#a855f7', '#06b6d4', '#ef4444', '#10b981'];

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

  // Fetch analysis from backend
  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('news-aggregator', {
        body: { pinnedAssets: [selectedAsset] }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.macro?.length > 0) {
        const macroItem = data.macro.find((m: any) => m.symbol === selectedAsset);
        
        if (macroItem?.ableAnalysis) {
          setAnalysisResult(macroItem.ableAnalysis);
          
          // Map scores to modules
          const updatedModules = MODULES_CONFIG.map(config => {
            const score = macroItem.ableAnalysis.scores?.[config.id] ?? null;
            const isAvailable = score !== null && config.isAvailable;
            
            return {
              ...config,
              score: isAvailable ? score : 0,
              signal: isAvailable 
                ? (score > 20 ? 'bullish' : score < -20 ? 'bearish' : 'neutral') as 'bullish' | 'bearish' | 'neutral'
                : 'neutral' as const,
              lastUpdated: isAvailable ? new Date().toISOString() : 'N/A',
              isAvailable
            };
          });

          setModules(updatedModules);
          setLastUpdate(new Date());
        } else {
          // No analysis available - set default values
          setModules(MODULES_CONFIG.map(config => ({
            ...config,
            score: 0,
            signal: 'neutral' as const,
            lastUpdated: 'N/A',
          })));
          setError('No ABLE analysis available. Check Gemini API connection.');
        }
      } else {
        throw new Error('Failed to get analysis data');
      }
    } catch (err) {
      console.error('ABLE analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
      
      // Set mock data for display
      setModules(MODULES_CONFIG.map(config => ({
        ...config,
        score: config.isAvailable ? Math.floor(Math.random() * 100) - 50 : 0,
        signal: 'neutral' as const,
        lastUpdated: config.isAvailable ? new Date().toISOString() : 'N/A',
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [selectedAsset]);

  // Format functions
  const formatScore = (score: number) => {
    if (score === 0) return '0';
    return score > 0 ? `+${score}` : `${score}`;
  };

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

  // Export CSV
  const exportCSV = () => {
    const headers = ['Module ID', 'Module Name', 'Category', 'Weight %', 'Score', 'Signal', 'Available', 'Data Source'];
    const rows = modules.map(m => [
      m.id, m.name, m.category, m.weight.toFixed(1), m.score, m.signal, m.isAvailable ? 'Yes' : 'No', m.dataSource
    ]);
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
    const avgScore = availableModules.length > 0 
      ? availableModules.reduce((sum, m) => sum + m.score, 0) / availableModules.length 
      : 0;

    return {
      name: category,
      totalWeight,
      avgScore: Math.round(avgScore),
      available: availableModules.length,
      total: categoryModules.length,
      ...CATEGORY_CONFIG[category]
    };
  });

  // Chart data
  const radarData = categoryStats.map(cat => ({
    category: cat.name.split(' ')[0],
    score: Math.abs(cat.avgScore),
    fullMark: 100
  }));

  const pieData = categoryStats.map((cat, i) => ({
    name: cat.name,
    value: cat.totalWeight,
    color: CHART_COLORS[i]
  }));

  return (
    <div className="h-full flex flex-col text-xs bg-background p-2">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-green-500/30">
        <div className="flex flex-col">
          <span className="font-bold text-green-400 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            🧠 ABLE-HF 3.0 - 40 MODULES ANALYSIS
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
          <TabsTrigger value="table" className="text-xs gap-1">
            <Table className="w-3 h-3" /> Table
          </TabsTrigger>
          <TabsTrigger value="charts" className="text-xs gap-1">
            <BarChart3 className="w-3 h-3" /> Charts
          </TabsTrigger>
          <TabsTrigger value="category" className="text-xs gap-1">
            <Brain className="w-3 h-3" /> By Category
          </TabsTrigger>
        </TabsList>

        {/* Table Tab */}
        <TabsContent value="table" className="flex-1 overflow-auto mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-green-400" />
              <span className="ml-2 text-green-400">Loading 40 Modules from Gemini AI...</span>
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
                  <th className="text-center py-2 px-2 text-amber-400">Status</th>
                  <th className="text-center py-2 px-2 text-amber-400">Info</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module, i) => (
                  <tr
                    key={module.id}
                    className="border-b border-border/10 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedModule(module)}
                  >
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${CATEGORY_CONFIG[module.category]?.bgColor} ${CATEGORY_CONFIG[module.category]?.color}`}>
                        {module.category.split(' ')[0]}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-foreground font-medium">
                      {module.name}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {module.weight.toFixed(1)}%
                    </td>
                    <td className={`text-right py-2 px-2 font-bold ${getScoreColor(module.score)}`}>
                      {module.isAvailable ? formatScore(module.score) : '-'}
                    </td>
                    <td className="text-center py-2 px-2">
                      {module.isAvailable ? getSignalIcon(module.signal) : <Minus className="w-4 h-4 text-gray-500 mx-auto" />}
                    </td>
                    <td className="text-center py-2 px-2">
                      {module.isAvailable ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => { e.stopPropagation(); setSelectedModule(module); }}
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="flex-1 overflow-auto mt-2">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Radar Chart */}
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

            {/* Weight Distribution */}
            <div className="bg-card/50 p-3 rounded border border-border">
              <h3 className="text-sm font-bold text-green-400 mb-2">Weight Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name.split(' ')[0]}: ${value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution Bar */}
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
                <Progress 
                  value={50 + category.avgScore / 2} 
                  className="h-2" 
                />
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {modules.filter(m => m.category === category.name).map(module => (
                    <div 
                      key={module.id}
                      className={`p-2 rounded border cursor-pointer transition-all hover:border-green-500/50 ${
                        module.isAvailable ? 'border-border bg-accent/20' : 'border-gray-700 bg-gray-800/30 opacity-50'
                      }`}
                      onClick={() => setSelectedModule(module)}
                    >
                      <div className="text-xs font-medium truncate">{module.name}</div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{module.weight}%</span>
                        <span className={`text-xs ${getScoreColor(module.score)}`}>
                          {module.isAvailable ? formatScore(module.score) : 'N/A'}
                        </span>
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
              {/* Category Badge */}
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${CATEGORY_CONFIG[selectedModule.category]?.bgColor} ${CATEGORY_CONFIG[selectedModule.category]?.color}`}>
                  {selectedModule.category}
                </span>
                {selectedModule.isAvailable ? (
                  <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">✅ Active</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm bg-gray-500/20 text-gray-400">⏳ Data Pending</span>
                )}
              </div>

              {/* Score & Weight */}
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

              {/* Signal */}
              <div className="bg-card/50 p-3 rounded border border-border">
                <div className="text-xs text-muted-foreground mb-1">Signal</div>
                <div className="flex items-center gap-2">
                  {getSignalIcon(selectedModule.signal)}
                  <span className={`font-bold uppercase ${
                    selectedModule.signal === 'bullish' ? 'text-green-400' :
                    selectedModule.signal === 'bearish' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {selectedModule.isAvailable ? selectedModule.signal : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <p className="text-sm">{selectedModule.description}</p>
              </div>

              {/* Data Source */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Data Source</div>
                <p className="text-sm font-mono text-cyan-400">{selectedModule.dataSource}</p>
              </div>

              {/* Status Message */}
              {!selectedModule.isAvailable && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded text-amber-400 text-sm">
                  ⚠️ ข้อมูลยังไม่พร้อมใช้งาน - กำลังพัฒนาการเชื่อมต่อกับ {selectedModule.dataSource}
                </div>
              )}

              {/* Last Updated */}
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
