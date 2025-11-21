-- Migration: Add rent_price column to products table
-- Run this SQL in your Supabase SQL Editor

-- Add rent_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Update existing products to have rent_price = 0 if NULL
UPDATE products 
SET rent_price = 0 
WHERE rent_price IS NULL;

