import React from 'react';
import { Activity } from 'lucide-react';

const TradingVolume = () => {
  const volumeData = [
    { symbol: 'SPY', volume: '89.5M', avgVol: '67.2M', ratio: 1.33 },
    { symbol: 'QQQ', volume: '45.7M', avgVol: '39.8M', ratio: 1.15 },
    { symbol: 'IWM', volume: '23.4M', avgVol: '28.9M', ratio: 0.81 },
    { symbol: 'AAPL', volume: '67.8M', avgVol: '54.3M', ratio: 1.25 },
    { symbol: 'TSLA', volume: '156.7M', avgVol: '89.4M', ratio: 1.75 },
    { symbol: 'NVDA', volume: '234.5M', avgVol: '178.9M', ratio: 1.31 },
  ];

  const getVolumeColor = (ratio: number) => {
    if (ratio > 1.5) return 'text-terminal-red';
    if (ratio > 1.2) return 'text-terminal-amber';
    if (ratio > 0.8) return 'text-terminal-green';
    return 'text-terminal-gray';
  };

  return (
    <div className="terminal-panel text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      <div className="panel-header flex items-center gap-2 text-[0.5rem] xs:text-[0.6rem] sm:text-[0.7rem] md:text-sm lg:text-base xl:text-lg">
        <Activity className="h-2 w-2 sm:h-3 sm:w-3" />
        VOLUME ANALYSIS
      </div>
      <div className="panel-content">
        <div className="grid grid-cols-4 gap-1 text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm mb-2 text-terminal-amber">
          <div>SYMBOL</div>
          <div className="text-right">VOLUME</div>
          <div className="text-right">AVG</div>
          <div className="text-right">RATIO</div>
        </div>
        
        {volumeData.map((item, index) => (
          <div key={index} className="grid grid-cols-4 gap-1 text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm py-1 border-b border-border/20">
            <div className="text-terminal-white">{item.symbol}</div>
            <div className="text-terminal-cyan text-right">{item.volume}</div>
            <div className="text-terminal-gray text-right">{item.avgVol}</div>
            <div className={`text-right ${getVolumeColor(item.ratio)}`}>
              {item.ratio.toFixed(2)}x
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradingVolume;