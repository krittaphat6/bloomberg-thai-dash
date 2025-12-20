import { useState } from 'react';
import { BarChart3, Table, Activity } from 'lucide-react';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MarketDepth = () => {
  const [lastUpdate] = useState(new Date());
  const [symbol, setSymbol] = useState('SPX');
  
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

  const totalBidSize = bids.reduce((sum, b) => sum + b.size, 0);
  const totalAskSize = asks.reduce((sum, a) => sum + a.size, 0);

  const TableContent = () => (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2 text-xs mb-2 text-amber-400 border-b border-green-500/30 pb-2 sticky top-0 bg-background">
        <div>PRICE</div>
        <div className="text-center">SIZE</div>
        <div className="text-right">TOTAL</div>
      </div>
      
      {/* Asks (reversed to show highest first) */}
      {[...asks].reverse().map((ask, index) => (
        <div key={`ask-${index}`} className="grid grid-cols-3 gap-2 text-xs py-1.5 hover:bg-accent/50 transition-colors">
          <div className="text-red-400 font-medium">{ask.price.toFixed(2)}</div>
          <div className="text-foreground text-center">{ask.size}</div>
          <div className="text-muted-foreground text-right">{ask.total}</div>
        </div>
      ))}
      
      <div className="border-t border-amber-400/50 my-2 py-1 text-center text-xs text-amber-400 font-bold">
        SPREAD: {(asks[0].price - bids[0].price).toFixed(2)}
      </div>
      
      {/* Bids */}
      {bids.map((bid, index) => (
        <div key={`bid-${index}`} className="grid grid-cols-3 gap-2 text-xs py-1.5 hover:bg-accent/50 transition-colors">
          <div className="text-emerald-400 font-medium">{bid.price.toFixed(2)}</div>
          <div className="text-foreground text-center">{bid.size}</div>
          <div className="text-muted-foreground text-right">{bid.total}</div>
        </div>
      ))}
    </div>
  );

  const ChartContent = () => {
    const chartData = [
      ...bids.map(b => ({ price: b.price.toFixed(2), size: b.size, type: 'bid' })),
      ...asks.map(a => ({ price: a.price.toFixed(2), size: a.size, type: 'ask' })),
    ].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    return (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="price" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px',
                fontSize: '11px'
              }}
            />
            <Bar dataKey="size" name="Size">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'bid' ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <COTStyleWrapper
      title="MARKET DEPTH"
      icon="📊"
      lastUpdate={lastUpdate}
      selectOptions={[
        { value: 'SPX', label: '📈 SPX' },
        { value: 'NDX', label: '📈 NDX' },
        { value: 'DJI', label: '📈 DJI' },
      ]}
      selectedValue={symbol}
      onSelectChange={setSymbol}
      onRefresh={() => {}}
      tabs={[
        {
          id: 'table',
          label: 'Book',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        },
        {
          id: 'chart',
          label: 'Chart',
          icon: <Activity className="w-3 h-3" />,
          content: <ChartContent />
        }
      ]}
      footerLeft={`${symbol} Market Depth`}
      footerStats={[
        { label: '🟢 Bid Size', value: totalBidSize },
        { label: '🔴 Ask Size', value: totalAskSize },
        { label: 'Ratio', value: (totalBidSize / totalAskSize).toFixed(2) }
      ]}
      footerRight={lastUpdate.toLocaleTimeString()}
    />
  );
};

export default MarketDepth;
