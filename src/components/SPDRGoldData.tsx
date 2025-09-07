import { useState, useEffect } from 'react';

interface GoldData {
  date: string;
  goldHoldings: number;
  priceUSD: number;
  priceGBP: number;
  priceEUR: number;
  volume: number;
  marketCap: number;
  change: number;
  changePercent: number;
}

interface CentralBankData {
  country: string;
  flag: string;
  goldReserves: number;
  monthlyChange: number;
  totalValue: number;
  percentOfReserves: number;
}

const SPDRGoldData = () => {
  const [goldData, setGoldData] = useState<GoldData[]>([]);
  const [centralBankData, setCentralBankData] = useState<CentralBankData[]>([]);
  const [selectedView, setSelectedView] = useState('spdr');

  useEffect(() => {
    const generateGoldData = (): GoldData[] => {
      const data: GoldData[] = [];
      const basePrice = 2050;
      const baseHoldings = 875.23;
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const priceVariation = -50 + Math.random() * 100;
        const holdingsVariation = -5 + Math.random() * 10;
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
          goldHoldings: +(baseHoldings + holdingsVariation).toFixed(2),
          priceUSD: +(basePrice + priceVariation).toFixed(2),
          priceGBP: +((basePrice + priceVariation) * 0.79).toFixed(2),
          priceEUR: +((basePrice + priceVariation) * 0.85).toFixed(2),
          volume: Math.floor(5000000 + Math.random() * 15000000),
          marketCap: Math.floor(75000000000 + Math.random() * 10000000000),
          change: -25 + Math.random() * 50,
          changePercent: -2 + Math.random() * 4
        });
      }
      
      return data;
    };

    const generateCentralBankData = (): CentralBankData[] => {
      return [
        { country: 'United States', flag: '🇺🇸', goldReserves: 8133.5, monthlyChange: -12.3, totalValue: 516850, percentOfReserves: 74.9 },
        { country: 'Germany', flag: '🇩🇪', goldReserves: 3359.1, monthlyChange: 0, totalValue: 213490, percentOfReserves: 66.8 },
        { country: 'Italy', flag: '🇮🇹', goldReserves: 2451.8, monthlyChange: 0, totalValue: 155860, percentOfReserves: 64.4 },
        { country: 'France', flag: '🇫🇷', goldReserves: 2436.9, monthlyChange: 0, totalValue: 154920, percentOfReserves: 59.1 },
        { country: 'China', flag: '🇨🇳', goldReserves: 2235.4, monthlyChange: +32.1, totalValue: 142100, percentOfReserves: 4.2 },
        { country: 'Russia', flag: '🇷🇺', goldReserves: 2298.5, monthlyChange: +15.6, totalValue: 146070, percentOfReserves: 28.6 },
        { country: 'Switzerland', flag: '🇨🇭', goldReserves: 1040.0, monthlyChange: 0, totalValue: 66140, percentOfReserves: 6.8 },
        { country: 'Japan', flag: '🇯🇵', goldReserves: 845.97, monthlyChange: 0, totalValue: 53780, percentOfReserves: 4.0 },
        { country: 'India', flag: '🇮🇳', goldReserves: 800.78, monthlyChange: +27.5, totalValue: 50900, percentOfReserves: 7.8 },
        { country: 'Netherlands', flag: '🇳🇱', goldReserves: 612.45, monthlyChange: 0, totalValue: 38940, percentOfReserves: 62.7 },
        { country: 'Turkey', flag: '🇹🇷', goldReserves: 540.68, monthlyChange: +8.9, totalValue: 34380, percentOfReserves: 38.8 },
        { country: 'Poland', flag: '🇵🇱', goldReserves: 359.08, monthlyChange: +100.0, totalValue: 22830, percentOfReserves: 14.2 }
      ];
    };

    setGoldData(generateGoldData());
    setCentralBankData(generateCentralBankData());

    const interval = setInterval(() => {
      setGoldData(prevData =>
        prevData.map(item => ({
          ...item,
          priceUSD: +(item.priceUSD + (-5 + Math.random() * 10)).toFixed(2),
          change: -25 + Math.random() * 50,
          changePercent: -2 + Math.random() * 4
        }))
      );
    }, 3000);

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

  const latestGoldData = goldData[goldData.length - 1];

  return (
    <div className="terminal-panel h-full text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      <div className="panel-header flex items-center justify-between text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">
        <span>GOLD MARKET DATA</span>
        <div className="flex items-center gap-2">
          <select 
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            className="bg-background border border-border text-terminal-green text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
          >
            <option value="spdr">SPDR Gold Trust (GLD)</option>
            <option value="centralbanks">Central Bank Holdings</option>
            <option value="historical">Historical Data</option>
          </select>
        </div>
      </div>
      
      <div className="panel-content">
        {selectedView === 'spdr' && latestGoldData && (
          <div className="space-y-4">
            {/* Current SPDR Stats */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Gold Holdings</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">{latestGoldData.goldHoldings}</div>
                <div className="text-[0.6rem] sm:text-xs text-terminal-gray">tonnes</div>
              </div>
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Price (USD)</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">${latestGoldData.priceUSD}</div>
                <div className={`text-[0.6rem] sm:text-xs ${getChangeColor(latestGoldData.changePercent)}`}>
                  {latestGoldData.changePercent >= 0 ? '+' : ''}{latestGoldData.changePercent.toFixed(2)}%
                </div>
              </div>
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Volume</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">{formatNumber(latestGoldData.volume)}</div>
                <div className="text-[0.6rem] sm:text-xs text-terminal-gray">shares</div>
              </div>
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Market Cap</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">${(latestGoldData.marketCap / 1e9).toFixed(1)}B</div>
                <div className="text-[0.6rem] sm:text-xs text-terminal-gray">USD</div>
              </div>
            </div>

            {/* Recent Holdings Data */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-2">
              <div>Date</div>
              <div className="text-right">Holdings (oz)</div>
              <div className="text-right">Price USD</div>
              <div className="text-right">Price GBP</div>
              <div className="text-right">Price EUR</div>
              <div className="text-right">Volume</div>
              <div className="text-right">Change %</div>
            </div>
            
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {goldData.slice(-10).reverse().map((item, index) => (
                <div key={index} className="grid grid-cols-7 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs py-1 border-b border-border/20 hover:bg-background/30">
                  <div className="text-terminal-white">{item.date}</div>
                  <div className="text-right text-terminal-cyan">{item.goldHoldings}</div>
                  <div className="text-right text-terminal-white">${item.priceUSD}</div>
                  <div className="text-right text-terminal-gray">£{item.priceGBP}</div>
                  <div className="text-right text-terminal-gray">€{item.priceEUR}</div>
                  <div className="text-right text-terminal-gray">{formatNumber(item.volume)}</div>
                  <div className={`text-right ${getChangeColor(item.changePercent)}`}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedView === 'centralbanks' && (
          <div>
            <div className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-2">
              <div>Country</div>
              <div className="text-right">Gold Reserves (tonnes)</div>
              <div className="text-right">Monthly Change</div>
              <div className="text-right">Total Value (USD Mil)</div>
              <div className="text-right">% of Total Reserves</div>
              <div className="text-right">Rank</div>
            </div>
            
            <div className="space-y-1">
              {centralBankData.map((country, index) => (
                <div key={index} className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs py-1 sm:py-2 border-b border-border/20 hover:bg-background/30">
                  <div className="text-terminal-white flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.country}</span>
                  </div>
                  <div className="text-right text-terminal-cyan font-medium">{formatNumber(country.goldReserves)}</div>
                  <div className={`text-right font-medium ${getChangeColor(country.monthlyChange)}`}>
                    {country.monthlyChange >= 0 ? '+' : ''}{country.monthlyChange}
                  </div>
                  <div className="text-right text-terminal-white">{formatNumber(country.totalValue)}</div>
                  <div className="text-right text-terminal-gray">{country.percentOfReserves}%</div>
                  <div className="text-right text-terminal-amber">#{index + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SPDRGoldData;