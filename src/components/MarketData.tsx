import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScatterAnalysis from './ScatterChart';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MarketSection {
  title: string;
  stocks: StockData[];
}

const MarketData = () => {
  const [marketData, setMarketData] = useState<MarketSection[]>([
    {
      title: "ดัชนีต่างประเทศ",
      stocks: [
        { symbol: "US30", price: 44123.50, change: -189.25, changePercent: -0.43 },
        { symbol: "US500", price: 5831.25, change: -11.75, changePercent: -0.20 },
        { symbol: "NAS100", price: 20487.33, change: -14.82, changePercent: -0.07 },
        { symbol: "US2000", price: 2389.41, change: -17.84, changePercent: -0.74 },
        { symbol: "จีน", price: 3456.78, change: -0.35, changePercent: -0.01 },
        { symbol: "Shenzhen", price: 2145.89, change: 7.12, changePercent: 0.33 },
        { symbol: "ยุโรป", price: 4567.23, change: 38.45, changePercent: 0.84 },
        { symbol: "เยอรมนี", price: 18945.67, change: 204.78, changePercent: 1.08 },
        { symbol: "อังกฤษ", price: 8234.56, change: 56.12, changePercent: 0.68 },
        { symbol: "ฝรั่งเศส", price: 7456.89, change: 52.34, changePercent: 0.70 },
        { symbol: "สเปน", price: 11567.23, change: 143.45, changePercent: 1.24 },
        { symbol: "เกาหลี", price: 2567.89, change: 0.26, changePercent: 0.01 }
      ]
    },
    {
      title: "ตลาดหุ้นไทย",
      stocks: [
        { symbol: "PTT", price: 35.50, change: 0.75, changePercent: 2.16 },
        { symbol: "CPALL", price: 58.25, change: -0.50, changePercent: -0.85 },
        { symbol: "KBANK", price: 142.50, change: 1.25, changePercent: 0.88 },
        { symbol: "AOT", price: 68.75, change: -1.25, changePercent: -1.79 },
        { symbol: "SCB", price: 118.00, change: 2.00, changePercent: 1.72 },
        { symbol: "ADVANC", price: 201.50, change: -2.50, changePercent: -1.23 },
        { symbol: "BBL", price: 156.00, change: 3.50, changePercent: 2.30 },
        { symbol: "TRUE", price: 5.85, change: -0.15, changePercent: -2.50 }
      ]
    },
    {
      title: "สินค้าโภคภัณฑ์",
      stocks: [
        { symbol: "US01L", price: 4567.89, change: 56.78, changePercent: 1.24 },
        { symbol: "GOLD", price: 2634.50, change: -4.75, changePercent: -0.18 },
        { symbol: "NATGAS", price: 3.456, change: 0.071, changePercent: 2.04 },
        { symbol: "น้ำมันเบนซิน", price: 87.45, change: 1.63, changePercent: 1.86 },
        { symbol: "น้ำมันดีเซล", price: 92.34, change: -7.94, changePercent: -0.86 },
        { symbol: "WTI spot", price: 78.92, change: 0.93, changePercent: 1.18 }
      ]
    },
    {
      title: "อัตราแลกเปลี่ยน",
      stocks: [
        { symbol: "DXY", price: 106.789, change: 0.309, changePercent: 0.29 },
        { symbol: "EURUSD", price: 1.0534, change: -0.0043, changePercent: -0.41 },
        { symbol: "GBPUSD", price: 1.2678, change: -0.0010, changePercent: -0.08 },
        { symbol: "USDJPY", price: 149.56, change: 0.00, changePercent: 0.00 },
        { symbol: "USDCHF", price: 0.8834, change: 0.0036, changePercent: 0.41 },
        { symbol: "AUDUSD", price: 0.6589, change: -0.0011, changePercent: -0.17 },
        { symbol: "USDCAD", price: 1.3945, change: 0.0033, changePercent: 0.24 },
        { symbol: "NZDUSD", price: 0.5978, change: -0.0015, changePercent: -0.25 },
        { symbol: "USDTHB", price: 34.78, change: -0.11, changePercent: -0.32 }
      ]
    }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prevData => 
        prevData.map(section => ({
          ...section,
          stocks: section.stocks.map(stock => ({
            ...stock,
            change: stock.change + (Math.random() - 0.5) * 2,
            changePercent: stock.changePercent + (Math.random() - 0.5) * 0.5
          }))
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-terminal-green';
    if (value < 0) return 'text-terminal-red';
    return 'text-terminal-gray';
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono text-sm p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-terminal-amber mb-2">ableTERMINAL</h1>
        <div className="text-terminal-cyan">
          Market Data Feed - {new Date().toLocaleString('th-TH')}
        </div>
      </div>

      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="scatter">Scatter</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {marketData.map((section, sectionIndex) => (
              <div key={sectionIndex} className="border border-border bg-card p-4">
                <h2 className="text-lg font-bold text-terminal-amber mb-4 border-b border-border pb-2">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {section.stocks.map((stock, stockIndex) => (
                    <div 
                      key={stockIndex}
                      className="grid grid-cols-4 gap-2 hover:bg-muted py-1 px-2 transition-colors"
                    >
                      <div className="text-foreground font-medium truncate">
                        {stock.symbol}
                      </div>
                      <div className="text-right text-foreground">
                        {formatPrice(stock.price)}
                      </div>
                      <div className={`text-right ${getColorClass(stock.change)}`}>
                        {formatChange(stock.change)}
                      </div>
                      <div className={`text-right ${getColorClass(stock.changePercent)}`}>
                        {formatPercent(stock.changePercent)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scatter">
          <ScatterAnalysis />
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <div className="text-center text-terminal-cyan py-16">
            <h3 className="text-lg font-bold text-terminal-amber mb-2">Correlation Matrix</h3>
            <p>Coming Soon - Advanced correlation analysis between commodities</p>
          </div>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-6">
          <div className="text-center text-terminal-cyan py-16">
            <h3 className="text-lg font-bold text-terminal-amber mb-2">Price Forecasts</h3>
            <p>Coming Soon - AI-powered price predictions and market forecasts</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 border-t border-border pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="text-terminal-cyan">
            <div>เวลาอัพเดทล่าสุด:</div>
            <div>{new Date().toLocaleTimeString('th-TH')}</div>
          </div>
          <div className="text-terminal-cyan">
            <div>สถานะการเชื่อมต่อ:</div>
            <div className="text-terminal-green">● ONLINE</div>
          </div>
          <div className="text-terminal-cyan">
            <div>ข้อมูลล่าช้า:</div>
            <div>15 นาที</div>
          </div>
          <div className="text-terminal-cyan">
            <div>แหล่งข้อมูล:</div>
            <div>BLOOMBERG API</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketData;