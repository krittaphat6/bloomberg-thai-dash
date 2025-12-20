import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, TrendingUp, TrendingDown, Settings, Table, BarChart3 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';

interface CVDData {
  timestamp: number;
  cvd: number;
  delta: number;
  upVolume: number;
  downVolume: number;
  price: number;
}

interface ExchangeConfig {
  enabled: boolean;
  symbol: string;
  weight: number;
}

const CVDChart = () => {
  const [loading, setLoading] = useState(false);
  const [cvdData, setCvdData] = useState<CVDData[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [cumulative, setCumulative] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([
    { enabled: true, symbol: 'BINANCE:BTCUSDT', weight: 40 },
    { enabled: true, symbol: 'COINBASE:BTC-USD', weight: 30 },
    { enabled: true, symbol: 'KRAKEN:XBTUSD', weight: 20 },
    { enabled: false, symbol: 'BITFINEX:BTCUSD', weight: 10 },
  ]);

  const calculateCVD = (data: any[]) => {
    let cvd = 0;
    const result: CVDData[] = [];

    data.forEach((candle, i) => {
      const { timestamp, open, close, volume } = candle;
      
      let upVolume = 0;
      let downVolume = 0;

      if (close > open) {
        upVolume = volume;
      } else if (close < open) {
        downVolume = volume;
      } else {
        if (i > 0 && data[i - 1].close > data[i - 1].open) {
          upVolume = volume;
        } else {
          downVolume = volume;
        }
      }

      const delta = upVolume - downVolume;
      
      if (cumulative) {
        cvd += delta;
      } else {
        cvd = delta;
      }

      result.push({
        timestamp,
        cvd,
        delta,
        upVolume,
        downVolume,
        price: close
      });
    });

    return result;
  };

  const fetchCVDData = async () => {
    setLoading(true);
    setError(null);
    try {
      const interval = {
        '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1h', '4h': '4h', '1d': '1d'
      }[timeframe] || '1h';

      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`
      );
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      const formattedData = data.map((k: any[]) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      const cvdResults = calculateCVD(formattedData);
      setCvdData(cvdResults);
      setLastUpdate(new Date());

    } catch (err: any) {
      console.error('Error fetching CVD data:', err);
      setError(err.message || 'Failed to fetch data');
      
      const mockData = Array.from({ length: 100 }, (_, i) => {
        const now = Date.now();
        const timestamp = now - (100 - i) * 3600000;
        const price = 45000 + Math.sin(i / 10) * 2000 + Math.random() * 500;
        const volume = Math.random() * 1000 + 500;
        const delta = (Math.random() - 0.5) * volume;
        
        return {
          timestamp,
          cvd: 0,
          delta,
          upVolume: delta > 0 ? delta : 0,
          downVolume: delta < 0 ? -delta : 0,
          price
        };
      });

      let cvd = 0;
      mockData.forEach(d => {
        cvd += d.delta;
        d.cvd = cvd;
      });

      setCvdData(mockData);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVDData();
  }, [symbol, timeframe, cumulative]);

  const chartData = useMemo(() => {
    return cvdData.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cvd: d.cvd,
      delta: d.delta,
      price: d.price
    }));
  }, [cvdData]);

  const currentCVD = cvdData[cvdData.length - 1]?.cvd || 0;
  const cvdTrend = currentCVD > 0 ? 'bullish' : 'bearish';

  // Chart Content
  const ChartContent = () => (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fontSize: 9 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fontSize: 9 }}
            width={50}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))" 
            tick={{ fontSize: 9 }}
            width={50}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
          
          <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          
          <Bar 
            yAxisId="left"
            dataKey="delta" 
            name="Delta"
            opacity={0.6}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.delta > 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
          
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="cvd" 
            stroke="#00ff00" 
            strokeWidth={2}
            dot={false}
            name="CVD"
          />
          
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="price" 
            stroke="#fbbf24" 
            strokeWidth={1}
            dot={false}
            name="Price"
            opacity={0.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  // Stats Content
  const StatsContent = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-2 rounded border ${cvdTrend === 'bullish' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <div className="text-[10px] text-muted-foreground">CVD</div>
          <div className={`text-lg font-bold ${cvdTrend === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
            {(currentCVD / 1000).toFixed(1)}K
          </div>
        </div>
        <div className="p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground">Trend</div>
          <div className="flex items-center gap-1">
            {cvdTrend === 'bullish' ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-bold ${cvdTrend === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
              {cvdTrend.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground">Mode</div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{cumulative ? 'Cumulative' : 'Delta'}</span>
            <Switch
              checked={cumulative}
              onCheckedChange={setCumulative}
              className="scale-75"
            />
          </div>
        </div>
        <div className="p-2 rounded border border-border">
          <div className="text-[10px] text-muted-foreground">Data Points</div>
          <div className="text-lg font-bold text-foreground">{cvdData.length}</div>
        </div>
      </div>

      {/* Exchange Settings */}
      <div className="p-2 border border-border rounded">
        <h4 className="text-xs font-bold text-amber-400 mb-2">Multi-Exchange Settings</h4>
        <div className="space-y-1">
          {exchanges.map((ex, i) => (
            <div key={i} className="flex items-center gap-2">
              <Switch
                checked={ex.enabled}
                onCheckedChange={(checked) => {
                  const newExchanges = [...exchanges];
                  newExchanges[i].enabled = checked;
                  setExchanges(newExchanges);
                }}
                className="scale-50"
              />
              <span className="text-[10px] text-muted-foreground w-28 truncate">{ex.symbol}</span>
              <Input
                type="number"
                value={ex.weight}
                onChange={(e) => {
                  const newExchanges = [...exchanges];
                  newExchanges[i].weight = parseInt(e.target.value) || 0;
                  setExchanges(newExchanges);
                }}
                className="w-12 h-5 text-[10px] px-1"
                disabled={!ex.enabled}
              />
              <span className="text-[10px] text-muted-foreground">%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <COTStyleWrapper
      title="CVD - Cumulative Volume Delta"
      icon="📊"
      lastUpdate={lastUpdate}
      selectOptions={[
        { value: 'BTCUSDT', label: 'BTC/USDT' },
        { value: 'ETHUSDT', label: 'ETH/USDT' },
        { value: 'BNBUSDT', label: 'BNB/USDT' },
        { value: 'SOLUSDT', label: 'SOL/USDT' }
      ]}
      selectedValue={symbol}
      onSelectChange={setSymbol}
      onRefresh={fetchCVDData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'chart',
          label: 'Chart',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <ChartContent />
        },
        {
          id: 'stats',
          label: 'Settings',
          icon: <Settings className="w-3 h-3" />,
          content: <StatsContent />
        }
      ]}
      footerLeft={`Timeframe: ${timeframe}`}
      footerStats={[
        { label: 'CVD', value: `${(currentCVD / 1000).toFixed(1)}K` },
        { label: 'Trend', value: cvdTrend.toUpperCase() }
      ]}
    />
  );
};

export default CVDChart;
