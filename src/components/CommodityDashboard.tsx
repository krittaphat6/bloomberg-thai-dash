import { useState, useCallback, useEffect } from 'react';
import { useOpenBB } from '@/lib/openbb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, Flame } from 'lucide-react';

interface CommodityItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  category: 'energy' | 'metals' | 'agriculture';
  volume: number;
  sparkline: number[];
}

const COMMODITIES: { symbol: string; name: string; category: 'energy' | 'metals' | 'agriculture' }[] = [
  { symbol: 'CL=F', name: 'Crude Oil', category: 'energy' },
  { symbol: 'NG=F', name: 'Natural Gas', category: 'energy' },
  { symbol: 'RB=F', name: 'Gasoline', category: 'energy' },
  { symbol: 'HO=F', name: 'Heating Oil', category: 'energy' },
  { symbol: 'GC=F', name: 'Gold', category: 'metals' },
  { symbol: 'SI=F', name: 'Silver', category: 'metals' },
  { symbol: 'PL=F', name: 'Platinum', category: 'metals' },
  { symbol: 'HG=F', name: 'Copper', category: 'metals' },
  { symbol: 'ZC=F', name: 'Corn', category: 'agriculture' },
  { symbol: 'ZW=F', name: 'Wheat', category: 'agriculture' },
  { symbol: 'ZS=F', name: 'Soybeans', category: 'agriculture' },
  { symbol: 'KC=F', name: 'Coffee', category: 'agriculture' },
  { symbol: 'SB=F', name: 'Sugar', category: 'agriculture' },
  { symbol: 'CC=F', name: 'Cocoa', category: 'agriculture' },
];

const SparkLine = ({ data, positive }: { data: number[]; positive: boolean }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 60;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={positive ? 'hsl(var(--terminal-green))' : 'hsl(var(--terminal-red))'} strokeWidth="1.5" />
    </svg>
  );
};

const CommodityDashboard = () => {
  const { isConnected } = useOpenBB();
  const [items, setItems] = useState<CommodityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'heatmap'>('cards');

  const loadData = useCallback(async () => {
    setLoading(true);
    // Use mock data (OpenBB commodity endpoint)
    const mockItems: CommodityItem[] = COMMODITIES.map(c => {
      const price = c.category === 'metals' ? Math.random() * 2000 + 15 : c.category === 'energy' ? Math.random() * 80 + 20 : Math.random() * 800 + 50;
      const changePct = (Math.random() - 0.45) * 6;
      return {
        ...c,
        price,
        change: price * changePct / 100,
        changePct,
        volume: Math.floor(Math.random() * 500000) + 10000,
        sparkline: Array.from({ length: 30 }, () => price * (1 + (Math.random() - 0.5) * 0.08)),
      };
    });
    setItems(mockItems);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const categories: ('energy' | 'metals' | 'agriculture')[] = ['energy', 'metals', 'agriculture'];
  const categoryLabels = { energy: '⛽ ENERGY', metals: '🥇 METALS', agriculture: '🌾 AGRICULTURE' };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-mono font-bold text-terminal-green tracking-wider">⛏️ COMMODITIES</h2>
          {!isConnected && <Badge variant="outline" className="text-[9px] font-mono border-terminal-amber/40 text-terminal-amber">⚠️ OBB OFFLINE</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button onClick={() => setViewMode('cards')} className={`text-[9px] font-mono px-2 py-0.5 ${viewMode === 'cards' ? 'bg-terminal-green/20 text-terminal-green' : 'text-muted-foreground'}`}>CARDS</button>
            <button onClick={() => setViewMode('heatmap')} className={`text-[9px] font-mono px-2 py-0.5 ${viewMode === 'heatmap' ? 'bg-terminal-green/20 text-terminal-green' : 'text-muted-foreground'}`}>HEAT</button>
          </div>
          {lastUpdated && <span className="text-[9px] font-mono text-muted-foreground">Updated: {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago</span>}
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} className="h-6 w-6 p-0">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {viewMode === 'heatmap' ? (
          <div className="grid grid-cols-7 gap-1">
            {items.map(item => {
              const intensity = Math.min(1, Math.abs(item.changePct) / 5);
              const bg = item.changePct > 0
                ? `rgba(0, 255, 0, ${intensity * 0.3})`
                : `rgba(255, 0, 0, ${intensity * 0.3})`;
              return (
                <div key={item.symbol} className="border border-border rounded p-2 text-center cursor-pointer hover:border-terminal-green/50 transition-colors" style={{ backgroundColor: bg }}>
                  <div className="text-[9px] font-mono font-bold truncate">{item.name}</div>
                  <div className={`text-xs font-mono font-bold ${item.changePct > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {item.changePct > 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {categories.map(cat => (
              <div key={cat}>
                <h3 className="text-[10px] font-mono font-bold text-terminal-amber mb-2">{categoryLabels[cat]}</h3>
                <div className="space-y-1.5">
                  {items.filter(i => i.category === cat).map(item => (
                    <div key={item.symbol} className="bg-card border border-border rounded p-2 hover:border-terminal-green/30 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold">{item.name}</span>
                        {item.changePct > 0 ? <TrendingUp className="w-3 h-3 text-terminal-green" /> : <TrendingDown className="w-3 h-3 text-terminal-red" />}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-sm font-mono font-bold">${item.price.toFixed(2)}</div>
                          <div className={`text-[9px] font-mono ${item.changePct > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                            {item.changePct > 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                          </div>
                        </div>
                        <SparkLine data={item.sparkline} positive={item.changePct > 0} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommodityDashboard;
