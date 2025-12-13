import { useState, useEffect } from 'react';
import { COTDataService, COTPosition } from '@/services/COTDataService';
import { RefreshCw } from 'lucide-react';

const COTData = () => {
  const [cotData, setCOTData] = useState<COTPosition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('futures');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = selectedCategory === 'disaggregated' 
        ? await COTDataService.fetchDisaggregatedReport()
        : await COTDataService.fetchFuturesReport();
      
      setCOTData(data);
      setLastUpdate(new Date().toLocaleString());
    } catch (error) {
      console.error('COT fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [selectedCategory]);

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
    <div className="terminal-panel h-full text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      <div className="panel-header flex items-center justify-between">
        <span className="text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">COT REPORT - CFTC DATA</span>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={fetchData} className="hover:text-terminal-green transition-colors" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background border border-border text-terminal-green text-[0.6rem] sm:text-xs px-1 sm:px-2 py-1"
          >
            <option value="futures">Futures Only</option>
            <option value="combined">Futures & Options</option>
            <option value="disaggregated">Disaggregated</option>
          </select>
          <span className="text-[0.6rem] sm:text-xs text-terminal-gray">{lastUpdate || 'Loading...'}</span>
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