import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIntelligenceStore } from '@/stores/IntelligenceStore';
import { foundryCore } from '@/services/foundry/FoundryCore';
import { dataLakeManager } from '@/services/foundry/DataLakeManager';
import { dataPipelineService } from '@/services/DataPipelineService';
import { DEFAULT_SYMBOLS } from '@/config/DataSourceConfig';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Brain, Satellite, Shield, TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

export const ControlRoom = () => {
  const { systemStatus, analytics, threats, alerts, updateSystemStatus, updateAnalytics, addThreat } = useIntelligenceStore();
  const [lakeStats, setLakeStats] = useState<any>(null);
  const [liveData, setLiveData] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Initialize all systems
    initializeSystems();
    
    // Fetch data lake statistics
    fetchDataLakeStats();

    // Start real data collection
    startDataCollection();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('market-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data'
        },
        (payload) => {
          console.log('📊 New market data:', payload);
          updateLiveData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      dataPipelineService.cleanup();
    };
  }, []);

  const initializeSystems = async () => {
    console.log('🚀 Initializing ABLE Intelligence Platform...');
    
    updateSystemStatus('foundry', 'idle');
    updateSystemStatus('gotham', 'idle');
    updateSystemStatus('apollo', 'idle');
    updateSystemStatus('skynet', 'idle');
  };

  const fetchDataLakeStats = async () => {
    try {
      const stats = await dataLakeManager.getStatistics();
      setLakeStats(stats);
      
      updateAnalytics({
        totalDataPoints: stats.totalRecords || 0,
        anomaliesDetected: stats.alerts?.anomaly || 0,
        correlationsFound: stats.alerts?.correlation || 0,
        alertsGenerated: stats.alerts?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching data lake stats:', error);
    }
  };

  const startDataCollection = async () => {
    try {
      updateSystemStatus('skynet', 'active');
      console.log('🛰️ Starting SKYNET data collection...');

      // Fetch market data from real APIs
      const quotes = await dataPipelineService.fetchMarketData(DEFAULT_SYMBOLS);
      console.log(`📊 Fetched ${quotes.length} quotes from market`);

      if (quotes.length === 0) {
        console.warn('⚠️ No data fetched, using fallback');
        updateSystemStatus('skynet', 'error');
        return;
      }

      // Ingest into Foundry for processing
      updateSystemStatus('foundry', 'active');
      for (const quote of quotes) {
        await foundryCore.ingestDataStream('market-data', {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          change_percent: quote.changePercent,
          volume: quote.volume,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          source: quote.source,
        });
      }

      // Detect anomalies (Gotham)
      updateSystemStatus('gotham', 'active');
      const anomalyReport = await foundryCore.detectAnomalies(quotes);
      console.log(`🔍 Detected ${anomalyReport.anomalies.length} anomalies`);

      // Add threats to store
      for (const anomaly of anomalyReport.anomalies.slice(0, 5)) {
        addThreat({
          id: `threat-${Date.now()}-${Math.random()}`,
          title: `${anomaly.type?.toUpperCase() || 'ANOMALY'}: ${anomaly.symbol}`,
          severity: anomaly.severity as 'low' | 'medium' | 'high' | 'critical',
          description: `Anomaly detected with ${anomaly.deviation.toFixed(2)}% deviation`,
          type: 'market',
          symbols: [anomaly.symbol],
          probability: 0.75,
          impact: anomaly.severity === 'high' ? 0.8 : 0.5,
          timestamp: new Date(),
        });
      }

      // Update analytics (Apollo)
      updateSystemStatus('apollo', 'active');
      updateAnalytics({
        totalDataPoints: quotes.length,
        anomaliesDetected: anomalyReport.anomalies.length,
        correlationsFound: 0,
        alertsGenerated: anomalyReport.anomalies.filter(a => a.severity === 'high').length,
      });

      // Start real-time streaming
      setIsStreaming(true);
      await dataPipelineService.startRealtimeStream(DEFAULT_SYMBOLS);

      console.log('✅ Intelligence Platform fully operational');

      // Refresh data every 60 seconds
      setInterval(async () => {
        const newQuotes = await dataPipelineService.fetchMarketData(DEFAULT_SYMBOLS);
        if (newQuotes.length > 0) {
          for (const quote of newQuotes) {
            await foundryCore.ingestDataStream('market-data', {
              symbol: quote.symbol,
              price: quote.price,
              change: quote.change,
              change_percent: quote.changePercent,
              volume: quote.volume,
              high: quote.high,
              low: quote.low,
              open: quote.open,
              source: quote.source,
            });
          }
        }
      }, 60000);

    } catch (error) {
      console.error('❌ Error in data collection:', error);
      updateSystemStatus('skynet', 'error');
    }
  };

  const updateLiveData = (newData: any) => {
    setLiveData(prev => {
      const updated = [newData, ...prev].slice(0, 10);
      return updated;
    });
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
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center justify-between">
              Total Data Points
              {isStreaming && <Badge variant="outline" className="text-xs animate-pulse">LIVE</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-400" />
              <p className="text-2xl font-bold text-blue-400">{analytics.totalDataPoints.toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Real-time market data streaming</p>
          </CardContent>
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

      {/* Live Market Data Stream */}
      {liveData.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
            Live Market Data Stream
          </h3>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {liveData.map((data, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{data.symbol}</Badge>
                  <div>
                    <div className="font-semibold">${parseFloat(data.price).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{data.source}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {parseFloat(data.change) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={parseFloat(data.change) >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {parseFloat(data.change).toFixed(2)} ({parseFloat(data.change_percent).toFixed(2)}%)
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Vol: {parseInt(data.volume).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
