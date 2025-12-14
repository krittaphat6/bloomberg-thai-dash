import { useState, useEffect } from 'react';
import { COTDataService, COTPosition } from '@/services/COTDataService';
import { RefreshCw, Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';

interface HistoricalCOTData extends COTPosition {
  date: string;
  commercialNet: number;
  nonCommercialNet: number;
  nonReportableNet: number;
}

// CFTC API - Real data
const fetchRealCOTData = async (asset: string, startDate: string, endDate: string): Promise<HistoricalCOTData[]> => {
  const apiUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?market_and_exchange_names=${encodeURIComponent(asset)}&$where=report_date_as_yyyy_mm_dd between '${startDate}' and '${endDate}'&$order=report_date_as_yyyy_mm_dd ASC&$limit=500`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('CFTC API Error');
    const data = await response.json();
    
    return data.map((item: any) => {
      const commLong = parseInt(item.comm_positions_long_all || 0);
      const commShort = parseInt(item.comm_positions_short_all || 0);
      const nonCommLong = parseInt(item.noncomm_positions_long_all || 0);
      const nonCommShort = parseInt(item.noncomm_positions_short_all || 0);
      const nonRepLong = parseInt(item.nonrept_positions_long_all || 0);
      const nonRepShort = parseInt(item.nonrept_positions_short_all || 0);
      
      return {
        asset: item.market_and_exchange_names,
        commercialLong: commLong,
        commercialShort: commShort,
        commercialNet: commLong - commShort,
        nonCommercialLong: nonCommLong,
        nonCommercialShort: nonCommShort,
        nonCommercialNet: nonCommLong - nonCommShort,
        nonReportableLong: nonRepLong,
        nonReportableShort: nonRepShort,
        nonReportableNet: nonRepLong - nonRepShort,
        openInterest: parseInt(item.open_interest_all || 0),
        change: parseFloat(item.change_in_open_interest_all || 0),
        date: item.report_date_as_yyyy_mm_dd
      };
    });
  } catch (error) {
    console.error('CFTC fetch error:', error);
    return [];
  }
};

const AVAILABLE_ASSETS = [
  { value: 'GOLD - COMMODITY EXCHANGE INC.', label: 'GOLD' },
  { value: 'SILVER - COMMODITY EXCHANGE INC.', label: 'SILVER' },
  { value: 'COPPER- #1 - COMMODITY EXCHANGE INC.', label: 'COPPER' },
  { value: 'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE', label: 'CRUDE OIL' },
  { value: 'NATURAL GAS - NEW YORK MERCANTILE EXCHANGE', label: 'NAT GAS' },
  { value: 'EURO FX - CHICAGO MERCANTILE EXCHANGE', label: 'EUR/USD' },
  { value: 'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE', label: 'GBP/USD' },
  { value: 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE', label: 'JPY' },
  { value: 'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE', label: 'AUD/USD' },
  { value: 'E-MINI S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE', label: 'S&P 500' },
  { value: 'NASDAQ MINI - CHICAGO MERCANTILE EXCHANGE', label: 'NASDAQ' },
  { value: 'U.S. TREASURY BONDS - CHICAGO BOARD OF TRADE', label: 'T-BONDS' },
];

const COTData = () => {
  const [cotData, setCOTData] = useState<COTPosition[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalCOTData[]>([]);
  const [selectedAsset, setSelectedAsset] = useState('GOLD - COMMODITY EXCHANGE INC.');
  const [selectedCategory, setSelectedCategory] = useState('futures');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [showCharts, setShowCharts] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const loadHistoricalData = async () => {
    setLoading(true);
    try {
      const data = await fetchRealCOTData(selectedAsset, dateRange.start, dateRange.end);
      setHistoricalData(data);
      if (data.length > 0) {
        setCOTData([data[data.length - 1]]); // Latest data
      }
      setLastUpdate(new Date().toLocaleString());
    } catch (error) {
      console.error('Historical COT fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

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
    loadHistoricalData();
  }, [selectedAsset, dateRange]);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const exportCSV = () => {
    if (historicalData.length === 0) return;
    
    const headers = ['Date', 'Asset', 'Comm Long', 'Comm Short', 'Comm Net', 'Large Long', 'Large Short', 'Large Net', 'Small Long', 'Small Short', 'Small Net', 'Open Interest', 'Change'];
    const rows = historicalData.map(d => [
      d.date, d.asset, d.commercialLong, d.commercialShort, d.commercialNet,
      d.nonCommercialLong, d.nonCommercialShort, d.nonCommercialNet,
      d.nonReportableLong, d.nonReportableShort, d.nonReportableNet,
      d.openInterest, d.change
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COT_${selectedAsset.split(' ')[0]}_${dateRange.start}_${dateRange.end}.csv`;
    a.click();
  };

  // Calculate COT Index
  const calculateCOTIndex = () => {
    if (historicalData.length === 0) return 50;
    const nets = historicalData.map(d => d.nonCommercialNet);
    const min = Math.min(...nets);
    const max = Math.max(...nets);
    const latest = nets[nets.length - 1];
    if (max === min) return 50;
    return ((latest - min) / (max - min)) * 100;
  };

  const cotIndex = calculateCOTIndex();
  const latestData = historicalData[historicalData.length - 1];

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
    <div className="terminal-panel h-full text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base overflow-auto">
      <div className="panel-header flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">COT REPORT - CFTC DATA (REAL API)</span>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={loadHistoricalData} className="hover:text-terminal-green transition-colors" disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} className="hover:text-terminal-green transition-colors" title="Export CSV">
              <Download className="w-3 h-3" />
            </button>
            <button 
              onClick={() => setShowCharts(!showCharts)} 
              className={`px-2 py-0.5 rounded text-[0.5rem] ${showCharts ? 'bg-terminal-green text-background' : 'bg-terminal-panel'}`}
            >
              Charts
            </button>
          </div>
        </div>
        
        {/* Asset & Date Selector */}
        <div className="flex gap-2 items-center flex-wrap text-[0.5rem] sm:text-xs">
          <select 
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="bg-background border border-border text-terminal-green px-1 sm:px-2 py-1 rounded"
          >
            {AVAILABLE_ASSETS.map(asset => (
              <option key={asset.value} value={asset.value}>{asset.label}</option>
            ))}
          </select>
          
          <div className="flex gap-1 items-center">
            <Calendar className="w-3 h-3 text-terminal-gray" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-background border border-border px-1 py-0.5 rounded text-terminal-green"
            />
            <span className="text-terminal-gray">to</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-background border border-border px-1 py-0.5 rounded text-terminal-green"
            />
          </div>
          
          {/* Quick Range Buttons */}
          <div className="flex gap-1">
            {[
              { label: '3M', months: 3 },
              { label: '6M', months: 6 },
              { label: '1Y', months: 12 },
              { label: '2Y', months: 24 },
            ].map(range => (
              <button 
                key={range.label}
                onClick={() => setDateRange({
                  start: new Date(new Date().setMonth(new Date().getMonth() - range.months)).toISOString().split('T')[0],
                  end: new Date().toISOString().split('T')[0]
                })}
                className="px-2 py-0.5 rounded bg-terminal-panel hover:bg-terminal-green hover:text-background transition-colors"
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <span className="text-terminal-gray ml-auto">{historicalData.length} reports | {lastUpdate || 'Loading...'}</span>
        </div>
      </div>
      
      <div className="panel-content">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-terminal-green" />
            <span className="ml-2 text-terminal-amber">Loading real CFTC data...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {latestData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="bg-background/50 p-2 rounded border border-border">
                  <div className="text-[0.5rem] sm:text-xs text-terminal-gray">COT Index</div>
                  <div className={`text-lg sm:text-2xl font-bold ${
                    cotIndex > 70 ? 'text-terminal-green' :
                    cotIndex < 30 ? 'text-terminal-red' :
                    'text-terminal-amber'
                  }`}>
                    {cotIndex.toFixed(0)}
                  </div>
                  <div className="text-[0.4rem] sm:text-xs text-terminal-gray">
                    {cotIndex > 70 ? 'Bullish' : cotIndex < 30 ? 'Bearish' : 'Neutral'}
                  </div>
                </div>
                
                <div className="bg-background/50 p-2 rounded border border-border">
                  <div className="text-[0.5rem] sm:text-xs text-terminal-gray">Large Traders Net</div>
                  <div className={`text-sm sm:text-lg font-bold ${latestData.nonCommercialNet > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {latestData.nonCommercialNet.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-[0.4rem] sm:text-xs">
                    {latestData.nonCommercialNet > 0 ? <TrendingUp className="w-3 h-3 text-terminal-green" /> : <TrendingDown className="w-3 h-3 text-terminal-red" />}
                    <span className="text-terminal-gray">contracts</span>
                  </div>
                </div>
                
                <div className="bg-background/50 p-2 rounded border border-border">
                  <div className="text-[0.5rem] sm:text-xs text-terminal-gray">Commercial Net</div>
                  <div className={`text-sm sm:text-lg font-bold ${latestData.commercialNet > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {latestData.commercialNet.toLocaleString()}
                  </div>
                  <div className="text-[0.4rem] sm:text-xs text-terminal-gray">contracts</div>
                </div>
                
                <div className="bg-background/50 p-2 rounded border border-border">
                  <div className="text-[0.5rem] sm:text-xs text-terminal-gray">Open Interest</div>
                  <div className="text-sm sm:text-lg font-bold text-terminal-cyan">
                    {latestData.openInterest.toLocaleString()}
                  </div>
                  <div className="text-[0.4rem] sm:text-xs text-terminal-gray">total</div>
                </div>
              </div>
            )}
            
            {/* Charts */}
            {showCharts && historicalData.length > 0 && (
              <div className="space-y-4 mb-4">
                <div className="bg-background/30 p-3 rounded border border-border">
                  <h4 className="text-xs font-bold text-terminal-green mb-2">Net Positions Over Time</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 9, fill: '#888' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="commercialNet" stroke="#00ff00" strokeWidth={2} name="Commercial Net" dot={false} />
                      <Line type="monotone" dataKey="nonCommercialNet" stroke="#0088ff" strokeWidth={2} name="Large Traders Net" dot={false} />
                      <Line type="monotone" dataKey="nonReportableNet" stroke="#ff8800" strokeWidth={1} name="Small Traders Net" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-background/30 p-3 rounded border border-border">
                  <h4 className="text-xs font-bold text-terminal-cyan mb-2">Open Interest Trend</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="oiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ffff" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 9, fill: '#888' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="openInterest" stroke="#00ffff" fillOpacity={1} fill="url(#oiGradient)" name="Open Interest" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Data Table */}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-10 gap-1 sm:gap-2 text-[0.5rem] sm:text-xs mb-2 text-terminal-amber border-b border-border pb-2 min-w-[800px]">
                <div className="font-medium">Date</div>
                <div className="text-right font-medium">Comm Long</div>
                <div className="text-right font-medium">Comm Short</div>
                <div className="text-right font-medium">Comm Net</div>
                <div className="text-right font-medium">Large Long</div>
                <div className="text-right font-medium">Large Short</div>
                <div className="text-right font-medium">Large Net</div>
                <div className="text-right font-medium">Small Net</div>
                <div className="text-right font-medium">Open Int</div>
                <div className="text-right font-medium">Change</div>
              </div>
              
              <div className="space-y-1 min-w-[800px]">
                {historicalData.slice(-20).reverse().map((item, index) => {
                  const commNet = getNetPosition(item.commercialLong, item.commercialShort);
                  const largeNet = getNetPosition(item.nonCommercialLong, item.nonCommercialShort);
                  const smallNet = getNetPosition(item.nonReportableLong, item.nonReportableShort);
                  
                  return (
                    <div key={index} className="grid grid-cols-10 gap-1 sm:gap-2 text-[0.5rem] sm:text-xs py-1 border-b border-border/20 hover:bg-background/30">
                      <div className="text-terminal-white font-medium">{item.date}</div>
                      <div className="text-right text-terminal-cyan">{formatNumber(item.commercialLong)}</div>
                      <div className="text-right text-terminal-cyan">{formatNumber(item.commercialShort)}</div>
                      <div className={`text-right font-medium ${commNet.color}`}>{commNet.formatted}</div>
                      <div className="text-right text-terminal-blue">{formatNumber(item.nonCommercialLong)}</div>
                      <div className="text-right text-terminal-blue">{formatNumber(item.nonCommercialShort)}</div>
                      <div className={`text-right font-medium ${largeNet.color}`}>{largeNet.formatted}</div>
                      <div className={`text-right font-medium ${smallNet.color}`}>{smallNet.formatted}</div>
                      <div className="text-right text-terminal-gray">{formatNumber(item.openInterest)}</div>
                      <div className={`text-right font-medium ${getChangeColor(item.change)}`}>
                        {(item.change >= 0 ? '+' : '')}{formatNumber(item.change)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default COTData;