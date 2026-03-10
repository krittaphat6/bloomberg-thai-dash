
-- Fix the security definer view by dropping and recreating with security_invoker = true
DROP VIEW IF EXISTS public.failed_webhooks;
CREATE VIEW public.failed_webhooks WITH (security_invoker = true) AS
SELECT 
  wdl.id,
  wdl.room_id,
  wdl.execution_time_ms,
  wdl.retry_count,
  wdl.created_at,
  wdl.request_id,
  cr.name as room_name,
  wdl.payload->>'action' as action,
  wdl.payload->>'symbol' as symbol,
  wdl.payload->>'price' as price,
  wdl.payload->>'lots' as lots,
  wdl.error_message
FROM public.webhook_delivery_logs wdl
LEFT JOIN public.chat_rooms cr ON cr.id = wdl.room_id
WHERE wdl.status = 'failed';
