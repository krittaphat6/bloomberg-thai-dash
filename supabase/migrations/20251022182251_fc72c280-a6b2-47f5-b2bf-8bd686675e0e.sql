-- Friend Nicknames Table
create table friend_nicknames (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  friend_id text not null,
  nickname text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

-- Index
create index friend_nicknames_user_idx on friend_nicknames(user_id);
create index friend_nicknames_friend_idx on friend_nicknames(friend_id);

-- Enable Realtime
alter table friend_nicknames replica identity full;
alter publication supabase_realtime add table friend_nicknames;

-- RLS
alter table friend_nicknames enable row level security;

create policy "Anyone can view nicknames" on friend_nicknames 
  for select using (true);
  
create policy "Anyone can create nicknames" on friend_nicknames 
  for insert with check (true);
  
create policy "Anyone can update nicknames" on friend_nicknames 
  for update using (true);