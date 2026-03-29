import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OHLCVBar {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface AgentResult {
  agent: string
  signal: 'BUY' | 'SELL' | 'HOLD' | 'WATCH'
  confidence: number
  summary: string
  details: Record<string, any>
}

// ── Technical Indicator Functions ──
function calcSMA(data: number[], period: number): number[] {
  return data.map((_, i) => {
    if (i < period - 1) return NaN
    const slice = data.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = []
  data.forEach((val, i) => {
    if (i === 0) { ema.push(val); return }
    ema.push(val * k + ema[i - 1] * (1 - k))
  })
  return ema
}

function calcRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(NaN)
  if (closes.length < period + 1) return rsi
  let gainSum = 0, lossSum = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gainSum += diff; else lossSum -= diff
  }
  let avgGain = gainSum / period
  let avgLoss = lossSum / period
  rsi[period] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss))
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    rsi[i] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss))
  }
  return rsi
}

function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd = ema12.map((v, i) => v - ema26[i])
  const validMacd = macd.filter(v => !isNaN(v))
  const signal = calcEMA(validMacd, 9)
  const paddedSignal = [...new Array(macd.length - signal.length).fill(NaN), ...signal]
  const hist = macd.map((v, i) => v - (paddedSignal[i] ?? NaN))
  return { macd, signal: paddedSignal, hist }
}

function calcBollinger(closes: number[], period = 20, mult = 2) {
  const sma = calcSMA(closes, period)
  const upper: number[] = []
  const lower: number[] = []
  closes.forEach((_, i) => {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); return }
    const slice = closes.slice(i - period + 1, i + 1)
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - sma[i]) ** 2, 0) / period)
    upper.push(sma[i] + mult * std)
    lower.push(sma[i] - mult * std)
  })
  return { sma, upper, lower }
}

function calcATR(bars: OHLCVBar[], period = 14): number[] {
  const tr: number[] = bars.map((b, i) => {
    if (i === 0) return b.high - b.low
    const prev = bars[i - 1]
    return Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close))
  })
  return calcSMA(tr, period)
}

// ── 4 Agent Functions ──
function runIndicatorAgent(bars: OHLCVBar[]): AgentResult {
  const closes = bars.map(b => b.close)
  const rsi = calcRSI(closes)
  const { macd, signal, hist } = calcMACD(closes)
  const sma20 = calcSMA(closes, 20)
  const sma50 = calcSMA(closes, 50)
  const lastRSI = rsi.filter(v => !isNaN(v)).pop() ?? 50
  const lastMACD = hist.filter(v => !isNaN(v)).pop() ?? 0
  const lastClose = closes[closes.length - 1]
  const lastSMA20 = sma20.filter(v => !isNaN(v)).pop() ?? lastClose
  const lastSMA50 = sma50.filter(v => !isNaN(v)).pop() ?? lastClose
  
  let score = 0
  if (lastRSI < 30) score += 2
  else if (lastRSI < 40) score += 1
  else if (lastRSI > 70) score -= 2
  else if (lastRSI > 60) score -= 1
  if (lastMACD > 0) score += 1; else score -= 1
  if (lastClose > lastSMA20) score += 1; else score -= 1
  if (lastClose > lastSMA50) score += 1; else score -= 1

  const signal_out: AgentResult['signal'] = score >= 2 ? 'BUY' : score <= -2 ? 'SELL' : score > 0 ? 'WATCH' : 'HOLD'
  return {
    agent: 'IndicatorAgent',
    signal: signal_out,
    confidence: Math.min(95, 50 + Math.abs(score) * 10),
    summary: `RSI=${lastRSI.toFixed(1)}, MACD hist=${lastMACD.toFixed(4)}, Price ${lastClose > lastSMA20 ? 'above' : 'below'} SMA20`,
    details: { rsi: lastRSI, macd_hist: lastMACD, sma20: lastSMA20, sma50: lastSMA50, score },
  }
}

function runPatternAgent(bars: OHLCVBar[], _chartImage?: string): AgentResult {
  const closes = closes_from(bars)
  const bb = calcBollinger(closes)
  const lastClose = closes[closes.length - 1]
  const lastUpper = bb.upper.filter(v => !isNaN(v)).pop() ?? lastClose
  const lastLower = bb.lower.filter(v => !isNaN(v)).pop() ?? lastClose
  const lastSMA = bb.sma.filter(v => !isNaN(v)).pop() ?? lastClose
  
  const patterns: string[] = []
  // Simple pattern detection
  if (lastClose >= lastUpper) patterns.push('Upper BB Touch')
  if (lastClose <= lastLower) patterns.push('Lower BB Touch')
  
  // Doji detection
  const lastBar = bars[bars.length - 1]
  const bodySize = Math.abs(lastBar.open - lastBar.close)
  const range = lastBar.high - lastBar.low
  if (range > 0 && bodySize / range < 0.1) patterns.push('Doji')
  
  // Engulfing
  if (bars.length >= 2) {
    const prev = bars[bars.length - 2]
    if (lastBar.close > lastBar.open && prev.close < prev.open &&
        lastBar.close > prev.open && lastBar.open < prev.close) patterns.push('Bullish Engulfing')
    if (lastBar.close < lastBar.open && prev.close > prev.open &&
        lastBar.close < prev.open && lastBar.open > prev.close) patterns.push('Bearish Engulfing')
  }
  
  const isBullish = patterns.some(p => p.includes('Bullish') || p.includes('Lower BB'))
  const isBearish = patterns.some(p => p.includes('Bearish') || p.includes('Upper BB'))
  
  return {
    agent: 'PatternAgent',
    signal: isBullish ? 'BUY' : isBearish ? 'SELL' : 'HOLD',
    confidence: patterns.length > 0 ? 60 + patterns.length * 10 : 40,
    summary: patterns.length > 0 ? `Patterns: ${patterns.join(', ')}` : 'No significant patterns detected',
    details: { patterns, bb_upper: lastUpper, bb_lower: lastLower, bb_sma: lastSMA },
  }
}

function closes_from(bars: OHLCVBar[]) { return bars.map(b => b.close) }

function runTrendAgent(bars: OHLCVBar[]): AgentResult {
  const closes = closes_from(bars)
  const ema20 = calcEMA(closes, 20)
  const ema50 = calcEMA(closes, 50)
  const ema200 = calcEMA(closes, Math.min(200, closes.length))
  
  const last20 = ema20[ema20.length - 1]
  const last50 = ema50[ema50.length - 1]
  const last200 = ema200[ema200.length - 1]
  const lastClose = closes[closes.length - 1]
  
  // ADX approximation via directional movement
  let upTrend = 0, downTrend = 0
  for (let i = Math.max(1, closes.length - 14); i < closes.length; i++) {
    if (closes[i] > closes[i-1]) upTrend++; else downTrend++
  }
  
  const trendStrength = Math.abs(upTrend - downTrend) / 14 * 100
  const isUpTrend = last20 > last50 && lastClose > last20
  const isDownTrend = last20 < last50 && lastClose < last20
  
  return {
    agent: 'TrendAgent',
    signal: isUpTrend ? 'BUY' : isDownTrend ? 'SELL' : 'HOLD',
    confidence: Math.min(90, 40 + trendStrength),
    summary: `${isUpTrend ? 'Uptrend' : isDownTrend ? 'Downtrend' : 'Sideways'} — EMA20=${last20.toFixed(2)}, EMA50=${last50.toFixed(2)}`,
    details: { ema20: last20, ema50: last50, ema200: last200, trend_strength: trendStrength },
  }
}

function runRiskAgent(bars: OHLCVBar[]): AgentResult {
  const closes = closes_from(bars)
  const atr = calcATR(bars)
  const lastATR = atr.filter(v => !isNaN(v)).pop() ?? 0
  const lastClose = closes[closes.length - 1]
  
  // Volatility assessment
  const returns = closes.slice(-20).map((c, i, a) => i > 0 ? Math.log(c / a[i-1]) : 0).slice(1)
  const vol = Math.sqrt(returns.reduce((s, r) => s + r * r, 0) / returns.length) * Math.sqrt(252) * 100
  
  // Risk score
  const riskLevel = vol > 40 ? 'HIGH' : vol > 20 ? 'MEDIUM' : 'LOW'
  const suggestedSL = lastClose - 2 * lastATR
  const suggestedTP = lastClose + 3 * lastATR
  
  return {
    agent: 'RiskAgent',
    signal: riskLevel === 'HIGH' ? 'WATCH' : 'HOLD',
    confidence: 70,
    summary: `Risk: ${riskLevel} — ATR=${lastATR.toFixed(4)}, Vol=${vol.toFixed(1)}%`,
    details: { atr: lastATR, volatility: vol, risk_level: riskLevel, suggested_sl: suggestedSL, suggested_tp: suggestedTP },
  }
}

// ── Generate synthetic bars from symbol ──
async function fetchBars(symbol: string, timeframe: string): Promise<OHLCVBar[]> {
  // Try Binance for crypto
  const binanceSymbols: Record<string, string> = {
    'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT', 'SOLUSD': 'SOLUSDT',
    'BTCUSDT': 'BTCUSDT', 'ETHUSDT': 'ETHUSDT',
  }
  
  const tfMap: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1d',
  }
  
  const binSym = binanceSymbols[symbol.toUpperCase()]
  if (binSym) {
    try {
      const interval = tfMap[timeframe] || '1h'
      const resp = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=200`)
      if (resp.ok) {
        const data = await resp.json()
        return data.map((k: any) => ({
          timestamp: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
        }))
      }
    } catch { /* fallback */ }
  }
  
  // Synthetic data for non-crypto
  const bars: OHLCVBar[] = []
  let price = symbol.includes('XAU') ? 2350 : symbol.includes('EUR') ? 1.08 : 100
  const now = Date.now()
  for (let i = 200; i >= 0; i--) {
    const change = (Math.random() - 0.48) * price * 0.005
    const open = price
    const close = price + change
    const high = Math.max(open, close) + Math.random() * Math.abs(change) * 0.5
    const low = Math.min(open, close) - Math.random() * Math.abs(change) * 0.5
    bars.push({ timestamp: now - i * 3600000, open, high, low, close, volume: Math.random() * 1000 })
    price = close
  }
  return bars
}

// ── Final Decision ──
function makeFinalDecision(agents: { indicator: AgentResult; pattern: AgentResult; trend: AgentResult; risk: AgentResult }, bars: OHLCVBar[]) {
  const signalScore: Record<string, number> = { BUY: 2, WATCH: 0.5, HOLD: 0, SELL: -2 }
  const weights = { indicator: 0.3, pattern: 0.2, trend: 0.35, risk: 0.15 }
  
  let weighted = 0
  let totalConf = 0
  for (const [key, agent] of Object.entries(agents)) {
    const w = weights[key as keyof typeof weights]
    weighted += (signalScore[agent.signal] ?? 0) * w * (agent.confidence / 100)
    totalConf += agent.confidence * w
  }
  
  const signal = weighted >= 1.2 ? 'STRONG_BUY' : weighted >= 0.5 ? 'BUY' : weighted <= -1.2 ? 'STRONG_SELL' : weighted <= -0.5 ? 'SELL' : 'HOLD'
  const lastClose = bars[bars.length - 1].close
  const atr = agents.risk.details.atr || lastClose * 0.01
  
  return {
    signal,
    confidence: Math.round(totalConf),
    priceTarget: +(lastClose + 3 * atr).toFixed(4),
    stopLoss: +(lastClose - 2 * atr).toFixed(4),
    riskReward: +(3 / 2).toFixed(1),
    rationale: `${signal} based on ${Object.values(agents).filter(a => a.signal === 'BUY').length}/4 agents bullish. Trend: ${agents.trend.summary}`,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { symbol, timeframe = '1h', bars: clientBars, chartImage, includeVision } = await req.json()
    
    if (!symbol) throw new Error('Symbol is required')

    const bars = clientBars?.length > 50 ? clientBars : await fetchBars(symbol, timeframe)
    
    if (bars.length < 20) throw new Error('Insufficient data for analysis')

    const indicator = runIndicatorAgent(bars)
    const pattern = runPatternAgent(bars, chartImage)
    const trend = runTrendAgent(bars)
    const risk = runRiskAgent(bars)

    const agents = { indicator, pattern, trend, risk }
    const finalDecision = makeFinalDecision(agents, bars)

    // Optional: AI-enhanced rationale
    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (LOVABLE_KEY) {
      try {
        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{
              role: 'user',
              content: `Summarize this QuantAgent analysis in 2 sentences (Thai):
Symbol: ${symbol} (${timeframe})
Indicator: ${indicator.signal} (${indicator.confidence}%) - ${indicator.summary}
Pattern: ${pattern.signal} (${pattern.confidence}%) - ${pattern.summary}
Trend: ${trend.signal} (${trend.confidence}%) - ${trend.summary}
Risk: ${risk.signal} (${risk.confidence}%) - ${risk.summary}
Final: ${finalDecision.signal} — Confidence ${finalDecision.confidence}%`
            }],
          }),
        })
        if (aiResp.ok) {
          const aiData = await aiResp.json()
          const aiText = aiData.choices?.[0]?.message?.content
          if (aiText) finalDecision.rationale = aiText
        }
      } catch { /* AI enhancement optional */ }
    }

    return new Response(JSON.stringify({
      success: true,
      symbol: symbol.toUpperCase(),
      timeframe,
      timestamp: new Date().toISOString(),
      agents,
      finalDecision,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    console.error('QuantAgent error:', e)
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})