import { useState } from 'react';
import { Activity, Table, BarChart3 } from 'lucide-react';
import COTStyleWrapper from '@/components/ui/COTStyleWrapper';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TradingVolume = () => {
  const [lastUpdate] = useState(new Date());
  
  const volumeData = [
    { symbol: 'SPY', volume: '89.5M', avgVol: '67.2M', ratio: 1.33, volumeNum: 89.5, avgNum: 67.2 },
    { symbol: 'QQQ', volume: '45.7M', avgVol: '39.8M', ratio: 1.15, volumeNum: 45.7, avgNum: 39.8 },
    { symbol: 'IWM', volume: '23.4M', avgVol: '28.9M', ratio: 0.81, volumeNum: 23.4, avgNum: 28.9 },
    { symbol: 'AAPL', volume: '67.8M', avgVol: '54.3M', ratio: 1.25, volumeNum: 67.8, avgNum: 54.3 },
    { symbol: 'TSLA', volume: '156.7M', avgVol: '89.4M', ratio: 1.75, volumeNum: 156.7, avgNum: 89.4 },
    { symbol: 'NVDA', volume: '234.5M', avgVol: '178.9M', ratio: 1.31, volumeNum: 234.5, avgNum: 178.9 },
  ];

  const getVolumeColor = (ratio: number) => {
    if (ratio > 1.5) return 'text-red-400';
    if (ratio > 1.2) return 'text-amber-400';
    if (ratio > 0.8) return 'text-emerald-400';
    return 'text-muted-foreground';
  };

  const getBarColor = (ratio: number) => {
    if (ratio > 1.5) return '#ef4444';
    if (ratio > 1.2) return '#f59e0b';
    if (ratio > 0.8) return '#10b981';
    return '#6b7280';
  };

  const highVolume = volumeData.filter(v => v.ratio > 1.2).length;
  const lowVolume = volumeData.filter(v => v.ratio < 0.8).length;

  const TableContent = () => (
    <div className="space-y-1">
      <div className="grid grid-cols-4 gap-1 text-xs mb-2 text-amber-400 border-b border-green-500/30 pb-2 sticky top-0 bg-background">
        <div>SYMBOL</div>
        <div className="text-right">VOLUME</div>
        <div className="text-right">AVG</div>
        <div className="text-right">RATIO</div>
      </div>
      
      {volumeData.map((item, index) => (
        <div 
          key={index} 
          className="grid grid-cols-4 gap-1 text-xs py-1.5 border-b border-border/10 hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="text-foreground font-medium">{item.symbol}</div>
          <div className="text-cyan-400 text-right">{item.volume}</div>
          <div className="text-muted-foreground text-right">{item.avgVol}</div>
          <div className={`text-right font-bold ${getVolumeColor(item.ratio)}`}>
            {item.ratio.toFixed(2)}x
          </div>
        </div>
      ))}
    </div>
  );

  const ChartContent = () => (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={volumeData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis type="category" dataKey="symbol" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={50} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              fontSize: '11px'
            }}
          />
          <Bar dataKey="volumeNum" name="Volume (M)">
            {volumeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.ratio)} />
            ))}
          </Bar>
          <Bar dataKey="avgNum" name="Avg Volume (M)" fill="#6b7280" opacity={0.5} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <COTStyleWrapper
      title="VOLUME ANALYSIS"
      icon="📊"
      lastUpdate={lastUpdate}
      onRefresh={() => {}}
      tabs={[
        {
          id: 'table',
          label: 'Table',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        },
        {
          id: 'chart',
          label: 'Chart',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <ChartContent />
        }
      ]}
      footerLeft={`Total: ${volumeData.length} symbols`}
      footerStats={[
        { label: '🔴 High Vol', value: highVolume },
        { label: '🟢 Normal', value: volumeData.length - highVolume - lowVolume },
        { label: '⚪ Low Vol', value: lowVolume }
      ]}
      footerRight={lastUpdate.toLocaleDateString()}
    />
  );
};

export default TradingVolume;
