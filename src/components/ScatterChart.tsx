import { useState } from 'react';
import { ScatterChart as RechartsScatter, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart3, Table } from 'lucide-react';
import { COTStyleWrapper } from '@/components/ui/COTStyleWrapper';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CommodityData {
  name: string;
  momChange: number;
  yoyChange: number;
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
      <div className="bg-card border border-border p-2 rounded-lg shadow-lg text-xs">
        <p className="text-amber-400 font-bold">{data.name}</p>
        <p className="text-cyan-400">
          MoM: <span className={data.momChange >= 0 ? 'text-green-400' : 'text-red-400'}>
            {data.momChange > 0 ? '+' : ''}{data.momChange}%
          </span>
        </p>
        <p className="text-cyan-400">
          YoY: <span className={data.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}>
            {data.yoyChange > 0 ? '+' : ''}{data.yoyChange}%
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const ScatterAnalysis = () => {
  const [category, setCategory] = useState("all");

  const filteredData = commodityData.filter(item => {
    if (category === "all") return true;
    if (category === "metals") return ["Gold", "Silver", "Copper", "Steel"].includes(item.name);
    if (category === "energy") return ["Oil", "Natural Gas", "Coal", "Gasoline", "Heating Oil", "Brent Oil"].includes(item.name);
    if (category === "agriculture") return ["Wheat", "Soybeans", "Corn", "Lumber"].includes(item.name);
    return true;
  });

  const gainers = filteredData.filter(c => c.momChange > 0 && c.yoyChange > 0);
  const losers = filteredData.filter(c => c.momChange < 0 && c.yoyChange < 0);

  // Chart Content
  const ChartContent = () => (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="85%">
        <RechartsScatter margin={{ top: 10, right: 10, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            type="number"
            dataKey="yoyChange"
            name="YoY Change"
            unit="%"
            domain={[-25, 65]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            label={{ value: 'YoY Change %', position: 'bottom', offset: 10, fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="momChange"
            name="MoM Change"
            unit="%"
            domain={[-10, 15]}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            label={{ value: 'MoM %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          
          <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Scatter
            name="Commodities"
            data={filteredData}
            fill="#fbbf24"
          />
        </RechartsScatter>
      </ResponsiveContainer>
      
      <div className="grid grid-cols-4 gap-2 text-[10px] mt-2">
        <div className="text-cyan-400">
          <div className="font-bold">Q1 (Top Right)</div>
          <div className="text-muted-foreground">+MoM & +YoY</div>
        </div>
        <div className="text-cyan-400">
          <div className="font-bold">Q2 (Top Left)</div>
          <div className="text-muted-foreground">+MoM, -YoY</div>
        </div>
        <div className="text-cyan-400">
          <div className="font-bold">Q3 (Bottom Left)</div>
          <div className="text-muted-foreground">-MoM & -YoY</div>
        </div>
        <div className="text-cyan-400">
          <div className="font-bold">Q4 (Bottom Right)</div>
          <div className="text-muted-foreground">-MoM, +YoY</div>
        </div>
      </div>
    </div>
  );

  // Table Content
  const TableContent = () => (
    <ScrollArea className="h-64">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background border-b border-green-500/30">
          <tr className="text-amber-400">
            <th className="text-left py-1 px-2">Commodity</th>
            <th className="text-right py-1 px-2">MoM Change</th>
            <th className="text-right py-1 px-2">YoY Change</th>
            <th className="text-center py-1 px-2">Quadrant</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((item, index) => {
            const quadrant = item.momChange >= 0 && item.yoyChange >= 0 ? 'Q1' :
                           item.momChange >= 0 && item.yoyChange < 0 ? 'Q2' :
                           item.momChange < 0 && item.yoyChange < 0 ? 'Q3' : 'Q4';
            return (
              <tr key={index} className="border-b border-border/10 hover:bg-accent/50">
                <td className="py-1 px-2 font-bold text-foreground">{item.name}</td>
                <td className={`py-1 px-2 text-right font-bold ${item.momChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.momChange > 0 ? '+' : ''}{item.momChange}%
                </td>
                <td className={`py-1 px-2 text-right font-bold ${item.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.yoyChange > 0 ? '+' : ''}{item.yoyChange}%
                </td>
                <td className="py-1 px-2 text-center text-amber-400">{quadrant}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollArea>
  );

  return (
    <COTStyleWrapper
      title="COMMODITY CORRELATION"
      icon="📈"
      selectOptions={[
        { value: 'all', label: '🌐 All Commodities' },
        { value: 'metals', label: '🥇 Metals' },
        { value: 'energy', label: '⛽ Energy' },
        { value: 'agriculture', label: '🌾 Agriculture' }
      ]}
      selectedValue={category}
      onSelectChange={setCategory}
      tabs={[
        {
          id: 'chart',
          label: 'Scatter',
          icon: <BarChart3 className="w-3 h-3" />,
          content: <ChartContent />
        },
        {
          id: 'table',
          label: 'Table',
          icon: <Table className="w-3 h-3" />,
          content: <TableContent />
        }
      ]}
      footerLeft={`Total: ${filteredData.length} commodities`}
      footerStats={[
        { label: '📈 Gainers', value: gainers.length },
        { label: '📉 Losers', value: losers.length }
      ]}
    />
  );
};

export default ScatterAnalysis;
