import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Bitcoin, TrendingUp } from 'lucide-react';

const CryptoLiveCharts = () => {
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [chartPeriod, setChartPeriod] = useState('7');
  const [loading, setLoading] = useState(false);

  const cryptos = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)' },
    { value: 'ethereum', label: 'Ethereum (ETH)' },
    { value: 'binancecoin', label: 'Binance Coin (BNB)' },
    { value: 'cardano', label: 'Cardano (ADA)' },
    { value: 'solana', label: 'Solana (SOL)' },
    { value: 'polkadot', label: 'Polkadot (DOT)' },
    { value: 'polygon', label: 'Polygon (MATIC)' },
    { value: 'chainlink', label: 'Chainlink (LINK)' }
  ];

  const periods = [
    { value: '1', label: '24H' },
    { value: '7', label: '7D' },
    { value: '30', label: '30D' },
    { value: '90', label: '90D' },
    { value: '365', label: '1Y' }
  ];

  const refreshChart = () => {
    setLoading(true);
    const iframe = document.querySelector('#crypto-iframe') as HTMLIFrameElement;
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
            <Bitcoin className="h-5 w-5" />
            CRYPTO LIVE CHARTS - Cryptocurrency Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
              <SelectTrigger className="w-40 border-terminal-green/30 text-terminal-green">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cryptos.map(crypto => (
                  <SelectItem key={crypto.value} value={crypto.value}>
                    {crypto.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={chartPeriod} onValueChange={setChartPeriod}>
              <SelectTrigger className="w-20 border-terminal-green/30 text-terminal-green">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map(period => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
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
          Live crypto prices • Market cap data • Volume analysis • DeFi metrics
        </div>
      </CardHeader>
      <CardContent className="h-full p-0">
        <div className="h-full flex flex-col">
          <iframe
            id="crypto-iframe"
            src={`https://www.coingecko.com/en/coins/${selectedCrypto}/charts?locale=en&vs_currency=usd#panel`}
            className="flex-1 w-full border border-terminal-green/30 rounded bg-background"
            title="Crypto Live Charts"
            allow="fullscreen"
            style={{ minHeight: '600px' }}
            onLoad={() => setLoading(false)}
          />
          <div className="p-4 text-xs text-terminal-green bg-card border-t border-terminal-green/30">
            ₿ Live crypto data • 📊 Market analytics • 🔄 Real-time updates • 🌐 DeFi insights
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoLiveCharts;