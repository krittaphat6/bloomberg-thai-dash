import React from 'react';
import { TrendingUp, TrendingDown, Zap, Brain, AlertTriangle, Info, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AbleNewsResult, ASSET_DISPLAY_NAMES } from '@/services/ableNewsIntelligence';

interface AbleAnalysisPanelProps {
  symbol: string;
  result: AbleNewsResult;
}

export const AbleAnalysisPanel: React.FC<AbleAnalysisPanelProps> = ({ symbol, result }) => {
  const getSignalGradient = () => {
    const signal = result.trading_signal.signal;
    switch (signal) {
      case 'STRONG_BUY':
        return 'from-green-500 to-emerald-600';
      case 'BUY':
        return 'from-green-400 to-green-500';
      case 'HOLD':
        return 'from-yellow-400 to-amber-500';
      case 'SELL':
        return 'from-orange-400 to-red-400';
      case 'STRONG_SELL':
        return 'from-red-500 to-red-700';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'macro_economic':
        return '📊';
      case 'sentiment_flow':
        return '🌊';
      case 'technical_regime':
        return '📈';
      case 'risk_event':
        return '⚠️';
      case 'alternative_ai':
        return '🤖';
      default:
        return '📌';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'macro_economic':
        return 'Macro & Economic';
      case 'sentiment_flow':
        return 'Sentiment & Flow';
      case 'technical_regime':
        return 'Technical & Regime';
      case 'risk_event':
        return 'Risk & Event';
      case 'alternative_ai':
        return 'Alternative & AI';
      default:
        return category;
    }
  };

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            ABLE-HF 3.0 Analysis: {ASSET_DISPLAY_NAMES[symbol]}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(result.analyzed_at).toLocaleTimeString()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Probability Display */}
        <div className="grid grid-cols-2 gap-4">
          {/* P_up Circle */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#greenGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${result.P_up_pct * 2.51} 251`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold text-green-500">{result.P_up_pct}%</span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground mt-1">P(Up)</span>
          </div>

          {/* P_down Circle */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#redGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${result.P_down_pct * 2.51} 251`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold text-red-500">{result.P_down_pct}%</span>
              </div>
            </div>
            <span className="text-sm text-muted-foreground mt-1">P(Down)</span>
          </div>
        </div>

        {/* Trading Signal */}
        <div className={`p-4 rounded-lg bg-gradient-to-r ${getSignalGradient()} text-white text-center`}>
          <div className="text-3xl mb-1">{result.trading_signal.icon}</div>
          <div className="text-xl font-bold">{result.decision}</div>
          <div className="text-sm opacity-90">Confidence: {result.confidence}</div>
        </div>

        {/* Enhancement Boosts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Zap className="h-4 w-4 text-purple-400" />
            <div>
              <div className="text-xs text-muted-foreground">Quantum Boost</div>
              <div className="text-sm font-semibold text-purple-400">+{result.quantum_enhancement}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Brain className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-xs text-muted-foreground">Neural Boost</div>
              <div className="text-sm font-semibold text-blue-400">+{result.neural_enhancement}%</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Category Performance */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Category Performance
          </h4>
          <div className="space-y-2">
            {Object.entries(result.category_performance).map(([category, score]) => (
              <div key={category} className="flex items-center gap-2">
                <span className="text-lg w-6">{getCategoryIcon(category)}</span>
                <span className="text-xs text-muted-foreground w-28 truncate">
                  {getCategoryName(category)}
                </span>
                <Progress 
                  value={score} 
                  className="flex-1 h-2"
                />
                <span className={`text-xs font-mono w-10 text-right ${
                  score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Thai Summary */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            🇹🇭 สรุปภาษาไทย
          </h4>
          <p className="text-sm">{result.thai_summary}</p>
        </div>

        {/* Key Drivers */}
        {result.key_drivers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">🔑 Key Drivers</h4>
            <div className="flex flex-wrap gap-1.5">
              {result.key_drivers.map((driver, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {driver}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Risk Warnings */}
        {result.risk_warnings.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Risk Warnings
            </h4>
            <ul className="text-xs space-y-1">
              {result.risk_warnings.map((warning, idx) => (
                <li key={idx} className="text-destructive/80">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Meta Insights */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Dominant:</span>
            <div className="font-medium">{result.meta_insights.dominant_paradigm}</div>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Consensus:</span>
            <div className="font-medium">{result.meta_insights.consensus_level}%</div>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Volatility:</span>
            <div className="font-medium">{result.meta_insights.volatility_regime}</div>
          </div>
          <div className="p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Market Regime:</span>
            <div className="font-medium">{result.market_regime}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          Analyzed {result.news_count} news items • 40 Modules Active • ABLE-HF 3.0 Engine
        </div>
      </CardContent>
    </Card>
  );
};
