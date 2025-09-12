import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';

interface TradingViewChartProps {
  symbol?: string;
  title?: string;
}

const TradingViewChart = ({ 
  symbol = "NASDAQ:AAPL", 
  title = "TRADING VIEW" 
}: TradingViewChartProps) => {
  const openTradingView = () => {
    window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank');
  };

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header border-b border-border pb-2 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-terminal-green font-bold text-sm">{title} - {symbol}</h3>
            <p className="text-terminal-gray text-xs">Live trading charts and analysis</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={openTradingView}
            className="h-6 px-2 text-xs hover:bg-accent"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            New Tab
          </Button>
        </div>
      </div>
      
      <div className="h-full flex flex-col">
        <iframe
          src={`https://www.tradingview.com/chart/?symbol=${symbol}`}
          className="flex-1 w-full border border-border rounded bg-background"
          title="TradingView Chart"
          allow="fullscreen"
        />
        <div className="mt-2 text-xs text-terminal-cyan">
          📈 Live charts • 📊 Technical analysis • 💹 Real-time data
        </div>
      </div>
    </div>
  );
};

export default TradingViewChart;