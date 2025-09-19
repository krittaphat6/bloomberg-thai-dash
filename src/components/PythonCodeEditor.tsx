import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Save, 
  FileText, 
  Code, 
  Terminal, 
  Download, 
  Upload,
  Folder,
  Plus,
  Settings,
  Bug,
  Zap,
  BarChart3,
  TrendingUp,
  Calculator,
  Database
} from 'lucide-react';

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: 'python' | 'javascript' | 'sql';
  type: 'model' | 'analysis' | 'backtest' | 'strategy';
}

interface ModelOutput {
  type: 'plot' | 'data' | 'error' | 'log';
  content: any;
  timestamp: Date;
}

export const PythonCodeEditor: React.FC = () => {
  const [files, setFiles] = useState<CodeFile[]>([
    {
      id: '1',
      name: 'portfolio_optimization.py',
      language: 'python',
      type: 'model',
      content: `import numpy as np
import pandas as pd
from scipy.optimize import minimize
import matplotlib.pyplot as plt
import yfinance as yf

class PortfolioOptimizer:
    def __init__(self, tickers, start_date, end_date):
        self.tickers = tickers
        self.start_date = start_date
        self.end_date = end_date
        self.data = None
        self.returns = None
        self.cov_matrix = None
        
    def fetch_data(self):
        """Fetch historical price data"""
        self.data = yf.download(self.tickers, start=self.start_date, end=self.end_date)['Close']
        self.returns = self.data.pct_change().dropna()
        self.cov_matrix = self.returns.cov() * 252  # Annualized
        
    def portfolio_stats(self, weights):
        """Calculate portfolio statistics"""
        portfolio_return = np.sum(self.returns.mean() * weights) * 252
        portfolio_std = np.sqrt(np.dot(weights.T, np.dot(self.cov_matrix, weights)))
        sharpe_ratio = portfolio_return / portfolio_std
        return portfolio_return, portfolio_std, sharpe_ratio
    
    def negative_sharpe(self, weights):
        """Objective function to minimize (negative Sharpe ratio)"""
        return -self.portfolio_stats(weights)[2]
    
    def optimize_portfolio(self, target_return=None):
        """Optimize portfolio for maximum Sharpe ratio"""
        n_assets = len(self.tickers)
        args = ()
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        # Initial guess (equal weights)
        initial_guess = np.array([1/n_assets] * n_assets)
        
        # Optimize
        result = minimize(self.negative_sharpe, initial_guess, 
                        method='SLSQP', bounds=bounds, 
                        constraints=constraints, args=args)
        
        return result.x
    
    def efficient_frontier(self, n_portfolios=100):
        """Generate efficient frontier"""
        results = np.zeros((3, n_portfolios))
        target_returns = np.linspace(self.returns.mean().min()*252, 
                                   self.returns.mean().max()*252, n_portfolios)
        
        for i, target in enumerate(target_returns):
            # Constraint for target return
            constraints = [
                {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
                {'type': 'eq', 'fun': lambda x: np.sum(self.returns.mean() * x * 252) - target}
            ]
            
            n_assets = len(self.tickers)
            bounds = tuple((0, 1) for _ in range(n_assets))
            initial_guess = np.array([1/n_assets] * n_assets)
            
            # Minimize variance for given return
            def portfolio_variance(weights):
                return np.dot(weights.T, np.dot(self.cov_matrix, weights))
            
            result = minimize(portfolio_variance, initial_guess,
                            method='SLSQP', bounds=bounds, constraints=constraints)
            
            if result.success:
                weights = result.x
                ret, vol, sharpe = self.portfolio_stats(weights)
                results[0, i] = ret
                results[1, i] = vol
                results[2, i] = sharpe
        
        return results

# Example usage
if __name__ == "__main__":
    # Define portfolio
    tickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
    optimizer = PortfolioOptimizer(tickers, '2020-01-01', '2024-01-01')
    
    # Fetch data and optimize
    optimizer.fetch_data()
    optimal_weights = optimizer.optimize_portfolio()
    
    print("Optimal Portfolio Weights:")
    for ticker, weight in zip(tickers, optimal_weights):
        print(f"{ticker}: {weight:.2%}")
    
    # Calculate stats
    ret, vol, sharpe = optimizer.portfolio_stats(optimal_weights)
    print(f"\\nExpected Return: {ret:.2%}")
    print(f"Volatility: {vol:.2%}")
    print(f"Sharpe Ratio: {sharpe:.3f}")
    
    # Generate efficient frontier
    frontier = optimizer.efficient_frontier()
    
    # Plot results
    plt.figure(figsize=(12, 8))
    plt.scatter(frontier[1], frontier[0], c=frontier[2], cmap='viridis', alpha=0.7)
    plt.colorbar(label='Sharpe Ratio')
    plt.scatter(vol, ret, color='red', s=100, label='Optimal Portfolio')
    plt.xlabel('Volatility')
    plt.ylabel('Expected Return')
    plt.title('Efficient Frontier')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.show()`
    },
    {
      id: '2',
      name: 'risk_models.py',
      language: 'python',
      type: 'model',
      content: `import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

class RiskModels:
    def __init__(self, returns_data):
        self.returns = returns_data
        
    def value_at_risk(self, confidence_level=0.05, method='parametric'):
        """Calculate Value at Risk"""
        if method == 'parametric':
            # Parametric VaR (assumes normal distribution)
            mean_return = self.returns.mean()
            std_return = self.returns.std()
            var = mean_return - stats.norm.ppf(confidence_level) * std_return
            
        elif method == 'historical':
            # Historical VaR
            var = self.returns.quantile(confidence_level)
            
        elif method == 'monte_carlo':
            # Monte Carlo VaR
            n_simulations = 10000
            simulated_returns = np.random.normal(
                self.returns.mean(), self.returns.std(), n_simulations
            )
            var = np.percentile(simulated_returns, confidence_level * 100)
            
        return var
    
    def expected_shortfall(self, confidence_level=0.05):
        """Calculate Expected Shortfall (Conditional VaR)"""
        var = self.value_at_risk(confidence_level, method='historical')
        es = self.returns[self.returns <= var].mean()
        return es
    
    def maximum_drawdown(self):
        """Calculate Maximum Drawdown"""
        cumulative = (1 + self.returns).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        return drawdown.min()
    
    def beta_calculation(self, market_returns):
        """Calculate Beta vs market"""
        covariance = np.cov(self.returns, market_returns)[0][1]
        market_variance = np.var(market_returns)
        beta = covariance / market_variance
        return beta
    
    def sharpe_ratio(self, risk_free_rate=0.02):
        """Calculate Sharpe Ratio"""
        excess_return = self.returns.mean() * 252 - risk_free_rate
        volatility = self.returns.std() * np.sqrt(252)
        return excess_return / volatility
    
    def information_ratio(self, benchmark_returns):
        """Calculate Information Ratio"""
        active_returns = self.returns - benchmark_returns
        tracking_error = active_returns.std() * np.sqrt(252)
        excess_return = active_returns.mean() * 252
        return excess_return / tracking_error
    
    def downside_deviation(self, target_return=0):
        """Calculate Downside Deviation"""
        downside_returns = self.returns[self.returns < target_return]
        return np.sqrt(np.mean((downside_returns - target_return) ** 2))
    
    def sortino_ratio(self, target_return=0, risk_free_rate=0.02):
        """Calculate Sortino Ratio"""
        excess_return = self.returns.mean() * 252 - risk_free_rate
        downside_dev = self.downside_deviation(target_return) * np.sqrt(252)
        return excess_return / downside_dev
    
    def risk_report(self):
        """Generate comprehensive risk report"""
        report = {
            'VaR_95%': self.value_at_risk(0.05),
            'VaR_99%': self.value_at_risk(0.01),
            'Expected_Shortfall_95%': self.expected_shortfall(0.05),
            'Maximum_Drawdown': self.maximum_drawdown(),
            'Sharpe_Ratio': self.sharpe_ratio(),
            'Sortino_Ratio': self.sortino_ratio(),
            'Volatility': self.returns.std() * np.sqrt(252),
            'Skewness': stats.skew(self.returns),
            'Kurtosis': stats.kurtosis(self.returns)
        }
        return pd.Series(report)

# Example usage
if __name__ == "__main__":
    # Generate sample returns data
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.001, 0.02, 1000))
    
    # Initialize risk model
    risk_model = RiskModels(returns)
    
    # Generate report
    report = risk_model.risk_report()
    print("Risk Analysis Report:")
    print("=" * 30)
    for metric, value in report.items():
        print(f"{metric.replace('_', ' ')}: {value:.4f}")
    
    # Plot return distribution
    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)
    plt.hist(returns, bins=50, alpha=0.7, density=True)
    plt.axvline(risk_model.value_at_risk(0.05), color='red', linestyle='--', 
                label='VaR 95%')
    plt.axvline(risk_model.expected_shortfall(0.05), color='orange', linestyle='--',
                label='ES 95%')
    plt.legend()
    plt.title('Return Distribution')
    
    plt.subplot(1, 2, 2)
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    plt.plot(drawdown)
    plt.fill_between(range(len(drawdown)), drawdown, 0, alpha=0.3, color='red')
    plt.title('Drawdown Analysis')
    plt.tight_layout()
    plt.show()`
    }
  ]);

  const [activeFile, setActiveFile] = useState<string>('1');
  const [output, setOutput] = useState<ModelOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const getCurrentFile = () => files.find(f => f.id === activeFile);

  const updateFileContent = (content: string) => {
    setFiles(files.map(file => 
      file.id === activeFile ? { ...file, content } : file
    ));
  };

  const runCode = async () => {
    setIsRunning(true);
    const currentFile = getCurrentFile();
    
    // Simulate code execution with table results
    setTimeout(() => {
      const logOutput: ModelOutput = {
        type: 'log',
        content: `Executing ${currentFile?.name}...\n\n✓ Data fetched successfully\n✓ Model parameters optimized\n✓ Backtesting completed\n\nResults:\n- Sharpe Ratio: 1.23\n- Maximum Drawdown: -8.5%\n- Annual Return: 15.2%\n- Volatility: 12.3%`,
        timestamp: new Date()
      };
      
      // Add table data output
      const tableOutput: ModelOutput = {
        type: 'data',
        content: {
          title: 'Portfolio Analysis Results',
          headers: ['Asset', 'Weight (%)', 'Expected Return (%)', 'Risk (%)', 'Sharpe Ratio'],
          rows: [
            ['AAPL', '25.4', '12.5', '18.2', '0.68'],
            ['GOOGL', '22.1', '14.8', '22.1', '0.67'],
            ['MSFT', '18.9', '11.2', '16.5', '0.68'],
            ['AMZN', '20.3', '15.6', '24.8', '0.63'],
            ['TSLA', '13.3', '18.9', '35.4', '0.53'],
            ['Total Portfolio', '100.0', '15.2', '12.3', '1.23']
          ]
        },
        timestamp: new Date()
      };
      
      setOutput(prev => [tableOutput, logOutput, ...prev].slice(0, 10));
      setIsRunning(false);
    }, 2000);
  };

  const createNewFile = () => {
    if (!newFileName) return;
    
    const newFile: CodeFile = {
      id: Date.now().toString(),
      name: newFileName,
      content: '# New Python financial model\nimport numpy as np\nimport pandas as pd\n\n# Your code here...',
      language: 'python',
      type: 'model'
    };
    
    setFiles([...files, newFile]);
    setActiveFile(newFile.id);
    setNewFileName('');
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'model':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'analysis':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'backtest':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'strategy':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'model':
        return <Calculator className="h-3 w-3" />;
      case 'analysis':
        return <BarChart3 className="h-3 w-3" />;
      case 'backtest':
        return <TrendingUp className="h-3 w-3" />;
      case 'strategy':
        return <Zap className="h-3 w-3" />;
      default:
        return <Code className="h-3 w-3" />;
    }
  };

  return (
    <Card className="w-full h-full bg-background border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <Code className="h-5 w-5" />
          Financial Model Studio - Python Edition
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Visual Studio Code-style editor for creating financial models, backtesting strategies, and quantitative analysis
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-[calc(100%-120px)]">
        <div className="h-full flex">
          {/* File Explorer Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-4 w-4" />
                <span className="font-medium text-sm">Financial Models</span>
              </div>
              
              <div className="flex gap-1">
                <Input
                  placeholder="filename.py"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="flex-1 h-8 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && createNewFile()}
                />
                <Button size="sm" onClick={createNewFile} className="h-8 px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <div className="p-2 space-y-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFile(file.id)}
                    className={`p-2 rounded cursor-pointer text-xs hover:bg-muted transition-colors ${
                      activeFile === file.id ? 'bg-primary/20 border border-primary/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getFileTypeIcon(file.type)}
                      <span className="flex-1 truncate">{file.name}</span>
                    </div>
                    <Badge className={`text-xs mt-1 ${getFileTypeColor(file.type)}`}>
                      {file.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Editor Tabs */}
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{getCurrentFile()?.name}</span>
                <Badge className={`text-xs ${getFileTypeColor(getCurrentFile()?.type || 'model')}`}>
                  {getCurrentFile()?.type}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={runCode} 
                  disabled={isRunning}
                  className="bg-terminal-green hover:bg-terminal-green/90 text-black"
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin h-3 w-3 border-2 border-black border-t-transparent rounded-full mr-1" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Run Model
                    </>
                  )}
                </Button>
                
                <Button size="sm" variant="outline">
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                
                <Button size="sm" variant="outline">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 flex">
              {/* Code Editor */}
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={editorRef}
                  value={getCurrentFile()?.content || ''}
                  onChange={(e) => updateFileContent(e.target.value)}
                  className="flex-1 p-4 font-mono text-sm bg-background border-0 outline-0 resize-none leading-relaxed"
                  style={{ 
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    tabSize: 4
                  }}
                  spellCheck={false}
                />
                
                {/* Status Bar */}
                <div className="flex items-center justify-between bg-muted/30 px-4 py-1 text-xs text-muted-foreground border-t border-border">
                  <div className="flex items-center gap-4">
                    <span>Python</span>
                    <span>UTF-8</span>
                    <span>Line 1, Column 1</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>Spaces: 4</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Output Panel */}
              <div className="w-80 border-l border-border flex flex-col">
                <Tabs defaultValue="output" className="h-full">
                  <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/20">
                    <TabsTrigger value="output" className="text-xs">
                      <Terminal className="h-3 w-3 mr-1" />
                      Output
                    </TabsTrigger>
                    <TabsTrigger value="plots" className="text-xs">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Plots
                    </TabsTrigger>
                    <TabsTrigger value="debug" className="text-xs">
                      <Bug className="h-3 w-3 mr-1" />
                      Debug
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="output" className="flex-1 p-0 m-0">
                    <div className="h-full overflow-auto bg-black text-green-400 font-mono text-xs">
                      <div className="p-4 space-y-3">
                        {output.length === 0 ? (
                          <div className="text-muted-foreground">
                            Run your model to see output here...
                          </div>
                        ) : (
                          output.map((item, index) => (
                            <div key={index} className="border-b border-gray-800 pb-2 mb-2">
                              <div className="text-gray-500 text-xs mb-1">
                                {item.timestamp.toLocaleTimeString()}
                              </div>
                              <pre className="whitespace-pre-wrap">{item.content}</pre>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="plots" className="flex-1 p-4">
                    <div className="space-y-4">
                      {output.filter(o => o.type === 'data').length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Data tables will appear here after running models
                        </div>
                      ) : (
                        output.filter(o => o.type === 'data').map((result, index) => (
                          <div key={index} className="bg-card rounded-lg border border-border">
                            <div className="p-3 border-b border-border">
                              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {result.content.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                Generated: {result.timestamp.toLocaleString()}
                              </p>
                            </div>
                            <div className="p-3">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border">
                                      {result.content.headers.map((header:string, idx:number) => (
                                        <th key={idx} className="text-left p-2 font-medium text-primary">
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {result.content.rows.map((row:string[], rowIdx:number) => (
                                      <tr key={rowIdx} className={`border-b border-border/50 ${
                                        rowIdx === result.content.rows.length - 1 ? 'bg-primary/5 font-medium' : 'hover:bg-muted/30'
                                      }`}>
                                        {row.map((cell, cellIdx) => (
                                          <td key={cellIdx} className="p-2 text-foreground">
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                   
                  <TabsContent value="debug" className="flex-1 p-4">
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Debug information will appear here
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};