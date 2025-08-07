import { useEffect, useState } from 'react';

interface CurrencyData {
  symbol: string;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

const CurrencyTable = () => {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([
    { symbol: "EUR/USD", bid: 1.0534, ask: 1.0536, change: -0.0043, changePercent: -0.41, high: 1.0589, low: 1.0521 },
    { symbol: "GBP/USD", bid: 1.2678, ask: 1.2680, change: -0.0010, changePercent: -0.08, high: 1.2705, low: 1.2663 },
    { symbol: "USD/JPY", bid: 149.56, ask: 149.58, change: 0.23, changePercent: 0.15, high: 149.89, low: 149.12 },
    { symbol: "USD/CHF", bid: 0.8834, ask: 0.8836, change: 0.0036, changePercent: 0.41, high: 0.8845, low: 0.8798 },
    { symbol: "AUD/USD", bid: 0.6589, ask: 0.6591, change: -0.0011, changePercent: -0.17, high: 0.6612, low: 0.6575 },
    { symbol: "USD/CAD", bid: 1.3945, ask: 1.3947, change: 0.0033, changePercent: 0.24, high: 1.3978, low: 1.3923 },
    { symbol: "NZD/USD", bid: 0.5978, ask: 0.5980, change: -0.0015, changePercent: -0.25, high: 0.6001, low: 0.5965 },
    { symbol: "EUR/GBP", bid: 0.8309, ask: 0.8311, change: -0.0012, changePercent: -0.14, high: 0.8334, low: 0.8298 },
    { symbol: "EUR/JPY", bid: 157.65, ask: 157.67, change: -0.45, changePercent: -0.28, high: 158.23, low: 157.34 },
    { symbol: "GBP/JPY", bid: 189.73, ask: 189.75, change: 0.12, changePercent: 0.06, high: 190.45, low: 189.23 },
    { symbol: "USD/THB", bid: 34.78, ask: 34.82, change: -0.11, changePercent: -0.32, high: 35.12, low: 34.65 },
    { symbol: "EUR/THB", bid: 36.64, ask: 36.68, change: -0.23, changePercent: -0.62, high: 37.01, low: 36.45 },
    { symbol: "GBP/THB", bid: 44.09, ask: 44.13, change: -0.15, changePercent: -0.34, high: 44.67, low: 43.89 },
    { symbol: "AUD/THB", bid: 22.92, ask: 22.96, change: -0.08, changePercent: -0.35, high: 23.15, low: 22.78 },
    { symbol: "USD/CNY", bid: 7.2345, ask: 7.2367, change: 0.0123, changePercent: 0.17, high: 7.2456, low: 7.2198 },
    { symbol: "USD/SGD", bid: 1.3456, ask: 1.3458, change: 0.0012, changePercent: 0.09, high: 1.3478, low: 1.3432 },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrencyData(prevData => 
        prevData.map(currency => {
          const changeAmount = (Math.random() - 0.5) * 0.01;
          const newBid = currency.bid + changeAmount;
          const newAsk = currency.ask + changeAmount;
          return {
            ...currency,
            bid: newBid,
            ask: newAsk,
            change: currency.change + (Math.random() - 0.5) * 0.01,
            changePercent: currency.changePercent + (Math.random() - 0.5) * 0.1,
            high: Math.max(currency.high, newBid),
            low: Math.min(currency.low, newBid)
          };
        })
      );
    }, 2000);

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
    <div className="terminal-panel h-full text-[0.6rem] sm:text-xs md:text-sm lg:text-base">
      <div className="panel-header text-[0.7rem] sm:text-sm md:text-base lg:text-lg">CURRENCY EXCHANGE</div>
      <div className="panel-content overflow-auto">
        <div className="grid grid-cols-7 gap-1 text-[0.6rem] sm:text-xs font-semibold text-terminal-amber border-b border-border pb-1 mb-2">
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