-- Table สำหรับเก็บ Peer IDs ของคนที่กำลัง call
create table if not exists active_video_calls (
  id uuid default gen_random_uuid() primary key,
  room_id uuid not null,
  user_id text not null,
  username text not null,
  peer_id text not null,
  is_active boolean default true,
  joined_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for performance
create index if not exists active_video_calls_room_idx on active_video_calls(room_id);
create index if not exists active_video_calls_user_idx on active_video_calls(user_id);
create index if not exists active_video_calls_peer_idx on active_video_calls(peer_id);

-- Enable Realtime
alter table active_video_calls replica identity full;

-- RLS
alter table active_video_calls enable row level security;

-- Policies
create policy "Anyone can view active calls" 
  on active_video_calls for select using (true);

create policy "Users can insert own call" 
  on active_video_calls for insert 
  with check (true);

create policy "Users can update own call" 
  on active_video_calls for update 
  using (true);

create policy "Users can delete own call" 
  on active_video_calls for delete 
  using (true);