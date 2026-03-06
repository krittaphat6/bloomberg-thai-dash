
-- Notes table for cross-device sync
CREATE TABLE public.user_notes (
  id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  folder TEXT,
  icon TEXT DEFAULT '📄',
  is_favorite BOOLEAN DEFAULT false,
  linked_notes TEXT[] DEFAULT '{}',
  rich_content TEXT,
  is_rich_text BOOLEAN DEFAULT false,
  properties JSONB DEFAULT '{}',
  parent_id TEXT,
  children TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, user_id)
);

-- RLS
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own notes" ON public.user_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notes;
