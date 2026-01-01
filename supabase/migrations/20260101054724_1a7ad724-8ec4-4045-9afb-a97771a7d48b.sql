-- Create bridge_settings table for Auto Bridge configuration
CREATE TABLE public.bridge_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mt5_connection_id UUID REFERENCES public.broker_connections(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  auto_forward_signals BOOLEAN DEFAULT true,
  signal_types TEXT[] DEFAULT ARRAY['BUY', 'SELL', 'CLOSE'],
  max_lot_size NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_id)
);

-- Create bridge_logs table for logging all bridge activity
CREATE TABLE public.bridge_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  webhook_data JSONB NOT NULL,
  mt5_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bridge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bridge_settings
CREATE POLICY "Users can view own bridge settings"
ON public.bridge_settings
FOR SELECT
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert own bridge settings"
ON public.bridge_settings
FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update own bridge settings"
ON public.bridge_settings
FOR UPDATE
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete own bridge settings"
ON public.bridge_settings
FOR DELETE
USING (user_id = (auth.uid())::text);

-- RLS Policies for bridge_logs
CREATE POLICY "Users can view own bridge logs"
ON public.bridge_logs
FOR SELECT
USING (user_id = (auth.uid())::text);

CREATE POLICY "Service role can insert bridge logs"
ON public.bridge_logs
FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_bridge_settings_updated_at
BEFORE UPDATE ON public.bridge_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_broker_connection_updated_at();

-- Enable realtime for bridge_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.bridge_logs;