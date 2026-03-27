import { useState } from 'react';
import { wbFetch } from '@/pages/WeatherBot';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CITIES = [
  "New York","Chicago","Miami","Los Angeles","Dallas","Seattle",
  "Houston","Phoenix","Denver","Atlanta","Boston","Las Vegas",
  "San Francisco","Minneapolis","Detroit","Kansas City",
  "London","Paris","Tokyo","Sydney","Toronto","Berlin","Dubai","Singapore",
];

export default function BacktestPanel() {
  const [city, setCity] = useState('New York');
  const [threshold, setThreshold] = useState(70);
  const [above, setAbove] = useState(true);
  const [daysBack, setDaysBack] = useState(90);
  const [marketProb, setMarketProb] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const data = await wbFetch('backtest', {
        method: 'POST',
        body: JSON.stringify({ city, threshold_f: threshold, above, days_back: daysBack, simulated_market_prob: marketProb / 100 }),
      });
      setResult(data);
    } catch (e) {
      console.error('Backtest failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const equityData = result?.equity_curve?.map((v: number, i: number) => ({ name: i, value: v })) || [];
  const isPositive = result ? result.final_bankroll >= 1000 : true;

  return (
    <div className="flex h-full" style={{ background: '#08080d' }}>
      {/* Left: controls */}
      <div className="w-[340px] min-w-[300px] border-r p-4 flex flex-col gap-4 overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
          <div>
            <h2 className="text-sm font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>BACKTEST CONFIG</h2>
            <p className="text-xs" style={{ color: '#50507a' }}>Historical simulation</p>
          </div>
        </div>

        {/* City */}
        <div>
          <label className="text-xs font-bold tracking-widest block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>CITY</label>
          <select value={city} onChange={e => setCity(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm"
            style={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.06)', color: '#e8e8f0', fontFamily: "'JetBrains Mono', monospace" }}>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Threshold */}
        <div>
          <label className="text-xs font-bold tracking-widest block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>THRESHOLD (°F)</label>
          <input type="number" value={threshold} onChange={e => setThreshold(+e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm"
            style={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.06)', color: '#e8e8f0', fontFamily: "'JetBrains Mono', monospace" }} />
        </div>

        {/* Direction */}
        <div>
          <label className="text-xs font-bold tracking-widest block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>DIRECTION</label>
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setAbove(v)}
                className="flex-1 rounded-md px-3 py-2 text-xs font-bold tracking-wider"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: above === v ? 'rgba(249,115,22,0.12)' : '#12121f',
                  color: above === v ? '#f97316' : '#50507a',
                  border: `1px solid ${above === v ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {v ? 'ABOVE ●' : 'BELOW ○'}
              </button>
            ))}
          </div>
        </div>

        {/* Days Back */}
        <div>
          <label className="text-xs font-bold tracking-widest block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>DAYS BACK: {daysBack}</label>
          <input type="range" min={30} max={180} step={30} value={daysBack} onChange={e => setDaysBack(+e.target.value)}
            className="w-full" style={{ accentColor: '#f97316' }} />
          <div className="flex justify-between text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>
            <span>30</span><span>60</span><span>90</span><span>120</span><span>150</span><span>180</span>
          </div>
        </div>

        {/* Market Prob */}
        <div>
          <label className="text-xs font-bold tracking-widest block mb-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a', fontSize: 9 }}>MARKET PROB: {marketProb}%</label>
          <input type="range" min={30} max={70} step={5} value={marketProb} onChange={e => setMarketProb(+e.target.value)}
            className="w-full" style={{ accentColor: '#f97316' }} />
          <div className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>Simulated market price to trade against</div>
        </div>

        {/* Run button */}
        <button onClick={runBacktest} disabled={loading}
          className="w-full rounded-md py-3 text-sm font-bold tracking-widest transition-all"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: loading ? '#12121f' : '#f97316',
            color: loading ? '#50507a' : '#08080d',
            boxShadow: loading ? 'none' : '0 0 20px rgba(249,115,22,0.3)',
          }}>
          {loading ? 'RUNNING...' : '▶ RUN BACKTEST'}
        </button>
      </div>

      {/* Right: results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="rounded-md overflow-hidden" style={{ background: '#05050e', border: '1px solid rgba(249,115,22,0.25)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(249,115,22,0.15)' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,53,88,0.7)' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(249,115,22,0.7)' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(0,232,122,0.7)' }} />
              <span className="ml-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>backtest ~ running</span>
            </div>
            <div className="p-4">
              <div className="text-xs animate-pulse" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00c8ff' }}>
                Fetching {daysBack} days of historical data for {city}...
              </div>
            </div>
          </div>
        )}

        {result && !result.error && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'TRADES TAKEN', value: result.total_trades, accent: '#00c8ff' },
                { label: 'WIN RATE', value: `${(result.win_rate * 100).toFixed(1)}%`, accent: result.win_rate > 0.55 ? '#00e87a' : result.win_rate < 0.45 ? '#ff3558' : '#f97316' },
                { label: 'TOTAL P&L', value: `${result.total_pnl >= 0 ? '+' : ''}$${result.total_pnl.toFixed(2)}`, accent: result.total_pnl >= 0 ? '#00e87a' : '#ff3558' },
                { label: 'FINAL BANKROLL', value: `$${result.final_bankroll.toFixed(2)}`, accent: '#f97316' },
              ].map(c => (
                <div key={c.label} className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)', borderLeftColor: c.accent, borderLeftWidth: 3 }}>
                  <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.accent, fontSize: 9 }}>{c.label}</div>
                  <div className="text-2xl font-bold mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: c.accent }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Equity chart */}
            <div className="rounded-md p-4" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
                <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>EQUITY CURVE</span>
              </div>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData}>
                    <defs>
                      <linearGradient id="bt-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? '#00e87a' : '#ff3558'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isPositive ? '#00e87a' : '#ff3558'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: '#50507a', fontSize: 10, fontFamily: "'JetBrains Mono'" }} />
                    <YAxis tick={{ fill: '#50507a', fontSize: 10, fontFamily: "'JetBrains Mono'" }} tickFormatter={(v: number) => `$${v}`} width={52} />
                    <ReferenceLine y={1000} stroke="rgba(249,115,22,0.3)" strokeDasharray="3 3" />
                    <Tooltip contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontFamily: "'JetBrains Mono'" }} />
                    <Area type="monotone" dataKey="value" stroke={isPositive ? '#00e87a' : '#ff3558'} fill="url(#bt-grad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trades table */}
            <div className="rounded-md overflow-hidden" style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="w-1 h-4 rounded-full" style={{ background: '#f97316' }} />
                <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e8e8f0' }}>TRADE LOG</span>
                <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>Last {result.trades?.length} trades</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      {['DATE', 'ACTUAL', 'OUTCOME', 'P&L', 'BANKROLL'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-bold tracking-widest" style={{ color: '#50507a', fontSize: 9 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades?.slice(-30).reverse().map((t: any, i: number) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: t.outcome === 'WIN' ? 'rgba(0,232,122,0.04)' : 'rgba(255,53,88,0.04)',
                      }}>
                        <td className="px-3 py-1.5" style={{ color: '#50507a' }}>{t.date}</td>
                        <td className="px-3 py-1.5" style={{ color: '#e8e8f0' }}>{t.actual_temp}°F</td>
                        <td className="px-3 py-1.5">
                          <span className="px-1.5 py-0.5 rounded font-bold" style={{
                            background: t.outcome === 'WIN' ? 'rgba(0,232,122,0.12)' : 'rgba(255,53,88,0.12)',
                            color: t.outcome === 'WIN' ? '#00e87a' : '#ff3558',
                            border: `1px solid ${t.outcome === 'WIN' ? 'rgba(0,232,122,0.3)' : 'rgba(255,53,88,0.3)'}`,
                            fontSize: 9,
                          }}>{t.outcome}</span>
                        </td>
                        <td className="px-3 py-1.5" style={{ color: t.pnl >= 0 ? '#00e87a' : '#ff3558' }}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: '#f97316' }}>${t.bankroll.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {result?.error && (
          <div className="rounded-md p-4" style={{ background: 'rgba(255,53,88,0.12)', border: '1px solid rgba(255,53,88,0.3)', color: '#ff3558' }}>
            <span className="text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ERROR: {result.error}</span>
          </div>
        )}

        {!result && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">⏮</div>
              <div className="text-xs font-bold tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#50507a' }}>CONFIGURE & RUN BACKTEST</div>
              <div className="text-xs mt-1" style={{ color: '#50507a' }}>Test your weather trading strategy against historical data</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
