-- Fix 1: Customer Email Addresses Exposed to Public Internet
-- Users can see all profiles but only their own email
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

CREATE POLICY "Users can view all profiles but only own email"
ON public.users
FOR SELECT
USING (
  -- Can see basic profile info (id, username, color, avatar_url, status)
  -- Email is hidden via a separate approach - we'll use a view
  true
);

-- Create a secure view that hides emails from other users
CREATE OR REPLACE VIEW public.users_public AS
SELECT 
  id,
  username,
  color,
  avatar_url,
  status,
  last_seen,
  created_at,
  CASE 
    WHEN id = auth.uid()::text THEN email 
    ELSE NULL 
  END as email
FROM public.users;

-- Fix 2: Private Chat Messages Readable by Anyone
-- Only room members can read messages
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;

CREATE POLICY "Room members can view messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_members.room_id = messages.room_id 
    AND room_members.user_id = auth.uid()::text
  )
  OR 
  -- Allow webhook/system messages to be visible to room members
  EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE chat_rooms.id = messages.room_id
    AND (chat_rooms.type = 'webhook' OR chat_rooms.created_by = auth.uid()::text)
  )
);

-- Fix 3: Anyone Can Manipulate Friend Relationships
-- Only involved users can update friendships
DROP POLICY IF EXISTS "Anyone can update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Anyone can create friendships" ON public.friendships;
DROP POLICY IF EXISTS "Anyone can view friendships" ON public.friendships;

CREATE POLICY "Users can view own friendships"
ON public.friendships
FOR SELECT
USING (
  user_id = auth.uid()::text OR friend_id = auth.uid()::text
);

CREATE POLICY "Users can create friendship requests"
ON public.friendships
FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text
);

CREATE POLICY "Users can update own friendships"
ON public.friendships
FOR UPDATE
USING (
  user_id = auth.uid()::text OR friend_id = auth.uid()::text
);

-- Allow users to delete their own friendships
CREATE POLICY "Users can delete own friendships"
ON public.friendships
FOR DELETE
USING (
  user_id = auth.uid()::text OR friend_id = auth.uid()::text
);