import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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
    // Shades of green for positive values
    const greenColors = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'];
    return greenColors[index % greenColors.length];
  } else {
    // Shades of red for negative values
    const redColors = ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'];
    return redColors[index % redColors.length];
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-terminal-cyan p-2 rounded text-xs">
        <p className="text-terminal-white">{data.name}</p>
        <p className={data.change >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
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

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header flex justify-between items-center">
        <span>GLOBAL MARKET RETURNS</span>
        <div className="flex gap-1">
          <button
            className={`px-2 py-1 text-xs rounded ${
              viewType === 'region' 
                ? 'bg-terminal-cyan text-black' 
                : 'text-terminal-cyan border border-terminal-cyan'
            }`}
            onClick={() => setViewType('region')}
          >
            BY REGION
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${
              viewType === 'sector' 
                ? 'bg-terminal-cyan text-black' 
                : 'text-terminal-cyan border border-terminal-cyan'
            }`}
            onClick={() => setViewType('sector')}
          >
            BY SECTOR
          </button>
        </div>
      </div>
      <div className="panel-content h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={currentData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {currentData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColor(entry.value, index)}
                  stroke="#1a1a1a"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="grid grid-cols-2 gap-1 text-xs">
            {currentData.slice(0, 6).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: getColor(entry.value, index) }}
                />
                <span className="text-terminal-white truncate text-xs">
                  {entry.name.length > 12 ? entry.name.substring(0, 12) + '...' : entry.name}
                </span>
                <span className={entry.change >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                  {entry.change >= 0 ? '+' : ''}{entry.change.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPieChart;