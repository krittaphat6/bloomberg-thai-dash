// src/components/TopNews/FinBERTBadge.tsx
// FinBERT Sentiment Badge for individual news items

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Brain } from 'lucide-react';

interface FinBERTResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface FinBERTBadgeProps {
  result: FinBERTResult;
  compact?: boolean;
}

export function FinBERTBadge({ result, compact = false }: FinBERTBadgeProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      case 'negative': return 'border-red-500/50 bg-red-500/10 text-red-400';
      default: return 'border-zinc-500/50 bg-zinc-500/10 text-zinc-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-zinc-400';
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '➖';
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant="outline" 
              className={`text-[9px] px-1.5 py-0.5 ${getSentimentColor(result.sentiment)}`}
            >
              <Brain className="w-2.5 h-2.5 mr-0.5" />
              {result.confidence}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 border-zinc-700 p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-white">FinBERT Analysis</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="text-center p-1 bg-emerald-500/10 rounded">
                  <p className="text-emerald-400">Positive</p>
                  <p className="text-white font-bold">{(result.scores.positive * 100).toFixed(1)}%</p>
                </div>
                <div className="text-center p-1 bg-zinc-500/10 rounded">
                  <p className="text-zinc-400">Neutral</p>
                  <p className="text-white font-bold">{(result.scores.neutral * 100).toFixed(1)}%</p>
                </div>
                <div className="text-center p-1 bg-red-500/10 rounded">
                  <p className="text-red-400">Negative</p>
                  <p className="text-white font-bold">{(result.scores.negative * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${getSentimentColor(result.sentiment)}`}>
      <Brain className="w-3 h-3" />
      <span className="text-[10px] font-medium">
        {getSentimentEmoji(result.sentiment)} {result.sentiment.toUpperCase()}
      </span>
      <span className={`text-[10px] ${getConfidenceColor(result.confidence)}`}>
        {result.confidence}%
      </span>
    </div>
  );
}

// Mini version for news list items
export function FinBERTMini({ sentiment, confidence }: { sentiment: string; confidence: number }) {
  const color = sentiment === 'positive' ? 'emerald' : sentiment === 'negative' ? 'red' : 'zinc';
  
  return (
    <Badge 
      variant="outline" 
      className={`text-[8px] px-1 py-0 border-${color}-500/30 text-${color}-400 bg-${color}-500/5`}
    >
      🧠 {confidence}%
    </Badge>
  );
}

export default FinBERTBadge;
