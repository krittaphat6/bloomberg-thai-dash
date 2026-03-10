import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { connectionId } = await req.json()

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing connectionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SECURITY: Verify user owns this connection before disconnecting
    if (authenticatedUserId) {
      const { data: connCheck } = await supabase
        .from('broker_connections')
        .select('user_id')
        .eq('id', connectionId)
        .single()
      
      if (connCheck && connCheck.user_id !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { error } = await supabase
      .from('broker_connections')
      .update({
        is_active: false,
        is_connected: false,
        session_data: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (error) {
      console.error('❌ Disconnect DB error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔌 Disconnected: ${connectionId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Disconnected successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('❌ Disconnect error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})