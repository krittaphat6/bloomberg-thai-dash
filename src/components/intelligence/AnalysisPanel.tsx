import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIntelligenceStore } from '@/stores/IntelligenceStore';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const AnalysisPanel = () => {
  const { predictions } = useIntelligenceStore();

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          AI Predictions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {predictions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No predictions available
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.map((prediction) => {
                const Icon = getDirectionIcon(prediction.direction);
                return (
                  <div
                    key={prediction.symbol}
                    className="p-4 bg-background/50 rounded border border-primary/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${getDirectionColor(prediction.direction)}`} />
                        <h4 className="font-bold">{prediction.symbol}</h4>
                      </div>
                      <Badge variant="outline">
                        {(prediction.confidence * 100).toFixed(0)}% Confidence
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Target:</span>{' '}
                        <span className="font-semibold">${prediction.targetPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeframe:</span>{' '}
                        <span className="font-semibold">{prediction.timeframe}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{prediction.reasoning}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
