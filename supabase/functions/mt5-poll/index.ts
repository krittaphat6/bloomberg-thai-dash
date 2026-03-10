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
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

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

    // SECURITY: Verify connection secret (optional for backwards compatibility with existing EAs)
    const connectionSecret = req.headers.get('X-Connection-Secret')
    if (connectionSecret) {
      const { data: connCheck, error: connError } = await supabase
        .from('broker_connections')
        .select('connection_secret')
        .eq('id', connectionId)
        .single()

      if (connError || !connCheck) {
        return new Response(
          JSON.stringify({ success: false, error: 'Connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (connCheck.connection_secret && connCheck.connection_secret !== connectionSecret) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid connection secret' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      console.log('⚠️ No X-Connection-Secret header - allowing for backwards compatibility')
    }

    // GET: EA polls for pending commands
    if (req.method === 'GET') {
      console.log(`📡 MT5 Poll: Connection ${connectionId} polling...`)

      await supabase
        .from('broker_connections')
        .update({
          is_connected: true,
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      const { data: commands, error } = await supabase
        .from('mt5_commands')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5)

      if (error) {
        console.error('❌ Error fetching commands:', error)
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!commands || commands.length === 0) {
        return new Response(
          JSON.stringify({ success: true, commands: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const commandIds = commands.map(cmd => cmd.id)
      
      const { error: updateError } = await supabase
        .from('mt5_commands')
        .update({ 
          status: 'sent',
          executed_at: new Date().toISOString()
        })
        .in('id', commandIds)

      if (updateError) {
        console.error('❌ Error marking commands as sent:', updateError)
      } else {
        console.log(`✅ Marked ${commands.length} commands as 'sent' to EA`)
      }

      const eaCommands = commands.map(cmd => ({
        id: cmd.id,
        command_type: cmd.command_type || 'buy',
        symbol: cmd.symbol || '',
        volume: parseFloat(cmd.volume) || 0.01,
        price: parseFloat(cmd.price) || 0,
        sl: parseFloat(cmd.sl) || 0,
        tp: parseFloat(cmd.tp) || 0,
        deviation: cmd.deviation || 20,
        comment: cmd.comment || `ABLE_${cmd.command_type}`
      }))

      console.log(`📤 Returning ${eaCommands.length} commands to EA: ${commandIds.join(', ')}`)

      return new Response(
        JSON.stringify({ success: true, commands: eaCommands }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST: EA reports execution result
    if (req.method === 'POST') {
      let body: any
      try {
        const text = await req.text()
        console.log(`📥 Raw POST body: ${text.substring(0, 500)}`)
        body = JSON.parse(text)
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError)
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { command_id, ticket, price, volume, code, message } = body

      console.log(`📥 Result for command ${command_id}: code=${code}, ticket=${ticket}`)

      if (!command_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing command_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const isSuccess = code === 0 || code === 10009 || code === 10008
      
      const { error: cmdError } = await supabase
        .from('mt5_commands')
        .update({
          status: isSuccess ? 'completed' : 'failed',
          ticket_id: ticket || null,
          executed_price: price || null,
          executed_volume: volume || null,
          error_code: code,
          error_message: isSuccess ? null : (message || 'Unknown error'),
          executed_at: new Date().toISOString()
        })
        .eq('id', command_id)

      if (cmdError) {
        console.error('❌ Error updating command:', cmdError)
      } else {
        console.log(`✅ Command ${command_id} marked as ${isSuccess ? 'completed' : 'failed'}`)
      }

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