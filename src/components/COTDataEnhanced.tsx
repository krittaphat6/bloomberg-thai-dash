import { useState, useEffect, useMemo } from 'react';
import { COTHistoricalService, COTHistoricalData } from '@/services/COTHistoricalService';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar, Download, TrendingUp, TrendingDown, RefreshCw,
  BarChart3, LineChartIcon, Activity, Loader2
} from 'lucide-react';

const COTDataEnhanced = () => {
  const [selectedAsset, setSelectedAsset] = useState<string>('GOLD - COMMODITY EXCHANGE INC.');
  const [availableAssets, setAvailableAssets] = useState<string[]>([]);
  const [historicalData, setHistoricalData] = useState<COTHistoricalData[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    end: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<'positioning' | 'trends' | 'table'>('positioning');

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadHistoricalData();
    }
  }, [selectedAsset, dateRange]);

  const loadAssets = async () => {
    const assets = await COTHistoricalService.getAvailableAssets();
    setAvailableAssets(assets.length > 0 ? assets : COTHistoricalService.getDefaultAssets());
  };

  const loadHistoricalData = async () => {
    setLoading(true);
    const data = await COTHistoricalService.fetchHistoricalData(
      selectedAsset,
      dateRange.start,
      dateRange.end
    );
    setHistoricalData(data);
    setLoading(false);
  };

  const cotIndex = useMemo(() => {
    return COTHistoricalService.calculateCOTIndex(historicalData);
  }, [historicalData]);

  const latestData = useMemo(() => {
    return historicalData[historicalData.length - 1];
  }, [historicalData]);

  const exportData = () => {
    const csv = COTHistoricalService.exportToCSV(historicalData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COT_${selectedAsset.split(' ')[0]}_${dateRange.start.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setDateRange({ start, end });
  };

  const formatAssetName = (name: string) => {
    const parts = name.split(' - ');
    return parts[0].length > 20 ? parts[0].substring(0, 20) + '...' : parts[0];
  };

  return (
    <Card className="w-full h-full bg-card border-primary/30 flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2 text-primary text-sm">
            <BarChart3 className="w-4 h-4" />
            COT HISTORICAL DATA
            <Badge variant="outline" className="text-[9px]">
              {historicalData.length} reports
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={exportData}
              disabled={historicalData.length === 0}
              className="h-6 text-[10px]"
            >
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={loadHistoricalData}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="bg-background border border-border text-xs px-2 py-1 rounded flex-1 min-w-[180px]"
          >
            {availableAssets.map(asset => (
              <option key={asset} value={asset}>{formatAssetName(asset)}</option>
            ))}
          </select>

          {/* Quick Range Buttons */}
          <div className="flex gap-1">
            {[3, 6, 12, 24, 60].map(months => (
              <Button
                key={months}
                size="sm"
                variant="ghost"
                onClick={() => setQuickRange(months)}
                className="h-6 text-[10px] px-2"
              >
                {months < 12 ? `${months}M` : `${months / 12}Y`}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-3 pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-full flex flex-col gap-3">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-background/50 p-2 rounded border border-border">
                <div className="text-[9px] text-muted-foreground">COT Index</div>
                <div className={`text-lg font-bold ${
                  cotIndex > 70 ? 'text-green-500' :
                  cotIndex < 30 ? 'text-red-500' :
                  'text-yellow-500'
                }`}>
                  {cotIndex.toFixed(0)}
                </div>
                <div className="text-[8px] text-muted-foreground">
                  {cotIndex > 70 ? 'Very Bullish' :
                   cotIndex > 50 ? 'Bullish' :
                   cotIndex < 30 ? 'Very Bearish' : 'Bearish'}
                </div>
              </div>

              <div className="bg-background/50 p-2 rounded border border-border">
                <div className="text-[9px] text-muted-foreground">Large Traders Net</div>
                <div className={`text-sm font-bold flex items-center gap-1 ${
                  (latestData?.nonCommercialNet || 0) > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(latestData?.nonCommercialNet || 0) > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {(latestData?.nonCommercialNet || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-background/50 p-2 rounded border border-border">
                <div className="text-[9px] text-muted-foreground">Commercial Net</div>
                <div className={`text-sm font-bold ${
                  (latestData?.commercialNet || 0) > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {(latestData?.commercialNet || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-background/50 p-2 rounded border border-border">
                <div className="text-[9px] text-muted-foreground">Open Interest</div>
                <div className="text-sm font-bold text-cyan-500">
                  {(latestData?.openInterest || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 h-7">
                <TabsTrigger value="positioning" className="text-[10px]">
                  <Activity className="w-3 h-3 mr-1" /> Positioning
                </TabsTrigger>
                <TabsTrigger value="trends" className="text-[10px]">
                  <LineChartIcon className="w-3 h-3 mr-1" /> Trends
                </TabsTrigger>
                <TabsTrigger value="table" className="text-[10px]">
                  <BarChart3 className="w-3 h-3 mr-1" /> Data
                </TabsTrigger>
              </TabsList>

              {/* Positioning View */}
              <TabsContent value="positioning" className="flex-1 mt-2">
                <div className="grid grid-cols-2 gap-3 h-full">
                  <div className="h-[200px]">
                    <div className="text-[10px] font-bold text-green-500 mb-1">Net Positions</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData.slice(-52)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 8 }} width={50} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', fontSize: '10px', border: '1px solid hsl(var(--border))' }} />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="commercialNet" stroke="#22c55e" strokeWidth={2} name="Commercial" dot={false} />
                        <Line type="monotone" dataKey="nonCommercialNet" stroke="#3b82f6" strokeWidth={2} name="Large Spec" dot={false} />
                        <Line type="monotone" dataKey="nonReportableNet" stroke="#f97316" strokeWidth={1} name="Small Spec" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-[200px]">
                    <div className="text-[10px] font-bold text-cyan-500 mb-1">Open Interest</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData.slice(-52)}>
                        <defs>
                          <linearGradient id="oiGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={40} />
                        <YAxis tick={{ fontSize: 8 }} width={50} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', fontSize: '10px', border: '1px solid hsl(var(--border))' }} />
                        <Area type="monotone" dataKey="openInterest" stroke="#06b6d4" fillOpacity={1} fill="url(#oiGradient)" name="Open Interest" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              {/* Trends View */}
              <TabsContent value="trends" className="flex-1 mt-2">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 8 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', fontSize: '10px', border: '1px solid hsl(var(--border))' }} />
                      <Legend wrapperStyle={{ fontSize: '9px' }} />
                      <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Line yAxisId="left" type="monotone" dataKey="commercialNet" stroke="#22c55e" strokeWidth={2} name="Commercial" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="nonCommercialNet" stroke="#3b82f6" strokeWidth={2} name="Speculators" dot={false} />
                      <Brush dataKey="date" height={20} stroke="#22c55e" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              {/* Table View */}
              <TabsContent value="table" className="flex-1 mt-2">
                <ScrollArea className="h-[220px]">
                  <table className="w-full text-[9px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="text-left p-1">Date</th>
                        <th className="text-right p-1">Comm Net</th>
                        <th className="text-right p-1">Large Net</th>
                        <th className="text-right p-1">Small Net</th>
                        <th className="text-right p-1">OI</th>
                        <th className="text-right p-1">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalData.slice().reverse().slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/50">
                          <td className="p-1">{row.date}</td>
                          <td className={`text-right p-1 ${row.commercialNet > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.commercialNet.toLocaleString()}
                          </td>
                          <td className={`text-right p-1 ${row.nonCommercialNet > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.nonCommercialNet.toLocaleString()}
                          </td>
                          <td className={`text-right p-1 ${row.nonReportableNet > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {row.nonReportableNet.toLocaleString()}
                          </td>
                          <td className="text-right p-1 text-cyan-500">{row.openInterest.toLocaleString()}</td>
                          <td className={`text-right p-1 ${row.change > 0 ? 'text-green-500' : row.change < 0 ? 'text-red-500' : ''}`}>
                            {row.change > 0 ? '+' : ''}{row.change.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default COTDataEnhanced;
