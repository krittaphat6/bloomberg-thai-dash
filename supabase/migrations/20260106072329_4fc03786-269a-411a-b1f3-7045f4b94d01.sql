-- Update auto_forward_webhook function to use lowercase command_type
-- and clean symbol format

CREATE OR REPLACE FUNCTION public.auto_forward_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bridge_settings RECORD;
  parsed_trade JSONB;
  action TEXT;
  symbol TEXT;
  clean_symbol TEXT;
  volume NUMERIC;
  price NUMERIC;
  sl NUMERIC;
  tp NUMERIC;
  command_type_lower TEXT;
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
  
  -- Clean symbol: remove /, -, spaces
  clean_symbol := REGEXP_REPLACE(symbol, '[/\-\s]', '', 'g');
  
  volume := COALESCE(
    (parsed_trade->>'volume')::NUMERIC,
    (parsed_trade->>'quantity')::NUMERIC,
    (parsed_trade->>'lots')::NUMERIC,
    (parsed_trade->>'size')::NUMERIC,
    0.1
  );
  
  -- Validate volume
  IF volume <= 0 OR volume IS NULL THEN
    volume := 0.1;
  END IF;
  
  -- Apply max lot size limit
  IF volume > bridge_settings.max_lot_size THEN
    volume := bridge_settings.max_lot_size;
  END IF;
  
  price := COALESCE((parsed_trade->>'price')::NUMERIC, 0);
  IF price < 0 THEN
    price := 0;
  END IF;
  
  sl := COALESCE((parsed_trade->>'sl')::NUMERIC, 0);
  IF sl < 0 THEN
    sl := NULL;
  ELSIF sl > 0 THEN
    -- keep value
  ELSE
    sl := NULL;
  END IF;
  
  tp := COALESCE((parsed_trade->>'tp')::NUMERIC, 0);
  IF tp < 0 THEN
    tp := NULL;
  ELSIF tp > 0 THEN
    -- keep value
  ELSE
    tp := NULL;
  END IF;
  
  -- Check if action is allowed
  IF action NOT IN ('BUY', 'SELL', 'CLOSE') THEN
    RETURN NEW;
  END IF;
  
  IF NOT (bridge_settings.signal_types @> ARRAY[action]) THEN
    RETURN NEW;
  END IF;
  
  -- Convert to lowercase command_type for MT5 EA
  command_type_lower := CASE 
    WHEN action = 'CLOSE' THEN 'close'
    WHEN action = 'BUY' THEN 'buy'
    WHEN action = 'SELL' THEN 'sell'
    ELSE LOWER(action)
  END;
  
  -- Create MT5 command with lowercase command_type and cleaned symbol
  INSERT INTO mt5_commands (
    connection_id,
    command_type,
    symbol,
    volume,
    price,
    sl,
    tp,
    deviation,
    comment,
    status
  ) VALUES (
    bridge_settings.connection_id,
    command_type_lower,
    clean_symbol,
    volume,
    CASE WHEN price > 0 THEN price ELSE NULL END,
    sl,
    tp,
    20,
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
$function$;