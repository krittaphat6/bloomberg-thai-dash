-- Drop old constraint and add new one that includes 'mt5'
ALTER TABLE public.broker_connections 
DROP CONSTRAINT IF EXISTS broker_connections_broker_type_check;

ALTER TABLE public.broker_connections 
ADD CONSTRAINT broker_connections_broker_type_check 
CHECK (broker_type = ANY (ARRAY['tradovate'::text, 'settrade'::text, 'mt5'::text]));