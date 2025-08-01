import React from 'react';
import { BarChart3 } from 'lucide-react';

const MarketDepth = () => {
  const bids = [
    { price: 5829.25, size: 125, total: 125 },
    { price: 5829.00, size: 89, total: 214 },
    { price: 5828.75, size: 156, total: 370 },
    { price: 5828.50, size: 234, total: 604 },
    { price: 5828.25, size: 187, total: 791 },
  ];

  const asks = [
    { price: 5829.50, size: 98, total: 98 },
    { price: 5829.75, size: 145, total: 243 },
    { price: 5830.00, size: 203, total: 446 },
    { price: 5830.25, size: 167, total: 613 },
    { price: 5830.50, size: 289, total: 902 },
  ];

  return (
    <div className="terminal-panel">
      <div className="panel-header flex items-center gap-2">
        <BarChart3 className="h-3 w-3" />
        SPX MARKET DEPTH
      </div>
      <div className="panel-content">
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <div className="text-terminal-amber">PRICE</div>
          <div className="text-terminal-amber text-center">SIZE</div>
          <div className="text-terminal-amber text-right">TOTAL</div>
        </div>
        
        {/* Asks */}
        {asks.reverse().map((ask, index) => (
          <div key={index} className="grid grid-cols-3 gap-2 text-xs py-1">
            <div className="text-terminal-red">{ask.price.toFixed(2)}</div>
            <div className="text-terminal-white text-center">{ask.size}</div>
            <div className="text-terminal-gray text-right">{ask.total}</div>
          </div>
        ))}
        
        <div className="border-t border-terminal-amber my-2"></div>
        
        {/* Bids */}
        {bids.map((bid, index) => (
          <div key={index} className="grid grid-cols-3 gap-2 text-xs py-1">
            <div className="text-terminal-green">{bid.price.toFixed(2)}</div>
            <div className="text-terminal-white text-center">{bid.size}</div>
            <div className="text-terminal-gray text-right">{bid.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketDepth;