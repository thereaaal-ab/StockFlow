-- Migration: Create categories table
-- Run this SQL in your Supabase SQL Editor

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 4. Create policy to allow all operations for everyone (including anonymous users)
DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
CREATE POLICY "Allow all operations on categories" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Add category_id column to products table (nullable for backward compatibility)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id VARCHAR;

-- 6. Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. Create index on category_id for faster joins
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- 8. Migrate existing category data from products.category to categories table
-- First, insert unique categories from products.category
INSERT INTO categories (name)
SELECT DISTINCT LOWER(TRIM(category))
FROM products
WHERE category IS NOT NULL 
  AND TRIM(category) != ''
  AND NOT EXISTS (
    SELECT 1 FROM categories WHERE LOWER(name) = LOWER(TRIM(products.category))
  )
ON CONFLICT (name) DO NOTHING;

-- 9. Update products to set category_id based on category name
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE LOWER(TRIM(p.category)) = LOWER(c.name)
  AND p.category IS NOT NULL
  AND TRIM(p.category) != '';

-- Note: We keep the category column for backward compatibility during migration
-- You can drop it later after verifying everything works:
-- ALTER TABLE products DROP COLUMN IF EXISTS category;

