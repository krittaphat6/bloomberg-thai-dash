import { useState, useEffect } from 'react';

interface COTPosition {
  asset: string;
  commercialLong: number;
  commercialShort: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonReportableLong: number;
  nonReportableShort: number;
  openInterest: number;
  change: number;
  date: string;
}

const COTData = () => {
  const [cotData, setCOTData] = useState<COTPosition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('futures');

  useEffect(() => {
    const generateCOTData = (): COTPosition[] => {
      const assets = [
        'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'MXN',
        'GOLD', 'SILVER', 'COPPER', 'CRUDE OIL', 'NATURAL GAS',
        'S&P 500', 'NASDAQ', 'DOW JONES', 'RUSSELL 2000',
        'WHEAT', 'CORN', 'SOYBEANS', 'COTTON', 'SUGAR'
      ];

      return assets.map(asset => ({
        asset,
        commercialLong: Math.floor(20000 + Math.random() * 100000),
        commercialShort: Math.floor(25000 + Math.random() * 90000),
        nonCommercialLong: Math.floor(15000 + Math.random() * 80000),
        nonCommercialShort: Math.floor(18000 + Math.random() * 75000),
        nonReportableLong: Math.floor(5000 + Math.random() * 20000),
        nonReportableShort: Math.floor(5500 + Math.random() * 18000),
        openInterest: Math.floor(100000 + Math.random() * 500000),
        change: -15 + Math.random() * 30,
        date: 'Dec 03, 2024'
      }));
    };

    setCOTData(generateCOTData());

    const interval = setInterval(() => {
      setCOTData(prevData =>
        prevData.map(item => ({
          ...item,
          commercialLong: Math.max(0, item.commercialLong + Math.floor(-1000 + Math.random() * 2000)),
          commercialShort: Math.max(0, item.commercialShort + Math.floor(-1000 + Math.random() * 2000)),
          nonCommercialLong: Math.max(0, item.nonCommercialLong + Math.floor(-800 + Math.random() * 1600)),
          nonCommercialShort: Math.max(0, item.nonCommercialShort + Math.floor(-800 + Math.random() * 1600)),
          change: -15 + Math.random() * 30
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-terminal-green';
    if (change < 0) return 'text-terminal-red';
    return 'text-terminal-amber';
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getNetPosition = (long: number, short: number) => {
    const net = long - short;
    return {
      value: net,
      formatted: (net >= 0 ? '+' : '') + formatNumber(net),
      color: net >= 0 ? 'text-terminal-green' : 'text-terminal-red'
    };
  };

  return (
    <div className="terminal-panel h-full text-[0.6rem] sm:text-xs md:text-sm lg:text-base">
      <div className="panel-header flex items-center justify-between">
        <span className="text-[0.7rem] sm:text-sm md:text-base lg:text-lg">COT REPORT - COMMITMENT OF TRADERS</span>
        <div className="flex items-center gap-1 sm:gap-2">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background border border-border text-terminal-green text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
          >
            <option value="futures">Futures Only</option>
            <option value="combined">Futures & Options</option>
            <option value="disaggregated">Disaggregated</option>
          </select>
          <span className="text-[0.6rem] sm:text-xs text-terminal-gray">Updated: Dec 03, 2024</span>
        </div>
      </div>
      
      <div className="panel-content">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-10 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-2 min-w-[800px] sm:min-w-[1000px] lg:min-w-[1200px]">
            <div className="font-medium">Asset</div>
            <div className="text-right font-medium">Comm Long</div>
            <div className="text-right font-medium">Comm Short</div>
            <div className="text-right font-medium">Comm Net</div>
            <div className="text-right font-medium">Large Long</div>
            <div className="text-right font-medium">Large Short</div>
            <div className="text-right font-medium">Large Net</div>
            <div className="text-right font-medium">Small Net</div>
            <div className="text-right font-medium">Open Int</div>
            <div className="text-right font-medium">Change %</div>
          </div>
          
          <div className="space-y-1 min-w-[800px] sm:min-w-[1000px] lg:min-w-[1200px]">
            {cotData.map((item, index) => {
              const commNet = getNetPosition(item.commercialLong, item.commercialShort);
              const largeNet = getNetPosition(item.nonCommercialLong, item.nonCommercialShort);
              const smallNet = getNetPosition(item.nonReportableLong, item.nonReportableShort);
              
              return (
                <div key={index} className="grid grid-cols-10 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs py-1 sm:py-2 border-b border-border/20 hover:bg-background/30">
                  <div className="text-terminal-white font-medium">{item.asset}</div>
                  <div className="text-right text-terminal-cyan">{formatNumber(item.commercialLong)}</div>
                  <div className="text-right text-terminal-cyan">{formatNumber(item.commercialShort)}</div>
                  <div className={`text-right font-medium ${commNet.color}`}>{commNet.formatted}</div>
                  <div className="text-right text-terminal-blue">{formatNumber(item.nonCommercialLong)}</div>
                  <div className="text-right text-terminal-blue">{formatNumber(item.nonCommercialShort)}</div>
                  <div className={`text-right font-medium ${largeNet.color}`}>{largeNet.formatted}</div>
                  <div className={`text-right font-medium ${smallNet.color}`}>{smallNet.formatted}</div>
                  <div className="text-right text-terminal-gray">{formatNumber(item.openInterest)}</div>
                  <div className={`text-right font-medium ${getChangeColor(item.change)}`}>
                    {(item.change >= 0 ? '+' : '')}{item.change.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default COTData;