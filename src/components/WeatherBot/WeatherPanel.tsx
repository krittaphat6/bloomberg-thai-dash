import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { wbFetch } from '@/pages/WeatherBot';

// Weather map layers for visualization
const WEATHER_LAYERS = [
  { id: 'temp', label: 'TEMPERATURE', emoji: '🌡', color: '#f97316' },
  { id: 'precip', label: 'PRECIPITATION', emoji: '🌧', color: '#00c8ff' },
  { id: 'wind', label: 'WIND', emoji: '💨', color: '#a855f7' },
  { id: 'pressure', label: 'PRESSURE', emoji: '📊', color: '#00e87a' },
];

export default function WeatherPanel() {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState('temp');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: cities, isLoading, refetch } = useQuery({
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

  const runAIAnalysis = useCallback(async (cityData?: any) => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-ai-analysis`;
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'weather_analysis',
          data: cityData || list.slice(0, 8),
          prompt: cityData 
            ? `Analyze weather data for ${cityData.city}. Current temp: ${cityData.current_temp_f}°F. Ensemble members: ${cityData.ensemble_members}. Thresholds: ${JSON.stringify(cityData.thresholds)}. Related signals: ${JSON.stringify(sigs.filter((s: any) => s.city === cityData.city))}. Give trading recommendations.`
            : `Analyze current weather conditions across all tracked cities. Data: ${JSON.stringify(list.slice(0, 8))}. Top signals: ${JSON.stringify(sigs.slice(0, 5))}. Identify best trading opportunities.`
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`API error: ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = '';

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
            if (content) {
              result += content;
              setAiAnalysis(result);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      setAiAnalysis(`Error: ${e}`);
    } finally {
      setAiLoading(false);
    }
  }, [list, sigs]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-amber))' }} />
          <div>
            <h2 className="text-sm font-bold tracking-widest font-mono" style={{ color: 'hsl(var(--foreground))' }}>WEATHER FORECASTS</h2>
            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>31-member GFS ensemble · Open-Meteo · {list.length} cities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => runAIAnalysis()} disabled={aiLoading}
            className="rounded px-3 py-1.5 text-xs font-bold tracking-widest font-mono transition-all"
            style={{
              background: aiLoading ? 'hsl(var(--muted))' : 'rgba(168,85,247,0.15)',
              color: aiLoading ? 'hsl(var(--muted-foreground))' : '#a855f7',
              border: '1px solid rgba(168,85,247,0.3)',
            }}>
            {aiLoading ? '⟳ ANALYZING...' : '🤖 AI ANALYSIS'}
          </button>
          <button onClick={() => refetch()} className="rounded px-2 py-1.5 text-xs font-bold tracking-widest font-mono"
            style={{ color: 'hsl(var(--muted-foreground))', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            ↻ REFRESH
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e87a' }} />
            <span className="font-mono text-xs font-bold tracking-widest" style={{ color: '#00e87a', fontSize: 9 }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Weather layer tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        {WEATHER_LAYERS.map(l => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold tracking-wider font-mono transition-all"
            style={{
              background: activeLayer === l.id ? `${l.color}15` : 'transparent',
              color: activeLayer === l.id ? l.color : 'hsl(var(--muted-foreground))',
              border: activeLayer === l.id ? `1px solid ${l.color}40` : '1px solid transparent',
            }}>
            <span>{l.emoji}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* AI Analysis panel */}
          {aiAnalysis && (
            <div className="rounded-md overflow-hidden" style={{ background: '#05050e', border: '1px solid rgba(168,85,247,0.25)' }}>
              <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(168,85,247,0.7)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(168,85,247,0.4)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(168,85,247,0.2)' }} />
                <span className="ml-3 font-mono text-xs" style={{ color: '#a855f7' }}>AI WEATHER ANALYSIS</span>
                {aiLoading && <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-auto" style={{ background: '#a855f7' }} />}
                <button onClick={() => setAiAnalysis(null)} className="ml-auto text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>✕</button>
              </div>
              <div className="p-4 text-xs font-mono whitespace-pre-wrap" style={{ color: 'hsl(var(--foreground))', maxHeight: 300, overflowY: 'auto' }}>
                {aiAnalysis}
              </div>
            </div>
          )}

          {/* Weather satellite visualization placeholder */}
          <div className="rounded-md overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="w-1 h-4 rounded-full" style={{ background: 'hsl(var(--terminal-cyan))' }} />
              <span className="font-mono text-xs font-bold tracking-widest" style={{ color: 'hsl(var(--foreground))' }}>SATELLITE VIEW</span>
              <span className="font-mono text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>· {activeLayer.toUpperCase()} LAYER</span>
            </div>
            <div className="relative" style={{ height: 200, background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1520 50%, #0a0a1a 100%)' }}>
              {/* Weather grid visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-6 gap-1 opacity-80">
                  {list.slice(0, 24).map((city: any, i: number) => {
                    const temp = city?.current_temp_f;
                    const getColor = () => {
                      if (activeLayer === 'temp') {
                        if (!temp) return 'rgba(80,80,122,0.3)';
                        if (temp > 85) return 'rgba(255,53,88,0.6)';
                        if (temp > 70) return 'rgba(249,115,22,0.6)';
                        if (temp > 55) return 'rgba(0,232,122,0.4)';
                        return 'rgba(0,200,255,0.5)';
                      }
                      return `rgba(0,200,255,${0.2 + Math.random() * 0.4})`;
                    };
                    return (
                      <div key={i} className="relative group cursor-pointer" onClick={() => setSelectedCity(city?.city)}
                        style={{ width: 48, height: 28, background: getColor(), borderRadius: 3, border: selectedCity === city?.city ? '1px solid #f97316' : '1px solid transparent' }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-mono text-[8px] font-bold" style={{ color: '#e8e8f0' }}>
                            {city?.city?.slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 font-mono text-[7px] font-bold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {temp ? `${temp.toFixed(0)}°` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Overlay gradient */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(8,8,13,0.8) 100%)',
              }} />
            </div>
          </div>

          {/* City grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoading ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="h-48 rounded-md animate-pulse" style={{ background: 'hsl(var(--card))' }} />
              ))
            ) : list.map((city: any) => {
              const temp = city.current_temp_f;
              const isHot = temp != null && temp > 75;
              const isCold = temp != null && temp < 40;
              const borderColor = isHot ? 'rgba(249,115,22,0.25)' : isCold ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.07)';
              const tempColor = isHot ? '#fb923c' : isCold ? '#60a5fa' : 'hsl(var(--foreground))';
              const citySignals = sigs.filter((s: any) => s.city === city.city);
              const bestEdge = citySignals.length > 0 ? citySignals.reduce((best: any, s: any) => Math.abs(s.edge) > Math.abs(best.edge) ? s : best, citySignals[0]) : null;
              const isSelected = selectedCity === city.city;

              return (
                <div key={city.city} 
                  className="rounded-md p-4 cursor-pointer transition-all"
                  onClick={() => { setSelectedCity(city.city); runAIAnalysis(city); }}
                  style={{ 
                    background: isSelected ? 'rgba(249,115,22,0.08)' : 'hsl(var(--card))', 
                    border: `1px solid ${isSelected ? 'rgba(249,115,22,0.4)' : borderColor}`,
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{city.emoji}</span>
                      <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>{city.city}</span>
                    </div>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{
                      background: 'rgba(0,232,122,0.12)', color: '#00e87a',
                      border: '1px solid rgba(0,232,122,0.3)', fontSize: 9,
                    }}>{city.data_source}</span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold font-mono" style={{ color: tempColor }}>
                      {temp != null ? `${temp.toFixed(0)}°` : '—'}
                    </span>
                    <span className="text-xs font-bold font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>F</span>
                  </div>
                  {city.ensemble_members > 0 && (
                    <div className="font-mono text-xs mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {city.ensemble_members} ensemble members
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {Object.entries(city.thresholds || {})
                      .filter(([k]) => ['above_50f', 'above_70f', 'above_80f', 'above_90f'].includes(k))
                      .map(([key, val]: [string, any]) => {
                        const pct = val * 100;
                        return (
                          <div key={key}>
                            <div className="flex justify-between mb-0.5">
                              <span className="font-mono text-xs" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 9 }}>{key.replace(/_/g, ' ').toUpperCase()}</span>
                              <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--foreground))' }}>{pct.toFixed(0)}%</span>
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

                  {citySignals.length > 0 && (
                    <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs" style={{ color: '#f97316' }}>
                          ⚡ {citySignals.length} active market{citySignals.length > 1 ? 's' : ''}
                        </span>
                        {bestEdge && (
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded font-bold" style={{
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
      </div>
    </div>
  );
}
