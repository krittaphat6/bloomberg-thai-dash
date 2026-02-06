-- =========================================================
-- SUPERCLAW AGENT SYSTEM - DATABASE TABLES
-- =========================================================

-- AGENT MEMORY TABLE (For learning from actions)
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('css', 'text', 'vision', 'memory', 'cdp')),
  success BOOLEAN NOT NULL DEFAULT false,
  confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  execution_time INTEGER, -- milliseconds
  screenshot TEXT, -- base64 or URL
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT SKILLS TABLE (For skill automation)
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('automation', 'analysis', 'data', 'communication', 'trading')),
  enabled BOOLEAN DEFAULT true,
  code TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  schedule TEXT, -- Cron format
  last_run TIMESTAMPTZ,
  success_rate NUMERIC(5,2) DEFAULT 0,
  run_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'system' CHECK (created_by IN ('user', 'ai', 'system')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GATEWAY MESSAGES TABLE (For command routing)
CREATE TABLE IF NOT EXISTS gateway_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('connect', 'disconnect', 'command', 'response', 'event')),
  channel TEXT NOT NULL CHECK (channel IN ('web', 'telegram', 'whatsapp', 'discord', 'internal')),
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_goal ON agent_memory(goal);
CREATE INDEX IF NOT EXISTS idx_agent_memory_action ON agent_memory(action);
CREATE INDEX IF NOT EXISTS idx_agent_memory_success ON agent_memory(success);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created_at ON agent_memory(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_skills_user_id ON agent_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_category ON agent_skills(category);
CREATE INDEX IF NOT EXISTS idx_agent_skills_enabled ON agent_skills(enabled);

CREATE INDEX IF NOT EXISTS idx_gateway_messages_user_id ON gateway_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_messages_type ON gateway_messages(type);
CREATE INDEX IF NOT EXISTS idx_gateway_messages_processed ON gateway_messages(processed);

-- ENABLE RLS
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_messages ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users can manage their own memories"
ON agent_memory FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills"
ON agent_skills FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own gateway messages"
ON gateway_messages FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- FUNCTION: Get best method stats for learning
CREATE OR REPLACE FUNCTION get_best_method_stats(action_type TEXT)
RETURNS TABLE (
  method TEXT,
  count BIGINT,
  avg_confidence NUMERIC,
  success_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.method,
    COUNT(*)::BIGINT as count,
    AVG(am.confidence)::NUMERIC as avg_confidence,
    (SUM(CASE WHEN am.success THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC * 100) as success_rate
  FROM agent_memory am
  WHERE am.action = action_type
    AND am.user_id = auth.uid()
  GROUP BY am.method
  ORDER BY success_rate DESC, count DESC
  LIMIT 5;
END;
$$;

-- TRIGGER: Update updated_at on agent_skills
CREATE OR REPLACE FUNCTION update_agent_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agent_skills_updated_at ON agent_skills;
CREATE TRIGGER trigger_update_agent_skills_updated_at
BEFORE UPDATE ON agent_skills
FOR EACH ROW
EXECUTE FUNCTION update_agent_skills_updated_at();

-- Enable realtime for gateway_messages
ALTER PUBLICATION supabase_realtime ADD TABLE gateway_messages;