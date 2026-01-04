import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Dice6, Save, Download, RotateCcw, Plus, X, TrendingUp,
  TrendingDown, Target, AlertTriangle, HelpCircle, FileDown,
  Play, Pause, BarChart3, LineChartIcon, PieChart as PieChartIcon, Upload, FileSpreadsheet,
  Zap, Shield, Activity, Clock, DollarSign, Percent, Scale
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MonteCarloCSVImport from './MonteCarloCSVImport';
import {
  AdvancedSimConfig,
  AdvancedSimResult,
  AdvancedSimStats,
  SimScenario,
  MarketRegime,
  DEFAULT_REGIMES,
  DEFAULT_ADVANCED_CONFIG
} from '@/types/monteCarlo';
import {
  runMonteCarloSimulations,
  calculateAdvancedStatistics,
  calculateOptimalF
} from '@/services/monteCarloService';

// ============================================
// PRESETS
// ============================================
const PRESETS: Record<string, { name: string; config: Partial<AdvancedSimConfig> }> = {
  conservative: {
    name: 'Conservative',
    config: { winRate: 65, avgWin: 120, avgLoss: 100, riskPerTrade: 1 }
  },
  balanced: {
    name: 'Balanced',
    config: { winRate: 60, avgWin: 150, avgLoss: 100, riskPerTrade: 2 }
  },
  aggressive: {
    name: 'Aggressive',
    config: { winRate: 55, avgWin: 200, avgLoss: 100, riskPerTrade: 3 }
  },
  scalper: {
    name: 'Scalper',
    config: { winRate: 70, avgWin: 50, avgLoss: 50, riskPerTrade: 0.5, numTrades: 500 }
  },
  swing: {
    name: 'Swing Trader',
    config: { winRate: 50, avgWin: 250, avgLoss: 100, riskPerTrade: 2, numTrades: 50 }
  }
};

// ============================================
// COMPONENT
// ============================================
const MonteCarloSimulator: React.FC = () => {
  const [config, setConfig] = useState<AdvancedSimConfig>(DEFAULT_ADVANCED_CONFIG);
  const [scenarios, setScenarios] = useState<SimScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('parameters');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [dataSource, setDataSource] = useState<'manual' | 'csv'>('manual');

  // Get active scenario
  const activeScenario = useMemo(() => 
    scenarios.find(s => s.id === activeScenarioId), 
    [scenarios, activeScenarioId]
  );

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem('mc-config-v2');
    if (saved) {
      try {
        setConfig({ ...DEFAULT_ADVANCED_CONFIG, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runSimulation();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveConfig();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);

  // Run simulation
  const runSimulation = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);

    const scenarioId = `scenario-${Date.now()}`;
    const newScenario: SimScenario = {
      id: scenarioId,
      name: `Scenario ${scenarios.length + 1}`,
      description: config.enableRegimes ? 'With Market Regimes' : 'Standard',
      config: { ...config },
      results: null,
      stats: null,
      status: 'running',
      progress: 0,
      createdAt: new Date(),
      color: `hsl(${(scenarios.length * 60) % 360}, 70%, 50%)`
    };

    setScenarios(prev => [...prev, newScenario]);
    setActiveScenarioId(scenarioId);
    setActiveTab('results');

    try {
      const results = await runMonteCarloSimulations(config, (prog) => {
        setProgress(prog);
        setScenarios(prev => prev.map(s => 
          s.id === scenarioId ? { ...s, progress: prog } : s
        ));
      });

      const stats = calculateAdvancedStatistics(results, config);

      setScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, results, stats, status: 'completed', progress: 100 } : s
      ));

      toast.success(`✅ Simulation completed! ${config.numSimulations.toLocaleString()} runs`);
    } catch (error) {
      setScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, status: 'error' } : s
      ));
      toast.error('Simulation failed');
    }

    setIsRunning(false);
    setProgress(100);
  }, [config, scenarios.length, isRunning]);

  // Apply preset
  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setConfig(prev => ({ ...prev, ...preset.config }));
      toast.success(`Applied ${preset.name} preset`);
    }
  };

  // Save/Load config
  const saveConfig = () => {
    localStorage.setItem('mc-config-v2', JSON.stringify(config));
    toast.success('💾 Configuration saved');
  };

  // Remove scenario
  const removeScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios.length > 1 ? scenarios[0].id : null);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (!activeScenario?.results) return;
    const headers = ['Simulation', 'Final Capital', 'Return', 'Return %', 'Max DD %'];
    const rows = activeScenario.results.map((r, i) => [
      i + 1, r.finalCapital.toFixed(2), r.totalReturn.toFixed(2),
      r.returnPercent.toFixed(2), r.maxDrawdown.toFixed(2)
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monte-carlo-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('📊 CSV exported');
  };

  // Handle CSV Import
  const handleCSVImport = (data: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
  }) => {
    setConfig(prev => ({
      ...prev,
      winRate: data.winRate,
      avgWin: data.avgWin,
      avgLoss: data.avgLoss,
      numTrades: data.totalTrades
    }));
    setDataSource('csv');
    toast.success('Trade data imported! Run simulation to see results.');
  };

  // Update regime
  const updateRegime = (regimeId: string, updates: Partial<MarketRegime>) => {
    setConfig(prev => ({
      ...prev,
      regimes: prev.regimes.map(r => 
        r.id === regimeId ? { ...r, ...updates } : r
      )
    }));
  };

  // Calculate total regime probability
  const totalRegimeProbability = useMemo(() => 
    config.regimes.reduce((sum, r) => sum + r.probability, 0),
    [config.regimes]
  );

  // R:R ratio
  const riskRewardRatio = config.avgLoss > 0 ? (config.avgWin / config.avgLoss).toFixed(2) : '0';

  // Sampled equity curves for chart
  const equityCurves = useMemo(() => {
    if (!activeScenario?.results) return [];
    const sampleSize = Math.min(50, activeScenario.results.length);
    const indices = Array.from({ length: sampleSize }, () => 
      Math.floor(Math.random() * activeScenario.results!.length)
    );
    
    const maxLen = Math.max(...activeScenario.results.map(r => r.equityCurve.length));
    const data: any[] = [];
    
    for (let i = 0; i < maxLen; i++) {
      const point: any = { trade: i };
      indices.forEach((idx, j) => {
        const curve = activeScenario.results![idx].equityCurve;
        point[`sim${j}`] = curve[i] || curve[curve.length - 1];
      });
      
      const allValues = activeScenario.results!.map(r => 
        r.equityCurve[i] || r.equityCurve[r.equityCurve.length - 1]
      ).sort((a, b) => a - b);
      point.median = allValues[Math.floor(allValues.length / 2)];
      
      data.push(point);
    }
    return data;
  }, [activeScenario?.results]);

  // Regime pie chart data
  const regimePieData = useMemo(() => 
    config.regimes.map(r => ({
      name: r.name,
      value: r.probability,
      color: r.color,
      icon: r.icon
    })),
    [config.regimes]
  );

  // Compare scenarios data
  const compareData = useMemo(() => {
    if (selectedCompareIds.length < 2) return null;
    const selected = scenarios.filter(s => selectedCompareIds.includes(s.id) && s.stats);
    if (selected.length < 2) return null;

    return {
      scenarios: selected,
      radarData: [
        { metric: 'Win Rate', ...Object.fromEntries(selected.map(s => [s.name, s.stats!.avgWinRate])) },
        { metric: 'Sharpe', ...Object.fromEntries(selected.map(s => [s.name, Math.min(s.stats!.sharpeRatio * 20, 100)])) },
        { metric: 'Sortino', ...Object.fromEntries(selected.map(s => [s.name, Math.min(s.stats!.sortinoRatio * 10, 100)])) },
        { metric: 'Win Prob', ...Object.fromEntries(selected.map(s => [s.name, s.stats!.winProbability])) },
        { metric: 'Profit Factor', ...Object.fromEntries(selected.map(s => [s.name, Math.min(s.stats!.profitFactor * 25, 100)])) },
      ]
    };
  }, [selectedCompareIds, scenarios]);

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Dice6 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-primary">MONTE CARLO SIMULATOR</h1>
          {config.enableRegimes && (
            <Badge variant="outline" className="text-xs">Regimes</Badge>
          )}
          {config.sequenceRiskMode !== 'normal' && (
            <Badge variant="secondary" className="text-xs">{config.sequenceRiskMode}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!activeScenario?.results}>
            <FileDown className="w-4 h-4 mr-1" /> Export
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Run thousands of simulations with market regimes, sequence risk, and advanced metrics.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input Controls */}
        <div className="w-1/4 min-w-[280px] border-r border-border bg-card/50">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Data Source & Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase">Data Source</Label>
                  {dataSource === 'csv' && (
                    <span className="text-xs text-primary">📊 From CSV</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select onValueChange={applyPreset}>
                    <SelectTrigger className="bg-background text-xs h-8">
                      <SelectValue placeholder="Preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCSVImport(true)}
                    className="h-8 text-xs"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Import CSV
                  </Button>
                </div>
              </div>

              {/* CSV Import Dialog */}
              <Dialog open={showCSVImport} onOpenChange={setShowCSVImport}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import TradingView CSV</DialogTitle>
                  </DialogHeader>
                  <MonteCarloCSVImport
                    onImport={handleCSVImport}
                    onClose={() => setShowCSVImport(false)}
                  />
                </DialogContent>
              </Dialog>

              {/* Strategy Parameters */}
              <Card className="border-primary/20">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm text-primary">📊 Strategy Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-3">
                  {/* Win Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Win Rate</Label>
                      <span className="text-xs text-primary font-mono">{config.winRate}%</span>
                    </div>
                    <Slider
                      value={[config.winRate]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, winRate: v }))}
                      min={0} max={100} step={1}
                      className="[&_[role=slider]]:bg-primary"
                    />
                  </div>

                  {/* Avg Win/Loss */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Avg Win ($)</Label>
                      <Input
                        type="number"
                        value={config.avgWin}
                        onChange={e => setConfig(prev => ({ ...prev, avgWin: +e.target.value }))}
                        className="h-8 bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Avg Loss ($)</Label>
                      <Input
                        type="number"
                        value={config.avgLoss}
                        onChange={e => setConfig(prev => ({ ...prev, avgLoss: +e.target.value }))}
                        className="h-8 bg-background"
                      />
                    </div>
                  </div>

                  {/* Risk per Trade */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Risk per Trade</Label>
                      <span className="text-xs text-terminal-amber font-mono">{config.riskPerTrade}%</span>
                    </div>
                    <Slider
                      value={[config.riskPerTrade]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, riskPerTrade: v }))}
                      min={0.1} max={10} step={0.1}
                      className="[&_[role=slider]]:bg-terminal-amber"
                    />
                  </div>

                  {/* R:R Display */}
                  <div className="flex justify-between p-2 bg-muted/50 rounded text-xs">
                    <span className="text-muted-foreground">Risk:Reward</span>
                    <span className="font-bold text-primary">1:{riskRewardRatio}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Account Setup */}
              <Card className="border-blue-500/20">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm text-blue-500">💵 Account Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Starting Capital ($)</Label>
                    <Input
                      type="number"
                      value={config.startingCapital}
                      onChange={e => setConfig(prev => ({ ...prev, startingCapital: +e.target.value }))}
                      className="h-8 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Number of Trades</Label>
                    <Input
                      type="number"
                      value={config.numTrades}
                      onChange={e => setConfig(prev => ({ ...prev, numTrades: +e.target.value }))}
                      className="h-8 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Position Sizing</Label>
                    <Select
                      value={config.positionSizing}
                      onValueChange={v => setConfig(prev => ({ ...prev, positionSizing: v as any }))}
                    >
                      <SelectTrigger className="h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixedPercent">Fixed % Risk</SelectItem>
                        <SelectItem value="fixedDollar">Fixed $ Amount</SelectItem>
                        <SelectItem value="kelly">Kelly Criterion</SelectItem>
                        <SelectItem value="halfKelly">Half Kelly</SelectItem>
                        <SelectItem value="quarterKelly">Quarter Kelly</SelectItem>
                        <SelectItem value="antiMartingale">Anti-Martingale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Simulation Settings */}
              <Card className="border-purple-500/20">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm text-purple-500">🎲 Simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Number of Simulations</Label>
                    <Select
                      value={config.numSimulations.toString()}
                      onValueChange={v => setConfig(prev => ({ ...prev, numSimulations: +v }))}
                    >
                      <SelectTrigger className="h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1000">1,000</SelectItem>
                        <SelectItem value="5000">5,000</SelectItem>
                        <SelectItem value="10000">10,000</SelectItem>
                        <SelectItem value="50000">50,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Advanced Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Advanced Options</Label>
                    <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                  </div>

                  {showAdvanced && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Include Slippage</Label>
                        <Switch
                          checked={config.includeSlippage}
                          onCheckedChange={v => setConfig(prev => ({ ...prev, includeSlippage: v }))}
                        />
                      </div>
                      {config.includeSlippage && (
                        <Input
                          type="number"
                          value={config.slippagePercent}
                          onChange={e => setConfig(prev => ({ ...prev, slippagePercent: +e.target.value }))}
                          className="h-7 text-xs bg-background"
                          placeholder="Slippage %"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Include Commission</Label>
                        <Switch
                          checked={config.includeCommission}
                          onCheckedChange={v => setConfig(prev => ({ ...prev, includeCommission: v }))}
                        />
                      </div>
                      {config.includeCommission && (
                        <Input
                          type="number"
                          value={config.commissionPerTrade}
                          onChange={e => setConfig(prev => ({ ...prev, commissionPerTrade: +e.target.value }))}
                          className="h-7 text-xs bg-background"
                          placeholder="$ per trade"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Compounding</Label>
                        <Switch
                          checked={config.enableCompounding}
                          onCheckedChange={v => setConfig(prev => ({ ...prev, enableCompounding: v }))}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={runSimulation}
                  disabled={isRunning}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 mr-2 animate-pulse" />
                      Running... {progress.toFixed(0)}%
                    </>
                  ) : (
                    <>
                      <Dice6 className="w-4 h-4 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>

                {isRunning && (
                  <Progress value={progress} className="h-2" />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={saveConfig}>
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfig(DEFAULT_ADVANCED_CONFIG)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                </div>
              </div>

              {/* Scenario List */}
              {scenarios.length > 0 && (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Scenarios ({scenarios.length})</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={() => setCompareMode(!compareMode)}
                      >
                        {compareMode ? 'Done' : 'Compare'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1">
                    {scenarios.map(s => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          activeScenarioId === s.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => !compareMode && setActiveScenarioId(s.id)}
                      >
                        <div className="flex items-center gap-2">
                          {compareMode && (
                            <input
                              type="checkbox"
                              checked={selectedCompareIds.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCompareIds(prev => [...prev, s.id]);
                                } else {
                                  setSelectedCompareIds(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className="w-4 h-4"
                            />
                          )}
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-xs font-medium">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.status === 'running' && (
                            <span className="text-xs text-muted-foreground">{s.progress.toFixed(0)}%</span>
                          )}
                          {s.status === 'completed' && s.stats && (
                            <span className={`text-xs ${s.stats.meanReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {s.stats.meanReturn >= 0 ? '+' : ''}{(s.stats.meanReturn / s.config.startingCapital * 100).toFixed(1)}%
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2 grid grid-cols-6 w-auto">
              <TabsTrigger value="parameters" className="text-xs">📊 Parameters</TabsTrigger>
              <TabsTrigger value="regimes" className="text-xs">🌪️ Regimes</TabsTrigger>
              <TabsTrigger value="sequence" className="text-xs">⚠️ Sequence</TabsTrigger>
              <TabsTrigger value="results" className="text-xs">📈 Results</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">🔬 Advanced</TabsTrigger>
              <TabsTrigger value="compare" className="text-xs">⚖️ Compare</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden p-4">
              {/* Parameters Tab */}
              <TabsContent value="parameters" className="h-full mt-0">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Strategy Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-primary">{config.winRate}%</div>
                        <div className="text-sm text-muted-foreground">Win Rate</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-primary">1:{riskRewardRatio}</div>
                        <div className="text-sm text-muted-foreground">Risk:Reward</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-primary">{config.riskPerTrade}%</div>
                        <div className="text-sm text-muted-foreground">Risk/Trade</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-3xl font-bold">${config.startingCapital.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Starting Capital</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-3xl font-bold">{config.numTrades}</div>
                        <div className="text-sm text-muted-foreground">Trades</div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-3xl font-bold">{config.numSimulations.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Simulations</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                      <h4 className="font-medium mb-2">Optimal Position Sizing</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Kelly</div>
                          <div className="font-bold">{(calculateOptimalF(config.winRate, config.avgWin, config.avgLoss) * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Half Kelly</div>
                          <div className="font-bold">{(calculateOptimalF(config.winRate, config.avgWin, config.avgLoss) * 50).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Quarter Kelly</div>
                          <div className="font-bold">{(calculateOptimalF(config.winRate, config.avgWin, config.avgLoss) * 25).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Current</div>
                          <div className="font-bold text-primary">{config.riskPerTrade}%</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Market Regimes Tab */}
              <TabsContent value="regimes" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.enableRegimes}
                          onCheckedChange={v => setConfig(prev => ({ ...prev, enableRegimes: v }))}
                        />
                        <Label>Enable Regime Simulation</Label>
                      </div>
                      {config.enableRegimes && (
                        <Badge variant={totalRegimeProbability === 100 ? 'default' : 'destructive'}>
                          Total: {totalRegimeProbability}%
                        </Badge>
                      )}
                    </div>

                    {config.enableRegimes && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {config.regimes.map(regime => (
                            <Card key={regime.id} className="border" style={{ borderColor: regime.color + '50' }}>
                              <CardHeader className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{regime.icon}</span>
                                  <CardTitle className="text-sm" style={{ color: regime.color }}>
                                    {regime.name}
                                  </CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 p-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>Probability</span>
                                    <span>{regime.probability}%</span>
                                  </div>
                                  <Slider
                                    value={[regime.probability]}
                                    onValueChange={([v]) => updateRegime(regime.id, { probability: v })}
                                    min={0} max={100} step={5}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>Win Rate Modifier</span>
                                    <span>{regime.winRateModifier > 0 ? '+' : ''}{regime.winRateModifier}%</span>
                                  </div>
                                  <Slider
                                    value={[regime.winRateModifier + 30]}
                                    onValueChange={([v]) => updateRegime(regime.id, { winRateModifier: v - 30 })}
                                    min={0} max={60} step={1}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>Win Multiplier</span>
                                    <span>{regime.avgWinMultiplier.toFixed(1)}x</span>
                                  </div>
                                  <Slider
                                    value={[regime.avgWinMultiplier * 50]}
                                    onValueChange={([v]) => updateRegime(regime.id, { avgWinMultiplier: v / 50 })}
                                    min={25} max={100} step={5}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>Loss Multiplier</span>
                                    <span>{regime.avgLossMultiplier.toFixed(1)}x</span>
                                  </div>
                                  <Slider
                                    value={[regime.avgLossMultiplier * 50]}
                                    onValueChange={([v]) => updateRegime(regime.id, { avgLossMultiplier: v / 50 })}
                                    min={25} max={100} step={5}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <Card>
                          <CardHeader className="py-2">
                            <CardTitle className="text-sm">Regime Distribution</CardTitle>
                          </CardHeader>
                          <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={regimePieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({ name, value }) => `${name}: ${value}%`}
                                >
                                  {regimePieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <RechartsTooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <div className="space-y-2">
                          <Label className="text-xs">Regime Switch Frequency (avg trades)</Label>
                          <Slider
                            value={[config.regimeSwitchFrequency]}
                            onValueChange={([v]) => setConfig(prev => ({ ...prev, regimeSwitchFrequency: v }))}
                            min={10} max={100} step={5}
                          />
                          <div className="text-xs text-muted-foreground text-right">
                            {config.regimeSwitchFrequency} trades
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Sequence Risk Tab */}
              <TabsContent value="sequence" className="h-full mt-0">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Sequence Risk Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {(['normal', 'badStart', 'retirement'] as const).map(mode => (
                          <Card 
                            key={mode}
                            className={`cursor-pointer transition-colors ${
                              config.sequenceRiskMode === mode ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setConfig(prev => ({ ...prev, sequenceRiskMode: mode }))}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl mb-2">
                                {mode === 'normal' ? '✅' : mode === 'badStart' ? '💀' : '🏖️'}
                              </div>
                              <div className="font-medium">
                                {mode === 'normal' ? 'Normal' : mode === 'badStart' ? 'Bad Start' : 'Retirement'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {mode === 'normal' && 'Standard simulation'}
                                {mode === 'badStart' && 'Forced losses at start'}
                                {mode === 'retirement' && 'Regular withdrawals'}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {config.sequenceRiskMode === 'badStart' && (
                        <div className="p-4 bg-destructive/10 rounded-lg space-y-3">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-medium">Bad Start Mode</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Simulates what happens if you start trading during a losing streak.
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Forced Losses at Start</span>
                              <span className="font-bold">{config.badStartLosses}</span>
                            </div>
                            <Slider
                              value={[config.badStartLosses]}
                              onValueChange={([v]) => setConfig(prev => ({ ...prev, badStartLosses: v }))}
                              min={1} max={20} step={1}
                            />
                          </div>
                        </div>
                      )}

                      {config.sequenceRiskMode === 'retirement' && (
                        <div className="p-4 bg-primary/10 rounded-lg space-y-3">
                          <div className="flex items-center gap-2 text-primary">
                            <DollarSign className="w-5 h-5" />
                            <span className="font-medium">Retirement Mode</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Simulates withdrawing funds regularly while trading.
                          </p>
                          <div className="space-y-2">
                            <Label className="text-xs">Monthly Withdrawal ($)</Label>
                            <Input
                              type="number"
                              value={config.retirementWithdrawal}
                              onChange={e => setConfig(prev => ({ ...prev, retirementWithdrawal: +e.target.value }))}
                              className="bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="h-full mt-0">
                {activeScenario?.stats ? (
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-4 gap-3">
                        <Card className="border-primary/20">
                          <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground">Median Return</div>
                            <div className={`text-2xl font-bold ${activeScenario.stats.medianReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              ${activeScenario.stats.medianReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-primary/20">
                          <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground">Win Probability</div>
                            <div className="text-2xl font-bold text-primary">
                              {activeScenario.stats.winProbability.toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-terminal-amber/20">
                          <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground">Max Drawdown</div>
                            <div className="text-2xl font-bold text-terminal-amber">
                              -{activeScenario.stats.medianMaxDD.toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-destructive/20">
                          <CardContent className="p-3 text-center">
                            <div className="text-xs text-muted-foreground">Risk of Ruin</div>
                            <div className="text-2xl font-bold text-destructive">
                              {activeScenario.stats.probabilityOfRuin.toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Distribution Chart */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm">Return Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activeScenario.stats.returnDistribution}>
                              <defs>
                                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="midpoint"
                                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                              />
                              <YAxis
                                tickFormatter={v => `${v.toFixed(0)}%`}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                              />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Frequency']}
                              />
                              <Area
                                type="monotone"
                                dataKey="frequency"
                                stroke="hsl(var(--primary))"
                                fill="url(#returnGradient)"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Equity Curves */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm">Equity Curves (50 Paths)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={equityCurves}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="trade" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                              <YAxis
                                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                              />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                              />
                              {Array.from({ length: 50 }, (_, i) => (
                                <Line
                                  key={i}
                                  type="monotone"
                                  dataKey={`sim${i}`}
                                  stroke={`hsl(${(i * 7) % 360}, 70%, 60%)`}
                                  strokeWidth={1}
                                  strokeOpacity={0.2}
                                  dot={false}
                                />
                              ))}
                              <Line
                                type="monotone"
                                dataKey="median"
                                stroke="hsl(var(--primary))"
                                strokeWidth={3}
                                dot={false}
                                name="Median"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Dice6 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Run a simulation to see results</p>
                      <p className="text-xs mt-1">Press Ctrl+Enter to start</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Advanced Stats Tab */}
              <TabsContent value="advanced" className="h-full mt-0">
                {activeScenario?.stats ? (
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      {/* Risk Metrics */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Risk Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">VaR 95%</div>
                            <div className="font-bold text-destructive">${activeScenario.stats.var95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">VaR 99%</div>
                            <div className="font-bold text-destructive">${activeScenario.stats.var99.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">CVaR 95%</div>
                            <div className="font-bold text-destructive">${activeScenario.stats.cvar95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">CVaR 99%</div>
                            <div className="font-bold text-destructive">${activeScenario.stats.cvar99.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Performance Ratios */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Performance Ratios
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Sharpe</div>
                            <div className="font-bold">{activeScenario.stats.sharpeRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Sortino</div>
                            <div className="font-bold">{activeScenario.stats.sortinoRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Calmar</div>
                            <div className="font-bold">{activeScenario.stats.calmarRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">MAR</div>
                            <div className="font-bold">{activeScenario.stats.marRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Omega</div>
                            <div className="font-bold">{activeScenario.stats.omegaRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Tail Ratio</div>
                            <div className="font-bold">{activeScenario.stats.tailRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Ulcer Index</div>
                            <div className="font-bold">{activeScenario.stats.ulcerIndex.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Pain Index</div>
                            <div className="font-bold">{activeScenario.stats.painIndex.toFixed(2)}%</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Optimal Sizing */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Scale className="w-4 h-4" /> Optimal Position Sizing
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Optimal f</div>
                            <div className="font-bold text-primary">{activeScenario.stats.optimalF.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Kelly</div>
                            <div className="font-bold">{activeScenario.stats.kellyFraction.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Half Kelly</div>
                            <div className="font-bold">{activeScenario.stats.halfKelly.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Quarter Kelly</div>
                            <div className="font-bold">{activeScenario.stats.quarterKelly.toFixed(1)}%</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Time Analysis */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Time Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Avg DD Duration</div>
                            <div className="font-bold">{activeScenario.stats.avgDDDuration.toFixed(0)} trades</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Max DD Duration</div>
                            <div className="font-bold">{activeScenario.stats.maxDrawdownDuration} trades</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Time in DD</div>
                            <div className="font-bold">{activeScenario.stats.timeInDrawdownPercent.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Avg Recovery</div>
                            <div className="font-bold">{activeScenario.stats.avgRecoveryTime.toFixed(0)} trades</div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Projections */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Projections
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Daily</div>
                            <div className={`font-bold ${activeScenario.stats.projectedDailyReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              ${activeScenario.stats.projectedDailyReturn.toFixed(0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Weekly</div>
                            <div className={`font-bold ${activeScenario.stats.projectedWeeklyReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              ${activeScenario.stats.projectedWeeklyReturn.toFixed(0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Monthly</div>
                            <div className={`font-bold ${activeScenario.stats.projectedMonthlyReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              ${activeScenario.stats.projectedMonthlyReturn.toFixed(0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Yearly</div>
                            <div className={`font-bold ${activeScenario.stats.projectedYearlyReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              ${activeScenario.stats.projectedYearlyReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Percentile Table */}
                      <Card>
                        <CardHeader className="py-2 px-4">
                          <CardTitle className="text-sm">Percentile Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 text-muted-foreground">Percentile</th>
                                <th className="text-right py-2 text-muted-foreground">Return</th>
                                <th className="text-right py-2 text-muted-foreground">Max DD</th>
                                <th className="text-right py-2 text-muted-foreground">Final Capital</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(['p1', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p99'] as const).map(p => {
                                const data = activeScenario.stats!.percentiles[p];
                                const label = p.replace('p', '') + '%';
                                return (
                                  <tr key={p} className="border-b border-border/50">
                                    <td className="py-2 font-medium">{label}</td>
                                    <td className={`text-right ${data.return >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                      ${data.return.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="text-right text-terminal-amber">
                                      -{data.maxDrawdown.toFixed(1)}%
                                    </td>
                                    <td className="text-right">
                                      ${data.finalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Run a simulation to see advanced stats
                  </div>
                )}
              </TabsContent>

              {/* Compare Tab */}
              <TabsContent value="compare" className="h-full mt-0">
                {compareData ? (
                  <div className="space-y-4">
                    {/* Comparison Table */}
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Side-by-Side Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2">Metric</th>
                              {compareData.scenarios.map(s => (
                                <th key={s.id} className="text-right py-2" style={{ color: s.color }}>
                                  {s.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-border/50">
                              <td className="py-2">Mean Return</td>
                              {compareData.scenarios.map(s => (
                                <td key={s.id} className={`text-right ${s.stats!.meanReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                  ${s.stats!.meanReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/50">
                              <td className="py-2">Win Probability</td>
                              {compareData.scenarios.map(s => (
                                <td key={s.id} className="text-right">{s.stats!.winProbability.toFixed(1)}%</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/50">
                              <td className="py-2">Sharpe Ratio</td>
                              {compareData.scenarios.map(s => (
                                <td key={s.id} className="text-right">{s.stats!.sharpeRatio.toFixed(2)}</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/50">
                              <td className="py-2">Max Drawdown</td>
                              {compareData.scenarios.map(s => (
                                <td key={s.id} className="text-right text-terminal-amber">-{s.stats!.medianMaxDD.toFixed(1)}%</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/50">
                              <td className="py-2">Risk of Ruin</td>
                              {compareData.scenarios.map(s => (
                                <td key={s.id} className="text-right text-destructive">{s.stats!.probabilityOfRuin.toFixed(1)}%</td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    {/* Radar Chart */}
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Performance Comparison</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={compareData.radarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                            {compareData.scenarios.map(s => (
                              <Radar
                                key={s.id}
                                name={s.name}
                                dataKey={s.name}
                                stroke={s.color}
                                fill={s.color}
                                fillOpacity={0.2}
                                strokeWidth={2}
                              />
                            ))}
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select 2+ scenarios to compare</p>
                      <p className="text-xs mt-1">Click "Compare" in the scenarios list</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloSimulator;
