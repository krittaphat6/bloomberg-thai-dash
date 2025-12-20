import React from 'react';
import { Grid3x3 } from 'lucide-react';

const HeatMap = () => {
  const heatmapData = [
    { symbol: 'AAPL', change: 2.45, size: 'large' },
    { symbol: 'MSFT', change: 1.23, size: 'large' },
    { symbol: 'GOOGL', change: -0.89, size: 'medium' },
    { symbol: 'AMZN', change: 3.67, size: 'large' },
    { symbol: 'TSLA', change: -4.23, size: 'medium' },
    { symbol: 'META', change: 1.89, size: 'medium' },
    { symbol: 'NVDA', change: 5.67, size: 'small' },
    { symbol: 'NFLX', change: -2.34, size: 'small' },
    { symbol: 'CRM', change: 0.45, size: 'small' },
  ];

  const getHeatmapColor = (change: number) => {
    if (change > 3) return 'bg-terminal-green/80 text-black';
    if (change > 1) return 'bg-terminal-green/50 text-white';
    if (change > 0) return 'bg-terminal-green/20 text-terminal-green';
    if (change > -1) return 'bg-terminal-red/20 text-terminal-red';
    if (change > -3) return 'bg-terminal-red/50 text-white';
    return 'bg-terminal-red/80 text-white';
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'large': return 'col-span-2 row-span-2';
      case 'medium': return 'col-span-2';
      default: return '';
    }
  };

  return (
    <div className="terminal-panel">
      <div className="panel-header flex items-center gap-2">
        <Grid3x3 className="h-3 w-3" />
        MARKET HEATMAP
      </div>
      <div className="panel-content p-2">
        <div className="grid grid-cols-4 gap-1 h-full">
          {heatmapData.map((item, index) => (
            <div
              key={index}
              className={`
                ${getSizeClass(item.size)}
                ${getHeatmapColor(item.change)}
                rounded border border-border/30
                flex flex-col justify-center items-center
                text-xs font-mono transition-all duration-200
                hover:scale-95 cursor-pointer
              `}
            >
              <div className="font-semibold">{item.symbol}</div>
              <div className="text-xs">
                {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeatMap;