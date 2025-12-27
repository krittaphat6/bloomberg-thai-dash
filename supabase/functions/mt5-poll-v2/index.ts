import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connection_id')

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // === GET Request: Poll for pending commands from api_forward_logs ===
    if (req.method === 'GET') {
      console.log(`📡 MT5 Poll: Fetching commands for connection ${connectionId}`)

      // STEP 1: Reset stuck 'processing' commands (older than 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()
      
      const { data: stuckCommands } = await supabase
        .from('api_forward_logs')
        .update({ status: 'pending' })
        .eq('connection_id', connectionId)
        .eq('status', 'processing')
        .lt('created_at', thirtySecondsAgo)
        .select('id')

      if (stuckCommands && stuckCommands.length > 0) {
        console.log(`🔄 Reset ${stuckCommands.length} stuck commands`)
      }

      // STEP 2: Fetch pending commands from api_forward_logs
      const { data: commands, error } = await supabase
        .from('api_forward_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10)

      if (error) {
        console.error('❌ Error fetching commands:', error)
        throw error
      }

      // STEP 3: IMMEDIATELY mark fetched commands as 'processing'
      if (commands && commands.length > 0) {
        const commandIds = commands.map(cmd => cmd.id)
        
        const { error: updateError } = await supabase
          .from('api_forward_logs')
          .update({ status: 'processing' })
          .in('id', commandIds)

        if (updateError) {
          console.error('❌ Error updating command status:', updateError)
        } else {
          console.log(`✅ Marked ${commands.length} commands as processing:`, commandIds)
        }
      }

      // STEP 4: Update connection last poll time
      await supabase
        .from('broker_connections')
        .update({
          is_connected: true,
          last_connected_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      // Format commands for EA
      const formattedCommands = (commands || []).map(cmd => ({
        id: cmd.id,
        command_type: cmd.action, // buy, sell, close, close_all, modify_sl_tp
        symbol: cmd.symbol,
        volume: cmd.quantity,
        price: cmd.price || 0,
        sl: 0, // Can be added to api_forward_logs if needed
        tp: 0,
        deviation: 20,
        comment: 'ABLE'
      }))

      console.log(`📤 Returning ${formattedCommands.length} commands to EA`)

      return new Response(
        JSON.stringify({
          success: true,
          commands: formattedCommands
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // === POST Request: Report command result ===
    if (req.method === 'POST') {
      const body = await req.json()
      const { command_id, ticket, price, volume, code, message } = body

      if (!command_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Command ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📥 Result for command ${command_id}: code=${code}, ticket=${ticket}`)

      // Determine final status
      const isSuccess = code === 0 || code === 10009
      const finalStatus = isSuccess ? 'success' : 'failed'
      
      // Update api_forward_logs with result
      const { error: updateError } = await supabase
        .from('api_forward_logs')
        .update({
          status: finalStatus,
          order_id: ticket?.toString(),
          price: price,
          latency_ms: Date.now() - new Date().getTime(),
          error_message: isSuccess ? null : message,
          executed_at: new Date().toISOString(),
          response_data: { ticket, price, volume, code, message }
        })
        .eq('id', command_id)

      if (updateError) {
        console.error('❌ Error updating command result:', updateError)
        throw updateError
      }

      // Update broker_connections statistics
      const statsField = isSuccess ? 'successful_orders' : 'failed_orders'
      
      const { data: connection } = await supabase
        .from('broker_connections')
        .select('successful_orders, failed_orders, total_orders_sent')
        .eq('id', connectionId)
        .single()

      if (connection) {
        const updates: Record<string, number> = {
          total_orders_sent: (connection.total_orders_sent || 0) + 1
        }
        
        if (isSuccess) {
          updates.successful_orders = (connection.successful_orders || 0) + 1
        } else {
          updates.failed_orders = (connection.failed_orders || 0) + 1
        }

        await supabase
          .from('broker_connections')
          .update(updates)
          .eq('id', connectionId)
      }

      console.log(`✅ Command ${command_id} marked as ${finalStatus}`)

      return new Response(
        JSON.stringify({ success: true, status: finalStatus }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid method' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('💥 mt5-poll-v2 error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
