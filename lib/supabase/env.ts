/**
 * Public Supabase values for this project.
 * Safe to ship in the client bundle (anon key is public by design).
 * Fallbacks avoid Vercel/proxy cases where NEXT_PUBLIC_* is missing at runtime.
 */
const FALLBACK_SUPABASE_URL = "https://rxbezghqgpkphssacxeg.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4YmV6Z2hxZ3BrcGhzc2FjeGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Mjg5NDYsImV4cCI6MjEwMTAwNDk0Nn0.q8Xj-DN9srW5YKaRbAovVE6csBAYK_bfjd3XfDO3qeg";

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
}

/** Prefer anon key (already configured); fall back to publishable key / project default. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_ANON_KEY
  );
}
