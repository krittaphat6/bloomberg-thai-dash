-- Create MT5 commands table for storing pending orders
CREATE TABLE public.mt5_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES broker_connections(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  symbol TEXT,
  volume DOUBLE PRECISION,
  price DOUBLE PRECISION,
  sl DOUBLE PRECISION,
  tp DOUBLE PRECISION,
  deviation INTEGER DEFAULT 20,
  comment TEXT,
  status TEXT DEFAULT 'pending',
  ticket_id BIGINT,
  executed_price DOUBLE PRECISION,
  executed_volume DOUBLE PRECISION,
  error_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Create indexes for efficient polling
CREATE INDEX idx_mt5_commands_connection ON mt5_commands(connection_id, status);
CREATE INDEX idx_mt5_commands_created ON mt5_commands(created_at);

-- Enable RLS
ALTER TABLE public.mt5_commands ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own MT5 commands" 
ON public.mt5_commands 
FOR SELECT 
USING (
  connection_id IN (
    SELECT id FROM broker_connections WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert their own MT5 commands" 
ON public.mt5_commands 
FOR INSERT 
WITH CHECK (
  connection_id IN (
    SELECT id FROM broker_connections WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own MT5 commands" 
ON public.mt5_commands 
FOR UPDATE 
USING (
  connection_id IN (
    SELECT id FROM broker_connections WHERE user_id = auth.uid()::text
  )
);

-- Allow service role full access for edge functions
CREATE POLICY "Service role can manage all MT5 commands"
ON public.mt5_commands
FOR ALL
USING (true)
WITH CHECK (true);