-- Add category column to existing clients table
-- Run this SQL in your Supabase SQL Editor

-- Add category column if it doesn't exist
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Autre';

-- Add months_left column if it doesn't exist (for storing calculated value)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS months_left INTEGER NOT NULL DEFAULT 0;

-- Update existing rows to have a default category if they don't have one
UPDATE clients 
SET category = 'Autre' 
WHERE category IS NULL OR category = '';

