import { useState } from 'react';
import { Grid3x3, Table, BarChart3 } from 'lucide-react';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';

const HeatMap = () => {
  const [lastUpdate] = useState(new Date());
  const [sector, setSector] = useState('all');
  
  const heatmapData = [
    { symbol: 'AAPL', change: 2.45, size: 'large', sector: 'tech' },
    { symbol: 'MSFT', change: 1.23, size: 'large', sector: 'tech' },
    { symbol: 'GOOGL', change: -0.89, size: 'medium', sector: 'tech' },
    { symbol: 'AMZN', change: 3.67, size: 'large', sector: 'consumer' },
    { symbol: 'TSLA', change: -4.23, size: 'medium', sector: 'auto' },
    { symbol: 'META', change: 1.89, size: 'medium', sector: 'tech' },
    { symbol: 'NVDA', change: 5.67, size: 'small', sector: 'tech' },
    { symbol: 'NFLX', change: -2.34, size: 'small', sector: 'media' },
    { symbol: 'CRM', change: 0.45, size: 'small', sector: 'tech' },
  ];

  const filteredData = sector === 'all' 
    ? heatmapData 
    : heatmapData.filter(d => d.sector === sector);

  const gainers = heatmapData.filter(d => d.change > 0).length;
  const losers = heatmapData.filter(d => d.change < 0).length;

  const getHeatmapColor = (change: number) => {
    if (change > 3) return 'bg-emerald-500/80 text-black';
    if (change > 1) return 'bg-emerald-500/50 text-white';
    if (change > 0) return 'bg-emerald-500/20 text-emerald-400';
    if (change > -1) return 'bg-red-500/20 text-red-400';
    if (change > -3) return 'bg-red-500/50 text-white';
    return 'bg-red-500/80 text-white';
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'large': return 'col-span-2 row-span-2';
      case 'medium': return 'col-span-2';
      default: return '';
    }
  };

  const HeatmapContent = () => (
    <div className="grid grid-cols-4 gap-1 h-full">
      {filteredData.map((item, index) => (
        <div
          key={index}
          className={`
            ${getSizeClass(item.size)}
            ${getHeatmapColor(item.change)}
            rounded border border-border/30
            flex flex-col justify-center items-center
            text-xs font-mono transition-all duration-200
            hover:scale-95 cursor-pointer min-h-[60px]
          `}
        >
          <div className="font-semibold">{item.symbol}</div>
          <div className="text-xs">
            {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );

  const TableContent = () => (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2 text-xs mb-2 text-amber-400 border-b border-green-500/30 pb-2 sticky top-0 bg-background">
        <div>SYMBOL</div>
        <div className="text-center">SECTOR</div>
        <div className="text-right">CHANGE</div>
      </div>
      
      {filteredData.map((item, index) => (
        <div 
          key={index} 
          className="grid grid-cols-3 gap-2 text-xs py-1.5 border-b border-border/10 hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="text-foreground font-medium">{item.symbol}</div>
          <div className="text-center">
            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 uppercase">
              {item.sector}
            </span>
          </div>
          <div className={`text-right font-bold ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <COTStyleWrapper
      title="MARKET HEATMAP"
      icon="🔥"
      lastUpdate={lastUpdate}
      selectOptions={[
        { value: 'all', label: '🌐 All Sectors' },
        { value: 'tech', label: '💻 Technology' },
        { value: 'consumer', label: '🛒 Consumer' },
        { value: 'auto', label: '🚗 Auto' },
        { value: 'media', label: '📺 Media' },
      ]}
      selectedValue={sector}
      onSelectChange={setSector}
      onRefresh={() => {}}
      tabs={[
        {
          id: 'heatmap',
          label: 'Heatmap',
          icon: <Grid3x3 className="w-3 h-3" />,
          content: <HeatmapContent />
        },
        {
          id: 'table',
          label: 'Table',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        }
      ]}
      footerLeft={`Total: ${filteredData.length} stocks`}
      footerStats={[
        { label: '📈 Gainers', value: gainers },
        { label: '📉 Losers', value: losers }
      ]}
      footerRight={lastUpdate.toLocaleDateString()}
    />
  );
};

export default HeatMap;
