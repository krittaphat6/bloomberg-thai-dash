-- Create messages table for real-time chat
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages (public chat)
CREATE POLICY "Anyone can read messages"
  ON public.messages
  FOR SELECT
  USING (true);

-- Allow anyone to insert messages (public chat)
CREATE POLICY "Anyone can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (true);

-- Enable Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create index for performance
CREATE INDEX messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX messages_user_id_idx ON public.messages(user_id);