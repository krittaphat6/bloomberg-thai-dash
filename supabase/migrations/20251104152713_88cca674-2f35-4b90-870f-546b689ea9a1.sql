-- Create market_data table for real-time quotes
CREATE TABLE market_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(15,4),
  volume BIGINT,
  change DECIMAL(10,4),
  change_percent DECIMAL(8,4),
  high DECIMAL(15,4),
  low DECIMAL(15,4),
  open DECIMAL(15,4),
  bid DECIMAL(15,4),
  ask DECIMAL(15,4),
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sentiment_data table for Twitter/Reddit sentiment
CREATE TABLE sentiment_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  keyword TEXT NOT NULL,
  sentiment_score DECIMAL(3,2),
  volume INT DEFAULT 0,
  mentions INT DEFAULT 0,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alerts table for price/volume/sentiment alerts
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  symbol TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create api_usage_logs table for tracking API calls
CREATE TABLE api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_name TEXT NOT NULL,
  endpoint TEXT,
  status_code INT,
  response_time_ms INT,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_market_data_symbol ON market_data(symbol);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp DESC);
CREATE INDEX idx_sentiment_keyword ON sentiment_data(keyword);
CREATE INDEX idx_sentiment_timestamp ON sentiment_data(timestamp DESC);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (public read access)
CREATE POLICY "Anyone can read market data" 
  ON market_data FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can read sentiment data" 
  ON sentiment_data FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can read alerts" 
  ON alerts FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can read api logs" 
  ON api_usage_logs FOR SELECT 
  USING (true);

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE market_data;
ALTER PUBLICATION supabase_realtime ADD TABLE sentiment_data;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;