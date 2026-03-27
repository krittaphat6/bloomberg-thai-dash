import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface FeedEvent {
  id: number;
  type: string;
  message?: string;
  city?: string;
  edge?: number;
  model_prob?: number;
  market_prob?: number;
  side?: string;
  recommendation?: string;
}

const TYPE_COLOR: Record<string, string> = {
  start: '#00c8ff', status: '#50507a', weather: '#00e87a', signal: '#f97316',
  markets_found: '#a855f7', ai_start: '#f472b6', decision: '#f97316',
  trade_placed: '#00c8ff', done: '#00c8ff', error: '#ff3558', info: '#50507a',
};

const TYPE_ICON: Record<string, string> = {
  start: '◈', status: '·', weather: '◎', signal: '⚡',
  markets_found: '◈', ai_start: '🤖', decision: '→',
  trade_placed: '⏳', done: '■', error: '✗', info: '·',
};

export default function LiveFeedPanel() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const qc = useQueryClient();
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const addEvent = useCallback((type: string, message: string, data?: Partial<FeedEvent>) => {
    setEvents(prev => [{
      id: ++idRef.current, type, message, ...data,
    }, ...prev].slice(0, 200));
  }, []);

  const startScan = useCallback(async () => {
    setScanning(true);
    setEvents([]);
    setProgress({ current: 0, total: 0 });
    
    addEvent('start', '◈ WEATHERBOT LIVE SCAN INITIATED');
    addEvent('status', 'Fetching weather markets from Gamma API...');

    try {
      const { wbFetch } = await import('@/pages/WeatherBot');
      
      // Fetch markets
      addEvent('status', 'Scanning Polymarket for weather markets...');
      const markets = await wbFetch('markets');
      const realCount = markets.filter((m: any) => m.source === 'real').length;
      const mockCount = markets.filter((m: any) => m.source === 'mock').length;
      addEvent('markets_found', `Found ${markets.length} markets (${realCount} real, ${mockCount} mock)`);

      // Generate signals
      addEvent('status', 'Running ensemble weather models...');
      setProgress({ current: 0, total: markets.length });
      
      const signals = await wbFetch('signals');
      
      for (let i = 0; i < signals.length; i++) {
        const s = signals[i];
        setProgress({ current: i + 1, total: signals.length });
        
        addEvent('weather', `${s.city}: GFS model → ${(s.model_prob * 100).toFixed(0)}% probability`);
        
        if (Math.abs(s.edge) >= 0.05) {
          addEvent('signal', `⚡ ${s.city} — Edge: ${s.edge > 0 ? '+' : ''}${(s.edge * 100).toFixed(1)}% → BUY ${s.side}`, {
            city: s.city, edge: s.edge, model_prob: s.model_prob, market_prob: s.market_prob, side: s.side,
          });
        }
        
        if (s.actionable) {
          addEvent('decision', `→ ACTIONABLE: ${s.city} — Kelly size $${s.kelly_size?.toFixed(2)} on ${s.side}`, {
            recommendation: 'TRADE',
          });
        }
        
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 100));
      }

      const actionable = signals.filter((s: any) => s.actionable);
      addEvent('done', `■ Scan complete — ${signals.length} signals, ${actionable.length} actionable`);
      
      qc.invalidateQueries({ queryKey: ['wb-signals'] });
      qc.invalidateQueries({ queryKey: ['wb-markets'] });
    } catch (e) {
      addEvent('error', `Scan failed: ${e}`);
    } finally {
      setScanning(false);
    }
  }, [addEvent, qc]);

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full p-4 space-y-4" style={{ background: '#08080d' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
          <div>
            <h2 className="text-sm font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>LIVE FEED</h2>
            <p className="text-xs" style={{ color: '#50507a' }}>Real-time weather market scanner</p>
          </div>
        </div>
        <button onClick={startScan} disabled={scanning}
          className="rounded-md px-4 py-2 text-xs font-bold tracking-widest transition-all"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: scanning ? '#12121f' : '#f97316',
            color: scanning ? '#50507a' : '#08080d',
            boxShadow: scanning ? 'none' : '0 0 20px rgba(249,115,22,0.3)',
          }}>
          {scanning ? '⟳ SCANNING...' : '▶ START SCAN'}
        </button>
      </div>

      {/* Progress bar */}
      {scanning && progress.total > 0 && (
        <div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: '#00c8ff' }} />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: '#50507a' }}>Scanning market {progress.current} / {progress.total}...</span>
            <span style={{ color: '#00c8ff' }}>{pct}%</span>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 rounded-md overflow-hidden" style={{ background: '#05050e', border: '1px solid rgba(249,115,22,0.25)' }}>
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(249,115,22,0.15)' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,53,88,0.7)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(249,115,22,0.7)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(0,232,122,0.7)' }} />
          <span className="ml-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>weatherbot ~ live-feed</span>
          {scanning && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e87a' }} />
              <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e87a', fontSize: 9 }}>SCANNING</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {events.length === 0 && (
            <div className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>
              Press START SCAN to begin analyzing weather markets...
            </div>
          )}
          {events.map(ev => (
            <div key={ev.id} className="flex items-start gap-2 text-xs py-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: TYPE_COLOR[ev.type] || '#50507a' }}>{TYPE_ICON[ev.type] || '·'}</span>
              <span style={{ color: TYPE_COLOR[ev.type] || '#50507a' }}>{ev.message}</span>
              {ev.edge != null && (
                <span className="px-1.5 py-0.5 rounded font-bold ml-auto" style={{
                  background: ev.edge > 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,53,88,0.15)',
                  color: ev.edge > 0 ? '#00e87a' : '#ff3558',
                  border: `1px solid ${ev.edge > 0 ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
                  fontSize: 10,
                }}>
                  {ev.edge > 0 ? '+' : ''}{(ev.edge * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
