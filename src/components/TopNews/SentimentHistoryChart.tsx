import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, Bar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Calendar, BarChart3, 
  ChevronDown, Loader2, Database
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';

interface DailySentiment {
  date: string;
  displayDate: string;
  sentiment_mean: number;
  news_count: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  is_spike: boolean;
}

interface SentimentHistoryChartProps {
  pinnedAssets: { symbol: string }[];
  rawNews: Array<{
    id: string;
    title: string;
    sentiment?: string;
    timestamp: number;
    source?: string;
  }>;
  onSpikeDetected?: (spike: SpikeAlert) => void;
}

export interface SpikeAlert {
  type: 'volume' | 'sentiment_shift';
  severity: 'warning' | 'critical';
  message: string;
  date: string;
  value: number;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload as DailySentiment;
  
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-3 h-3 text-zinc-500" />
        <span className="text-xs text-zinc-400">{data.date}</span>
      </div>
      <div className="space-y-1">
        <div className={`text-sm font-medium ${
          data.sentiment_mean > 0 ? 'text-emerald-400' : 
          data.sentiment_mean < 0 ? 'text-red-400' : 'text-zinc-400'
        }`}>
          Sentiment: {data.sentiment_mean > 0 ? '+' : ''}{data.sentiment_mean.toFixed(2)}
        </div>
        <div className="text-xs text-zinc-500">📰 News: {data.news_count}</div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-emerald-400">↑{data.bullish_count}</span>
          <span className="text-zinc-500">→{data.neutral_count}</span>
          <span className="text-red-400">↓{data.bearish_count}</span>
        </div>
        {data.is_spike && (
          <div className="text-xs text-orange-400 font-medium mt-1">⚠️ Volume Spike!</div>
        )}
      </div>
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.is_spike) {
    return <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="#ea580c" strokeWidth={2} className="animate-pulse" />;
  }
  return (
    <circle cx={cx} cy={cy} r={4} 
      fill={payload.sentiment_mean > 0 ? '#10b981' : payload.sentiment_mean < 0 ? '#ef4444' : '#6366f1'} 
      stroke="transparent" />
  );
};

export const SentimentHistoryChart: React.FC<SentimentHistoryChartProps> = ({
  pinnedAssets,
  rawNews,
  onSpikeDetected
}) => {
  const [selectedAsset, setSelectedAsset] = useState('ALL');
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<DailySentiment[]>([]);
  const [dataSource, setDataSource] = useState<'db' | 'local'>('db');
  const spikeNotifiedRef = useRef<Set<string>>(new Set());

  // Fetch sentiment history from database
  useEffect(() => {
    let cancelled = false;
    
    const fetchFromDB = async () => {
      setLoading(true);
      try {
        // Query news_history grouped by date
        const daysAgo = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: newsHistory, error } = await supabase
          .from('news_history')
          .select('title, sentiment, timestamp, source, related_assets, created_at')
          .gte('created_at', daysAgo)
          .order('created_at', { ascending: false })
          .limit(1000);
        
        if (cancelled) return;
        
        if (error || !newsHistory || newsHistory.length === 0) {
          // Fallback to local rawNews
          console.log('📊 Sentiment: Using local news data (no DB history)');
          setDataSource('local');
          buildChartFromLocalNews();
          return;
        }
        
        console.log(`📊 Sentiment: Loaded ${newsHistory.length} news from DB`);
        setDataSource('db');
        
        // Filter by asset if selected
        let filtered = newsHistory;
        if (selectedAsset !== 'ALL') {
          filtered = newsHistory.filter((n: any) => {
            const assets = n.related_assets as string[] | null;
            return assets?.includes(selectedAsset) || 
              n.title?.toLowerCase().includes(selectedAsset.toLowerCase());
          });
        }
        
        // Group by date
        const byDate = new Map<string, typeof filtered>();
        for (let i = timeRange - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          const key = d.toISOString().split('T')[0];
          byDate.set(key, []);
        }
        
        filtered.forEach((item: any) => {
          const dateKey = new Date(item.created_at).toISOString().split('T')[0];
          if (byDate.has(dateKey)) {
            byDate.get(dateKey)!.push(item);
          }
        });
        
        // Calculate daily sentiment
        const allCounts = Array.from(byDate.values()).map(d => d.length);
        const avgCount = allCounts.reduce((a, b) => a + b, 0) / Math.max(allCounts.length, 1);
        const stdCount = allCounts.length > 1
          ? Math.sqrt(allCounts.reduce((sum, val) => sum + Math.pow(val - avgCount, 2), 0) / allCounts.length)
          : 1;
        
        const result: DailySentiment[] = [];
        byDate.forEach((dayNews, dateKey) => {
          const date = new Date(dateKey);
          const displayDate = `${date.getDate()}/${date.getMonth() + 1}`;
          
          let bullish = 0, bearish = 0, neutral = 0;
          dayNews.forEach((item: any) => {
            if (item.sentiment === 'bullish') bullish++;
            else if (item.sentiment === 'bearish') bearish++;
            else neutral++;
          });
          
          const total = dayNews.length || 1;
          const sentiment_mean = (bullish - bearish) / total;
          const zScore = stdCount > 0 ? (dayNews.length - avgCount) / stdCount : 0;
          
          result.push({
            date: dateKey,
            displayDate,
            sentiment_mean: Math.round(sentiment_mean * 100) / 100,
            news_count: dayNews.length,
            bullish_count: bullish,
            bearish_count: bearish,
            neutral_count: neutral,
            is_spike: zScore > 2,
          });
        });
        
        setChartData(result);
      } catch (err) {
        console.warn('Sentiment DB fetch failed:', err);
        setDataSource('local');
        buildChartFromLocalNews();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    const buildChartFromLocalNews = () => {
      const dayMs = 24 * 60 * 60 * 1000;
      const result: DailySentiment[] = [];
      
      // Filter by asset
      let filtered = rawNews;
      if (selectedAsset !== 'ALL') {
        filtered = rawNews.filter(n => 
          n.title.toLowerCase().includes(selectedAsset.toLowerCase())
        );
      }
      
      const byDate = new Map<string, typeof filtered>();
      for (let i = timeRange - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * dayMs);
        byDate.set(d.toISOString().split('T')[0], []);
      }
      
      filtered.forEach(item => {
        const dateKey = new Date(item.timestamp).toISOString().split('T')[0];
        if (byDate.has(dateKey)) byDate.get(dateKey)!.push(item);
      });
      
      const allCounts = Array.from(byDate.values()).map(d => d.length);
      const avgCount = allCounts.reduce((a, b) => a + b, 0) / Math.max(allCounts.length, 1);
      const stdCount = Math.max(Math.sqrt(allCounts.reduce((sum, val) => sum + Math.pow(val - avgCount, 2), 0) / Math.max(allCounts.length, 1)), 1);
      
      byDate.forEach((dayNews, dateKey) => {
        const date = new Date(dateKey);
        let bullish = 0, bearish = 0, neutral = 0;
        dayNews.forEach(n => {
          if (n.sentiment === 'bullish') bullish++;
          else if (n.sentiment === 'bearish') bearish++;
          else neutral++;
        });
        const total = dayNews.length || 1;
        result.push({
          date: dateKey,
          displayDate: `${date.getDate()}/${date.getMonth() + 1}`,
          sentiment_mean: Math.round(((bullish - bearish) / total) * 100) / 100,
          news_count: dayNews.length,
          bullish_count: bullish,
          bearish_count: bearish,
          neutral_count: neutral,
          is_spike: stdCount > 0 ? ((dayNews.length - avgCount) / stdCount) > 2 : false,
        });
      });
      
      setChartData(result);
      setLoading(false);
    };
    
    fetchFromDB();
    return () => { cancelled = true; };
  }, [timeRange, selectedAsset, rawNews.length]);

  // Spike detection (debounced, only once per spike)
  useEffect(() => {
    if (!onSpikeDetected || chartData.length === 0) return;
    const spikes = chartData.filter(d => d.is_spike);
    spikes.forEach(spike => {
      const key = `${spike.date}-${spike.news_count}`;
      if (!spikeNotifiedRef.current.has(key)) {
        spikeNotifiedRef.current.add(key);
        onSpikeDetected({
          type: 'volume',
          severity: spike.news_count > 50 ? 'critical' : 'warning',
          message: `News volume spike: ${spike.news_count} articles on ${spike.date}`,
          date: spike.date,
          value: spike.news_count
        });
      }
    });
  }, [chartData]);

  const stats = useMemo(() => {
    const totalNews = chartData.reduce((sum, d) => sum + d.news_count, 0);
    const avgSentiment = chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.sentiment_mean, 0) / chartData.length : 0;
    const totalBullish = chartData.reduce((sum, d) => sum + d.bullish_count, 0);
    const totalBearish = chartData.reduce((sum, d) => sum + d.bearish_count, 0);
    const totalNeutral = chartData.reduce((sum, d) => sum + d.neutral_count, 0);
    const spikeDays = chartData.filter(d => d.is_spike).length;
    
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + d.sentiment_mean, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + d.sentiment_mean, 0) / secondHalf.length : 0;
    
    return { totalNews, avgSentiment, totalBullish, totalBearish, totalNeutral, spikeDays, trend: secondAvg - firstAvg };
  }, [chartData]);

  return (
    <Card className="p-4 bg-zinc-900/50 border-zinc-800 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-white">Sentiment Trend ({timeRange} Days)</h3>
          <Badge variant="outline" className={`text-[10px] ${
            dataSource === 'db' ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-600 text-zinc-400'
          }`}>
            <Database className="w-3 h-3 mr-1" />
            {dataSource === 'db' ? 'Live DB' : 'Session'}
          </Badge>
          {stats.trend !== 0 && (
            <Badge variant="outline" className={`text-[10px] ml-1 ${
              stats.trend > 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
            }`}>
              {stats.trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {stats.trend > 0 ? '+' : ''}{(stats.trend * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
            {([7, 14, 30] as const).map((days) => (
              <button key={days} onClick={() => setTimeRange(days)}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  timeRange === days ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}>{days}D</button>
            ))}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[10px] border-zinc-700 text-zinc-400">
                {selectedAsset === 'ALL' ? 'All Assets' : selectedAsset}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => setSelectedAsset('ALL')}>All Assets</DropdownMenuItem>
              {pinnedAssets.map(asset => (
                <DropdownMenuItem key={asset.symbol} onClick={() => setSelectedAsset(asset.symbol)}>
                  {asset.symbol}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : chartData.every(d => d.news_count === 0) ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-zinc-600 text-sm">
          <Database className="w-8 h-8 mb-2 opacity-50" />
          <p>Building sentiment history...</p>
          <p className="text-[10px] mt-1">Data will accumulate as news is fetched</p>
        </div>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="displayDate" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#27272a' }} />
              <YAxis domain={[-1, 1]} tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#27272a' }} tickFormatter={(v) => v.toFixed(1)} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
              <Bar dataKey="news_count" fill="#3f3f46" opacity={0.3} yAxisId="right" />
              <Area type="monotone" dataKey="sentiment_mean" fill="url(#sentimentGradient)" stroke="transparent" />
              <Line type="monotone" dataKey="sentiment_mean" stroke="#8b5cf6" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 6, fill: '#a855f7' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-emerald-400">📈 {stats.totalBullish} ({stats.totalNews > 0 ? ((stats.totalBullish/stats.totalNews)*100).toFixed(0) : 0}%)</span>
          <span className="text-zinc-500">⚪ {stats.totalNeutral}</span>
          <span className="text-red-400">📉 {stats.totalBearish} ({stats.totalNews > 0 ? ((stats.totalBearish/stats.totalNews)*100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>📰 {stats.totalNews} total</span>
          {stats.spikeDays > 0 && <span className="text-orange-400">🔥 {stats.spikeDays} spike days</span>}
        </div>
      </div>
    </Card>
  );
};

export default SentimentHistoryChart;
