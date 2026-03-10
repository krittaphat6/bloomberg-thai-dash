
-- 1. Add connection_secret to broker_connections for MT5 poll authentication
ALTER TABLE public.broker_connections ADD COLUMN IF NOT EXISTS connection_secret text DEFAULT encode(gen_random_bytes(32), 'hex');

-- Update existing rows that have null secrets
UPDATE public.broker_connections SET connection_secret = encode(gen_random_bytes(32), 'hex') WHERE connection_secret IS NULL;

-- 2. Fix failed_webhooks view - recreate WITHOUT security definer
DROP VIEW IF EXISTS public.failed_webhooks;
CREATE VIEW public.failed_webhooks AS
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

-- 3. Fix storage bucket - make chat-files private and restrict policies
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete files" ON storage.objects;

-- Create proper restricted policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
