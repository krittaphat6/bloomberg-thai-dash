import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain, TrendingUp, TrendingDown, Minus, RefreshCw,
  BarChart3, Eye, Activity, Shield, Zap, AlertTriangle,
  Plus, X
} from 'lucide-react'

// ─── Types ──
interface AgentResult {
  agent: string
  signal: 'BUY' | 'SELL' | 'HOLD' | 'WATCH'
  confidence: number
  summary: string
  details: Record<string, any>
}

interface QuantResult {
  success: boolean
  symbol: string
  timeframe: string
  timestamp: string
  agents: {
    indicator: AgentResult
    pattern: AgentResult
    trend: AgentResult
    risk: AgentResult
  }
  finalDecision: {
    signal: string
    confidence: number
    priceTarget?: number
    stopLoss?: number
    riskReward?: number
    rationale: string
  }
}

const DEFAULT_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'US500', 'USOIL']
const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1D']

// ─── Sub-components ──
const SignalBadge = ({ signal, size = 'sm' }: { signal: string; size?: 'sm' | 'lg' }) => {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    STRONG_BUY: { color: 'bg-emerald-600 text-white border-emerald-500', icon: <TrendingUp className="w-3 h-3" />, label: 'STRONG BUY' },
    BUY: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: <TrendingUp className="w-3 h-3" />, label: 'BUY' },
    HOLD: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: <Minus className="w-3 h-3" />, label: 'HOLD' },
    WATCH: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: <Eye className="w-3 h-3" />, label: 'WATCH' },
    SELL: { color: 'bg-red-500/20 text-red-400 border-red-500/40', icon: <TrendingDown className="w-3 h-3" />, label: 'SELL' },
    STRONG_SELL: { color: 'bg-red-700 text-white border-red-600', icon: <TrendingDown className="w-3 h-3" />, label: 'STRONG SELL' },
  }
  const cfg = map[signal] ?? map['HOLD']
  return (
    <Badge variant="outline" className={`${cfg.color} border ${size === 'lg' ? 'text-sm px-3 py-1' : 'text-[10px] px-1.5 py-0'} gap-1`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

const AgentCard = ({ icon, label, result }: { icon: React.ReactNode; label: string; result?: AgentResult }) => {
  if (!result) return null
  return (
    <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          {icon}
          <span>{label}</span>
        </div>
        <SignalBadge signal={result.signal} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-500">Confidence</span>
        <span className="text-zinc-300">{result.confidence}%</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1">
        <div
          className={`h-1 rounded-full ${result.signal === 'BUY' ? 'bg-emerald-500' : result.signal === 'SELL' ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${result.confidence}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-500 truncate">{result.summary}</p>
    </div>
  )
}

const SymbolRow = ({ symbol, result, loading, expanded, onToggle, onRefresh, onRemove }: {
  symbol: string; result?: QuantResult | null; loading: boolean; expanded: boolean;
  onToggle: () => void; onRefresh: () => void; onRemove: () => void;
}) => (
  <div className="border border-zinc-800 rounded-lg overflow-hidden mb-2">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-900/50 transition-colors text-left">
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-bold text-white">{symbol}</span>
        {loading && <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />}
      </div>
      <div className="flex items-center gap-2">
        {result ? (
          <>
            <SignalBadge signal={result.finalDecision.signal} />
            <span className="text-[10px] text-zinc-500">{result.finalDecision.confidence}%</span>
            {result.finalDecision.riskReward && (
              <span className="text-[10px] text-zinc-600">R:R {result.finalDecision.riskReward.toFixed(1)}</span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-zinc-600">—</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRefresh() }} className="p-1 hover:bg-zinc-800 rounded">
          <RefreshCw className="w-3 h-3 text-zinc-500" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1 hover:bg-zinc-800 rounded">
          <X className="w-3 h-3 text-zinc-600" />
        </button>
      </div>
    </button>

    {expanded && result && (
      <div className="px-3 pb-3 space-y-2 border-t border-zinc-800">
        <AgentCard icon={<BarChart3 className="w-3.5 h-3.5" />} label="Indicator" result={result.agents?.indicator} />
        <AgentCard icon={<Eye className="w-3.5 h-3.5" />} label="Pattern" result={result.agents?.pattern} />
        <AgentCard icon={<Activity className="w-3.5 h-3.5" />} label="Trend" result={result.agents?.trend} />
        <AgentCard icon={<Shield className="w-3.5 h-3.5" />} label="Risk" result={result.agents?.risk} />

        {(result.finalDecision.priceTarget && result.finalDecision.stopLoss) && (
          <div className="flex gap-2 text-[10px]">
            <div className="flex-1 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-zinc-500">Target</p>
              <p className="text-emerald-400 font-mono">{result.finalDecision.priceTarget.toFixed(4)}</p>
            </div>
            <div className="flex-1 p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-zinc-500">Stop Loss</p>
              <p className="text-red-400 font-mono">{result.finalDecision.stopLoss.toFixed(4)}</p>
            </div>
          </div>
        )}

        {result.finalDecision.rationale && (
          <p className="text-[10px] text-zinc-400 italic border-t border-zinc-800 pt-2">{result.finalDecision.rationale}</p>
        )}
      </div>
    )}
  </div>
)

// ─── Main Component ──
const QuantAgentPanel = () => {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS)
  const [results, setResults] = useState<Record<string, QuantResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedTf, setSelectedTf] = useState('1h')
  const [useVision, setUseVision] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')
  const [isRunningAll, setIsRunningAll] = useState(false)
  const abortRef = useRef(false)

  const analyzeSymbol = useCallback(async (symbol: string) => {
    setLoading(prev => ({ ...prev, [symbol]: true }))
    try {
      const { data, error } = await supabase.functions.invoke('quant-agent', {
        body: { symbol, timeframe: selectedTf, includeVision: useVision }
      })
      if (error) throw error
      if (data?.success) {
        setResults(prev => ({ ...prev, [symbol]: data }))
      }
    } catch (err) {
      console.error(`QuantAgent ${symbol}:`, err)
    } finally {
      setLoading(prev => ({ ...prev, [symbol]: false }))
    }
  }, [selectedTf, useVision])

  const analyzeAll = useCallback(async () => {
    setIsRunningAll(true)
    abortRef.current = false
    for (const sym of symbols) {
      if (abortRef.current) break
      await analyzeSymbol(sym)
      await new Promise(r => setTimeout(r, 800))
    }
    setIsRunningAll(false)
  }, [symbols, analyzeSymbol])

  const stopAll = () => { abortRef.current = true; setIsRunningAll(false) }

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase()
    if (sym && !symbols.includes(sym)) {
      setSymbols(prev => [...prev, sym])
      setNewSymbol('')
    }
  }

  const removeSymbol = (sym: string) => {
    setSymbols(prev => prev.filter(s => s !== sym))
    setResults(prev => { const n = { ...prev }; delete n[sym]; return n })
  }

  // Summary stats
  const analyzed = Object.values(results).filter(Boolean) as QuantResult[]
  const buyCount = analyzed.filter(r => r.finalDecision.signal.includes('BUY')).length
  const sellCount = analyzed.filter(r => r.finalDecision.signal.includes('SELL')).length

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold">QuantAgent</h2>
            <span className="text-[10px] text-zinc-500">Price-Driven Multi-Agent Analysis</span>
          </div>
          {analyzed.length > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">🟢 {buyCount} BUY</Badge>
              <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">🔴 {sellCount} SELL</Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setSelectedTf(tf)}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                selectedTf === tf
                  ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
              }`}
            >{tf}</button>
          ))}

          <button onClick={() => setUseVision(v => !v)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border transition-colors ${
              useVision ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
            title="เปิด Vision ให้ PatternAgent วิเคราะห์ chart screenshot"
          >
            <Eye className="w-3 h-3" /> Vision
          </button>

          {isRunningAll ? (
            <Button size="sm" variant="destructive" onClick={stopAll} className="h-6 text-[10px]">
              <X className="w-3 h-3 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={analyzeAll} className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700">
              <Zap className="w-3 h-3 mr-1" /> Analyze All
            </Button>
          )}
        </div>
      </div>

      {/* Symbol List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-0">
          {symbols.map(sym => (
            <SymbolRow
              key={sym}
              symbol={sym}
              result={results[sym]}
              loading={!!loading[sym]}
              expanded={!!expanded[sym]}
              onToggle={() => setExpanded(prev => ({ ...prev, [sym]: !prev[sym] }))}
              onRefresh={() => analyzeSymbol(sym)}
              onRemove={() => removeSymbol(sym)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Add Symbol */}
      <div className="p-3 border-t border-zinc-800 flex gap-2">
        <Input
          value={newSymbol}
          onChange={e => setNewSymbol(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && addSymbol()}
          placeholder="Add symbol... (e.g. AAPL)"
          className="h-7 text-[11px] bg-zinc-900/60 border-zinc-700 text-white placeholder:text-zinc-600"
        />
        <Button size="sm" onClick={addSymbol} className="h-7 bg-zinc-800 hover:bg-zinc-700">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <p className="text-[9px] text-zinc-700 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          For research only. Not financial advice.
        </p>
      </div>
    </div>
  )
}

export default QuantAgentPanel
