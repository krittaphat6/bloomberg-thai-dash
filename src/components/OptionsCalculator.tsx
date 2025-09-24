import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Info,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, AreaChart, Tooltip, Legend } from 'recharts';

interface OptionLeg {
  id: string;
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  strike: number;
  premium: number;
  quantity: number;
  expiration: Date;
}

interface OptionStrategy {
  name: string;
  legs: Omit<OptionLeg, 'id' | 'expiration' | 'premium'>[];
  description: string;
  maxProfit: string;
  maxLoss: string;
  breakeven: string;
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

interface OptionPricing {
  price: number;
  intrinsic: number;
  timeValue: number;
  greeks: Greeks;
}

interface RiskMetrics {
  maxProfit: number;
  maxLoss: number;
  breakevens: number[];
  probabilityOfProfit: number;
  riskRewardRatio: number;
  betaWeightedDelta: number;
}

const PREDEFINED_STRATEGIES: OptionStrategy[] = [
  {
    name: 'Long Call',
    legs: [{ type: 'call', action: 'buy', strike: 100, quantity: 1 }],
    description: 'Bullish strategy with unlimited profit potential',
    maxProfit: 'Unlimited',
    maxLoss: 'Premium Paid',
    breakeven: 'Strike + Premium'
  },
  {
    name: 'Long Put',
    legs: [{ type: 'put', action: 'buy', strike: 100, quantity: 1 }],
    description: 'Bearish strategy with high profit potential',
    maxProfit: 'Strike - Premium',
    maxLoss: 'Premium Paid',
    breakeven: 'Strike - Premium'
  },
  {
    name: 'Covered Call',
    legs: [
      { type: 'call', action: 'sell', strike: 105, quantity: 1 }
    ],
    description: 'Income generation on existing stock position',
    maxProfit: 'Strike - Stock Price + Premium',
    maxLoss: 'Stock Price - Premium',
    breakeven: 'Stock Price - Premium'
  },
  {
    name: 'Bull Call Spread',
    legs: [
      { type: 'call', action: 'buy', strike: 100, quantity: 1 },
      { type: 'call', action: 'sell', strike: 110, quantity: 1 }
    ],
    description: 'Limited risk bullish strategy',
    maxProfit: 'Strike Difference - Net Premium',
    maxLoss: 'Net Premium Paid',
    breakeven: 'Lower Strike + Net Premium'
  },
  {
    name: 'Bear Put Spread',
    legs: [
      { type: 'put', action: 'buy', strike: 110, quantity: 1 },
      { type: 'put', action: 'sell', strike: 100, quantity: 1 }
    ],
    description: 'Limited risk bearish strategy',
    maxProfit: 'Strike Difference - Net Premium',
    maxLoss: 'Net Premium Paid',
    breakeven: 'Higher Strike - Net Premium'
  },
  {
    name: 'Long Straddle',
    legs: [
      { type: 'call', action: 'buy', strike: 100, quantity: 1 },
      { type: 'put', action: 'buy', strike: 100, quantity: 1 }
    ],
    description: 'Profit from high volatility in either direction',
    maxProfit: 'Unlimited',
    maxLoss: 'Total Premium Paid',
    breakeven: 'Strike ± Total Premium'
  },
  {
    name: 'Iron Condor',
    legs: [
      { type: 'put', action: 'sell', strike: 95, quantity: 1 },
      { type: 'put', action: 'buy', strike: 90, quantity: 1 },
      { type: 'call', action: 'sell', strike: 105, quantity: 1 },
      { type: 'call', action: 'buy', strike: 110, quantity: 1 }
    ],
    description: 'Profit from low volatility and time decay',
    maxProfit: 'Net Premium Received',
    maxLoss: 'Strike Width - Net Premium',
    breakeven: 'Multiple breakevens'
  }
];

export default function OptionsCalculator() {
  const { toast } = useToast();
  
  // Market Data
  const [underlyingPrice, setUnderlyingPrice] = useState(100);
  const [riskFreeRate, setRiskFreeRate] = useState(0.05);
  const [dividendYield, setDividendYield] = useState(0.02);
  const [impliedVolatility, setImpliedVolatility] = useState(0.25);
  const [daysToExpiration, setDaysToExpiration] = useState(30);
  
  // Strategy Builder
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [customStrategyName, setCustomStrategyName] = useState('');
  
  // Analysis Settings
  const [priceRange, setPriceRange] = useState({ min: 80, max: 120 });
  const [analysisType, setAnalysisType] = useState<'pnl' | 'greeks' | 'probability'>('pnl');
  const [monteCarloSims, setMonteCarloSims] = useState(10000);

  // Black-Scholes Formula
  const blackScholes = useCallback((
    S: number, // Stock price
    K: number, // Strike price
    T: number, // Time to expiration (years)
    r: number, // Risk-free rate
    q: number, // Dividend yield
    sigma: number, // Volatility
    optionType: 'call' | 'put'
  ): OptionPricing => {
    
    const normalCDF = (x: number): number => {
      return 0.5 * (1 + erf(x / Math.sqrt(2)));
    };
    
    const erf = (x: number): number => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;
      
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x);
      
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
      
      return sign * y;
    };

    if (T <= 0) {
      const intrinsic = optionType === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
      return {
        price: intrinsic,
        intrinsic,
        timeValue: 0,
        greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
      };
    }

    const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    const Nd1 = normalCDF(d1);
    const Nd2 = normalCDF(d2);
    const nPrime = (1/Math.sqrt(2*Math.PI)) * Math.exp(-0.5 * d1 * d1);
    
    let price: number;
    let delta: number;
    let intrinsic: number;
    
    if (optionType === 'call') {
      price = S * Math.exp(-q * T) * Nd1 - K * Math.exp(-r * T) * Nd2;
      delta = Math.exp(-q * T) * Nd1;
      intrinsic = Math.max(S - K, 0);
    } else {
      price = K * Math.exp(-r * T) * normalCDF(-d2) - S * Math.exp(-q * T) * normalCDF(-d1);
      delta = -Math.exp(-q * T) * normalCDF(-d1);
      intrinsic = Math.max(K - S, 0);
    }
    
    const gamma = (Math.exp(-q * T) * nPrime) / (S * sigma * Math.sqrt(T));
    const theta = (-(S * nPrime * sigma * Math.exp(-q * T)) / (2 * Math.sqrt(T)) 
                  - r * K * Math.exp(-r * T) * (optionType === 'call' ? Nd2 : normalCDF(-d2))
                  + q * S * Math.exp(-q * T) * (optionType === 'call' ? Nd1 : normalCDF(-d1))) / 365;
    const vega = (S * Math.exp(-q * T) * nPrime * Math.sqrt(T)) / 100;
    const rho = optionType === 'call' 
      ? (K * T * Math.exp(-r * T) * Nd2) / 100
      : -(K * T * Math.exp(-r * T) * normalCDF(-d2)) / 100;
    
    return {
      price: Math.max(price, intrinsic),
      intrinsic,
      timeValue: Math.max(price - intrinsic, 0),
      greeks: { delta, gamma, theta, vega, rho }
    };
  }, []);

  // Calculate option pricing for a leg
  const calculateLegPricing = useCallback((leg: OptionLeg): OptionPricing => {
    const T = daysToExpiration / 365;
    return blackScholes(
      underlyingPrice,
      leg.strike,
      T,
      riskFreeRate,
      dividendYield,
      impliedVolatility,
      leg.type
    );
  }, [underlyingPrice, daysToExpiration, riskFreeRate, dividendYield, impliedVolatility, blackScholes]);

  // Calculate P&L for strategy at different stock prices
  const calculatePnLChart = useMemo(() => {
    if (legs.length === 0) return [];

    const pricePoints: number[] = [];
    for (let price = priceRange.min; price <= priceRange.max; price += (priceRange.max - priceRange.min) / 100) {
      pricePoints.push(price);
    }

    return pricePoints.map(stockPrice => {
      let totalPnL = 0;
      let currentValue = 0;
      let maxProfit = 0;
      let maxLoss = 0;

      legs.forEach(leg => {
        const initialPremium = leg.premium;
        let optionValue = 0;

        // Calculate intrinsic value at expiration
        if (leg.type === 'call') {
          optionValue = Math.max(stockPrice - leg.strike, 0);
        } else {
          optionValue = Math.max(leg.strike - stockPrice, 0);
        }

        const legPnL = leg.action === 'buy' 
          ? (optionValue - initialPremium) * leg.quantity
          : (initialPremium - optionValue) * leg.quantity;

        totalPnL += legPnL;

        // For current value calculation (before expiration)
        if (daysToExpiration > 0) {
          const T = daysToExpiration / 365;
          const currentPricing = blackScholes(
            stockPrice,
            leg.strike,
            T,
            riskFreeRate,
            dividendYield,
            impliedVolatility,
            leg.type
          );
          
          const currentLegValue = leg.action === 'buy'
            ? (currentPricing.price - initialPremium) * leg.quantity
            : (initialPremium - currentPricing.price) * leg.quantity;
          
          currentValue += currentLegValue;
        }
      });

      return {
        stockPrice: parseFloat(stockPrice.toFixed(2)),
        pnlAtExpiration: parseFloat(totalPnL.toFixed(2)),
        currentPnL: parseFloat((daysToExpiration > 0 ? currentValue : totalPnL).toFixed(2)),
        profit: totalPnL > 0 ? totalPnL : 0,
        loss: totalPnL < 0 ? Math.abs(totalPnL) : 0
      };
    });
  }, [legs, priceRange, blackScholes, daysToExpiration, riskFreeRate, dividendYield, impliedVolatility]);

  // Calculate aggregate Greeks
  const aggregateGreeks = useMemo((): Greeks => {
    if (legs.length === 0) return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };

    return legs.reduce((acc, leg) => {
      const pricing = calculateLegPricing(leg);
      const multiplier = leg.action === 'buy' ? 1 : -1;
      
      return {
        delta: acc.delta + (pricing.greeks.delta * leg.quantity * multiplier),
        gamma: acc.gamma + (pricing.greeks.gamma * leg.quantity * multiplier),
        theta: acc.theta + (pricing.greeks.theta * leg.quantity * multiplier),
        vega: acc.vega + (pricing.greeks.vega * leg.quantity * multiplier),
        rho: acc.rho + (pricing.greeks.rho * leg.quantity * multiplier)
      };
    }, { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 });
  }, [legs, calculateLegPricing]);

  // Calculate risk metrics
  const riskMetrics = useMemo((): RiskMetrics => {
    if (calculatePnLChart.length === 0) {
      return {
        maxProfit: 0,
        maxLoss: 0,
        breakevens: [],
        probabilityOfProfit: 0,
        riskRewardRatio: 0,
        betaWeightedDelta: 0
      };
    }

    const maxProfit = Math.max(...calculatePnLChart.map(point => point.pnlAtExpiration));
    const maxLoss = Math.min(...calculatePnLChart.map(point => point.pnlAtExpiration));
    
    // Find breakeven points
    const breakevens: number[] = [];
    for (let i = 1; i < calculatePnLChart.length; i++) {
      const prev = calculatePnLChart[i - 1];
      const curr = calculatePnLChart[i];
      
      if ((prev.pnlAtExpiration <= 0 && curr.pnlAtExpiration > 0) ||
          (prev.pnlAtExpiration >= 0 && curr.pnlAtExpiration < 0)) {
        // Linear interpolation to find exact breakeven
        const ratio = Math.abs(prev.pnlAtExpiration) / (Math.abs(prev.pnlAtExpiration) + Math.abs(curr.pnlAtExpiration));
        const breakeven = prev.stockPrice + ratio * (curr.stockPrice - prev.stockPrice);
        breakevens.push(parseFloat(breakeven.toFixed(2)));
      }
    }

    // Calculate probability of profit (simplified)
    const profitablePoints = calculatePnLChart.filter(point => point.pnlAtExpiration > 0).length;
    const probabilityOfProfit = (profitablePoints / calculatePnLChart.length) * 100;

    // Risk-reward ratio
    const riskRewardRatio = maxLoss !== 0 ? Math.abs(maxProfit / maxLoss) : 0;

    return {
      maxProfit,
      maxLoss,
      breakevens,
      probabilityOfProfit,
      riskRewardRatio,
      betaWeightedDelta: aggregateGreeks.delta
    };
  }, [calculatePnLChart, aggregateGreeks.delta]);

  // Add leg to strategy
  const addLeg = useCallback(() => {
    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}`,
      type: 'call',
      action: 'buy',
      strike: underlyingPrice,
      premium: 0,
      quantity: 1,
      expiration: new Date(Date.now() + daysToExpiration * 24 * 60 * 60 * 1000)
    };

    // Calculate premium automatically
    const pricing = blackScholes(
      underlyingPrice,
      newLeg.strike,
      daysToExpiration / 365,
      riskFreeRate,
      dividendYield,
      impliedVolatility,
      newLeg.type
    );

    newLeg.premium = parseFloat(pricing.price.toFixed(2));
    setLegs(prev => [...prev, newLeg]);
  }, [underlyingPrice, daysToExpiration, blackScholes, riskFreeRate, dividendYield, impliedVolatility]);

  // Update leg
  const updateLeg = useCallback((legId: string, updates: Partial<OptionLeg>) => {
    setLegs(prev => prev.map(leg => {
      if (leg.id === legId) {
        const updatedLeg = { ...leg, ...updates };
        
        // Recalculate premium if strike or type changed
        if (updates.strike !== undefined || updates.type !== undefined) {
          const pricing = blackScholes(
            underlyingPrice,
            updatedLeg.strike,
            daysToExpiration / 365,
            riskFreeRate,
            dividendYield,
            impliedVolatility,
            updatedLeg.type
          );
          updatedLeg.premium = parseFloat(pricing.price.toFixed(2));
        }
        
        return updatedLeg;
      }
      return leg;
    }));
  }, [underlyingPrice, daysToExpiration, blackScholes, riskFreeRate, dividendYield, impliedVolatility]);

  // Remove leg
  const removeLeg = useCallback((legId: string) => {
    setLegs(prev => prev.filter(leg => leg.id !== legId));
  }, []);

  // Load predefined strategy
  const loadStrategy = useCallback((strategyName: string) => {
    const strategy = PREDEFINED_STRATEGIES.find(s => s.name === strategyName);
    if (!strategy) return;

    const newLegs: OptionLeg[] = strategy.legs.map((leg, index) => {
      const newLeg: OptionLeg = {
        id: `leg-${Date.now()}-${index}`,
        ...leg,
        premium: 0,
        expiration: new Date(Date.now() + daysToExpiration * 24 * 60 * 60 * 1000)
      };

      // Calculate premium
      const pricing = blackScholes(
        underlyingPrice,
        newLeg.strike,
        daysToExpiration / 365,
        riskFreeRate,
        dividendYield,
        impliedVolatility,
        newLeg.type
      );

      newLeg.premium = parseFloat(pricing.price.toFixed(2));
      return newLeg;
    });

    setLegs(newLegs);
    setCustomStrategyName(strategyName);
    setSelectedStrategy(strategyName);
  }, [daysToExpiration, underlyingPrice, blackScholes, riskFreeRate, dividendYield, impliedVolatility]);

  // Monte Carlo simulation for probability analysis
  const runMonteCarloSimulation = useCallback(() => {
    if (legs.length === 0) return [];

    const results = [];
    const dt = daysToExpiration / 365;
    const drift = riskFreeRate - dividendYield - 0.5 * impliedVolatility * impliedVolatility;
    
    for (let i = 0; i < monteCarloSims; i++) {
      // Generate random stock price at expiration
      const randomNormal = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
      const finalPrice = underlyingPrice * Math.exp(drift * dt + impliedVolatility * Math.sqrt(dt) * randomNormal);
      
      // Calculate P&L for this simulation
      let totalPnL = 0;
      legs.forEach(leg => {
        let optionValue = 0;
        if (leg.type === 'call') {
          optionValue = Math.max(finalPrice - leg.strike, 0);
        } else {
          optionValue = Math.max(leg.strike - finalPrice, 0);
        }
        
        const legPnL = leg.action === 'buy' 
          ? (optionValue - leg.premium) * leg.quantity
          : (leg.premium - optionValue) * leg.quantity;
        
        totalPnL += legPnL;
      });
      
      results.push({
        simulation: i + 1,
        finalPrice: parseFloat(finalPrice.toFixed(2)),
        pnl: parseFloat(totalPnL.toFixed(2)),
        profitable: totalPnL > 0
      });
    }
    
    return results;
  }, [legs, monteCarloSims, daysToExpiration, impliedVolatility, riskFreeRate, dividendYield, underlyingPrice]);

  // Export analysis
  const exportAnalysis = useCallback(() => {
    const analysis = {
      marketData: {
        underlyingPrice,
        riskFreeRate,
        dividendYield,
        impliedVolatility,
        daysToExpiration
      },
      strategy: {
        name: customStrategyName || 'Custom Strategy',
        legs: legs.map(leg => ({
          type: leg.type,
          action: leg.action,
          strike: leg.strike,
          premium: leg.premium,
          quantity: leg.quantity
        }))
      },
      greeks: aggregateGreeks,
      riskMetrics,
      pnlChart: calculatePnLChart
    };

    const dataStr = JSON.stringify(analysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `options-analysis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Analysis Exported",
      description: "Options analysis exported successfully"
    });
  }, [underlyingPrice, riskFreeRate, dividendYield, impliedVolatility, daysToExpiration, customStrategyName, legs, aggregateGreeks, riskMetrics, calculatePnLChart, toast]);

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <Calculator className="h-5 w-5" />
          OPTIONS CALCULATOR - Advanced Trading Analysis
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Black-Scholes pricing • Greeks analysis • Strategy builder • Monte Carlo simulation
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="builder" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="builder">Strategy Builder</TabsTrigger>
            <TabsTrigger value="analysis">P&L Analysis</TabsTrigger>
            <TabsTrigger value="greeks">Greeks</TabsTrigger>
            <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
            <TabsTrigger value="simulation">Monte Carlo</TabsTrigger>
          </TabsList>

          {/* Strategy Builder */}
          <TabsContent value="builder" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Market Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Market Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Underlying Price</Label>
                      <Input
                        type="number"
                        value={underlyingPrice}
                        onChange={(e) => setUnderlyingPrice(parseFloat(e.target.value) || 0)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Days to Expiration</Label>
                      <Input
                        type="number"
                        value={daysToExpiration}
                        onChange={(e) => setDaysToExpiration(parseInt(e.target.value) || 0)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Implied Volatility (%)</Label>
                      <Input
                        type="number"
                        value={impliedVolatility * 100}
                        onChange={(e) => setImpliedVolatility((parseFloat(e.target.value) || 0) / 100)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Risk-free Rate (%)</Label>
                      <Input
                        type="number"
                        value={riskFreeRate * 100}
                        onChange={(e) => setRiskFreeRate((parseFloat(e.target.value) || 0) / 100)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dividend Yield (%)</Label>
                      <Input
                        type="number"
                        value={dividendYield * 100}
                        onChange={(e) => setDividendYield((parseFloat(e.target.value) || 0) / 100)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Predefined Strategies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={selectedStrategy} onValueChange={loadStrategy}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select a strategy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_STRATEGIES.map(strategy => (
                        <SelectItem key={strategy.name} value={strategy.name}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Input
                    placeholder="Custom strategy name..."
                    value={customStrategyName}
                    onChange={(e) => setCustomStrategyName(e.target.value)}
                    className="text-xs"
                  />
                  
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addLeg} className="flex-1">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Leg
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLegs([])}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Option Legs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Option Legs ({legs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {legs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No option legs added yet</p>
                    <p className="text-xs">Add legs to build your strategy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {legs.map((leg, index) => {
                      const pricing = calculateLegPricing(leg);
                      return (
                        <Card key={leg.id} className="border border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline" className="text-xs">
                                Leg {index + 1}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeLeg(leg.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-6 gap-3">
                              <div>
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={leg.type}
                                  onValueChange={(value: 'call' | 'put') => updateLeg(leg.id, { type: value })}
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="call">Call</SelectItem>
                                    <SelectItem value="put">Put</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-xs">Action</Label>
                                <Select
                                  value={leg.action}
                                  onValueChange={(value: 'buy' | 'sell') => updateLeg(leg.id, { action: value })}
                                >
                                  <SelectTrigger className="text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="buy">Buy</SelectItem>
                                    <SelectItem value="sell">Sell</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-xs">Strike</Label>
                                <Input
                                  type="number"
                                  value={leg.strike}
                                  onChange={(e) => updateLeg(leg.id, { strike: parseFloat(e.target.value) || 0 })}
                                  className="text-xs h-8"
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs">Premium</Label>
                                <Input
                                  type="number"
                                  value={leg.premium}
                                  onChange={(e) => updateLeg(leg.id, { premium: parseFloat(e.target.value) || 0 })}
                                  className="text-xs h-8"
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs">Quantity</Label>
                                <Input
                                  type="number"
                                  value={leg.quantity}
                                  onChange={(e) => updateLeg(leg.id, { quantity: parseInt(e.target.value) || 1 })}
                                  className="text-xs h-8"
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs">Greeks</Label>
                                <div className="text-xs text-muted-foreground">
                                  Δ: {pricing.greeks.delta.toFixed(3)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Current:</span> ${pricing.price.toFixed(2)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Intrinsic:</span> ${pricing.intrinsic.toFixed(2)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Time Value:</span> ${pricing.timeValue.toFixed(2)}
                              </div>
                              <div className={leg.action === 'buy' ? 'text-red-500' : 'text-terminal-green'}>
                                <span className="text-muted-foreground">Cost:</span> ${(leg.premium * leg.quantity).toFixed(2)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* P&L Analysis */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Strategy Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Strategy:</span>
                      <Badge variant="outline">{customStrategyName || 'Custom'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Legs:</span>
                      <span>{legs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Cost:</span>
                      <span className={legs.reduce((sum, leg) => sum + (leg.action === 'buy' ? leg.premium : -leg.premium) * leg.quantity, 0) > 0 ? 'text-red-500' : 'text-terminal-green'}>
                        ${legs.reduce((sum, leg) => sum + (leg.action === 'buy' ? leg.premium : -leg.premium) * leg.quantity, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current P&L:</span>
                      <span className={calculatePnLChart.find(p => Math.abs(p.stockPrice - underlyingPrice) < 0.5)?.currentPnL || 0 > 0 ? 'text-terminal-green' : 'text-red-500'}>
                        ${(calculatePnLChart.find(p => Math.abs(p.stockPrice - underlyingPrice) < 0.5)?.currentPnL || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Price Range</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs">Min Price</Label>
                    <Input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Price</Label>
                    <Input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseFloat(e.target.value) || 0 }))}
                      className="text-xs h-8"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button size="sm" onClick={exportAnalysis} className="w-full">
                    <Download className="h-3 w-3 mr-1" />
                    Export Analysis
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    <Settings className="h-3 w-3 mr-1" />
                    Advanced Settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* P&L Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Profit & Loss Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={calculatePnLChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 197, 94, 0.1)" />
                      <XAxis 
                        dataKey="stockPrice" 
                        stroke="rgba(34, 197, 94, 0.5)"
                        fontSize={10}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <YAxis 
                        stroke="rgba(34, 197, 94, 0.5)"
                        fontSize={10}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                        formatter={(value, name) => [
                          `$${(value as number).toFixed(2)}`, 
                          name === 'pnlAtExpiration' ? 'P&L at Expiration' : 'Current P&L'
                        ]}
                        labelFormatter={(value) => `Stock Price: $${value}`}
                      />
                      <ReferenceLine y={0} stroke="rgba(245, 158, 11, 0.8)" strokeDasharray="2 2" />
                      <ReferenceLine 
                        x={underlyingPrice} 
                        stroke="rgba(139, 92, 246, 0.8)" 
                        strokeDasharray="2 2"
                        label={{ value: "Current", position: "top", fontSize: 10 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pnlAtExpiration"
                        stroke="rgba(34, 197, 94, 0.8)"
                        fill="url(#colorPnL)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="currentPnL"
                        stroke="rgba(245, 158, 11, 0.8)"
                        fill="url(#colorCurrent)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                      <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgba(34, 197, 94, 0.3)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="rgba(34, 197, 94, 0.1)" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgba(245, 158, 11, 0.2)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="rgba(245, 158, 11, 0.1)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Greeks */}
          <TabsContent value="greeks" className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Delta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-terminal-green">
                    {aggregateGreeks.delta.toFixed(3)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Price sensitivity to underlying movement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Gamma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-terminal-amber">
                    {aggregateGreeks.gamma.toFixed(4)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rate of change of delta
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Theta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {aggregateGreeks.theta.toFixed(3)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Time decay per day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Vega
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">
                    {aggregateGreeks.vega.toFixed(3)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sensitivity to volatility
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Rho
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    {aggregateGreeks.rho.toFixed(3)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interest rate sensitivity
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Greeks explanation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Greeks Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div>
                      <strong>Delta:</strong> Measures the rate of change of option price with respect to changes in the underlying asset's price.
                    </div>
                    <div>
                      <strong>Gamma:</strong> Measures the rate of change of delta with respect to changes in the underlying price.
                    </div>
                    <div>
                      <strong>Theta:</strong> Measures the sensitivity of option price to the passage of time (time decay).
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <strong>Vega:</strong> Measures sensitivity to volatility changes. Higher vega means more sensitive to volatility.
                    </div>
                    <div>
                      <strong>Rho:</strong> Measures sensitivity to interest rate changes. Less important for short-term options.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk Metrics */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Risk Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Max Profit:</span>
                    <span className="text-sm font-medium text-terminal-green">
                      {riskMetrics.maxProfit === Infinity ? 'Unlimited' : `$${riskMetrics.maxProfit.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Max Loss:</span>
                    <span className="text-sm font-medium text-red-500">
                      ${Math.abs(riskMetrics.maxLoss).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Risk/Reward Ratio:</span>
                    <span className="text-sm font-medium">
                      {riskMetrics.riskRewardRatio.toFixed(2)}:1
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Probability of Profit:</span>
                    <span className="text-sm font-medium text-terminal-amber">
                      {riskMetrics.probabilityOfProfit.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Breakeven Points</CardTitle>
                </CardHeader>
                <CardContent>
                  {riskMetrics.breakevens.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No breakeven points found</div>
                  ) : (
                    <div className="space-y-2">
                      {riskMetrics.breakevens.map((breakeven, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Breakeven {index + 1}:</span>
                          <Badge variant="outline" className="text-xs">
                            ${breakeven.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Risk Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Risk Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={calculatePnLChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 197, 94, 0.1)" />
                      <XAxis 
                        dataKey="stockPrice" 
                        stroke="rgba(34, 197, 94, 0.5)"
                        fontSize={10}
                      />
                      <YAxis stroke="rgba(34, 197, 94, 0.5)" fontSize={10} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          fontSize: '12px'
                        }}
                      />
                      <ReferenceLine y={0} stroke="rgba(245, 158, 11, 0.8)" />
                      <Area
                        dataKey="profit"
                        stackId="1"
                        stroke="rgba(34, 197, 94, 0.8)"
                        fill="rgba(34, 197, 94, 0.3)"
                      />
                      <Area
                        dataKey="loss"
                        stackId="2"
                        stroke="rgba(239, 68, 68, 0.8)"
                        fill="rgba(239, 68, 68, 0.3)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monte Carlo Simulation */}
          <TabsContent value="simulation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monte Carlo Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Simulations</Label>
                    <Input
                      type="number"
                      value={monteCarloSims}
                      onChange={(e) => setMonteCarloSims(parseInt(e.target.value) || 1000)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Confidence Level</Label>
                    <Select defaultValue="95">
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="99">99%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        const results = runMonteCarloSimulation();
                        const profitable = results.filter(r => r.profitable).length;
                        const profitability = (profitable / results.length * 100).toFixed(1);
                        
                        toast({
                          title: "Simulation Complete",
                          description: `${results.length} simulations run. ${profitability}% profitable scenarios.`
                        });
                      }}
                      className="h-8"
                    >
                      Run Simulation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Simulation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Run simulation to see results</p>
                    <p className="text-xs">Distribution of outcomes and statistics</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Value at Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">VaR calculation</p>
                    <p className="text-xs">Risk metrics from simulation</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}