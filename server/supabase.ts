import { createClient } from '@supabase/supabase-js';

// Server-side Supabase instance - uses service role key (NEVER expose to frontend)
// These values must be set in .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase server environment variables');
}

// Server-side Supabase client with service role (admin privileges)
// This should NEVER be exposed to the frontend
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

