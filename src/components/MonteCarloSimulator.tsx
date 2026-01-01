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
import { toast } from 'sonner';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import {
  Dice6, Save, Download, RotateCcw, Plus, X, TrendingUp,
  TrendingDown, Target, AlertTriangle, HelpCircle, FileDown,
  Play, Pause, BarChart3, LineChartIcon, PieChart
} from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================

interface SimulationConfig {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  riskPerTrade: number;
  startingCapital: number;
  numTrades: number;
  numSimulations: number;
  positionSizing: 'fixedPercent' | 'fixedDollar' | 'kelly' | 'antiMartingale';
  includeSlippage: boolean;
  slippagePercent: number;
  includeCommission: boolean;
  commissionPerTrade: number;
  enableCompounding: boolean;
  maxDrawdownStop: number | null;
}

interface SimulationResult {
  finalCapital: number;
  totalReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  equityCurve: number[];
  drawdownCurve: number[];
  numWins: number;
  numLosses: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  profitFactor: number;
  totalWinAmount: number;
  totalLossAmount: number;
}

interface Scenario {
  id: string;
  name: string;
  config: SimulationConfig;
  results: SimulationResult[] | null;
  stats: SimulationStats | null;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  createdAt: Date;
}

interface SimulationStats {
  medianReturn: number;
  meanReturn: number;
  stdDevReturn: number;
  bestCase: number;
  worstCase: number;
  medianReturnPct: number;
  winProbability: number;
  lossProbability: number;
  breakevenProbability: number;
  probabilityOfRuin: number;
  medianMaxDD: number;
  worstMaxDD: number;
  avgDDDuration: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  avgWinRate: number;
  expectedValuePerTrade: number;
  percentiles: {
    p5: { return: number; dd: number; capital: number };
    p25: { return: number; dd: number; capital: number };
    p50: { return: number; dd: number; capital: number };
    p75: { return: number; dd: number; capital: number };
    p95: { return: number; dd: number; capital: number };
  };
  returnDistribution: { range: string; frequency: number; count: number; midpoint: number }[];
  ddDistribution: { range: string; frequency: number; count: number }[];
}

// ============================================
// PRESETS
// ============================================

const PRESETS: Record<string, { name: string; config: Partial<SimulationConfig> }> = {
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
// SIMULATION ALGORITHM
// ============================================

function runSingleSimulation(config: SimulationConfig): SimulationResult {
  let capital = config.startingCapital;
  let peak = capital;
  let maxDD = 0;
  const equity: number[] = [capital];
  const drawdown: number[] = [0];
  let wins = 0;
  let losses = 0;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;

  for (let i = 0; i < config.numTrades; i++) {
    const currentDD = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    if (config.maxDrawdownStop && currentDD >= config.maxDrawdownStop) break;

    const isWin = Math.random() < (config.winRate / 100);

    let positionSize: number;
    const baseCapital = config.enableCompounding ? capital : config.startingCapital;
    
    if (config.positionSizing === 'fixedPercent') {
      positionSize = baseCapital * (config.riskPerTrade / 100);
    } else if (config.positionSizing === 'fixedDollar') {
      positionSize = config.startingCapital * (config.riskPerTrade / 100);
    } else if (config.positionSizing === 'kelly') {
      const p = config.winRate / 100;
      const q = 1 - p;
      const b = config.avgWin / config.avgLoss;
      const kelly = (p * b - q) / b;
      const halfKelly = Math.max(0, kelly / 2);
      positionSize = baseCapital * Math.min(halfKelly, 0.25);
    } else {
      const multiplier = Math.min(1 + (consecutiveWins * 0.2), 2);
      positionSize = baseCapital * (config.riskPerTrade / 100) * multiplier;
    }

    let pnl: number;
    const variance = 0.3;
    const multiplier = 1 + (Math.random() - 0.5) * 2 * variance;

    if (isWin) {
      pnl = positionSize * (config.avgWin / config.avgLoss) * multiplier;
      wins++;
      consecutiveWins++;
      consecutiveLosses = 0;
      largestWin = Math.max(largestWin, pnl);
      totalWinAmount += pnl;
    } else {
      pnl = -positionSize * multiplier;
      losses++;
      consecutiveLosses++;
      consecutiveWins = 0;
      largestLoss = Math.min(largestLoss, pnl);
      totalLossAmount += Math.abs(pnl);
    }

    if (config.includeSlippage) pnl *= (1 - config.slippagePercent / 100);
    if (config.includeCommission) pnl -= config.commissionPerTrade;

    capital += pnl;
    maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
    maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);

    if (capital > peak) peak = capital;
    const dd = peak > 0 ? ((peak - capital) / peak) * 100 : 0;
    maxDD = Math.max(maxDD, dd);

    equity.push(capital);
    drawdown.push(dd);

    if (capital < config.startingCapital * 0.1) break;
  }

  return {
    finalCapital: capital,
    totalReturn: capital - config.startingCapital,
    returnPercent: ((capital - config.startingCapital) / config.startingCapital) * 100,
    maxDrawdown: maxDD,
    equityCurve: equity,
    drawdownCurve: drawdown,
    numWins: wins,
    numLosses: losses,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    profitFactor: totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0,
    totalWinAmount,
    totalLossAmount
  };
}

function calculateStatistics(results: SimulationResult[], config: SimulationConfig): SimulationStats {
  const returns = results.map(r => r.totalReturn).sort((a, b) => a - b);
  const returnPcts = results.map(r => r.returnPercent).sort((a, b) => a - b);
  const maxDDs = results.map(r => r.maxDrawdown).sort((a, b) => a - b);
  const finalCapitals = results.map(r => r.finalCapital).sort((a, b) => a - b);

  const getPercentile = (arr: number[], p: number) => {
    const idx = Math.floor(arr.length * p);
    return arr[Math.min(idx, arr.length - 1)];
  };

  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const stdDev = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const avg = mean(arr);
    const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(mean(squareDiffs));
  };

  const avgReturn = mean(returns);
  const stdReturn = stdDev(returns);
  const avgWins = results.map(r => r.numWins);
  const avgPF = mean(results.map(r => r.profitFactor));

  const sharpeRatio = stdReturn > 0 ? avgReturn / stdReturn : 0;
  const downsideReturns = returns.filter(r => r < 0);
  const downsideStd = downsideReturns.length > 0 ? stdDev(downsideReturns) : stdReturn;
  const sortinoRatio = downsideStd > 0 ? avgReturn / downsideStd : 0;

  const createHistogramData = (data: number[], bins: number) => {
    if (data.length === 0) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins || 1;

    const histogram = Array(bins).fill(0);
    data.forEach(val => {
      const binIdx = Math.min(Math.floor((val - min) / binWidth), bins - 1);
      histogram[binIdx]++;
    });

    return histogram.map((count, i) => ({
      range: `${(min + i * binWidth).toFixed(0)}`,
      frequency: (count / data.length) * 100,
      count,
      midpoint: min + (i + 0.5) * binWidth
    }));
  };

  return {
    medianReturn: getPercentile(returns, 0.5),
    meanReturn: avgReturn,
    stdDevReturn: stdReturn,
    bestCase: getPercentile(returns, 0.95),
    worstCase: getPercentile(returns, 0.05),
    medianReturnPct: getPercentile(returnPcts, 0.5),
    winProbability: (results.filter(r => r.totalReturn > 0).length / results.length) * 100,
    lossProbability: (results.filter(r => r.totalReturn < 0).length / results.length) * 100,
    breakevenProbability: (results.filter(r => Math.abs(r.totalReturn) < config.startingCapital * 0.05).length / results.length) * 100,
    probabilityOfRuin: (results.filter(r => r.finalCapital < config.startingCapital * 0.5).length / results.length) * 100,
    medianMaxDD: getPercentile(maxDDs, 0.5),
    worstMaxDD: getPercentile(maxDDs, 0.95),
    avgDDDuration: mean(results.map(r => {
      let duration = 0;
      r.drawdownCurve.forEach(dd => { if (dd > 0) duration++; });
      return duration;
    })),
    sharpeRatio,
    sortinoRatio,
    profitFactor: avgPF,
    avgWinRate: (mean(avgWins) / config.numTrades) * 100,
    expectedValuePerTrade: avgReturn / config.numTrades,
    percentiles: {
      p5: { return: getPercentile(returns, 0.05), dd: getPercentile(maxDDs, 0.05), capital: getPercentile(finalCapitals, 0.05) },
      p25: { return: getPercentile(returns, 0.25), dd: getPercentile(maxDDs, 0.25), capital: getPercentile(finalCapitals, 0.25) },
      p50: { return: getPercentile(returns, 0.5), dd: getPercentile(maxDDs, 0.5), capital: getPercentile(finalCapitals, 0.5) },
      p75: { return: getPercentile(returns, 0.75), dd: getPercentile(maxDDs, 0.75), capital: getPercentile(finalCapitals, 0.75) },
      p95: { return: getPercentile(returns, 0.95), dd: getPercentile(maxDDs, 0.95), capital: getPercentile(finalCapitals, 0.95) }
    },
    returnDistribution: createHistogramData(returns, 30),
    ddDistribution: createHistogramData(maxDDs, 6)
  };
}

// ============================================
// COMPONENT
// ============================================

const MonteCarloSimulator: React.FC = () => {
  // Default config
  const defaultConfig: SimulationConfig = {
    winRate: 60,
    avgWin: 150,
    avgLoss: 100,
    riskPerTrade: 2,
    startingCapital: 10000,
    numTrades: 100,
    numSimulations: 10000,
    positionSizing: 'fixedPercent',
    includeSlippage: false,
    slippagePercent: 0.5,
    includeCommission: false,
    commissionPerTrade: 7,
    enableCompounding: true,
    maxDrawdownStop: null
  };

  const [config, setConfig] = useState<SimulationConfig>(defaultConfig);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('distribution');

  // Get active scenario
  const activeScenario = useMemo(() => 
    scenarios.find(s => s.id === activeScenarioId), 
    [scenarios, activeScenarioId]
  );

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem('mc-config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
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
    const newScenario: Scenario = {
      id: scenarioId,
      name: `Scenario ${scenarios.length + 1}`,
      config: { ...config },
      results: null,
      stats: null,
      status: 'running',
      progress: 0,
      createdAt: new Date()
    };

    setScenarios(prev => [...prev, newScenario]);
    setActiveScenarioId(scenarioId);

    const results: SimulationResult[] = [];
    const batchSize = 500;
    const totalSims = config.numSimulations;

    for (let i = 0; i < totalSims; i += batchSize) {
      const batch = Math.min(batchSize, totalSims - i);
      for (let j = 0; j < batch; j++) {
        results.push(runSingleSimulation(config));
      }
      const prog = ((i + batch) / totalSims) * 100;
      setProgress(prog);
      setScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, progress: prog } : s
      ));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const stats = calculateStatistics(results, config);

    setScenarios(prev => prev.map(s => 
      s.id === scenarioId ? { ...s, results, stats, status: 'completed', progress: 100 } : s
    ));

    setIsRunning(false);
    setProgress(100);
    toast.success(`✅ Simulation completed! ${config.numSimulations.toLocaleString()} runs`);
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
    localStorage.setItem('mc-config', JSON.stringify(config));
    toast.success('💾 Configuration saved');
  };

  const loadConfig = () => {
    const saved = localStorage.getItem('mc-config');
    if (saved) {
      setConfig(JSON.parse(saved));
      toast.success('📥 Configuration loaded');
    }
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

  // Calculate R:R ratio
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
      
      // Median path
      const allValues = activeScenario.results!.map(r => 
        r.equityCurve[i] || r.equityCurve[r.equityCurve.length - 1]
      ).sort((a, b) => a - b);
      point.median = allValues[Math.floor(allValues.length / 2)];
      
      data.push(point);
    }
    return data;
  }, [activeScenario?.results]);

  // Drawdown data
  const drawdownData = useMemo(() => {
    if (!activeScenario?.results) return [];
    const maxLen = Math.max(...activeScenario.results.map(r => r.drawdownCurve.length));
    const data: any[] = [];
    
    for (let i = 0; i < maxLen; i++) {
      const allValues = activeScenario.results.map(r => 
        r.drawdownCurve[i] || r.drawdownCurve[r.drawdownCurve.length - 1]
      ).sort((a, b) => a - b);
      data.push({
        trade: i,
        median: -allValues[Math.floor(allValues.length / 2)],
        worst: -allValues[Math.floor(allValues.length * 0.95)]
      });
    }
    return data;
  }, [activeScenario?.results]);

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Dice6 className="w-5 h-5 text-green-500" />
          <h1 className="text-lg font-bold text-green-500">MONTE CARLO SIMULATOR</h1>
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
                <p>Run thousands of simulations to understand your strategy's probability distribution and risk profile.</p>
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
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Quick Presets</Label>
                <Select onValueChange={applyPreset}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Strategy Parameters */}
              <Card className="border-green-500/20">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm text-green-500">📊 Strategy Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-3">
                  {/* Win Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Win Rate</Label>
                      <span className="text-xs text-green-500 font-mono">{config.winRate}%</span>
                    </div>
                    <Slider
                      value={[config.winRate]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, winRate: v }))}
                      min={0} max={100} step={1}
                      className="[&_[role=slider]]:bg-green-500"
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
                      <span className="text-xs text-amber-500 font-mono">{config.riskPerTrade}%</span>
                    </div>
                    <Slider
                      value={[config.riskPerTrade]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, riskPerTrade: v }))}
                      min={0.1} max={10} step={0.1}
                      className="[&_[role=slider]]:bg-amber-500"
                    />
                  </div>

                  {/* R:R Display */}
                  <div className="flex justify-between p-2 bg-muted/50 rounded text-xs">
                    <span className="text-muted-foreground">Risk:Reward</span>
                    <span className="font-bold text-green-500">1:{riskRewardRatio}</span>
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
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
                  <Button variant="outline" size="sm" onClick={loadConfig}>
                    <Download className="w-3 h-3 mr-1" /> Load
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfig(defaultConfig)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset All
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Main Visualization */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2 justify-start bg-muted/50">
              <TabsTrigger value="distribution" className="text-xs">
                <BarChart3 className="w-3 h-3 mr-1" /> Distribution
              </TabsTrigger>
              <TabsTrigger value="equity" className="text-xs">
                <LineChartIcon className="w-3 h-3 mr-1" /> Equity Curves
              </TabsTrigger>
              <TabsTrigger value="drawdown" className="text-xs">
                <TrendingDown className="w-3 h-3 mr-1" /> Drawdown
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">
                <Target className="w-3 h-3 mr-1" /> Risk Metrics
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-4">
              {/* Distribution Tab */}
              <TabsContent value="distribution" className="h-full mt-0">
                {activeScenario?.stats ? (
                  <div className="space-y-4 h-full">
                    {/* Key Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="bg-card border-green-500/20">
                        <CardContent className="p-3">
                          <div className="text-xs text-muted-foreground">Median Return</div>
                          <div className={`text-2xl font-bold ${activeScenario.stats.medianReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${activeScenario.stats.medianReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activeScenario.stats.medianReturnPct.toFixed(1)}%
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-blue-500/20">
                        <CardContent className="p-3">
                          <div className="text-xs text-muted-foreground">Win Probability</div>
                          <div className="text-2xl font-bold text-blue-500">
                            {activeScenario.stats.winProbability.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of simulations profitable
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-amber-500/20">
                        <CardContent className="p-3">
                          <div className="text-xs text-muted-foreground">Max Drawdown</div>
                          <div className="text-2xl font-bold text-amber-500">
                            -{activeScenario.stats.medianMaxDD.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">median</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Distribution Chart */}
                    <Card className="flex-1 min-h-[300px]">
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Return Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activeScenario.stats.returnDistribution}>
                            <defs>
                              <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                              dataKey="midpoint"
                              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                              stroke="#666"
                              fontSize={10}
                            />
                            <YAxis
                              tickFormatter={v => `${v.toFixed(0)}%`}
                              stroke="#666"
                              fontSize={10}
                            />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Frequency']}
                              labelFormatter={(v) => `Return: $${Number(v).toLocaleString()}`}
                            />
                            <ReferenceLine
                              x={activeScenario.stats.medianReturn}
                              stroke="#22c55e"
                              strokeWidth={2}
                              label={{ value: 'Median', fill: '#22c55e', fontSize: 10 }}
                            />
                            <ReferenceLine
                              x={activeScenario.stats.worstCase}
                              stroke="#ef4444"
                              strokeDasharray="5 5"
                              label={{ value: '5%', fill: '#ef4444', fontSize: 10 }}
                            />
                            <ReferenceLine
                              x={activeScenario.stats.bestCase}
                              stroke="#22c55e"
                              strokeDasharray="5 5"
                              label={{ value: '95%', fill: '#22c55e', fontSize: 10 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="frequency"
                              stroke="#22c55e"
                              fill="url(#returnGradient)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
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

              {/* Equity Curves Tab */}
              <TabsContent value="equity" className="h-full mt-0">
                {equityCurves.length > 0 ? (
                  <Card className="h-full">
                    <CardHeader className="py-2 px-4">
                      <CardTitle className="text-sm">Equity Curves (50 Random Paths)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equityCurves}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="trade" stroke="#666" fontSize={10} />
                          <YAxis
                            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                            stroke="#666"
                            fontSize={10}
                          />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                          />
                          <ReferenceLine
                            y={config.startingCapital}
                            stroke="#666"
                            strokeDasharray="5 5"
                            label={{ value: 'Start', fill: '#666', fontSize: 10 }}
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
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={false}
                            name="Median Path"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Run a simulation to see equity curves
                  </div>
                )}
              </TabsContent>

              {/* Drawdown Tab */}
              <TabsContent value="drawdown" className="h-full mt-0">
                {activeScenario?.stats ? (
                  <div className="space-y-4">
                    {/* DD Distribution */}
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Drawdown Distribution</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={activeScenario.stats.ddDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="range" stroke="#666" fontSize={10} />
                            <YAxis tickFormatter={v => `${v}%`} stroke="#666" fontSize={10} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                            />
                            <Bar dataKey="frequency" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* DD Timeline */}
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Drawdown Over Time (Median Path)</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={drawdownData}>
                            <defs>
                              <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="trade" stroke="#666" fontSize={10} />
                            <YAxis tickFormatter={v => `${v}%`} stroke="#666" fontSize={10} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="median"
                              stroke="#ef4444"
                              fill="url(#ddGradient)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Run a simulation to see drawdown analysis
                  </div>
                )}
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="h-full mt-0">
                {activeScenario?.stats ? (
                  <div className="space-y-4">
                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-4 gap-3">
                      <Card className="border-green-500/20">
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                          <div className="text-2xl font-bold text-green-500">
                            {activeScenario.stats.sharpeRatio.toFixed(2)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-blue-500/20">
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground">Sortino Ratio</div>
                          <div className="text-2xl font-bold text-blue-500">
                            {activeScenario.stats.sortinoRatio.toFixed(2)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-500/20">
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground">Profit Factor</div>
                          <div className="text-2xl font-bold text-purple-500">
                            {activeScenario.stats.profitFactor.toFixed(2)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-amber-500/20">
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground">EV / Trade</div>
                          <div className={`text-2xl font-bold ${activeScenario.stats.expectedValuePerTrade >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${activeScenario.stats.expectedValuePerTrade.toFixed(2)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

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
                            {['p5', 'p25', 'p50', 'p75', 'p95'].map(p => {
                              const data = activeScenario.stats!.percentiles[p as keyof typeof activeScenario.stats.percentiles];
                              const label = p.replace('p', '') + '%';
                              return (
                                <tr key={p} className="border-b border-border/50">
                                  <td className="py-2 font-medium">{label}</td>
                                  <td className={`text-right ${data.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    ${data.return.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="text-right text-amber-500">
                                    -{data.dd.toFixed(1)}%
                                  </td>
                                  <td className="text-right">
                                    ${data.capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-xs text-muted-foreground mb-2">Probability Analysis</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Win Probability</span>
                              <span className="text-green-500">{activeScenario.stats.winProbability.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Loss Probability</span>
                              <span className="text-red-500">{activeScenario.stats.lossProbability.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Breakeven</span>
                              <span className="text-muted-foreground">{activeScenario.stats.breakevenProbability.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Probability of Ruin</span>
                              <span className="text-red-500">{activeScenario.stats.probabilityOfRuin.toFixed(1)}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-xs text-muted-foreground mb-2">Drawdown Stats</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Median Max DD</span>
                              <span className="text-amber-500">-{activeScenario.stats.medianMaxDD.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Worst Max DD (95%)</span>
                              <span className="text-red-500">-{activeScenario.stats.worstMaxDD.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Avg DD Duration</span>
                              <span>{activeScenario.stats.avgDDDuration.toFixed(0)} trades</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Run a simulation to see risk metrics
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Panel - Scenarios */}
        <div className="w-1/4 min-w-[250px] border-l border-border bg-card/50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="text-sm font-medium">📊 Scenarios ({scenarios.length})</div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Compare</Label>
              <Switch checked={compareMode} onCheckedChange={setCompareMode} />
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-48px)]">
            <div className="p-3 space-y-3">
              {scenarios.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No scenarios yet</p>
                  <p className="text-xs mt-1">Run a simulation to create one</p>
                </div>
              ) : (
                scenarios.map(scenario => (
                  <Card
                    key={scenario.id}
                    className={`cursor-pointer transition-all ${
                      activeScenarioId === scenario.id
                        ? 'border-green-500'
                        : 'border-border hover:border-green-500/30'
                    }`}
                    onClick={() => setActiveScenarioId(scenario.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{scenario.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); removeScenario(scenario.id); }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Win Rate: {scenario.config.winRate}%</div>
                        <div>R:R: 1:{(scenario.config.avgWin / scenario.config.avgLoss).toFixed(1)}</div>
                        <div>Risk: {scenario.config.riskPerTrade}%</div>
                      </div>

                      {scenario.status === 'running' && (
                        <div className="mt-2">
                          <Progress value={scenario.progress} className="h-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            Running... {scenario.progress.toFixed(0)}%
                          </div>
                        </div>
                      )}

                      {scenario.status === 'completed' && scenario.stats && (
                        <div className="mt-2 pt-2 border-t border-border space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Median</span>
                            <span className={scenario.stats.medianReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                              ${scenario.stats.medianReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Win Prob</span>
                            <span className="text-blue-500">{scenario.stats.winProbability.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Max DD</span>
                            <span className="text-amber-500">-{scenario.stats.medianMaxDD.toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloSimulator;
