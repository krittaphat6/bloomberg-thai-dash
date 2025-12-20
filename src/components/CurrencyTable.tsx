import { useEffect, useState } from 'react';
import { ForexDataService, CurrencyData } from '@/services/ForexDataService';
import { RefreshCw } from 'lucide-react';

const CurrencyTable = () => {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await ForexDataService.fetchForexPairs();
      setCurrencyData(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Forex fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number, decimals = 4) => {
    return value.toFixed(decimals);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(4)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-terminal-green';
    if (value < 0) return 'text-terminal-red';
    return 'text-terminal-gray';
  };

  return (
    <div className="terminal-panel h-full text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      <div className="panel-header flex items-center justify-between text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">
        <span>FOREX RATES (Frankfurter API)</span>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="hover:text-terminal-green transition-colors" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[0.5rem] text-terminal-cyan">{lastUpdate}</span>
        </div>
      </div>
      <div className="panel-content overflow-auto">
        <div className="grid grid-cols-7 gap-1 text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm font-semibold text-terminal-amber border-b border-border pb-1 mb-2">
          <div>PAIR</div>
          <div>BID</div>
          <div>ASK</div>
          <div>CHANGE</div>
          <div>%</div>
          <div>HIGH</div>
          <div>LOW</div>
        </div>
        <div className="space-y-1">
          {currencyData.map((currency, index) => (
            <div key={index} className="grid grid-cols-7 gap-1 text-[0.6rem] sm:text-xs py-1 hover:bg-muted/50 rounded">
              <div className="text-terminal-cyan font-semibold">{currency.symbol}</div>
              <div className="text-terminal-white">{formatCurrency(currency.bid)}</div>
              <div className="text-terminal-white">{formatCurrency(currency.ask)}</div>
              <div className={getChangeColor(currency.change)}>
                {formatChange(currency.change)}
              </div>
              <div className={getChangeColor(currency.changePercent)}>
                {formatPercent(currency.changePercent)}
              </div>
              <div className="text-terminal-blue">{formatCurrency(currency.high)}</div>
              <div className="text-terminal-purple">{formatCurrency(currency.low)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CurrencyTable;