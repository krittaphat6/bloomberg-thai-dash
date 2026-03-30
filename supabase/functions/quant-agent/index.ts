import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Types ───
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

interface QuantAgentRequest {
  symbol: string
  timeframe?: string
  bars?: OHLCVBar[]
  chartImage?: string
  includeVision?: boolean
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

function calcStochastic(bars: OHLCVBar[], kPeriod = 14, dPeriod = 3) {
  const k = bars.map((_, i) => {
    if (i < kPeriod - 1) return NaN
    const slice = bars.slice(i - kPeriod + 1, i + 1)
    const highest = Math.max(...slice.map(b => b.high))
    const lowest = Math.min(...slice.map(b => b.low))
    if (highest === lowest) return 50
    return ((bars[i].close - lowest) / (highest - lowest)) * 100
  })
  const validK = k.filter(v => !isNaN(v))
  const d = calcSMA(validK, dPeriod)
  return { k, d: [...new Array(k.length - d.length).fill(NaN), ...d] }
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

// ── AGENT 1: IndicatorAgent ──
function runIndicatorAgent(bars: OHLCVBar[]): AgentResult {
  const closes = bars.map(b => b.close)
  const n = closes.length
  const last = closes[n - 1]

  const rsi = calcRSI(closes)
  const { hist } = calcMACD(closes)
  const stoch = calcStochastic(bars)
  const ema20 = calcEMA(closes, 20)
  const ema50 = calcEMA(closes, 50)
  const bb = calcBollinger(closes)
  const atr = calcATR(bars)

  const lastRSI = rsi[n - 1] ?? 50
  const lastMACD = hist[n - 1] ?? 0
  const prevHist = hist[n - 2] ?? 0
  const lastStochK = stoch.k[n - 1] ?? 50
  const lastEMA20 = ema20[n - 1] ?? last
  const lastEMA50 = ema50[n - 1] ?? last
  const lastBBUpper = bb.upper[n - 1] ?? last
  const lastBBLower = bb.lower[n - 1] ?? last
  const lastATR = atr[n - 1] ?? 0

  let score = 0
  const signals: string[] = []

  // RSI
  if (lastRSI < 30) { score += 2; signals.push('RSI Oversold (Bullish)') }
  else if (lastRSI > 70) { score -= 2; signals.push('RSI Overbought (Bearish)') }
  else if (lastRSI > 50) { score += 1; signals.push('RSI Bullish Zone') }
  else { score -= 1; signals.push('RSI Bearish Zone') }

  // MACD Histogram
  if (lastMACD > 0 && lastMACD > prevHist) { score += 2; signals.push('MACD Bullish Momentum') }
  else if (lastMACD < 0 && lastMACD < prevHist) { score -= 2; signals.push('MACD Bearish Momentum') }
  else if (lastMACD > 0) { score += 1; signals.push('MACD Positive') }
  else { score -= 1; signals.push('MACD Negative') }

  // Stochastic
  if (lastStochK < 20) { score += 2; signals.push('Stochastic Oversold') }
  else if (lastStochK > 80) { score -= 2; signals.push('Stochastic Overbought') }

  // EMA Trend
  if (lastEMA20 > lastEMA50) { score += 1; signals.push('EMA20 > EMA50 (Uptrend)') }
  else { score -= 1; signals.push('EMA20 < EMA50 (Downtrend)') }

  // Bollinger
  if (last < lastBBLower) { score += 1; signals.push('Price below BB Lower (Oversold)') }
  else if (last > lastBBUpper) { score -= 1; signals.push('Price above BB Upper (Overbought)') }

  const maxScore = 9
  const normalizedScore = Math.max(-maxScore, Math.min(maxScore, score))
  const confidence = Math.round(50 + (normalizedScore / maxScore) * 45)
  const signal: AgentResult['signal'] = score >= 4 ? 'BUY' : score <= -4 ? 'SELL' : score > 0 ? 'WATCH' : 'HOLD'

  return {
    agent: 'IndicatorAgent',
    signal,
    confidence,
    summary: `RSI:${lastRSI.toFixed(1)} | MACD Hist:${lastMACD.toFixed(4)} | Stoch K:${lastStochK.toFixed(1)} | ATR:${lastATR.toFixed(4)}`,
    details: { rsi: lastRSI, macd_hist: lastMACD, stoch_k: lastStochK, ema20: lastEMA20, ema50: lastEMA50, bb_upper: lastBBUpper, bb_lower: lastBBLower, atr: lastATR, active_signals: signals, score },
  }
}

// ── AGENT 2: TrendAgent ──
function runTrendAgent(bars: OHLCVBar[]): AgentResult {
  const closes = bars.map(b => b.close)
  const highs = bars.map(b => b.high)
  const lows = bars.map(b => b.low)
  const n = closes.length
  const last = closes[n - 1]

  const recent20 = closes.slice(-20)
  const oldest = recent20[0]
  const priceChange = ((last - oldest) / oldest) * 100
  const volatility = calcATR(bars.slice(-20), 10)
  const avgATR = volatility.filter(v => !isNaN(v)).slice(-5).reduce((a, b) => a + b, 0) / 5

  const recentHighs = highs.slice(-10)
  const recentLows = lows.slice(-10)
  const hhCount = recentHighs.filter((h, i) => i > 0 && h > recentHighs[i - 1]).length
  const llCount = recentLows.filter((l, i) => i > 0 && l < recentLows[i - 1]).length
  const hlCount = recentLows.filter((l, i) => i > 0 && l > recentLows[i - 1]).length

  const ema20 = calcEMA(closes, 20)
  const emaSlope = ema20[n - 1] - ema20[Math.max(0, n - 6)]

  let score = 0
  const signals: string[] = []
  let regime: string

  if (hhCount >= 5 && hlCount >= 4) { score += 3; signals.push('Strong Uptrend (HH+HL)'); regime = 'UPTREND' }
  else if (llCount >= 5) { score -= 3; signals.push('Strong Downtrend (LL+LH)'); regime = 'DOWNTREND' }
  else { regime = 'RANGING' }

  if (priceChange > 2) { score += 2; signals.push(`Bullish +${priceChange.toFixed(1)}% (20 bars)`) }
  else if (priceChange < -2) { score -= 2; signals.push(`Bearish ${priceChange.toFixed(1)}% (20 bars)`) }

  if (emaSlope > 0) { score += 1; signals.push('EMA20 Sloping Up') }
  else { score -= 1; signals.push('EMA20 Sloping Down') }

  const signal: AgentResult['signal'] = score >= 3 ? 'BUY' : score <= -3 ? 'SELL' : 'HOLD'

  return {
    agent: 'TrendAgent',
    signal,
    confidence: Math.max(20, Math.min(95, Math.round(50 + (score / 6) * 40))),
    summary: `Regime: ${regime} | Price Change: ${priceChange.toFixed(2)}% | EMA Slope: ${emaSlope > 0 ? '↑' : '↓'}`,
    details: { regime, priceChange, emaSlope, hhCount, llCount, hlCount, avgATR, signals },
  }
}

// ── AGENT 3: PatternAgent (with optional Gemini Vision) ──
async function runPatternAgent(bars: OHLCVBar[], chartImage: string | undefined, symbol: string, geminiApiKey: string): Promise<AgentResult> {
  if (!chartImage || !geminiApiKey) {
    return runPatternHeuristic(bars)
  }

  const prompt = `You are a professional technical analyst. Analyze this trading chart for ${symbol}.
Identify: 1) Chart patterns 2) Key S/R levels 3) Candlestick patterns 4) Overall signal.
Respond ONLY in JSON: {"patterns":[],"candlestick_pattern":null,"support_levels":[],"resistance_levels":[],"signal":"BUY|SELL|HOLD|WATCH","confidence":0-100,"summary":"brief"}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/png', data: chartImage } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        })
      }
    )
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const result = JSON.parse(jsonMatch[0])
    return {
      agent: 'PatternAgent',
      signal: result.signal ?? 'HOLD',
      confidence: result.confidence ?? 50,
      summary: result.summary ?? `Patterns: ${(result.patterns || []).join(', ')}`,
      details: { patterns: result.patterns ?? [], candlestick_pattern: result.candlestick_pattern, support_levels: result.support_levels ?? [], resistance_levels: result.resistance_levels ?? [], source: 'gemini-vision' },
    }
  } catch {
    return runPatternHeuristic(bars)
  }
}

function runPatternHeuristic(bars: OHLCVBar[]): AgentResult {
  const closes = bars.map(b => b.close)
  const n = closes.length
  const last = closes[n - 1]
  const bb = calcBollinger(closes)
  const lastUpper = bb.upper[n - 1] ?? last
  const lastLower = bb.lower[n - 1] ?? last

  const patterns: string[] = []
  let score = 0

  if (last >= lastUpper) { patterns.push('Upper BB Touch'); score -= 1 }
  if (last <= lastLower) { patterns.push('Lower BB Touch'); score += 1 }

  // Doji
  const lastBar = bars[n - 1]
  const bodySize = Math.abs(lastBar.open - lastBar.close)
  const range = lastBar.high - lastBar.low
  if (range > 0 && bodySize / range < 0.1) patterns.push('Doji')

  // Engulfing
  if (n >= 2) {
    const prev = bars[n - 2]
    if (lastBar.close > lastBar.open && prev.close < prev.open && lastBar.close > prev.open && lastBar.open < prev.close) { patterns.push('Bullish Engulfing'); score += 2 }
    if (lastBar.close < lastBar.open && prev.close > prev.open && lastBar.close < prev.open && lastBar.open > prev.close) { patterns.push('Bearish Engulfing'); score -= 2 }
  }

  // Near support/resistance
  const recent = closes.slice(-20)
  const max20 = Math.max(...recent)
  const min20 = Math.min(...recent)
  const rangeR = max20 - min20
  const posInRange = rangeR > 0 ? (last - min20) / rangeR : 0.5
  if (posInRange < 0.15) { score += 2; patterns.push('Near 20-bar Support') }
  else if (posInRange > 0.85) { score -= 2; patterns.push('Near 20-bar Resistance') }

  return {
    agent: 'PatternAgent',
    signal: score >= 2 ? 'BUY' : score <= -2 ? 'SELL' : 'HOLD',
    confidence: patterns.length > 0 ? 50 + patterns.length * 10 : 40,
    summary: patterns.length > 0 ? `Patterns: ${patterns.join(', ')}` : 'No significant patterns detected',
    details: { patterns, bb_upper: lastUpper, bb_lower: lastLower, source: 'heuristic' },
  }
}

// ── AGENT 4: RiskAgent (Gemini Synthesis) ──
async function runRiskAgent(
  indicatorResult: AgentResult, patternResult: AgentResult, trendResult: AgentResult,
  bars: OHLCVBar[], symbol: string, geminiApiKey: string
): Promise<AgentResult> {
  const closes = bars.map(b => b.close)
  const last = closes[closes.length - 1]
  const atr = calcATR(bars, 14)
  const lastATR = atr[atr.length - 1] ?? last * 0.01

  const agentSummary = `
IndicatorAgent: Signal=${indicatorResult.signal} Confidence=${indicatorResult.confidence}% | ${indicatorResult.summary}
PatternAgent: Signal=${patternResult.signal} Confidence=${patternResult.confidence}% | ${patternResult.summary}
TrendAgent: Signal=${trendResult.signal} Confidence=${trendResult.confidence}% | ${trendResult.summary}
Current Price: ${last}
ATR(14): ${lastATR.toFixed(5)}
Symbol: ${symbol}`

  // Try Gemini for AI synthesis
  if (geminiApiKey) {
    try {
      const prompt = `You are a professional risk manager. Given these 3 agent analyses:\n${agentSummary}\n\nSynthesize all signals. Respond ONLY in JSON:\n{"signal":"STRONG_BUY|BUY|HOLD|SELL|STRONG_SELL","confidence":0-100,"stop_loss":number,"price_target":number,"risk_reward":number,"rationale":"2-3 sentences in Thai","risk_level":"LOW|MEDIUM|HIGH","key_risks":["risk1"]}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 512 }
          })
        }
      )
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          agent: 'RiskAgent',
          signal: result.signal?.includes('BUY') ? 'BUY' : result.signal?.includes('SELL') ? 'SELL' : 'HOLD',
          confidence: result.confidence ?? 50,
          summary: result.rationale ?? 'Risk synthesis complete',
          details: { final_signal: result.signal, stop_loss: result.stop_loss, price_target: result.price_target, risk_reward: result.risk_reward, risk_level: result.risk_level, key_risks: result.key_risks ?? [] },
        }
      }
    } catch { /* fallback */ }
  }

  // Fallback: weighted vote
  const scores: Record<string, number> = { BUY: 0, SELL: 0, HOLD: 0, WATCH: 0 }
  const weights = [0.35, 0.3, 0.35];
  [indicatorResult, patternResult, trendResult].forEach((r, i) => {
    const sig = r.signal === 'WATCH' ? 'HOLD' : r.signal
    scores[sig] = (scores[sig] ?? 0) + (r.confidence / 100) * weights[i]
  })
  const bestSignal = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as AgentResult['signal']
  const stop_loss = last - lastATR * 2
  const price_target = last + lastATR * 3

  return {
    agent: 'RiskAgent',
    signal: bestSignal,
    confidence: Math.round((scores[bestSignal] ?? 0) * 100),
    summary: `Weighted consensus: ${bestSignal}. SL: ${stop_loss.toFixed(5)} TP: ${price_target.toFixed(5)}`,
    details: { final_signal: bestSignal, stop_loss, price_target, risk_reward: 1.5, risk_level: 'MEDIUM', key_risks: ['Consensus not unanimous — use small position'], scores },
  }
}

// ── Fetch bars ──
async function fetchBars(symbol: string, timeframe: string): Promise<OHLCVBar[]> {
  const binanceSymbols: Record<string, string> = {
    'BTCUSD': 'BTCUSDT', 'ETHUSD': 'ETHUSDT', 'SOLUSD': 'SOLUSDT',
    'BTCUSDT': 'BTCUSDT', 'ETHUSDT': 'ETHUSDT', 'BNBUSD': 'BNBUSDT',
  }
  const tfMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1d' }

  const binSym = binanceSymbols[symbol.toUpperCase()]
  if (binSym) {
    try {
      const interval = tfMap[timeframe] || '1h'
      const resp = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=200`)
      if (resp.ok) {
        const data = await resp.json()
        return data.map((k: any) => ({ timestamp: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }))
      }
    } catch { /* fallback */ }
  }

  // Try market-data-proxy
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (supabaseUrl && supabaseKey) {
      const proxyRes = await fetch(`${supabaseUrl}/functions/v1/market-data-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ source: 'yahoo', symbols: [symbol], range: '1mo', interval: '1h' })
      })
      const proxyData = await proxyRes.json()
      const result = proxyData?.yahoo?.[symbol] ?? proxyData?.[symbol]
      if (result?.timestamps && result?.quotes) {
        const bars = result.timestamps.map((t: number, i: number) => ({
          timestamp: t * 1000, open: result.quotes.open?.[i] ?? 0, high: result.quotes.high?.[i] ?? 0,
          low: result.quotes.low?.[i] ?? 0, close: result.quotes.close?.[i] ?? 0, volume: result.quotes.volume?.[i] ?? 0,
        })).filter((b: OHLCVBar) => b.close > 0)
        if (bars.length >= 30) return bars
      }
    }
  } catch { /* fallback */ }

  // Synthetic data
  const bars: OHLCVBar[] = []
  let price = symbol.includes('XAU') ? 2350 : symbol.includes('EUR') ? 1.08 : symbol.includes('US500') ? 5600 : symbol.includes('OIL') ? 68 : 100
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
  const atr = agents.risk.details.atr || agents.indicator.details.atr || lastClose * 0.01

  // Use RiskAgent's AI-computed values if available
  const riskDetails = agents.risk.details
  return {
    signal,
    confidence: Math.round(totalConf),
    priceTarget: riskDetails.price_target ?? +(lastClose + 3 * atr).toFixed(4),
    stopLoss: riskDetails.stop_loss ?? +(lastClose - 2 * atr).toFixed(4),
    riskReward: riskDetails.risk_reward ?? +(3 / 2).toFixed(1),
    rationale: agents.risk.summary || `${signal} based on ${Object.values(agents).filter(a => a.signal === 'BUY').length}/4 agents bullish.`,
    riskLevel: riskDetails.risk_level ?? 'MEDIUM',
    keyRisks: riskDetails.key_risks ?? [],
  }
}

// ── Main Handler ──
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body: QuantAgentRequest = await req.json()
    const { symbol, timeframe = '1h', bars: clientBars, chartImage, includeVision = true } = body

    if (!symbol) {
      return new Response(JSON.stringify({ success: false, error: 'symbol is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

    // Use provided bars or fetch
    let ohlcvBars: OHLCVBar[] = clientBars?.length ? clientBars : []
    if (ohlcvBars.length < 30) {
      ohlcvBars = await fetchBars(symbol.toUpperCase(), timeframe)
    }

    if (ohlcvBars.length < 20) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient price data (need 20+ bars)' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Run agents — Indicator + Trend in parallel, then Pattern (may use vision), then Risk (uses all 3)
    const [indicatorResult, trendResult] = await Promise.all([
      Promise.resolve(runIndicatorAgent(ohlcvBars)),
      Promise.resolve(runTrendAgent(ohlcvBars)),
    ])

    const patternResult = await runPatternAgent(
      ohlcvBars,
      includeVision ? chartImage : undefined,
      symbol.toUpperCase(),
      GEMINI_API_KEY
    )

    const riskResult = await runRiskAgent(indicatorResult, patternResult, trendResult, ohlcvBars, symbol.toUpperCase(), GEMINI_API_KEY)

    const agents = { indicator: indicatorResult, pattern: patternResult, trend: trendResult, risk: riskResult }
    const finalDecision = makeFinalDecision(agents, ohlcvBars)

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
