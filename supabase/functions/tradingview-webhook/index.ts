import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeSignal {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  action: 'OPEN' | 'CLOSE' | 'BUY' | 'SELL' | 'TAKE_PROFIT' | 'STOP_LOSS';
  price: number;
  quantity?: number;
  lotSize?: number;
  strategy?: string;
  pnl?: number;
  pnlPercentage?: number;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔗 TradingView Webhook received')
    
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const roomId = pathParts[pathParts.length - 1]
    
    console.log('📊 Room ID:', roomId)
    
    if (!roomId || roomId === 'tradingview-webhook') {
      return new Response(JSON.stringify({ error: 'Room ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Parse body
    let body: any
    try {
      body = await req.json()
      console.log('📦 Webhook payload:', JSON.stringify(body, null, 2))
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e)
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify webhook room exists
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('room_id', roomId)
      .single()

    if (webhookError || !webhook) {
      console.error('❌ Webhook not found:', webhookError)
      return new Response(JSON.stringify({ error: 'Webhook not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Webhook found:', webhook.id)

    // Ensure tradingview user exists
    const { data: tvUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', 'tradingview')
      .single()

    if (!tvUser) {
      console.log('📝 Creating tradingview user...')
      await supabase.from('users').insert({
        id: 'tradingview',
        username: '📊 TradingView',
        color: '#2962FF',
        status: 'online'
      })
    }

    // Parse trade signal from webhook data
    const tradeSignal = parseTradeSignal(body)
    
    // Format TradingView alert message
    const alertContent = formatTradingViewAlert(body, tradeSignal)

    // Insert message into chat room with enhanced trade data
    const { data: message, error: messageError } = await supabase.from('messages').insert({
      room_id: roomId,
      user_id: 'tradingview',
      username: '📊 TradingView',
      color: '#2962FF',
      content: alertContent,
      message_type: 'webhook',
      webhook_data: {
        ...body,
        parsed_trade: tradeSignal
      }
    }).select().single()

    if (messageError) {
      console.error('❌ Failed to insert message:', messageError)
      throw messageError
    }

    console.log('✅ Message created:', message.id)
    console.log('📈 Trade signal:', tradeSignal)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Alert received',
      messageId: message.id,
      tradeSignal
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('💥 Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Parse trade signal from various webhook formats
function parseTradeSignal(data: any): TradeSignal {
  const { 
    ticker, symbol, action, side,
    price, close, entry, exit,
    quantity, qty, volume, lot, lotSize,
    strategy, message,
    pnl, profit, pnlPercent, profitPercent,
    type, order_action, signal
  } = data
  
  // Determine action type
  let tradeAction: TradeSignal['action'] = 'OPEN'
  const actionStr = (action || order_action || signal || '').toString().toLowerCase()
  
  if (actionStr.includes('close') || actionStr.includes('exit') || actionStr.includes('ออก')) {
    tradeAction = 'CLOSE'
  } else if (actionStr.includes('take') || actionStr.includes('tp') || actionStr.includes('profit') || actionStr.includes('ทำกำไร')) {
    tradeAction = 'TAKE_PROFIT'
  } else if (actionStr.includes('stop') || actionStr.includes('sl') || actionStr.includes('loss') || actionStr.includes('ตัดขาดทุน')) {
    tradeAction = 'STOP_LOSS'
  } else if (actionStr.includes('buy') || actionStr.includes('long') || actionStr.includes('ซื้อ')) {
    tradeAction = 'BUY'
  } else if (actionStr.includes('sell') || actionStr.includes('short') || actionStr.includes('ขาย')) {
    tradeAction = 'SELL'
  }
  
  // Determine side
  let tradeSide: 'LONG' | 'SHORT' = 'LONG'
  const sideStr = (side || action || order_action || '').toString().toLowerCase()
  if (sideStr.includes('short') || sideStr.includes('sell') || sideStr.includes('ขาย')) {
    tradeSide = 'SHORT'
  }
  
  // Parse price
  const tradePrice = parseFloat(price || close || entry || exit || 0)
  
  // Parse quantity
  const tradeQuantity = parseFloat(quantity || qty || volume || 1)
  const tradeLotSize = parseFloat(lot || lotSize || 1)
  
  // Parse P&L if closing
  const tradePnl = parseFloat(pnl || profit || 0)
  const tradePnlPercent = parseFloat(pnlPercent || profitPercent || 0)
  
  return {
    id: `tv-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    symbol: ticker || symbol || 'UNKNOWN',
    side: tradeSide,
    type: 'CFD',
    action: tradeAction,
    price: tradePrice,
    quantity: tradeQuantity,
    lotSize: tradeLotSize,
    strategy: strategy || 'TradingView Alert',
    pnl: tradePnl || undefined,
    pnlPercentage: tradePnlPercent || undefined,
    message: message || undefined
  }
}

function formatTradingViewAlert(data: any, signal: TradeSignal): string {
  const { ticker, time, message, exchange, interval } = data
  
  // Action emoji and color hint
  const actionEmoji = {
    'OPEN': '🟢',
    'BUY': '🟢',
    'SELL': '🔴',
    'CLOSE': '🔵',
    'TAKE_PROFIT': '💰',
    'STOP_LOSS': '🛑'
  }[signal.action] || '📊'
  
  let content = `${actionEmoji} **TradingView Alert**\n\n`
  
  content += `🏷️ Symbol: ${signal.symbol}\n`
  content += `📌 Action: **${signal.action}** (${signal.side})\n`
  content += `💰 Price: ${signal.price}\n`
  
  if (signal.quantity && signal.quantity !== 1) {
    content += `📊 Quantity: ${signal.quantity}\n`
  }
  if (signal.lotSize && signal.lotSize !== 1) {
    content += `📏 Lot Size: ${signal.lotSize}\n`
  }
  
  // Show P&L for closing actions
  if (['CLOSE', 'TAKE_PROFIT', 'STOP_LOSS'].includes(signal.action)) {
    if (signal.pnl !== undefined) {
      const pnlSign = signal.pnl >= 0 ? '+' : ''
      content += `\n💵 P&L: ${pnlSign}${signal.pnl.toFixed(2)}`
      if (signal.pnlPercentage !== undefined) {
        content += ` (${pnlSign}${signal.pnlPercentage.toFixed(2)}%)`
      }
      content += '\n'
    }
  }
  
  if (exchange) content += `🏦 Exchange: ${exchange}\n`
  if (interval) content += `⏱️ Interval: ${interval}\n`
  if (time) content += `⏰ Time: ${time}\n`
  if (signal.strategy) content += `📈 Strategy: ${signal.strategy}\n`
  if (signal.message) content += `\n💬 ${signal.message}`
  
  return content
}
