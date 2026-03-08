-- Fix 1: Harden RLS policies

-- users table
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
CREATE POLICY "Authenticated can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (id = (auth.uid())::text);

-- webhooks
DROP POLICY IF EXISTS "Anyone can create webhooks" ON public.webhooks;
CREATE POLICY "Authenticated can create webhooks" ON public.webhooks FOR INSERT TO authenticated WITH CHECK (created_by = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can delete webhooks" ON public.webhooks;
CREATE POLICY "Authenticated can delete own webhooks" ON public.webhooks FOR DELETE TO authenticated USING (created_by = (auth.uid())::text);

-- webhook_delivery_logs
DROP POLICY IF EXISTS "Anyone can insert webhook logs" ON public.webhook_delivery_logs;
CREATE POLICY "Authenticated can insert webhook logs" ON public.webhook_delivery_logs FOR INSERT TO authenticated WITH CHECK (true);

-- chat_rooms
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated can create rooms" ON public.chat_rooms FOR INSERT TO authenticated WITH CHECK (created_by = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can delete chat rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated can delete own rooms" ON public.chat_rooms FOR DELETE TO authenticated USING (created_by = (auth.uid())::text);

-- messages
DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;
CREATE POLICY "Authenticated can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can delete messages" ON public.messages;
CREATE POLICY "Authenticated can delete own messages" ON public.messages FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- room_members
DROP POLICY IF EXISTS "Anyone can join rooms" ON public.room_members;
CREATE POLICY "Authenticated can join rooms" ON public.room_members FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can delete room members" ON public.room_members;
CREATE POLICY "Authenticated can leave rooms" ON public.room_members FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- active_video_calls
DROP POLICY IF EXISTS "Users can insert own call" ON public.active_video_calls;
CREATE POLICY "Authenticated can insert own call" ON public.active_video_calls FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own call" ON public.active_video_calls;
CREATE POLICY "Authenticated can update own call" ON public.active_video_calls FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own call" ON public.active_video_calls;
CREATE POLICY "Authenticated can delete own call" ON public.active_video_calls FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- friend_nicknames
DROP POLICY IF EXISTS "Anyone can create nicknames" ON public.friend_nicknames;
CREATE POLICY "Authenticated can create nicknames" ON public.friend_nicknames FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can update nicknames" ON public.friend_nicknames;
CREATE POLICY "Authenticated can update own nicknames" ON public.friend_nicknames FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);

-- Fix 2: Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION public.update_agent_skills_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_broker_connection_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$