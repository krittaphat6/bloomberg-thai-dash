import { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CandlestickChart = ({ symbol = "SPY" }: { symbol?: string }) => {
  const [data, setData] = useState<CandlestickData[]>([]);

  useEffect(() => {
    // Generate realistic candlestick data
    const generateData = () => {
      const newData: CandlestickData[] = [];
      let basePrice = 420;
      
      for (let i = 0; i < 50; i++) {
        const time = new Date(Date.now() - (50 - i) * 60000).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const open = basePrice + (Math.random() - 0.5) * 2;
        const close = open + (Math.random() - 0.5) * 4;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        const volume = Math.floor(Math.random() * 1000000) + 500000;
        
        newData.push({
          time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume
        });
        
        basePrice = close;
      }
      
      return newData;
    };

    setData(generateData());

    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData.slice(1)];
        const lastCandle = prevData[prevData.length - 1];
        const time = new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const open = lastCandle.close;
        const close = open + (Math.random() - 0.5) * 3;
        const high = Math.max(open, close) + Math.random() * 1.5;
        const low = Math.min(open, close) - Math.random() * 1.5;
        const volume = Math.floor(Math.random() * 1000000) + 500000;
        
        newData.push({
          time,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume
        });
        
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const CandlestickTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-2 text-xs">
          <p className="text-terminal-amber">{label}</p>
          <p className="text-terminal-green">O: {data.open}</p>
          <p className="text-terminal-cyan">H: {data.high}</p>
          <p className="text-terminal-magenta">L: {data.low}</p>
          <p className="text-terminal-red">C: {data.close}</p>
          <p className="text-terminal-gray">Vol: {data.volume.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header">{symbol} - 1M CHART</div>
      <div className="panel-content p-2">
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <YAxis 
              yAxisId="volume"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: '#666666' }}
              domain={[0, 'dataMax']}
            />
            <Tooltip content={<CandlestickTooltip />} />
            <Bar 
              dataKey="volume" 
              fill="#333333" 
              opacity={0.3}
              yAxisId="volume"
            />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#00ff00" 
              strokeWidth={1}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="high" 
              stroke="#ff0000" 
              strokeWidth={0.5}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="low" 
              stroke="#ff0000" 
              strokeWidth={0.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CandlestickChart;