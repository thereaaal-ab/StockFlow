import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using anon key for client-side (safe to expose)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ptuosweivwyiwmguxagx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dW9zd2Vpdnd5aXdtZ3V4YWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzI3ODMsImV4cCI6MjA3OTE0ODc4M30.7OBus8MSO1QxxcInr42fovMgfg92VMBAH5oWq2dq4a4';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase instance - uses anon key (safe for frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

