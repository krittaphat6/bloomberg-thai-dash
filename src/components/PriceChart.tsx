import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';

interface PriceData {
  time: string;
  price: number;
  volume: number;
}

const PriceChart = ({ symbol = "EURUSD", type = "line" }: { symbol?: string; type?: "line" | "area" }) => {
  const [data, setData] = useState<PriceData[]>([]);

  useEffect(() => {
    // Generate realistic price data
    const generateData = () => {
      const newData: PriceData[] = [];
      let basePrice = symbol.includes('USD') ? 1.0534 : 420.50;
      
      for (let i = 0; i < 60; i++) {
        const time = new Date(Date.now() - (60 - i) * 30000).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
        
        const price = basePrice + (Math.random() - 0.5) * (symbol.includes('USD') ? 0.01 : 5);
        const volume = Math.floor(Math.random() * 10000) + 5000;
        
        newData.push({
          time,
          price: Number(price.toFixed(symbol.includes('USD') ? 4 : 2)),
          volume
        });
        
        basePrice = price;
      }
      
      return newData;
    };

    setData(generateData());

    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData.slice(1)];
        const lastPrice = prevData[prevData.length - 1]?.price || (symbol.includes('USD') ? 1.0534 : 420.50);
        const time = new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
        
        const price = lastPrice + (Math.random() - 0.5) * (symbol.includes('USD') ? 0.002 : 1);
        const volume = Math.floor(Math.random() * 10000) + 5000;
        
        newData.push({
          time,
          price: Number(price.toFixed(symbol.includes('USD') ? 4 : 2)),
          volume
        });
        
        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [symbol]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-2 text-xs">
          <p className="text-terminal-amber">{label}</p>
          <p className="text-terminal-green">Price: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const currentPrice = data[data.length - 1]?.price || 0;
  const previousPrice = data[data.length - 2]?.price || 0;
  const change = currentPrice - previousPrice;
  const isPositive = change >= 0;

  return (
    <div className="terminal-panel h-full">
      <div className="panel-header flex justify-between items-center">
        <span>{symbol}</span>
        <span className={isPositive ? 'text-terminal-green' : 'text-terminal-red'}>
          {currentPrice.toFixed(symbol.includes('USD') ? 4 : 2)} ({isPositive ? '+' : ''}{change.toFixed(4)})
        </span>
      </div>
      <div className="panel-content p-1">
        <ResponsiveContainer width="100%" height="90%">
          {type === "area" ? (
            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
                domain={['dataMin - 0.001', 'dataMax + 0.001']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#00ff00" 
                fill="#00ff0020"
                strokeWidth={1}
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
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
                domain={['dataMin - 0.001', 'dataMax + 0.001']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#00ff00" 
                strokeWidth={1}
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;