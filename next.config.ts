import type { NextConfig } from "next";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://rxbezghqgpkphssacxeg.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4YmV6Z2hxZ3BrcGhzc2FjeGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Mjg5NDYsImV4cCI6MjEwMTAwNDk0Nn0.q8Xj-DN9srW5YKaRbAovVE6csBAYK_bfjd3XfDO3qeg";

const nextConfig: NextConfig = {
  serverExternalPackages: ["garmin-connect"],
  // Force-public values into the client/server bundle even if Vercel omits them.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  async rewrites() {
    return [{ source: "/index.html", destination: "/" }];
  },
};

export default nextConfig;
