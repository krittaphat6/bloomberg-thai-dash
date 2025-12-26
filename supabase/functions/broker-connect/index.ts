import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { connectionId, credentials, brokerType } = await req.json()

    if (!connectionId || !credentials || !brokerType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔌 Connecting to ${brokerType}...`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let session: any = null
    let error: string | null = null

    // Connect based on broker type
    if (brokerType === 'tradovate') {
      const result = await connectTradovate(credentials)
      session = result.session
      error = result.error
    } else if (brokerType === 'settrade') {
      const result = await connectSettrade(credentials)
      session = result.session
      error = result.error
    } else if (brokerType === 'mt5') {
      // MT5 uses polling mechanism - just mark as active
      session = {
        account: credentials.account,
        server: credentials.server,
        magic_number: credentials.magic_number || 888888,
        bridge_mode: 'api'
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid broker type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (error) {
      // Update connection with error
      await supabase
        .from('broker_connections')
        .update({
          is_connected: false,
          last_error: error,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      return new Response(
        JSON.stringify({ success: false, error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save session to database
    await supabase
      .from('broker_connections')
      .update({
        is_active: true,
        is_connected: true,
        last_connected_at: new Date().toISOString(),
        last_error: null,
        session_data: session,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log(`✅ Connected to ${brokerType}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Connected to ${brokerType}`,
        session: {
          token_expiry: session?.token_expiry,
          account_id: session?.account_id || session?.accountNo
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('❌ Connection error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Tradovate connection
async function connectTradovate(credentials: {
  username: string
  password: string
  cid: string
  deviceId?: string
  env: 'demo' | 'live'
}): Promise<{ session?: any; error?: string }> {
  try {
    const baseUrl = credentials.env === 'live'
      ? 'https://live.tradovateapi.com/v1'
      : 'https://demo.tradovateapi.com/v1'

    console.log('🔐 Tradovate: Attempting login...')

    const response = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: credentials.username,
        password: credentials.password,
        appId: 'ABLE-Terminal',
        appVersion: '1.0',
        deviceId: credentials.deviceId || 'ABLE-WebAPI',
        cid: credentials.cid
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Tradovate login failed:', errorData)
      return {
        error: errorData.errorText || errorData.message || `HTTP ${response.status}`
      }
    }

    const data = await response.json()
    console.log('✅ Tradovate: Login successful')

    // Get account info
    let accountId = 0
    try {
      const accResponse = await fetch(`${baseUrl}/account/list`, {
        headers: { 'Authorization': `Bearer ${data.accessToken}` }
      })
      if (accResponse.ok) {
        const accounts = await accResponse.json()
        if (accounts.length > 0) {
          accountId = accounts[0].id
          console.log('📊 Tradovate: Found account:', accounts[0].name)
        }
      }
    } catch (e) {
      console.warn('Could not fetch account info:', e)
    }

    return {
      session: {
        access_token: data.accessToken,
        token_expiry: Date.now() + (data.expirationTime || 7200000) - 60000,
        account_id: accountId,
        account_spec: credentials.env === 'live' ? 'Live' : 'Demo'
      }
    }
  } catch (err: any) {
    console.error('❌ Tradovate connect error:', err)
    return { error: err.message }
  }
}

// Settrade connection
async function connectSettrade(credentials: {
  appId: string
  appSecret: string
  brokerId: string
  accountNo: string
  env: 'uat' | 'prod'
}): Promise<{ session?: any; error?: string }> {
  try {
    const baseUrl = credentials.env === 'prod'
      ? 'https://open-api.settrade.com/api'
      : 'https://open-api-uat.settrade.com/api'

    console.log('🔐 Settrade: Attempting authentication...')

    const formData = new URLSearchParams()
    formData.append('grant_type', 'client_credentials')
    formData.append('client_id', credentials.appId)
    formData.append('client_secret', credentials.appSecret)
    formData.append('scope', 'EQUITY')

    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Settrade auth failed:', errorData)
      return {
        error: errorData.error_description || errorData.message || `HTTP ${response.status}`
      }
    }

    const data = await response.json()
    console.log('✅ Settrade: Authentication successful')

    return {
      session: {
        access_token: data.access_token,
        token_expiry: Date.now() + ((data.expires_in || 3600) * 1000) - 60000,
        token_type: data.token_type || 'Bearer',
        account_no: credentials.accountNo,
        broker_id: credentials.brokerId
      }
    }
  } catch (err: any) {
    console.error('❌ Settrade connect error:', err)
    return { error: err.message }
  }
}
