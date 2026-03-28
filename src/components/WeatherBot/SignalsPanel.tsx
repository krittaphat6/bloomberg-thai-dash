import { useQuery } from '@tanstack/react-query';
import { wbFetch } from '@/pages/WeatherBot';

export default function SignalsPanel() {
  const { data: signals, isLoading } = useQuery({
    queryKey: ['wb-signals'],
    queryFn: () => wbFetch('signals'),
    refetchInterval: 60000,
  });

  const list = signals || [];
  const actionable = list.filter((s: any) => s.actionable);

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-amber))' }} />
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono" style={{ color: 'hsl(var(--foreground))' }}>SIGNALS</h2>
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{list.length} total · {actionable.length} actionable (edge ≥ 8%)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TOTAL SIGNALS', value: list.length, accent: '#00c8ff' },
          { label: 'ACTIONABLE', value: actionable.length, accent: '#00e87a' },
          { label: 'BEST EDGE', value: list.length > 0 ? `${(Math.max(...list.map((s: any) => Math.abs(s.edge))) * 100).toFixed(1)}%` : '—', accent: 'hsl(var(--terminal-amber))' },
        ].map(c => (
          <div key={c.label} className="rounded-md p-3" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)', borderLeftColor: c.accent, borderLeftWidth: 3 }}>
            <div className="font-mono text-xs font-bold tracking-widest" style={{ color: c.accent, fontSize: 9 }}>{c.label}</div>
            <div className="font-mono text-xl font-bold" style={{ color: c.accent }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              {['CITY', 'QUESTION', 'MODEL', 'MARKET', 'EDGE', 'SIDE', 'KELLY', 'CONF', 'SOURCE'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-bold tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 9 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-3 py-3"><div className="h-4 rounded animate-pulse" style={{ background: 'hsl(var(--muted))' }} /></td></tr>
              ))
            ) : list.map((s: any, i: number) => (
              <tr key={i} className="transition-colors hover:bg-[rgba(249,115,22,0.04)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--foreground))' }}>{s.city || '—'}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.market_question}</td>
                <td className="px-3 py-2" style={{ color: '#00c8ff' }}>{(s.model_prob * 100).toFixed(0)}%</td>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{(s.market_prob * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded font-bold" style={{
                    background: s.edge > 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,53,88,0.15)',
                    color: s.edge > 0 ? '#00e87a' : '#ff3558',
                    border: `1px solid ${s.edge > 0 ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
                  }}>
                    {s.edge > 0 ? '+' : ''}{(s.edge * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2 font-bold" style={{ color: s.side === 'YES' ? '#00e87a' : '#ff3558' }}>{s.side}</td>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--terminal-amber))' }}>${s.kelly_size?.toFixed(2)}</td>
                <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{(s.confidence * 100).toFixed(0)}%</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded font-bold" style={{
                    background: s.source === 'real' ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.05)',
                    color: s.source === 'real' ? '#00e87a' : 'hsl(var(--muted-foreground))',
                    border: `1px solid ${s.source === 'real' ? 'rgba(0,232,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    fontSize: 9,
                  }}>{s.source === 'real' ? 'REAL' : 'MOCK'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
