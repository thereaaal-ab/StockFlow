-- Update clients and products tables schema
-- Run this SQL in your Supabase SQL Editor

-- Ensure clients table contains required fields
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS total_sold_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS product_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS months_left INTEGER NOT NULL DEFAULT 0;

-- Ensure products table has category as TEXT (free text input)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

-- Update existing products that might have NULL category
UPDATE products 
SET category = 'Other' 
WHERE category IS NULL OR category = '';

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Note: If you get errors about existing triggers or constraints, they can be safely ignored
-- The triggers and constraints are already set up from the initial table creation

