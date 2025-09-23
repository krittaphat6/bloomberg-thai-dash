import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, LineChart, Settings } from 'lucide-react';

const InvestingCharts = () => {
  const [selectedInstrument, setSelectedInstrument] = useState('1');
  const [chartType, setChartType] = useState('candlestick');
  const [loading, setLoading] = useState(false);

  const instruments = [
    { value: '1', label: 'EUR/USD' },
    { value: '2', label: 'GBP/USD' },
    { value: '3', label: 'USD/JPY' },
    { value: '8849', label: 'Gold' },
    { value: '8833', label: 'Crude Oil' },
    { value: '166', label: 'S&P 500' },
    { value: '169', label: 'NASDAQ' }
  ];

  const chartTypes = [
    { value: 'candlestick', label: 'Candlestick' },
    { value: 'line', label: 'Line' },
    { value: 'area', label: 'Area' }
  ];

  const refreshChart = () => {
    setLoading(true);
    const iframe = document.querySelector('#investing-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Card className="w-full h-full bg-card border-terminal-green/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <LineChart className="h-5 w-5" />
            INVESTING.COM CHARTS - Technical Analysis Platform
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
              <SelectTrigger className="w-32 border-terminal-green/30 text-terminal-green">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {instruments.map(instrument => (
                  <SelectItem key={instrument.value} value={instrument.value}>
                    {instrument.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-32 border-terminal-green/30 text-terminal-green">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          Advanced technical analysis • Multiple timeframes • Professional indicators
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="investing-iframe"
            src={`https://www.investing.com/webmaster-tools/technical-charts?pairs_ids=${selectedInstrument}&theme=dark&charts_type=${chartType}`}
            className="flex-1 w-full border border-terminal-green/30 rounded bg-background"
            title="Investing.com Technical Charts"
            allow="fullscreen"
            style={{ minHeight: '600px' }}
            onLoad={() => setLoading(false)}
          />
          <div className="p-4 text-xs text-terminal-green bg-card border-t border-terminal-green/30">
            📊 Technical indicators • 📈 Drawing tools • 🔍 Multi-timeframe analysis • 💡 Professional insights
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestingCharts;