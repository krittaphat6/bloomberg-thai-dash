import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIntelligenceStore } from '@/stores/IntelligenceStore';
import { foundryCore } from '@/services/foundry/FoundryCore';
import { dataLakeManager } from '@/services/foundry/DataLakeManager';
import { Activity, Database, Brain, Satellite, Shield, TrendingUp, AlertTriangle } from 'lucide-react';

export const ControlRoom = () => {
  const { systemStatus, analytics, threats, alerts, updateSystemStatus, updateAnalytics } = useIntelligenceStore();
  const [lakeStats, setLakeStats] = useState<any>(null);

  useEffect(() => {
    // Initialize all systems
    initializeSystems();
    
    // Fetch data lake statistics
    dataLakeManager.getStatistics().then(stats => {
      setLakeStats(stats);
      updateAnalytics({
        totalDataPoints: stats.totalRecords.market_data,
        alertsGenerated: stats.alertsSummary.total
      });
    });
  }, []);

  const initializeSystems = async () => {
    console.log('🚀 Initializing ABLE Intelligence Platform...');
    
    updateSystemStatus('foundry', 'active');
    updateSystemStatus('gotham', 'active');
    updateSystemStatus('apollo', 'active');
    updateSystemStatus('skynet', 'active');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'idle': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const modules = [
    { name: 'FOUNDRY', icon: Database, key: 'foundry', description: 'Data Processing Core' },
    { name: 'GOTHAM', icon: Shield, key: 'gotham', description: 'Threat Detection' },
    { name: 'APOLLO', icon: Brain, key: 'apollo', description: 'AI Decision Engine' },
    { name: 'SKYNET', icon: Satellite, key: 'skynet', description: 'Data Collection' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-primary animate-pulse" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
            ABLE INTELLIGENCE PLATFORM
          </h1>
        </div>
        <p className="text-muted-foreground">Advanced Analytics • Real-time Processing • Predictive Intelligence</p>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const status = systemStatus[module.key as keyof typeof systemStatus];
          
          return (
            <Card key={module.name} className="p-4 bg-card/50 backdrop-blur border-primary/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm">{module.name}</h3>
                </div>
                <Badge variant="outline" className={getStatusColor(status)}>
                  {status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{module.description}</p>
              
              {/* Status indicator */}
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  status === 'active' ? 'bg-green-500' : 
                  status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {status === 'active' ? 'Processing...' : 
                   status === 'idle' ? 'Standby' : 'Error detected'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Total Data Points</p>
              <p className="text-2xl font-bold text-blue-400">{analytics.totalDataPoints.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Anomalies Detected</p>
              <p className="text-2xl font-bold text-red-400">{analytics.anomaliesDetected}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">Correlations Found</p>
              <p className="text-2xl font-bold text-purple-400">{analytics.correlationsFound}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-bold text-green-400">{alerts.filter(a => !a.isRead).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Lake Statistics */}
      {lakeStats && (
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Lake Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Market Data Records</p>
              <p className="text-xl font-bold text-primary">{lakeStats.totalRecords.market_data}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sentiment Records</p>
              <p className="text-xl font-bold text-cyan-400">{lakeStats.totalRecords.sentiment_data}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Unique Symbols</p>
              <p className="text-xl font-bold text-purple-400">{lakeStats.uniqueSymbols}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data Marts</p>
              <p className="text-xl font-bold text-green-400">{lakeStats.dataMarts}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Alert Distribution</p>
            <div className="flex gap-4">
              <Badge variant="destructive" className="bg-red-500/20">
                High: {lakeStats.alertsSummary.high}
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                Medium: {lakeStats.alertsSummary.medium}
              </Badge>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                Low: {lakeStats.alertsSummary.low}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Active Threats */}
      {threats.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur border-red-500/20">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Active Threats ({threats.length})
          </h3>
          
          <div className="space-y-2">
            {threats.slice(0, 5).map((threat) => (
              <div key={threat.id} className="flex items-center justify-between p-3 rounded bg-background/50 border border-border">
                <div className="flex-1">
                  <p className="font-medium text-sm">{threat.title}</p>
                  <p className="text-xs text-muted-foreground">{threat.description}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    threat.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                    threat.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                  }
                >
                  {threat.severity.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
