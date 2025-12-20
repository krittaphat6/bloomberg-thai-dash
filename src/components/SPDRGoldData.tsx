import { useState, useEffect } from 'react';
import { goldDataService, GoldData, CentralBankData } from '@/services/GoldDataService';
import { RefreshCw } from 'lucide-react';

const SPDRGoldData = () => {
  const [goldData, setGoldData] = useState<GoldData[]>([]);
  const [centralBankData, setCentralBankData] = useState<CentralBankData[]>([]);
  const [selectedView, setSelectedView] = useState('spdr');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prices, centralBanks] = await Promise.all([
        GoldDataService.fetchGLDData(),
        GoldDataService.fetchCentralBankHoldings()
      ]);
      setGoldData(prices);
      setCentralBankData(centralBanks);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching gold data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
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
        <div className="flex items-center gap-2">
          <span>GOLD MARKET DATA</span>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-1 hover:bg-background/50 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {lastUpdate && (
            <span className="text-[0.5rem] text-terminal-gray">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
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
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Gold Price (USD)</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">${latestGoldData.priceUSD.toFixed(2)}</div>
                <div className={`text-[0.6rem] sm:text-xs ${getChangeColor(latestGoldData.changePercent)}`}>
                  {latestGoldData.changePercent >= 0 ? '+' : ''}{latestGoldData.changePercent.toFixed(2)}%
                </div>
              </div>
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Price (EUR)</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">€{latestGoldData.priceEUR.toFixed(2)}</div>
                <div className="text-[0.6rem] sm:text-xs text-terminal-gray">per share</div>
              </div>
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Price (GBP)</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">£{latestGoldData.priceGBP.toFixed(2)}</div>
                <div className="text-[0.6rem] sm:text-xs text-terminal-gray">per share</div>
              </div>
              <div className="bg-background/30 p-2 sm:p-3 rounded">
                <div className="text-[0.6rem] sm:text-xs text-terminal-amber mb-1">Volume</div>
                <div className="text-sm sm:text-lg text-terminal-white font-bold">{formatNumber(latestGoldData.volume)}</div>
                <div className="text-[0.6rem] sm:text-xs text-terminal-gray">shares</div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-2">
              <div>Date</div>
              <div className="text-right">Price USD</div>
              <div className="text-right">Price EUR</div>
              <div className="text-right">Price GBP</div>
              <div className="text-right">Volume</div>
              <div className="text-right">Change %</div>
            </div>
            
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {goldData.slice(-10).reverse().map((item, index) => (
                <div key={index} className="grid grid-cols-6 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs py-1 border-b border-border/20 hover:bg-background/30">
                  <div className="text-terminal-white">{item.date}</div>
                  <div className="text-right text-terminal-cyan">${item.priceUSD.toFixed(2)}</div>
                  <div className="text-right text-terminal-gray">€{item.priceEUR.toFixed(2)}</div>
                  <div className="text-right text-terminal-gray">£{item.priceGBP.toFixed(2)}</div>
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
                  <div className="text-right text-terminal-white">{formatNumber(Math.round(country.totalValue))}</div>
                  <div className="text-right text-terminal-gray">{country.percentOfReserves}%</div>
                  <div className="text-right text-terminal-amber">#{index + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedView === 'historical' && (
          <div>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-2">
              <div>Date</div>
              <div className="text-right">USD</div>
              <div className="text-right">EUR</div>
              <div className="text-right">GBP</div>
              <div className="text-right">Change</div>
            </div>
            
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {goldData.map((item, index) => (
                <div key={index} className="grid grid-cols-5 gap-1 sm:gap-2 text-[0.6rem] sm:text-xs py-1 border-b border-border/20 hover:bg-background/30">
                  <div className="text-terminal-white">{item.date}</div>
                  <div className="text-right text-terminal-cyan">${item.priceUSD.toFixed(2)}</div>
                  <div className="text-right text-terminal-gray">€{item.priceEUR.toFixed(2)}</div>
                  <div className="text-right text-terminal-gray">£{item.priceGBP.toFixed(2)}</div>
                  <div className={`text-right ${getChangeColor(item.changePercent)}`}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && goldData.length === 0 && (
          <div className="flex items-center justify-center h-32 text-terminal-amber">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading gold data...
          </div>
        )}
      </div>
    </div>
  );
};

// Need to import the class for static method access
import { GoldDataService } from '@/services/GoldDataService';

export default SPDRGoldData;
