-- ===== Drop old messages table =====
DROP TABLE IF EXISTS messages CASCADE;

-- ===== 1. Users Table =====
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  color TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'online',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 2. Friendships Table =====
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- ===== 3. Chat Rooms Table =====
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 4. Room Members Table =====
CREATE TABLE room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ===== 5. Messages Table (Updated) =====
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  username TEXT NOT NULL,
  color TEXT NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 6. Webhooks Table =====
CREATE TABLE webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  webhook_url TEXT UNIQUE NOT NULL,
  webhook_secret TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== Indexes for Performance =====
CREATE INDEX users_id_idx ON users(id);
CREATE INDEX friendships_user_idx ON friendships(user_id);
CREATE INDEX friendships_friend_idx ON friendships(friend_id);
CREATE INDEX room_members_room_idx ON room_members(room_id);
CREATE INDEX room_members_user_idx ON room_members(user_id);
CREATE INDEX messages_room_idx ON messages(room_id);
CREATE INDEX messages_created_idx ON messages(created_at DESC);

-- ===== Enable Realtime =====
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE friendships REPLICA IDENTITY FULL;
ALTER TABLE chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE room_members REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ===== Row Level Security (RLS) =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required)
CREATE POLICY "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true);

CREATE POLICY "Anyone can view friendships" ON friendships FOR SELECT USING (true);
CREATE POLICY "Anyone can create friendships" ON friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update friendships" ON friendships FOR UPDATE USING (true);

CREATE POLICY "Anyone can view chat rooms" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON chat_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view room members" ON room_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join rooms" ON room_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view webhooks" ON webhooks FOR SELECT USING (true);
CREATE POLICY "Anyone can create webhooks" ON webhooks FOR INSERT WITH CHECK (true);

-- ===== Storage Bucket Setup =====
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public access)
CREATE POLICY "Anyone can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "Anyone can view files" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');
CREATE POLICY "Anyone can delete files" ON storage.objects FOR DELETE USING (bucket_id = 'chat-files');