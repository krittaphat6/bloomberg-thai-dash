-- Create news_history table for storing all news
CREATE TABLE public.news_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  source TEXT NOT NULL,
  category TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  timestamp BIGINT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  importance TEXT CHECK (importance IN ('high', 'medium', 'low')),
  related_assets TEXT[],
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_news_history_timestamp ON public.news_history(timestamp DESC);
CREATE INDEX idx_news_history_related_assets ON public.news_history USING GIN(related_assets);
CREATE INDEX idx_news_history_published_at ON public.news_history(published_at DESC);
CREATE INDEX idx_news_history_source ON public.news_history(source);
CREATE INDEX idx_news_history_sentiment ON public.news_history(sentiment);

-- Enable RLS
ALTER TABLE public.news_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read news history"
ON public.news_history
FOR SELECT
USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Service role can manage news"
ON public.news_history
FOR ALL
USING (true)
WITH CHECK (true);