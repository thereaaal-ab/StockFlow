-- Fix the updated_at trigger to handle Supabase updates properly
-- Run this SQL in your Supabase SQL Editor

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP FUNCTION IF EXISTS update_clients_updated_at_column();

-- Create a simpler, more compatible trigger function
-- This version works better with Supabase's update mechanism
CREATE OR REPLACE FUNCTION update_clients_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Set updated_at to current timestamp on update
  -- Use := for assignment in PL/pgSQL
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at_column();

