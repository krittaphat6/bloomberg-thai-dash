-- Create broker_connections table for storing API credentials and sessions
CREATE TABLE public.broker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  broker_type TEXT NOT NULL CHECK (broker_type IN ('tradovate', 'settrade')),
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT FALSE,
  session_data JSONB,
  max_position_size INTEGER DEFAULT 100,
  total_orders_sent INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  failed_orders INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create api_forward_logs table for audit trail
CREATE TABLE public.api_forward_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  room_id UUID NOT NULL,
  message_id UUID,
  broker_type TEXT NOT NULL,
  action TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  order_id TEXT,
  error_message TEXT,
  latency_ms INTEGER,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_forward_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for broker_connections
CREATE POLICY "Users can view own broker connections"
ON public.broker_connections
FOR SELECT
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can insert own broker connections"
ON public.broker_connections
FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update own broker connections"
ON public.broker_connections
FOR UPDATE
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete own broker connections"
ON public.broker_connections
FOR DELETE
USING (user_id = (auth.uid())::text);

-- RLS Policies for api_forward_logs (view through connection ownership)
CREATE POLICY "Users can view own forward logs"
ON public.api_forward_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.broker_connections bc
    WHERE bc.id = api_forward_logs.connection_id
    AND bc.user_id = (auth.uid())::text
  )
);

CREATE POLICY "Service role can insert forward logs"
ON public.api_forward_logs
FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_broker_connection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_broker_connections_updated_at
  BEFORE UPDATE ON public.broker_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_broker_connection_updated_at();

-- Enable realtime for broker_connections
ALTER PUBLICATION supabase_realtime ADD TABLE public.broker_connections;