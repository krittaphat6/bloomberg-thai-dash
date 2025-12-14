import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, Treemap,
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Loader2 } from 'lucide-react';

interface COTPosition {
  asset: string;
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialNet: number;
  nonReportableLong: number;
  nonReportableShort: number;
  nonReportableNet: number;
  openInterest: number;
  change: number;
  date: string;
}

// Custom Treemap Content Component
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, size, net } = props;
  
  const getColor = (netValue: number) => {
    if (netValue > 0) return 'hsl(142, 100%, 50%)';
    if (netValue < 0) return 'hsl(0, 70%, 60%)';
    return 'hsl(0, 0%, 50%)';
  };
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: getColor(net),
          stroke: '#fff',
          strokeWidth: 2,
          fillOpacity: 0.7
        }}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 5}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
          >
            {(size / 1000).toFixed(0)}K
          </text>
        </>
      )}
    </g>
  );
};

const COTData = () => {
  const [cotData, setCOTData] = useState<COTPosition[]>([]);
  const [historicalData, setHistoricalData] = useState<COTPosition[]>([]);
  const [selectedAsset, setSelectedAsset] = useState('GOLD - COMMODITY EXCHANGE INC.');
  const [selectedCategory, setSelectedCategory] = useState('futures');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedView, setSelectedView] = useState<'table' | 'bar' | 'pie' | 'treemap' | 'historical'>('table');

  // Fetch real COT data from CFTC API
  const fetchRealCOTData = async (asset: string, startDate: string, endDate: string): Promise<COTPosition[]> => {
    const apiUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?market_and_exchange_names=${encodeURIComponent(asset)}&$where=report_date_as_yyyy_mm_dd between '${startDate}' and '${endDate}'&$order=report_date_as_yyyy_mm_dd DESC&$limit=500`;
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('CFTC API Error');
      const data = await response.json();
      
      return data.map((item: any) => {
        const commLong = parseInt(item.comm_positions_long_all || 0);
        const commShort = parseInt(item.comm_positions_short_all || 0);
        const nonCommLong = parseInt(item.noncomm_positions_long_all || 0);
        const nonCommShort = parseInt(item.noncomm_positions_short_all || 0);
        const nonReptLong = parseInt(item.nonrept_positions_long_all || 0);
        const nonReptShort = parseInt(item.nonrept_positions_short_all || 0);
        
        return {
          asset: item.market_and_exchange_names,
          commercialLong: commLong,
          commercialShort: commShort,
          commercialNet: commLong - commShort,
          nonCommercialLong: nonCommLong,
          nonCommercialShort: nonCommShort,
          nonCommercialNet: nonCommLong - nonCommShort,
          nonReportableLong: nonReptLong,
          nonReportableShort: nonReptShort,
          nonReportableNet: nonReptLong - nonReptShort,
          openInterest: parseInt(item.open_interest_all || 0),
          change: parseFloat(item.change_in_comm_long_all || 0),
          date: item.report_date_as_yyyy_mm_dd
        };
      });
    } catch (error) {
      console.error('CFTC fetch error:', error);
      return [];
    }
  };

  // Fetch multiple assets for current data
  const fetchMultipleAssets = async () => {
    const assets = [
      'GOLD - COMMODITY EXCHANGE INC.',
      'SILVER - COMMODITY EXCHANGE INC.',
      'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE',
      'EURO FX - CHICAGO MERCANTILE EXCHANGE',
      'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE',
      'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
      'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
      'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
      'NASDAQ-100 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE',
      'S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE'
    ];

    setLoading(true);
    const allData: COTPosition[] = [];

    for (const asset of assets) {
      const data = await fetchRealCOTData(asset, dateRange.start, dateRange.end);
      if (data.length > 0) {
        allData.push(data[0]); // Get latest data
      }
    }

    setCOTData(allData);
    setLoading(false);
  };

  // Load historical data for selected asset
  const loadHistoricalData = async () => {
    setLoading(true);
    const data = await fetchRealCOTData(selectedAsset, dateRange.start, dateRange.end);
    setHistoricalData(data.reverse()); // Oldest first for charts
    setLoading(false);
  };

  useEffect(() => {
    fetchMultipleAssets();
  }, []);

  useEffect(() => {
    if (selectedView === 'historical') {
      loadHistoricalData();
    }
  }, [selectedAsset, dateRange, selectedView]);

  // Helper functions
  const formatNumber = (num: number) => num.toLocaleString();
  
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-amber-500';
  };

  const getNetColor = (net: number) => {
    return net >= 0 ? 'text-green-500' : 'text-red-500';
  };

  // Chart colors
  const CHART_COLORS = ['hsl(142, 100%, 50%)', 'hsl(200, 100%, 50%)', 'hsl(30, 100%, 50%)', 'hsl(300, 100%, 50%)', 'hsl(180, 100%, 50%)', 'hsl(60, 100%, 50%)'];

  // Export CSV
  const exportCSV = () => {
    const headers = ['Asset', 'Date', 'Comm Long', 'Comm Short', 'Comm Net', 'Large Long', 'Large Short', 'Large Net', 'Small Net', 'Open Interest', 'Change %'];
    const rows = cotData.map(d => [
      d.asset, d.date, d.commercialLong, d.commercialShort, d.commercialNet,
      d.nonCommercialLong, d.nonCommercialShort, d.nonCommercialNet,
      d.nonReportableNet, d.openInterest, d.change.toFixed(2)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COT_Data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground p-3">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-border mb-2">
        <span className="font-bold text-primary">📋 COT REPORT - COMMITMENT OF TRADERS</span>
        
        <div className="flex gap-2 items-center">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background border border-border text-xs px-2 py-1 rounded"
          >
            <option value="futures">Futures Only</option>
            <option value="combined">Futures & Options</option>
            <option value="disaggregated">Disaggregated</option>
          </select>

          <Button size="sm" variant="outline" onClick={fetchMultipleAssets} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Refresh
          </Button>

          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-2">
            <TabsTrigger value="table">📋 Table</TabsTrigger>
            <TabsTrigger value="bar">📊 Bar</TabsTrigger>
            <TabsTrigger value="pie">🥧 Pie</TabsTrigger>
            <TabsTrigger value="treemap">🗺️ Map</TabsTrigger>
            <TabsTrigger value="historical">📈 History</TabsTrigger>
          </TabsList>

          {/* 1. TABLE VIEW */}
          <TabsContent value="table" className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b border-primary/30">
                    <tr>
                      <th className="text-left py-2 px-2">Asset</th>
                      <th className="text-right px-2">Comm Long</th>
                      <th className="text-right px-2">Comm Short</th>
                      <th className="text-right px-2">Comm Net</th>
                      <th className="text-right px-2">Large Long</th>
                      <th className="text-right px-2">Large Short</th>
                      <th className="text-right px-2">Large Net</th>
                      <th className="text-right px-2">Small Net</th>
                      <th className="text-right px-2">Open Int</th>
                      <th className="text-right px-2">Change %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotData.map((item, i) => (
                      <tr 
                        key={i} 
                        className="border-b border-border/10 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setSelectedAsset(item.asset);
                          setSelectedView('historical');
                        }}
                      >
                        <td className="py-2 px-2 text-foreground font-medium">
                          {item.asset.split(' - ')[0]}
                        </td>
                        <td className="text-right px-2 text-cyan-400">{formatNumber(item.commercialLong)}</td>
                        <td className="text-right px-2 text-cyan-400">{formatNumber(item.commercialShort)}</td>
                        <td className={`text-right px-2 font-bold ${getNetColor(item.commercialNet)}`}>
                          {formatNumber(item.commercialNet)}
                        </td>
                        <td className="text-right px-2 text-blue-400">{formatNumber(item.nonCommercialLong)}</td>
                        <td className="text-right px-2 text-blue-400">{formatNumber(item.nonCommercialShort)}</td>
                        <td className={`text-right px-2 font-bold ${getNetColor(item.nonCommercialNet)}`}>
                          {formatNumber(item.nonCommercialNet)}
                        </td>
                        <td className={`text-right px-2 font-bold ${getNetColor(item.nonReportableNet)}`}>
                          {formatNumber(item.nonReportableNet)}
                        </td>
                        <td className="text-right px-2 text-muted-foreground">{formatNumber(item.openInterest)}</td>
                        <td className={`text-right px-2 font-bold ${getChangeColor(item.change)}`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* 2. BAR CHART VIEW */}
          <TabsContent value="bar" className="flex-1">
            <div className="h-full">
              <h3 className="text-sm font-bold text-primary mb-2">
                Commercial vs Non-Commercial Positions
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={cotData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey={(d) => d.asset.split(' - ')[0]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--primary))' }}
                    formatter={(value: any) => formatNumber(value)}
                  />
                  <Legend />
                  <Bar 
                    dataKey="commercialNet" 
                    fill="hsl(30, 100%, 50%)" 
                    name="Commercial Net"
                  />
                  <Bar 
                    dataKey="nonCommercialNet" 
                    fill="hsl(180, 100%, 50%)" 
                    name="Large Traders Net"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* 3. PIE CHART VIEW */}
          <TabsContent value="pie" className="flex-1">
            <div className="h-full">
              <h3 className="text-sm font-bold text-cyan-400 mb-2">
                Open Interest Distribution
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={cotData}
                    dataKey="openInterest"
                    nameKey={(d) => d.asset.split(' - ')[0]}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry) => `${entry.asset.split(' - ')[0]}: ${((entry.openInterest / cotData.reduce((sum, d) => sum + d.openInterest, 0)) * 100).toFixed(1)}%`}
                    labelLine={true}
                  >
                    {cotData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))' }}
                    formatter={(value: any) => formatNumber(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* 4. TREEMAP VIEW */}
          <TabsContent value="treemap" className="flex-1">
            <div className="h-full">
              <h3 className="text-sm font-bold text-amber-400 mb-2">
                Position Size Breakdown (Green = Long, Red = Short)
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <Treemap
                  data={cotData.map(d => ({
                    name: d.asset.split(' - ')[0],
                    size: d.openInterest,
                    net: d.nonCommercialNet
                  }))}
                  dataKey="size"
                  aspectRatio={4/3}
                  stroke="#fff"
                  content={<CustomTreemapContent />}
                >
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))' }}
                    formatter={(value: any) => formatNumber(value)}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* 5. HISTORICAL VIEW */}
          <TabsContent value="historical" className="flex-1">
            <div className="h-full flex flex-col">
              {/* Controls */}
              <div className="flex gap-2 mb-2 flex-wrap">
                <select 
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="bg-background border border-border text-xs px-2 py-1 flex-1 min-w-[150px] rounded"
                >
                  <option value="GOLD - COMMODITY EXCHANGE INC.">GOLD</option>
                  <option value="SILVER - COMMODITY EXCHANGE INC.">SILVER</option>
                  <option value="CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE">CRUDE OIL</option>
                  <option value="EURO FX - CHICAGO MERCANTILE EXCHANGE">EUR</option>
                  <option value="BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE">GBP</option>
                  <option value="JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE">JPY</option>
                  <option value="S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE">S&P 500</option>
                  <option value="NASDAQ-100 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE">NASDAQ</option>
                </select>

                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-background border border-border text-xs px-2 py-1 rounded"
                />
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-background border border-border text-xs px-2 py-1 rounded"
                />

                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDateRange({
                    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  })}>3M</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDateRange({
                    start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  })}>6M</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDateRange({
                    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  })}>1Y</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDateRange({
                    start: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  })}>2Y</Button>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="flex-1 grid grid-rows-2 gap-2">
                  {/* Net Positions */}
                  <div>
                    <h4 className="text-xs font-bold text-green-400 mb-1">
                      Net Positions Over Time ({historicalData.length} reports)
                    </h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', fontSize: '11px' }} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="commercialNet" 
                          stroke="hsl(142, 100%, 50%)" 
                          strokeWidth={2}
                          name="Commercial Net"
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="nonCommercialNet" 
                          stroke="hsl(200, 100%, 50%)" 
                          strokeWidth={2}
                          name="Large Traders Net"
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="nonReportableNet" 
                          stroke="hsl(30, 100%, 50%)" 
                          strokeWidth={2}
                          name="Small Traders Net"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Open Interest */}
                  <div>
                    <h4 className="text-xs font-bold text-cyan-400 mb-1">Open Interest Trend</h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient id="oiGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                        <Area 
                          type="monotone" 
                          dataKey="openInterest" 
                          stroke="hsl(180, 100%, 50%)" 
                          fillOpacity={1} 
                          fill="url(#oiGradient)"
                          name="Open Interest"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default COTData;
