-- Fix clients table - ensure months_left is a regular column that can be inserted
-- Run this SQL in your Supabase SQL Editor

-- Option 1: Drop and recreate the column (safest approach)
ALTER TABLE clients DROP COLUMN IF EXISTS months_left;
ALTER TABLE clients ADD COLUMN months_left INTEGER NOT NULL DEFAULT 0;

-- Option 2: If the above doesn't work, try this alternative:
-- ALTER TABLE clients ALTER COLUMN months_left DROP EXPRESSION IF EXISTS;
-- ALTER TABLE clients ALTER COLUMN months_left SET DEFAULT 0;
-- ALTER TABLE clients ALTER COLUMN months_left SET NOT NULL;

-- Verify: After running this, try inserting a client again

