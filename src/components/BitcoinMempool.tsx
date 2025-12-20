import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MempoolService, MempoolData, FeeRecommendation } from '@/services/MempoolService';
import { RefreshCw, Database, Activity, Clock, BarChart3 } from 'lucide-react';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';

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
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [info, fees] = await Promise.all([
        MempoolService.fetchMempoolData(),
        MempoolService.fetchFeeRecommendations()
      ]);
      
      setMempoolInfo(info);
      setFeeEstimates(fees);
      
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
    } catch (err: any) {
      console.error('Error fetching mempool data:', err);
      setError(err.message || 'Failed to fetch mempool data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  // Mempool Stats Content
  const MempoolContent = () => (
    <div className="space-y-3">
      {mempoolInfo && feeEstimates && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded border border-border bg-background/50">
            <div className="text-[10px] text-amber-400">TX Count</div>
            <div className="text-sm font-bold text-foreground">{mempoolInfo.count.toLocaleString()}</div>
          </div>
          <div className="p-2 rounded border border-border bg-background/50">
            <div className="text-[10px] text-amber-400">Size</div>
            <div className="text-sm font-bold text-foreground">{formatBytes(mempoolInfo.vsize)}</div>
          </div>
          <div className="p-2 rounded border border-border bg-background/50">
            <div className="text-[10px] text-amber-400">Fast Fee</div>
            <div className="text-sm font-bold text-green-400">{feeEstimates.fastestFee} sat/vB</div>
          </div>
          <div className="p-2 rounded border border-border bg-background/50">
            <div className="text-[10px] text-amber-400">Slow Fee</div>
            <div className="text-sm font-bold text-cyan-400">{feeEstimates.hourFee} sat/vB</div>
          </div>
        </div>
      )}

      {/* Fee Rate History Chart */}
      <div className="p-2 rounded border border-border">
        <h3 className="text-xs text-amber-400 mb-2">Fee Rate History (sat/vB)</h3>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  fontSize: '10px'
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
    </div>
  );

  // Fees Content
  const FeesContent = () => (
    <div className="space-y-3">
      {feeEstimates && (
        <div className="p-2 rounded border border-border">
          <h3 className="text-xs text-amber-400 mb-2">Fee Estimates</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fastest (10 min)</span>
              <span className="text-green-400 font-bold">{feeEstimates.fastestFee} sat/vB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Half Hour</span>
              <span className="text-cyan-400 font-bold">{feeEstimates.halfHourFee} sat/vB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hour</span>
              <span className="text-amber-400 font-bold">{feeEstimates.hourFee} sat/vB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Economy</span>
              <span className="text-foreground font-bold">{feeEstimates.economyFee} sat/vB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Minimum</span>
              <span className="text-muted-foreground font-bold">{feeEstimates.minimumFee} sat/vB</span>
            </div>
          </div>
        </div>
      )}

      {/* TX Count Chart */}
      <div className="p-2 rounded border border-border">
        <h3 className="text-xs text-amber-400 mb-2">TX Count Over Time</h3>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  fontSize: '10px'
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
    </div>
  );

  // Histogram Content
  const HistogramContent = () => (
    <div className="space-y-2">
      {mempoolInfo && mempoolInfo.feeHistogram.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-auto">
          {MempoolService.processFeeHistogram(mempoolInfo.feeHistogram).map((item, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="text-foreground w-16">{item.fee} sat/vB</span>
              <div className="flex-1 mx-2 bg-background/30 rounded h-3">
                <div 
                  className="bg-cyan-400 h-full rounded"
                  style={{ width: `${Math.min(100, item.vsize * 5)}%` }}
                />
              </div>
              <span className="text-muted-foreground w-16 text-right">{item.vsize} MB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <COTStyleWrapper
      title="BITCOIN MEMPOOL"
      icon="⛏️"
      lastUpdate={lastUpdate}
      onRefresh={fetchData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'mempool',
          label: 'Mempool',
          icon: <Database className="w-3 h-3" />,
          content: <MempoolContent />
        },
        {
          id: 'fees',
          label: 'Fees',
          icon: <Activity className="w-3 h-3" />,
          content: <FeesContent />
        },
        {
          id: 'histogram',
          label: 'Histogram',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <HistogramContent />
        }
      ]}
      footerLeft={mempoolInfo ? `🟢 Live` : '🔴 Offline'}
      footerStats={[
        { label: '📦 Pending', value: mempoolInfo?.count.toLocaleString() || '-' },
        { label: '💰 Fast', value: feeEstimates ? `${feeEstimates.fastestFee} sat/vB` : '-' }
      ]}
    />
  );
};

export default BitcoinMempool;
