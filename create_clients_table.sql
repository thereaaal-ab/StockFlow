-- Create clients table in Supabase
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ptuosweivwyiwmguxagx/sql

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  total_sold_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  product_quantity INTEGER NOT NULL DEFAULT 0,
  months_left INTEGER NOT NULL DEFAULT 0,
  product_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;

-- Create policy to allow all operations for everyone (including anonymous users)
-- This allows SELECT, INSERT, UPDATE, DELETE for all users
CREATE POLICY "Allow all operations on clients" ON clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Alternative: If the above doesn't work, create separate policies for each operation
-- Uncomment these if needed:
-- CREATE POLICY "Allow SELECT on clients" ON clients FOR SELECT USING (true);
-- CREATE POLICY "Allow INSERT on clients" ON clients FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow UPDATE on clients" ON clients FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow DELETE on clients" ON clients FOR DELETE USING (true);

-- Create an index on client_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at_column();

