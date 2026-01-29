-- Migration: Move category from clients to products
-- Run this SQL in your Supabase SQL Editor

-- 1. Add category column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

-- 2. Remove category column from clients table (if it exists)
ALTER TABLE clients 
DROP COLUMN IF EXISTS category;

-- 3. Add product_id foreign key to clients table (if it doesn't exist)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS product_id VARCHAR;

-- 4. Add foreign key constraint (if not already exists)
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

-- 5. Create index on product_id for faster joins
CREATE INDEX IF NOT EXISTS idx_clients_product_id ON clients(product_id);

-- 6. Create index on products.category for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

