import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ScatterAnalysis from './ScatterChart';
import MarketPieChart from './MarketPieChart';
import BloombergNews from './BloombergNews';
import EconomicCalendar from './EconomicCalendar';
import MarketDepth from './MarketDepth';
import TradingVolume from './TradingVolume';
import HeatMap from './HeatMap';
import CurrencyTable from './CurrencyTable';
import EconomicIndicators from './EconomicIndicators';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface PortfolioData {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface SectorData {
  sector: string;
  change: number;
  volume: number;
}

interface NewsItem {
  headline: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
}

const MarketData = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData[]>([]);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Initialize data
    const initializeStockData = () => {
      const stocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'];
      const data = stocks.map(symbol => ({
        symbol,
        price: 100 + Math.random() * 400,
        change: -20 + Math.random() * 40,
        changePercent: -5 + Math.random() * 10,
      }));
      setStockData(data);
    };

    const initializePortfolioData = () => {
      const data: PortfolioData[] = [
        { symbol: 'AAPL', shares: 100, avgCost: 150.25, currentPrice: 178.45, marketValue: 17845, gainLoss: 2820, gainLossPercent: 18.77 },
        { symbol: 'GOOGL', shares: 50, avgCost: 125.30, currentPrice: 142.60, marketValue: 7130, gainLoss: 865, gainLossPercent: 13.82 },
        { symbol: 'MSFT', shares: 75, avgCost: 280.50, currentPrice: 378.85, marketValue: 28414, gainLoss: 7376, gainLossPercent: 35.06 },
        { symbol: 'TSLA', shares: 25, avgCost: 245.75, currentPrice: 187.29, marketValue: 4682, gainLoss: -1462, gainLossPercent: -23.78 },
      ];
      setPortfolioData(data);
    };

    const initializeSectorData = () => {
      const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Materials', 'Utilities'];
      const data = sectors.map(sector => ({
        sector,
        change: -3 + Math.random() * 6,
        volume: Math.floor(Math.random() * 1000000000),
      }));
      setSectorData(data);
    };

    const initializeNewsData = () => {
      const headlines = [
        'Fed Holds Interest Rates Steady at 5.25%-5.50%',
        'Tech Stocks Rally on AI Breakthrough Announcement',
        'Oil Prices Surge Following Geopolitical Tensions',
        'Unemployment Rate Drops to 3.7% in Latest Report',
        'Major Bank Reports Strong Quarterly Earnings',
        'Cryptocurrency Market Sees Mixed Trading Session',
      ];
      
      const data = headlines.map((headline, index) => ({
        headline,
        time: `${9 + index}:${30 + (index * 15) % 60} AM`,
        impact: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
      }));
      setNewsData(data);
    };

    initializeStockData();
    initializePortfolioData();
    initializeSectorData();
    initializeNewsData();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Update stock data every 2 seconds
    const stockInterval = setInterval(() => {
      setStockData(prevData => 
        prevData.map(stock => ({
          ...stock,
          price: Math.max(stock.price + (-2 + Math.random() * 4), 10),
          change: stock.change + (-0.5 + Math.random()),
          changePercent: stock.changePercent + (-0.1 + Math.random() * 0.2),
        }))
      );
    }, 2000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(stockInterval);
    };
  }, []);

  const formatPrice = (price: number) => price.toFixed(2);
  const formatChange = (change: number) => (change >= 0 ? '+' : '') + change.toFixed(2);
  const formatPercent = (percent: number) => (percent >= 0 ? '+' : '') + percent.toFixed(2) + '%';
  
  const getChangeColor = (change: number) => {
    if (change > 0) return 'change-positive';
    if (change < 0) return 'change-negative';
    return 'change-neutral';
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="bg-background border-b border-border p-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-bold text-terminal-green">BLOOMBERG TERMINAL</span>
            <span className="text-terminal-amber">MARKETS</span>
          </div>
          <div className="text-terminal-green">
            {currentTime.toLocaleTimeString()} EST
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="markets" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="markets">MARKETS</TabsTrigger>
          <TabsTrigger value="portfolio">PORTFOLIO</TabsTrigger>
          <TabsTrigger value="news">NEWS</TabsTrigger>
          <TabsTrigger value="analysis">ANALYSIS</TabsTrigger>
          <TabsTrigger value="research">RESEARCH</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="flex-1 p-2">
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Row 1 - Major Indices and Economic Indicators */}
            <ResizablePanel defaultSize={25} minSize={15}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
                    <div className="panel-header">MAJOR INDICES</div>
                    <div className="panel-content">
                      <div className="data-row">
                        <div className="symbol">SPX</div>
                        <div className="price">5829.76</div>
                        <div className="change-negative">-12.64</div>
                        <div className="change-negative">-0.22%</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">NDX</div>
                        <div className="price">20501.51</div>
                        <div className="change-negative">-15.24</div>
                        <div className="change-negative">-0.07%</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">DJI</div>
                        <div className="price">42692.20</div>
                        <div className="change-positive">+47.21</div>
                        <div className="change-positive">+0.11%</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">RUT</div>
                        <div className="price">2404.65</div>
                        <div className="change-negative">-18.75</div>
                        <div className="change-negative">-0.77%</div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <EconomicIndicators />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <CurrencyTable />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Row 2 - Global Economic Data */}
            <ResizablePanel defaultSize={25} minSize={15}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
                    <div className="panel-header">GLOBAL INDICATORS</div>
                    <div className="panel-content">
                      <div className="data-row">
                        <div className="symbol">US GDP</div>
                        <div className="price">3.0%</div>
                        <div className="change-positive">+0.5%</div>
                        <div className="change-positive">QoQ</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">EU GDP</div>
                        <div className="price">0.2%</div>
                        <div className="change-negative">-0.1%</div>
                        <div className="change-negative">QoQ</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">CN GDP</div>
                        <div className="price">4.9%</div>
                        <div className="change-negative">-0.3%</div>
                        <div className="change-negative">YoY</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">JP GDP</div>
                        <div className="price">-0.7%</div>
                        <div className="change-negative">-1.2%</div>
                        <div className="change-negative">QoQ</div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
                    <div className="panel-header">INFLATION DATA</div>
                    <div className="panel-content">
                      <div className="data-row">
                        <div className="symbol">US CPI</div>
                        <div className="price">2.7%</div>
                        <div className="change-positive">+0.3%</div>
                        <div className="change-positive">YoY</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">EU HICP</div>
                        <div className="price">1.8%</div>
                        <div className="change-negative">-0.2%</div>
                        <div className="change-negative">YoY</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">CN CPI</div>
                        <div className="price">0.1%</div>
                        <div className="change-negative">-0.4%</div>
                        <div className="change-negative">YoY</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">JP CPI</div>
                        <div className="price">2.3%</div>
                        <div className="change-positive">+0.1%</div>
                        <div className="change-positive">YoY</div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
                    <div className="panel-header">EMPLOYMENT</div>
                    <div className="panel-content">
                      <div className="data-row">
                        <div className="symbol">US UNEMP</div>
                        <div className="price">4.2%</div>
                        <div className="change-positive">+0.1%</div>
                        <div className="change-positive">MoM</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">EU UNEMP</div>
                        <div className="price">6.4%</div>
                        <div className="change-negative">-0.1%</div>
                        <div className="change-negative">MoM</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">CN UNEMP</div>
                        <div className="price">5.1%</div>
                        <div className="change-neutral">+0.0%</div>
                        <div className="change-neutral">MoM</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">JP UNEMP</div>
                        <div className="price">2.5%</div>
                        <div className="change-positive">+0.1%</div>
                        <div className="change-positive">MoM</div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
                    <div className="panel-header">MANUFACTURING</div>
                    <div className="panel-content">
                      <div className="data-row">
                        <div className="symbol">US PMI</div>
                        <div className="price">49.8</div>
                        <div className="change-negative">-2.2</div>
                        <div className="change-negative">CONT</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">EU PMI</div>
                        <div className="price">45.2</div>
                        <div className="change-negative">-1.1</div>
                        <div className="change-negative">CONT</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">CN PMI</div>
                        <div className="price">50.1</div>
                        <div className="change-positive">+0.3</div>
                        <div className="change-positive">EXP</div>
                      </div>
                      <div className="data-row">
                        <div className="symbol">JP PMI</div>
                        <div className="price">48.9</div>
                        <div className="change-negative">-0.8</div>
                        <div className="change-negative">CONT</div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Row 3 - Market Sentiment and Commodities */}
            <ResizablePanel defaultSize={25} minSize={15}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <div className="terminal-panel h-full">
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
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={16.66} minSize={10}>
                  <BloombergNews />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Row 4 - Additional Components */}
            <ResizablePanel defaultSize={25} minSize={15}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={25} minSize={10}>
                  <EconomicCalendar />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={10}>
                  <MarketDepth />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={10}>
                  <TradingVolume />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={10}>
                  <HeatMap />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="portfolio" className="flex-1 p-4">
          <div className="terminal-panel h-full">
            <div className="panel-header">PORTFOLIO OVERVIEW</div>
            <div className="panel-content">
              <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-terminal-amber">
                <div>SYMBOL</div>
                <div className="text-right">SHARES</div>
                <div className="text-right">AVG COST</div>
                <div className="text-right">CURRENT</div>
                <div className="text-right">MKT VALUE</div>
                <div className="text-right">GAIN/LOSS</div>
                <div className="text-right">%</div>
              </div>
              
              {portfolioData.map((item, index) => (
                <div key={index} className="grid grid-cols-7 gap-2 text-xs py-1 border-b border-border/20">
                  <div className="text-terminal-white">{item.symbol}</div>
                  <div className="text-terminal-cyan text-right">{item.shares}</div>
                  <div className="text-terminal-gray text-right">${item.avgCost.toFixed(2)}</div>
                  <div className="text-terminal-white text-right">${item.currentPrice.toFixed(2)}</div>
                  <div className="text-terminal-cyan text-right">${item.marketValue.toLocaleString()}</div>
                  <div className={`text-right ${item.gainLoss >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    ${Math.abs(item.gainLoss).toLocaleString()}
                  </div>
                  <div className={`text-right ${item.gainLossPercent >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {item.gainLossPercent >= 0 ? '+' : ''}{item.gainLossPercent.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="news" className="flex-1 p-4">
          <div className="terminal-panel h-full">
            <div className="panel-header">MARKET NEWS</div>
            <div className="panel-content">
              {newsData.map((item, index) => (
                <div key={index} className="py-2 border-b border-border/20">
                  <div className="flex justify-between items-start">
                    <span className="text-terminal-white text-sm">{item.headline}</span>
                    <span className="text-terminal-amber text-xs">{item.time}</span>
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.impact === 'high' ? 'bg-terminal-red/20 text-terminal-red' :
                      item.impact === 'medium' ? 'bg-terminal-amber/20 text-terminal-amber' :
                      'bg-terminal-green/20 text-terminal-green'
                    }`}>
                      {item.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="flex-1 p-4">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <ScatterAnalysis />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <MarketPieChart />
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="research" className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="terminal-panel">
              <div className="panel-header">SECTOR PERFORMANCE</div>
              <div className="panel-content">
                {sectorData.map((sector, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{sector.sector}</div>
                    <div className={getChangeColor(sector.change)}>
                      {formatChange(sector.change)}%
                    </div>
                    <div className="text-terminal-gray">
                      Vol: {(sector.volume / 1000000).toFixed(1)}M
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="terminal-panel">
              <div className="panel-header">WATCHLIST</div>
              <div className="panel-content">
                {stockData.slice(0, 6).map((stock, index) => (
                  <div key={index} className="data-row">
                    <div className="symbol">{stock.symbol}</div>
                    <div className="price">${formatPrice(stock.price)}</div>
                    <div className={getChangeColor(stock.change)}>
                      {formatChange(stock.change)}
                    </div>
                    <div className={getChangeColor(stock.changePercent)}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ticker Tape */}
      <div className="ticker-tape">
        <div className="ticker-content">
          {stockData.map((stock, index) => (
            <div key={index} className="ticker-item">
              <span className="symbol">{stock.symbol}</span>
              <span className="price">${formatPrice(stock.price)}</span>
              <span className={getChangeColor(stock.change)}>
                {formatChange(stock.change)} ({formatPercent(stock.changePercent)})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketData;