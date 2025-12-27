import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    // GET request - poll for pending commands
    if (req.method === 'GET') {
      console.log(`MT5 Poll: Fetching commands for connection ${connectionId}`)
      
      // First, reset any stuck 'processing' commands older than 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()
      const { data: stuckCommands } = await supabase
        .from('mt5_commands')
        .update({ status: 'pending' })
        .eq('connection_id', connectionId)
        .eq('status', 'processing')
        .lt('created_at', thirtySecondsAgo)
        .select('id')

      if (stuckCommands && stuckCommands.length > 0) {
        console.log(`MT5 Poll: Reset ${stuckCommands.length} stuck processing commands`)
      }

      // Fetch pending commands for this connection
      const { data: commands, error } = await supabase
        .from('mt5_commands')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10)

      if (error) {
        console.error('MT5 Poll: Error fetching commands', error)
        throw error
      }

      // CRITICAL FIX: Mark fetched commands as 'processing' immediately
      // This prevents the same command from being fetched again on next poll
      if (commands && commands.length > 0) {
        const commandIds = commands.map(cmd => cmd.id)
        
        const { error: updateError } = await supabase
          .from('mt5_commands')
          .update({ status: 'processing' })
          .in('id', commandIds)

        if (updateError) {
          console.error('MT5 Poll: Error marking commands as processing', updateError)
        } else {
          console.log(`MT5 Poll: Marked ${commands.length} commands as processing`)
        }
      }

      // Update connection last poll time
      await supabase
        .from('broker_connections')
        .update({
          is_connected: true,
          last_connected_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      console.log(`MT5 Poll: Returning ${commands?.length || 0} commands to EA`)

      return new Response(
        JSON.stringify({
          success: true,
          commands: commands || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST request - report command result
    if (req.method === 'POST') {
      const body = await req.json()
      const { command_id, ticket, price, volume, code, message } = body

      console.log(`MT5 Poll: Reporting result for command ${command_id}`, body)

      const isSuccess = code === 0 || code === 10009
      
      const { error } = await supabase
        .from('mt5_commands')
        .update({
          status: isSuccess ? 'completed' : 'failed',
          ticket_id: ticket,
          executed_price: price,
          executed_volume: volume,
          error_code: code,
          error_message: message,
          executed_at: new Date().toISOString()
        })
        .eq('id', command_id)

      if (error) {
        console.error('MT5 Poll: Error updating command', error)
        throw error
      }

      console.log(`MT5 Poll: Command ${command_id} marked as ${isSuccess ? 'completed' : 'failed'}`)

      // Update broker connection stats
      if (isSuccess) {
        await supabase.rpc('increment_broker_success', { conn_id: connectionId }).catch(() => {
          // Fallback if RPC doesn't exist
          console.log('MT5 Poll: RPC not available, skipping stats update')
        })
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid method' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('MT5 Poll error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
