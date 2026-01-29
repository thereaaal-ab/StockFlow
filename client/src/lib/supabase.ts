import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using anon key for client-side (safe to expose)
// These values must be set in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase instance - uses anon key (safe for frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

