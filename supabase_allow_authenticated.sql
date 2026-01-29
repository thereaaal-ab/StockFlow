-- Allow AUTHENTICATED users (logged in with Google) to read/write data
-- Run this in Supabase: SQL Editor → New query → paste → Run

-- If policies already exist for "anon" only, add these for "authenticated"
-- Or create new policies that apply to authenticated role

-- Clients: allow authenticated users full access
DROP POLICY IF EXISTS "Allow authenticated access to clients" ON clients;
CREATE POLICY "Allow authenticated access to clients" ON clients
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products: allow authenticated users full access
DROP POLICY IF EXISTS "Allow authenticated access to products" ON products;
CREATE POLICY "Allow authenticated access to products" ON products
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Categories: allow authenticated users full access
DROP POLICY IF EXISTS "Allow authenticated access to categories" ON categories;
CREATE POLICY "Allow authenticated access to categories" ON categories
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commissions: allow authenticated users full access
DROP POLICY IF EXISTS "Allow authenticated access to commissions" ON commissions;
CREATE POLICY "Allow authenticated access to commissions" ON commissions
FOR ALL TO authenticated USING (true) WITH CHECK (true);
