import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Format TradingView alert message
    const alertContent = formatTradingViewAlert(body)

    // Insert message into chat room
    const { data: message, error: messageError } = await supabase.from('messages').insert({
      room_id: roomId,
      user_id: 'tradingview',
      username: '📊 TradingView',
      color: '#2962FF',
      content: alertContent,
      message_type: 'webhook',
      webhook_data: body
    }).select().single()

    if (messageError) {
      console.error('❌ Failed to insert message:', messageError)
      throw messageError
    }

    console.log('✅ Message created:', message.id)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Alert received',
      messageId: message.id 
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

function formatTradingViewAlert(data: any): string {
  // Format ข้อความจาก TradingView
  const { ticker, action, price, time, strategy, message, close, volume, exchange, interval } = data
  
  let content = `📊 **TradingView Alert**\n\n`
  
  if (ticker) content += `🏷️ Symbol: ${ticker}\n`
  if (action) content += `📌 Action: ${action.toUpperCase()}\n`
  if (price) content += `💰 Price: ${price}\n`
  if (close) content += `💰 Close: ${close}\n`
  if (volume) content += `📊 Volume: ${volume}\n`
  if (exchange) content += `🏦 Exchange: ${exchange}\n`
  if (interval) content += `⏱️ Interval: ${interval}\n`
  if (time) content += `⏰ Time: ${time}\n`
  if (strategy) content += `📈 Strategy: ${strategy}\n`
  if (message) content += `\n💬 ${message}`
  
  // If no specific fields, show raw message
  if (!ticker && !action && !price && !message) {
    content += `\n📝 Raw Alert:\n${JSON.stringify(data, null, 2)}`
  }
  
  return content
}
