import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type DataSource = 
  | 'broker_connections'
  | 'broker_status'
  | 'trades'
  | 'trade_stats'
  | 'market_data'
  | 'mt5_commands'
  | 'chat_rooms'
  | 'messages'
  | 'alerts'
  | 'api_logs'
  | 'all_summary';

interface AIRequest {
  action: 'query' | 'analyze' | 'summary';
  sources: DataSource[];
  userId?: string;
  roomId?: string;
  filters?: Record<string, any>;
  prompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authenticatedUserId = claimsData.claims.sub as string

    // Use service role for data queries but scope to user
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const request: AIRequest = await req.json()
    const data: Record<string, any> = {}

    for (const source of request.sources) {
      switch (source) {
        case 'broker_connections': {
          // SECURITY: Only return user's own connections, exclude credentials
          const { data: connections } = await serviceSupabase
            .from('broker_connections')
            .select('id, broker_type, is_active, is_connected, last_connected_at, total_orders_sent, successful_orders, failed_orders, avg_latency_ms')
            .eq('user_id', authenticatedUserId)
            .order('created_at', { ascending: false })
            .limit(10)
          data.broker_connections = connections || []
          break
        }

        case 'broker_status': {
          // SECURITY: Only user's own connections, NO credentials or session_data
          const { data: statusConns } = await serviceSupabase
            .from('broker_connections')
            .select('id, broker_type, is_connected, last_error')
            .eq('user_id', authenticatedUserId)
            .eq('is_active', true)
            .limit(5)
          
          data.broker_status = (statusConns || []).map(conn => ({
            id: conn.id,
            broker_type: conn.broker_type,
            is_connected: conn.is_connected,
            last_error: conn.last_error
          }))
          break
        }

        case 'trades': {
          // Scope to user's connections
          const { data: userConns } = await serviceSupabase
            .from('broker_connections')
            .select('id')
            .eq('user_id', authenticatedUserId)
          
          const connIds = (userConns || []).map(c => c.id)
          if (connIds.length > 0) {
            const { data: trades } = await serviceSupabase
              .from('api_forward_logs')
              .select('*')
              .in('connection_id', connIds)
              .order('created_at', { ascending: false })
              .limit(50)
            data.trades = trades || []
          } else {
            data.trades = []
          }
          break
        }

        case 'trade_stats': {
          const { data: userConns } = await serviceSupabase
            .from('broker_connections')
            .select('id')
            .eq('user_id', authenticatedUserId)
          
          const connIds = (userConns || []).map(c => c.id)
          if (connIds.length > 0) {
            const { data: allTrades } = await serviceSupabase
              .from('api_forward_logs')
              .select('action, status, latency_ms, price, quantity')
              .in('connection_id', connIds)
            
            if (allTrades && allTrades.length > 0) {
              data.trade_stats = {
                total: allTrades.length,
                successful: allTrades.filter(t => t.status === 'success').length,
                failed: allTrades.filter(t => t.status === 'failed').length,
                pending: allTrades.filter(t => t.status === 'pending').length,
                buy_count: allTrades.filter(t => t.action.toLowerCase().includes('buy')).length,
                sell_count: allTrades.filter(t => t.action.toLowerCase().includes('sell')).length,
                avg_latency: allTrades.reduce((a, b) => a + (b.latency_ms || 0), 0) / allTrades.length,
                total_volume: allTrades.reduce((a, b) => a + (b.quantity || 0), 0)
              }
            } else {
              data.trade_stats = { total: 0, message: 'No trades found' }
            }
          } else {
            data.trade_stats = { total: 0, message: 'No connections found' }
          }
          break
        }

        case 'market_data': {
          const { data: marketData } = await serviceSupabase
            .from('market_data')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100)
          data.market_data = marketData || []
          break
        }

        case 'mt5_commands': {
          const { data: userConns } = await serviceSupabase
            .from('broker_connections')
            .select('id')
            .eq('user_id', authenticatedUserId)
          
          const connIds = (userConns || []).map(c => c.id)
          if (connIds.length > 0) {
            const { data: mt5Commands } = await serviceSupabase
              .from('mt5_commands')
              .select('*')
              .in('connection_id', connIds)
              .order('created_at', { ascending: false })
              .limit(50)
            data.mt5_commands = mt5Commands || []
          } else {
            data.mt5_commands = []
          }
          break
        }

        case 'chat_rooms': {
          const { data: rooms } = await serviceSupabase
            .from('chat_rooms')
            .select('id, name, type, created_at')
            .eq('created_by', authenticatedUserId)
            .order('created_at', { ascending: false })
            .limit(20)
          data.chat_rooms = rooms || []
          break
        }

        case 'messages': {
          const messageQuery = serviceSupabase
            .from('messages')
            .select('id, content, username, message_type, webhook_data, created_at')
            .eq('user_id', authenticatedUserId)
            .order('created_at', { ascending: false })
            .limit(request.filters?.limit || 50)

          if (request.roomId) {
            messageQuery.eq('room_id', request.roomId)
          }
          if (request.filters?.message_type) {
            messageQuery.eq('message_type', request.filters.message_type)
          }

          const { data: messages } = await messageQuery
          data.messages = messages || []
          break
        }

        case 'alerts': {
          const { data: alerts } = await serviceSupabase
            .from('alerts')
            .select('*')
            .eq('user_id', authenticatedUserId)
            .order('created_at', { ascending: false })
            .limit(20)
          data.alerts = alerts || []
          break
        }

        case 'api_logs': {
          const { data: logs } = await serviceSupabase
            .from('api_usage_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50)
          data.api_logs = logs || []
          break
        }

        case 'all_summary': {
          const { data: userConns } = await serviceSupabase
            .from('broker_connections')
            .select('id')
            .eq('user_id', authenticatedUserId)
          
          const connIds = (userConns || []).map(c => c.id)
          
          const [
            { count: connCount },
            { count: messageCount },
            { count: alertCount }
          ] = await Promise.all([
            serviceSupabase.from('broker_connections').select('*', { count: 'exact', head: true }).eq('user_id', authenticatedUserId),
            serviceSupabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', authenticatedUserId),
            serviceSupabase.from('alerts').select('*', { count: 'exact', head: true }).eq('user_id', authenticatedUserId)
          ])

          let tradeCount = 0
          let mt5Count = 0
          if (connIds.length > 0) {
            const [tradeRes, mt5Res] = await Promise.all([
              serviceSupabase.from('api_forward_logs').select('*', { count: 'exact', head: true }).in('connection_id', connIds),
              serviceSupabase.from('mt5_commands').select('*', { count: 'exact', head: true }).in('connection_id', connIds)
            ])
            tradeCount = tradeRes.count || 0
            mt5Count = mt5Res.count || 0
          }
          
          data.summary = {
            broker_connections: connCount || 0,
            trades: tradeCount,
            messages: messageCount || 0,
            alerts: alertCount || 0,
            mt5_commands: mt5Count,
            timestamp: new Date().toISOString()
          }
          break
        }
      }
    }

    // If action is 'analyze', send to AI
    if (request.action === 'analyze' && request.prompt) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
      
      if (LOVABLE_API_KEY) {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are ABLE AI, an intelligent assistant for a trading platform called ABLE Terminal. 
You have access to real-time data from the platform including:
- Broker connections (Tradovate, Settrade, MT5)
- Trade execution logs
- MT5 commands
- Market data
- Chat messages and webhooks
- Alerts

Analyze the data provided and respond to the user's query in a helpful, concise manner.
Use Thai language if the user's query is in Thai.
Format numbers and statistics clearly.`
              },
              {
                role: 'user',
                content: `Data from ABLE Terminal:\n\n${JSON.stringify(data, null, 2)}\n\nUser Query: ${request.prompt}`
              }
            ],
            stream: false,
            max_tokens: 2000
          })
        })

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json()
          const analysis = aiResult.choices?.[0]?.message?.content
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              data, 
              analysis,
              model: 'google/gemini-2.5-flash'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('❌ ABLE AI Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})