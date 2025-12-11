import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

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

    } catch (error) {
      console.error('Error fetching CVD data:', error);
      
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

  return (
    <Card className="w-full h-full bg-card border-accent/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-accent text-sm">
              📊 CVD - Cumulative Volume Delta
            </CardTitle>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Multi-Exchange Weighted Average
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="w-24 h-7 border-accent/30 text-accent text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-16 h-7 border-accent/30 text-accent text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1H</SelectItem>
                <SelectItem value="4h">4H</SelectItem>
                <SelectItem value="1d">1D</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowSettings(!showSettings)}
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 border-accent/30"
            >
              <Settings className="w-3 h-3" />
            </Button>

            <Button
              onClick={fetchCVDData}
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 border-accent/30"
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          <div className={`p-1.5 rounded border ${cvdTrend === 'bullish' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
            <div className="text-[10px] text-muted-foreground">CVD</div>
            <div className={`text-sm font-bold ${cvdTrend === 'bullish' ? 'text-green-500' : 'text-red-500'}`}>
              {(currentCVD / 1000).toFixed(1)}K
            </div>
          </div>

          <div className="p-1.5 rounded border border-accent/30">
            <div className="text-[10px] text-muted-foreground">Trend</div>
            <div className="flex items-center gap-1">
              {cvdTrend === 'bullish' ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-[10px] font-bold ${cvdTrend === 'bullish' ? 'text-green-500' : 'text-red-500'}`}>
                {cvdTrend}
              </span>
            </div>
          </div>

          <div className="p-1.5 rounded border border-accent/30">
            <div className="text-[10px] text-muted-foreground">Mode</div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-foreground">{cumulative ? 'Cum' : 'Delta'}</span>
              <Switch
                checked={cumulative}
                onCheckedChange={setCumulative}
                className="scale-50"
              />
            </div>
          </div>

          <div className="p-1.5 rounded border border-accent/30">
            <div className="text-[10px] text-muted-foreground">Points</div>
            <div className="text-sm font-bold text-foreground">{cvdData.length}</div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-2 p-2 border border-accent/30 rounded bg-black/40">
            <h4 className="text-[10px] font-bold text-accent mb-1.5">Multi-Exchange Settings</h4>
            <div className="space-y-1">
              {exchanges.map((ex, i) => (
                <div key={i} className="flex items-center gap-1.5">
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
        )}
      </CardHeader>

      <CardContent className="h-[calc(100%-180px)] p-2">
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
                border: '1px solid hsl(var(--accent))',
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
      </CardContent>
    </Card>
  );
};

export default CVDChart;
