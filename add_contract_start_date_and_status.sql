-- Migration: Add contract_start_date and status fields to clients table
-- Run this SQL in your Supabase SQL Editor

-- 1. Add contract_start_date column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_start_date DATE;

-- 2. Add status column (optional, can be calculated on the fly)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Create index on contract_start_date for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_contract_start_date ON clients(contract_start_date);

-- 4. Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Note: months_passed and months_needed_to_cover will be calculated in the application
-- based on contract_start_date and other client data

