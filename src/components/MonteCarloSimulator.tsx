import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Zap, Shield, Activity, Clock, DollarSign, Percent, Scale, Check, Cloud, Trash2
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
const PRESETS: Record<string, { name: string; icon: string; config: Partial<AdvancedSimConfig> }> = {
  conservative: {
    name: 'Conservative',
    icon: '🛡️',
    config: { winRate: 65, avgWin: 120, avgLoss: 100, riskPerTrade: 1 }
  },
  balanced: {
    name: 'Balanced',
    icon: '⚖️',
    config: { winRate: 60, avgWin: 150, avgLoss: 100, riskPerTrade: 2 }
  },
  aggressive: {
    name: 'Aggressive',
    icon: '🔥',
    config: { winRate: 55, avgWin: 200, avgLoss: 100, riskPerTrade: 3 }
  },
  scalper: {
    name: 'Scalper',
    icon: '⚡',
    config: { winRate: 70, avgWin: 50, avgLoss: 50, riskPerTrade: 0.5, numTrades: 500 }
  },
  swing: {
    name: 'Swing Trader',
    icon: '🌊',
    config: { winRate: 50, avgWin: 250, avgLoss: 100, riskPerTrade: 2, numTrades: 50 }
  }
};

const STORAGE_KEY_CONFIG = 'mc-config-v3';
const STORAGE_KEY_SCENARIOS = 'mc-scenarios-v3';

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
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get active scenario
  const activeScenario = useMemo(() => 
    scenarios.find(s => s.id === activeScenarioId), 
    [scenarios, activeScenarioId]
  );

  // Load saved data on mount
  useEffect(() => {
    // Load config
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        setConfig({ ...DEFAULT_ADVANCED_CONFIG, ...JSON.parse(savedConfig) });
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
    
    // Load scenarios
    const savedScenarios = localStorage.getItem(STORAGE_KEY_SCENARIOS);
    if (savedScenarios) {
      try {
        const parsed = JSON.parse(savedScenarios);
        setScenarios(parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        })));
        if (parsed.length > 0) {
          setActiveScenarioId(parsed[parsed.length - 1].id);
        }
      } catch (e) {
        console.error('Failed to load scenarios:', e);
      }
    }
    
    setLastSaved(new Date());
  }, []);

  // Auto-save scenarios whenever they change
  useEffect(() => {
    if (scenarios.length === 0 && !lastSaved) return;
    
    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_SCENARIOS, JSON.stringify(scenarios));
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
        setLastSaved(new Date());
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
      setIsSaving(false);
    }, 1500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [scenarios, config]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runSimulation();
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
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
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
      color: colors[scenarios.length % colors.length]
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

      toast.success(`Simulation completed! ${config.numSimulations.toLocaleString()} runs`);
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
      toast.success(`${preset.icon} Applied ${preset.name} preset`);
    }
  };

  // Remove scenario
  const removeScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios.length > 1 ? scenarios[0].id : null);
    }
    toast.success('Scenario removed');
  };

  // Clear all scenarios
  const clearAllScenarios = () => {
    setScenarios([]);
    setActiveScenarioId(null);
    toast.success('All scenarios cleared');
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
    toast.success('CSV exported');
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
  
  // Expectancy
  const expectancy = useMemo(() => {
    const wr = config.winRate / 100;
    return (wr * config.avgWin) - ((1 - wr) * config.avgLoss);
  }, [config.winRate, config.avgWin, config.avgLoss]);

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
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header - Terminal Style */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Dice6 className="w-6 h-6 text-primary animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary font-mono tracking-wider">MONTE CARLO SIMULATOR</h1>
            <p className="text-xs text-muted-foreground font-mono">Advanced Trading Strategy Analysis</p>
          </div>
          {config.enableRegimes && (
            <Badge variant="outline" className="text-xs border-terminal-amber/50 text-terminal-amber bg-terminal-amber/10">
              🌪️ Regimes
            </Badge>
          )}
          {config.sequenceRiskMode !== 'normal' && (
            <Badge variant="outline" className="text-xs border-terminal-cyan/50 text-terminal-cyan bg-terminal-cyan/10">
              ⚠️ {config.sequenceRiskMode}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-save status */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {isSaving ? (
              <>
                <Cloud className="w-4 h-4 text-terminal-amber animate-pulse" />
                <span className="text-terminal-amber">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Auto-saved {lastSaved.toLocaleTimeString()}
                </span>
              </>
            ) : null}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportCSV} 
            disabled={!activeScenario?.results}
            className="border-primary/30 hover:border-primary/60 hover:bg-primary/10"
          >
            <FileDown className="w-4 h-4 mr-1" /> Export
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-card border-primary/20">
                <p className="text-sm">Run thousands of simulations with market regimes, sequence risk, and advanced metrics. Press <kbd className="px-1 bg-muted rounded">Ctrl+Enter</kbd> to run.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input Controls */}
        <div className="w-80 min-w-[300px] border-r border-primary/10 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              
              {/* Quick Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary font-mono">{config.winRate}%</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Win Rate</div>
                </div>
                <div className="text-center border-x border-primary/20">
                  <div className="text-lg font-bold text-terminal-green font-mono">1:{riskRewardRatio}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">R:R</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold font-mono ${expectancy >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    ${expectancy.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">Expectancy</div>
                </div>
              </div>

              {/* Data Source & Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wide">Strategy Preset</Label>
                  {dataSource === 'csv' && (
                    <Badge variant="outline" className="text-[10px] border-primary/30">📊 CSV Data</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select onValueChange={applyPreset}>
                    <SelectTrigger className="bg-background/50 border-primary/20 text-xs h-9 hover:border-primary/40 transition-colors">
                      <SelectValue placeholder="Choose preset..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/20">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {preset.icon} {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCSVImport(true)}
                    className="h-9 text-xs border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Import CSV
                  </Button>
                </div>
              </div>

              {/* CSV Import Dialog */}
              <Dialog open={showCSVImport} onOpenChange={setShowCSVImport}>
                <DialogContent className="max-w-2xl bg-card border-primary/20">
                  <DialogHeader>
                    <DialogTitle className="text-primary font-mono">Import TradingView CSV</DialogTitle>
                  </DialogHeader>
                  <MonteCarloCSVImport
                    onImport={handleCSVImport}
                    onClose={() => setShowCSVImport(false)}
                  />
                </DialogContent>
              </Dialog>

              {/* Strategy Parameters */}
              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                  <CardTitle className="text-sm text-primary flex items-center gap-2 font-mono">
                    <Target className="w-4 h-4" />
                    STRATEGY PARAMETERS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-4">
                  {/* Win Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-muted-foreground">Win Rate</Label>
                      <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20">
                        <span className="text-sm text-primary font-mono font-bold">{config.winRate}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[config.winRate]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, winRate: v }))}
                      min={0} max={100} step={1}
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                    />
                  </div>

                  {/* Avg Win/Loss */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary" /> Avg Win
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={config.avgWin}
                          onChange={e => setConfig(prev => ({ ...prev, avgWin: +e.target.value }))}
                          className="h-9 pl-6 bg-background/50 border-primary/20 focus:border-primary/50 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-destructive" /> Avg Loss
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={config.avgLoss}
                          onChange={e => setConfig(prev => ({ ...prev, avgLoss: +e.target.value }))}
                          className="h-9 pl-6 bg-background/50 border-destructive/20 focus:border-destructive/50 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Risk per Trade */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-muted-foreground">Risk per Trade</Label>
                      <div className="px-2 py-1 rounded bg-terminal-amber/10 border border-terminal-amber/20">
                        <span className="text-sm text-terminal-amber font-mono font-bold">{config.riskPerTrade}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[config.riskPerTrade]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, riskPerTrade: v }))}
                      min={0.1} max={10} step={0.1}
                      className="[&_[role=slider]]:bg-terminal-amber [&_[role=slider]]:border-terminal-amber"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Account Setup */}
              <Card className="border-terminal-cyan/20 bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader className="py-3 px-4 bg-terminal-cyan/5 border-b border-terminal-cyan/10">
                  <CardTitle className="text-sm text-terminal-cyan flex items-center gap-2 font-mono">
                    <DollarSign className="w-4 h-4" />
                    ACCOUNT SETUP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Starting Capital</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={config.startingCapital}
                          onChange={e => setConfig(prev => ({ ...prev, startingCapital: +e.target.value }))}
                          className="h-9 pl-6 bg-background/50 border-terminal-cyan/20 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Number of Trades</Label>
                      <Input
                        type="number"
                        value={config.numTrades}
                        onChange={e => setConfig(prev => ({ ...prev, numTrades: +e.target.value }))}
                        className="h-9 bg-background/50 border-terminal-cyan/20 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Position Sizing</Label>
                    <Select
                      value={config.positionSizing}
                      onValueChange={v => setConfig(prev => ({ ...prev, positionSizing: v as any }))}
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-terminal-cyan/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-terminal-cyan/20">
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
              <Card className="border-purple-500/20 bg-gradient-to-br from-card to-card/50 overflow-hidden">
                <CardHeader className="py-3 px-4 bg-purple-500/5 border-b border-purple-500/10">
                  <CardTitle className="text-sm text-purple-400 flex items-center gap-2 font-mono">
                    <Dice6 className="w-4 h-4" />
                    SIMULATION
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Number of Simulations</Label>
                    <Select
                      value={config.numSimulations.toString()}
                      onValueChange={v => setConfig(prev => ({ ...prev, numSimulations: +v }))}
                    >
                      <SelectTrigger className="h-9 bg-background/50 border-purple-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-purple-500/20">
                        <SelectItem value="1000">1,000 runs</SelectItem>
                        <SelectItem value="5000">5,000 runs</SelectItem>
                        <SelectItem value="10000">10,000 runs</SelectItem>
                        <SelectItem value="50000">50,000 runs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Advanced Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-purple-500/10">
                    <Label className="text-xs text-muted-foreground">Advanced Options</Label>
                    <Switch 
                      checked={showAdvanced} 
                      onCheckedChange={setShowAdvanced}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>

                  {showAdvanced && (
                    <div className="space-y-3 p-3 rounded-lg bg-background/20 border border-purple-500/10">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Include Slippage</Label>
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
                          className="h-8 text-xs bg-background/50"
                          placeholder="Slippage %"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Include Commission</Label>
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
                          className="h-8 text-xs bg-background/50"
                          placeholder="$ per trade"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Compounding</Label>
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
              <div className="space-y-3">
                <Button
                  onClick={runSimulation}
                  disabled={isRunning}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Running... {progress.toFixed(0)}%
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>

                {isRunning && (
                  <Progress value={progress} className="h-2 bg-primary/20" />
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setConfig(DEFAULT_ADVANCED_CONFIG)}
                  className="w-full border-muted-foreground/20 hover:bg-muted/50"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset to Defaults
                </Button>
              </div>

              {/* Scenario List */}
              {scenarios.length > 0 && (
                <Card className="border-muted/30 overflow-hidden">
                  <CardHeader className="py-3 px-4 bg-muted/20 border-b border-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        SCENARIOS ({scenarios.length})
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs px-2 hover:bg-primary/10"
                          onClick={() => setCompareMode(!compareMode)}
                        >
                          {compareMode ? 'Done' : 'Compare'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs px-2 hover:bg-destructive/10 text-destructive"
                          onClick={clearAllScenarios}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1 max-h-48 overflow-auto">
                    {scenarios.map(s => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                          activeScenarioId === s.id 
                            ? 'bg-primary/10 border border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.1)]' 
                            : 'hover:bg-muted/30 border border-transparent'
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
                              className="w-4 h-4 rounded border-primary/30"
                            />
                          )}
                          <div
                            className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background"
                            style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}
                          />
                          <span className="text-xs font-medium font-mono">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.status === 'running' && (
                            <span className="text-xs text-terminal-amber font-mono animate-pulse">{s.progress.toFixed(0)}%</span>
                          )}
                          {s.status === 'completed' && s.stats && (
                            <span className={`text-xs font-mono font-bold ${s.stats.meanReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {s.stats.meanReturn >= 0 ? '+' : ''}{(s.stats.meanReturn / s.config.startingCapital * 100).toFixed(1)}%
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
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
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background to-background">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-3">
              <TabsList className="grid grid-cols-6 w-full bg-muted/30 p-1 rounded-xl">
                <TabsTrigger value="parameters" className="text-xs font-mono rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  📊 Params
                </TabsTrigger>
                <TabsTrigger value="regimes" className="text-xs font-mono rounded-lg data-[state=active]:bg-terminal-amber data-[state=active]:text-black">
                  🌪️ Regimes
                </TabsTrigger>
                <TabsTrigger value="sequence" className="text-xs font-mono rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                  ⚠️ Sequence
                </TabsTrigger>
                <TabsTrigger value="results" className="text-xs font-mono rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  📈 Results
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs font-mono rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                  🔬 Advanced
                </TabsTrigger>
                <TabsTrigger value="compare" className="text-xs font-mono rounded-lg data-[state=active]:bg-terminal-cyan data-[state=active]:text-black">
                  ⚖️ Compare
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              {/* Parameters Tab */}
              <TabsContent value="parameters" className="h-full mt-0">
                <Card className="h-full border-primary/20 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/10">
                    <CardTitle className="font-mono text-primary">Strategy Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl text-center border border-primary/20 hover:border-primary/40 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                        <div className="text-4xl font-bold text-primary font-mono">{config.winRate}%</div>
                        <div className="text-sm text-muted-foreground mt-1">Win Rate</div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-terminal-green/20 to-terminal-green/5 rounded-xl text-center border border-terminal-green/20">
                        <div className="text-4xl font-bold text-terminal-green font-mono">1:{riskRewardRatio}</div>
                        <div className="text-sm text-muted-foreground mt-1">Risk:Reward</div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-terminal-amber/20 to-terminal-amber/5 rounded-xl text-center border border-terminal-amber/20">
                        <div className="text-4xl font-bold text-terminal-amber font-mono">{config.riskPerTrade}%</div>
                        <div className="text-sm text-muted-foreground mt-1">Risk/Trade</div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl text-center border border-muted/30">
                        <div className="text-3xl font-bold font-mono">${config.startingCapital.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground mt-1">Starting Capital</div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl text-center border border-muted/30">
                        <div className="text-3xl font-bold font-mono">{config.numTrades}</div>
                        <div className="text-sm text-muted-foreground mt-1">Trades</div>
                      </div>
                      <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl text-center border border-muted/30">
                        <div className="text-3xl font-bold font-mono">{config.numSimulations.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground mt-1">Simulations</div>
                      </div>
                    </div>
                    
                    <div className="p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20">
                      <h4 className="font-medium mb-4 text-primary font-mono flex items-center gap-2">
                        <Scale className="w-4 h-4" /> Optimal Position Sizing
                      </h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="p-3 bg-background/50 rounded-lg text-center">
                          <div className="text-muted-foreground text-xs mb-1">Kelly</div>
                          <div className="font-bold text-lg font-mono">{(calculateOptimalF(config.winRate, config.avgWin, config.avgLoss) * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg text-center">
                          <div className="text-muted-foreground text-xs mb-1">Half Kelly</div>
                          <div className="font-bold text-lg font-mono">{(calculateOptimalF(config.winRate, config.avgWin, config.avgLoss) * 50).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-background/50 rounded-lg text-center">
                          <div className="text-muted-foreground text-xs mb-1">Quarter Kelly</div>
                          <div className="font-bold text-lg font-mono">{(calculateOptimalF(config.winRate, config.avgWin, config.avgLoss) * 25).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-primary/20 rounded-lg text-center border border-primary/30">
                          <div className="text-muted-foreground text-xs mb-1">Current</div>
                          <div className="font-bold text-lg font-mono text-primary">{config.riskPerTrade}%</div>
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
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-terminal-amber/10 to-transparent border border-terminal-amber/20">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.enableRegimes}
                          onCheckedChange={v => setConfig(prev => ({ ...prev, enableRegimes: v }))}
                          className="data-[state=checked]:bg-terminal-amber"
                        />
                        <div>
                          <Label className="font-medium">Enable Regime Simulation</Label>
                          <p className="text-xs text-muted-foreground">Simulate different market conditions</p>
                        </div>
                      </div>
                      {config.enableRegimes && (
                        <Badge variant={totalRegimeProbability === 100 ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                          Total: {totalRegimeProbability}%
                        </Badge>
                      )}
                    </div>

                    {config.enableRegimes && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {config.regimes.map(regime => (
                            <Card key={regime.id} className="border overflow-hidden" style={{ borderColor: regime.color + '40' }}>
                              <CardHeader className="py-3 px-4" style={{ background: `linear-gradient(135deg, ${regime.color}15, transparent)` }}>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{regime.icon}</span>
                                  <CardTitle className="text-sm font-mono" style={{ color: regime.color }}>
                                    {regime.name}
                                  </CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4 p-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Probability</span>
                                    <span className="font-mono font-bold" style={{ color: regime.color }}>{regime.probability}%</span>
                                  </div>
                                  <Slider
                                    value={[regime.probability]}
                                    onValueChange={([v]) => updateRegime(regime.id, { probability: v })}
                                    min={0} max={100} step={5}
                                    className={`[&_[role=slider]]:shadow-lg`}
                                    style={{ '--slider-color': regime.color } as any}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Win Rate Modifier</span>
                                    <span className="font-mono">{regime.winRateModifier > 0 ? '+' : ''}{regime.winRateModifier}%</span>
                                  </div>
                                  <Slider
                                    value={[regime.winRateModifier + 20]}
                                    onValueChange={([v]) => updateRegime(regime.id, { winRateModifier: v - 20 })}
                                    min={0} max={40} step={1}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <Card className="border-terminal-amber/20">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-mono">Regime Distribution</CardTitle>
                          </CardHeader>
                          <CardContent className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={regimePieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  dataKey="value"
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
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Sequence Risk Tab */}
              <TabsContent value="sequence" className="h-full mt-0">
                <Card className="h-full border-destructive/20 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-destructive/10 to-transparent border-b border-destructive/10">
                    <CardTitle className="font-mono text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Sequence Risk Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Analyze how the order of wins and losses affects your strategy's performance.
                      </p>
                      
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Sequence Mode</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['normal', 'badStart', 'retirement'] as const).map(mode => (
                            <Button
                              key={mode}
                              variant={config.sequenceRiskMode === mode ? 'default' : 'outline'}
                              className={`h-auto py-4 flex flex-col gap-2 ${
                                config.sequenceRiskMode === mode 
                                  ? 'bg-destructive text-destructive-foreground' 
                                  : 'border-destructive/20 hover:border-destructive/40'
                              }`}
                              onClick={() => setConfig(prev => ({ ...prev, sequenceRiskMode: mode }))}
                            >
                              <span className="text-2xl">
                                {mode === 'normal' ? '📊' : mode === 'badStart' ? '📉' : '🏖️'}
                              </span>
                              <span className="text-sm font-medium capitalize">
                                {mode === 'badStart' ? 'Bad Start' : mode}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {config.sequenceRiskMode === 'badStart' && (
                        <div className="space-y-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                          <Label className="text-sm">Consecutive Losses at Start</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[config.badStartLosses]}
                              onValueChange={([v]) => setConfig(prev => ({ ...prev, badStartLosses: v }))}
                              min={1} max={20} step={1}
                              className="flex-1"
                            />
                            <div className="w-16 text-center font-mono font-bold text-destructive text-lg">
                              {config.badStartLosses}
                            </div>
                          </div>
                        </div>
                      )}

                      {config.sequenceRiskMode === 'retirement' && (
                        <div className="space-y-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                          <Label className="text-sm">Monthly Withdrawal Amount</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={config.retirementWithdrawal}
                              onChange={e => setConfig(prev => ({ ...prev, retirementWithdrawal: +e.target.value }))}
                              className="pl-8 h-12 text-lg font-mono bg-background/50"
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
                        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground mb-1">Median Return</div>
                            <div className={`text-2xl font-bold font-mono ${activeScenario.stats.medianReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {activeScenario.stats.medianReturn >= 0 ? '+' : ''}
                              ${activeScenario.stats.medianReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-terminal-green/20 bg-gradient-to-br from-terminal-green/10 to-transparent overflow-hidden">
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground mb-1">Win Probability</div>
                            <div className="text-2xl font-bold text-terminal-green font-mono">
                              {activeScenario.stats.winProbability.toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-terminal-amber/20 bg-gradient-to-br from-terminal-amber/10 to-transparent overflow-hidden">
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground mb-1">Max Drawdown</div>
                            <div className="text-2xl font-bold text-terminal-amber font-mono">
                              -{activeScenario.stats.medianMaxDD.toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-destructive/20 bg-gradient-to-br from-destructive/10 to-transparent overflow-hidden">
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground mb-1">Risk of Ruin</div>
                            <div className="text-2xl font-bold text-destructive font-mono">
                              {activeScenario.stats.probabilityOfRuin.toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Distribution Chart */}
                      <Card className="border-primary/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                          <CardTitle className="text-sm font-mono">Return Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] p-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activeScenario.stats.returnDistribution}>
                              <defs>
                                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
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
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
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
                      <Card className="border-primary/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                          <CardTitle className="text-sm font-mono">Equity Curves (50 Sample Paths)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] p-4">
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
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                              />
                              {Array.from({ length: 50 }, (_, i) => (
                                <Line
                                  key={i}
                                  type="monotone"
                                  dataKey={`sim${i}`}
                                  stroke={`hsl(${(i * 7) % 360}, 70%, 60%)`}
                                  strokeWidth={1}
                                  strokeOpacity={0.15}
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
                      <div className="relative inline-block">
                        <Dice6 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <div className="absolute inset-0 animate-ping">
                          <Dice6 className="w-16 h-16 mx-auto opacity-10" />
                        </div>
                      </div>
                      <p className="text-lg font-medium">Run a simulation to see results</p>
                      <p className="text-sm mt-2 text-muted-foreground">
                        Press <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Ctrl+Enter</kbd> to start
                      </p>
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
                      <Card className="border-destructive/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-destructive/5 border-b border-destructive/10">
                          <CardTitle className="text-sm flex items-center gap-2 font-mono text-destructive">
                            <Shield className="w-4 h-4" /> RISK METRICS
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 p-4">
                          {[
                            { label: 'VaR 95%', value: `$${activeScenario.stats.var95.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                            { label: 'VaR 99%', value: `$${activeScenario.stats.var99.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                            { label: 'CVaR 95%', value: `$${activeScenario.stats.cvar95.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                            { label: 'CVaR 99%', value: `$${activeScenario.stats.cvar99.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                              <div className="font-bold text-destructive font-mono">{item.value}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Performance Ratios */}
                      <Card className="border-primary/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                          <CardTitle className="text-sm flex items-center gap-2 font-mono text-primary">
                            <Activity className="w-4 h-4" /> PERFORMANCE RATIOS
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 p-4">
                          {[
                            { label: 'Sharpe', value: activeScenario.stats.sharpeRatio.toFixed(2) },
                            { label: 'Sortino', value: activeScenario.stats.sortinoRatio.toFixed(2) },
                            { label: 'Calmar', value: activeScenario.stats.calmarRatio.toFixed(2) },
                            { label: 'MAR', value: activeScenario.stats.marRatio.toFixed(2) },
                            { label: 'Omega', value: activeScenario.stats.omegaRatio.toFixed(2) },
                            { label: 'Tail Ratio', value: activeScenario.stats.tailRatio.toFixed(2) },
                            { label: 'Ulcer Index', value: activeScenario.stats.ulcerIndex.toFixed(2) },
                            { label: 'Pain Index', value: `${activeScenario.stats.painIndex.toFixed(2)}%` },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                              <div className="font-bold font-mono">{item.value}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Optimal Sizing */}
                      <Card className="border-terminal-cyan/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-terminal-cyan/5 border-b border-terminal-cyan/10">
                          <CardTitle className="text-sm flex items-center gap-2 font-mono text-terminal-cyan">
                            <Scale className="w-4 h-4" /> OPTIMAL POSITION SIZING
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 p-4">
                          {[
                            { label: 'Optimal f', value: `${activeScenario.stats.optimalF.toFixed(1)}%`, highlight: true },
                            { label: 'Kelly', value: `${activeScenario.stats.kellyFraction.toFixed(1)}%` },
                            { label: 'Half Kelly', value: `${activeScenario.stats.halfKelly.toFixed(1)}%` },
                            { label: 'Quarter Kelly', value: `${activeScenario.stats.quarterKelly.toFixed(1)}%` },
                          ].map(item => (
                            <div key={item.label} className={`p-3 rounded-lg border ${item.highlight ? 'bg-terminal-cyan/10 border-terminal-cyan/30' : 'bg-terminal-cyan/5 border-terminal-cyan/10'}`}>
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                              <div className={`font-bold font-mono ${item.highlight ? 'text-terminal-cyan' : ''}`}>{item.value}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Time Analysis */}
                      <Card className="border-purple-500/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-purple-500/5 border-b border-purple-500/10">
                          <CardTitle className="text-sm flex items-center gap-2 font-mono text-purple-400">
                            <Clock className="w-4 h-4" /> TIME ANALYSIS
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 p-4">
                          {[
                            { label: 'Avg DD Duration', value: `${activeScenario.stats.avgDDDuration.toFixed(0)} trades` },
                            { label: 'Max DD Duration', value: `${activeScenario.stats.maxDrawdownDuration} trades` },
                            { label: 'Time in DD', value: `${activeScenario.stats.timeInDrawdownPercent.toFixed(1)}%` },
                            { label: 'Avg Recovery', value: `${activeScenario.stats.avgRecoveryTime.toFixed(0)} trades` },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                              <div className="font-bold font-mono">{item.value}</div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Projections */}
                      <Card className="border-terminal-green/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-terminal-green/5 border-b border-terminal-green/10">
                          <CardTitle className="text-sm flex items-center gap-2 font-mono text-terminal-green">
                            <TrendingUp className="w-4 h-4" /> PROJECTIONS
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-4 p-4">
                          {[
                            { label: 'Daily', value: activeScenario.stats.projectedDailyReturn },
                            { label: 'Weekly', value: activeScenario.stats.projectedWeeklyReturn },
                            { label: 'Monthly', value: activeScenario.stats.projectedMonthlyReturn },
                            { label: 'Yearly', value: activeScenario.stats.projectedYearlyReturn },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-lg bg-terminal-green/5 border border-terminal-green/10">
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                              <div className={`font-bold font-mono ${item.value >= 0 ? 'text-terminal-green' : 'text-destructive'}`}>
                                ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Percentile Table */}
                      <Card className="border-muted/30 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/10 border-b border-muted/20">
                          <CardTitle className="text-sm font-mono">Percentile Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-muted/20 bg-muted/5">
                                <th className="text-left py-3 px-4 text-muted-foreground font-mono">Percentile</th>
                                <th className="text-right py-3 px-4 text-muted-foreground font-mono">Return</th>
                                <th className="text-right py-3 px-4 text-muted-foreground font-mono">Max DD</th>
                                <th className="text-right py-3 px-4 text-muted-foreground font-mono">Final Capital</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(['p1', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p99'] as const).map((p, i) => {
                                const data = activeScenario.stats!.percentiles[p];
                                const label = p.replace('p', '') + '%';
                                return (
                                  <tr key={p} className={`border-b border-muted/10 ${i % 2 === 0 ? 'bg-muted/5' : ''}`}>
                                    <td className="py-3 px-4 font-mono font-medium">{label}</td>
                                    <td className={`text-right py-3 px-4 font-mono ${data.return >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                      ${data.return.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="text-right py-3 px-4 font-mono text-terminal-amber">
                                      -{data.maxDrawdown.toFixed(1)}%
                                    </td>
                                    <td className="text-right py-3 px-4 font-mono">
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
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Run a simulation to see advanced stats</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Compare Tab */}
              <TabsContent value="compare" className="h-full mt-0">
                {compareData ? (
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      {/* Comparison Table */}
                      <Card className="border-terminal-cyan/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-terminal-cyan/5 border-b border-terminal-cyan/10">
                          <CardTitle className="text-sm font-mono text-terminal-cyan">Side-by-Side Comparison</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-muted/20 bg-muted/5">
                                <th className="text-left py-3 px-4 font-mono">Metric</th>
                                {compareData.scenarios.map(s => (
                                  <th key={s.id} className="text-right py-3 px-4 font-mono" style={{ color: s.color }}>
                                    {s.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-muted/10">
                                <td className="py-3 px-4 font-mono">Mean Return</td>
                                {compareData.scenarios.map(s => (
                                  <td key={s.id} className={`text-right py-3 px-4 font-mono font-bold ${s.stats!.meanReturn >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                    ${s.stats!.meanReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b border-muted/10 bg-muted/5">
                                <td className="py-3 px-4 font-mono">Win Probability</td>
                                {compareData.scenarios.map(s => (
                                  <td key={s.id} className="text-right py-3 px-4 font-mono">{s.stats!.winProbability.toFixed(1)}%</td>
                                ))}
                              </tr>
                              <tr className="border-b border-muted/10">
                                <td className="py-3 px-4 font-mono">Sharpe Ratio</td>
                                {compareData.scenarios.map(s => (
                                  <td key={s.id} className="text-right py-3 px-4 font-mono">{s.stats!.sharpeRatio.toFixed(2)}</td>
                                ))}
                              </tr>
                              <tr className="border-b border-muted/10 bg-muted/5">
                                <td className="py-3 px-4 font-mono">Max Drawdown</td>
                                {compareData.scenarios.map(s => (
                                  <td key={s.id} className="text-right py-3 px-4 font-mono text-terminal-amber">-{s.stats!.medianMaxDD.toFixed(1)}%</td>
                                ))}
                              </tr>
                              <tr className="border-b border-muted/10">
                                <td className="py-3 px-4 font-mono">Risk of Ruin</td>
                                {compareData.scenarios.map(s => (
                                  <td key={s.id} className="text-right py-3 px-4 font-mono text-destructive">{s.stats!.probabilityOfRuin.toFixed(1)}%</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      {/* Radar Chart */}
                      <Card className="border-terminal-cyan/20 overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-terminal-cyan/5 border-b border-terminal-cyan/10">
                          <CardTitle className="text-sm font-mono text-terminal-cyan">Performance Comparison</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px] p-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={compareData.radarData}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} />
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
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Scale className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Select 2+ scenarios to compare</p>
                      <p className="text-sm mt-2">Click "Compare" in the scenarios list</p>
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
