-- Add products JSONB column to clients table
-- Run this SQL in your Supabase SQL Editor

-- Add products column to store array of products with quantities and fees
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- Create index on products column for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_products ON clients USING GIN (products);

-- Add comment to document the structure
COMMENT ON COLUMN clients.products IS 'Array of products: [{"productId": "...", "name": "...", "quantity": 6, "monthlyFee": 20}]';


