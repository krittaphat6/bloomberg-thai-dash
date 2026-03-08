
CREATE TABLE public.trading_journal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  folders JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.trading_journal_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own journal data"
  ON public.trading_journal_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal data"
  ON public.trading_journal_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal data"
  ON public.trading_journal_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
