import { useState } from 'react';
import { RefreshCw, Bitcoin, LineChart } from 'lucide-react';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';

const CryptoLiveCharts = () => {
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [chartPeriod, setChartPeriod] = useState('7');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(new Date());

  const cryptos = [
    { value: 'bitcoin', label: '₿ Bitcoin (BTC)' },
    { value: 'ethereum', label: '⟠ Ethereum (ETH)' },
    { value: 'binancecoin', label: '🔶 Binance Coin (BNB)' },
    { value: 'cardano', label: '🔵 Cardano (ADA)' },
    { value: 'solana', label: '💜 Solana (SOL)' },
    { value: 'polkadot', label: '🔴 Polkadot (DOT)' },
    { value: 'polygon', label: '💠 Polygon (MATIC)' },
    { value: 'chainlink', label: '🔗 Chainlink (LINK)' }
  ];

  const refreshChart = () => {
    setLoading(true);
    const iframe = document.querySelector('#crypto-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setLastUpdate(new Date());
    setTimeout(() => setLoading(false), 2000);
  };

  // Chart Content
  const ChartContent = () => (
    <div className="h-full flex flex-col">
      <iframe
        id="crypto-iframe"
        src={`https://www.coingecko.com/en/coins/${selectedCrypto}/charts?locale=en&vs_currency=usd#panel`}
        className="flex-1 w-full border border-border/30 rounded bg-background"
        title="Crypto Live Charts"
        allow="fullscreen"
        style={{ minHeight: '400px' }}
        onLoad={() => setLoading(false)}
      />
    </div>
  );

  return (
    <COTStyleWrapper
      title="CRYPTO LIVE CHARTS"
      icon="₿"
      lastUpdate={lastUpdate}
      selectOptions={cryptos}
      selectedValue={selectedCrypto}
      onSelectChange={setSelectedCrypto}
      onRefresh={refreshChart}
      loading={loading}
      tabs={[
        {
          id: 'chart',
          label: 'Chart',
          icon: <LineChart className="w-3 h-3" />,
          content: <ChartContent />
        }
      ]}
      footerLeft={`Viewing: ${cryptos.find(c => c.value === selectedCrypto)?.label || selectedCrypto}`}
      footerStats={[
        { label: '📊 Source', value: 'CoinGecko' },
        { label: '🔄 Auto', value: 'Live' }
      ]}
    />
  );
};

export default CryptoLiveCharts;
