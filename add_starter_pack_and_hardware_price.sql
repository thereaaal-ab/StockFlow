-- Add starterPackPrice and hardwarePrice columns to clients table
-- Run this SQL in your Supabase SQL Editor

-- Add starterPackPrice column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS starter_pack_price NUMERIC(10, 2) DEFAULT 0;

-- Add hardwarePrice column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS hardware_price NUMERIC(10, 2) DEFAULT 0;

-- Create index on these columns if needed for queries
-- CREATE INDEX IF NOT EXISTS idx_clients_starter_pack_price ON clients(starter_pack_price);
-- CREATE INDEX IF NOT EXISTS idx_clients_hardware_price ON clients(hardware_price);

-- Add comments to document the columns
COMMENT ON COLUMN clients.starter_pack_price IS 'Starter pack price for new clients (only set on creation)';
COMMENT ON COLUMN clients.hardware_price IS 'Hardware price for new clients (only set on creation)';

