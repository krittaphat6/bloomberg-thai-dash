import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface VolumeData {
  time: string;
  volume: number;
  value: number;
}

const VolumeChart = ({ title = "VOLUME ANALYSIS" }: { title?: string }) => {
  const [data, setData] = useState<VolumeData[]>([]);

  useEffect(() => {
    // Generate realistic volume data
    const generateData = () => {
      const newData: VolumeData[] = [];
      
      for (let i = 0; i < 20; i++) {
        const time = new Date(Date.now() - (20 - i) * 300000).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        const volume = Math.floor(Math.random() * 2000000) + 500000;
        const value = Math.floor(Math.random() * 50000000) + 10000000;
        
        newData.push({
          time,
          volume,
          value
        });
      }
      
      return newData;
    };

    setData(generateData());

    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData.slice(1)];
        const time = new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        const volume = Math.floor(Math.random() * 2000000) + 500000;
        const value = Math.floor(Math.random() * 50000000) + 10000000;
        
        newData.push({
          time,
          volume,
          value
        });
        
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-2 text-xs">
          <p className="text-terminal-amber">{label}</p>
          <p className="text-terminal-green">Volume: {payload[0].value.toLocaleString()}</p>
          <p className="text-terminal-cyan">Value: ${(payload[0].payload.value / 1000000).toFixed(1)}M</p>
        </div>
      );
    }
    return null;
  };

  const totalVolume = data.reduce((sum, item) => sum + item.volume, 0);
  const avgVolume = totalVolume / data.length;

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header">{title}</div>
      <div className="panel-content p-2">
        <div className="text-xs mb-2">
          <div className="text-terminal-cyan">Total: {totalVolume.toLocaleString()}</div>
          <div className="text-terminal-green">Avg: {Math.floor(avgVolume).toLocaleString()}</div>
        </div>
        <ResponsiveContainer width="100%" height="75%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#00ff00' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#00ff00' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="volume" 
              fill="#00ff00" 
              opacity={0.7}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;