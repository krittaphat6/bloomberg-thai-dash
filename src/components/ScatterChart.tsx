import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CommodityData {
  name: string;
  momChange: number; // Month over Month
  yoyChange: number; // Year over Year
  color: string;
}

const commodityData: CommodityData[] = [
  { name: "Gold", momChange: -0.5, yoyChange: 42, color: "#FFD700" },
  { name: "Silver", momChange: 5.2, yoyChange: 28, color: "#C0C0C0" },
  { name: "Copper", momChange: 12.5, yoyChange: 31, color: "#B87333" },
  { name: "Steel", momChange: 7.8, yoyChange: 8, color: "#71797E" },
  { name: "Lumber", momChange: 10.5, yoyChange: 35, color: "#DEB887" },
  { name: "Oil", momChange: 3.2, yoyChange: -8, color: "#000000" },
  { name: "Natural Gas", momChange: -7.5, yoyChange: 58, color: "#32CD32" },
  { name: "Coal", momChange: 5.0, yoyChange: -18, color: "#2F4F4F" },
  { name: "Gasoline", momChange: 5.5, yoyChange: -15, color: "#FF6347" },
  { name: "Heating Oil", momChange: 3.0, yoyChange: -5, color: "#8B4513" },
  { name: "Wheat", momChange: -4.2, yoyChange: 12, color: "#F4A460" },
  { name: "Soybeans", momChange: -5.0, yoyChange: -8, color: "#6B8E23" },
  { name: "Corn", momChange: 4.8, yoyChange: -12, color: "#DAA520" },
  { name: "Brent Oil", momChange: 7.2, yoyChange: -14, color: "#556B2F" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
        <p className="text-terminal-amber font-bold">{data.name}</p>
        <p className="text-terminal-cyan">
          MoM Change: <span className={data.momChange >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
            {data.momChange > 0 ? '+' : ''}{data.momChange}%
          </span>
        </p>
        <p className="text-terminal-cyan">
          YoY Change: <span className={data.yoyChange >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
            {data.yoyChange > 0 ? '+' : ''}{data.yoyChange}%
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const ScatterAnalysis = () => {
  const [timeframe, setTimeframe] = useState("monthly");
  const [category, setCategory] = useState("all");

  const filteredData = commodityData.filter(item => {
    if (category === "all") return true;
    if (category === "metals") return ["Gold", "Silver", "Copper", "Steel"].includes(item.name);
    if (category === "energy") return ["Oil", "Natural Gas", "Coal", "Gasoline", "Heating Oil", "Brent Oil"].includes(item.name);
    if (category === "agriculture") return ["Wheat", "Soybeans", "Corn"].includes(item.name);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-terminal-amber">Commodity Correlation Analysis</h2>
          <p className="text-terminal-cyan text-sm">Scatter plot showing MoM vs YoY price changes</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commodities</SelectItem>
              <SelectItem value="metals">Metals</SelectItem>
              <SelectItem value="energy">Energy</SelectItem>
              <SelectItem value="agriculture">Agriculture</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-6">
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              dataKey="yoyChange"
              name="YoY Change"
              unit="%"
              domain={[-25, 65]}
              axisLine={{ stroke: 'hsl(var(--terminal-cyan))' }}
              tickLine={{ stroke: 'hsl(var(--terminal-cyan))' }}
              tick={{ fill: 'hsl(var(--terminal-cyan))', fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="momChange"
              name="MoM Change"
              unit="%"
              domain={[-10, 15]}
              axisLine={{ stroke: 'hsl(var(--terminal-cyan))' }}
              tickLine={{ stroke: 'hsl(var(--terminal-cyan))' }}
              tick={{ fill: 'hsl(var(--terminal-cyan))', fontSize: 12 }}
            />
            
            {/* Reference lines for zero */}
            <ReferenceLine x={0} stroke="hsl(var(--terminal-gray))" strokeDasharray="2 2" />
            <ReferenceLine y={0} stroke="hsl(var(--terminal-gray))" strokeDasharray="2 2" />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Scatter
              name="Commodities"
              data={filteredData}
              fill="hsl(var(--terminal-amber))"
            >
              {filteredData.map((entry, index) => (
                <Scatter
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="text-terminal-cyan">
            <div className="font-bold">Quadrant I (Top Right)</div>
            <div>Positive MoM & YoY</div>
          </div>
          <div className="text-terminal-cyan">
            <div className="font-bold">Quadrant II (Top Left)</div>
            <div>Positive MoM, Negative YoY</div>
          </div>
          <div className="text-terminal-cyan">
            <div className="font-bold">Quadrant III (Bottom Left)</div>
            <div>Negative MoM & YoY</div>
          </div>
          <div className="text-terminal-cyan">
            <div className="font-bold">Quadrant IV (Bottom Right)</div>
            <div>Negative MoM, Positive YoY</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ScatterAnalysis;