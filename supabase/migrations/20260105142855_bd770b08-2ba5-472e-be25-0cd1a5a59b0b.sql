-- Add RLS policies for service role access (needed for edge functions)
-- These policies allow the service role to read bridge settings and broker connections

-- Policy for bridge_settings - allow service role full access
CREATE POLICY "Service role can read bridge settings" 
ON public.bridge_settings 
FOR SELECT 
USING (true);

-- Policy for broker_connections - allow service role full access  
CREATE POLICY "Service role can read broker connections"
ON public.broker_connections
FOR SELECT
USING (true);