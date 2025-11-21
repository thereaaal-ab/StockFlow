-- Migration: Add hardware_total and stock_actuel columns to products table
-- Run this SQL in your Supabase SQL Editor

-- 1. Add hardware_total column (original quantity, never changes automatically)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS hardware_total INTEGER NOT NULL DEFAULT 0;

-- 2. Add stock_actuel column (current available stock, decreases when clients receive products)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_actuel INTEGER NOT NULL DEFAULT 0;

-- 3. Migrate existing data: set hardware_total and stock_actuel to current quantity value
-- This ensures backward compatibility
UPDATE products 
SET 
  hardware_total = COALESCE(quantity, 0),
  stock_actuel = COALESCE(quantity, 0)
WHERE hardware_total = 0 OR stock_actuel = 0;

-- 4. Add comments to document the columns
COMMENT ON COLUMN products.hardware_total IS 'Original quantity added initially (or edited manually). This value never changes automatically.';
COMMENT ON COLUMN products.stock_actuel IS 'Current available stock. This value decreases when clients receive products.';

-- 5. Create indexes for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_products_hardware_total ON products(hardware_total);
CREATE INDEX IF NOT EXISTS idx_products_stock_actuel ON products(stock_actuel);

