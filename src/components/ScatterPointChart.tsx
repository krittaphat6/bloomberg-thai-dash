import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Plus, X, Info } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface ScatterPoint {
  x: number;
  y: number;
  symbol: string;
}

interface SymbolConfig {
  symbol: string;
  color: string;
}

const DEFAULT_SYMBOLS: SymbolConfig[] = [
  { symbol: 'AAPL', color: '#3b82f6' },
  { symbol: 'MSFT', color: '#10b981' },
  { symbol: 'GOOGL', color: '#f59e0b' },
  { symbol: 'TSLA', color: '#ef4444' },
  { symbol: 'NVDA', color: '#8b5cf6' },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const ScatterPointChart = () => {
  const [symbols, setSymbols] = useState<SymbolConfig[]>(DEFAULT_SYMBOLS);
  const [newSymbol, setNewSymbol] = useState('');
  const [scatterData, setScatterData] = useState<Record<string, ScatterPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState(20);

  const calculateRSMetrics = useCallback((prices: number[], benchmarkPrices: number[], len: number): { rsRatio: number; rsMomentum: number } => {
    if (prices.length < len || benchmarkPrices.length < len) {
      return { rsRatio: 100, rsMomentum: 100 };
    }

    const wma = (data: number[], period: number): number => {
      const slice = data.slice(-period);
      const weights = Array.from({ length: slice.length }, (_, i) => i + 1);
      const weightSum = weights.reduce((a, b) => a + b, 0);
      return slice.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum;
    };

    // Calculate RS array
    const rsArray: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (benchmarkPrices[i] && prices[0] && benchmarkPrices[0]) {
        const rs = (prices[i] / prices[0]) / (benchmarkPrices[i] / benchmarkPrices[0]);
        rsArray.push(rs);
      }
    }

    if (rsArray.length < len) {
      return { rsRatio: 100, rsMomentum: 100 };
    }

    const currentRS = rsArray[rsArray.length - 1];
    const rsWMA = wma(rsArray, len);
    const rsRatio = (currentRS / rsWMA) * 100;

    // Calculate RS-Ratio array for momentum
    const rsRatioArray: number[] = [];
    for (let i = len - 1; i < rsArray.length; i++) {
      const slice = rsArray.slice(0, i + 1);
      const ratio = (slice[slice.length - 1] / wma(slice, Math.min(len, slice.length))) * 100;
      rsRatioArray.push(ratio);
    }

    const rsMomentum = rsRatioArray.length >= 2 
      ? (rsRatioArray[rsRatioArray.length - 1] / wma(rsRatioArray, Math.min(len, rsRatioArray.length))) * 100
      : 100;

    return { rsRatio, rsMomentum };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch SPY as benchmark using proxy
      let benchmarkPrices: number[] = [];
      try {
        const { data, error } = await supabase.functions.invoke('market-data-proxy', {
          body: { source: 'yahoo', symbols: ['SPY'], range: '3mo', interval: '1d' }
        });
        if (!error && data?.yahoo?.SPY) {
          benchmarkPrices = data.yahoo.SPY.quotes?.close?.filter((p: any) => p != null) || [];
        }
      } catch {
        benchmarkPrices = Array.from({ length: 60 }, (_, i) => 450 + Math.sin(i * 0.1) * 20 + Math.random() * 10);
      }

      if (benchmarkPrices.length === 0) {
        benchmarkPrices = Array.from({ length: 60 }, (_, i) => 450 + Math.sin(i * 0.1) * 20 + Math.random() * 10);
      }

      const newScatterData: Record<string, ScatterPoint[]> = {};

      // Fetch all symbols via proxy
      const symbolNames = symbols.map(s => s.symbol);
      const { data: proxyData, error } = await supabase.functions.invoke('market-data-proxy', {
        body: { source: 'yahoo', symbols: symbolNames, range: '3mo', interval: '1d' }
      });

      for (const { symbol } of symbols) {
        try {
          let prices: number[] = [];
          
          if (!error && proxyData?.yahoo?.[symbol]) {
            prices = proxyData.yahoo[symbol].quotes?.close?.filter((p: any) => p != null) || [];
          }

          if (prices.length > length) {
            // Create trail of points (last 10 data points)
            const trail: ScatterPoint[] = [];
            for (let i = Math.max(length, prices.length - 10); i <= prices.length; i++) {
              const m = calculateRSMetrics(prices.slice(0, i), benchmarkPrices.slice(0, i), length);
              trail.push({
                x: m.rsRatio - 100,
                y: m.rsMomentum - 100,
                symbol
              });
            }
            newScatterData[symbol] = trail;
          } else {
            // Mock data if not enough history
            const mockX = (Math.random() - 0.5) * 30;
            const mockY = (Math.random() - 0.5) * 30;
            newScatterData[symbol] = [{ x: mockX, y: mockY, symbol }];
          }
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error);
          const mockX = (Math.random() - 0.5) * 30;
          const mockY = (Math.random() - 0.5) * 30;
          newScatterData[symbol] = [{ x: mockX, y: mockY, symbol }];
        }
      }

      setScatterData(newScatterData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [symbols, length, calculateRSMetrics]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addSymbol = () => {
    const upperSymbol = newSymbol.toUpperCase().trim();
    if (upperSymbol && !symbols.find(s => s.symbol === upperSymbol)) {
      setSymbols([...symbols, { 
        symbol: upperSymbol, 
        color: COLORS[symbols.length % COLORS.length] 
      }]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s.symbol !== symbol));
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const quadrant = data.x >= 0 && data.y >= 0 ? 'Leading' :
                       data.x < 0 && data.y >= 0 ? 'Improving' :
                       data.x < 0 && data.y < 0 ? 'Lagging' : 'Weakening';
      return (
        <div className="bg-black/90 border border-terminal-amber/50 p-3 rounded-lg shadow-xl">
          <p className="text-terminal-amber font-bold">{data.symbol}</p>
          <p className="text-sm text-foreground">RS-Ratio: <span className="font-mono">{(data.x + 100).toFixed(2)}</span></p>
          <p className="text-sm text-foreground">RS-Momentum: <span className="font-mono">{(data.y + 100).toFixed(2)}</span></p>
          <p className="text-sm text-muted-foreground mt-1">Quadrant: <span className="font-semibold">{quadrant}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full h-full bg-card border-terminal-green/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            📍 SCATTER POINT - RS Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Length:</span>
              <Input
                type="number"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value) || 20)}
                className="w-16 h-7 text-xs border-terminal-green/30"
                min={5}
                max={100}
              />
            </div>
            <Button
              onClick={fetchData}
              size="sm"
              variant="outline"
              className="border-terminal-green text-terminal-green hover:bg-terminal-green/10 h-7"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Symbol Management */}
        <div className="flex items-center gap-2 mt-3">
          <Input
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
            placeholder="Add symbol (e.g., AMZN)..."
            className="h-7 text-xs border-terminal-green/30 flex-1"
          />
          <Button
            onClick={addSymbol}
            size="sm"
            variant="outline"
            className="border-terminal-green text-terminal-green h-7"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Symbol Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {symbols.map(({ symbol, color }) => (
            <div
              key={symbol}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
              style={{ borderColor: color, color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{symbol}</span>
              <button onClick={() => removeSymbol(symbol)} className="hover:opacity-70 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(100%-160px)]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              type="number" 
              dataKey="x" 
              domain={[-50, 50]}
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              label={{ value: 'RS-Ratio →', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              domain={[-50, 50]}
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              label={{ value: 'RS-Momentum ↑', angle: -90, position: 'left', offset: 10, fill: '#94a3b8', fontSize: 11 }}
            />
            
            {/* Quadrant areas */}
            <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="#22c55e" fillOpacity={0.1} />
            <ReferenceArea x1={-50} x2={0} y1={0} y2={50} fill="#3b82f6" fillOpacity={0.1} />
            <ReferenceArea x1={-50} x2={0} y1={-50} y2={0} fill="#ef4444" fillOpacity={0.1} />
            <ReferenceArea x1={0} x2={50} y1={-50} y2={0} fill="#f59e0b" fillOpacity={0.1} />
            
            {/* Quadrant lines */}
            <ReferenceLine x={0} stroke="#64748b" strokeWidth={2} />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
            
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            
            {symbols.map(({ symbol, color }) => (
              <Scatter
                key={symbol}
                name={symbol}
                data={scatterData[symbol] || []}
                fill={color}
                line={{ stroke: color, strokeWidth: 1.5, strokeOpacity: 0.6 }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        
        {/* Quadrant Labels */}
        <div className="absolute top-[60px] right-8 text-xs text-green-500 font-semibold opacity-70">LEADING</div>
        <div className="absolute top-[60px] left-12 text-xs text-blue-500 font-semibold opacity-70">IMPROVING</div>
        <div className="absolute bottom-[60px] left-12 text-xs text-red-500 font-semibold opacity-70">LAGGING</div>
        <div className="absolute bottom-[60px] right-8 text-xs text-amber-500 font-semibold opacity-70">WEAKENING</div>
      </CardContent>
    </Card>
  );
};

export default ScatterPointChart;
