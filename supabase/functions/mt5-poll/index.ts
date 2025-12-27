import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
        JSON.stringify({ success: false, error: 'Missing connection_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // GET: EA polls for pending commands
    if (req.method === 'GET') {
      console.log(`📡 MT5 Poll: Connection ${connectionId} polling...`)

      // Update connection status
      await supabase
        .from('broker_connections')
        .update({
          is_connected: true,
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      // Reset stuck 'processing' commands older than 30 seconds
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

      // Get pending commands from api_forward_logs
      const { data: commands, error } = await supabase
        .from('api_forward_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10)

      if (error) {
        console.error('❌ Error fetching commands:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // CRITICAL: Mark commands as 'processing' immediately to prevent duplicate execution
      if (commands && commands.length > 0) {
        const commandIds = commands.map(cmd => cmd.id)
        
        await supabase
          .from('api_forward_logs')
          .update({ status: 'processing' })
          .in('id', commandIds)

        console.log(`✅ Marked ${commands.length} commands as processing`)
      }

      // Transform to EA format
      const eaCommands = (commands || []).map(cmd => ({
        id: cmd.id,
        command_type: cmd.action?.toLowerCase() || 'buy',
        symbol: cmd.symbol || '',
        volume: parseFloat(cmd.quantity) || 0.01,
        price: parseFloat(cmd.price) || 0,
        sl: cmd.response_data?.sl || 0,
        tp: cmd.response_data?.tp || 0,
        deviation: 20,
        comment: `ABLE_${cmd.action}`
      }))

      console.log(`📤 Returning ${eaCommands.length} commands to EA`)

      return new Response(
        JSON.stringify({ success: true, commands: eaCommands }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST: EA reports execution result
    if (req.method === 'POST') {
      const body = await req.json()
      const { command_id, ticket, price, volume, code, message } = body

      console.log(`📥 Result for command ${command_id}: code=${code}`)

      if (!command_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing command_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const isSuccess = code === 0 || code === 10009 || code === 10008
      
      // Update command status in api_forward_logs
      await supabase
        .from('api_forward_logs')
        .update({
          status: isSuccess ? 'success' : 'failed',
          order_id: ticket?.toString(),
          error_message: isSuccess ? null : message,
          executed_at: new Date().toISOString(),
          response_data: { ticket, price, volume, code, message }
        })
        .eq('id', command_id)

      console.log(`✅ Command ${command_id} marked as ${isSuccess ? 'success' : 'failed'}`)

      // Update connection stats
      const { data: conn } = await supabase
        .from('broker_connections')
        .select('successful_orders, failed_orders, total_orders_sent')
        .eq('id', connectionId)
        .single()

      if (conn) {
        await supabase
          .from('broker_connections')
          .update({
            total_orders_sent: (conn.total_orders_sent || 0) + 1,
            successful_orders: isSuccess 
              ? (conn.successful_orders || 0) + 1 
              : conn.successful_orders,
            failed_orders: !isSuccess 
              ? (conn.failed_orders || 0) + 1 
              : conn.failed_orders,
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Result recorded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('💥 MT5 Poll Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
