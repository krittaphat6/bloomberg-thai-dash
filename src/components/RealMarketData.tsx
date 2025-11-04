import { useEffect, useState } from 'react';
import { dataPipelineService, MarketQuote } from '@/services/DataPipelineService';
import { DEFAULT_SYMBOLS } from '@/config/DataSourceConfig';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

const RealMarketData = () => {
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time updates from Supabase
  useEffect(() => {
    const channel = supabase
      .channel('market-data-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_data'
        },
        (payload) => {
          const newQuote = payload.new as any;
          setMarketData(prev => {
            const updated = prev.filter(q => q.symbol !== newQuote.symbol);
            return [...updated, {
              symbol: newQuote.symbol,
              price: parseFloat(newQuote.price),
              change: parseFloat(newQuote.change),
              changePercent: parseFloat(newQuote.change_percent),
              volume: newQuote.volume,
              high: parseFloat(newQuote.high),
              low: parseFloat(newQuote.low),
              open: parseFloat(newQuote.open),
              bid: newQuote.bid ? parseFloat(newQuote.bid) : undefined,
              ask: newQuote.ask ? parseFloat(newQuote.ask) : undefined,
              timestamp: new Date(newQuote.timestamp),
              source: newQuote.source
            }];
          });
          setLastUpdate(new Date());
          setIsRealtime(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const data = await dataPipelineService.fetchMarketData(DEFAULT_SYMBOLS);
      setMarketData(data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError('Failed to fetch data. Using cached data.');
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => price.toFixed(2);
  const formatChange = (change: number) => (change > 0 ? '+' : '') + change.toFixed(2);
  const formatPercent = (percent: number) => (percent > 0 ? '+' : '') + percent.toFixed(2) + '%';
  const getChangeColor = (change: number) => 
    change > 0 ? 'text-terminal-green' : change < 0 ? 'text-terminal-red' : 'text-terminal-amber';

  if (loading) {
    return (
      <div className="terminal-panel h-full">
        <div className="panel-header">REAL-TIME MARKET DATA</div>
        <div className="panel-content flex items-center justify-center">
          <div className="text-terminal-amber">Loading market data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header flex justify-between items-center">
        <span>REAL-TIME MARKET DATA</span>
        <div className="flex items-center gap-2 text-xs">
          {isRealtime ? (
            <Wifi className="w-3 h-3 text-terminal-green" />
          ) : (
            <WifiOff className="w-3 h-3 text-terminal-amber" />
          )}
          <button 
            onClick={fetchData}
            className="hover:text-terminal-green transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          {lastUpdate && (
            <span className="text-terminal-cyan">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      <div className="panel-content">
        {error && (
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 p-2 mb-2 text-xs text-terminal-amber">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-terminal-amber mb-2 pb-1 border-b border-terminal-amber/30">
          <div>SYMBOL</div>
          <div className="text-right">PRICE</div>
          <div className="text-right">CHANGE</div>
          <div className="text-right">%</div>
          <div className="text-right">VOLUME</div>
        </div>

        {marketData.length === 0 ? (
          <div className="text-center py-4 text-terminal-amber">
            No market data available. Please configure API keys.
          </div>
        ) : (
          marketData.map((quote) => (
            <div 
              key={quote.symbol} 
              className="grid grid-cols-5 gap-2 text-xs py-1 border-b border-border/20 hover:bg-terminal-amber/5 transition-colors"
            >
              <div className="text-terminal-white font-semibold">{quote.symbol}</div>
              <div className="text-right text-terminal-cyan">${formatPrice(quote.price)}</div>
              <div className={`text-right ${getChangeColor(quote.change)}`}>
                {formatChange(quote.change)}
              </div>
              <div className={`text-right ${getChangeColor(quote.changePercent)}`}>
                {formatPercent(quote.changePercent)}
              </div>
              <div className="text-right text-terminal-gray">
                {(quote.volume / 1000000).toFixed(2)}M
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RealMarketData;
