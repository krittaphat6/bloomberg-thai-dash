import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';

interface TradingViewChartProps {
  symbol?: string;
  title?: string;
  interval?: string;
  height?: number;
}

const TradingViewChart = ({ 
  symbol = "NASDAQ:AAPL", 
  title = "TRADING VIEW", 
  interval = "1m",
  height = 300 
}: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      gridColor: "rgba(0, 255, 0, 0.1)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: "tradingview_chart"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, interval]);

  const openTradingView = () => {
    window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank');
  };

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header flex justify-between items-center">
        <span>{title} - {symbol}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={openTradingView}
          className="h-6 px-2 text-xs hover:bg-accent"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Login
        </Button>
      </div>
      <div className="panel-content p-0">
        <div 
          ref={containerRef}
          style={{ height: `${height}px` }}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default TradingViewChart;