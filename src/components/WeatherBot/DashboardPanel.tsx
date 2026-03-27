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
    { label: 'REAL MARKETS', value: stats.real_count ?? 0, accent: '#00e87a', bg: 'rgba(0,232,122,0.12)' },
    { label: 'MOCK MARKETS', value: stats.mock_count ?? 0, accent: '#50507a', bg: 'rgba(255,255,255,0.05)' },
    { label: 'AVG EDGE', value: `${(avgEdge * 100).toFixed(1)}%`, accent: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    { label: 'TOTAL VOLUME', value: `$${(totalVol / 1000).toFixed(0)}K`, accent: '#00c8ff', bg: 'rgba(0,200,255,0.12)' },
    { label: 'ACTIONABLE', value: actionable.length, accent: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    { label: 'CITIES TRACKED', value: stats.cities_tracked ?? 24, accent: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  ];

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4" style={{ background: '#08080d' }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
        <div>
          <h2 className="text-sm font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>DASHBOARD OVERVIEW</h2>
          <p className="text-xs" style={{ color: '#50507a' }}>WeatherBot · Polymarket Weather Trading Terminal</p>
        </div>
      </div>

      {/* Mock warning */}
      {stats.mock_count > stats.real_count && (
        <div className="rounded-md px-4 py-2 text-xs" style={{
          background: 'rgba(249,115,22,0.12)',
          border: '1px solid rgba(249,115,22,0.3)',
          color: '#f97316',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ⚠️ Using {stats.mock_count} mock markets — Gamma API found limited real weather markets
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)', borderLeftColor: c.accent, borderLeftWidth: 3 }}>
            <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.accent, fontSize: 9 }}>{c.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.accent }}>{isLoading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      {/* Top signals */}
      <div className="flex items-center gap-3 mt-6 mb-3">
        <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
        <h2 className="text-sm font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>TOP SIGNALS</h2>
      </div>
      
      <div className="rounded-md overflow-hidden" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['CITY', 'MARKET', 'MODEL', 'MARKET', 'EDGE', 'SIDE', 'KELLY'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-bold tracking-widest" style={{ color: '#50507a', fontSize: 9 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sigs.slice(0, 8).map((s: any, i: number) => (
              <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td className="px-3 py-2" style={{ color: '#e8e8f0' }}>{s.city || '—'}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: '#50507a' }}>{s.market_question}</td>
                <td className="px-3 py-2" style={{ color: '#00c8ff' }}>{(s.model_prob * 100).toFixed(0)}%</td>
                <td className="px-3 py-2" style={{ color: '#50507a' }}>{(s.market_prob * 100).toFixed(0)}%</td>
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
                <td className="px-3 py-2" style={{ color: '#f97316' }}>${s.kelly_size?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { tab: 'markets', label: 'EXPLORE MARKETS', icon: '◈', color: '#f97316' },
          { tab: 'weather', label: 'WEATHER DATA', icon: '◎', color: '#00c8ff' },
          { tab: 'backtest', label: 'RUN BACKTEST', icon: '⏮', color: '#a855f7' },
        ].map(q => (
          <button key={q.tab} onClick={() => onNavigate(q.tab)}
            className="rounded-md p-3 text-left transition-all"
            style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}>
            <span className="text-lg">{q.icon}</span>
            <div className="text-xs font-bold tracking-widest mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: q.color }}>{q.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
