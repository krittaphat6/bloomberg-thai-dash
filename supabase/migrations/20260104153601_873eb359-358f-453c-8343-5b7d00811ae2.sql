-- Enable pg_net extension for HTTP requests from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to auto-forward webhook messages to MT5 via Edge Function
CREATE OR REPLACE FUNCTION public.auto_forward_webhook_to_mt5()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bridge_setting RECORD;
  edge_function_url TEXT;
  request_id BIGINT;
BEGIN
  -- Only process webhook messages
  IF NEW.message_type != 'webhook' OR NEW.webhook_data IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build the Edge Function URL
  edge_function_url := 'https://sovyrqzpavkuuycnfyac.supabase.co/functions/v1/auto-bridge';

  -- Find active bridge settings for this room
  SELECT bs.*, bc.id as connection_id, bc.is_connected
  INTO bridge_setting
  FROM bridge_settings bs
  LEFT JOIN broker_connections bc ON bc.id = bs.mt5_connection_id
  WHERE bs.room_id = NEW.room_id
    AND bs.enabled = true
    AND bs.auto_forward_signals = true
  LIMIT 1;

  -- If no active bridge setting found, skip
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- If MT5 connection doesn't exist or not connected, skip
  IF bridge_setting.connection_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Call the auto-bridge edge function via HTTP POST
  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'auto_triggered', true,
      'message_id', NEW.id,
      'room_id', NEW.room_id,
      'user_id', bridge_setting.user_id,
      'symbol', COALESCE(
        NEW.webhook_data->>'symbol',
        NEW.webhook_data->>'ticker',
        NEW.webhook_data->'parsed_trade'->>'symbol',
        'UNKNOWN'
      ),
      'action', COALESCE(
        NEW.webhook_data->>'action',
        NEW.webhook_data->'parsed_trade'->>'action',
        'BUY'
      ),
      'quantity', COALESCE(
        (NEW.webhook_data->>'quantity')::numeric,
        (NEW.webhook_data->>'lot')::numeric,
        (NEW.webhook_data->'parsed_trade'->>'lotSize')::numeric,
        0.01
      ),
      'price', COALESCE(
        (NEW.webhook_data->>'price')::numeric,
        (NEW.webhook_data->>'close')::numeric,
        (NEW.webhook_data->'parsed_trade'->>'price')::numeric,
        0
      )
    )::text
  ) INTO request_id;

  RAISE NOTICE 'Auto-forwarded webhook message % to MT5 (request_id: %)', NEW.id, request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Auto-bridge trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS webhook_auto_forward_trigger ON public.messages;

-- Create trigger for new webhook messages
CREATE TRIGGER webhook_auto_forward_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.message_type = 'webhook' AND NEW.webhook_data IS NOT NULL)
  EXECUTE FUNCTION public.auto_forward_webhook_to_mt5();

-- Add comment for documentation
COMMENT ON TRIGGER webhook_auto_forward_trigger ON public.messages IS 
  'Automatically forwards webhook messages to MT5 when Auto Bridge is enabled - works 24/7 in background';

COMMENT ON FUNCTION public.auto_forward_webhook_to_mt5() IS
  'Background trigger function that forwards webhook signals to MT5 via the auto-bridge edge function';