import { createClient } from '@supabase/supabase-js';

// Supabase configuration - using anon key for client-side (safe to expose)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://trihldwbuukpqesttwnk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaWhsZHdidXVrcHFlc3R0d25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTUyMjMsImV4cCI6MjA4NDA3MTIyM30.Uzx86pcQ8KN8pnsIWpEkkcx3CMGrYjtkm4IVIiwSeyE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase instance - uses anon key (safe for frontend)
// Automatically uses the user's session when authenticated
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Expose supabase globally for debugging (only in development)
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}

