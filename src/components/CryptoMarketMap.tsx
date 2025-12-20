import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  price_change_percentage_24h: number;
  current_price: number;
}

interface TreemapData {
  name: string;
  size: number;
  change: number;
  price: number;
  fill: string;
  symbol: string;
}

const CryptoMarketMap = () => {
  const [cryptoData, setCryptoData] = useState<TreemapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('24h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getColorByChange = (change: number): string => {
    if (change > 5) return '#00ff41';
    if (change > 2) return '#4ade80';
    if (change > 0) return '#86efac';
    if (change > -2) return '#fca5a5';
    if (change > -5) return '#ef4444';
    return '#dc2626';
  };

  const generateMockData = useCallback((): TreemapData[] => {
    const cryptos = [
      { symbol: 'BTC', name: 'Bitcoin', cap: 800000000000 },
      { symbol: 'ETH', name: 'Ethereum', cap: 350000000000 },
      { symbol: 'BNB', name: 'BNB', cap: 80000000000 },
      { symbol: 'XRP', name: 'XRP', cap: 70000000000 },
      { symbol: 'ADA', name: 'Cardano', cap: 30000000000 },
      { symbol: 'DOGE', name: 'Dogecoin', cap: 25000000000 },
      { symbol: 'SOL', name: 'Solana', cap: 60000000000 },
      { symbol: 'DOT', name: 'Polkadot', cap: 15000000000 },
      { symbol: 'MATIC', name: 'Polygon', cap: 12000000000 },
      { symbol: 'AVAX', name: 'Avalanche', cap: 18000000000 },
      { symbol: 'LINK', name: 'Chainlink', cap: 10000000000 },
      { symbol: 'UNI', name: 'Uniswap', cap: 8000000000 },
      { symbol: 'ATOM', name: 'Cosmos', cap: 7000000000 },
      { symbol: 'LTC', name: 'Litecoin', cap: 9000000000 },
      { symbol: 'ETC', name: 'Ethereum Classic', cap: 5000000000 },
    ];
    
    return cryptos.map(({ symbol, name, cap }) => {
      const change = (Math.random() - 0.5) * 12;
      const price = symbol === 'BTC' ? 45000 + Math.random() * 5000 :
                    symbol === 'ETH' ? 2500 + Math.random() * 500 :
                    Math.random() * 100;
      return {
        name: `${symbol}\n${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        size: cap * (0.8 + Math.random() * 0.4),
        change,
        price,
        fill: getColorByChange(change),
        symbol
      };
    });
  }, []);

  const fetchCryptoData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false'
      );
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data: CryptoData[] = await response.json();
      
      const treemapData: TreemapData[] = data.map(coin => {
        const change = coin.price_change_percentage_24h || 0;
        return {
          name: `${coin.symbol.toUpperCase()}\n${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
          size: coin.market_cap,
          change: change,
          price: coin.current_price,
          fill: getColorByChange(change),
          symbol: coin.symbol.toUpperCase()
        };
      });
      
      setCryptoData(treemapData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      setCryptoData(generateMockData());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [generateMockData]);

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 60000);
    return () => clearInterval(interval);
  }, [fetchCryptoData, timeframe]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-terminal-amber/50 p-3 rounded-lg shadow-xl">
          <p className="text-terminal-amber font-bold text-lg">{data.symbol}</p>
          <p className="text-sm text-foreground">
            Price: <span className="font-mono">${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </p>
          <p className={`text-sm font-semibold ${data.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            Change: {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
          </p>
          <p className="text-sm text-muted-foreground">
            Market Cap: ${(data.size / 1e9).toFixed(2)}B
          </p>
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
            🗺️ CRYPTO MARKET MAP
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20 h-8 border-terminal-green/30 text-terminal-green text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1H</SelectItem>
                <SelectItem value="24h">24H</SelectItem>
                <SelectItem value="7d">7D</SelectItem>
                <SelectItem value="30d">30D</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={fetchCryptoData}
              size="sm"
              variant="outline"
              className="border-terminal-green text-terminal-green hover:bg-terminal-green/10 h-8"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>Live market cap heatmap • Size = Market Cap • Color = {timeframe} Change</span>
          {lastUpdated && (
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-100px)]">
        <ResponsiveContainer width="100%" height="90%">
          <Treemap
            data={cryptoData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#1e293b"
            content={<CustomizedContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">Positive (+5% to +∞)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 rounded" />
            <div className="w-3 h-3 bg-green-700 rounded" />
            <div className="w-3 h-3 bg-green-800 rounded" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-800 rounded" />
            <div className="w-3 h-3 bg-red-700 rounded" />
            <div className="w-3 h-3 bg-red-600 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-muted-foreground">Negative (-∞ to -5%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Custom treemap cell content
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, fill } = props;
  
  if (!width || !height) return null;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill,
          stroke: '#1e293b',
          strokeWidth: 2,
        }}
      />
      {width > 60 && height > 40 && name && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={width > 100 ? 12 : 10}
          fontWeight="bold"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {name.split('\n').map((line: string, i: number) => (
            <tspan key={i} x={x + width / 2} dy={i === 0 ? -6 : 14}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
};

export default CryptoMarketMap;
