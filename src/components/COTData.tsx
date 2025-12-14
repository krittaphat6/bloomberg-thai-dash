import { useState, useEffect } from 'react';
import { RefreshCw, Download, AlertCircle, BarChart3, Table, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface COTPosition {
  asset: string;
  exchange: string;
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
  changeInOI: number;
  date: string;
  category: string;
}

interface HistoricalData {
  date: string;
  commercialNet: number;
  nonCommercialNet: number;
  nonReportableNet: number;
  openInterest: number;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const COTData = () => {
  const [cotData, setCOTData] = useState<COTPosition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'futures' | 'combined' | 'disaggregated'>('futures');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('table');
  
  // Historical state
  const [selectedAsset, setSelectedAsset] = useState('GOLD - COMMODITY EXCHANGE INC.');
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchCFTCData = async (reportType: 'futures' | 'combined' | 'disaggregated') => {
    setLoading(true);
    setError(null);

    try {
      const datasets = {
        futures: 'jun7-fc8e',
        combined: '6dca-aqww',
        disaggregated: '72hh-3qpy'
      };

      const dataset = datasets[reportType];
      const apiUrl = `https://publicreporting.cftc.gov/resource/${dataset}.json?$order=report_date_as_yyyy_mm_dd DESC&$limit=100`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`CFTC API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('No data received from CFTC');
      }

      const assetMap = new Map<string, any>();
      
      data.forEach((item: any) => {
        const assetName = item.market_and_exchange_names;
        if (!assetMap.has(assetName)) {
          assetMap.set(assetName, item);
        }
      });

      const positions: COTPosition[] = Array.from(assetMap.values()).map((item: any) => {
        const commLong = parseInt(item.comm_positions_long_all || item.prod_merc_positions_long_all || 0);
        const commShort = parseInt(item.comm_positions_short_all || item.prod_merc_positions_short_all || 0);
        const nonCommLong = parseInt(item.noncomm_positions_long_all || item.m_money_positions_long_all || 0);
        const nonCommShort = parseInt(item.noncomm_positions_short_all || item.m_money_positions_short_all || 0);
        const nonReptLong = parseInt(item.nonrept_positions_long_all || item.other_rept_positions_long_all || 0);
        const nonReptShort = parseInt(item.nonrept_positions_short_all || item.other_rept_positions_short_all || 0);

        let category = 'Other';
        const assetName = item.market_and_exchange_names.toUpperCase();
        
        if (assetName.includes('DOLLAR') || assetName.includes('EURO') || assetName.includes('YEN') || 
            assetName.includes('POUND') || assetName.includes('FRANC') || assetName.includes('PESO') ||
            assetName.includes('REAL')) {
          category = 'Currency';
        } else if (assetName.includes('GOLD') || assetName.includes('SILVER') || assetName.includes('COPPER') || 
                   assetName.includes('PLATINUM') || assetName.includes('PALLADIUM') || assetName.includes('OIL') || 
                   assetName.includes('GAS') || assetName.includes('GASOLINE')) {
          category = 'Commodity';
        } else if (assetName.includes('S&P') || assetName.includes('DOW') || assetName.includes('NASDAQ') || 
                   assetName.includes('RUSSELL') || assetName.includes('NIKKEI') || assetName.includes('INDEX')) {
          category = 'Index';
        } else if (assetName.includes('WHEAT') || assetName.includes('CORN') || assetName.includes('SOYBEAN') || 
                   assetName.includes('COTTON') || assetName.includes('SUGAR') || assetName.includes('COFFEE') ||
                   assetName.includes('COCOA') || assetName.includes('CATTLE') || assetName.includes('HOG')) {
          category = 'Agriculture';
        }

        return {
          asset: item.market_and_exchange_names,
          exchange: extractExchange(item.market_and_exchange_names),
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
          change: parseFloat(item.change_in_comm_long_all || item.change_in_prod_merc_long_all || 0),
          changeInOI: parseFloat(item.change_in_open_interest_all || 0),
          date: item.report_date_as_yyyy_mm_dd,
          category
        };
      });

      positions.sort((a, b) => {
        if (a.category !== b.category) {
          const order = ['Currency', 'Commodity', 'Index', 'Agriculture', 'Other'];
          return order.indexOf(a.category) - order.indexOf(b.category);
        }
        return a.asset.localeCompare(b.asset);
      });

      setCOTData(positions);
      setLastUpdate(new Date());

    } catch (err) {
      console.error('COT fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load COT data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    setHistoricalLoading(true);
    try {
      const apiUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?` +
        `market_and_exchange_names=${encodeURIComponent(selectedAsset)}&` +
        `$where=report_date_as_yyyy_mm_dd between '${dateRange.start}' and '${dateRange.end}'&` +
        `$order=report_date_as_yyyy_mm_dd ASC&$limit=500`;

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      
      const data = await response.json();
      
      const historical: HistoricalData[] = data.map((item: any) => ({
        date: item.report_date_as_yyyy_mm_dd,
        commercialNet: parseInt(item.comm_positions_long_all || 0) - parseInt(item.comm_positions_short_all || 0),
        nonCommercialNet: parseInt(item.noncomm_positions_long_all || 0) - parseInt(item.noncomm_positions_short_all || 0),
        nonReportableNet: parseInt(item.nonrept_positions_long_all || 0) - parseInt(item.nonrept_positions_short_all || 0),
        openInterest: parseInt(item.open_interest_all || 0)
      }));
      
      setHistoricalData(historical);
    } catch (err) {
      console.error('Historical fetch error:', err);
    } finally {
      setHistoricalLoading(false);
    }
  };

  const extractExchange = (assetName: string): string => {
    if (assetName.includes('CHICAGO MERCANTILE')) return 'CME';
    if (assetName.includes('CHICAGO BOARD')) return 'CBOT';
    if (assetName.includes('NEW YORK MERCANTILE')) return 'NYMEX';
    if (assetName.includes('COMMODITY EXCHANGE')) return 'COMEX';
    if (assetName.includes('ICE')) return 'ICE';
    return 'OTHER';
  };

  useEffect(() => {
    fetchCFTCData(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (activeTab === 'historical') {
      fetchHistoricalData();
    }
  }, [activeTab, selectedAsset, dateRange]);

  const formatNumber = (num: number) => num.toLocaleString();

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-amber-400';
  };

  const getNetColor = (net: number) => {
    return net >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const exportCSV = () => {
    const headers = [
      'Category', 'Asset', 'Exchange', 'Date',
      'Comm Long', 'Comm Short', 'Comm Net',
      'Large Long', 'Large Short', 'Large Net',
      'Small Long', 'Small Short', 'Small Net',
      'Open Interest', 'OI Change', 'Change %'
    ];

    const rows = cotData.map(d => [
      d.category, `"${d.asset}"`, d.exchange, d.date,
      d.commercialLong, d.commercialShort, d.commercialNet,
      d.nonCommercialLong, d.nonCommercialShort, d.nonCommercialNet,
      d.nonReportableLong, d.nonReportableShort, d.nonReportableNet,
      d.openInterest, d.changeInOI, d.change.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COT_${selectedCategory}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data for visualization
  const chartData = cotData.slice(0, 15).map(d => ({
    name: d.asset.split(' - ')[0].substring(0, 12),
    commercial: d.commercialNet,
    large: d.nonCommercialNet,
    small: d.nonReportableNet
  }));

  const pieData = [
    { name: 'Currency', value: cotData.filter(d => d.category === 'Currency').length },
    { name: 'Commodity', value: cotData.filter(d => d.category === 'Commodity').length },
    { name: 'Index', value: cotData.filter(d => d.category === 'Index').length },
    { name: 'Agriculture', value: cotData.filter(d => d.category === 'Agriculture').length },
    { name: 'Other', value: cotData.filter(d => d.category === 'Other').length }
  ].filter(d => d.value > 0);

  const availableAssets = [
    'GOLD - COMMODITY EXCHANGE INC.',
    'SILVER - COMMODITY EXCHANGE INC.',
    'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE',
    'EURO FX - CHICAGO MERCANTILE EXCHANGE',
    'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE',
    'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
    'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
    'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE',
    'S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE',
    'NASDAQ-100 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE'
  ];

  return (
    <div className="h-full flex flex-col text-xs bg-background p-2">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-green-500/30">
        <div className="flex flex-col">
          <span className="font-bold text-green-400">📋 COT REPORT - COMMITMENT OF TRADERS</span>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdate.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="bg-background border border-border text-green-400 text-xs px-2 py-1 rounded"
            disabled={loading}
          >
            <option value="futures">📊 Futures Only</option>
            <option value="combined">📈 Futures & Options</option>
            <option value="disaggregated">🔬 Disaggregated</option>
          </select>

          <Button size="sm" variant="outline" onClick={() => fetchCFTCData(selectedCategory)} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button size="sm" variant="outline" onClick={exportCSV} disabled={loading || cotData.length === 0}>
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-2 mb-2 flex items-center gap-2 text-red-400 text-xs mt-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-2">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="table" className="text-xs gap-1">
            <Table className="w-3 h-3" /> Table
          </TabsTrigger>
          <TabsTrigger value="charts" className="text-xs gap-1">
            <BarChart3 className="w-3 h-3" /> Charts
          </TabsTrigger>
          <TabsTrigger value="historical" className="text-xs gap-1">
            <History className="w-3 h-3" /> Historical
          </TabsTrigger>
        </TabsList>

        {/* Table Tab */}
        <TabsContent value="table" className="flex-1 overflow-auto mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-green-400" />
              <span className="ml-2 text-green-400">Loading COT data from CFTC...</span>
            </div>
          ) : cotData.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b border-green-500/30 z-10">
                <tr>
                  <th className="text-left py-2 px-2 text-amber-400">Category</th>
                  <th className="text-left py-2 px-2 text-amber-400">Asset</th>
                  <th className="text-left py-2 px-2 text-amber-400">Exch</th>
                  <th className="text-right py-2 px-2 text-amber-400">Comm Net</th>
                  <th className="text-right py-2 px-2 text-amber-400">Large Net</th>
                  <th className="text-right py-2 px-2 text-amber-400">Small Net</th>
                  <th className="text-right py-2 px-2 text-amber-400">Open Int</th>
                  <th className="text-right py-2 px-2 text-amber-400">OI Δ</th>
                </tr>
              </thead>
              <tbody>
                {cotData.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/10 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAsset(item.asset);
                      setActiveTab('historical');
                    }}
                  >
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.category === 'Currency' ? 'bg-blue-500/20 text-blue-400' :
                        item.category === 'Commodity' ? 'bg-amber-500/20 text-amber-400' :
                        item.category === 'Index' ? 'bg-purple-500/20 text-purple-400' :
                        item.category === 'Agriculture' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-foreground font-medium max-w-xs truncate" title={item.asset}>
                      {item.asset.split(' - ')[0]}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{item.exchange}</td>
                    <td className={`text-right py-2 px-2 font-bold ${getNetColor(item.commercialNet)}`}>
                      {item.commercialNet >= 0 ? '+' : ''}{formatNumber(item.commercialNet)}
                    </td>
                    <td className={`text-right py-2 px-2 font-bold ${getNetColor(item.nonCommercialNet)}`}>
                      {item.nonCommercialNet >= 0 ? '+' : ''}{formatNumber(item.nonCommercialNet)}
                    </td>
                    <td className={`text-right py-2 px-2 font-bold ${getNetColor(item.nonReportableNet)}`}>
                      {item.nonReportableNet >= 0 ? '+' : ''}{formatNumber(item.nonReportableNet)}
                    </td>
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {formatNumber(item.openInterest)}
                    </td>
                    <td className={`text-right py-2 px-2 ${getChangeColor(item.changeInOI)}`}>
                      {item.changeInOI >= 0 ? '+' : ''}{formatNumber(item.changeInOI)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="flex-1 overflow-auto mt-2">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Net Positions Bar Chart */}
            <div className="bg-card/50 p-3 rounded border border-border">
              <h3 className="text-sm font-bold text-green-400 mb-2">Net Positions by Asset</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="commercial" fill="#f59e0b" name="Commercial" />
                  <Bar dataKey="large" fill="#3b82f6" name="Large Traders" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution Pie */}
            <div className="bg-card/50 p-3 rounded border border-border">
              <h3 className="text-sm font-bold text-cyan-400 mb-2">Category Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Large Traders vs Commercial */}
            <div className="bg-card/50 p-3 rounded border border-border col-span-2">
              <h3 className="text-sm font-bold text-purple-400 mb-2">Commercial vs Large Traders Net Position</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="commercial" fill="#f59e0b" name="Commercial" />
                  <Bar dataKey="large" fill="#06b6d4" name="Large Traders" />
                  <Bar dataKey="small" fill="#8b5cf6" name="Small Traders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Historical Tab */}
        <TabsContent value="historical" className="flex-1 overflow-auto mt-2">
          {/* Controls */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="bg-background border border-border text-xs px-2 py-1 rounded flex-1 min-w-[200px]"
            >
              {availableAssets.map(asset => (
                <option key={asset} value={asset}>{asset.split(' - ')[0]}</option>
              ))}
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
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDateRange({
                start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>3M</Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDateRange({
                start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>6M</Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDateRange({
                start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>1Y</Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDateRange({
                start: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}>2Y</Button>
            </div>
          </div>

          {historicalLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-green-400" />
              <span className="ml-2 text-green-400">Loading historical data...</span>
            </div>
          ) : historicalData.length > 0 ? (
            <div className="space-y-4">
              {/* Net Positions Line Chart */}
              <div className="bg-card/50 p-3 rounded border border-border">
                <h3 className="text-sm font-bold text-green-400 mb-2">
                  {selectedAsset.split(' - ')[0]} - Net Positions Over Time
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="commercialNet" stroke="#f59e0b" strokeWidth={2} dot={false} name="Commercial" />
                    <Line type="monotone" dataKey="nonCommercialNet" stroke="#3b82f6" strokeWidth={2} dot={false} name="Large Traders" />
                    <Line type="monotone" dataKey="nonReportableNet" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Small Traders" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Open Interest Area Chart */}
              <div className="bg-card/50 p-3 rounded border border-border">
                <h3 className="text-sm font-bold text-cyan-400 mb-2">Open Interest Trend</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="oiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Area type="monotone" dataKey="openInterest" stroke="#06b6d4" fillOpacity={1} fill="url(#oiGradient)" name="Open Interest" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No historical data available for selected asset
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Stats Footer */}
      {!loading && cotData.length > 0 && (
        <div className="border-t border-green-500/30 pt-2 mt-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total: {cotData.length}</span>
            <span>
              📊 {cotData.filter(d => d.category === 'Currency').length} | 
              💎 {cotData.filter(d => d.category === 'Commodity').length} | 
              📈 {cotData.filter(d => d.category === 'Index').length} | 
              🌾 {cotData.filter(d => d.category === 'Agriculture').length}
            </span>
            <span>{cotData[0]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default COTData;
