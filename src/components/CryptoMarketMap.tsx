import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Map, Table } from 'lucide-react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
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
    } catch (err: any) {
      console.error('Error fetching crypto data:', err);
      setError(err.message || 'Failed to fetch data');
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
        <div className="bg-card border border-border p-2 rounded-lg shadow-xl text-xs">
          <p className="text-amber-400 font-bold">{data.symbol}</p>
          <p className="text-foreground">
            Price: <span className="font-mono">${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </p>
          <p className={`font-semibold ${data.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            Change: {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
          </p>
          <p className="text-muted-foreground">
            Market Cap: ${(data.size / 1e9).toFixed(2)}B
          </p>
        </div>
      );
    }
    return null;
  };

  const gainers = cryptoData.filter(c => c.change > 0).sort((a, b) => b.change - a.change);
  const losers = cryptoData.filter(c => c.change < 0).sort((a, b) => a.change - b.change);

  // Map Content
  const MapContent = () => (
    <div className="h-full">
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
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-500" />
          <span className="text-muted-foreground">Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-600 rounded" />
          <div className="w-2 h-2 bg-green-700 rounded" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-700 rounded" />
          <div className="w-2 h-2 bg-red-600 rounded" />
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-red-500" />
          <span className="text-muted-foreground">Negative</span>
        </div>
      </div>
    </div>
  );

  // Table Content
  const TableContent = () => (
    <ScrollArea className="h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background border-b border-green-500/30">
          <tr className="text-amber-400">
            <th className="text-left py-1 px-2">Symbol</th>
            <th className="text-right py-1 px-2">Price</th>
            <th className="text-right py-1 px-2">Change</th>
            <th className="text-right py-1 px-2">Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {cryptoData.sort((a, b) => b.size - a.size).map((coin, index) => (
            <tr key={index} className="border-b border-border/10 hover:bg-accent/50">
              <td className="py-1 px-2 font-bold text-foreground">{coin.symbol}</td>
              <td className="py-1 px-2 text-right text-cyan-400">${coin.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              <td className={`py-1 px-2 text-right font-bold ${coin.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
              </td>
              <td className="py-1 px-2 text-right text-muted-foreground">${(coin.size / 1e9).toFixed(2)}B</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );

  return (
    <COTStyleWrapper
      title="CRYPTO MARKET MAP"
      icon="🗺️"
      lastUpdate={lastUpdated}
      selectOptions={[
        { value: '1h', label: '1H' },
        { value: '24h', label: '24H' },
        { value: '7d', label: '7D' },
        { value: '30d', label: '30D' }
      ]}
      selectedValue={timeframe}
      onSelectChange={setTimeframe}
      onRefresh={fetchCryptoData}
      loading={loading}
      error={error}
      onErrorDismiss={() => setError(null)}
      tabs={[
        {
          id: 'map',
          label: 'Heatmap',
          icon: <Map className="w-3 h-3" />,
          content: <MapContent />
        },
        {
          id: 'table',
          label: 'Table',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        }
      ]}
      footerLeft={`Total: ${cryptoData.length} coins`}
      footerStats={[
        { label: '📈 Gainers', value: gainers.length },
        { label: '📉 Losers', value: losers.length }
      ]}
    />
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
      {width > 50 && height > 35 && name && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={width > 80 ? 11 : 9}
          fontWeight="bold"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {name.split('\n').map((line: string, i: number) => (
            <tspan key={i} x={x + width / 2} dy={i === 0 ? -5 : 12}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
};

export default CryptoMarketMap;
