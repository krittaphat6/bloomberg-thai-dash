import { useState } from 'react';
import WeatherBotMarkets from '@/components/WeatherBot/MarketsPanel';
import WeatherBotWeather from '@/components/WeatherBot/WeatherPanel';
import WeatherBotBacktest from '@/components/WeatherBot/BacktestPanel';
import WeatherBotLiveFeed from '@/components/WeatherBot/LiveFeedPanel';
import WeatherBotDashboard from '@/components/WeatherBot/DashboardPanel';
import WeatherBotSignals from '@/components/WeatherBot/SignalsPanel';

type Tab = 'dashboard' | 'live' | 'signals' | 'markets' | 'weather' | 'backtest';

const NAV: { id: Tab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '▦', label: 'Overview' },
  { id: 'live',      icon: '▶', label: 'Live Feed' },
  { id: 'signals',   icon: '⚡', label: 'Signals' },
  { id: 'markets',   icon: '◈', label: 'Markets' },
  { id: 'weather',   icon: '◎', label: 'Weather' },
  { id: 'backtest',  icon: '⏮', label: 'Backtest' },
];

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weatherbot-api`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function wbFetch(endpoint: string, options?: RequestInit) {
  const resp = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      ...(options?.headers || {}),
    },
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export default function WeatherBot() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ background: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg" style={{ color: 'hsl(var(--terminal-amber))' }}>🌡</span>
          <span className="font-bold tracking-widest text-sm font-mono" style={{ color: 'hsl(var(--terminal-amber))' }}>WEATHERBOT</span>
          <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Polymarket Weather Trading</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--terminal-green))' }} />
          <span className="text-xs font-bold tracking-widest font-mono" style={{ color: 'hsl(var(--terminal-green))' }}>LIVE</span>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-1 px-3 py-1 border-b overflow-x-auto" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-all whitespace-nowrap font-mono"
            style={{
              background: tab === n.id ? 'rgba(249,115,22,0.12)' : 'transparent',
              color: tab === n.id ? 'hsl(var(--terminal-amber))' : 'hsl(var(--muted-foreground))',
              border: tab === n.id ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
            }}
          >
            <span>{n.icon}</span>
            <span>{n.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'dashboard' && <WeatherBotDashboard onNavigate={(t: string) => setTab(t as Tab)} />}
        {tab === 'live' && <WeatherBotLiveFeed />}
        {tab === 'signals' && <WeatherBotSignals />}
        {tab === 'markets' && <WeatherBotMarkets />}
        {tab === 'weather' && <WeatherBotWeather />}
        {tab === 'backtest' && <WeatherBotBacktest />}
      </div>
    </div>
  );
}
