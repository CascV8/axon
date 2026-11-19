// Axon settings. Accounts and cloud sync turn on when both Supabase values are set.
// The publishable (anon) key is meant to be public: row-level security in
// supabase/schema.sql is what keeps each student's progress private.
// NEVER put the service_role / secret key here.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const accountsEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
