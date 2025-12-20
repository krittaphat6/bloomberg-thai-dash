import { useEffect, useState } from 'react';
import { ForexDataService, CurrencyData } from '@/services/ForexDataService';
import { Table, BarChart3 } from 'lucide-react';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';

const CurrencyTable = () => {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ForexDataService.fetchForexPairs();
      setCurrencyData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Forex fetch error:', err);
      setError('Failed to fetch forex data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => value.toFixed(4);
  const formatChange = (change: number) => `${change >= 0 ? '+' : ''}${change.toFixed(4)}`;
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  const getChangeColor = (value: number) => value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-muted-foreground';

  const gainers = currencyData.filter(c => c.change > 0).length;
  const losers = currencyData.filter(c => c.change < 0).length;

  const TableContent = () => (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-amber-400 border-b border-green-500/30 pb-2 sticky top-0 bg-background">
        <div>PAIR</div>
        <div>BID</div>
        <div>ASK</div>
        <div>CHANGE</div>
        <div>%</div>
        <div>HIGH</div>
        <div>LOW</div>
      </div>
      {currencyData.map((currency, index) => (
        <div key={index} className="grid grid-cols-7 gap-1 text-xs py-1.5 hover:bg-accent/50 rounded transition-colors border-b border-border/10">
          <div className="text-cyan-400 font-semibold">{currency.symbol}</div>
          <div className="text-foreground">{formatCurrency(currency.bid)}</div>
          <div className="text-foreground">{formatCurrency(currency.ask)}</div>
          <div className={getChangeColor(currency.change)}>{formatChange(currency.change)}</div>
          <div className={getChangeColor(currency.changePercent)}>{formatPercent(currency.changePercent)}</div>
          <div className="text-blue-400">{formatCurrency(currency.high)}</div>
          <div className="text-purple-400">{formatCurrency(currency.low)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <COTStyleWrapper
      title="FOREX RATES"
      icon="💱"
      lastUpdate={lastUpdate}
      onRefresh={fetchData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        { id: 'table', label: 'Rates', icon: <Table className="w-3 h-3" />, content: <TableContent /> }
      ]}
      footerLeft={`Total: ${currencyData.length} pairs`}
      footerStats={[
        { label: '📈 Gainers', value: gainers },
        { label: '📉 Losers', value: losers }
      ]}
      footerRight={lastUpdate?.toLocaleTimeString() || ''}
    />
  );
};

export default CurrencyTable;
