import { createClient } from '@supabase/supabase-js';

// Server-side Supabase instance - uses service role key (NEVER expose to frontend)
const supabaseUrl = process.env.SUPABASE_URL || 'https://ptuosweivwyiwmguxagx.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dW9zd2Vpdnd5aXdtZ3V4YWd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU3Mjc4MywiZXhwIjoyMDc5MTQ4NzgzfQ.B7cw-QChn1GAQXDy-tFm5JGJFYNl8ltcxKdcoqP-Nfg';

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

