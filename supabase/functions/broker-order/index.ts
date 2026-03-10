import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
}

// Input validation schema
const OrderSchema = z.object({
  connectionId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  action: z.enum(['buy', 'sell', 'close', 'cancel', 'Buy', 'Sell', 'Close', 'Cancel', 'BUY', 'SELL', 'CLOSE', 'CANCEL']),
  symbol: z.string().max(20).optional(),
  quantity: z.number().positive().max(10000).finite().optional(),
  price: z.number().nonnegative().finite().optional(),
  orderType: z.string().max(20).optional(),
  orderId: z.string().max(50).optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10240) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { 
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // SECURITY: Verify user authentication
    const authHeader = req.headers.get('Authorization')
    let authenticatedUserId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const token = authHeader.replace('Bearer ', '')
      const { data: claimsData } = await supabaseAuth.auth.getClaims(token)
      authenticatedUserId = (claimsData?.claims?.sub as string) || null
    }

    // Validate input
    const rawBody = await req.json()
    const parseResult = OrderSchema.safeParse(rawBody)
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input', details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { connectionId, roomId, messageId, action, symbol, quantity, price, orderType, orderId } = parseResult.data

    console.log(`📤 Broker order: ${action} ${symbol || ''}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get connection
    const { data: connection, error: dbError } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (dbError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Verify user owns this connection
    if (authenticatedUserId && connection.user_id !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!connection.is_active || !connection.session_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not connected to broker' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (quantity && quantity > (connection.max_position_size || 100)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Quantity exceeds max limit (${connection.max_position_size})`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const session = connection.session_data as any

    if (Date.now() >= session.token_expiry) {
      await supabase
        .from('broker_connections')
        .update({
          is_connected: false,
          last_error: 'Session expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ success: false, error: 'Session expired, please reconnect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: forwardLog } = await supabase
      .from('api_forward_logs')
      .insert({
        connection_id: connectionId,
        room_id: roomId || connection.room_id,
        message_id: messageId,
        broker_type: connection.broker_type,
        action,
        symbol: symbol || '',
        quantity: quantity || 0,
        price,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    let result: any

    if (connection.broker_type === 'tradovate') {
      result = await executeTradovateOrder({
        credentials: connection.credentials,
        session,
        action,
        symbol,
        quantity,
        price,
        orderType,
        orderId
      })
    } else if (connection.broker_type === 'settrade') {
      result = await executeSettradeOrder({
        credentials: connection.credentials,
        session,
        action,
        symbol,
        quantity,
        price,
        orderId
      })
    } else {
      result = { success: false, latency: 0, error: 'Unknown broker type' }
    }

    if (forwardLog) {
      await supabase
        .from('api_forward_logs')
        .update({
          status: result.success ? 'success' : 'failed',
          order_id: result.orderId,
          error_message: result.error,
          latency_ms: result.latency,
          response_data: result.rawResponse,
          executed_at: new Date().toISOString()
        })
        .eq('id', forwardLog.id)
    }

    await supabase
      .from('broker_connections')
      .update({
        total_orders_sent: (connection.total_orders_sent || 0) + 1,
        successful_orders: result.success
          ? (connection.successful_orders || 0) + 1
          : connection.successful_orders,
        failed_orders: !result.success
          ? (connection.failed_orders || 0) + 1
          : connection.failed_orders,
        avg_latency_ms: result.latency,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    return new Response(
      JSON.stringify({
        success: result.success,
        orderId: result.orderId,
        orderStatus: result.orderStatus,
        latency: result.latency,
        error: result.error,
        logId: forwardLog?.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('❌ Order error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function executeTradovateOrder(params: {
  credentials: any
  session: any
  action: string
  symbol?: string
  quantity?: number
  price?: number
  orderType?: string
  orderId?: string
}) {
  const { credentials, session, action, symbol, quantity, price, orderType, orderId } = params
  const baseUrl = credentials.env === 'live'
    ? 'https://live.tradovateapi.com/v1'
    : 'https://demo.tradovateapi.com/v1'

  const start = Date.now()

  try {
    switch (action.toLowerCase()) {
      case 'buy':
      case 'sell': {
        const orderPayload: any = {
          accountSpec: session.account_spec,
          accountId: session.account_id,
          action: action.toLowerCase() === 'buy' ? 'Buy' : 'Sell',
          symbol,
          orderQty: quantity,
          orderType: orderType || 'Market',
          isAutomated: true
        }

        if (orderType === 'Limit' && price) orderPayload.price = price
        if (orderType === 'Stop' && price) orderPayload.stopPrice = price

        const response = await fetch(`${baseUrl}/order/placeorder`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderPayload)
        })

        const latency = Date.now() - start
        const data = await response.json()

        if (!response.ok) {
          return { success: false, latency, error: data.errorText || data.message || `HTTP ${response.status}`, rawResponse: data }
        }

        return { success: true, orderId: data.orderId?.toString(), orderStatus: data.orderStatus || 'Submitted', latency, rawResponse: data }
      }

      case 'close': {
        const posResponse = await fetch(`${baseUrl}/position/list`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })

        if (!posResponse.ok) return { success: false, latency: Date.now() - start, error: 'Failed to get positions' }

        const positions = await posResponse.json()
        const position = positions.find((p: any) => p.netPos !== 0 && (p.contract?.name === symbol || p.symbol === symbol))

        if (!position) return { success: false, latency: Date.now() - start, error: 'No position found' }

        const closePayload = {
          accountSpec: session.account_spec,
          accountId: session.account_id,
          action: position.netPos > 0 ? 'Sell' : 'Buy',
          symbol,
          orderQty: Math.abs(position.netPos),
          orderType: 'Market',
          isAutomated: true
        }

        const response = await fetch(`${baseUrl}/order/placeorder`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(closePayload)
        })

        const latency = Date.now() - start
        const data = await response.json()
        if (!response.ok) return { success: false, latency, error: data.errorText || 'Close failed', rawResponse: data }
        return { success: true, orderId: data.orderId?.toString(), latency, rawResponse: data }
      }

      case 'cancel': {
        const response = await fetch(`${baseUrl}/order/cancelorder`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: parseInt(orderId || '0') })
        })
        const latency = Date.now() - start
        if (!response.ok) {
          const data = await response.json()
          return { success: false, latency, error: data.errorText || 'Cancel failed' }
        }
        return { success: true, latency }
      }

      default:
        return { success: false, latency: 0, error: 'Invalid action' }
    }
  } catch (err: any) {
    return { success: false, latency: Date.now() - start, error: err.message }
  }
}

async function executeSettradeOrder(params: {
  credentials: any
  session: any
  action: string
  symbol?: string
  quantity?: number
  price?: number
  orderId?: string
}) {
  const { credentials, session, action, symbol, quantity, price, orderId } = params
  const baseUrl = credentials.env === 'prod'
    ? 'https://open-api.settrade.com/api'
    : 'https://open-api-uat.settrade.com/api'

  const { brokerId, accountNo, pin } = credentials
  const authHeader = `${session.token_type} ${session.access_token}`
  const start = Date.now()

  try {
    switch (action.toLowerCase()) {
      case 'buy':
      case 'sell': {
        const orderPayload: any = {
          symbol: symbol?.toUpperCase(),
          side: action.toLowerCase() === 'buy' ? 'B' : 'S',
          volume: quantity,
          priceType: price ? 'LMT' : 'MP',
          validity: 'DAY'
        }
        if (price) orderPayload.price = price
        if (pin) orderPayload.pin = pin

        const response = await fetch(`${baseUrl}/equity/${brokerId}/accounts/${accountNo}/orders`, {
          method: 'POST',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        })

        const latency = Date.now() - start
        const data = await response.json()
        if (!response.ok) return { success: false, latency, error: data.message || data.error_description || `HTTP ${response.status}`, rawResponse: data }
        return { success: true, orderId: data.orderNo || data.orderId, orderStatus: data.status || 'Submitted', latency, rawResponse: data }
      }

      case 'cancel': {
        const response = await fetch(`${baseUrl}/equity/${brokerId}/accounts/${accountNo}/orders/${orderId}`, {
          method: 'DELETE',
          headers: { 'Authorization': authHeader }
        })
        const latency = Date.now() - start
        if (!response.ok) {
          const data = await response.json()
          return { success: false, latency, error: data.message || 'Cancel failed' }
        }
        return { success: true, latency }
      }

      default:
        return { success: false, latency: 0, error: 'Invalid action for Settrade' }
    }
  } catch (err: any) {
    return { success: false, latency: Date.now() - start, error: err.message }
  }
}
