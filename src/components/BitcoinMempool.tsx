import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MempoolService, MempoolData, FeeRecommendation } from '@/services/MempoolService';
import { RefreshCw } from 'lucide-react';

interface ChartData {
  timestamp: string;
  feeLevel: number;
  txCount: number;
}

const BitcoinMempool = () => {
  const [mempoolInfo, setMempoolInfo] = useState<MempoolData | null>(null);
  const [feeEstimates, setFeeEstimates] = useState<FeeRecommendation | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [info, fees] = await Promise.all([
        MempoolService.fetchMempoolData(),
        MempoolService.fetchFeeRecommendations()
      ]);
      
      setMempoolInfo(info);
      setFeeEstimates(fees);
      
      // Update chart data
      if (fees) {
        const now = new Date();
        setChartData(prev => {
          const newPoint: ChartData = {
            timestamp: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
            feeLevel: fees.fastestFee,
            txCount: info?.count || 0
          };
          const updated = [...prev, newPoint].slice(-24);
          return updated;
        });
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching mempool data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="terminal-panel h-full flex flex-col text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm">
      {/* Header */}
      <div className="panel-header flex items-center justify-between border-b border-border pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-[0.6rem] xs:text-[0.7rem] sm:text-sm md:text-base font-bold text-terminal-green">
            Bitcoin Mempool
          </span>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-1 hover:bg-background/50 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-green">
            🟢 Live
          </span>
          {lastUpdate && (
            <span className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-gray">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {/* Stats Overview */}
        {mempoolInfo && feeEstimates && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-terminal-panel p-2 rounded border border-border">
              <div className="text-[0.5rem] text-terminal-amber">TX Count</div>
              <div className="text-sm text-terminal-white font-bold">{mempoolInfo.count.toLocaleString()}</div>
            </div>
            <div className="bg-terminal-panel p-2 rounded border border-border">
              <div className="text-[0.5rem] text-terminal-amber">Size</div>
              <div className="text-sm text-terminal-white font-bold">{formatBytes(mempoolInfo.vsize)}</div>
            </div>
            <div className="bg-terminal-panel p-2 rounded border border-border">
              <div className="text-[0.5rem] text-terminal-amber">Fast Fee</div>
              <div className="text-sm text-terminal-green font-bold">{feeEstimates.fastestFee} sat/vB</div>
            </div>
            <div className="bg-terminal-panel p-2 rounded border border-border">
              <div className="text-[0.5rem] text-terminal-amber">Slow Fee</div>
              <div className="text-sm text-terminal-cyan font-bold">{feeEstimates.hourFee} sat/vB</div>
            </div>
          </div>
        )}

        {/* Fee Levels Chart */}
        <div className="bg-terminal-panel p-2 rounded border border-border">
          <h3 className="text-[0.5rem] xs:text-[0.6rem] sm:text-xs text-terminal-amber mb-2">
            Fee Rate History (sat/vB)
          </h3>
          <div className="h-24 sm:h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 8 }} 
                  stroke="#666" 
                />
                <YAxis 
                  tick={{ fontSize: 8 }} 
                  stroke="#666" 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #333',
                    fontSize: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="feeLevel" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#feeGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* TX Count Chart */}
          <div className="bg-terminal-panel p-2 rounded border border-border">
            <h3 className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-amber mb-1">
              TX Count Over Time
            </h3>
            <div className="h-20 sm:h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 6 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 6 }} stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      fontSize: '6px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="txCount" 
                    stroke="#ff7300" 
                    strokeWidth={1}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fee Estimates */}
          {feeEstimates && (
            <div className="bg-terminal-panel p-2 rounded border border-border">
              <h3 className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-amber mb-1">
                Fee Estimates
              </h3>
              <div className="space-y-1 text-[0.5rem]">
                <div className="flex justify-between">
                  <span className="text-terminal-gray">Fastest (10 min)</span>
                  <span className="text-terminal-green">{feeEstimates.fastestFee} sat/vB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-gray">Half Hour</span>
                  <span className="text-terminal-cyan">{feeEstimates.halfHourFee} sat/vB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-gray">Hour</span>
                  <span className="text-terminal-amber">{feeEstimates.hourFee} sat/vB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-gray">Economy</span>
                  <span className="text-terminal-white">{feeEstimates.economyFee} sat/vB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-gray">Minimum</span>
                  <span className="text-terminal-gray">{feeEstimates.minimumFee} sat/vB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fee Histogram */}
        {mempoolInfo && mempoolInfo.feeHistogram.length > 0 && (
          <div className="bg-terminal-panel p-2 rounded border border-border">
            <h3 className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-amber mb-2">
              Fee Histogram
            </h3>
            <div className="space-y-1 max-h-32 overflow-auto">
              {MempoolService.processFeeHistogram(mempoolInfo.feeHistogram).map((item, index) => (
                <div key={index} className="flex justify-between text-[0.4rem] xs:text-[0.5rem]">
                  <span className="text-terminal-white">{item.fee} sat/vB</span>
                  <div className="flex-1 mx-2 bg-background/30 rounded h-2">
                    <div 
                      className="bg-terminal-cyan h-full rounded"
                      style={{ width: `${Math.min(100, item.vsize * 5)}%` }}
                    />
                  </div>
                  <span className="text-terminal-gray">{item.vsize} MB</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && !mempoolInfo && (
          <div className="flex items-center justify-center h-32 text-terminal-amber">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading mempool data...
          </div>
        )}
      </div>
    </div>
  );
};

export default BitcoinMempool;
