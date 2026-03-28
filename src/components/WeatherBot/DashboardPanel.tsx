import { useQuery } from '@tanstack/react-query';
import { wbFetch } from '@/pages/WeatherBot';

export default function DashboardPanel({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['wb-dashboard'],
    queryFn: () => wbFetch('dashboard'),
    refetchInterval: 60000,
  });

  const { data: signals } = useQuery({
    queryKey: ['wb-signals'],
    queryFn: () => wbFetch('signals'),
    refetchInterval: 60000,
  });

  const stats = dashboard || {};
  const sigs = signals || [];
  const actionable = sigs.filter((s: any) => Math.abs(s.edge) >= 0.08);
  const avgEdge = sigs.length > 0 ? sigs.reduce((s: number, x: any) => s + Math.abs(x.edge), 0) / sigs.length : 0;
  const totalVol = stats.total_volume || 0;

  const cards = [
    { label: 'REAL MARKETS', value: stats.real_count ?? 0, accent: '#00e87a' },
    { label: 'MOCK MARKETS', value: stats.mock_count ?? 0, accent: 'hsl(var(--muted-foreground))' },
    { label: 'AVG EDGE', value: `${(avgEdge * 100).toFixed(1)}%`, accent: 'hsl(var(--terminal-amber))' },
    { label: 'TOTAL VOLUME', value: `$${(totalVol / 1000).toFixed(0)}K`, accent: '#00c8ff' },
    { label: 'ACTIONABLE', value: actionable.length, accent: '#a855f7' },
    { label: 'CITIES TRACKED', value: stats.cities_tracked ?? 24, accent: 'hsl(var(--terminal-amber))' },
  ];

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-1 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-amber))' }} />
        <div>
          <h2 className="text-sm font-bold tracking-widest font-mono" style={{ color: 'hsl(var(--foreground))' }}>DASHBOARD OVERVIEW</h2>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>WeatherBot · Polymarket Weather Trading Terminal</p>
        </div>
      </div>

      {stats.mock_count > stats.real_count && (
        <div className="rounded-md px-4 py-2 text-xs font-mono" style={{
          background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: 'hsl(var(--terminal-amber))',
        }}>
          ⚠️ Using {stats.mock_count} mock markets — Gamma API found limited real weather markets
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-md p-4" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)', borderLeftColor: c.accent, borderLeftWidth: 3 }}>
            <div className="font-mono text-xs font-bold tracking-widest" style={{ color: c.accent, fontSize: 9 }}>{c.label}</div>
            <div className="font-mono text-2xl font-bold mt-1" style={{ color: c.accent }}>{isLoading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-6 mb-3">
        <span className="w-1 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-amber))' }} />
        <h2 className="text-sm font-bold tracking-widest font-mono" style={{ color: 'hsl(var(--foreground))' }}>TOP SIGNALS</h2>
      </div>
      
      <div className="rounded-md overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['CITY', 'MARKET', 'MODEL', 'MARKET', 'EDGE', 'SIDE', 'KELLY'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-bold tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 9 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sigs.slice(0, 8).map((s: any, i: number) => (
              <tr key={i} className="transition-colors hover:bg-[rgba(249,115,22,0.04)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--foreground))' }}>{s.city || '—'}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.market_question}</td>
                <td className="px-3 py-2" style={{ color: '#00c8ff' }}>{(s.model_prob * 100).toFixed(0)}%</td>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{(s.market_prob * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{
                    background: s.edge > 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,53,88,0.15)',
                    color: s.edge > 0 ? '#00e87a' : '#ff3558',
                    border: `1px solid ${s.edge > 0 ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
                  }}>
                    {s.edge > 0 ? '+' : ''}{(s.edge * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2 font-bold" style={{ color: s.side === 'YES' ? '#00e87a' : '#ff3558' }}>{s.side}</td>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--terminal-amber))' }}>${s.kelly_size?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { tab: 'markets', label: 'EXPLORE MARKETS', icon: '◈', color: 'hsl(var(--terminal-amber))' },
          { tab: 'weather', label: 'WEATHER DATA', icon: '◎', color: '#00c8ff' },
          { tab: 'backtest', label: 'RUN BACKTEST', icon: '⏮', color: '#a855f7' },
        ].map(q => (
          <button key={q.tab} onClick={() => onNavigate(q.tab)}
            className="rounded-md p-3 text-left transition-all hover:border-[rgba(249,115,22,0.25)]"
            style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-lg">{q.icon}</span>
            <div className="font-mono text-xs font-bold tracking-widest mt-1" style={{ color: q.color }}>{q.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
