-- Migration: Create commissions table
-- Run this SQL in your Supabase SQL Editor

-- 1. Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create index on month for faster queries
CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(month);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- 4. Create policy to allow all operations for everyone (including anonymous users)
DROP POLICY IF EXISTS "Allow all operations on commissions" ON commissions;
CREATE POLICY "Allow all operations on commissions" ON commissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

