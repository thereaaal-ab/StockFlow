-- Safe update for clients and products tables schema
-- This version handles existing triggers and constraints gracefully
-- Run this SQL in your Supabase SQL Editor

-- Ensure clients table contains required fields
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'total_sold_amount') THEN
    ALTER TABLE clients ADD COLUMN total_sold_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'product_quantity') THEN
    ALTER TABLE clients ADD COLUMN product_quantity INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'monthly_fee') THEN
    ALTER TABLE clients ADD COLUMN monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'months_left') THEN
    ALTER TABLE clients ADD COLUMN months_left INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'product_id') THEN
    ALTER TABLE clients ADD COLUMN product_id VARCHAR;
  END IF;
END $$;

-- Ensure products table has category as TEXT (free text input)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
    ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'Other';
  END IF;
END $$;

-- Update existing products that might have NULL category
UPDATE products 
SET category = 'Other' 
WHERE category IS NULL OR category = '';

-- Create index on category for faster filtering (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Create index on product_id for clients (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_clients_product_id ON clients(product_id);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_product_id_fkey'
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
  END IF;
END $$;

