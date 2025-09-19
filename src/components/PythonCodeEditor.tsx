import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Database,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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

class PortfolioOptimizer:
    def __init__(self, tickers, start_date, end_date):
        self.tickers = tickers
        self.start_date = start_date
        self.end_date = end_date
        self.data = None
        self.returns = None
        self.cov_matrix = None
        
    def fetch_data(self):
        """Fetch historical price data using synthetic data"""
        np.random.seed(42)
        dates = pd.date_range(start=self.start_date, end=self.end_date, freq='D')
        
        # Generate synthetic price data
        data = {}
        for ticker in self.tickers:
            # Generate random walk with drift
            n_days = len(dates)
            daily_returns = np.random.normal(0.0005, 0.02, n_days)  # 0.05% daily drift, 2% volatility
            prices = 100 * np.exp(np.cumsum(daily_returns))  # Starting at $100
            data[ticker] = prices
            
        self.data = pd.DataFrame(data, index=dates)
        self.returns = self.data.pct_change().dropna()
        self.cov_matrix = self.returns.cov() * 252  # Annualized
        
    def portfolio_stats(self, weights):
        """Calculate portfolio statistics"""
        portfolio_return = np.sum(self.returns.mean() * weights) * 252
        portfolio_std = np.sqrt(np.dot(weights.T, np.dot(self.cov_matrix, weights)))
        sharpe_ratio = portfolio_return / portfolio_std if portfolio_std > 0 else 0
        return portfolio_return, portfolio_std, sharpe_ratio
    
    def negative_sharpe(self, weights):
        """Objective function to minimize (negative Sharpe ratio)"""
        return -self.portfolio_stats(weights)[2]
    
    def optimize_portfolio(self):
        """Optimize portfolio for maximum Sharpe ratio"""
        n_assets = len(self.tickers)
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bounds = tuple((0, 1) for _ in range(n_assets))
        
        # Initial guess (equal weights)
        initial_guess = np.array([1/n_assets] * n_assets)
        
        # Optimize
        result = minimize(self.negative_sharpe, initial_guess, 
                        method='SLSQP', bounds=bounds, 
                        constraints=constraints)
        
        return result.x if result.success else initial_guess

# Example usage
if __name__ == "__main__":
    # Define portfolio
    tickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
    optimizer = PortfolioOptimizer(tickers, '2023-01-01', '2024-01-01')
    
    # Fetch data and optimize
    print("Fetching data and optimizing portfolio...")
    optimizer.fetch_data()
    optimal_weights = optimizer.optimize_portfolio()
    
    print("\\nOptimal Portfolio Weights:")
    print("=" * 30)
    for ticker, weight in zip(tickers, optimal_weights):
        print(f"{ticker}: {weight:.2%}")
    
    # Calculate stats
    ret, vol, sharpe = optimizer.portfolio_stats(optimal_weights)
    print(f"\\nPortfolio Statistics:")
    print("=" * 30)
    print(f"Expected Return: {ret:.2%}")
    print(f"Volatility: {vol:.2%}")
    print(f"Sharpe Ratio: {sharpe:.3f}")
    
    # Create visualization
    plt.figure(figsize=(10, 6))
    plt.pie(optimal_weights, labels=tickers, autopct='%1.1f%%', startangle=90)
    plt.title('Optimal Portfolio Allocation')
    plt.axis('equal')
    plt.tight_layout()
    plt.show()
    
    print("\\nOptimization completed successfully!")`
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
        
    def value_at_risk(self, confidence_level=0.05, method='historical'):
        """Calculate Value at Risk"""
        if method == 'parametric':
            mean_return = self.returns.mean()
            std_return = self.returns.std()
            var = mean_return - stats.norm.ppf(confidence_level) * std_return
        elif method == 'historical':
            var = self.returns.quantile(confidence_level)
        else:  # monte_carlo
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
    
    def sharpe_ratio(self, risk_free_rate=0.02):
        """Calculate Sharpe Ratio"""
        excess_return = self.returns.mean() * 252 - risk_free_rate
        volatility = self.returns.std() * np.sqrt(252)
        return excess_return / volatility if volatility > 0 else 0
    
    def risk_report(self):
        """Generate comprehensive risk report"""
        report = {
            'VaR_95%': self.value_at_risk(0.05),
            'VaR_99%': self.value_at_risk(0.01),
            'Expected_Shortfall_95%': self.expected_shortfall(0.05),
            'Maximum_Drawdown': self.maximum_drawdown(),
            'Sharpe_Ratio': self.sharpe_ratio(),
            'Volatility': self.returns.std() * np.sqrt(252),
            'Skewness': stats.skew(self.returns),
            'Kurtosis': stats.kurtosis(self.returns)
        }
        return pd.Series(report)

# Example usage
if __name__ == "__main__":
    print("Generating sample returns data...")
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.001, 0.02, 1000))
    
    # Initialize risk model
    risk_model = RiskModels(returns)
    
    # Generate report
    report = risk_model.risk_report()
    print("\\nRisk Analysis Report:")
    print("=" * 30)
    for metric, value in report.items():
        print(f"{metric.replace('_', ' ')}: {value:.4f}")
    
    # Create visualizations
    plt.figure(figsize=(12, 8))
    
    # Return distribution
    plt.subplot(2, 2, 1)
    plt.hist(returns, bins=50, alpha=0.7, density=True, color='blue')
    plt.axvline(risk_model.value_at_risk(0.05), color='red', linestyle='--', 
                label='VaR 95%')
    plt.axvline(risk_model.expected_shortfall(0.05), color='orange', linestyle='--',
                label='ES 95%')
    plt.legend()
    plt.title('Return Distribution')
    plt.xlabel('Returns')
    plt.ylabel('Density')
    
    # Cumulative returns
    plt.subplot(2, 2, 2)
    cumulative = (1 + returns).cumprod()
    plt.plot(cumulative, color='green')
    plt.title('Cumulative Returns')
    plt.xlabel('Time')
    plt.ylabel('Cumulative Value')
    
    # Drawdown
    plt.subplot(2, 2, 3)
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    plt.plot(drawdown, color='red')
    plt.fill_between(range(len(drawdown)), drawdown, 0, alpha=0.3, color='red')
    plt.title('Drawdown Analysis')
    plt.xlabel('Time')
    plt.ylabel('Drawdown')
    
    # Rolling volatility
    plt.subplot(2, 2, 4)
    rolling_vol = returns.rolling(window=30).std() * np.sqrt(252)
    plt.plot(rolling_vol, color='purple')
    plt.title('Rolling 30-Day Volatility')
    plt.xlabel('Time')
    plt.ylabel('Annualized Volatility')
    
    plt.tight_layout()
    plt.show()
    
    print("\\nRisk analysis completed successfully!")`
    },
    {
      id: '3',
      name: 'stock_prediction.py',
      language: 'python',
      type: 'analysis',
      content: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

class StockPredictor:
    def __init__(self):
        self.models = {}
        self.data = None
        
    def generate_sample_data(self, n_days=1000):
        """Generate synthetic stock data with technical indicators"""
        np.random.seed(42)
        dates = pd.date_range(start='2020-01-01', periods=n_days, freq='D')
        
        # Generate price data
        returns = np.random.normal(0.0005, 0.02, n_days)
        prices = 100 * np.exp(np.cumsum(returns))
        
        # Create DataFrame
        data = pd.DataFrame({
            'price': prices,
            'volume': np.random.normal(1000000, 200000, n_days)
        }, index=dates)
        
        # Add technical indicators
        data['sma_5'] = data['price'].rolling(window=5).mean()
        data['sma_20'] = data['price'].rolling(window=20).mean()
        data['rsi'] = self.calculate_rsi(data['price'])
        data['volatility'] = data['price'].rolling(window=20).std()
        
        # Target variable (next day return)
        data['next_return'] = data['price'].shift(-1) / data['price'] - 1
        
        self.data = data.dropna()
        return self.data
    
    def calculate_rsi(self, prices, window=14):
        """Calculate Relative Strength Index"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def prepare_features(self):
        """Prepare features for machine learning"""
        features = ['sma_5', 'sma_20', 'rsi', 'volatility', 'volume']
        X = self.data[features]
        y = self.data['next_return']
        return X, y
    
    def train_models(self):
        """Train multiple prediction models"""
        X, y = self.prepare_features()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Linear Regression
        lr_model = LinearRegression()
        lr_model.fit(X_train, y_train)
        lr_pred = lr_model.predict(X_test)
        
        # Random Forest
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(X_train, y_train)
        rf_pred = rf_model.predict(X_test)
        
        # Store results
        self.models = {
            'linear_regression': {
                'model': lr_model,
                'predictions': lr_pred,
                'mse': mean_squared_error(y_test, lr_pred),
                'r2': r2_score(y_test, lr_pred)
            },
            'random_forest': {
                'model': rf_model,
                'predictions': rf_pred,
                'mse': mean_squared_error(y_test, rf_pred),
                'r2': r2_score(y_test, rf_pred)
            }
        }
        
        self.y_test = y_test
        return self.models
    
    def evaluate_models(self):
        """Evaluate and compare models"""
        print("Model Performance Comparison:")
        print("=" * 40)
        
        for name, results in self.models.items():
            print(f"\\n{name.upper()}:")
            print(f"  MSE: {results['mse']:.6f}")
            print(f"  R²: {results['r2']:.4f}")
            
        # Feature importance for Random Forest
        if 'random_forest' in self.models:
            rf_model = self.models['random_forest']['model']
            feature_names = ['SMA_5', 'SMA_20', 'RSI', 'Volatility', 'Volume']
            
            print(f"\\nRANDOM FOREST FEATURE IMPORTANCE:")
            for name, importance in zip(feature_names, rf_model.feature_importances_):
                print(f"  {name}: {importance:.4f}")

# Example usage
if __name__ == "__main__":
    print("Initializing Stock Predictor...")
    predictor = StockPredictor()
    
    print("Generating sample data...")
    data = predictor.generate_sample_data(1000)
    
    print("Training prediction models...")
    models = predictor.train_models()
    
    # Evaluate models
    predictor.evaluate_models()
    
    # Create visualizations
    plt.figure(figsize=(15, 10))
    
    # Price and moving averages
    plt.subplot(2, 3, 1)
    plt.plot(data.index[-200:], data['price'].iloc[-200:], label='Price', alpha=0.7)
    plt.plot(data.index[-200:], data['sma_5'].iloc[-200:], label='SMA 5', alpha=0.8)
    plt.plot(data.index[-200:], data['sma_20'].iloc[-200:], label='SMA 20', alpha=0.8)
    plt.title('Price with Moving Averages')
    plt.legend()
    plt.xticks(rotation=45)
    
    # RSI
    plt.subplot(2, 3, 2)
    plt.plot(data.index[-200:], data['rsi'].iloc[-200:], color='purple')
    plt.axhline(y=70, color='r', linestyle='--', alpha=0.7)
    plt.axhline(y=30, color='g', linestyle='--', alpha=0.7)
    plt.title('RSI Indicator')
    plt.ylabel('RSI')
    plt.xticks(rotation=45)
    
    # Volatility
    plt.subplot(2, 3, 3)
    plt.plot(data.index[-200:], data['volatility'].iloc[-200:], color='orange')
    plt.title('Rolling Volatility')
    plt.ylabel('Volatility')
    plt.xticks(rotation=45)
    
    # Model predictions comparison
    plt.subplot(2, 3, 4)
    actual = predictor.y_test.iloc[:100]
    lr_pred = predictor.models['linear_regression']['predictions'][:100]
    rf_pred = predictor.models['random_forest']['predictions'][:100]
    
    plt.scatter(actual, lr_pred, alpha=0.6, label='Linear Regression')
    plt.scatter(actual, rf_pred, alpha=0.6, label='Random Forest')
    plt.plot([-0.1, 0.1], [-0.1, 0.1], 'r--', alpha=0.8)
    plt.xlabel('Actual Returns')
    plt.ylabel('Predicted Returns')
    plt.title('Prediction vs Actual')
    plt.legend()
    
    # Feature importance
    plt.subplot(2, 3, 5)
    rf_model = predictor.models['random_forest']['model']
    feature_names = ['SMA_5', 'SMA_20', 'RSI', 'Volatility', 'Volume']
    importances = rf_model.feature_importances_
    
    plt.bar(feature_names, importances)
    plt.title('Feature Importance (Random Forest)')
    plt.ylabel('Importance')
    plt.xticks(rotation=45)
    
    # Returns distribution
    plt.subplot(2, 3, 6)
    plt.hist(data['next_return'], bins=50, alpha=0.7, density=True)
    plt.title('Return Distribution')
    plt.xlabel('Next Day Return')
    plt.ylabel('Density')
    
    plt.tight_layout()
    plt.show()
    
    print("\\nStock prediction analysis completed successfully!")`
    },
    {
      id: '4',
      name: 'technical_analysis.py',
      language: 'python',
      type: 'strategy',
      content: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

class TechnicalAnalysis:
    def __init__(self):
        self.data = None
        
    def generate_sample_data(self, n_days=500):
        """Generate synthetic stock data"""
        np.random.seed(42)
        dates = pd.date_range(start='2023-01-01', periods=n_days, freq='D')
        
        # Generate realistic price data with trends
        returns = np.random.normal(0.0008, 0.025, n_days)
        # Add some trend and seasonality
        trend = np.linspace(0, 0.3, n_days)
        seasonal = 0.1 * np.sin(2 * np.pi * np.arange(n_days) / 252)
        returns += trend / n_days + seasonal / n_days
        
        prices = 100 * np.exp(np.cumsum(returns))
        volume = np.random.lognormal(13, 0.5, n_days)
        
        self.data = pd.DataFrame({
            'price': prices,
            'volume': volume
        }, index=dates)
        
        return self.data
    
    def add_technical_indicators(self):
        """Add various technical indicators"""
        data = self.data.copy()
        
        # Moving Averages
        data['sma_10'] = data['price'].rolling(window=10).mean()
        data['sma_30'] = data['price'].rolling(window=30).mean()
        data['ema_12'] = data['price'].ewm(span=12).mean()
        data['ema_26'] = data['price'].ewm(span=26).mean()
        
        # MACD
        data['macd'] = data['ema_12'] - data['ema_26']
        data['macd_signal'] = data['macd'].ewm(span=9).mean()
        data['macd_histogram'] = data['macd'] - data['macd_signal']
        
        # RSI
        data['rsi'] = self.calculate_rsi(data['price'])
        
        # Bollinger Bands
        data['bb_middle'] = data['price'].rolling(window=20).mean()
        bb_std = data['price'].rolling(window=20).std()
        data['bb_upper'] = data['bb_middle'] + (bb_std * 2)
        data['bb_lower'] = data['bb_middle'] - (bb_std * 2)
        
        # Price momentum
        data['momentum'] = data['price'] / data['price'].shift(10) - 1
        
        # Volume indicators
        data['volume_sma'] = data['volume'].rolling(window=20).mean()
        data['volume_ratio'] = data['volume'] / data['volume_sma']
        
        self.data = data
        return data
    
    def calculate_rsi(self, prices, window=14):
        """Calculate Relative Strength Index"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def generate_signals(self):
        """Generate trading signals based on technical indicators"""
        data = self.data.copy()
        
        # Initialize signals
        data['signal'] = 0
        data['position'] = 0
        
        # Moving Average Crossover
        ma_long = (data['sma_10'] > data['sma_30']).astype(int)
        ma_short = (data['sma_10'] < data['sma_30']).astype(int)
        
        # RSI signals
        rsi_oversold = (data['rsi'] < 30).astype(int)
        rsi_overbought = (data['rsi'] > 70).astype(int)
        
        # MACD signals
        macd_bullish = (data['macd'] > data['macd_signal']).astype(int)
        macd_bearish = (data['macd'] < data['macd_signal']).astype(int)
        
        # Bollinger Band signals
        bb_buy = (data['price'] < data['bb_lower']).astype(int)
        bb_sell = (data['price'] > data['bb_upper']).astype(int)
        
        # Combined signal (majority vote)
        buy_signals = ma_long + rsi_oversold + macd_bullish + bb_buy
        sell_signals = ma_short + rsi_overbought + macd_bearish + bb_sell
        
        data.loc[buy_signals >= 2, 'signal'] = 1  # Buy
        data.loc[sell_signals >= 2, 'signal'] = -1  # Sell
        
        # Calculate positions
        data['position'] = data['signal'].replace(to_replace=0, method='ffill')
        data['position'] = data['position'].fillna(0)
        
        self.data = data
        return data
    
    def backtest_strategy(self):
        """Backtest the technical analysis strategy"""
        data = self.data.copy()
        
        # Calculate returns
        data['returns'] = data['price'].pct_change()
        data['strategy_returns'] = data['position'].shift(1) * data['returns']
        
        # Calculate cumulative returns
        data['cumulative_returns'] = (1 + data['returns']).cumprod() - 1
        data['cumulative_strategy'] = (1 + data['strategy_returns']).cumprod() - 1
        
        # Performance metrics
        total_return = data['cumulative_strategy'].iloc[-1]
        volatility = data['strategy_returns'].std() * np.sqrt(252)
        sharpe_ratio = data['strategy_returns'].mean() / data['strategy_returns'].std() * np.sqrt(252)
        
        # Max drawdown
        cumulative = (1 + data['strategy_returns']).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Win rate
        profitable_trades = (data['strategy_returns'] > 0).sum()
        total_trades = (data['strategy_returns'] != 0).sum()
        win_rate = profitable_trades / total_trades if total_trades > 0 else 0
        
        metrics = {
            'Total Return': total_return,
            'Volatility': volatility,
            'Sharpe Ratio': sharpe_ratio,
            'Max Drawdown': max_drawdown,
            'Win Rate': win_rate,
            'Total Trades': total_trades
        }
        
        self.backtest_results = data
        self.performance_metrics = metrics
        
        return metrics

# Example usage
if __name__ == "__main__":
    print("Initializing Technical Analysis...")
    ta = TechnicalAnalysis()
    
    print("Generating sample data...")
    data = ta.generate_sample_data(500)
    
    print("Adding technical indicators...")
    data_with_indicators = ta.add_technical_indicators()
    
    print("Generating trading signals...")
    data_with_signals = ta.generate_signals()
    
    print("Backtesting strategy...")
    metrics = ta.backtest_strategy()
    
    # Print results
    print("\\nStrategy Performance:")
    print("=" * 30)
    for metric, value in metrics.items():
        if metric == 'Total Trades':
            print(f"{metric}: {value}")
        else:
            print(f"{metric}: {value:.4f}")
    
    # Create visualizations
    plt.figure(figsize=(15, 12))
    
    # Price with moving averages and signals
    plt.subplot(3, 2, 1)
    plt.plot(data.index, data['price'], label='Price', linewidth=1)
    plt.plot(data.index, data['sma_10'], label='SMA 10', alpha=0.7)
    plt.plot(data.index, data['sma_30'], label='SMA 30', alpha=0.7)
    
    # Mark buy/sell signals
    buy_signals = data[data['signal'] == 1]
    sell_signals = data[data['signal'] == -1]
    plt.scatter(buy_signals.index, buy_signals['price'], color='green', marker='^', s=50, label='Buy')
    plt.scatter(sell_signals.index, sell_signals['price'], color='red', marker='v', s=50, label='Sell')
    
    plt.title('Price with Moving Averages and Signals')
    plt.legend()
    plt.xticks(rotation=45)
    
    # RSI
    plt.subplot(3, 2, 2)
    plt.plot(data.index, data['rsi'], color='purple')
    plt.axhline(y=70, color='r', linestyle='--', alpha=0.7, label='Overbought')
    plt.axhline(y=30, color='g', linestyle='--', alpha=0.7, label='Oversold')
    plt.title('RSI Indicator')
    plt.ylabel('RSI')
    plt.legend()
    plt.xticks(rotation=45)
    
    # MACD
    plt.subplot(3, 2, 3)
    plt.plot(data.index, data['macd'], label='MACD', linewidth=1)
    plt.plot(data.index, data['macd_signal'], label='Signal', linewidth=1)
    plt.bar(data.index, data['macd_histogram'], alpha=0.3, label='Histogram')
    plt.title('MACD')
    plt.legend()
    plt.xticks(rotation=45)
    
    # Bollinger Bands
    plt.subplot(3, 2, 4)
    plt.plot(data.index, data['price'], label='Price')
    plt.plot(data.index, data['bb_upper'], label='Upper Band', alpha=0.7)
    plt.plot(data.index, data['bb_lower'], label='Lower Band', alpha=0.7)
    plt.fill_between(data.index, data['bb_lower'], data['bb_upper'], alpha=0.1)
    plt.title('Bollinger Bands')
    plt.legend()
    plt.xticks(rotation=45)
    
    # Performance comparison
    plt.subplot(3, 2, 5)
    backtest_data = ta.backtest_results
    plt.plot(backtest_data.index, backtest_data['cumulative_returns'], label='Buy & Hold')
    plt.plot(backtest_data.index, backtest_data['cumulative_strategy'], label='Strategy')
    plt.title('Strategy vs Buy & Hold Performance')
    plt.ylabel('Cumulative Returns')
    plt.legend()
    plt.xticks(rotation=45)
    
    # Signal distribution
    plt.subplot(3, 2, 6)
    signal_counts = data['signal'].value_counts()
    plt.bar(['Sell', 'Hold', 'Buy'], [signal_counts.get(-1, 0), signal_counts.get(0, 0), signal_counts.get(1, 0)])
    plt.title('Signal Distribution')
    plt.ylabel('Count')
    
    plt.tight_layout()
    plt.show()
    
    print("\\nTechnical analysis completed successfully!")`
    },
    {
      id: '5',
      name: 'ml_classification.py',
      language: 'python',
      type: 'analysis',
      content: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler

class MarketRegimeClassifier:
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.data = None
        
    def generate_market_data(self, n_days=1000):
        """Generate synthetic market data with different regimes"""
        np.random.seed(42)
        dates = pd.date_range(start='2020-01-01', periods=n_days, freq='D')
        
        # Generate different market regimes
        regime_length = n_days // 4
        regimes = []
        
        # Bull market (0)
        bull_returns = np.random.normal(0.001, 0.015, regime_length)
        regimes.extend([0] * regime_length)
        
        # Bear market (1)
        bear_returns = np.random.normal(-0.002, 0.025, regime_length)
        regimes.extend([1] * regime_length)
        
        # Volatile market (2)
        volatile_returns = np.random.normal(0.0005, 0.035, regime_length)
        regimes.extend([2] * regime_length)
        
        # Sideways market (3)
        sideways_returns = np.random.normal(0.0002, 0.012, n_days - 3 * regime_length)
        regimes.extend([3] * (n_days - 3 * regime_length))
        
        # Combine returns
        all_returns = np.concatenate([bull_returns, bear_returns, volatile_returns, sideways_returns])
        prices = 100 * np.exp(np.cumsum(all_returns))
        
        # Create DataFrame
        data = pd.DataFrame({
            'price': prices,
            'returns': all_returns,
            'regime': regimes[:n_days]
        }, index=dates)
        
        self.data = data
        return data
    
    def create_features(self):
        """Create features for classification"""
        data = self.data.copy()
        
        # Technical indicators
        data['sma_5'] = data['price'].rolling(window=5).mean()
        data['sma_20'] = data['price'].rolling(window=20).mean()
        data['sma_50'] = data['price'].rolling(window=50).mean()
        
        # Price ratios
        data['price_sma5_ratio'] = data['price'] / data['sma_5']
        data['price_sma20_ratio'] = data['price'] / data['sma_20']
        data['sma5_sma20_ratio'] = data['sma_5'] / data['sma_20']
        
        # Volatility measures
        data['volatility_5'] = data['returns'].rolling(window=5).std()
        data['volatility_20'] = data['returns'].rolling(window=20).std()
        data['volatility_ratio'] = data['volatility_5'] / data['volatility_20']
        
        # Momentum indicators
        data['momentum_5'] = data['price'] / data['price'].shift(5) - 1
        data['momentum_20'] = data['price'] / data['price'].shift(20) - 1
        
        # RSI
        data['rsi'] = self.calculate_rsi(data['price'])
        
        # Return statistics
        data['returns_mean_5'] = data['returns'].rolling(window=5).mean()
        data['returns_mean_20'] = data['returns'].rolling(window=20).mean()
        data['returns_skew_20'] = data['returns'].rolling(window=20).skew()
        
        self.data = data.dropna()
        return self.data
    
    def calculate_rsi(self, prices, window=14):
        """Calculate RSI"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def prepare_data(self):
        """Prepare data for machine learning"""
        feature_columns = [
            'price_sma5_ratio', 'price_sma20_ratio', 'sma5_sma20_ratio',
            'volatility_5', 'volatility_20', 'volatility_ratio',
            'momentum_5', 'momentum_20', 'rsi',
            'returns_mean_5', 'returns_mean_20', 'returns_skew_20'
        ]
        
        X = self.data[feature_columns]
        y = self.data['regime']
        
        return X, y
    
    def train_models(self):
        """Train multiple classification models"""
        X, y = self.prepare_data()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train models
        models = {
            'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
            'SVM': SVC(random_state=42, probability=True)
        }
        
        results = {}
        
        for name, model in models.items():
            if name == 'Random Forest':
                # Random Forest doesn't need scaling
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                y_proba = model.predict_proba(X_test)
            else:
                # Other models need scaling
                model.fit(X_train_scaled, y_train)
                y_pred = model.predict(X_test_scaled)
                y_proba = model.predict_proba(X_test_scaled)
            
            accuracy = accuracy_score(y_test, y_pred)
            
            results[name] = {
                'model': model,
                'accuracy': accuracy,
                'predictions': y_pred,
                'probabilities': y_proba,
                'y_test': y_test
            }
        
        self.models = results
        self.X_test = X_test
        self.y_test = y_test
        
        return results
    
    def evaluate_models(self):
        """Evaluate model performance"""
        regime_names = ['Bull', 'Bear', 'Volatile', 'Sideways']
        
        print("Model Performance Summary:")
        print("=" * 50)
        
        for name, results in self.models.items():
            print(f"\\n{name.upper()}:")
            print(f"Accuracy: {results['accuracy']:.4f}")
            
            # Classification report
            print("\\nClassification Report:")
            print(classification_report(results['y_test'], results['predictions'], 
                                       target_names=regime_names, zero_division=0))

# Example usage
if __name__ == "__main__":
    print("Initializing Market Regime Classifier...")
    classifier = MarketRegimeClassifier()
    
    print("Generating market data...")
    data = classifier.generate_market_data(1000)
    
    print("Creating features...")
    data_with_features = classifier.create_features()
    
    print("Training classification models...")
    results = classifier.train_models()
    
    # Evaluate models
    classifier.evaluate_models()
    
    # Create visualizations
    plt.figure(figsize=(15, 12))
    
    # Price with regime colors
    plt.subplot(3, 2, 1)
    colors = ['green', 'red', 'orange', 'blue']
    regime_names = ['Bull', 'Bear', 'Volatile', 'Sideways']
    
    for i, (color, name) in enumerate(zip(colors, regime_names)):
        regime_data = data[data['regime'] == i]
        plt.scatter(regime_data.index, regime_data['price'], c=color, alpha=0.6, 
                   s=10, label=f'{name} Market')
    
    plt.title('Price with Market Regimes')
    plt.ylabel('Price')
    plt.legend()
    plt.xticks(rotation=45)
    
    # Returns distribution by regime
    plt.subplot(3, 2, 2)
    for i, (color, name) in enumerate(zip(colors, regime_names)):
        regime_returns = data[data['regime'] == i]['returns']
        plt.hist(regime_returns, alpha=0.5, color=color, label=f'{name}', bins=30, density=True)
    
    plt.title('Return Distribution by Regime')
    plt.xlabel('Returns')
    plt.ylabel('Density')
    plt.legend()
    
    # Volatility by regime
    plt.subplot(3, 2, 3)
    regime_volatility = []
    for i in range(4):
        regime_vol = data[data['regime'] == i]['returns'].std()
        regime_volatility.append(regime_vol)
    
    plt.bar(regime_names, regime_volatility, color=colors, alpha=0.7)
    plt.title('Volatility by Market Regime')
    plt.ylabel('Volatility')
    plt.xticks(rotation=45)
    
    # Model accuracy comparison
    plt.subplot(3, 2, 4)
    model_names = list(classifier.models.keys())
    accuracies = [classifier.models[name]['accuracy'] for name in model_names]
    
    plt.bar(model_names, accuracies, color=['skyblue', 'lightcoral', 'lightgreen'])
    plt.title('Model Accuracy Comparison')
    plt.ylabel('Accuracy')
    plt.ylim(0, 1)
    plt.xticks(rotation=45)
    
    # Confusion matrix for best model
    plt.subplot(3, 2, 5)
    best_model_name = max(classifier.models.keys(), key=lambda x: classifier.models[x]['accuracy'])
    best_results = classifier.models[best_model_name]
    
    cm = confusion_matrix(best_results['y_test'], best_results['predictions'])
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title(f'Confusion Matrix - {best_model_name}')
    plt.colorbar()
    
    tick_marks = np.arange(len(regime_names))
    plt.xticks(tick_marks, regime_names, rotation=45)
    plt.yticks(tick_marks, regime_names)
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    
    # Feature importance (Random Forest)
    if 'Random Forest' in classifier.models:
        plt.subplot(3, 2, 6)
        rf_model = classifier.models['Random Forest']['model']
        feature_names = [
            'Price/SMA5', 'Price/SMA20', 'SMA5/SMA20',
            'Vol_5', 'Vol_20', 'Vol_Ratio',
            'Mom_5', 'Mom_20', 'RSI',
            'Ret_Mean_5', 'Ret_Mean_20', 'Ret_Skew_20'
        ]
        
        importances = rf_model.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        plt.bar(range(len(importances)), importances[indices])
        plt.title('Feature Importance (Random Forest)')
        plt.xticks(range(len(importances)), [feature_names[i] for i in indices], rotation=45)
        plt.ylabel('Importance')
    
    plt.tight_layout()
    plt.show()
    
    print("\\nMarket regime classification completed successfully!")`
    }
  ]);

  const [activeFile, setActiveFile] = useState<string>('1');
  const [output, setOutput] = useState<ModelOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [pyodideReady, setPyodideReady] = useState<boolean>(false);
  const [installedPackages, setInstalledPackages] = useState<string[]>(['numpy', 'pandas', 'scipy', 'matplotlib', 'scikit-learn']);
  const [installPackage, setInstallPackage] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const pyodideRef = useRef<any>(null);

  // Initialize Pyodide with ML packages
  useEffect(() => {
    const initPyodide = async () => {
      try {
        toast.info('กำลังโหลด Python runtime และ ML packages...');
        
        // Load Pyodide from CDN
        const pyodideScript = document.createElement('script');
        pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        pyodideScript.onload = async () => {
          try {
            // @ts-ignore - Pyodide is loaded globally
            const pyodide = await loadPyodide({
              indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
              stdout: (text: string) => {
                console.log('Python output:', text);
              },
              stderr: (text: string) => {
                console.error('Python error:', text);
              }
            });
            
            toast.info('กำลังติดตั้ง ML packages...');
            
            // Install core packages
            await pyodide.loadPackage(['numpy', 'pandas', 'scipy', 'matplotlib', 'scikit-learn', 'micropip']);
            
            // Install additional packages via micropip
            const micropip = pyodide.pyimport('micropip');
            
            // Setup matplotlib for web usage
            await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import base64
import io

# Function to capture plots as base64
def capture_plot():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    plot_data = base64.b64encode(buf.read()).decode()
    buf.close()
    plt.close()
    return plot_data
            `);
            
            pyodideRef.current = pyodide;
            setPyodideReady(true);
            toast.success('Python runtime และ ML packages พร้อมใช้งาน');
            
          } catch (error) {
            console.error('Failed to initialize Pyodide:', error);
            toast.error('ไม่สามารถโหลด Python runtime ได้');
          }
        };
        
        pyodideScript.onerror = () => {
          toast.error('ไม่สามารถโหลด Python runtime ได้');
        };
        
        document.head.appendChild(pyodideScript);
      } catch (error) {
        console.error('Failed to load Pyodide:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลด Python');
      }
    };

    initPyodide();
  }, []);

  const getCurrentFile = () => files.find(f => f.id === activeFile);

  const updateFileContent = (content: string) => {
    setFiles(files.map(file => 
      file.id === activeFile ? { ...file, content } : file
    ));
  };

  const installPythonPackage = useCallback(async () => {
    if (!installPackage.trim() || !pyodideReady || !pyodideRef.current) {
      toast.error('Package name is required and Python must be ready');
      return;
    }

    setIsInstalling(true);
    try {
      toast.info(`กำลังติดตั้ง ${installPackage}...`);
      
      const micropip = pyodideRef.current.pyimport('micropip');
      await micropip.install(installPackage);
      
      setInstalledPackages(prev => [...prev, installPackage]);
      setInstallPackage('');
      toast.success(`ติดตั้ง ${installPackage} เสร็จสิ้น`);
      
    } catch (error) {
      console.error('Package installation error:', error);
      toast.error(`ไม่สามารถติดตั้ง ${installPackage} ได้`);
    } finally {
      setIsInstalling(false);
    }
  }, [installPackage, pyodideReady]);

  const runCode = useCallback(async () => {
    const currentFile = getCurrentFile();
    if (!currentFile) return;

    if (!pyodideReady || !pyodideRef.current) {
      toast.error('Python runtime ยังไม่พร้อม กรุณารอสักครู่');
      return;
    }

    setIsRunning(true);
    setOutput([]);

    try {
      const timestamp = new Date().toLocaleTimeString();
      
      // Add initial log
      setOutput([{
        type: 'log',
        content: `[${timestamp}] กำลังรัน ${currentFile.name}...\n[${timestamp}] กำลังโหลดโมดูล...`,
        timestamp: new Date()
      }]);

      // Capture stdout and stderr
      pyodideRef.current.runPython(`
        import sys
        from io import StringIO
        import matplotlib.pyplot as plt
        import base64
        import io
        
        # Clear any existing plots
        plt.clf()
        plt.close('all')
        
        # Redirect stdout to capture print statements
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = StringIO()
        sys.stderr = StringIO()
        
        # Variable to store plot data
        _plot_images = []
      `);

      // Run the user's code
      try {
        await pyodideRef.current.runPythonAsync(currentFile.content);
        
        // Check for plots and capture them
        const plotsData = pyodideRef.current.runPython(`
          import matplotlib.pyplot as plt
          plot_images = []
          
          # Check if there are any figures
          if plt.get_fignums():
              for fig_num in plt.get_fignums():
                  fig = plt.figure(fig_num)
                  buf = io.BytesIO()
                  fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', 
                             facecolor='white', edgecolor='none')
                  buf.seek(0)
                  plot_data = base64.b64encode(buf.read()).decode()
                  plot_images.append(plot_data)
                  buf.close()
              plt.close('all')
          
          plot_images
        `);
        
        // Get the captured output
        const stdout = pyodideRef.current.runPython(`
          captured_output = sys.stdout.getvalue()
          sys.stdout = old_stdout
          sys.stderr = old_stderr
          captured_output
        `);
        
        const stderr = pyodideRef.current.runPython(`sys.stderr.getvalue()`);
        
        const finalTimestamp = new Date().toLocaleTimeString();
        const executionResults: ModelOutput[] = [{
          type: 'log',
          content: `[${timestamp}] กำลังรัน ${currentFile.name}...\n[${timestamp}] กำลังโหลดโมดูล...\n[${finalTimestamp}] รันเสร็จเรียบร้อย`,
          timestamp: new Date()
        }];

        // Add console output
        if (stdout.trim()) {
          executionResults.push({
            type: 'log',
            content: stdout,
            timestamp: new Date()
          });
          
          // Parse output into structured data
          const lines = stdout.split('\n');
          const tableRows = [];
          let currentSection = '';
          
          for (const line of lines) {
            if (line.includes('===') || line.includes('=====')) {
              currentSection = line.replace(/=/g, '').trim();
            } else if (line.includes(':') && !line.startsWith('[')) {
              const colonIndex = line.indexOf(':');
              if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                if (key && value && !key.includes('http')) {
                  tableRows.push([currentSection || 'Results', key, value]);
                }
              }
            }
          }
          
          if (tableRows.length > 0) {
            executionResults.push({
              type: 'data',
              content: {
                title: 'Analysis Results',
                headers: ['Section', 'Metric', 'Value'],
                rows: tableRows
              },
              timestamp: new Date()
            });
          }
        }

        // Add plot images
        if (plotsData && plotsData.length > 0) {
          plotsData.forEach((plotData: string, index: number) => {
            executionResults.push({
              type: 'plot',
              content: plotData,
              timestamp: new Date()
            });
          });
        }

        // Add errors if any
        if (stderr.trim()) {
          executionResults.push({
            type: 'error',
            content: stderr,
            timestamp: new Date()
          });
        }

        setOutput(executionResults);
        toast.success('รันโค้ดเสร็จสิ้น');

      } catch (pythonError) {
        // Reset stdout/stderr
        pyodideRef.current.runPython(`
          sys.stdout = old_stdout
          sys.stderr = old_stderr
          plt.close('all')
        `);
        
        setOutput([{
          type: 'error',
          content: `Python Error: ${pythonError}`,
          timestamp: new Date()
        }]);
        toast.error('เกิดข้อผิดพลาดในการรันโค้ด');
      }

    } catch (error) {
      console.error('Code execution error:', error);
      setOutput([{
        type: 'error',
        content: `Execution Error: ${error}`,
        timestamp: new Date()
      }]);
      toast.error('เกิดข้อผิดพลาดในการรันโค้ด');
    } finally {
      setIsRunning(false);
    }
  }, [pyodideReady]);

  const createNewFile = () => {
    if (!newFileName) return;
    
    const templates = {
      'model': '# Financial Model\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nfrom sklearn.ensemble import RandomForestRegressor\n\n# Your financial model here...\nprint("Financial model initialized")',
      'analysis': '# Data Analysis\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nfrom sklearn.model_selection import train_test_split\n\n# Your analysis here...\nprint("Analysis started")',
      'backtest': '# Backtesting Strategy\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# Your backtesting code here...\nprint("Backtest initialized")',
      'strategy': '# Trading Strategy\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# Your trading strategy here...\nprint("Strategy initialized")'
    };
    
    const fileType = newFileName.includes('model') ? 'model' : 
                    newFileName.includes('analysis') ? 'analysis' :
                    newFileName.includes('backtest') ? 'backtest' : 'strategy';
    
    const newFile: CodeFile = {
      id: Date.now().toString(),
      name: newFileName,
      content: templates[fileType],
      language: 'python',
      type: fileType
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
              
              <div className="flex gap-1 mb-3">
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
              
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Package Manager</div>
                <div className="flex gap-1">
                  <Input
                    placeholder="package name"
                    value={installPackage}
                    onChange={(e) => setInstallPackage(e.target.value)}
                    className="flex-1 h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && installPythonPackage()}
                  />
                  <Button 
                    size="sm" 
                    onClick={installPythonPackage} 
                    disabled={isInstalling}
                    className="h-7 px-2"
                  >
                    {isInstalling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Installed: {installedPackages.join(', ')}
                </div>
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
                  disabled={!pyodideReady || isRunning}
                  className="bg-terminal-green hover:bg-terminal-green/90 text-black disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      กำลังรัน...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      {pyodideReady ? 'Run Python' : 'Loading Python...'}
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
                  
                  <TabsContent value="plots" className="flex-1 p-4 overflow-auto">
                    <div className="space-y-4">
                      {/* Matplotlib Plots */}
                      {output.filter(o => o.type === 'plot').length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Generated Plots
                          </h3>
                          {output.filter(o => o.type === 'plot').map((plot, index) => (
                            <div key={index} className="bg-card rounded-lg border border-border p-4">
                              <div className="text-xs text-muted-foreground mb-2">
                                Generated: {plot.timestamp.toLocaleString()}
                              </div>
                              <img 
                                src={`data:image/png;base64,${plot.content}`} 
                                alt={`Plot ${index + 1}`}
                                className="w-full h-auto rounded border"
                                style={{ maxWidth: '100%', height: 'auto' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Data Tables */}
                      {output.filter(o => o.type === 'data').length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Data Tables
                          </h3>
                          {output.filter(o => o.type === 'data').map((result, index) => (
                            <div key={index} className="bg-card rounded-lg border border-border">
                              <div className="p-3 border-b border-border">
                                <h4 className="text-sm font-semibold text-primary">
                                  {result.content.title}
                                </h4>
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
                                        <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/30">
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
                          ))}
                        </div>
                      )}
                      
                      {/* Empty State */}
                      {output.filter(o => o.type === 'plot' || o.type === 'data').length === 0 && (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Plots and data tables will appear here after running models
                        </div>
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