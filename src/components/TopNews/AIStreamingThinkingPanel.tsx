import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Loader2, Zap, Search, BarChart3, CheckCircle2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete';
  detail?: string;
  duration?: number;
}

interface AIStreamingThinkingPanelProps {
  symbol: string;
  isActive: boolean;
  steps: ThinkingStep[];
  thinkingLogs: string[];
  geminiStream: string; // Live streaming text from Gemini
  progress: number;
  result?: {
    sentiment: string;
    confidence: number;
    P_up_pct: number;
    decision: string;
  };
}

export const AIStreamingThinkingPanel: React.FC<AIStreamingThinkingPanelProps> = ({
  symbol,
  isActive,
  steps,
  thinkingLogs,
  geminiStream,
  progress,
  result
}) => {
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll streaming text
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [geminiStream]);

  if (!isActive && thinkingLogs.length === 0 && !result) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/30 border-purple-500/30 p-4 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              AI Analysis Pipeline
              {isActive && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
            </h4>
            <p className="text-xs text-zinc-500">ABLE-HF 3.0 × Gemini 2.5 Flash</p>
          </div>
        </div>
        {result && (
          <Badge className={`${
            result.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
            result.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
            'bg-zinc-500/20 text-zinc-400'
          }`}>
            {result.decision} ({result.confidence}%)
          </Badge>
        )}
      </div>

      {/* 3-Step Progress */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {steps.map((step, idx) => (
          <div 
            key={step.id}
            className={`p-2 rounded-lg border transition-all ${
              step.status === 'running' ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30 animate-pulse' :
              step.status === 'complete' ? 'border-emerald-500/50 bg-emerald-500/5' :
              'border-zinc-700 bg-zinc-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {step.status === 'running' ? (
                <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
              ) : step.status === 'complete' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
              )}
              <span className="text-[10px] font-medium text-zinc-400">Step {idx + 1}</span>
            </div>
            <p className="text-xs text-white font-medium">{step.label}</p>
            {step.detail && (
              <p className="text-[10px] text-zinc-500 mt-0.5">{step.detail}</p>
            )}
            {step.duration && step.status === 'complete' && (
              <p className="text-[10px] text-emerald-500 mt-0.5">{step.duration}ms</p>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500">Processing...</span>
            <span className="text-[10px] text-purple-400">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-1.5 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:via-pink-500 [&>div]:to-emerald-500"
          />
        </div>
      )}

      {/* Step 1: Logs */}
      {thinkingLogs.length > 0 && (
        <div className="bg-black/50 rounded-lg p-2 mb-3 border border-zinc-800">
          <div className="flex items-center gap-1 mb-2">
            <Search className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-medium text-blue-400">Step 1: ค้นหาข่าว</span>
          </div>
          <div className="space-y-0.5 font-mono text-[10px]">
            {thinkingLogs.slice(-5).map((log, i) => (
              <div 
                key={i} 
                className={`flex items-start gap-1 ${
                  log.includes('✅') ? 'text-emerald-400' :
                  log.includes('❌') ? 'text-red-400' :
                  log.includes('🎯') ? 'text-yellow-400' :
                  log.includes('📊') || log.includes('📰') ? 'text-blue-400' :
                  'text-zinc-400'
                }`}
              >
                <span className="text-zinc-600 flex-shrink-0">›</span>
                <span className="break-words">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Gemini AI Streaming Response */}
      {geminiStream && (
        <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/30 rounded-lg p-3 mb-3 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-bold text-purple-400">Step 2: Gemini AI กำลังคิด...</span>
            </div>
            {isActive && steps.find(s => s.id === 'analyze')?.status === 'running' && (
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          
          <ScrollArea className="h-48 w-full">
            <div 
              ref={streamRef}
              className="font-mono text-xs text-purple-200 whitespace-pre-wrap leading-relaxed"
            >
              {geminiStream}
              {isActive && steps.find(s => s.id === 'analyze')?.status === 'running' && (
                <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse" />
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Step 3: ABLE-HF Results */}
      {thinkingLogs.some(l => l.includes('ABLE-HF')) && (
        <div className="bg-black/50 rounded-lg p-2 border border-emerald-500/20">
          <div className="flex items-center gap-1 mb-2">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400">Step 3: ABLE-HF 3.0</span>
          </div>
          <div className="space-y-0.5 font-mono text-[10px]">
            {thinkingLogs.filter(l => l.includes('ABLE-HF') || l.includes('Module') || l.includes('Boost') || l.includes('Total')).slice(-5).map((log, i) => (
              <div 
                key={i} 
                className="flex items-start gap-1 text-emerald-400"
              >
                <span className="text-zinc-600 flex-shrink-0">›</span>
                <span className="break-words">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Result Summary */}
      {result && !isActive && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-purple-500/10 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-400">{result.P_up_pct}%</p>
              <p className="text-[10px] text-zinc-500">P(Up)</p>
            </div>
            <div className={`rounded-lg p-2 ${
              result.sentiment === 'bullish' ? 'bg-emerald-500/10' :
              result.sentiment === 'bearish' ? 'bg-red-500/10' :
              'bg-zinc-500/10'
            }`}>
              <p className={`text-lg font-bold ${
                result.sentiment === 'bullish' ? 'text-emerald-400' :
                result.sentiment === 'bearish' ? 'text-red-400' :
                'text-zinc-400'
              }`}>
                {result.sentiment.toUpperCase()}
              </p>
              <p className="text-[10px] text-zinc-500">Sentiment</p>
            </div>
            <div className="bg-cyan-500/10 rounded-lg p-2">
              <p className="text-lg font-bold text-cyan-400">{result.confidence}%</p>
              <p className="text-[10px] text-zinc-500">Confidence</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AIStreamingThinkingPanel;
