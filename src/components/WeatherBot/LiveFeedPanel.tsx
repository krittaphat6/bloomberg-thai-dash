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
  start: '#00c8ff', status: 'hsl(var(--muted-foreground))', weather: '#00e87a', signal: '#f97316',
  markets_found: '#a855f7', ai_start: '#f472b6', decision: '#f97316',
  ai_thinking: '#a855f7', ai_result: '#00e87a',
  trade_placed: '#00c8ff', done: '#00c8ff', error: '#ff3558', info: 'hsl(var(--muted-foreground))',
};

const TYPE_ICON: Record<string, string> = {
  start: '◈', status: '·', weather: '◎', signal: '⚡',
  markets_found: '◈', ai_start: '🤖', decision: '→',
  ai_thinking: '◌', ai_result: '✓',
  trade_placed: '⏳', done: '■', error: '✗', info: '·',
};

export default function LiveFeedPanel() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const qc = useQueryClient();
  const idRef = useRef(0);

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
      
      addEvent('status', 'Scanning Polymarket for weather markets...');
      const markets = await wbFetch('markets');
      const realCount = markets.filter((m: any) => m.source === 'real').length;
      const mockCount = markets.filter((m: any) => m.source === 'mock').length;
      addEvent('markets_found', `Found ${markets.length} markets (${realCount} real, ${mockCount} mock)`);

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
        
        await new Promise(r => setTimeout(r, 80));
      }

      // Run AI analysis
      addEvent('ai_start', '🤖 Running AI analysis on top signals...');
      try {
        const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-ai-analysis`;
        const actionableSignals = signals.filter((s: any) => s.actionable);
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: 'market_scan',
            data: actionableSignals.slice(0, 5),
            prompt: `Quick analysis of ${actionableSignals.length} actionable weather signals. Top edges: ${actionableSignals.slice(0, 3).map((s: any) => `${s.city}: ${(s.edge * 100).toFixed(1)}% on ${s.side}`).join(', ')}. Give 2-3 sentence summary with recommendations.`
          }),
        });

        if (resp.ok && resp.body) {
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let aiResult = '';

          addEvent('ai_thinking', 'AI analyzing market conditions...');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf('\n')) !== -1) {
              let line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              if (line.endsWith('\r')) line = line.slice(0, -1);
              if (!line.startsWith('data: ')) continue;
              const json = line.slice(6).trim();
              if (json === '[DONE]') break;
              try {
                const parsed = JSON.parse(json);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) aiResult += content;
              } catch {}
            }
          }

          if (aiResult) {
            // Split into sentences for feed
            const sentences = aiResult.split(/\.\s+/).filter(Boolean);
            sentences.forEach(s => addEvent('ai_result', `✓ ${s.trim()}`));
          }
        }
      } catch (aiErr) {
        addEvent('info', `AI analysis skipped: ${aiErr}`);
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
    <div className="flex flex-col h-full p-4 space-y-4" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-amber))' }} />
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono" style={{ color: 'hsl(var(--foreground))' }}>LIVE FEED</h2>
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Real-time weather market scanner with AI</p>
          </div>
        </div>
        <button onClick={startScan} disabled={scanning}
          className="rounded-md px-4 py-2 text-xs font-bold tracking-widest font-mono transition-all"
          style={{
            background: scanning ? 'hsl(var(--muted))' : 'hsl(var(--terminal-amber))',
            color: scanning ? 'hsl(var(--muted-foreground))' : 'hsl(var(--background))',
            boxShadow: scanning ? 'none' : '0 0 20px rgba(249,115,22,0.3)',
          }}>
          {scanning ? '⟳ SCANNING...' : '▶ START SCAN'}
        </button>
      </div>

      {scanning && progress.total > 0 && (
        <div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: '#00c8ff' }} />
          </div>
          <div className="flex justify-between text-xs mt-1 font-mono">
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Scanning market {progress.current} / {progress.total}...</span>
            <span style={{ color: '#00c8ff' }}>{pct}%</span>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-md overflow-hidden" style={{ background: '#05050e', border: '1px solid rgba(249,115,22,0.25)' }}>
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(249,115,22,0.15)' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,53,88,0.7)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(249,115,22,0.7)' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(0,232,122,0.7)' }} />
          <span className="ml-3 font-mono text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>weatherbot ~ live-feed</span>
          {scanning && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e87a' }} />
              <span className="font-mono text-xs font-bold tracking-widest" style={{ color: '#00e87a', fontSize: 9 }}>SCANNING</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {events.length === 0 && (
            <div className="font-mono text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Press START SCAN to begin analyzing weather markets with AI...
            </div>
          )}
          {events.map(ev => (
            <div key={ev.id} className="flex items-start gap-2 text-xs py-0.5 font-mono">
              <span style={{ color: TYPE_COLOR[ev.type] || 'hsl(var(--muted-foreground))' }}>{TYPE_ICON[ev.type] || '·'}</span>
              <span style={{ color: TYPE_COLOR[ev.type] || 'hsl(var(--muted-foreground))' }}>{ev.message}</span>
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
