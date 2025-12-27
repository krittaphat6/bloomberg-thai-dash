-- Add 'processing' status to mt5_commands
-- First, update any existing constraints

-- Update status column to allow 'processing' value
-- No constraint exists on this column currently, so we just need to ensure the column accepts it

-- Create index for faster queries on processing status
CREATE INDEX IF NOT EXISTS idx_mt5_commands_processing 
ON mt5_commands(connection_id, status) 
WHERE status = 'processing';

-- Add index for stuck command cleanup
CREATE INDEX IF NOT EXISTS idx_mt5_commands_stuck 
ON mt5_commands(connection_id, status, created_at) 
WHERE status = 'processing';