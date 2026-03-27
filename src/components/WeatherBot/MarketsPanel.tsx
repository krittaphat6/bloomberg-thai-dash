import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { wbFetch } from '@/pages/WeatherBot';

export default function MarketsPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: markets, isLoading } = useQuery({
    queryKey: ['wb-markets'],
    queryFn: () => wbFetch('markets'),
    refetchInterval: 60000,
  });

  const { data: signals } = useQuery({
    queryKey: ['wb-signals'],
    queryFn: () => wbFetch('signals'),
    refetchInterval: 60000,
  });

  const list = markets || [];
  const sigs = signals || [];
  const realCount = list.filter((m: any) => m.source === 'real').length;
  const mockCount = list.filter((m: any) => m.source === 'mock').length;
  const avgEdge = sigs.length > 0 ? sigs.reduce((s: number, x: any) => s + Math.abs(x.edge), 0) / sigs.length : 0;
  const totalVol = list.reduce((s: number, m: any) => s + (m.volume || 0), 0);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const market = list.find((m: any) => m.id === selectedId);
    const signal = sigs.find((s: any) => s.market_id === selectedId);
    return { market, signal };
  }, [selectedId, list, sigs]);

  const EMOJI: Record<string, string> = {
    "New York": "🗽", "Chicago": "🌬", "Miami": "🌴", "Los Angeles": "☀️",
    "Dallas": "🤠", "Seattle": "🌧", "Houston": "🌡", "Phoenix": "🔥",
    "Denver": "🏔", "Atlanta": "🍑", "Boston": "🦞", "Las Vegas": "🎰",
    "San Francisco": "🌉", "Minneapolis": "❄️", "Detroit": "🏭", "Kansas City": "🌾",
    "London": "🇬🇧", "Paris": "🇫🇷", "Tokyo": "🇯🇵", "Sydney": "🇦🇺",
    "Toronto": "🇨🇦", "Berlin": "🇩🇪", "Dubai": "🇦🇪", "Singapore": "🇸🇬",
  };

  function timeTo(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'expired';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h` : `${h}h`;
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#08080d' }}>
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[
          { label: 'REAL MARKETS', value: realCount, accent: '#00e87a' },
          { label: 'MOCK MARKETS', value: mockCount, accent: '#50507a' },
          { label: 'AVG EDGE', value: `${(avgEdge * 100).toFixed(1)}%`, accent: '#f97316' },
          { label: 'TOTAL VOLUME', value: `$${(totalVol / 1000).toFixed(0)}K`, accent: '#00c8ff' },
        ].map(c => (
          <div key={c.label} className="rounded-md p-3" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)', borderLeftColor: c.accent, borderLeftWidth: 3 }}>
            <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.accent, fontSize: 9 }}>{c.label}</div>
            <div className="text-xl font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.accent }}>{isLoading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      {/* Mock warning */}
      {mockCount > realCount && (
        <div className="mx-3 mt-2 rounded-md px-3 py-1.5 text-xs" style={{
          background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
          color: '#f97316', fontFamily: "'JetBrains Mono', monospace",
        }}>
          ⚠️ Using {mockCount} mock markets — Gamma API found limited real weather markets
        </div>
      )}

      {/* Dual panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: list */}
        <div className="w-[420px] min-w-[340px] border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e87a' }}>MARKETS ({list.length})</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e87a' }} />
              <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e87a', fontSize: 9 }}>LIVE</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 rounded animate-pulse" style={{ background: '#0d0d18' }} />
                ))}
              </div>
            ) : list.map((m: any) => {
              const sig = sigs.find((s: any) => s.market_id === m.id);
              const isSelected = selectedId === m.id;
              return (
                <div key={m.id} onClick={() => setSelectedId(m.id)}
                  className="px-3 py-2.5 cursor-pointer transition-all"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    borderLeft: isSelected ? '3px solid #f97316' : '3px solid transparent',
                    background: isSelected ? 'rgba(249,115,22,0.12)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(249,115,22,0.04)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{EMOJI[m.city] || '🌡'}</span>
                      <span className="text-xs font-bold" style={{ color: '#e8e8f0' }}>{m.city || 'Unknown'}</span>
                    </div>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: m.source === 'real' ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.05)',
                      color: m.source === 'real' ? '#00e87a' : '#50507a',
                      border: `1px solid ${m.source === 'real' ? 'rgba(0,232,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      fontSize: 9,
                    }}>{m.source === 'real' ? 'REAL' : 'MOCK'}</span>
                  </div>
                  <div className="text-xs truncate mb-1.5" style={{ color: '#50507a' }}>{m.question}</div>
                  <div className="flex items-center gap-3">
                    {/* YES bar */}
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e87a', fontSize: 9 }}>YES</span>
                        <span className="text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>{(m.yes_price * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{
                          width: `${m.yes_price * 100}%`,
                          background: m.yes_price > 0.65 ? '#00e87a' : m.yes_price > 0.45 ? '#f97316' : '#ff3558',
                        }} />
                      </div>
                    </div>
                    {/* Edge pill */}
                    {sig && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        background: sig.edge > 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,53,88,0.15)',
                        color: sig.edge > 0 ? '#00e87a' : '#ff3558',
                        border: `1px solid ${sig.edge > 0 ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
                        fontSize: 10,
                      }}>
                        {sig.edge > 0 ? '+' : ''}{(sig.edge * 100).toFixed(1)}%
                      </span>
                    )}
                    {/* Volume + Closes */}
                    <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>${(m.volume / 1000).toFixed(0)}K</span>
                    {m.end_date && <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>{timeTo(m.end_date)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selected?.market ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-3xl mb-2">◈</div>
                <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>SELECT A MARKET</div>
              </div>
            </div>
          ) : (
            <MarketDetail market={selected.market} signal={selected.signal} />
          )}
        </div>
      </div>
    </div>
  );
}

function MarketDetail({ market, signal }: { market: any; signal: any }) {
  const m = market;
  const s = signal;

  function timeTo(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'expired';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${min}m` : `${min}m`;
  }

  return (
    <>
      {/* Card 1: Market Header */}
      <div className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌡</span>
            <span className="text-sm font-bold" style={{ color: '#e8e8f0' }}>{m.city}</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: m.source === 'real' ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.05)',
              color: m.source === 'real' ? '#00e87a' : '#50507a',
              border: `1px solid ${m.source === 'real' ? 'rgba(0,232,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
              fontSize: 9,
            }}>{m.source === 'real' ? 'REAL' : 'MOCK'}</span>
          </div>
          {m.end_date && (
            <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>
              Closes in: {timeTo(m.end_date)}
            </span>
          )}
        </div>
        <div className="text-sm mb-3" style={{ color: '#e8e8f0' }}>{m.question}</div>
        <div className="flex items-center gap-6 mb-3">
          <div>
            <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>YES PROBABILITY</div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e87a' }}>{(m.yes_price * 100).toFixed(0)}%</div>
          </div>
          {s && (
            <>
              <div>
                <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>EDGE</div>
                <div className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.edge > 0 ? '#00e87a' : '#ff3558' }}>
                  {s.edge > 0 ? '+' : ''}{(s.edge * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>KELLY</div>
                <div className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#f97316' }}>${s.kelly_size?.toFixed(2)}</div>
              </div>
            </>
          )}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${m.yes_price * 100}%`,
            background: m.yes_price > 0.65 ? '#00e87a' : m.yes_price > 0.45 ? '#f97316' : '#ff3558',
          }} />
        </div>
      </div>

      {/* Card 2: Model vs Market */}
      {s && (
        <div className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
            <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>MODEL VS MARKET</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00c8ff', fontSize: 9 }}>GFS ENSEMBLE</div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00c8ff' }}>{(s.model_prob * 100).toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>MARKET PRICE</div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>{(s.market_prob * 100).toFixed(1)}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.edge > 0 ? '#00e87a' : '#ff3558', fontSize: 9 }}>EDGE</div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.edge > 0 ? '#00e87a' : '#ff3558' }}>
                {s.edge > 0 ? '+' : ''}{(s.edge * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          {/* Side-by-side bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: '#00c8ff' }}>MODEL</span>
                <span style={{ color: '#00c8ff' }}>{(s.model_prob * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.model_prob * 100}%`, background: '#00c8ff' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: '#50507a' }}>MARKET</span>
                <span style={{ color: '#50507a' }}>{(s.market_prob * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.market_prob * 100}%`, background: '#50507a' }} />
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>
            Ensemble confidence: {(s.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Card 3: Signal recommendation */}
      {s && (
        <div className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
            <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>SIGNAL ANALYSIS</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: s.actionable ? 'rgba(0,232,122,0.12)' : 'rgba(255,53,88,0.12)',
              color: s.actionable ? '#00e87a' : '#ff3558',
              border: `1px solid ${s.actionable ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
              fontSize: 9,
            }}>{s.actionable ? 'TRADE' : 'SKIP'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>SIDE</div>
              <div className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.side === 'YES' ? '#00e87a' : '#ff3558' }}>BUY {s.side}</div>
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>POSITION SIZE</div>
              <div className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#f97316' }}>${s.kelly_size?.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Market info */}
      <div className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
          <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>MARKET INFO</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <div><span style={{ color: '#50507a' }}>VOLUME: </span><span style={{ color: '#e8e8f0' }}>${m.volume?.toLocaleString()}</span></div>
          <div><span style={{ color: '#50507a' }}>YES: </span><span style={{ color: '#00e87a' }}>{(m.yes_price * 100).toFixed(0)}¢</span></div>
          <div><span style={{ color: '#50507a' }}>NO: </span><span style={{ color: '#ff3558' }}>{(m.no_price * 100).toFixed(0)}¢</span></div>
          <div><span style={{ color: '#50507a' }}>THRESHOLD: </span><span style={{ color: '#e8e8f0' }}>{m.threshold_f}°F {m.above ? 'ABOVE' : 'BELOW'}</span></div>
          <div><span style={{ color: '#50507a' }}>ID: </span><span style={{ color: '#50507a' }}>{m.id?.slice(0, 12)}...</span></div>
          <div><span style={{ color: '#50507a' }}>SOURCE: </span><span style={{ color: m.source === 'real' ? '#00e87a' : '#50507a' }}>{m.source?.toUpperCase()}</span></div>
        </div>
      </div>
    </>
  );
}
