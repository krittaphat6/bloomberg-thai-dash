-- Fix search_path for auto_forward_webhook function
CREATE OR REPLACE FUNCTION public.auto_forward_webhook()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bridge_settings RECORD;
  parsed_trade JSONB;
  action TEXT;
  symbol TEXT;
  volume NUMERIC;
  price NUMERIC;
  sl NUMERIC;
  tp NUMERIC;
BEGIN
  -- Only process webhook messages
  IF NEW.message_type != 'webhook' THEN
    RETURN NEW;
  END IF;
  
  -- Check if room has auto-bridge enabled
  SELECT bs.*, bc.id as connection_id, bc.is_connected
  INTO bridge_settings
  FROM bridge_settings bs
  LEFT JOIN broker_connections bc ON bc.id = bs.mt5_connection_id
  WHERE bs.room_id = NEW.room_id
    AND bs.enabled = true
    AND bs.auto_forward_signals = true;
  
  IF bridge_settings IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if MT5 is connected
  IF bridge_settings.is_connected != true THEN
    RETURN NEW;
  END IF;
  
  -- Parse webhook data
  IF NEW.webhook_data IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Extract trade info from webhook_data
  parsed_trade := COALESCE(NEW.webhook_data->'parsed_trade', NEW.webhook_data);
  
  action := UPPER(COALESCE(
    parsed_trade->>'action',
    parsed_trade->>'type',
    parsed_trade->>'side',
    'UNKNOWN'
  ));
  
  symbol := UPPER(COALESCE(
    parsed_trade->>'symbol',
    parsed_trade->>'ticker',
    parsed_trade->>'pair',
    'UNKNOWN'
  ));
  
  volume := COALESCE(
    (parsed_trade->>'volume')::NUMERIC,
    (parsed_trade->>'quantity')::NUMERIC,
    (parsed_trade->>'lots')::NUMERIC,
    (parsed_trade->>'size')::NUMERIC,
    0.1
  );
  
  -- Apply max lot size limit
  IF volume > bridge_settings.max_lot_size THEN
    volume := bridge_settings.max_lot_size;
  END IF;
  
  price := (parsed_trade->>'price')::NUMERIC;
  sl := (parsed_trade->>'sl')::NUMERIC;
  tp := (parsed_trade->>'tp')::NUMERIC;
  
  -- Check if action is allowed
  IF action NOT IN ('BUY', 'SELL', 'CLOSE') THEN
    RETURN NEW;
  END IF;
  
  IF NOT (bridge_settings.signal_types @> ARRAY[action]) THEN
    RETURN NEW;
  END IF;
  
  -- Create MT5 command
  INSERT INTO mt5_commands (
    connection_id,
    command_type,
    symbol,
    volume,
    price,
    sl,
    tp,
    comment,
    status
  ) VALUES (
    bridge_settings.connection_id,
    CASE WHEN action = 'CLOSE' THEN 'CLOSE' ELSE action END,
    symbol,
    volume,
    price,
    sl,
    tp,
    'Auto-Bridge: ' || action || ' from webhook',
    'pending'
  );
  
  -- Log the bridge action
  INSERT INTO bridge_logs (
    user_id,
    room_id,
    webhook_data,
    status
  ) VALUES (
    COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'),
    NEW.room_id,
    NEW.webhook_data,
    'forwarded'
  );
  
  RETURN NEW;
END;
$$;

-- Fix search_path for update_broker_connection_updated_at function
CREATE OR REPLACE FUNCTION public.update_broker_connection_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;