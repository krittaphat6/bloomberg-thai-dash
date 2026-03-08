import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TradeSignal {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  action: 'OPEN' | 'CLOSE' | 'BUY' | 'SELL' | 'TAKE_PROFIT' | 'STOP_LOSS';
  price: number;
  quantity?: number;
  lotSize?: number;
  strategy?: string;
  pnl?: number;
  pnlPercentage?: number;
  message?: string;
}

// ============================================================================
// 🔥 Enhanced Retry Helper with Exponential Backoff + Jitter + Timeout
// ============================================================================
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 100,
  timeoutMs: number = 10000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout to each operation
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
        )
      ]);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff with jitter to prevent thundering herd
        const jitter = Math.random() * 100;
        const delay = Math.min((baseDelay * Math.pow(2, attempt)) + jitter, 5000);
        console.log(`⏳ Retrying in ${delay.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// 🔥 Global Supabase client (reuse connection)
// ============================================================================
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }
  return supabaseClient;
}

// ============================================================================
// 🔥 Ensure TradingView user exists (run once on cold start)
// ============================================================================
let tvUserInitialized = false;

async function ensureTradingViewUser(supabase: ReturnType<typeof createClient>) {
  if (tvUserInitialized) return;
  
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: 'tradingview',
        username: '📊 TradingView',
        color: '#2962FF',
        status: 'online',
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      });
    
    if (!error) {
      tvUserInitialized = true;
      console.log('✅ TradingView user initialized');
    }
  } catch (e) {
    console.warn('⚠️ TradingView user init warning:', e);
  }
}

// ============================================================================
// 🔥 Parse JSON safely with text fallback
// ============================================================================
function safeParseJSON(bodyText: string): { data: any; isRaw: boolean } {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(bodyText);
    return { data: parsed, isRaw: false };
  } catch (e) {
    // Try to extract JSON from text that might have extra content
    const jsonMatch = bodyText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return { data: parsed, isRaw: false };
      } catch (e2) {
        // Fall through to raw text handling
      }
    }
    
    // Handle plain text alerts (TradingView can send plain text)
    return {
      data: {
        message: bodyText.trim(),
        action: detectActionFromText(bodyText),
        symbol: detectSymbolFromText(bodyText),
        raw_text: true
      },
      isRaw: true
    };
  }
}

function detectActionFromText(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('buy') || lowerText.includes('long') || lowerText.includes('ซื้อ')) return 'BUY';
  if (lowerText.includes('sell') || lowerText.includes('short') || lowerText.includes('ขาย')) return 'SELL';
  if (lowerText.includes('close') || lowerText.includes('exit') || lowerText.includes('ปิด')) return 'CLOSE';
  return 'ALERT';
}

function detectSymbolFromText(text: string): string {
  // Try to extract common forex/crypto symbols
  const symbolPatterns = [
    /\b(XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|AUDUSD|USDCHF|NZDUSD|USDCAD)\b/i,
    /\b(BTCUSD|ETHUSD|BNBUSD|XRPUSD|SOLUSD|DOGEUSD|ADAUSD)\b/i,
    /\b([A-Z]{3,6}USD[T]?)\b/,
    /\b(BTC|ETH|XAU|XAG|EUR|GBP|JPY|AUD|CHF|NZD|CAD)\b/i
  ];
  
  for (const pattern of symbolPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return 'UNKNOWN';
}

// Sanitize log output
function sanitizeLog(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitive = ['password', 'secret', 'token', 'appSecret', 'pin', 'cid', 'credentials', 'apiKey'];
  const sanitized = { ...obj };
  for (const key of sensitive) {
    if (sanitized[key]) sanitized[key] = '[REDACTED]';
  }
  return sanitized;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Payload size limit (50KB)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 51200) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), { 
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const supabase = getSupabaseClient();
  
  // Clone request for potential error logging
  let bodyText = '';
  let parsedBody: any = null;
  let roomId = '';
  let webhookId: string | null = null;
  
  try {
    console.log(`🔗 [${requestId}] ============ WEBHOOK START ============`)
    console.log(`🔗 [${requestId}] Method: ${req.method}`)
    console.log(`🔗 [${requestId}] Timestamp: ${new Date().toISOString()}`)
    
    // ========================================================================
    // STEP 1: Extract Room ID from URL (IMPROVED)
    // ========================================================================
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p && p !== 'tradingview-webhook')
    roomId = pathParts[pathParts.length - 1] || ''
    
    // Also check query params as backup
    if (!roomId || roomId.length < 10) {
      roomId = url.searchParams.get('room') || url.searchParams.get('roomId') || roomId;
    }
    
    console.log(`📊 [${requestId}] Room ID: ${roomId}`)
    console.log(`📊 [${requestId}] Full URL: ${req.url}`)
    console.log(`📊 [${requestId}] Path Parts: ${JSON.stringify(pathParts)}`)
    
    if (!roomId || roomId.length < 10) {
      console.error(`❌ [${requestId}] Missing or invalid room ID: "${roomId}"`)
      
      // Try to find room from webhook URL in database
      const { data: webhooks } = await supabase
        .from('webhooks')
        .select('room_id, id')
        .eq('is_active', true)
        .limit(5);
      
      console.log(`🔍 [${requestId}] Available webhooks:`, webhooks?.map(w => w.room_id));
      
      return new Response(JSON.stringify({ 
        error: 'Room ID required in URL path',
        requestId,
        hint: 'URL format: /tradingview-webhook/{room-id}',
        received_path: url.pathname,
        available_rooms: webhooks?.map(w => w.room_id) || []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // ========================================================================
    // STEP 2: Parse Body (with raw text backup)
    // ========================================================================
    try {
      bodyText = await req.text();
      console.log(`📦 [${requestId}] Raw body length: ${bodyText.length}`)
      console.log(`📦 [${requestId}] Raw body preview: ${bodyText.substring(0, 200)}`)
      
      if (!bodyText || bodyText.trim() === '') {
        console.error(`❌ [${requestId}] Empty body received`)
        return new Response(JSON.stringify({ 
          error: 'Empty request body',
          requestId 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Use safe JSON parser with text fallback
      const { data, isRaw } = safeParseJSON(bodyText);
      parsedBody = data;
      
      if (isRaw) {
        console.log(`⚠️ [${requestId}] Received plain text, converted to JSON structure`);
      }
      
      console.log(`📦 [${requestId}] Parsed payload:`, JSON.stringify(parsedBody, null, 2))
    } catch (e) {
      console.error(`❌ [${requestId}] Body processing error:`, e)
      
      // Log failed webhook
      await logWebhookDelivery(supabase, {
        request_id: requestId,
        room_id: roomId,
        payload: { raw: bodyText, error: String(e) },
        status: 'failed',
        error_message: `Body processing error: ${e}`,
        execution_time_ms: Date.now() - startTime
      });
      
      return new Response(JSON.stringify({ 
        error: 'Failed to process request body',
        requestId,
        received: bodyText.substring(0, 100) 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ========================================================================
    // STEP 3: Verify Webhook Room Exists (with fallback)
    // ========================================================================
    let webhook: any = null;
    
    try {
      webhook = await retryOperation(async () => {
        console.log(`🔍 [${requestId}] Looking for webhook with room_id: ${roomId}`)
        
        const { data, error } = await supabase
          .from('webhooks')
          .select('id, room_id, is_active, webhook_url')
          .eq('room_id', roomId)
          .single()
        
        if (error) {
          console.error(`❌ [${requestId}] Webhook lookup error:`, error)
          throw error
        }
        if (!data) {
          throw new Error(`Webhook not found for room: ${roomId}`)
        }
        
        console.log(`✅ [${requestId}] Found webhook:`, data.id)
        return data
      }, 3, 100, 5000);
      
      webhookId = webhook?.id || null;
    } catch (webhookError) {
      console.warn(`⚠️ [${requestId}] Webhook lookup failed, checking if room exists directly...`);
      
      // Fallback: check if room exists in chat_rooms
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('id, name, type')
        .eq('id', roomId)
        .single();
      
      if (!room) {
        await logWebhookDelivery(supabase, {
          request_id: requestId,
          room_id: roomId,
          payload: parsedBody,
          status: 'failed',
          error_message: `Room not found: ${roomId}`,
          execution_time_ms: Date.now() - startTime
        });
        
        return new Response(JSON.stringify({
          error: 'Webhook room not found',
          requestId,
          roomId
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`✅ [${requestId}] Room exists, proceeding without webhook record:`, room.name);
    }

    // ========================================================================
    // STEP 4: Ensure TradingView User (background, don't block)
    // ========================================================================
    ensureTradingViewUser(supabase).catch(e => 
      console.warn(`⚠️ [${requestId}] TV user background init:`, e)
    );

    // ========================================================================
    // STEP 5: Parse Trade Signal
    // ========================================================================
    const tradeSignal = parseTradeSignal(parsedBody, requestId)
    console.log(`📈 [${requestId}] Parsed signal:`, tradeSignal.action, tradeSignal.symbol, tradeSignal.price)
    
    // ========================================================================
    // STEP 6: Format Alert Message
    // ========================================================================
    const alertContent = formatTradingViewAlert(parsedBody, tradeSignal)

    // ========================================================================
    // STEP 7: Insert Message with UPSERT to prevent duplicates
    // ========================================================================
    const messageId = crypto.randomUUID();
    
    const message = await retryOperation(async () => {
      console.log(`💾 [${requestId}] Inserting message to room: ${roomId}`)
      
      // Use insert with conflict handling
      const { data, error } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          room_id: roomId,
          user_id: 'tradingview',
          username: '📊 TradingView',
          color: '#2962FF',
          content: alertContent,
          message_type: 'webhook',
          webhook_data: {
            ...parsedBody,
            parsed_trade: tradeSignal,
            request_id: requestId,
            received_at: new Date().toISOString()
          }
        })
        .select('id, created_at')
        .single()
      
      if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505') {
          console.log(`⚠️ [${requestId}] Duplicate message detected, fetching existing...`);
          const { data: existing } = await supabase
            .from('messages')
            .select('id, created_at')
            .eq('id', messageId)
            .single();
          return existing;
        }
        
        console.error(`❌ [${requestId}] Message insert error:`, error)
        throw error
      }
      
      console.log(`✅ [${requestId}] Message created: ${data.id}`)
      return data
    }, 5, 200, 8000);  // 5 retries, 200ms base delay, 8s timeout

    const executionTime = Date.now() - startTime;
    
    // ========================================================================
    // STEP 8: Log Successful Delivery
    // ========================================================================
    await logWebhookDelivery(supabase, {
      request_id: requestId,
      room_id: roomId,
      webhook_id: webhookId,
      message_id: message?.id || messageId,
      payload: parsedBody,
      status: 'success',
      execution_time_ms: executionTime
    });

    console.log(`🎉 [${requestId}] ============ WEBHOOK SUCCESS (${executionTime}ms) ============`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Alert received and saved',
      requestId,
      messageId: message?.id || messageId,
      roomId,
      symbol: tradeSignal.symbol,
      action: tradeSignal.action,
      executionTime: `${executionTime}ms`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`💥 [${requestId}] ============ WEBHOOK FAILED ============`)
    console.error(`💥 [${requestId}] Error:`, error.message || error)
    console.error(`💥 [${requestId}] Stack:`, error.stack)
    
    // Log failed webhook
    await logWebhookDelivery(supabase, {
      request_id: requestId,
      room_id: roomId || null,
      webhook_id: webhookId,
      payload: parsedBody || { raw: bodyText },
      status: 'failed',
      error_message: error.message || 'Unknown error',
      error_stack: error.stack,
      execution_time_ms: executionTime
    });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error',
      requestId,
      roomId,
      executionTime: `${executionTime}ms`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// ============================================================================
// Log webhook delivery to database (fire and forget)
// ============================================================================
async function logWebhookDelivery(
  supabase: ReturnType<typeof createClient>,
  data: {
    request_id: string;
    room_id: string | null;
    webhook_id?: string | null;
    message_id?: string;
    payload: any;
    status: 'success' | 'failed';
    error_message?: string;
    error_stack?: string;
    execution_time_ms: number;
  }
) {
  try {
    const { error } = await supabase.from('webhook_delivery_logs').insert({
      request_id: data.request_id,
      room_id: data.room_id,
      webhook_id: data.webhook_id || null,
      message_id: data.message_id || null,
      payload: data.payload,
      status: data.status,
      error_message: data.error_message || null,
      error_stack: data.error_stack || null,
      execution_time_ms: data.execution_time_ms,
      retry_count: 0,
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.warn(`⚠️ [${data.request_id}] Log insert error:`, error);
    } else {
      console.log(`📝 [${data.request_id}] Logged to webhook_delivery_logs: ${data.status}`);
    }
  } catch (e) {
    console.warn(`⚠️ [${data.request_id}] Failed to log delivery:`, e);
  }
}

// ============================================================================
// Parse trade signal from various webhook formats
// ============================================================================
function parseTradeSignal(data: any, requestId: string): TradeSignal {
  const { 
    ticker, symbol, action, side,
    price, close, entry, exit,
    quantity, qty, volume, lot, lotSize, lots,
    strategy, message,
    pnl, profit, pnlPercent, profitPercent,
    type, order_action, signal
  } = data
  
  // Determine action type
  let tradeAction: TradeSignal['action'] = 'BUY'
  const actionStr = (action || order_action || signal || message || '').toString().toLowerCase()
  
  if (actionStr.includes('close') || actionStr.includes('exit') || actionStr.includes('ออก') || actionStr.includes('ปิด')) {
    tradeAction = 'CLOSE'
  } else if (actionStr.includes('take') || actionStr.includes('tp') || actionStr.includes('profit') || actionStr.includes('ทำกำไร')) {
    tradeAction = 'TAKE_PROFIT'
  } else if (actionStr.includes('stop') || actionStr.includes('sl') || actionStr.includes('loss') || actionStr.includes('ตัดขาดทุน')) {
    tradeAction = 'STOP_LOSS'
  } else if (actionStr.includes('buy') || actionStr.includes('long') || actionStr.includes('ซื้อ')) {
    tradeAction = 'BUY'
  } else if (actionStr.includes('sell') || actionStr.includes('short') || actionStr.includes('ขาย')) {
    tradeAction = 'SELL'
  }
  
  // Determine side
  let tradeSide: 'LONG' | 'SHORT' = 'LONG'
  const sideStr = (side || action || order_action || '').toString().toLowerCase()
  if (sideStr.includes('short') || sideStr.includes('sell') || sideStr.includes('ขาย')) {
    tradeSide = 'SHORT'
  }
  
  // Parse values with safe defaults
  const tradePrice = parseFloat(price || close || entry || exit) || 0
  const tradeQuantity = parseFloat(quantity || qty || volume || lots || lot) || 1
  const tradeLotSize = parseFloat(lotSize || lot || lots) || 0.01
  const tradePnl = parseFloat(pnl || profit) || 0
  const tradePnlPercent = parseFloat(pnlPercent || profitPercent) || 0
  
  // Try to extract symbol from various sources
  let detectedSymbol = (ticker || symbol || 'UNKNOWN').toString().toUpperCase();
  if (detectedSymbol === 'UNKNOWN' && message) {
    detectedSymbol = detectSymbolFromText(message.toString());
  }
  
  return {
    id: `tv-${requestId.substring(0, 8)}-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    symbol: detectedSymbol,
    side: tradeSide,
    type: 'CFD',
    action: tradeAction,
    price: tradePrice,
    quantity: tradeQuantity,
    lotSize: tradeLotSize,
    strategy: strategy || 'TradingView Alert',
    pnl: tradePnl || undefined,
    pnlPercentage: tradePnlPercent || undefined,
    message: message || undefined
  }
}

// ============================================================================
// Format alert message for display
// ============================================================================
function formatTradingViewAlert(data: any, signal: TradeSignal): string {
  const { ticker, time, message, exchange, interval } = data
  
  const actionEmoji = {
    'OPEN': '🟢',
    'BUY': '🟢',
    'SELL': '🔴',
    'CLOSE': '🔵',
    'TAKE_PROFIT': '💰',
    'STOP_LOSS': '🛑'
  }[signal.action] || '📊'
  
  let content = `${actionEmoji} **TradingView Alert**\n\n`
  
  content += `🏷️ Symbol: ${signal.symbol}\n`
  content += `📌 Action: **${signal.action}** (${signal.side})\n`
  content += `💰 Price: ${signal.price}\n`
  
  if (signal.quantity && signal.quantity !== 1) {
    content += `📊 Quantity: ${signal.quantity}\n`
  }
  if (signal.lotSize && signal.lotSize !== 0.01) {
    content += `📏 Lot Size: ${signal.lotSize}\n`
  }
  
  if (['CLOSE', 'TAKE_PROFIT', 'STOP_LOSS'].includes(signal.action) && signal.pnl) {
    const pnlSign = signal.pnl >= 0 ? '+' : ''
    content += `\n💵 P&L: ${pnlSign}${signal.pnl.toFixed(2)}`
    if (signal.pnlPercentage) {
      content += ` (${pnlSign}${signal.pnlPercentage.toFixed(2)}%)`
    }
    content += '\n'
  }
  
  if (exchange) content += `🏦 Exchange: ${exchange}\n`
  if (interval) content += `⏱️ Interval: ${interval}\n`
  if (time) content += `⏰ Time: ${time}\n`
  if (signal.strategy) content += `📈 Strategy: ${signal.strategy}\n`
  if (signal.message) content += `\n💬 ${signal.message}`
  
  return content
}
