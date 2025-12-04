import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIntelligenceStore } from '@/stores/IntelligenceStore';
import { globalMarketDataService, MarketQuote } from '@/services/intelligence/GlobalMarketDataService';
import { networkGraphService } from '@/services/intelligence/NetworkGraphService';
import { aiAnalysisEngine } from '@/services/intelligence/AIAnalysisEngine';
import { threatDetectionService } from '@/services/intelligence/ThreatDetectionService';
import { alertManager } from '@/services/intelligence/AlertManager';
import { NetworkVisualization } from './NetworkVisualization';
import { ThreatPanel } from './ThreatPanel';
import { AnalysisPanel } from './AnalysisPanel';
import { Activity, Database, Brain, Satellite, Shield, TrendingUp, Search, Globe, RefreshCw, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ControlRoomV2 = () => {
  const { 
    systemStatus, 
    analytics, 
    alerts,
    updateSystemStatus, 
    updateAnalytics, 
    addAlert,
    addThreat,
    addPrediction,
    updateMarketData
  } = useIntelligenceStore();
  const { toast } = useToast();
  
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [networkData, setNetworkData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'US' | 'GLOBAL' | 'TH'>('US');

  const MARKET_SYMBOLS = {
    US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'WMT'],
    GLOBAL: ['AAPL', 'MSFT', '0700.HK', 'TSM', 'SAP', 'TM', 'BABA', 'NVO', 'MC.PA', 'RIO.L'],
    TH: ['PTT.BK', 'ADVANC.BK', 'CPALL.BK', 'AOT.BK', 'KBANK.BK', 'SCB.BK', 'TRUE.BK', 'BBL.BK', 'GULF.BK', 'TOP.BK']
  };

  useEffect(() => {
    initializeSystem();
  }, [selectedMarket]);

  const initializeSystem = async () => {
    try {
      updateSystemStatus('foundry', 'idle');
      updateSystemStatus('gotham', 'idle');
      updateSystemStatus('apollo', 'idle');
      updateSystemStatus('skynet', 'idle');

      await fetchMarketData();
    } catch (error) {
      console.error('Initialization error:', error);
      toast({
        title: "System Error",
        description: "Failed to initialize intelligence platform",
        variant: "destructive"
      });
    }
  };

  const fetchMarketData = async () => {
    setIsLoading(true);
    updateSystemStatus('skynet', 'active');

    try {
      const symbols = MARKET_SYMBOLS[selectedMarket];
      const quotes = await globalMarketDataService.fetchGlobalMarketData(symbols);

      if (quotes.length === 0) {
        throw new Error('No data received');
      }

      setMarketData(quotes);
      updateSystemStatus('foundry', 'active');

      // Update store with market data
      quotes.forEach(quote => {
        updateMarketData(quote.symbol, {
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          high: quote.high,
          low: quote.low
        });
      });

      // Run AI Analysis
      updateSystemStatus('apollo', 'active');
      quotes.forEach(quote => {
        const prediction = aiAnalysisEngine.analyzePriceData({
          symbol: quote.symbol,
          price: quote.price,
          volume: quote.volume,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          close: quote.close,
          changePercent: quote.changePercent
        });
        addPrediction(prediction);
      });

      // Detect Threats
      updateSystemStatus('gotham', 'active');
      const threats = threatDetectionService.detectThreats(
        quotes.map(q => ({
          symbol: q.symbol,
          price: q.price,
          changePercent: q.changePercent,
          volume: q.volume,
          avgVolume: q.volume / 1.5
        }))
      );
      threats.forEach(threat => addThreat(threat));

      // Check Alerts
      quotes.forEach(quote => {
        const alertsTriggered = alertManager.checkAlerts({
          symbol: quote.symbol,
          changePercent: quote.changePercent,
          volumeRatio: 1.5
        });
        alertsTriggered.forEach(alert => {
          addAlert({
            title: alert.title,
            message: alert.message,
            type: alert.type,
            severity: alert.severity,
            symbol: alert.symbol
          });
          toast({
            title: alert.title,
            description: alert.message,
            variant: alert.severity === 'critical' || alert.severity === 'error' ? 'destructive' : 'default'
          });
        });
      });

      const connections = await globalMarketDataService.getMarketConnections(symbols);
      
      updateSystemStatus('gotham', 'active');
      const network = networkGraphService.createNetworkFromMarketData(quotes, connections);
      setNetworkData(network);

      updateSystemStatus('apollo', 'active');
      updateAnalytics({
        totalDataPoints: quotes.length,
        anomaliesDetected: quotes.filter(q => Math.abs(q.changePercent) > 5).length,
        correlationsFound: connections.length,
        alertsGenerated: quotes.filter(q => Math.abs(q.changePercent) > 3).length
      });

      quotes.forEach(quote => {
        if (Math.abs(quote.changePercent) > 5) {
          addAlert({
            title: `${quote.symbol} Large Movement`,
            message: `${quote.changePercent > 0 ? '📈' : '📉'} ${quote.symbol} moved ${quote.changePercent.toFixed(2)}%`,
            type: 'market',
            severity: Math.abs(quote.changePercent) > 10 ? 'critical' : 'warning'
          });
        }
      });

      updateSystemStatus('skynet', 'idle');
      updateSystemStatus('foundry', 'idle');
      updateSystemStatus('gotham', 'idle');
      updateSystemStatus('apollo', 'idle');

      toast({
        title: "Data Updated",
        description: `Loaded ${quotes.length} stocks from ${selectedMarket} market`,
      });

    } catch (error) {
      console.error('Market data fetch error:', error);
      updateSystemStatus('skynet', 'error');
      
      toast({
        title: "Data Fetch Failed",
        description: "Using fallback data. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const symbols = searchQuery.split(',').map(s => s.trim().toUpperCase());
    setIsLoading(true);
    
    try {
      const quotes = await globalMarketDataService.fetchGlobalMarketData(symbols);
      setMarketData(quotes);
      
      toast({
        title: "Search Complete",
        description: `Found ${quotes.length} stocks`,
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Could not fetch requested symbols",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
    { name: 'FOUNDRY', icon: Database, key: 'foundry', description: 'Data Processing' },
    { name: 'GOTHAM', icon: Shield, key: 'gotham', description: 'Threat Detection' },
    { name: 'APOLLO', icon: Brain, key: 'apollo', description: 'AI Analysis' },
    { name: 'SKYNET', icon: Satellite, key: 'skynet', description: 'Data Collection' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                ABLE INTELLIGENCE PLATFORM
              </h1>
              <p className="text-sm text-muted-foreground">Real-time Global Market Analysis • Palantir-Style Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMarketData}
              disabled={isLoading}
              className="bg-primary/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex gap-2">
            <Button
              variant={selectedMarket === 'US' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('US')}
              size="sm"
            >
              🇺🇸 US Market
            </Button>
            <Button
              variant={selectedMarket === 'GLOBAL' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('GLOBAL')}
              size="sm"
            >
              🌍 Global
            </Button>
            <Button
              variant={selectedMarket === 'TH' ? 'default' : 'outline'}
              onClick={() => setSelectedMarket('TH')}
              size="sm"
            >
              🇹🇭 Thailand
            </Button>
          </div>

          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Search symbols (e.g., AAPL, MSFT, GOOGL)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-background/50"
            />
            <Button onClick={handleSearch} size="sm" disabled={isLoading}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const status = systemStatus[module.key as keyof typeof systemStatus];
          
          return (
            <Card key={module.name} className="p-4 bg-card/50 backdrop-blur border-primary/20">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm">{module.name}</h3>
                </div>
                <Badge variant="outline" className={getStatusColor(status)}>
                  {status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{module.description}</p>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="network" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-background/50">
          <TabsTrigger value="network">Network Graph</TabsTrigger>
          <TabsTrigger value="data">Market Data</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="space-y-4">
          {networkData ? (
            <NetworkVisualization
              data={networkData}
              title={`${selectedMarket} Market Network`}
              height={700}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading network data...</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card className="p-4">
            <CardHeader>
              <CardTitle>Live Market Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {marketData.map(quote => (
                  <div
                    key={quote.symbol}
                    className="flex items-center justify-between p-3 bg-background/50 rounded border border-primary/10 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold">{quote.symbol}</div>
                      <Badge variant="outline">{quote.exchange}</Badge>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xl font-bold">${quote.price.toFixed(2)}</div>
                        <div className={`text-sm ${quote.changePercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {quote.changePercent > 0 ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>Vol: {(quote.volume / 1e6).toFixed(2)}M</div>
                        <div>H: ${quote.high.toFixed(2)} L: ${quote.low.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <ThreatPanel />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <AnalysisPanel />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Data Points</p>
                  <p className="text-2xl font-bold text-blue-400">{analytics.totalDataPoints}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Anomalies</p>
                  <p className="text-2xl font-bold text-red-400">{analytics.anomaliesDetected}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Correlations</p>
                  <p className="text-2xl font-bold text-purple-400">{analytics.correlationsFound}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.alertsGenerated}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
