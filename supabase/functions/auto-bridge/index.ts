import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  action: string;
  symbol: string;
  price?: number;
  quantity?: number;
  sl?: number;
  tp?: number;
  comment?: string;
  room_id?: string;
  user_id?: string;
  message_id?: string;
  auto_triggered?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const isAutoTriggered = payload.auto_triggered === true;
    console.log(`📥 ${isAutoTriggered ? '🤖 AUTO-TRIGGERED' : 'Manual'} webhook:`, JSON.stringify(payload));

    // Validate required fields
    if (!payload.action || !payload.symbol) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, symbol' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get room_id from payload or find from webhook
    let roomId = payload.room_id;
    let userId = payload.user_id;

    // If no room_id, try to find from authorization
    if (!roomId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userData?.user) {
          userId = userData.user.id;
        }
      }
    }

    // Find active bridge settings
    const { data: bridgeSettings, error: settingsError } = await supabase
      .from('bridge_settings')
      .select('*, broker_connections(*)')
      .eq('enabled', true)
      .eq(roomId ? 'room_id' : 'user_id', roomId || userId);

    if (settingsError) {
      console.error('❌ Error fetching bridge settings:', settingsError);
      throw settingsError;
    }

    if (!bridgeSettings || bridgeSettings.length === 0) {
      console.log('⚠️ No active bridge settings found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No active auto-bridge configuration found',
          hint: 'Enable Auto Bridge in Messenger settings'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = bridgeSettings[0];
    const connection = settings.broker_connections;

    // Check if action is allowed
    const actionUpper = payload.action.toUpperCase();
    const signalTypes = settings.signal_types || ['BUY', 'SELL', 'CLOSE'];
    
    if (!signalTypes.includes(actionUpper)) {
      console.log(`⚠️ Action ${actionUpper} not in allowed types:`, signalTypes);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Action ${actionUpper} is not enabled for auto-bridge`,
          allowed_actions: signalTypes
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate lot size
    let quantity = payload.quantity || 0.1;
    const maxLot = settings.max_lot_size || 1.0;
    if (quantity > maxLot) {
      console.log(`⚠️ Quantity ${quantity} exceeds max ${maxLot}, adjusting...`);
      quantity = maxLot;
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from('bridge_logs')
      .insert({
        user_id: settings.user_id,
        room_id: settings.room_id,
        webhook_data: payload,
        status: 'processing'
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Error creating log:', logError);
    }

    let mt5Response = null;
    let status = 'success';
    let errorMessage = null;

    // Forward to MT5 if connection exists and is active
    if (connection && connection.is_connected) {
      try {
        // Create MT5 command
        const commandType = actionUpper === 'CLOSE' ? 'CLOSE' : (actionUpper === 'BUY' ? 'BUY' : 'SELL');
        
        const { data: command, error: cmdError } = await supabase
          .from('mt5_commands')
          .insert({
            connection_id: connection.id,
            command_type: commandType,
            symbol: payload.symbol,
            volume: quantity,
            price: payload.price,
            sl: payload.sl,
            tp: payload.tp,
            comment: payload.comment || `Auto-Bridge: ${actionUpper}`,
            status: 'pending'
          })
          .select()
          .single();

        if (cmdError) {
          throw cmdError;
        }

        mt5Response = command;
        console.log('✅ MT5 command created:', command.id);

      } catch (mt5Error: any) {
        console.error('❌ MT5 forward error:', mt5Error);
        status = 'error';
        errorMessage = mt5Error.message;
      }
    } else {
      status = 'no_connection';
      errorMessage = 'MT5 not connected or connection inactive';
      console.log('⚠️ MT5 not connected');
    }

    const executionTime = Date.now() - startTime;

    // Update log entry
    if (logEntry) {
      await supabase
        .from('bridge_logs')
        .update({
          mt5_response: mt5Response,
          status,
          error_message: errorMessage,
          execution_time_ms: executionTime
        })
        .eq('id', logEntry.id);
    }

    // Also insert a message into the chat room if room_id exists
    if (settings.room_id) {
      const statusEmoji = status === 'success' ? '✅' : (status === 'error' ? '❌' : '⚠️');
      const triggerLabel = isAutoTriggered ? '🤖 Background' : '⚡ Manual';
      const messageContent = `${statusEmoji} ${triggerLabel} Auto-Bridge: ${actionUpper} ${payload.symbol} @ ${payload.price || 'Market'}\n` +
        `Lot: ${quantity} | SL: ${payload.sl || 'None'} | TP: ${payload.tp || 'None'}\n` +
        `Status: ${status}${errorMessage ? ` (${errorMessage})` : ''}\n` +
        `Execution: ${executionTime}ms`;

      await supabase
        .from('messages')
        .insert({
          room_id: settings.room_id,
          user_id: settings.user_id,
          username: isAutoTriggered ? 'Auto-Bridge (Background)' : 'Auto-Bridge',
          color: status === 'success' ? '#22c55e' : '#ef4444',
          content: messageContent,
          message_type: 'system',
          webhook_data: { auto_bridge: true, auto_triggered: isAutoTriggered, original_payload: payload }
        });
    }

    return new Response(
      JSON.stringify({
        success: status === 'success',
        message: status === 'success' ? 'Signal forwarded to MT5' : errorMessage,
        status,
        execution_time_ms: executionTime,
        mt5_command: mt5Response?.id || null,
        log_id: logEntry?.id || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Auto-bridge error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        execution_time_ms: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
