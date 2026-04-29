-- ============================================================================
-- StockFlow Database Schema
-- ============================================================================
-- This file contains the complete database schema for StockFlow.
-- It includes all table definitions, migrations, and schema updates.
-- 
-- Usage: Run this entire file in your Supabase SQL Editor to set up the database.
-- For existing databases, individual sections can be run as needed.
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE TABLE CREATIONS
-- ============================================================================
-- Create the fundamental tables for the application
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Products Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price NUMERIC(10, 2) NOT NULL,
  selling_price NUMERIC(10, 2) NOT NULL,
  profit NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
CREATE POLICY "Allow all operations on products" ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Clients Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  total_sold_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  product_quantity INTEGER NOT NULL DEFAULT 0,
  months_left INTEGER NOT NULL DEFAULT 0,
  product_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
CREATE POLICY "Allow all operations on clients" ON clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_product_id ON clients(product_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at_column();

-- ----------------------------------------------------------------------------
-- Categories Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
CREATE POLICY "Allow all operations on categories" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add category_id column to products table (nullable for backward compatibility)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id VARCHAR;

-- Add foreign key constraint for category_id
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

-- Create index on category_id for faster joins
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Migrate existing category data from products.category to categories table
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

-- Update products to set category_id based on category name
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE LOWER(TRIM(p.category)) = LOWER(c.name)
  AND p.category IS NOT NULL
  AND TRIM(p.category) != '';

-- ----------------------------------------------------------------------------
-- Commissions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on month for faster queries
CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(month);

-- Enable Row Level Security (RLS)
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
DROP POLICY IF EXISTS "Allow all operations on commissions" ON commissions;
CREATE POLICY "Allow all operations on commissions" ON commissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SECTION 2: SCHEMA UPDATES AND MIGRATIONS
-- ============================================================================
-- Additional columns and schema updates applied over time
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Products Table Updates
-- ----------------------------------------------------------------------------

-- Add rent_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Update existing products to have rent_price = 0 if NULL
UPDATE products 
SET rent_price = 0 
WHERE rent_price IS NULL;

-- Add hardware_total column (original quantity, never changes automatically)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS hardware_total INTEGER NOT NULL DEFAULT 0;

-- Add stock_actuel column (current available stock, decreases when clients receive products)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_actuel INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data: set hardware_total and stock_actuel to current quantity value
UPDATE products 
SET 
  hardware_total = COALESCE(quantity, 0),
  stock_actuel = COALESCE(quantity, 0)
WHERE hardware_total = 0 OR stock_actuel = 0;

-- Add comments to document the columns
COMMENT ON COLUMN products.hardware_total IS 'Original quantity added initially (or edited manually). This value never changes automatically.';
COMMENT ON COLUMN products.stock_actuel IS 'Current available stock. This value decreases when clients receive products.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_hardware_total ON products(hardware_total);
CREATE INDEX IF NOT EXISTS idx_products_stock_actuel ON products(stock_actuel);

-- ----------------------------------------------------------------------------
-- Clients Table Updates
-- ----------------------------------------------------------------------------

-- Add products JSONB column to store array of products with quantities and fees
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- Create index on products column for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_products ON clients USING GIN (products);

-- Add comment to document the structure
COMMENT ON COLUMN clients.products IS 'Array of products: [{"productId": "...", "name": "...", "quantity": 6, "monthlyFee": 20}]';

-- Add contract_start_date column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_start_date DATE;

-- Add status column (optional, can be calculated on the fly)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create indexes for contract_start_date and status
CREATE INDEX IF NOT EXISTS idx_clients_contract_start_date ON clients(contract_start_date);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Add starter_pack_price column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS starter_pack_price NUMERIC(10, 2) DEFAULT 0;

-- Add hardware_price column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS hardware_price NUMERIC(10, 2) DEFAULT 0;

-- Add comments to document the columns
COMMENT ON COLUMN clients.starter_pack_price IS 'Starter pack price for new clients (only set on creation)';
COMMENT ON COLUMN clients.hardware_price IS 'Hardware price for new clients (only set on creation)';

-- ============================================================================
-- SECTION 3: DATA MIGRATIONS AND CLEANUP
-- ============================================================================
-- One-time data migrations and cleanup operations
-- ============================================================================

-- Update existing products that might have NULL category
UPDATE products 
SET category = 'Other' 
WHERE category IS NULL OR category = '';

-- ----------------------------------------------------------------------------
-- Recurring financial overhead (recurring costs & positive adjustments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_financial_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('expense', 'income_adjustment')),
  frequency VARCHAR(32) NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'yearly', 'one_shot')),
  amount NUMERIC(14, 4) NOT NULL CHECK (amount > 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Ensure existing databases also allow one-shot entries.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recurring_financial_entries_frequency_check'
  ) THEN
    ALTER TABLE recurring_financial_entries
      DROP CONSTRAINT recurring_financial_entries_frequency_check;
  END IF;

  ALTER TABLE recurring_financial_entries
    ADD CONSTRAINT recurring_financial_entries_frequency_check
    CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'yearly', 'one_shot'));
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_financial_entries_active ON recurring_financial_entries(is_active);

ALTER TABLE recurring_financial_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on recurring_financial_entries" ON recurring_financial_entries;
CREATE POLICY "Allow all operations on recurring_financial_entries" ON recurring_financial_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE recurring_financial_entries IS 'Recurring business expenses and positive income adjustments (monthly-normalized for P&L).';

-- ----------------------------------------------------------------------------
-- Lightweight CRM + Current Orders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_clients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'offre', 'negociation', 'valide', 'refuse')),
  needs TEXT NOT NULL,
  estimated_value NUMERIC(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'a_commander'
    CHECK (status IN ('a_commander', 'commande', 'recu', 'annule')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normale'
    CHECK (priority IN ('basse', 'normale', 'urgente')),
  requested_by TEXT,
  supplier TEXT,
  linked_client_id VARCHAR REFERENCES crm_clients(id) ON DELETE SET NULL,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_linked_client_id ON orders(linked_client_id);

ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on crm_clients" ON crm_clients;
CREATE POLICY "Allow all operations on crm_clients" ON crm_clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;
CREATE POLICY "Allow all operations on orders" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- All tables, columns, indexes, triggers, and policies have been created.
-- The database is now ready for use.
-- ============================================================================

