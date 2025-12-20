import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon, Table } from 'lucide-react';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';
import { ScrollArea } from '@/components/ui/scroll-area';

const regionData = [
  { name: 'Singapore', value: 0.34, change: 0.34 },
  { name: 'Taiwan', value: -0.32, change: -0.32 },
  { name: 'Asia Pacific (Developed)', value: 0.10, change: 0.10 },
  { name: 'South Korea', value: -0.20, change: -0.20 },
  { name: 'Hong Kong', value: 0.05, change: 0.05 },
  { name: 'Japan', value: 0.15, change: 0.15 },
  { name: 'Australia', value: -0.08, change: -0.08 },
  { name: 'India', value: 0.22, change: 0.22 }
];

const sectorData = [
  { name: 'Technology', value: 0.45, change: 0.45 },
  { name: 'Healthcare', value: -0.15, change: -0.15 },
  { name: 'Financial', value: 0.28, change: 0.28 },
  { name: 'Energy', value: -0.32, change: -0.32 },
  { name: 'Consumer', value: 0.12, change: 0.12 },
  { name: 'Industrial', value: -0.08, change: -0.08 },
  { name: 'Materials', value: 0.18, change: 0.18 },
  { name: 'Utilities', value: -0.05, change: -0.05 }
];

const getColor = (value: number, index: number) => {
  if (value > 0) {
    const greenColors = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'];
    return greenColors[index % greenColors.length];
  } else {
    const redColors = ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'];
    return redColors[index % redColors.length];
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border p-2 rounded text-xs">
        <p className="text-foreground font-bold">{data.name}</p>
        <p className={data.change >= 0 ? 'text-green-400' : 'text-red-400'}>
          {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

const MarketPieChart = () => {
  const [viewType, setViewType] = useState<'region' | 'sector'>('region');
  const currentData = viewType === 'region' ? regionData : sectorData;
  
  const gainers = currentData.filter(d => d.change > 0);
  const losers = currentData.filter(d => d.change < 0);

  // Chart Content
  const ChartContent = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={currentData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {currentData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColor(entry.value, index)}
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 text-[10px] mt-2">
        {currentData.slice(0, 6).map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: getColor(entry.value, index) }}
            />
            <span className="text-foreground truncate">
              {entry.name.length > 10 ? entry.name.substring(0, 10) + '...' : entry.name}
            </span>
            <span className={entry.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {entry.change >= 0 ? '+' : ''}{entry.change.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // Table Content
  const TableContent = () => (
    <ScrollArea className="h-48">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background border-b border-green-500/30">
          <tr className="text-amber-400">
            <th className="text-left py-1 px-2">{viewType === 'region' ? 'Region' : 'Sector'}</th>
            <th className="text-right py-1 px-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((item, index) => (
            <tr key={index} className="border-b border-border/10 hover:bg-accent/50">
              <td className="py-1 px-2 text-foreground">{item.name}</td>
              <td className={`py-1 px-2 text-right font-bold ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );

  return (
    <COTStyleWrapper
      title="GLOBAL MARKET RETURNS"
      icon="🌍"
      selectOptions={[
        { value: 'region', label: '🗺️ By Region' },
        { value: 'sector', label: '📊 By Sector' }
      ]}
      selectedValue={viewType}
      onSelectChange={(v) => setViewType(v as 'region' | 'sector')}
      tabs={[
        {
          id: 'chart',
          label: 'Chart',
          icon: <PieIcon className="w-3 h-3" />,
          content: <ChartContent />
        },
        {
          id: 'table',
          label: 'Table',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        }
      ]}
      footerLeft={`Total: ${currentData.length} items`}
      footerStats={[
        { label: '📈 Gainers', value: gainers.length },
        { label: '📉 Losers', value: losers.length }
      ]}
    />
  );
};

export default MarketPieChart;
