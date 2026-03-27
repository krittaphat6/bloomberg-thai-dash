import { useQuery } from '@tanstack/react-query';
import { wbFetch } from '@/pages/WeatherBot';

export default function WeatherPanel() {
  const { data: cities, isLoading } = useQuery({
    queryKey: ['wb-weather'],
    queryFn: () => wbFetch('weather'),
    refetchInterval: 120000,
  });

  const { data: signals } = useQuery({
    queryKey: ['wb-signals'],
    queryFn: () => wbFetch('signals'),
    refetchInterval: 120000,
  });

  const list = cities || [];
  const sigs = signals || [];

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4" style={{ background: '#08080d' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
          <div>
            <h2 className="text-sm font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>WEATHER FORECASTS</h2>
            <p className="text-xs" style={{ color: '#50507a' }}>31-member GFS ensemble · Open-Meteo · {list.length} cities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e87a' }} />
          <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e87a', fontSize: 9 }}>LIVE</span>
        </div>
      </div>

      {/* City grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          [...Array(12)].map((_, i) => (
            <div key={i} className="h-48 rounded-md animate-pulse" style={{ background: '#0d0d18' }} />
          ))
        ) : list.map((city: any) => {
          const temp = city.current_temp_f;
          const isHot = temp != null && temp > 75;
          const isCold = temp != null && temp < 40;
          const borderColor = isHot ? 'rgba(249,115,22,0.25)' : isCold ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.07)';
          const tempColor = isHot ? '#fb923c' : isCold ? '#60a5fa' : '#e2e8f0';

          // City signals
          const citySignals = sigs.filter((s: any) => s.city === city.city);
          const bestEdge = citySignals.length > 0 ? citySignals.reduce((best: any, s: any) => Math.abs(s.edge) > Math.abs(best.edge) ? s : best, citySignals[0]) : null;

          return (
            <div key={city.city} className="rounded-md p-4" style={{ background: '#0d0d18', border: `1px solid ${borderColor}` }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{city.emoji}</span>
                  <span className="text-sm font-bold" style={{ color: '#e8e8f0' }}>{city.city}</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(0,232,122,0.12)', color: '#00e87a',
                  border: '1px solid rgba(0,232,122,0.3)', fontSize: 9,
                }}>{city.data_source}</span>
              </div>

              {/* Temperature */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: tempColor }}>
                  {temp != null ? `${temp.toFixed(0)}°` : '—'}
                </span>
                <span className="text-xs font-bold" style={{ color: '#50507a' }}>F</span>
              </div>
              {city.ensemble_members > 0 && (
                <div className="text-xs mb-3" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>
                  {city.ensemble_members} ensemble members
                </div>
              )}

              {/* Threshold bars */}
              <div className="space-y-1.5">
                {Object.entries(city.thresholds || {})
                  .filter(([k]) => ['above_50f', 'above_70f', 'above_80f', 'above_90f'].includes(k))
                  .map(([key, val]: [string, any]) => {
                    const pct = val * 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>{key.replace(/_/g, ' ').toUpperCase()}</span>
                          <span className="text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{
                            width: `${pct}%`,
                            background: pct > 65 ? '#00e87a' : pct > 45 ? '#f97316' : '#ff3558',
                          }} />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Active markets + best edge */}
              {citySignals.length > 0 && (
                <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#f97316' }}>
                      ⚡ {citySignals.length} active market{citySignals.length > 1 ? 's' : ''}
                    </span>
                    {bestEdge && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: bestEdge.edge > 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,53,88,0.15)',
                        color: bestEdge.edge > 0 ? '#00e87a' : '#ff3558',
                        border: `1px solid ${bestEdge.edge > 0 ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
                        fontSize: 10,
                      }}>
                        Best: {bestEdge.edge > 0 ? '+' : ''}{(bestEdge.edge * 100).toFixed(1)}% → BUY {bestEdge.side}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
