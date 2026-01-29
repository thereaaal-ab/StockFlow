-- Quick fix for trigger error
-- Run this SQL in your Supabase SQL Editor

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

-- Recreate the trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at_column();

