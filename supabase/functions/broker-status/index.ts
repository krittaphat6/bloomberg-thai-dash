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

    // Get connection from database
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

    if (!connection.is_active || !connection.session_data) {
      return new Response(
        JSON.stringify({
          success: true,
          connected: false,
          message: 'Not connected'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check token validity
    const session = connection.session_data as any
    if (Date.now() >= session.token_expiry) {
      return new Response(
        JSON.stringify({
          success: true,
          connected: false,
          message: 'Token expired'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get status based on broker type
    let status: any

    if (connection.broker_type === 'tradovate') {
      status = await getTradovateStatus(connection.credentials, session)
    } else if (connection.broker_type === 'settrade') {
      status = await getSettradeStatus(connection.credentials, session)
    } else {
      status = { connected: false, latency: 0, error: 'Unknown broker type' }
    }

    return new Response(
      JSON.stringify({ success: true, ...status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('❌ Status error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getTradovateStatus(credentials: any, session: any) {
  const baseUrl = credentials.env === 'live'
    ? 'https://live.tradovateapi.com/v1'
    : 'https://demo.tradovateapi.com/v1'

  const start = Date.now()

  try {
    // Get account details
    const accResponse = await fetch(`${baseUrl}/account/list`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })

    const latency = Date.now() - start

    if (!accResponse.ok) {
      return { connected: false, latency, error: 'Failed to get account info' }
    }

    const accounts = await accResponse.json()
    const account = accounts[0]

    // Get positions
    let positionsCount = 0
    try {
      const posResponse = await fetch(`${baseUrl}/position/list`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (posResponse.ok) {
        const positions = await posResponse.json()
        positionsCount = positions.filter((p: any) => p.netPos !== 0).length
      }
    } catch (e) {
      console.warn('Could not fetch positions:', e)
    }

    return {
      connected: true,
      latency,
      account: {
        id: account?.id,
        name: account?.name,
        balance: account?.cashBalance || 0,
        equity: account?.netLiq || 0,
        margin: account?.marginUsed || 0,
        positions: positionsCount
      }
    }
  } catch (err: any) {
    return { connected: false, latency: Date.now() - start, error: err.message }
  }
}

async function getSettradeStatus(credentials: any, session: any) {
  const baseUrl = credentials.env === 'prod'
    ? 'https://open-api.settrade.com/api'
    : 'https://open-api-uat.settrade.com/api'

  const start = Date.now()
  const { brokerId, accountNo } = credentials

  try {
    const response = await fetch(
      `${baseUrl}/equity/${brokerId}/accounts/${accountNo}/portfolios`,
      {
        headers: {
          'Authorization': `${session.token_type} ${session.access_token}`
        }
      }
    )

    const latency = Date.now() - start

    if (!response.ok) {
      return { connected: false, latency, error: 'Failed to get account info' }
    }

    const data = await response.json()

    return {
      connected: true,
      latency,
      account: {
        accountNo: accountNo,
        balance: data.cashBalance || data.cash || 0,
        equity: data.equity || data.totalValue || 0,
        buyingPower: data.buyingPower || data.purchasingPower || 0,
        positions: data.positions?.length || data.portfolios?.length || 0
      }
    }
  } catch (err: any) {
    return { connected: false, latency: Date.now() - start, error: err.message }
  }
}
