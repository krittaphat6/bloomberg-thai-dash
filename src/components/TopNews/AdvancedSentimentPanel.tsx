// src/components/TopNews/AdvancedSentimentPanel.tsx
// Advanced Sentiment Stats Panel - macro-news-sentiment-trading style
// Based on: https://github.com/yukepenn/macro-news-sentiment-trading

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Zap, Target, BarChart3 } from 'lucide-react';
import { SentimentFeatures, BacktestStats, TradingSignal } from '@/services/sentimentFeatureService';

interface AdvancedSentimentPanelProps {
  features: SentimentFeatures | null;
  backtestStats?: BacktestStats | null;
  signal?: { signal: TradingSignal; strength: number; reasoning: string[] } | null;
  isLoading?: boolean;
}

export function AdvancedSentimentPanel({ 
  features, 
  backtestStats, 
  signal,
  isLoading 
}: AdvancedSentimentPanelProps) {
  if (!features) return null;

  const getMomentumIcon = (momentum: number) => {
    if (momentum > 0.05) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (momentum < -0.05) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  const getSignalColor = (sig: TradingSignal | undefined) => {
    switch (sig) {
      case 'STRONG_BUY': return 'from-emerald-600 to-green-500';
      case 'BUY': return 'from-emerald-500/70 to-green-400/70';
      case 'STRONG_SELL': return 'from-red-600 to-rose-500';
      case 'SELL': return 'from-red-500/70 to-rose-400/70';
      default: return 'from-zinc-600 to-zinc-500';
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border-indigo-500/30 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-indigo-300">Advanced Sentiment Features</h3>
            <p className="text-[10px] text-zinc-500">macro-news-sentiment-trading style</p>
          </div>
        </div>
        {features.article_spike && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            SPIKE +{features.spike_magnitude}σ
          </Badge>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Sentiment Mean */}
        <div className="p-3 bg-black/30 rounded-lg">
          <p className="text-[10px] text-zinc-500 mb-1">Sentiment Mean</p>
          <p className={`text-xl font-bold ${
            features.sentiment_mean > 0.1 ? 'text-emerald-400' :
            features.sentiment_mean < -0.1 ? 'text-red-400' : 'text-zinc-400'
          }`}>
            {features.sentiment_mean > 0 ? '+' : ''}{(features.sentiment_mean * 100).toFixed(1)}%
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">
            σ={features.sentiment_std.toFixed(3)}
          </p>
        </div>

        {/* Momentum */}
        <div className="p-3 bg-black/30 rounded-lg">
          <p className="text-[10px] text-zinc-500 mb-1">Momentum</p>
          <div className="flex items-center gap-1">
            {getMomentumIcon(features.sentiment_momentum)}
            <p className={`text-xl font-bold ${
              features.sentiment_momentum > 0 ? 'text-emerald-400' : 
              features.sentiment_momentum < 0 ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {features.sentiment_momentum > 0 ? '+' : ''}{(features.sentiment_momentum * 100).toFixed(1)}%
            </p>
          </div>
          <p className="text-[9px] text-zinc-600 mt-0.5">
            EMA: {(features.sentiment_ema * 100).toFixed(1)}%
          </p>
        </div>

        {/* Goldstein Impact */}
        <div className="p-3 bg-black/30 rounded-lg">
          <p className="text-[10px] text-zinc-500 mb-1">Goldstein Impact</p>
          <div className="flex items-center gap-2">
            <p className={`text-xl font-bold ${
              features.goldstein_mean >= 5 ? 'text-orange-400' :
              features.goldstein_mean >= 3 ? 'text-yellow-400' : 'text-zinc-400'
            }`}>
              {features.goldstein_mean.toFixed(1)}
            </p>
            <span className="text-[10px] text-zinc-600">/10</span>
          </div>
          <p className="text-[9px] text-zinc-600 mt-0.5">
            Max: {features.goldstein_max.toFixed(1)}
          </p>
        </div>

        {/* Confidence */}
        <div className="p-3 bg-black/30 rounded-lg">
          <p className="text-[10px] text-zinc-500 mb-1">Avg Confidence</p>
          <p className={`text-xl font-bold ${
            features.avg_confidence >= 75 ? 'text-emerald-400' :
            features.avg_confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {features.avg_confidence}%
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">
            High conf: {features.high_confidence_count}
          </p>
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="mb-4">
        <p className="text-[10px] text-zinc-500 mb-2">Sentiment Distribution</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-emerald-400" 
            style={{ width: `${features.bullish_ratio * 100}%` }} 
          />
          <div 
            className="bg-gradient-to-r from-zinc-500 to-zinc-400" 
            style={{ width: `${features.neutral_ratio * 100}%` }} 
          />
          <div 
            className="bg-gradient-to-r from-red-500 to-red-400" 
            style={{ width: `${features.bearish_ratio * 100}%` }} 
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px]">
          <span className="text-emerald-400">🟢 {(features.bullish_ratio * 100).toFixed(0)}% Bullish</span>
          <span className="text-zinc-400">⚪ {(features.neutral_ratio * 100).toFixed(0)}% Neutral</span>
          <span className="text-red-400">🔴 {(features.bearish_ratio * 100).toFixed(0)}% Bearish</span>
        </div>
      </div>

      {/* Trading Signal */}
      {signal && (
        <div className={`p-3 rounded-lg bg-gradient-to-r ${getSignalColor(signal.signal)} mb-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-white" />
              <div>
                <p className="text-xs text-white/70">Trading Signal</p>
                <p className="text-lg font-bold text-white">{signal.signal}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70">Strength</p>
              <p className="text-lg font-bold text-white">{signal.strength}%</p>
            </div>
          </div>
          {signal.reasoning.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20">
              <div className="flex flex-wrap gap-1">
                {signal.reasoning.slice(0, 3).map((reason, i) => (
                  <Badge key={i} className="text-[9px] bg-white/10 text-white border-0">
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backtest Stats */}
      {backtestStats && backtestStats.total_signals > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 bg-black/20 rounded text-center">
            <p className="text-[9px] text-zinc-500">Sharpe</p>
            <p className={`text-sm font-bold ${
              backtestStats.sharpe_ratio > 1 ? 'text-emerald-400' :
              backtestStats.sharpe_ratio > 0 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {backtestStats.sharpe_ratio.toFixed(2)}
            </p>
          </div>
          <div className="p-2 bg-black/20 rounded text-center">
            <p className="text-[9px] text-zinc-500">Win Rate</p>
            <p className={`text-sm font-bold ${
              backtestStats.win_rate > 55 ? 'text-emerald-400' :
              backtestStats.win_rate > 45 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {backtestStats.win_rate}%
            </p>
          </div>
          <div className="p-2 bg-black/20 rounded text-center">
            <p className="text-[9px] text-zinc-500">Max DD</p>
            <p className="text-sm font-bold text-red-400">
              -{backtestStats.max_drawdown}%
            </p>
          </div>
          <div className="p-2 bg-black/20 rounded text-center">
            <p className="text-[9px] text-zinc-500">Signals</p>
            <p className="text-sm font-bold text-blue-400">
              {backtestStats.total_signals}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-indigo-500/20 flex items-center justify-between text-[9px] text-zinc-500">
        <span>Based on {features.sentiment_count} news items</span>
        <span>Recency-weighted: {(features.recency_weighted_sentiment * 100).toFixed(1)}%</span>
      </div>
    </Card>
  );
}

export default AdvancedSentimentPanel;
