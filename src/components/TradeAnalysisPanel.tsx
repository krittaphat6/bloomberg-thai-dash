import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface TradeAnalysisPanelProps {
  trades: any[];
}

const TradeAnalysisPanel = ({ trades }: TradeAnalysisPanelProps) => {
  // Risk Management Analysis
  const getRiskAnalysis = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    if (closedTrades.length === 0) return null;
    
    const maxDrawdown = Math.min(...closedTrades.map(t => t.pnl!));
    const consecutiveLosses = getMaxConsecutiveLosses();
    const avgRiskReward = getAvgRiskReward();
    
    return {
      maxDrawdown,
      consecutiveLosses,
      avgRiskReward,
      riskScore: calculateRiskScore(maxDrawdown, consecutiveLosses, avgRiskReward)
    };
  };

  const getMaxConsecutiveLosses = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let maxConsecutive = 0;
    let current = 0;
    
    closedTrades.forEach(trade => {
      if (trade.pnl && trade.pnl < 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    });
    
    return maxConsecutive;
  };

  const getAvgRiskReward = () => {
    const tradesWithRR = trades.filter(t => t.riskReward && t.status === 'CLOSED');
    if (tradesWithRR.length === 0) return 0;
    return tradesWithRR.reduce((sum, t) => sum + t.riskReward!, 0) / tradesWithRR.length;
  };

  const calculateRiskScore = (maxDrawdown: number, consecutiveLosses: number, avgRiskReward: number) => {
    let score = 100;
    score -= Math.abs(maxDrawdown) / 10; // Penalize high drawdown
    score -= consecutiveLosses * 5; // Penalize consecutive losses
    score += avgRiskReward * 10; // Reward good risk/reward ratio
    return Math.max(0, Math.min(100, score));
  };

  // Trading Psychology Analysis
  const getPsychologyAnalysis = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const wins = closedTrades.filter(t => t.pnl! > 0);
    const losses = closedTrades.filter(t => t.pnl! < 0);
    
    const avgWinAmount = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl!, 0) / wins.length : 0;
    const avgLossAmount = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl!, 0) / losses.length) : 0;
    
    // FOMO trades detection (trades taken too close together)
    const fomoTrades = detectFOMOTrades();
    
    // Revenge trading detection (large position after losses)
    const revengeTrades = detectRevengeTrades();
    
    return {
      avgWinAmount,
      avgLossAmount,
      fomoTrades,
      revengeTrades,
      disciplineScore: calculateDisciplineScore(fomoTrades, revengeTrades)
    };
  };

  const detectFOMOTrades = () => {
    const sortedTrades = trades.filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let fomoCount = 0;
    
    for (let i = 1; i < sortedTrades.length; i++) {
      const timeDiff = new Date(sortedTrades[i].date).getTime() - new Date(sortedTrades[i-1].date).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 2) { // Trades within 2 hours
        fomoCount++;
      }
    }
    
    return fomoCount;
  };

  const detectRevengeTrades = () => {
    const sortedTrades = trades.filter(t => t.status === 'CLOSED').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let revengeCount = 0;
    
    for (let i = 1; i < sortedTrades.length; i++) {
      const prevTrade = sortedTrades[i-1];
      const currentTrade = sortedTrades[i];
      
      if (prevTrade.pnl! < 0 && currentTrade.quantity > prevTrade.quantity * 1.5) {
        revengeCount++;
      }
    }
    
    return revengeCount;
  };

  const calculateDisciplineScore = (fomoTrades: number, revengeTrades: number) => {
    let score = 100;
    score -= fomoTrades * 10;
    score -= revengeTrades * 15;
    return Math.max(0, score);
  };

  // Strategy Performance Analysis
  const getStrategyAnalysis = () => {
    const strategies = new Map();
    
    trades.filter(t => t.status === 'CLOSED').forEach(trade => {
      const strategy = trade.strategy;
      if (!strategies.has(strategy)) {
        strategies.set(strategy, {
          name: strategy,
          trades: 0,
          wins: 0,
          totalPnL: 0,
          avgPnL: 0,
          winRate: 0
        });
      }
      
      const strategyData = strategies.get(strategy);
      strategyData.trades++;
      strategyData.totalPnL += trade.pnl || 0;
      
      if (trade.pnl! > 0) {
        strategyData.wins++;
      }
    });
    
    // Calculate final metrics
    strategies.forEach(strategy => {
      strategy.avgPnL = strategy.totalPnL / strategy.trades;
      strategy.winRate = (strategy.wins / strategy.trades) * 100;
    });
    
    return Array.from(strategies.values()).sort((a, b) => b.totalPnL - a.totalPnL);
  };

  const riskAnalysis = getRiskAnalysis();
  const psychologyAnalysis = getPsychologyAnalysis();
  const strategyAnalysis = getStrategyAnalysis();

  if (!riskAnalysis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-full">
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Add some trades to see advanced analysis</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Risk Management Analysis */}
      <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Risk Score</span>
              <span className="text-2xl font-bold text-red-400">{riskAnalysis.riskScore.toFixed(0)}</span>
            </div>
            <Progress value={riskAnalysis.riskScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Max Drawdown:</span>
              <span className="text-sm font-medium text-red-400">${riskAnalysis.maxDrawdown.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Max Consecutive Losses:</span>
              <span className="text-sm font-medium">{riskAnalysis.consecutiveLosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Risk/Reward:</span>
              <span className="text-sm font-medium text-emerald-400">{riskAnalysis.avgRiskReward.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Psychology */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/5 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Trading Psychology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Discipline Score</span>
              <span className="text-2xl font-bold text-purple-400">{psychologyAnalysis.disciplineScore.toFixed(0)}</span>
            </div>
            <Progress value={psychologyAnalysis.disciplineScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">FOMO Trades:</span>
              <Badge variant={psychologyAnalysis.fomoTrades > 5 ? "destructive" : "secondary"}>
                {psychologyAnalysis.fomoTrades}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Revenge Trades:</span>
              <Badge variant={psychologyAnalysis.revengeTrades > 3 ? "destructive" : "secondary"}>
                {psychologyAnalysis.revengeTrades}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Win/Loss:</span>
              <span className="text-sm font-medium">
                ${psychologyAnalysis.avgWinAmount.toFixed(0)}/${psychologyAnalysis.avgLossAmount.toFixed(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Performance */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            Strategy Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {strategyAnalysis.slice(0, 4).map((strategy, index) => (
            <div key={strategy.name} className="p-3 bg-muted/20 rounded-lg border border-border/40">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{strategy.name}</span>
                <span className={`text-sm font-bold ${strategy.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${strategy.totalPnL.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{strategy.trades} trades</span>
                <span>{strategy.winRate.toFixed(0)}% win rate</span>
              </div>
              <Progress 
                value={strategy.winRate} 
                className="h-1 mt-1" 
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeAnalysisPanel;