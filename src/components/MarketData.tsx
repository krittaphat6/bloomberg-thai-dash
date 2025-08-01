import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScatterAnalysis from './ScatterChart';
import MarketPieChart from './MarketPieChart';
import BloombergNews from './BloombergNews';
import EconomicCalendar from './EconomicCalendar';
import MarketDepth from './MarketDepth';
import TradingVolume from './TradingVolume';
import HeatMap from './HeatMap';


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
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* Main Header */}
      <div className="panel-header flex justify-between items-center border-b border-border px-4 py-2">
        <h1 className="text-lg font-bold text-terminal-amber">ableTERMINAL</h1>
        <div className="text-terminal-cyan text-xs">
          {new Date().toLocaleString('th-TH')} | LIVE MARKET DATA
        </div>
      </div>

      <Tabs defaultValue="terminal" className="w-full">
        <TabsList className="tabs-list grid w-full grid-cols-4">
          <TabsTrigger value="terminal" className="tabs-trigger">TERMINAL</TabsTrigger>
          <TabsTrigger value="scatter" className="tabs-trigger">SCATTER</TabsTrigger>
          <TabsTrigger value="correlations" className="tabs-trigger">CORRELATIONS</TabsTrigger>
          <TabsTrigger value="forecasts" className="tabs-trigger">FORECASTS</TabsTrigger>
        </TabsList>

        <TabsContent value="terminal" className="p-0">
          <div className="terminal-grid">
            {/* Panel 1: International Indices */}
            <div className="terminal-panel">
              <div className="panel-header">GLOBAL INDICES</div>
              <div className="panel-content">
                {marketData[0].stocks.slice(0, 8).map((stock, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{stock.symbol}</div>
                    <div className="price">{formatPrice(stock.price)}</div>
                    <div className={stock.change >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatChange(stock.change)}
                    </div>
                    <div className={stock.changePercent >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Asian Markets */}
            <div className="terminal-panel">
              <div className="panel-header">ASIAN MARKETS</div>
              <div className="panel-content">
                {marketData[0].stocks.slice(8).concat(marketData[1].stocks.slice(0, 4)).map((stock, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{stock.symbol}</div>
                    <div className="price">{formatPrice(stock.price)}</div>
                    <div className={stock.change >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatChange(stock.change)}
                    </div>
                    <div className={stock.changePercent >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3: Commodities */}
            <div className="terminal-panel">
              <div className="panel-header">COMMODITIES</div>
              <div className="panel-content">
                {marketData[2].stocks.map((stock, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{stock.symbol}</div>
                    <div className="price">{formatPrice(stock.price)}</div>
                    <div className={stock.change >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatChange(stock.change)}
                    </div>
                    <div className={stock.changePercent >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 4: FX Rates */}
            <div className="terminal-panel">
              <div className="panel-header">FOREIGN EXCHANGE</div>
              <div className="panel-content">
                {marketData[3].stocks.map((stock, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{stock.symbol}</div>
                    <div className="price">{formatPrice(stock.price)}</div>
                    <div className={stock.change >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatChange(stock.change)}
                    </div>
                    <div className={stock.changePercent >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 5: Thai Stocks */}
            <div className="terminal-panel">
              <div className="panel-header">THAI EQUITIES</div>
              <div className="panel-content">
                {marketData[1].stocks.slice(4).map((stock, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{stock.symbol}</div>
                    <div className="price">{formatPrice(stock.price)}</div>
                    <div className={stock.change >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatChange(stock.change)}
                    </div>
                    <div className={stock.changePercent >= 0 ? 'change-positive' : 'change-negative'}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 6: Crypto */}
            <div className="terminal-panel">
              <div className="panel-header">CRYPTOCURRENCY</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">BTC/USD</div>
                  <div className="price">67,234.50</div>
                  <div className="change-positive">+1,234.50</div>
                  <div className="change-positive">+1.87%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">ETH/USD</div>
                  <div className="price">3,456.78</div>
                  <div className="change-negative">-234.22</div>
                  <div className="change-negative">-6.34%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">BNB/USD</div>
                  <div className="price">612.34</div>
                  <div className="change-positive">+23.45</div>
                  <div className="change-positive">+3.98%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">ADA/USD</div>
                  <div className="price">0.456</div>
                  <div className="change-negative">-0.023</div>
                  <div className="change-negative">-4.81%</div>
                </div>
              </div>
            </div>

            {/* Panel 7: Bonds */}
            <div className="terminal-panel">
              <div className="panel-header">GOVERNMENT BONDS</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">US 10Y</div>
                  <div className="price">4.567</div>
                  <div className="change-positive">+0.023</div>
                  <div className="change-positive">+0.51%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">TH 10Y</div>
                  <div className="price">2.678</div>
                  <div className="change-negative">-0.012</div>
                  <div className="change-negative">-0.45%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">DE 10Y</div>
                  <div className="price">2.234</div>
                  <div className="change-positive">+0.034</div>
                  <div className="change-positive">+1.54%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">JP 10Y</div>
                  <div className="price">0.789</div>
                  <div className="change-neutral">+0.000</div>
                  <div className="change-neutral">+0.00%</div>
                </div>
              </div>
            </div>

            {/* Panel 8: Market Pie Chart */}
            <div className="relative">
              <MarketPieChart />
            </div>

            {/* Panel 9: Options Flow */}
            <div className="terminal-panel">
              <div className="panel-header">OPTIONS FLOW</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">SPY C420</div>
                  <div className="price">2.45</div>
                  <div className="change-positive">+0.34</div>
                  <div className="change-positive">+16.1%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">QQQ P380</div>
                  <div className="price">1.23</div>
                  <div className="change-negative">-0.45</div>
                  <div className="change-negative">-26.8%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">AAPL C190</div>
                  <div className="price">3.67</div>
                  <div className="change-positive">+0.89</div>
                  <div className="change-positive">+32.0%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">TSLA P250</div>
                  <div className="price">5.12</div>
                  <div className="change-negative">-1.34</div>
                  <div className="change-negative">-20.7%</div>
                </div>
              </div>
            </div>

            {/* Panel 10: Sector Performance */}
            <div className="terminal-panel">
              <div className="panel-header">SECTOR PERFORMANCE</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">TECH</div>
                  <div className="price">+1.24%</div>
                  <div className="change-positive">+0.34</div>
                  <div className="change-positive">+38.5%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">ENERGY</div>
                  <div className="price">-0.67%</div>
                  <div className="change-negative">-0.12</div>
                  <div className="change-negative">-12.3%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">FINANCE</div>
                  <div className="price">+0.89%</div>
                  <div className="change-positive">+0.23</div>
                  <div className="change-positive">+22.1%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">HEALTH</div>
                  <div className="price">+0.45%</div>
                  <div className="change-positive">+0.15</div>
                  <div className="change-positive">+15.7%</div>
                </div>
              </div>
            </div>

            {/* Panel 11: Market Movers */}
            <div className="terminal-panel">
              <div className="panel-header">TOP MOVERS</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">NVDA</div>
                  <div className="price">876.45</div>
                  <div className="change-positive">+45.67</div>
                  <div className="change-positive">+5.50%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">AMD</div>
                  <div className="price">145.23</div>
                  <div className="change-positive">+12.34</div>
                  <div className="change-positive">+9.28%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">INTC</div>
                  <div className="price">23.45</div>
                  <div className="change-negative">-2.34</div>
                  <div className="change-negative">-9.07%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">BABA</div>
                  <div className="price">89.12</div>
                  <div className="change-negative">-4.56</div>
                  <div className="change-negative">-4.87%</div>
                </div>
              </div>
            </div>

            {/* Panel 12: Volatility Index */}
            <div className="terminal-panel">
              <div className="panel-header">VOLATILITY</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">VIX</div>
                  <div className="price">18.45</div>
                  <div className="change-negative">-1.23</div>
                  <div className="change-negative">-6.25%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">VVIX</div>
                  <div className="price">89.67</div>
                  <div className="change-positive">+2.34</div>
                  <div className="change-positive">+2.68%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SKEW</div>
                  <div className="price">145.23</div>
                  <div className="change-neutral">+0.12</div>
                  <div className="change-neutral">+0.08%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">TERM</div>
                  <div className="price">0.234</div>
                  <div className="change-positive">+0.012</div>
                  <div className="change-positive">+5.41%</div>
                </div>
              </div>
            </div>

            {/* Panel 13: Economic Calendar */}
            <EconomicCalendar />

            {/* Panel 14: Market Depth */}
            <MarketDepth />

            {/* Panel 15: Trading Volume */}
            <TradingVolume />

            {/* Panel 16: Market Heatmap */}
            <HeatMap />

            {/* Panel 17: Interest Rates */}
            <div className="terminal-panel">
              <div className="panel-header">INTEREST RATES</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">FED FUNDS</div>
                  <div className="price">5.25</div>
                  <div className="change-neutral">+0.00</div>
                  <div className="change-neutral">+0.00%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">ECB RATE</div>
                  <div className="price">4.50</div>
                  <div className="change-neutral">+0.00</div>
                  <div className="change-neutral">+0.00%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">BOJ RATE</div>
                  <div className="price">0.10</div>
                  <div className="change-neutral">+0.00</div>
                  <div className="change-neutral">+0.00%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">BOE RATE</div>
                  <div className="price">5.25</div>
                  <div className="change-neutral">+0.00</div>
                  <div className="change-neutral">+0.00%</div>
                </div>
              </div>
            </div>

            {/* Panel 18: Futures */}
            <div className="terminal-panel">
              <div className="panel-header">FUTURES</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">ES DEC24</div>
                  <div className="price">5829.25</div>
                  <div className="change-negative">-12.50</div>
                  <div className="change-negative">-0.21%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">NQ DEC24</div>
                  <div className="price">20485.75</div>
                  <div className="change-negative">-15.25</div>
                  <div className="change-negative">-0.07%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">RTY DEC24</div>
                  <div className="price">2387.40</div>
                  <div className="change-negative">-18.75</div>
                  <div className="change-negative">-0.78%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">CL JAN25</div>
                  <div className="price">78.92</div>
                  <div className="change-positive">+0.95</div>
                  <div className="change-positive">+1.22%</div>
                </div>
              </div>
            </div>

            {/* Panel 19: Market Sentiment */}
            <div className="terminal-panel">
              <div className="panel-header">SENTIMENT</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">FEAR/GREED</div>
                  <div className="price">67</div>
                  <div className="change-positive">+5</div>
                  <div className="change-positive">GREED</div>
                </div>
                <div className="data-row">
                  <div className="symbol">PUT/CALL</div>
                  <div className="price">0.89</div>
                  <div className="change-negative">-0.05</div>
                  <div className="change-negative">-5.33%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">AAII BULL</div>
                  <div className="price">45.6%</div>
                  <div className="change-positive">+2.3%</div>
                  <div className="change-positive">+5.31%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">MARGIN DEBT</div>
                  <div className="price">891.2B</div>
                  <div className="change-positive">+12.4B</div>
                  <div className="change-positive">+1.41%</div>
                </div>
              </div>
            </div>

            {/* Panel 20: Technical Indicators */}
            <div className="terminal-panel">
              <div className="panel-header">TECHNICALS</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">SPX RSI</div>
                  <div className="price">67.8</div>
                  <div className="change-positive">+2.1</div>
                  <div className="change-positive">BULLISH</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SPX MACD</div>
                  <div className="price">23.45</div>
                  <div className="change-positive">+1.23</div>
                  <div className="change-positive">BUY</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SPX MA50</div>
                  <div className="price">5745.23</div>
                  <div className="change-positive">+12.45</div>
                  <div className="change-positive">+0.22%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SPX MA200</div>
                  <div className="price">5234.67</div>
                  <div className="change-positive">+5.67</div>
                  <div className="change-positive">+0.11%</div>
                </div>
              </div>
            </div>

            {/* Panel 21: Energy */}
            <div className="terminal-panel">
              <div className="panel-header">ENERGY MARKETS</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">WTI CRUDE</div>
                  <div className="price">78.92</div>
                  <div className="change-positive">+0.95</div>
                  <div className="change-positive">+1.22%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">BRENT</div>
                  <div className="price">83.45</div>
                  <div className="change-positive">+1.12</div>
                  <div className="change-positive">+1.36%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">NAT GAS</div>
                  <div className="price">3.456</div>
                  <div className="change-positive">+0.071</div>
                  <div className="change-positive">+2.09%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">GASOLINE</div>
                  <div className="price">2.234</div>
                  <div className="change-negative">-0.034</div>
                  <div className="change-negative">-1.50%</div>
                </div>
              </div>
            </div>

            {/* Panel 22: Metals */}
            <div className="terminal-panel">
              <div className="panel-header">PRECIOUS METALS</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">GOLD</div>
                  <div className="price">2634.50</div>
                  <div className="change-negative">-4.75</div>
                  <div className="change-negative">-0.18%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SILVER</div>
                  <div className="price">31.45</div>
                  <div className="change-negative">-0.67</div>
                  <div className="change-negative">-2.09%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">PLATINUM</div>
                  <div className="price">967.80</div>
                  <div className="change-positive">+12.45</div>
                  <div className="change-positive">+1.30%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">PALLADIUM</div>
                  <div className="price">1034.50</div>
                  <div className="change-negative">-23.40</div>
                  <div className="change-negative">-2.21%</div>
                </div>
              </div>
            </div>

            {/* Panel 23: Agriculture */}
            <div className="terminal-panel">
              <div className="panel-header">AGRICULTURE</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">CORN</div>
                  <div className="price">434.25</div>
                  <div className="change-positive">+2.75</div>
                  <div className="change-positive">+0.64%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">WHEAT</div>
                  <div className="price">567.50</div>
                  <div className="change-negative">-5.25</div>
                  <div className="change-negative">-0.92%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SOYBEANS</div>
                  <div className="price">1023.75</div>
                  <div className="change-positive">+8.50</div>
                  <div className="change-positive">+0.84%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">SUGAR</div>
                  <div className="price">21.89</div>
                  <div className="change-negative">-0.34</div>
                  <div className="change-negative">-1.53%</div>
                </div>
              </div>
            </div>

            {/* Panel 24: World Indices */}
            <div className="terminal-panel">
              <div className="panel-header">WORLD INDICES</div>
              <div className="panel-content">
                <div className="data-row">
                  <div className="symbol">NIKKEI</div>
                  <div className="price">38234.56</div>
                  <div className="change-positive">+234.78</div>
                  <div className="change-positive">+0.62%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">HANG SENG</div>
                  <div className="price">17456.23</div>
                  <div className="change-negative">-123.45</div>
                  <div className="change-negative">-0.70%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">FTSE 100</div>
                  <div className="price">8234.67</div>
                  <div className="change-positive">+45.23</div>
                  <div className="change-positive">+0.55%</div>
                </div>
                <div className="data-row">
                  <div className="symbol">CAC 40</div>
                  <div className="price">7456.89</div>
                  <div className="change-positive">+67.34</div>
                  <div className="change-positive">+0.91%</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scatter">
          <ScatterAnalysis />
        </TabsContent>

        <TabsContent value="correlations" className="p-8">
          <div className="terminal-panel">
            <div className="panel-header">CORRELATION MATRIX</div>
            <div className="panel-content text-center py-16">
              <div className="text-terminal-cyan">
                Advanced correlation analysis between asset classes
              </div>
              <div className="text-terminal-amber mt-2">COMING SOON</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forecasts" className="p-8">
          <div className="terminal-panel">
            <div className="panel-header">AI FORECASTS</div>
            <div className="panel-content text-center py-16">
              <div className="text-terminal-cyan">
                Machine learning powered price predictions
              </div>
              <div className="text-terminal-amber mt-2">COMING SOON</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bloomberg News Section */}
      <div className="px-4 py-2">
        <BloombergNews />
      </div>

      {/* Ticker Tape */}
      <div className="ticker-tape">
        <div className="ticker-content">
          <div className="ticker-item">
            <span className="text-terminal-white">AAPL</span>
            <span className="text-terminal-cyan">189.45</span>
            <span className="text-terminal-green">+2.34</span>
          </div>
          <div className="ticker-item">
            <span className="text-terminal-white">GOOGL</span>
            <span className="text-terminal-cyan">2,678.90</span>
            <span className="text-terminal-red">-15.67</span>
          </div>
          <div className="ticker-item">
            <span className="text-terminal-white">MSFT</span>
            <span className="text-terminal-cyan">378.23</span>
            <span className="text-terminal-green">+5.89</span>
          </div>
          <div className="ticker-item">
            <span className="text-terminal-white">TSLA</span>
            <span className="text-terminal-cyan">234.56</span>
            <span className="text-terminal-red">-8.91</span>
          </div>
          <div className="ticker-item">
            <span className="text-terminal-white">AMZN</span>
            <span className="text-terminal-cyan">3,156.78</span>
            <span className="text-terminal-green">+23.45</span>
          </div>
          <div className="ticker-item">
            <span className="text-terminal-white">META</span>
            <span className="text-terminal-cyan">456.89</span>
            <span className="text-terminal-red">-12.34</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketData;