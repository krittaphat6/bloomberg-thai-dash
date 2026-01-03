-- Enable pg_net extension for HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to auto-forward webhook messages to MT5
CREATE OR REPLACE FUNCTION public.auto_forward_webhook_to_mt5()
RETURNS TRIGGER AS $$
DECLARE
  bridge_settings RECORD;
  webhook_url TEXT;
BEGIN
  -- Only process webhook messages
  IF NEW.message_type = 'webhook' AND NEW.webhook_data IS NOT NULL THEN
    -- Find active bridge settings for this room
    SELECT bs.*, bc.is_connected 
    INTO bridge_settings
    FROM bridge_settings bs
    LEFT JOIN broker_connections bc ON bs.mt5_connection_id = bc.id
    WHERE bs.room_id = NEW.room_id 
      AND bs.enabled = true
      AND bs.auto_forward_signals = true
    LIMIT 1;
    
    -- If bridge settings found and connected, call edge function
    IF bridge_settings IS NOT NULL THEN
      webhook_url := 'https://sovyrqzpavkuuycnfyac.supabase.co/functions/v1/auto-bridge';
      
      -- Make async HTTP call to edge function
      PERFORM net.http_post(
        url := webhook_url,
        body := jsonb_build_object(
          'message_id', NEW.id,
          'room_id', NEW.room_id,
          'user_id', NEW.user_id,
          'webhook_data', NEW.webhook_data,
          'action', COALESCE(NEW.webhook_data->>'action', 'UNKNOWN'),
          'symbol', COALESCE(NEW.webhook_data->>'symbol', 'UNKNOWN'),
          'price', (NEW.webhook_data->>'price')::numeric,
          'quantity', (NEW.webhook_data->>'quantity')::numeric,
          'sl', (NEW.webhook_data->>'sl')::numeric,
          'tp', (NEW.webhook_data->>'tp')::numeric
        )::text,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
      
      RAISE LOG 'Auto-bridge triggered for message % in room %', NEW.id, NEW.room_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS webhook_auto_forward_trigger ON messages;

-- Create trigger for webhook auto-forward
CREATE TRIGGER webhook_auto_forward_trigger
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.message_type = 'webhook')
EXECUTE FUNCTION auto_forward_webhook_to_mt5();