-- Verify and fix updated_at column in clients table
-- Run this SQL in your Supabase SQL Editor

-- First, verify the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'updated_at';

-- If the column doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE clients 
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
    
    -- Update existing rows
    UPDATE clients SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
  END IF;
END $$;

-- Ensure the trigger exists and is working
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP FUNCTION IF EXISTS update_clients_updated_at_column();

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION update_clients_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at_column();

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clients' AND trigger_name = 'update_clients_updated_at';

