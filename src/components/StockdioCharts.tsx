import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';

const StockdioCharts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [loading, setLoading] = useState(false);

  const symbols = [
    { value: 'AAPL', label: 'Apple Inc.' },
    { value: 'MSFT', label: 'Microsoft Corp.' },
    { value: 'GOOGL', label: 'Alphabet Inc.' },
    { value: 'TSLA', label: 'Tesla Inc.' },
    { value: 'AMZN', label: 'Amazon.com Inc.' },
    { value: 'META', label: 'Meta Platforms Inc.' },
    { value: 'NVDA', label: 'NVIDIA Corp.' },
    { value: 'AMD', label: 'Advanced Micro Devices' }
  ];

  const timeframes = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

  const refreshChart = () => {
    setLoading(true);
    const iframe = document.querySelector('#stockdio-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = `https://services.stockdio.com/visuals/financialdata/charts/v1/chart?app-key=demo&stockExchange=NASDAQ&symbol=${selectedSymbol}&palette=Financial%20Light&onload=on`;
    }
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Card className="w-full h-full bg-card border-terminal-green/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <BarChart3 className="h-5 w-5" />
            STOCKDIO CHARTS - Professional Trading Charts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-32 border-terminal-green/30 text-terminal-green">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {symbols.map(symbol => (
                  <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {timeframes.map(tf => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeframe === tf ? "default" : "outline"}
                  onClick={() => setTimeframe(tf)}
                  className={`text-xs ${timeframe === tf ? 'bg-terminal-green text-black' : 'border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10'}`}
                >
                  {tf}
                </Button>
              ))}
            </div>
            <Button
              onClick={refreshChart}
              size="sm"
              variant="outline"
              className="border-terminal-green text-terminal-green hover:bg-terminal-green/10"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="text-xs text-terminal-amber">
          Real-time stock charts • Technical indicators • Interactive analysis
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="stockdio-iframe"
            src={`https://services.stockdio.com/visuals/financialdata/charts/v1/chart?app-key=demo&stockExchange=NASDAQ&symbol=${selectedSymbol}&palette=Financial%20Light&onload=on`}
            className="flex-1 w-full border border-terminal-green/30 rounded bg-background"
            title="Stockdio Professional Charts"
            allow="fullscreen"
            style={{ minHeight: '600px' }}
            onLoad={() => setLoading(false)}
          />
          <div className="p-4 text-xs text-terminal-green bg-card border-t border-terminal-green/30">
            📈 Live market data • 🔄 Real-time updates • 📊 Technical analysis • 💹 Professional charts
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockdioCharts;