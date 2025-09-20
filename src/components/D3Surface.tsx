import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Play, Pause, BarChart3 } from 'lucide-react';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
}

interface D3SurfaceProps {
  trades: Trade[];
  ticker?: string;
}

interface SurfaceSettings {
  chartType: 'performance' | 'risk' | 'allocation';
  timeframe: 'daily' | 'weekly' | 'monthly';
  showVolume: boolean;
  animate: boolean;
}

export function D3Surface({ trades, ticker }: D3SurfaceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [settings, setSettings] = useState<SurfaceSettings>({
    chartType: 'performance',
    timeframe: 'daily',
    showVolume: true,
    animate: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  // Calculate portfolio performance metrics
  const calculatePortfolioMetrics = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    if (closedTrades.length === 0) return [];

    // Group trades by date for time series
    const tradesByDate = new Map<string, Trade[]>();
    closedTrades.forEach(trade => {
      const date = trade.date;
      if (!tradesByDate.has(date)) {
        tradesByDate.set(date, []);
      }
      tradesByDate.get(date)!.push(trade);
    });

    // Calculate metrics for each date
    let cumulativePnL = 0;
    const metrics = Array.from(tradesByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateTrades], index) => {
        const dayPnL = dateTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        cumulativePnL += dayPnL;
        
        const wins = dateTrades.filter(t => t.pnl! > 0).length;
        const totalTrades = dateTrades.length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        
        // Calculate portfolio concentration (Herfindahl index)
        const symbolCounts = new Map<string, number>();
        dateTrades.forEach(t => {
          symbolCounts.set(t.symbol, (symbolCounts.get(t.symbol) || 0) + 1);
        });
        
        const concentration = Array.from(symbolCounts.values())
          .map(count => Math.pow(count / totalTrades, 2))
          .reduce((sum, val) => sum + val, 0);

        return {
          date,
          dayIndex: index,
          dayPnL,
          cumulativePnL,
          winRate,
          totalTrades,
          concentration: concentration * 100, // Convert to percentage
          riskScore: Math.max(0, 100 - winRate + (concentration * 50)), // Risk increases with lower win rate and higher concentration
          volume: totalTrades,
          symbols: Array.from(symbolCounts.keys())
        };
      });

    return metrics;
  };

  // Create D3 visualization
  const createVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!svg.node()) return;

    const containerWidth = 800;
    const containerHeight = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const data = calculatePortfolioMetrics();
    if (data.length === 0) return;

    svg
      .attr("width", containerWidth)
      .attr("height", containerHeight)
      .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales based on chart type
    let xScale: d3.ScaleTime<number, number>;
    let yScale: d3.ScaleLinear<number, number>;
    let colorScale: d3.ScaleSequential<string>;

    if (settings.chartType === 'performance') {
      // Performance surface: Time vs Cumulative P&L
      xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
        .range([0, width]);

      yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.cumulativePnL) as [number, number])
        .range([height, 0]);

      colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
        .domain(d3.extent(data, d => d.dayPnL) as [number, number]);

    } else if (settings.chartType === 'risk') {
      // Risk surface: Win Rate vs Risk Score
      xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
        .range([0, width]);

      yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

      colorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain(d3.extent(data, d => d.riskScore) as [number, number]);

    } else {
      // Allocation surface: Time vs Concentration
      xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)) as [Date, Date])
        .range([0, width]);

      yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

      colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(data, d => d.concentration) as [number, number]);
    }

    // Create gradient background for surface effect
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "surfaceGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", width).attr("y2", height);

    gradient.selectAll("stop")
      .data(data)
      .enter().append("stop")
      .attr("offset", (d, i) => `${(i / (data.length - 1)) * 100}%`)
      .attr("stop-color", d => {
        if (settings.chartType === 'performance') return colorScale(d.dayPnL);
        if (settings.chartType === 'risk') return colorScale(d.riskScore);
        return colorScale(d.concentration);
      })
      .attr("stop-opacity", 0.6);

    // Create area chart for surface
    const area = d3.area<typeof data[0]>()
      .x(d => xScale(new Date(d.date)))
      .y0(height)
      .y1(d => {
        if (settings.chartType === 'performance') return yScale(d.cumulativePnL);
        if (settings.chartType === 'risk') return yScale(d.winRate);
        return yScale(100 - d.concentration);
      })
      .curve(d3.curveCatmullRom);

    // Add surface area
    g.append("path")
      .datum(data)
      .attr("fill", "url(#surfaceGradient)")
      .attr("d", area);

    // Add data points with varying sizes based on volume
    const radiusScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.volume) as [number, number])
      .range([3, 12]);

    const circles = g.selectAll(".data-point")
      .data(data)
      .enter().append("circle")
      .attr("class", "data-point")
      .attr("cx", d => xScale(new Date(d.date)))
      .attr("cy", d => {
        if (settings.chartType === 'performance') return yScale(d.cumulativePnL);
        if (settings.chartType === 'risk') return yScale(d.winRate);
        return yScale(100 - d.concentration);
      })
      .attr("r", settings.showVolume ? d => radiusScale(d.volume) : 4)
      .attr("fill", d => {
        if (settings.chartType === 'performance') return colorScale(d.dayPnL);
        if (settings.chartType === 'risk') return colorScale(d.riskScore);
        return colorScale(d.concentration);
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("opacity", 0.8);

    // Add axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%m/%d"));
    const yAxis = d3.axisLeft(yScale).ticks(6);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .attr("class", "axis-text");

    g.append("g")
      .call(yAxis)
      .attr("class", "axis-text");

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#9CA3AF")
      .text(() => {
        if (settings.chartType === 'performance') return "Cumulative P&L ($)";
        if (settings.chartType === 'risk') return "Win Rate (%)";
        return "Portfolio Diversity (%)";
      });

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#9CA3AF")
      .text("Date");

    // Add tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "12px")
      .style("z-index", 1000);

    circles
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`
          <div><strong>${d.date}</strong></div>
          <div>Trades: ${d.totalTrades}</div>
          <div>Day P&L: $${d.dayPnL.toFixed(2)}</div>
          <div>Cumulative: $${d.cumulativePnL.toFixed(2)}</div>
          <div>Win Rate: ${d.winRate.toFixed(1)}%</div>
          <div>Symbols: ${d.symbols.join(', ')}</div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Animation
    if (settings.animate && isAnimating) {
      circles
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .style("opacity", 0.8);

      g.select("path")
        .style("opacity", 0)
        .transition()
        .duration(1500)
        .style("opacity", 1);
    }

    // Cleanup function to remove tooltip
    return () => {
      d3.select(".d3-tooltip").remove();
    };
  };

  useEffect(() => {
    const cleanup = createVisualization();
    return cleanup;
  }, [trades, settings, isAnimating]);

  const handleSettingChange = (key: keyof SurfaceSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              D3 Portfolio Analytics
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive 3D-style visualization of portfolio performance, risk, and allocation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAnimating(!isAnimating)}
            >
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showSettings && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Chart Type</label>
                <select
                  value={settings.chartType}
                  onChange={(e) => handleSettingChange('chartType', e.target.value)}
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="performance">Performance Surface</option>
                  <option value="risk">Risk Analysis</option>
                  <option value="allocation">Asset Allocation</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Timeframe</label>
                <select
                  value={settings.timeframe}
                  onChange={(e) => handleSettingChange('timeframe', e.target.value)}
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showVolume"
                  checked={settings.showVolume}
                  onChange={(e) => handleSettingChange('showVolume', e.target.checked)}
                />
                <label htmlFor="showVolume" className="text-sm">Show Volume (Size)</label>
              </div>
            </div>
          </div>
        )}

        <div className="w-full h-[400px] flex items-center justify-center">
          <svg ref={svgRef} className="w-full h-full"></svg>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-muted/30 p-3 rounded">
            <div className="font-medium text-primary">Performance</div>
            <div className="text-muted-foreground">Time-based P&L progression with daily performance coloring</div>
          </div>
          <div className="bg-muted/30 p-3 rounded">
            <div className="font-medium text-primary">Risk Analysis</div>
            <div className="text-muted-foreground">Win rate vs risk score with concentration metrics</div>
          </div>
          <div className="bg-muted/30 p-3 rounded">
            <div className="font-medium text-primary">Asset Allocation</div>
            <div className="text-muted-foreground">Portfolio diversity and symbol concentration over time</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          • Hover over data points for detailed information
          • Point size represents trading volume
          • Colors indicate performance metrics
          • Switch between different analysis modes using settings
        </div>
      </CardContent>
    </Card>
  );
}

export default D3Surface;