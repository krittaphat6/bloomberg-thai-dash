import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIntelligenceStore } from '@/stores/IntelligenceStore';
import { AlertTriangle, TrendingDown, Activity } from 'lucide-react';

export const ThreatPanel = () => {
  const { threats } = useIntelligenceStore();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'market': return TrendingDown;
      case 'systemic': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Active Threats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {threats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No active threats detected
            </div>
          ) : (
            <div className="space-y-3">
              {threats.map((threat) => {
                const Icon = getTypeIcon(threat.type);
                return (
                  <div
                    key={threat.id}
                    className="p-4 bg-background/50 rounded border border-primary/10 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <h4 className="font-semibold text-sm">{threat.title}</h4>
                      </div>
                      <Badge variant="outline" className={getSeverityColor(threat.severity)}>
                        {threat.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{threat.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex gap-3">
                        <span>Probability: {(threat.probability * 100).toFixed(0)}%</span>
                        <span>Impact: {(threat.impact * 100).toFixed(0)}%</span>
                      </div>
                      <span className="text-muted-foreground">
                        {threat.symbols.join(', ')}
                      </span>
                    </div>
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
