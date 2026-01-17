-- ============================================================================
-- Webhook Delivery Logs Table
-- Purpose: Track ALL webhook deliveries (success + failed) for monitoring
-- ============================================================================

-- Create webhook_delivery_logs table
CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  
  -- Webhook data
  payload JSONB NOT NULL DEFAULT '{}',
  
  -- Delivery status
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retry')),
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  
  -- Performance tracking
  execution_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_webhook_delivery_logs_request_id ON public.webhook_delivery_logs(request_id);
CREATE INDEX idx_webhook_delivery_logs_room_id ON public.webhook_delivery_logs(room_id);
CREATE INDEX idx_webhook_delivery_logs_status ON public.webhook_delivery_logs(status);
CREATE INDEX idx_webhook_delivery_logs_created_at ON public.webhook_delivery_logs(created_at DESC);
CREATE INDEX idx_webhook_delivery_logs_failed ON public.webhook_delivery_logs(status) WHERE status = 'failed';

-- Enable RLS
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view webhook logs"
ON public.webhook_delivery_logs
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert webhook logs"
ON public.webhook_delivery_logs
FOR INSERT
WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_delivery_logs;

-- Create view for failed webhooks (easy debugging)
CREATE OR REPLACE VIEW public.failed_webhooks AS
SELECT 
  wdl.id,
  wdl.request_id,
  wdl.room_id,
  cr.name as room_name,
  wdl.payload->>'action' as action,
  wdl.payload->>'symbol' as symbol,
  wdl.payload->>'price' as price,
  wdl.payload->>'lots' as lots,
  wdl.error_message,
  wdl.execution_time_ms,
  wdl.retry_count,
  wdl.created_at
FROM public.webhook_delivery_logs wdl
LEFT JOIN public.chat_rooms cr ON cr.id = wdl.room_id
WHERE wdl.status = 'failed'
ORDER BY wdl.created_at DESC;

-- Cleanup function (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webhook_delivery_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comments
COMMENT ON TABLE public.webhook_delivery_logs IS 'Tracks all webhook deliveries for monitoring and debugging';
COMMENT ON COLUMN public.webhook_delivery_logs.request_id IS 'Unique ID for each webhook request (for deduplication)';
COMMENT ON COLUMN public.webhook_delivery_logs.status IS 'success = inserted successfully, failed = error occurred, retry = retrying';